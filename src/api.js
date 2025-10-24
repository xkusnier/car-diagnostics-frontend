import axios from "axios";

export const api = axios.create({
 baseurl = "https://car-diagnostics.onrender.com";, // Nahraďte správnym URL backendu
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));
