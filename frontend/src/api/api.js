import axios from "axios";

// Dynamically connect to port 5000 on current hostname
const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
const baseURL = import.meta.env.VITE_API_URL || `http://${host}:5000/api`;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;