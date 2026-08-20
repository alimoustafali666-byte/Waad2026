import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `request failed: ${res.status}`);
  }
  return data;
}

export const authApi = {
  requestOtp: (phone) =>
    request("/auth/request-otp", { method: "POST", body: JSON.stringify({ phone }) }),
  verifyOtp: (phone, code, displayName) =>
    request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, code, displayName }),
    }),
};

export const roomsApi = {
  list: () => request("/rooms"),
  create: (title, token) =>
    request("/rooms", {
      method: "POST",
      body: JSON.stringify({ title }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  getVoiceToken: (roomId, token) =>
    request(`/rooms/${roomId}/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  getSeats: (roomId) => request(`/rooms/${roomId}/seats`),
  joinSeat: (roomId, seatNumber, token) =>
    request(`/rooms/${roomId}/seats/${seatNumber}/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  leaveSeat: (roomId, seatNumber, token) =>
    request(`/rooms/${roomId}/seats/${seatNumber}/leave`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  muteSeat: (roomId, seatNumber, muted, token) =>
    request(`/rooms/${roomId}/seats/${seatNumber}/mute`, {
      method: "POST",
      body: JSON.stringify({ muted }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  kickSeat: (roomId, seatNumber, token) =>
    request(`/rooms/${roomId}/seats/${seatNumber}/kick`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  getMessages: (roomId) => request(`/rooms/${roomId}/messages`),
  sendMessage: (roomId, message, token) =>
    request(`/rooms/${roomId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  sendGift: (roomId, giftId, hostUserId, token) =>
    request(`/rooms/${roomId}/gifts`, {
      method: "POST",
      body: JSON.stringify({ giftId, hostUserId }),
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const giftsApi = {
  catalog: () => request("/gifts/catalog"),
};

export const walletApi = {
  get: (userId) => request(`/wallet/${userId}`),
  devTopup: (amount, token) =>
    request("/wallet/dev-topup", {
      method: "POST",
      body: JSON.stringify({ amount }),
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const usersApi = {
  me: (token) => request("/users/me", { headers: { Authorization: `Bearer ${token}` } }),
  updateMe: (updates, token) =>
    request("/users/me", {
      method: "PATCH",
      body: JSON.stringify(updates),
      headers: { Authorization: `Bearer ${token}` },
    }),
  get: (userId) => request(`/users/${userId}`),
  follow: (userId, token) =>
    request(`/users/${userId}/follow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  unfollow: (userId, token) =>
    request(`/users/${userId}/follow`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
  followers: (userId) => request(`/users/${userId}/followers`),
  following: (userId) => request(`/users/${userId}/following`),
};

export const searchApi = {
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
};

export const notificationsApi = {
  list: (token) => request("/notifications", { headers: { Authorization: `Bearer ${token}` } }),
  markRead: (id, token) =>
    request(`/notifications/${id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  markAllRead: (token) =>
    request("/notifications/read-all", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const leaderboardApi = {
  senders: () => request("/leaderboard/senders"),
  hosts: () => request("/leaderboard/hosts"),
};

export const shopApi = {
  frames: () => request("/shop/frames"),
  ownedFrames: (token) =>
    request("/shop/frames/owned", { headers: { Authorization: `Bearer ${token}` } }),
  purchaseFrame: (frameId, token) =>
    request(`/shop/frames/${frameId}/purchase`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  equipFrame: (frameId, token) =>
    request(`/shop/frames/${frameId}/equip`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  unequipFrame: (token) =>
    request("/shop/frames/unequip", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const agenciesApi = {
  create: (name, token) =>
    request("/agencies", {
      method: "POST",
      body: JSON.stringify({ name }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  mine: (token) => request("/agencies/me", { headers: { Authorization: `Bearer ${token}` } }),
  myHostStatus: (token) =>
    request("/agencies/hosts/me", { headers: { Authorization: `Bearer ${token}` } }),
  dashboard: (agencyId, token) =>
    request(`/agencies/${agencyId}/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
  recruitHost: (agencyId, userId, token) =>
    request(`/agencies/${agencyId}/hosts`, {
      method: "POST",
      body: JSON.stringify({ userId }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  requestPayout: (diamondsRequested, token) =>
    request("/agencies/payout-requests", {
      method: "POST",
      body: JSON.stringify({ diamondsRequested }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  payoutRequests: (agencyId, token) =>
    request(`/agencies/${agencyId}/payout-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  approvePayout: (requestId, token) =>
    request(`/agencies/payout-requests/${requestId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const session = {
  async save(token, userId) {
    await AsyncStorage.multiSet([
      ["waad_token", token],
      ["waad_user_id", userId],
    ]);
  },
  async load() {
    const [[, token], [, userId]] = await AsyncStorage.multiGet(["waad_token", "waad_user_id"]);
    return { token, userId };
  },
  async clear() {
    await AsyncStorage.multiRemove(["waad_token", "waad_user_id"]);
  },
};
