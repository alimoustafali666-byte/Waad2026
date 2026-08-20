import "dotenv/config";
import express from "express";
import cors from "cors";
import roomsRouter from "./routes/rooms.js";
import walletRouter from "./routes/wallet.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "waad-server" });
});

app.use("/rooms", roomsRouter);
app.use("/wallet", walletRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`waad-server listening on port ${port}`);
});
