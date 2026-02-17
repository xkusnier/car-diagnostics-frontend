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
import VehicleTelemetryComparison from "./VehicleTelemetryComparison";
import LiveDataScreen from "./LiveDataScreen"; // ✅ IMPORT pre LiveDataScreen

function App() {
  const [currentScreen, setCurrentScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedDeviceForLive, setSelectedDeviceForLive] = useState(null); // ✅ PRE LIVE DATA
  const [selectedDeviceInfo, setSelectedDeviceInfo] = useState(null); // ✅ PRE LIVE DATA
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
      const savedEmail = localStorage.getItem("email");
      const savedRole = localStorage.getItem("role");
      
      if (!token) {
        setIsCheckingAuth(false);
        return;
      }

      // Set authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      // Try to verify token by calling a protected endpoint
      try {
        // Use /api/my-devices to verify token (this endpoint is @jwt_required)
        const response = await api.get("/api/my-devices");
        
        // If we get here, token is valid
        // Create user object from localStorage
        if (savedEmail && savedRole) {
          setUser({ 
            email: savedEmail, 
            role: savedRole 
          });
        } else {
          // Create fallback user
          setUser({ 
            email: "User", 
            role: "user" 
          });
        }
        
        setCurrentScreen("main");
      } catch (error) {
        if (error.response?.status === 401) {
          console.log("Token invalid or expired, clearing auth data");
      
          localStorage.removeItem("token");
          localStorage.removeItem("email");
          localStorage.removeItem("role");
          delete api.defaults.headers.common["Authorization"];
        } else {
          console.error("API health check failed:", error);
          // token necháme,
          // lebo nevieme či je problém na serveri
        }
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
      const { access_token, role } = response.data;
      
      // Save to localStorage - NOTE: backend returns "access_token" not "token"
      localStorage.setItem("token", access_token);
      localStorage.setItem("email", email);
      localStorage.setItem("role", role);
      
      // Set authorization header for future requests
      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      
      // Create user object
      const userObj = { 
        email: email, 
        role: role 
      };
      
      // Update state
      setUser(userObj);
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
      
      // After registration, auto-login
      return await handleLogin(email, password);
      
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
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    
    // Clear authorization header
    delete api.defaults.headers.common["Authorization"];
    
    // Reset state
    setUser(null);
    setCurrentScreen("login");
  };

  // Navigation function
  const navigateTo = (screen, params = {}) => {
    // Ak máme parameter deviceId, uložíme ho
    if (params.deviceId) {
      setSelectedDeviceId(params.deviceId);
    }
    setCurrentScreen(screen);
  };

  // ✅ NOVÁ FUNKCIA pre navigáciu na Live Data
  const navigateToLiveData = (deviceId, deviceInfo) => {
    setSelectedDeviceForLive(deviceId);
    setSelectedDeviceInfo(deviceInfo);
    setCurrentScreen('live-data');
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
            <button
              className={`nav-link ${currentScreen === "telemetry-comparison" ? "active" : ""}`}
              onClick={() => navigateTo("telemetry-comparison")}
            >
              📊 Telemetry Comparison
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
            onLiveData={(deviceId, deviceInfo) => navigateToLiveData(deviceId, deviceInfo)} // ✅ SPRÁVNE ODOVZDANÉ
            role={user?.role}
          />
        )}
        
        {currentScreen === "device-diagnostics" && user && (
          <DeviceDiagnosticsScreen 
            deviceId={selectedDeviceId}
            onBack={() => navigateTo("my-devices")}
          />
        )}
        
        {currentScreen === "live-data" && user && ( // ✅ NOVÁ OBRAZOVKA
          <LiveDataScreen 
            deviceId={selectedDeviceForLive}
            deviceInfo={selectedDeviceInfo}
            onBack={() => navigateTo("my-devices")}
          />
        )}
        
        {currentScreen === "dtc-history" && user && (
          <DTCHistoryScreen 
            onBack={() => navigateTo("main")}
          />
        )}
        

        {currentScreen === "telemetry-comparison" && user && (
          <VehicleTelemetryComparison 
            onNavigate={navigateTo}
            user={user}
          />
        )}
      </main>
    </div>
  );
}

export default App;
