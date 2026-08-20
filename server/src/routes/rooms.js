import { Router } from "express";

const router = Router();

// TODO: استبدال هذه البيانات الوهمية بقراءة فعلية من جدول rooms عبر pg
const MOCK_ROOMS = [
  { id: "1", title: "سهرة الخميس", hostName: "سارة", listeners: 128 },
  { id: "2", title: "نقاش: أفلام رمضان", hostName: "خالد", listeners: 54 },
];

router.get("/", (_req, res) => {
  res.json({ rooms: MOCK_ROOMS });
});

// TODO(agora): هذا المسار سيولّد Agora RTC token آمن لدخول الغرفة
router.post("/:id/token", (req, res) => {
  res.status(501).json({ error: "Agora token generation not implemented yet" });
});

export default router;
