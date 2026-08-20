import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const VIP_TIERS = [
  { level: 4, minSpent: 50000 },
  { level: 3, minSpent: 20000 },
  { level: 2, minSpent: 5000 },
  { level: 1, minSpent: 1000 },
  { level: 0, minSpent: 0 },
];

export function vipLevelForSpent(spent) {
  const tier = VIP_TIERS.find((t) => Number(spent) >= t.minSpent);
  return tier ? tier.level : 0;
}

async function loadProfile(userId) {
  const { rows } = await query(
    `select u.id, u.display_name, u.bio, u.avatar_emoji, u.equipped_frame_id, u.is_host,
            w.coin_balance, w.total_coins_spent,
            f.name as frame_name, f.emoji as frame_emoji
     from users u
     left join wallets w on w.user_id = u.id
     left join avatar_frames f on f.id = u.equipped_frame_id
     where u.id = $1`,
    [userId]
  );
  if (rows.length === 0) return null;
  const r = rows[0];

  const { rows: followerCountRows } = await query(
    "select count(*)::int as c from follows where followed_id = $1",
    [userId]
  );
  const { rows: followingCountRows } = await query(
    "select count(*)::int as c from follows where follower_id = $1",
    [userId]
  );

  return {
    id: r.id,
    displayName: r.display_name,
    bio: r.bio,
    avatarEmoji: r.avatar_emoji,
    isHost: r.is_host,
    coinBalance: r.coin_balance != null ? Number(r.coin_balance) : 0,
    vipLevel: vipLevelForSpent(r.total_coins_spent ?? 0),
    equippedFrame: r.equipped_frame_id
      ? { id: r.equipped_frame_id, name: r.frame_name, emoji: r.frame_emoji }
      : null,
    followerCount: followerCountRows[0].c,
    followingCount: followingCountRows[0].c,
  };
}

router.get("/me", requireAuth, async (req, res) => {
  const profile = await loadProfile(req.user.userId);
  if (!profile) return res.status(404).json({ error: "user not found" });
  res.json({ profile });
});

router.patch("/me", requireAuth, async (req, res) => {
  const { displayName, bio, avatarEmoji } = req.body;
  await query(
    `update users set
       display_name = coalesce($1, display_name),
       bio = coalesce($2, bio),
       avatar_emoji = coalesce($3, avatar_emoji)
     where id = $4`,
    [displayName ?? null, bio ?? null, avatarEmoji ?? null, req.user.userId]
  );
  const profile = await loadProfile(req.user.userId);
  res.json({ profile });
});

router.get("/:id", async (req, res) => {
  const profile = await loadProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "user not found" });
  res.json({ profile });
});

router.post("/:id/follow", requireAuth, async (req, res) => {
  if (req.params.id === req.user.userId) {
    return res.status(400).json({ error: "cannot follow yourself" });
  }
  await query(
    "insert into follows (follower_id, followed_id) values ($1, $2) on conflict do nothing",
    [req.user.userId, req.params.id]
  );
  const { rows: senderRows } = await query("select display_name from users where id = $1", [
    req.user.userId,
  ]);
  await query(
    "insert into notifications (user_id, type, payload) values ($1, 'follow', $2)",
    [req.params.id, JSON.stringify({ followerId: req.user.userId, followerName: senderRows[0]?.display_name })]
  );
  res.json({ ok: true });
});

router.delete("/:id/follow", requireAuth, async (req, res) => {
  await query("delete from follows where follower_id = $1 and followed_id = $2", [
    req.user.userId,
    req.params.id,
  ]);
  res.json({ ok: true });
});

router.get("/:id/followers", async (req, res) => {
  const { rows } = await query(
    `select u.id, u.display_name, u.avatar_emoji
     from follows f join users u on u.id = f.follower_id
     where f.followed_id = $1
     order by f.created_at desc`,
    [req.params.id]
  );
  res.json({ users: rows.map((r) => ({ id: r.id, displayName: r.display_name, avatarEmoji: r.avatar_emoji })) });
});

router.get("/:id/following", async (req, res) => {
  const { rows } = await query(
    `select u.id, u.display_name, u.avatar_emoji
     from follows f join users u on u.id = f.followed_id
     where f.follower_id = $1
     order by f.created_at desc`,
    [req.params.id]
  );
  res.json({ users: rows.map((r) => ({ id: r.id, displayName: r.display_name, avatarEmoji: r.avatar_emoji })) });
});

export default router;
