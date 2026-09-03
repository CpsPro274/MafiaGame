import axios from "axios";

const getBackendUrl = () => {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return "http://localhost:5000";
};

const api=axios.create({
    baseURL: `${getBackendUrl()}/api`,
    withCredentials: true
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