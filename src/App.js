// App.js - Updated
import React, { useState, useEffect } from "react";
import "./styles/global.css";
import "./App.css";

// Import screens
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import MainScreen from "./MainScreen";
import MyDevicesScreen from "./MyDevicesScreen";
import DeviceDiagnosticsScreen from "./DeviceDiagnosticsScreen";
import DTCHistoryScreen from "./DTCHistoryScreen";
import { api } from "./api";

function App() {
  const [currentScreen, setCurrentScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setCurrentScreen("main");
    }

    // Listen for registration event
    const handleRegister = () => setCurrentScreen("register");
    window.addEventListener("open-register", handleRegister);

    return () => {
      window.removeEventListener("open-register", handleRegister);
    };
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const response = await api.post("/api/login", { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      setUser(user);
      setCurrentScreen("main");
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (email, password) => {
    try {
      const response = await api.post("/api/register", { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      setUser(user);
      setCurrentScreen("main");
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
    setCurrentScreen("login");
  };

  const navigateTo = (screen) => {
    setCurrentScreen(screen);
  };

  return (
    <div className="app">
      {/* Navigation Bar (shown only when logged in) */}
      {user && currentScreen !== "login" && currentScreen !== "register" && (
        <nav className="app-nav">
          <div className="nav-brand">
            <span className="nav-logo">🚗</span>
            <span className="nav-title">Car Diagnostics</span>
          </div>
          
          <div className="nav-links">
            <button
              className={`nav-link ${currentScreen === "main" ? "active" : ""}`}
              onClick={() => navigateTo("main")}
            >
              Dashboard
            </button>
            <button
              className={`nav-link ${currentScreen === "my-devices" ? "active" : ""}`}
              onClick={() => navigateTo("my-devices")}
            >
              My Devices
            </button>
            <button
              className={`nav-link ${currentScreen === "dtc-history" ? "active" : ""}`}
              onClick={() => navigateTo("dtc-history")}
            >
              DTC History
            </button>
          </div>
          
          <div className="nav-user">
            <span className="user-email">{user.email}</span>
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="app-content">
        {currentScreen === "login" && (
          <LoginScreen onLogin={handleLogin} />
        )}
        
        {currentScreen === "register" && (
          <RegisterScreen onRegister={handleRegister} />
        )}
        
        {currentScreen === "main" && (
          <MainScreen 
            onNavigate={navigateTo}
            user={user}
          />
        )}
        
        {currentScreen === "my-devices" && (
          <MyDevicesScreen 
            onBack={() => navigateTo("main")}
            onDiagnostics={(deviceId) => {
              setSelectedDeviceId(deviceId);
              navigateTo("device-diagnostics");
            }}
            role={user?.role}
          />
        )}
        
        {currentScreen === "device-diagnostics" && (
          <DeviceDiagnosticsScreen 
            deviceId={selectedDeviceId}
            onBack={() => navigateTo("my-devices")}
          />
        )}
        
        {currentScreen === "dtc-history" && (
          <DTCHistoryScreen 
            onBack={() => navigateTo("main")}
          />
        )}
      </main>

      {/* Footer */}
      {user && currentScreen !== "login" && currentScreen !== "register" && (
        <footer className="app-footer">
          <p>© {new Date().getFullYear()} Car Diagnostics System. All rights reserved.</p>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Support</a>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
