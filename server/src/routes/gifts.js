import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

router.get("/catalog", async (_req, res) => {
  const { rows } = await query(
    "select id, name, emoji, coin_cost, diamond_value from gift_catalog order by sort_order"
  );
  res.json({
    gifts: rows.map((g) => ({
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      coinCost: Number(g.coin_cost),
      diamondValue: Number(g.diamond_value),
    })),
  });
});

export default router;
