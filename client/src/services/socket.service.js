import { io } from "socket.io-client";
import { getAccessToken } from "../api/axios.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || new URL(API_BASE_URL).origin;

let socket = null;

export const connectSocket = () => {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Authentication token is missing");
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: {
        token,
      },
    });
  } else {
    // Always use the latest access token.
    socket.auth = {
      ...socket.auth,
      token,
    };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
