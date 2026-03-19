import React, { useState, useEffect, useRef } from "react";
import "./styles/global.css";
import {
  TruckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

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
import VehicleEventsScreen from "./VehicleEventsScreen";

import LoadingScreen from "./LoadingScreen";

function App() {
  const [currentScreen, setCurrentScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedDeviceForLive, setSelectedDeviceForLive] = useState(null);
  const [selectedDeviceInfo, setSelectedDeviceInfo] = useState(null);
  const [selectedVin, setSelectedVin] = useState(null);
  const [selectedVehicleInfo, setSelectedVehicleInfo] = useState(null);
  const [selectedEventsVin, setSelectedEventsVin] = useState(null);
  const [selectedEventsVehicleInfo, setSelectedEventsVehicleInfo] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [loadingStage, setLoadingStage] = useState("auth");
  const [loadingMessage, setLoadingMessage] = useState("Checking authentication...");
  const [loadingAttempt, setLoadingAttempt] = useState(0);

  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const profileRef = useRef(null);

  const [historyStack, setHistoryStack] = useState([]);

  const getCurrentRoute = () => {
    switch (currentScreen) {
      case "device-diagnostics":
        return {
          screen: currentScreen,
          params: {
            deviceId: selectedDeviceId,
          },
        };
      case "live-data":
        return {
          screen: currentScreen,
          params: {
            deviceId: selectedDeviceForLive,
            deviceInfo: selectedDeviceInfo,
            type: "live",
          },
        };
      case "vehicle-trips":
        return {
          screen: currentScreen,
          params: {
            vin: selectedVin,
            vehicleInfo: selectedVehicleInfo,
          },
        };
      case "vehicle-events":
        return {
          screen: currentScreen,
          params: {
            vin: selectedEventsVin,
            vehicleInfo: selectedEventsVehicleInfo,
          },
        };
      default:
        return {
          screen: currentScreen,
          params: {},
        };
    }
  };

  const applyRoute = (screen, params = {}) => {
    if (typeof params === "number") {
      setSelectedDeviceId(params);
      setCurrentScreen(screen);
      return;
    }

    if (params.deviceId) {
      setSelectedDeviceId(params.deviceId);
    }

    if (screen === "live-data") {
      if (params.deviceId) {
        setSelectedDeviceForLive(params.deviceId);
      }
      if (params.deviceInfo) {
        setSelectedDeviceInfo(params.deviceInfo);
      }
    }

    if (screen === "vehicle-trips") {
      if (params.vin) setSelectedVin(params.vin);
      if (params.vehicleInfo) setSelectedVehicleInfo(params.vehicleInfo);
    }

    if (screen === "vehicle-events") {
      if (params.vin) setSelectedEventsVin(params.vin);
      if (params.vehicleInfo) setSelectedEventsVehicleInfo(params.vehicleInfo);
    }

    setCurrentScreen(screen);
    setIsProfilePopupOpen(false);
  };

  const topLevelScreens = ["main", "my-devices", "telemetry-comparison", "dtc-history"];

  const navigateTo = (screen, params = {}, options = {}) => {
    const { resetHistory = false } = options;

    const isTopLevelTarget = topLevelScreens.includes(screen);

    if (resetHistory || isTopLevelTarget) {
      setHistoryStack([]);
    } else if (currentScreen && currentScreen !== "login" && currentScreen !== "register") {
      const currentRoute = getCurrentRoute();
      setHistoryStack((prev) => [...prev, currentRoute]);
    }

    applyRoute(screen, params);
  };

  const goBack = () => {
    setHistoryStack((prev) => {
      if (prev.length === 0) {
        applyRoute("main", {});
        return [];
      }

      const newHistory = [...prev];
      const previousRoute = newHistory.pop();

      if (previousRoute) {
        applyRoute(previousRoute.screen, previousRoute.params || {});
      } else {
        applyRoute("main", {});
      }

      return newHistory;
    });
  };

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
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfilePopupOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
        setHistoryStack([]);
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

  const handleLogin = async (identifier, password) => {
    try {
      const response = await api.post("/api/login", { identifier, password });
      const { access_token, role, username, email } = response.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("email", email || "");
      localStorage.setItem("role", role);
      localStorage.setItem("username", username || "");

      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      const userObj = {
        email: email || "",
        role,
        username: username || "",
      };

      setUser(userObj);
      setCurrentScreen("main");
      setHistoryStack([]);

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);

      let errorMessage = "Login failed. Please try again.";

      if (error.response?.status === 401) {
        errorMessage = "Invalid email/username or password";
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
    setSelectedDeviceId(null);
    setSelectedDeviceForLive(null);
    setSelectedDeviceInfo(null);
    setSelectedVin(null);
    setSelectedVehicleInfo(null);
    setSelectedEventsVin(null);
    setSelectedEventsVehicleInfo(null);
    setIsProfilePopupOpen(false);
    setHistoryStack([]);
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
            onClick={() => navigateTo("main", {}, { resetHistory: true })}
            style={{ cursor: "pointer" }}
            title="Go to Home"
          >
            <TruckIcon style={{ width: "1.5rem", height: "1.5rem" }} />
            <span className="nav-title">Car Diagnostics</span>
          </div>

          <div className="nav-links">
            <button
              className={`nav-link ${currentScreen === "main" ? "active" : ""}`}
              onClick={() => navigateTo("main", {}, { resetHistory: true })}
            >
              Dashboard
            </button>
            <button
              className={`nav-link ${currentScreen === "my-devices" ? "active" : ""}`}
              onClick={() => navigateTo("my-devices", {}, { resetHistory: true })}
            >
              My Devices
            </button>
            <button
              className={`nav-link ${
                currentScreen === "telemetry-comparison" ||
                currentScreen === "vehicle-trips" ||
                currentScreen === "vehicle-events"
                  ? "active"
                  : ""
              }`}
              onClick={() => navigateTo("telemetry-comparison", {}, { resetHistory: true })}
            >
              My Vehicles
            </button>
            <button
              className={`nav-link ${currentScreen === "dtc-history" ? "active" : ""}`}
              onClick={() => navigateTo("dtc-history", {}, { resetHistory: true })}
            >
              DTC History
            </button>
          </div>

          <div className="nav-user">
            <button
              className="btn-refresh"
              onClick={handleRefresh}
              title="Refresh current screen"
              type="button"
            >
              <ArrowPathIcon className="refresh-icon" />
            </button>

            <div className="profile-menu-wrapper" ref={profileRef}>
              <button
                className="profile-trigger"
                onClick={() => setIsProfilePopupOpen((prev) => !prev)}
                title="Show profile info"
                type="button"
              >
                <span className="profile-emoji">👤</span>
                <span className="profile-name">
                  {user?.username || user?.email || "User"}
                </span>
              </button>

              {isProfilePopupOpen && (
                <div className="profile-popup">
                  <div className="profile-popup-row">
                    <span className="profile-popup-icon">📧</span>
                    <div className="profile-popup-content">
                      <div className="profile-popup-label">Email</div>
                      <div className="profile-popup-email">
                        {user?.email || "No email available"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button className="btn-logout" onClick={handleLogout} type="button">
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
            onBack={() => navigateTo("main", {}, { resetHistory: true })}
            onDiagnostics={(deviceId) => {
              navigateTo("device-diagnostics", { deviceId });
            }}
            onLiveData={(deviceId, deviceInfo) =>
              navigateTo("live-data", {
                type: "live",
                deviceId,
                deviceInfo,
              })
            }
            role={user?.role}
          />
        )}

        {currentScreen === "device-diagnostics" && user && (
          <DeviceDiagnosticsScreen
            key={`device-diagnostics-${refreshKey}`}
            deviceId={selectedDeviceId}
            onBack={goBack}
          />
        )}

        {currentScreen === "live-data" && user && (
          <LiveDataScreen
            key={`live-data-${refreshKey}`}
            deviceId={selectedDeviceForLive}
            deviceInfo={selectedDeviceInfo}
            onBack={goBack}
          />
        )}

        {currentScreen === "dtc-history" && user && (
          <DTCHistoryScreen
            key={`dtc-history-${refreshKey}`}
            onBack={() => navigateTo("main", {}, { resetHistory: true })}
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
            onBack={goBack}
          />
        )}

        {currentScreen === "vehicle-events" && user && (
          <VehicleEventsScreen
            key={`vehicle-events-${refreshKey}`}
            vin={selectedEventsVin}
            vehicleInfo={selectedEventsVehicleInfo}
            onBack={goBack}
          />
        )}
      </main>
    </div>
  );
}

export default App;
