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
      // ensure header not stale
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
      // Server responded with error status
      console.error("API Error:", error.response.status, error.response.data);

      // Check for JWT errors
      const errorMsg = error.response.data?.msg || error.response.data?.error || "";

      // Common JWT errors
      if (error.response.status === 422 && errorMsg.includes("Not enough segments")) {
        localStorage.removeItem("token");
        localStorage.removeItem("email");
        localStorage.removeItem("role");
        window.location.reload();
      }

      // Auto logout on 401 Unauthorized
      if (error.response.status === 401 && !window.location.pathname.includes("/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("email");
        localStorage.removeItem("role");
        window.location.reload();
      }
    } else if (error.request) {
      // Request made but no response
      console.error("Network Error:", error.request);
    } else {
      // Something else happened
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
