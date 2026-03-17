// src/api.js
import axios from "axios";

/**
 * HTTP API client (Axios)
 * - baseURL points to BACKEND (not frontend)
 * - auto-attaches JWT token as Bearer
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://car-diagnostics.onrender.com",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API Error:", error.response.status, error.response.data);

      const errorMsg = error.response.data?.msg || error.response.data?.error || "";

      // Pokazený / neplatný JWT token
      if (error.response.status === 422 && errorMsg.includes("Not enough segments")) {
        localStorage.removeItem("token");
        localStorage.removeItem("email");
        localStorage.removeItem("role");
        delete api.defaults.headers.common["Authorization"];
      }

      // 401 nech NEROBÍ reload pri zlom logine
      // Token maž len ak už existoval a request bol autorizovaný
      if (error.response.status === 401) {
        const token = localStorage.getItem("token");

        if (token) {
          localStorage.removeItem("token");
          localStorage.removeItem("email");
          localStorage.removeItem("role");
          delete api.defaults.headers.common["Authorization"];
        }
      }
    } else if (error.request) {
      console.error("Network Error:", error.request);
    } else {
      console.error("Error:", error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * WS base URL helper for socket.io-client.
 * Use it in src/socket.js:
 *   import { WS_BASE_URL } from "./api";
 *   const socket = io(WS_BASE_URL, {...})
 */
const WS_BASE_URL =
  process.env.REACT_APP_WS_URL ||
  process.env.REACT_APP_API_URL ||
  api.defaults.baseURL ||
  "https://car-diagnostics.onrender.com";

export { api, WS_BASE_URL };
