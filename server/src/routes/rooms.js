import { Router } from "express";
import crypto from "node:crypto";
import agoraToken from "agora-token";
const { RtcTokenBuilder, RtcRole } = agoraToken;
import { query, withTransaction } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { roomChannel } from "../realtime.js";

const router = Router();
const TOKEN_TTL_SECONDS = 60 * 60; // ساعة واحدة
const SEAT_COUNT = 8;
const MESSAGE_HISTORY_LIMIT = 50;

router.get("/", async (_req, res) => {
  const { rows } = await query(
    `select r.id, r.title, r.host_user_id, u.display_name as host_name, r.is_live, r.created_at
     from rooms r
     join users u on u.id = r.host_user_id
     where r.is_live = true
     order by r.created_at desc`
  );
  res.json({ rooms: rows });
});

router.post("/", requireAuth, async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }
  const { rows } = await query(
    "insert into rooms (title, host_user_id) values ($1, $2) returning id, title, host_user_id",
    [title, req.user.userId]
  );
  const room = rows[0];

  const seatValues = [];
  const seatParams = [];
  for (let seatNumber = 1; seatNumber <= SEAT_COUNT; seatNumber++) {
    const isHostSeat = seatNumber === 1;
    seatValues.push(
      `($${seatParams.length + 1}, $${seatParams.length + 2}, $${seatParams.length + 3})`
    );
    seatParams.push(room.id, seatNumber, isHostSeat ? req.user.userId : null);
  }
  await query(
    `insert into room_seats (room_id, seat_number, user_id) values ${seatValues.join(", ")}`,
    seatParams
  );

  res.status(201).json({ room });
});

// يولّد Agora RTC token آمن لدخول الغرفة. appCertificate يبقى على الخادم فقط ولا يصل للعميل أبدًا.
router.post("/:id/token", requireAuth, async (req, res) => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  if (!appId || !appCertificate) {
    return res.status(503).json({ error: "Agora credentials not configured on server" });
  }

  const { rows } = await query("select id from rooms where id = $1 and is_live = true", [
    req.params.id,
  ]);
  if (rows.length === 0) {
    return res.status(404).json({ error: "room not found or not live" });
  }

  // uid رقمي فريد داخل هذه الجلسة، مشتق من معرف المستخدم (Agora يتطلب 32-bit unsigned int)
  const uid = crypto.createHash("md5").update(req.user.userId).digest().readUInt32BE(0) % 2 ** 31;

  const channelName = req.params.id;
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    TOKEN_TTL_SECONDS,
    TOKEN_TTL_SECONDS
  );

  res.json({ appId, token, channel: channelName, uid });
});

async function getRoom(roomId) {
  const { rows } = await query("select id, host_user_id from rooms where id = $1", [roomId]);
  return rows[0] ?? null;
}

async function loadSeats(roomId) {
  const { rows } = await query(
    `select s.seat_number, s.user_id, s.is_muted, u.display_name
     from room_seats s
     left join users u on u.id = s.user_id
     where s.room_id = $1
     order by s.seat_number`,
    [roomId]
  );
  return rows.map((r) => ({
    seatNumber: r.seat_number,
    userId: r.user_id,
    displayName: r.display_name,
    isMuted: r.is_muted,
  }));
}

router.get("/:id/seats", async (req, res) => {
  const room = await getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "room not found" });
  res.json({ seats: await loadSeats(req.params.id) });
});

router.post("/:id/seats/:seatNumber/join", requireAuth, async (req, res) => {
  const seatNumber = Number(req.params.seatNumber);
  if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > SEAT_COUNT) {
    return res.status(400).json({ error: "invalid seat number" });
  }
  const room = await getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "room not found" });

  const { rows: targetRows } = await query(
    "select user_id from room_seats where room_id = $1 and seat_number = $2",
    [req.params.id, seatNumber]
  );
  if (targetRows.length === 0) return res.status(404).json({ error: "seat not found" });
  if (targetRows[0].user_id) return res.status(409).json({ error: "seat already taken" });

  // أفرغ أي مقعد آخر يشغله المستخدم في نفس الغرفة قبل أخذ المقعد الجديد
  await query(
    "update room_seats set user_id = null, is_muted = false where room_id = $1 and user_id = $2",
    [req.params.id, req.user.userId]
  );
  await query(
    "update room_seats set user_id = $1, is_muted = false where room_id = $2 and seat_number = $3",
    [req.user.userId, req.params.id, seatNumber]
  );

  const io = req.app.get("io");
  io.to(roomChannel(req.params.id)).emit("seats:update", { seats: await loadSeats(req.params.id) });
  res.json({ ok: true });
});

router.post("/:id/seats/:seatNumber/leave", requireAuth, async (req, res) => {
  const seatNumber = Number(req.params.seatNumber);
  const { rowCount } = await query(
    "update room_seats set user_id = null, is_muted = false where room_id = $1 and seat_number = $2 and user_id = $3",
    [req.params.id, seatNumber, req.user.userId]
  );
  if (rowCount === 0) return res.status(409).json({ error: "you are not on that seat" });

  const io = req.app.get("io");
  io.to(roomChannel(req.params.id)).emit("seats:update", { seats: await loadSeats(req.params.id) });
  res.json({ ok: true });
});

async function requireHost(req, res) {
  const room = await getRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: "room not found" });
    return null;
  }
  if (room.host_user_id !== req.user.userId) {
    res.status(403).json({ error: "only the host can do this" });
    return null;
  }
  return room;
}

