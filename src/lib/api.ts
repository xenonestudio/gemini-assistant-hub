import { io, Socket } from "socket.io-client";

const API_BASE_URL = "http://localhost:3000";

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("pulse.auth.token");
  
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

export const socket: Socket = io(API_BASE_URL, {
  autoConnect: false,
});

export const setSocketToken = (token: string) => {
  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  }
};
