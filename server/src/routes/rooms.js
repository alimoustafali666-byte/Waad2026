import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

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

router.post("/", async (req, res) => {
  const { title, hostUserId } = req.body;
  if (!title || !hostUserId) {
    return res.status(400).json({ error: "title and hostUserId are required" });
  }
  const { rows } = await query(
    "insert into rooms (title, host_user_id) values ($1, $2) returning id, title",
    [title, hostUserId]
  );
  res.status(201).json({ room: rows[0] });
});

// TODO(agora): هذا المسار سيولّد Agora RTC token آمن لدخول الغرفة
router.post("/:id/token", (_req, res) => {
  res.status(501).json({ error: "Agora token generation not implemented yet" });
});

export default router;
