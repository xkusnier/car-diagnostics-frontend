import React, { useEffect, useState } from "react";
import { api } from "./api";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen.js";

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("jwt_token") || null);
  const [showRegister, setShowRegister] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState("");

  // Dynamická detekcia URL a nastavenie showRegister
  useEffect(() => {
    const openRegister = () => setShowRegister(true);
    window.addEventListener("open-register", openRegister);
    return () => window.removeEventListener("open-register", openRegister);
  }, []);

  // Načítanie dát pre dashboard po prihlásení
  useEffect(() => {
    if (isAuthenticated && token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      api
        .get("/api/all")
        .then((res) => setData(res.data))
        .catch((err) => setError(err.message));
    }
  }, [isAuthenticated, token]);

  // LOGIN
  const handleLogin = (email, password) => {
    api
      .post("/api/login", { email, password })
      .then((res) => {
        if (res.data.access_token) {
          setToken(res.data.access_token);
          localStorage.setItem("jwt_token", res.data.access_token);
          setIsAuthenticated(true);
          setError(null);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Login failed");
      });
  };

  // REGISTER
  const handleRegister = (email, password) => {
    api
      .post("/api/register", { email, password })
      .then((res) => {
        if (res.data.status === "success") {
          setShowRegister(false);
          setError("Registration successful. Please log in.");
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Registration failed");
      });
  };

  // LOGOUT
  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken(null);
    localStorage.removeItem("jwt_token");
    delete api.defaults.headers.Authorization;
  };

  // ADD DEVICE
  const handleAddDevice = () => {
    if (!newDeviceId) {
      alert("Enter a valid device ID");
      return;
    }

    api
      .post("/api/add-device", { device_id: parseInt(newDeviceId) })
      .then((res) => {
        alert(`✅ Device ${res.data.device_id} successfully added!`);
        setNewDeviceId("");
      })
      .catch((err) => {
        const msg = err.response?.data?.error || "Failed to add device";
        alert(`❌ ${msg}`);
      });
  };

  if (!isAuthenticated) {
    return showRegister ? (
      <RegisterScreen onRegister={handleRegister} />
    ) : (
      <LoginScreen onLogin={handleLogin} />
    );
  }

  // DASHBOARD
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Car Diagnostics Dashboard</h1>

      <button
        onClick={handleLogout}
        style={{
          marginBottom: "1rem",
          padding: "0.5rem 1rem",
          background: "red",
          color: "white",
          border: "none",
          borderRadius: "4px",
        }}
      >
        Logout
      </button>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {!data && !error && <p>Loading data...</p>}

      {/* Sekcia na pridanie nového zariadenia */}
      <div style={{ marginBottom: "2rem", marginTop: "2rem" }}>
        <h3>Register new Device</h3>
        <input
          type="number"
          placeholder="Enter device ID"
          value={newDeviceId}
          onChange={(e) => setNewDeviceId(e.target.value)}
          style={{ marginRight: "1rem", padding: "0.5rem" }}
        />
        <button
          onClick={handleAddDevice}
          style={{
            padding: "0.5rem 1rem",
            background: "green",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Add Device
        </button>
      </div>

      {/* Tabuľka s VIN a DTC kódmi */}
      {data && (
        <table
          border="1"
          cellPadding="8"
          style={{ borderCollapse: "collapse", marginTop: "1rem" }}
        >
          <thead>
            <tr>
              <th>VIN</th>
              <th>DTC Codes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((v, i) => (
              <tr key={i}>
                <td>{v.vin}</td>
                <td>{v.dtc_codes.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
