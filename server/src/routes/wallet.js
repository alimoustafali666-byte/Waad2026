import { Router } from "express";
import { query } from "../db/pool.js";

const router = Router();

router.get("/:userId", async (req, res) => {
  const { rows } = await query(
    "select coin_balance from wallets where user_id = $1",
    [req.params.userId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "wallet not found" });
  }
  res.json({ userId: req.params.userId, coinBalance: Number(rows[0].coin_balance) });
});

// TODO(paytabs): إنشاء طلب دفع فعلي عبر PayTabs API (حساب الإمارات أولًا)
// راجع: https://support.paytabs.com — يتطلب مفاتيح API بعد فتح الحساب التجاري
router.post("/purchase", (_req, res) => {
  res.status(501).json({ error: "PayTabs integration not connected yet" });
});

export default router;
