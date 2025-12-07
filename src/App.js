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
  const [currentScreen, setCurrentScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for registration event from LoginScreen
    const handleRegister = () => setCurrentScreen("register");
    window.addEventListener("open-register", handleRegister);

    return () => {
      window.removeEventListener("open-register", handleRegister);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        setIsCheckingAuth(false);
        return;
      }

      // Set authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      // Verify token with backend
      try {
        const response = await api.get("/api/verify-token");
        const user = response.data.user;
        
        // Save user to state
        setUser(user);
        setCurrentScreen("main");
      } catch (error) {
        console.log("Token verification failed, clearing auth data");
        // Token is invalid or expired
        localStorage.removeItem("token");
        delete api.defaults.headers.common["Authorization"];
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await api.post("/api/login", { email, password });
      const { token, user } = response.data;
      
      // Save token only (user data comes from backend)
      localStorage.setItem("token", token);
      
      // Set authorization header for future requests
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      // Update state
      setUser(user);
      setCurrentScreen("main");
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error.response?.data?.error || 
                          (error.response?.status === 401 ? 
                           "Invalid email or password" : 
                           "Login failed. Please try again.");
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  const handleRegister = async (email, password) => {
    try {
      const response = await api.post("/api/register", { 
        email, 
        password 
      });
      const { token, user } = response.data;
      
      // Save token only
      localStorage.setItem("token", token);
      
      // Set authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      // Update state
      setUser(user);
      setCurrentScreen("main");
      
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error.response?.data?.error || 
                          (error.response?.status === 409 ? 
                           "User with this email already exists" : 
                           "Registration failed. Please try again.");
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    
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

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-header">
            <div className="auth-logo">
              <span className="logo-icon">🚗</span>
              <h1 className="logo-text">Car Diagnostics</h1>
            </div>
            <div style={{ margin: '2rem 0' }}>
              <div className="spinner-large" style={{ margin: '0 auto' }}></div>
              <p style={{ marginTop: '1rem' }}>Checking authentication...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
