import { io } from "socket.io-client";

const currentHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const SERVER_URL = import.meta.env.VITE_BACKEND_URL || `http://${currentHost}:5000`;

export const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

export default socket;