router.post("/:id/seats/:seatNumber/mute", requireAuth, async (req, res) => {
  const room = await requireHost(req, res);
  if (!room) return;
  const seatNumber = Number(req.params.seatNumber);
  const { muted } = req.body;
  await query(
    "update room_seats set is_muted = $1 where room_id = $2 and seat_number = $3",
    [!!muted, req.params.id, seatNumber]
  );

  const io = req.app.get("io");
  io.to(roomChannel(req.params.id)).emit("seats:update", { seats: await loadSeats(req.params.id) });
  res.json({ ok: true });
});

router.post("/:id/seats/:seatNumber/kick", requireAuth, async (req, res) => {
  const room = await requireHost(req, res);
  if (!room) return;
  const seatNumber = Number(req.params.seatNumber);
  await query(
    "update room_seats set user_id = null, is_muted = false where room_id = $1 and seat_number = $2",
    [req.params.id, seatNumber]
  );

  const io = req.app.get("io");
  io.to(roomChannel(req.params.id)).emit("seats:update", { seats: await loadSeats(req.params.id) });
  res.json({ ok: true });
});

router.get("/:id/messages", async (req, res) => {
  const { rows } = await query(
    `select m.id, m.user_id, u.display_name, m.message, m.created_at
     from room_messages m
     join users u on u.id = m.user_id
     where m.room_id = $1
     order by m.created_at desc
     limit $2`,
    [req.params.id, MESSAGE_HISTORY_LIMIT]
  );
  res.json({
    messages: rows.reverse().map((r) => ({
      id: r.id,
      userId: r.user_id,
      displayName: r.display_name,
      message: r.message,
      createdAt: r.created_at,
    })),
  });
});

router.post("/:id/messages", requireAuth, async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  const room = await getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "room not found" });

  const { rows } = await query(
    `insert into room_messages (room_id, user_id, message) values ($1, $2, $3)
     returning id, user_id, message, created_at`,
    [req.params.id, req.user.userId, message.trim().slice(0, 500)]
  );
  const { rows: userRows } = await query("select display_name from users where id = $1", [
    req.user.userId,
  ]);

  const payload = {
    id: rows[0].id,
    userId: rows[0].user_id,
    displayName: userRows[0]?.display_name ?? "",
    message: rows[0].message,
    createdAt: rows[0].created_at,
  };

  const io = req.app.get("io");
  io.to(roomChannel(req.params.id)).emit("message:new", payload);
  res.status(201).json({ message: payload });
});

router.post("/:id/gifts", requireAuth, async (req, res) => {
  const { giftId, hostUserId } = req.body;
  if (!giftId || !hostUserId) {
    return res.status(400).json({ error: "giftId and hostUserId are required" });
  }
  const room = await getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: "room not found" });

  let result;
  try {
    result = await withTransaction(async (client) => {
      const { rows: giftRows } = await client.query(
        "select name, emoji, coin_cost, diamond_value from gift_catalog where id = $1",
        [giftId]
      );
      if (giftRows.length === 0) throw new Error("gift not found");
      const gift = giftRows[0];

      const { rows: walletRows } = await client.query(
        "select coin_balance from wallets where user_id = $1 for update",
        [req.user.userId]
      );
      if (walletRows.length === 0 || Number(walletRows[0].coin_balance) < Number(gift.coin_cost)) {
        throw new Error("insufficient balance");
      }

      await client.query(
        `update wallets set coin_balance = coin_balance - $1, total_coins_spent = total_coins_spent + $1
         where user_id = $2`,
        [gift.coin_cost, req.user.userId]
      );

      const { rows: hostRows } = await client.query(
        "select user_id from hosts where user_id = $1",
        [hostUserId]
      );
      if (hostRows.length === 0) {
        await client.query(
          "insert into hosts (user_id, diamond_balance) values ($1, 0)",
          [hostUserId]
        );
      }
      await client.query(
        "update hosts set diamond_balance = diamond_balance + $1 where user_id = $2",
        [gift.diamond_value, hostUserId]
      );

      const { rows: giftLogRows } = await client.query(
        `insert into gifts (room_id, sender_user_id, host_user_id, coin_cost, diamonds_credited)
         values ($1, $2, $3, $4, $5) returning id`,
        [req.params.id, req.user.userId, hostUserId, gift.coin_cost, gift.diamond_value]
      );

      const { rows: senderRows } = await client.query(
        "select display_name from users where id = $1",
        [req.user.userId]
      );

      await client.query(
        "insert into notifications (user_id, type, payload) values ($1, 'gift', $2)",
        [
          hostUserId,
          JSON.stringify({
            senderName: senderRows[0]?.display_name ?? "",
            giftName: gift.name,
            giftEmoji: gift.emoji,
            diamondsCredited: gift.diamond_value,
          }),
        ]
      );

      return {
        giftLogId: giftLogRows[0].id,
        gift,
        senderName: senderRows[0]?.display_name ?? "",
      };
    });
  } catch (e) {
    if (e.message === "insufficient balance") {
      return res.status(402).json({ error: "insufficient coin balance" });
    }
    if (e.message === "gift not found") {
      return res.status(404).json({ error: "gift not found" });
    }
    throw e;
  }

  const io = req.app.get("io");
  io.to(roomChannel(req.params.id)).emit("gift:new", {
    id: result.giftLogId,
    senderName: result.senderName,
    hostUserId,
    giftName: result.gift.name,
    giftEmoji: result.gift.emoji,
  });

  res.status(201).json({ ok: true });
});

export default router;
