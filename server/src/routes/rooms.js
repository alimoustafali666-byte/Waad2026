import { Router } from "express";
import crypto from "node:crypto";
import agoraToken from "agora-token";
const { RtcTokenBuilder, RtcRole } = agoraToken;
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const TOKEN_TTL_SECONDS = 60 * 60; // ساعة واحدة

router.get("/", async (_req, res) => {
  const { rows } = await query(
    `select r.id, r.title, u.display_name as host_name, r.is_live, r.created_at
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
    "insert into rooms (title, host_user_id) values ($1, $2) returning id, title",
    [title, req.user.userId]
  );
  res.status(201).json({ room: rows[0] });
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

export default router;
