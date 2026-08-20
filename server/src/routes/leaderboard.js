import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

router.get("/senders", async (_req, res) => {
  const { rows } = await query(
    `select u.id, u.display_name, u.avatar_emoji, sum(g.coin_cost)::bigint as total_spent
     from gifts g join users u on u.id = g.sender_user_id
     group by u.id, u.display_name, u.avatar_emoji
     order by total_spent desc
     limit 20`
  );
  res.json({
    leaders: rows.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      avatarEmoji: r.avatar_emoji,
      totalSpent: Number(r.total_spent),
    })),
  });
});

router.get("/hosts", async (_req, res) => {
  const { rows } = await query(
    `select u.id, u.display_name, u.avatar_emoji, sum(g.diamonds_credited)::bigint as total_earned
     from gifts g join users u on u.id = g.host_user_id
     group by u.id, u.display_name, u.avatar_emoji
     order by total_earned desc
     limit 20`
  );
  res.json({
    leaders: rows.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      avatarEmoji: r.avatar_emoji,
      totalEarned: Number(r.total_earned),
    })),
  });
});

export default router;
