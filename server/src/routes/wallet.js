import { Router } from "express";

const router = Router();

router.get("/:userId", (req, res) => {
  // TODO: قراءة رصيد فعلي من جدول wallets
  res.json({ userId: req.params.userId, coinBalance: 0 });
});

// TODO(paytabs): إنشاء طلب دفع فعلي عبر PayTabs API (حساب الإمارات أولًا)
// راجع: https://support.paytabs.com — يتطلب مفاتيح API بعد فتح الحساب التجاري
router.post("/purchase", (_req, res) => {
  res.status(501).json({ error: "PayTabs integration not connected yet" });
});

export default router;
