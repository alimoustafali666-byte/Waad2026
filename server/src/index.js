import "dotenv/config";
import "express-async-errors";
import http from "node:http";
import express from "express";
import cors from "cors";
import roomsRouter from "./routes/rooms.js";
import walletRouter from "./routes/wallet.js";
import authRouter from "./routes/auth.js";
import giftsRouter from "./routes/gifts.js";
import usersRouter from "./routes/users.js";
import searchRouter from "./routes/search.js";
import notificationsRouter from "./routes/notifications.js";
import leaderboardRouter from "./routes/leaderboard.js";
import shopRouter from "./routes/shop.js";
import agenciesRouter from "./routes/agencies.js";
import { setupRealtime } from "./realtime.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "waad-server" });
});

app.use("/auth", authRouter);
app.use("/rooms", roomsRouter);
app.use("/wallet", walletRouter);
app.use("/gifts", giftsRouter);
app.use("/users", usersRouter);
app.use("/search", searchRouter);
app.use("/notifications", notificationsRouter);
app.use("/leaderboard", leaderboardRouter);
app.use("/shop", shopRouter);
app.use("/agencies", agenciesRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

const server = http.createServer(app);
app.set("io", setupRealtime(server));

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`waad-server listening on port ${port}`);
});
