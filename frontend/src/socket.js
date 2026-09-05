import { io } from "socket.io-client";

export const getBackendUrl = () => {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    // In production, use relative URL (proxied by Nginx)
    return "/";
  }
  return "http://localhost:5000";
};

export const socket = io(getBackendUrl(), {
  autoConnect: false,
  transports: ["websocket", "polling"],
});