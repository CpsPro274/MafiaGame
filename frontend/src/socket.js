import { io } from "socket.io-client";

export const getBackendUrl = () => {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return "http://localhost:5000";
};

export const socket = io(getBackendUrl(), {
  autoConnect: false,
  transports: ["websocket", "polling"],
});