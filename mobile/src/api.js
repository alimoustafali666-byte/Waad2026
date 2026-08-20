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
};

export const walletApi = {
  get: (userId) => request(`/wallet/${userId}`),
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
