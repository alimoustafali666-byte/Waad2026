import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ rooms: [], users: [] });
  const like = `%${q}%`;

  const { rows: rooms } = await query(
    `select r.id, r.title, u.display_name as host_name
     from rooms r join users u on u.id = r.host_user_id
     where r.is_live = true and r.title ilike $1
     order by r.created_at desc limit 10`,
    [like]
  );

  const { rows: users } = await query(
    `select id, display_name, avatar_emoji from users where display_name ilike $1 limit 10`,
    [like]
  );

  res.json({
    rooms,
    users: users.map((u) => ({ id: u.id, displayName: u.display_name, avatarEmoji: u.avatar_emoji })),
  });
});

export default router;
