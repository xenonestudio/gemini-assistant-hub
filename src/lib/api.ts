import { io, Socket } from "socket.io-client";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    return `http://${hostname}`;
  }
  return "http://localhost:3000";
};

const API_BASE_URL = getBaseUrl();

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
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("pulse.auth.token");
      window.dispatchEvent(new CustomEvent("pulse:unauthorized"));
    }
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
