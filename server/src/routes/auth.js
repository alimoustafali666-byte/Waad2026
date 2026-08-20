import { Router } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { query } from "../db/pool.js";

const router = Router();

const OTP_TTL_MINUTES = 5;
const OTP_LENGTH = 6;

function generateOtp() {
  const max = 10 ** OTP_LENGTH;
  return String(crypto.randomInt(0, max)).padStart(OTP_LENGTH, "0");
}

// TODO(sms): استبدال هذه الدالة بإرسال فعلي عبر مزوّد SMS (مثل Unifonic أو Twilio)
// قبل الإطلاق. حاليًا الرمز يُعاد في الاستجابة نفسها فقط عند NODE_ENV=development.
async function sendOtpSms(phone, code) {
  console.log(`[otp:dev-only] ${phone} -> ${code}`);
}

router.post("/request-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "phone is required" });
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await query(
    "insert into otp_codes (phone, code, expires_at) values ($1, $2, $3)",
    [phone, code, expiresAt]
  );

  await sendOtpSms(phone, code);

  const devPayload = process.env.NODE_ENV !== "production" ? { devCode: code } : {};
  res.json({ sent: true, expiresInSeconds: OTP_TTL_MINUTES * 60, ...devPayload });
});

router.post("/verify-otp", async (req, res) => {
  const { phone, code, displayName } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: "phone and code are required" });
  }

  const { rows } = await query(
    `select id from otp_codes
     where phone = $1 and code = $2 and consumed_at is null and expires_at > now()
     order by created_at desc limit 1`,
    [phone, code]
  );

  if (rows.length === 0) {
    return res.status(401).json({ error: "invalid or expired code" });
  }

  await query("update otp_codes set consumed_at = now() where id = $1", [rows[0].id]);

  // find or create the user, and make sure they have a wallet row
  const existing = await query("select id, display_name from users where phone = $1", [phone]);
  let userId;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
  } else {
    const inserted = await query(
      "insert into users (phone, display_name) values ($1, $2) returning id",
      [phone, displayName || phone]
    );
    userId = inserted.rows[0].id;
    await query("insert into wallets (user_id, coin_balance) values ($1, 0)", [userId]);
  }

  const token = jwt.sign({ userId, phone }, process.env.JWT_SECRET || "dev-secret", {
    expiresIn: "30d",
  });

  res.json({ token, userId });
});

export default router;
