import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { rows } = await query(
    `select id, type, payload, is_read, created_at
     from notifications
     where user_id = $1
     order by created_at desc
     limit 50`,
    [req.user.userId]
  );
  res.json({
    notifications: rows.map((r) => ({
      id: r.id,
      type: r.type,
      payload: r.payload,
      isRead: r.is_read,
      createdAt: r.created_at,
    })),
  });
});

router.post("/:id/read", requireAuth, async (req, res) => {
  await query(
    "update notifications set is_read = true where id = $1 and user_id = $2",
    [req.params.id, req.user.userId]
  );
  res.json({ ok: true });
});

router.post("/read-all", requireAuth, async (req, res) => {
  await query("update notifications set is_read = true where user_id = $1 and is_read = false", [
    req.user.userId,
  ]);
  res.json({ ok: true });
});

export default router;
