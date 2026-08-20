import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

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

// شحن تجريبي للعملات — متاح فقط خارج بيئة الإنتاج، لتجربة الاقتصاد الافتراضي
// قبل ربط PayTabs الفعلي. يجب ألا يُنشر هذا المسار أبدًا في بيئة الإنتاج.
router.post("/dev-topup", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "not found" });
  }
  const amount = Math.min(Number(req.body.amount) || 1000, 100000);
  await query("update wallets set coin_balance = coin_balance + $1 where user_id = $2", [
    amount,
    req.user.userId,
  ]);
  const { rows } = await query("select coin_balance from wallets where user_id = $1", [
    req.user.userId,
  ]);
  res.json({ coinBalance: Number(rows[0].coin_balance) });
});

export default router;
