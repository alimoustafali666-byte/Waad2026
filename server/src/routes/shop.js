import { Router } from "express";
import { query, withTransaction } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/frames", async (_req, res) => {
  const { rows } = await query(
    "select id, name, emoji, coin_cost from avatar_frames order by sort_order"
  );
  res.json({
    frames: rows.map((f) => ({ id: f.id, name: f.name, emoji: f.emoji, coinCost: Number(f.coin_cost) })),
  });
});

router.get("/frames/owned", requireAuth, async (req, res) => {
  const { rows } = await query(
    `select f.id, f.name, f.emoji from user_frames uf
     join avatar_frames f on f.id = uf.frame_id
     where uf.user_id = $1`,
    [req.user.userId]
  );
  res.json({ frames: rows });
});

router.post("/frames/:id/purchase", requireAuth, async (req, res) => {
  try {
    await withTransaction(async (client) => {
      const { rows: frameRows } = await client.query(
        "select coin_cost from avatar_frames where id = $1",
        [req.params.id]
      );
      if (frameRows.length === 0) throw new Error("frame not found");
      const cost = frameRows[0].coin_cost;

      const { rows: ownedRows } = await client.query(
        "select 1 from user_frames where user_id = $1 and frame_id = $2",
        [req.user.userId, req.params.id]
      );
      if (ownedRows.length > 0) throw new Error("already owned");

      const { rows: walletRows } = await client.query(
        "select coin_balance from wallets where user_id = $1 for update",
        [req.user.userId]
      );
      if (walletRows.length === 0 || Number(walletRows[0].coin_balance) < Number(cost)) {
        throw new Error("insufficient balance");
      }

      await client.query(
        `update wallets set coin_balance = coin_balance - $1, total_coins_spent = total_coins_spent + $1
         where user_id = $2`,
        [cost, req.user.userId]
      );
      await client.query(
        "insert into user_frames (user_id, frame_id) values ($1, $2)",
        [req.user.userId, req.params.id]
      );
    });
  } catch (e) {
    if (e.message === "frame not found") return res.status(404).json({ error: "frame not found" });
    if (e.message === "already owned") return res.status(409).json({ error: "frame already owned" });
    if (e.message === "insufficient balance")
      return res.status(402).json({ error: "insufficient coin balance" });
    throw e;
  }
  res.status(201).json({ ok: true });
});

router.post("/frames/:id/equip", requireAuth, async (req, res) => {
  const { rows: ownedRows } = await query(
    "select 1 from user_frames where user_id = $1 and frame_id = $2",
    [req.user.userId, req.params.id]
  );
  if (ownedRows.length === 0) return res.status(403).json({ error: "you do not own this frame" });

  await query("update users set equipped_frame_id = $1 where id = $2", [
    req.params.id,
    req.user.userId,
  ]);
  res.json({ ok: true });
});

router.post("/frames/unequip", requireAuth, async (req, res) => {
  await query("update users set equipped_frame_id = null where id = $1", [req.user.userId]);
  res.json({ ok: true });
});

export default router;
