import React, { useEffect, useState } from "react";
import { api } from "./api";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import MyDevicesScreen from "./MyDevicesScreen";
import DeviceDiagnosticsScreen from "./DeviceDiagnosticsScreen";

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("jwt_token") || null);
  const [showRegister, setShowRegister] = useState(false);
  const [showMyDevices, setShowMyDevices] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [role, setRole] = useState(localStorage.getItem("user_role") || "user");
  
  useEffect(() => {
    const openRegister = () => setShowRegister(true);
    window.addEventListener("open-register", openRegister);
    return () => window.removeEventListener("open-register", openRegister);
  }, []);

  useEffect(() => {
    if (token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      setIsAuthenticated(true);
      api
        .get("/api/all")
        .then((res) => setData(res.data))
        .catch((err) => setError(err.message));
    }
  }, [token]);

  // ====== LOGIN ======
  const handleLogin = (email, password) => {
    api
      .post("/api/login", { email, password })
      .then((res) => {
        if (res.data.access_token) {
          setToken(res.data.access_token);
          setRole(res.data.role || "user");
          localStorage.setItem("jwt_token", res.data.access_token);
          localStorage.setItem("user_role", res.data.role || "user");
          setIsAuthenticated(true);
          setError(null);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Login failed");
      });
  };

  // ====== REGISTER ======
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

  // ====== LOGOUT ======
  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken(null);
    setRole("user");
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_role");
    delete api.defaults.headers.Authorization;
  };

  // ====== VIEW HANDLERS ======
  if (!isAuthenticated) {
    return showRegister ? (
      <RegisterScreen onRegister={handleRegister} />
    ) : (
      <LoginScreen onLogin={handleLogin} />
    );
  }

  // ====== ADD DEVICE SCREEN ======

  // ====== MY DEVICES SCREEN ======
  if (showMyDevices) {
    return (
      <MyDevicesScreen
        onBack={() => setShowMyDevices(false)}
        onDiagnostics={(id) => {
          setSelectedDeviceId(id);
          setShowMyDevices(false);
        }}
        role={role}
      />
    );
  }

  // ====== DEVICE DIAGNOSTICS SCREEN ======
  if (selectedDeviceId) {
    return (
      <DeviceDiagnosticsScreen
        deviceId={selectedDeviceId}
        onBack={() => setSelectedDeviceId(null)}
        setShowMyDevices(true);
      />
    );
  }

  // ====== MAIN DASHBOARD ======
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Car Diagnostics Dashboard</h1>
      <h3 style={{ color: role === "admin" ? "darkred" : "black" }}>
        Logged in as: <span style={{ textTransform: "capitalize" }}>{role}</span>
      </h3>

      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={handleLogout}
          style={{
            marginRight: "1rem",
            padding: "0.5rem 1rem",
            background: "red",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Logout
        </button>



        <button
          onClick={() => setShowMyDevices(true)}
          style={{
            padding: "0.5rem 1rem",
            background: "blue",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {role === "admin" ? "All Devices" : "My Devices"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {!data && !error && <p>Loading data...</p>}

      {data && (
        <table
          border="1"
          cellPadding="8"
          style={{ borderCollapse: "collapse", marginTop: "1rem", width: "100%" }}
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
                {(v.dtc_codes || []).join(', ')}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
