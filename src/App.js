import React, { useState, useEffect } from "react";
import "./styles/global.css";

// Import screens
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import MainScreen from "./MainScreen";
import MyDevicesScreen from "./MyDevicesScreen";
import DeviceDiagnosticsScreen from "./DeviceDiagnosticsScreen";
import DTCHistoryScreen from "./DTCHistoryScreen";
import { api } from "./api";

function App() {
  const [currentScreen, setCurrentScreen] = useState("login"); // Začíname s login screenom
  const [user, setUser] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    
    if (token && savedUser) {
      try {
        // Set authorization header
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        
        // Parse and set user
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        
        // Navigate to main screen
        setCurrentScreen("main");
      } catch (error) {
        console.error("Error parsing saved user:", error);
        // Clear invalid data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }

    // Listen for registration event from LoginScreen
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
      
      // Save to localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      
      // Set authorization header for future requests
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      // Update state
      setUser(user);
      setCurrentScreen("main");
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { 
        success: false, 
        message: error.response?.data?.error || "Login failed. Please try again." 
      };
    }
  };

  const handleRegister = async (email, password) => {
    try {
      const response = await api.post("/api/register", { email, password });
      const { token, user } = response.data;
      
      // Save to localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      
      // Set authorization header for future requests
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      // Update state
      setUser(user);
      setCurrentScreen("main");
      
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      return { 
        success: false, 
        message: error.response?.data?.error || "Registration failed. Please try again." 
      };
    }
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    // Clear authorization header
    delete api.defaults.headers.common["Authorization"];
    
    // Reset state
    setUser(null);
    setCurrentScreen("login");
  };

  // Navigation function
  const navigateTo = (screen) => {
    setCurrentScreen(screen);
  };

  return (
    <div className="app">
      {/* Navigation Bar - shown only when logged in and not on auth screens */}
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
            <span className="user-email">{user?.email || "User"}</span>
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="app-content">
        {currentScreen === "login" && (
          <LoginScreen 
            onLogin={handleLogin}
            onNavigateToRegister={() => setCurrentScreen("register")}
          />
        )}
        
        {currentScreen === "register" && (
          <RegisterScreen 
            onRegister={handleRegister}
            onNavigateToLogin={() => setCurrentScreen("login")}
          />
        )}
        
        {currentScreen === "main" && user && (
          <MainScreen 
            onNavigate={navigateTo}
            user={user}
          />
        )}
        
        {currentScreen === "my-devices" && user && (
          <MyDevicesScreen 
            onBack={() => navigateTo("main")}
            onDiagnostics={(deviceId) => {
              setSelectedDeviceId(deviceId);
              navigateTo("device-diagnostics");
            }}
            role={user?.role}
          />
        )}
        
        {currentScreen === "device-diagnostics" && user && (
          <DeviceDiagnosticsScreen 
            deviceId={selectedDeviceId}
            onBack={() => navigateTo("my-devices")}
          />
        )}
        
        {currentScreen === "dtc-history" && user && (
          <DTCHistoryScreen 
            onBack={() => navigateTo("main")}
          />
        )}
      </main>

      {/* Footer - shown only when logged in */}
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
