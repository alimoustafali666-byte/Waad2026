import { io } from "socket.io-client";
import { API_BASE_URL } from "./config";

let socket = null;

export function connectRealtime(token) {
  if (socket) return socket;
  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket"],
  });
  return socket;
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
}

export function joinRoomChannel(roomId) {
  socket?.emit("room:join", roomId);
}

export function leaveRoomChannel(roomId) {
  socket?.emit("room:leave", roomId);
}
