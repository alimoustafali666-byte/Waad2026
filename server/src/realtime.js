import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export function roomChannel(roomId) {
  return `room:${roomId}`;
}

export function setupRealtime(httpServer) {
  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("unauthorized"));
      const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("room:join", (roomId) => {
      if (typeof roomId === "string") socket.join(roomChannel(roomId));
    });
    socket.on("room:leave", (roomId) => {
      if (typeof roomId === "string") socket.leave(roomChannel(roomId));
    });
  });

  return io;
}
