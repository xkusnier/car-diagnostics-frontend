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
import LiveDataScreen from "./LiveDataScreen";
import VehicleTripsScreen from "./VehicleTripsScreen";

import LoadingScreen from "./LoadingScreen";

function App() {
  const [currentScreen, setCurrentScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedDeviceForLive, setSelectedDeviceForLive] = useState(null);
  const [selectedDeviceInfo, setSelectedDeviceInfo] = useState(null);
  const [selectedVin, setSelectedVin] = useState(null);
  const [selectedVehicleInfo, setSelectedVehicleInfo] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [loadingStage, setLoadingStage] = useState("auth");
  const [loadingMessage, setLoadingMessage] = useState("Checking authentication...");
  const [loadingAttempt, setLoadingAttempt] = useState(0);

  const wakeUpBackend = async () => {
    setLoadingStage("backend");
    setLoadingMessage("Waking up the server...");

    const maxAttempts = 30;
    const delay = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      setLoadingAttempt(i + 1);
      try {
        const response = await fetch("https://car-diagnostics.onrender.com/api/health", {
          method: "GET",
          mode: "cors",
        });

        if (response.ok) {
          console.log("Backend is awake!");
          setLoadingStage("auth");
          checkAuthStatus();
          return;
        }
      } catch (err) {
        console.log(`Attempt ${i + 1}: Backend not responding yet...`);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    setLoadingMessage("Server is taking too long to respond. Please refresh the page.");
  };

  useEffect(() => {
    wakeUpBackend();

    const handleRegisterEvent = () => setCurrentScreen("register");
    window.addEventListener("open-register", handleRegisterEvent);

    return () => {
      window.removeEventListener("open-register", handleRegisterEvent);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    console.log(`Screen ${currentScreen} refreshed`);
  };

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const savedEmail = localStorage.getItem("email");
      const savedRole = localStorage.getItem("role");
      const savedUsername = localStorage.getItem("username");

      if (!token) {
        setIsCheckingAuth(false);
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      try {
        await api.get("/api/my-devices");

        if (savedEmail && savedRole) {
          setUser({
            email: savedEmail,
            role: savedRole,
            username: savedUsername || "",
          });
        } else {
          setUser({
            email: "User",
            role: "user",
            username: "",
          });
        }

        setCurrentScreen("main");
      } catch (error) {
        if (error.response?.status === 401) {
          console.log("Token invalid or expired, clearing auth data");

          localStorage.removeItem("token");
          localStorage.removeItem("email");
          localStorage.removeItem("role");
          localStorage.removeItem("username");
          delete api.defaults.headers.common["Authorization"];
        } else {
          console.error("API health check failed:", error);
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
      const { access_token, role, username } = response.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("email", email);
      localStorage.setItem("role", role);
      localStorage.setItem("username", username || "");

      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      const userObj = {
        email: email,
        role: role,
        username: username || "",
      };

      setUser(userObj);
      setCurrentScreen("main");

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);

      let errorMessage = "Login failed. Please try again.";

      if (error.response?.status === 401) {
        errorMessage = "Invalid email or password";
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error during login. Please try again later.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const handleRegister = async (username, email, password) => {
    try {
      await api.post("/api/register", {
        username,
        email,
        password,
      });

      return await handleLogin(email, password);
    } catch (error) {
      console.error("Registration error:", error);

      let errorMessage = "Registration failed. Please try again.";

      if (error.response?.status === 409) {
        const raw = String(error.response?.data?.error || "").toLowerCase();

        if (raw.includes("username")) {
          errorMessage = "Username already exists";
        } else {
          errorMessage = "User with this email already exists";
        }
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error during registration. Please try again later.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    localStorage.removeItem("username");

    delete api.defaults.headers.common["Authorization"];

    setUser(null);
    setCurrentScreen("login");
  };

  const navigateTo = (screen, params = {}) => {
    if (typeof params === "number") {
      setSelectedDeviceId(params);
      setCurrentScreen(screen);
      return;
    }

    if (params.deviceId) {
      setSelectedDeviceId(params.deviceId);
    }

    if (screen === "live-data") {
      if (arguments.length === 3) {
        setSelectedDeviceForLive(arguments[1]);
        setSelectedDeviceInfo(arguments[2]);
      } else if (params.type === "live" || (params.deviceId && params.deviceInfo)) {
        setSelectedDeviceForLive(params.deviceId);
        setSelectedDeviceInfo(params.deviceInfo);
      }
    }

    if (screen === "vehicle-trips") {
      if (params.vin) setSelectedVin(params.vin);
      if (params.vehicleInfo) setSelectedVehicleInfo(params.vehicleInfo);
    }

    setCurrentScreen(screen);
  };

  const navigateToLiveData = (deviceId, deviceInfo) => {
    setSelectedDeviceForLive(deviceId);
    setSelectedDeviceInfo(deviceInfo);
    setCurrentScreen("live-data");
  };

  if (isCheckingAuth || loadingStage === "backend") {
    return <LoadingScreen message={loadingMessage} attempt={loadingAttempt} />;
  }

  return (
    <div className="app">
      {user && currentScreen !== "login" && currentScreen !== "register" && (
        <nav className="app-nav">
          <div
            className="nav-brand"
            onClick={() => navigateTo("main")}
            style={{ cursor: "pointer" }}
            title="Go to Home"
          >
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
              className={`nav-link ${currentScreen === "telemetry-comparison" ? "active" : ""}`}
              onClick={() => navigateTo("telemetry-comparison")}
            >
              My Vehicles
            </button>
            <button
              className={`nav-link ${currentScreen === "dtc-history" ? "active" : ""}`}
              onClick={() => navigateTo("dtc-history")}
            >
              DTC History
            </button>
          </div>

          <div className="nav-user">
            <button
              className="btn-refresh"
              onClick={handleRefresh}
              title="Refresh current screen"
            >
              🔄
            </button>
            <span className="user-email">{user?.username || user?.email || "User"}</span>
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>
      )}

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
            key={`main-${refreshKey}`}
            onNavigate={navigateTo}
            user={user}
          />
        )}

        {currentScreen === "my-devices" && user && (
          <MyDevicesScreen
            key={`my-devices-${refreshKey}`}
            onBack={() => navigateTo("main")}
            onDiagnostics={(deviceId) => {
              setSelectedDeviceId(deviceId);
              navigateTo("device-diagnostics");
            }}
            onLiveData={(deviceId, deviceInfo) => navigateToLiveData(deviceId, deviceInfo)}
            role={user?.role}
          />
        )}

        {currentScreen === "device-diagnostics" && user && (
          <DeviceDiagnosticsScreen
            key={`device-diagnostics-${refreshKey}`}
            deviceId={selectedDeviceId}
            onBack={() => navigateTo("my-devices")}
          />
        )}

        {currentScreen === "live-data" && user && (
          <LiveDataScreen
            key={`live-data-${refreshKey}`}
            deviceId={selectedDeviceForLive}
            deviceInfo={selectedDeviceInfo}
            onBack={() => navigateTo("my-devices")}
          />
        )}

        {currentScreen === "dtc-history" && user && (
          <DTCHistoryScreen
            key={`dtc-history-${refreshKey}`}
            onBack={() => navigateTo("main")}
          />
        )}

        {currentScreen === "telemetry-comparison" && user && (
          <VehicleTelemetryComparison
            key={`telemetry-${refreshKey}`}
            onNavigate={navigateTo}
            user={user}
          />
        )}

        {currentScreen === "vehicle-trips" && user && (
          <VehicleTripsScreen
            key={`trips-${refreshKey}`}
            vin={selectedVin}
            vehicleInfo={selectedVehicleInfo}
            onBack={() => navigateTo("telemetry-comparison")}
          />
        )}
      </main>
    </div>
  );
}

export default App;
