import React, { useState, useEffect } from "react";
import "./styles/global.css";
import { api } from "./api";

function MainScreen({ onNavigate, user }) {
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    activeDTCs: 0,
    totalVehicles: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const displayName =
    user?.name ||
    user?.nickname ||
    user?.email?.split("@")[0] ||
    "User";

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login first");
        setLoading(false);
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const devicesRes = await api.get("/api/my-devices");
      const devices = devicesRes.data.devices || [];

      let vehicles = [];
      let activeDTCs = 0;

      try {
        const vehiclesRes = await api.get("/api/vehicles/telemetry-comparison");
        vehicles = vehiclesRes.data.vehicles || [];
      } catch (e) {
        vehicles = [];
      }

      // približný počet aktívnych DTC z vozidiel cez diagnostics by bol drahší,
      // takže zatiaľ nechávame 0 alebo neskôr doplníš endpoint
      activeDTCs = 0;

      setStats({
        totalDevices: devices.length,
        onlineDevices: devices.filter((d) => d.status === "Online").length,
        totalVehicles: vehicles.length,
        activeDTCs,
      });

      setError(null);
    } catch (err) {
      console.error("Error fetching home data:", err);
      setError("Failed to load home screen data.");
    } finally {
      setLoading(false);
    }
  };

  const mainSections = [
    {
      icon: "🚗",
      title: "My Vehicles",
      description: "Zobraziť vozidlá, ich stav a dostupné akcie.",
      action: () => onNavigate("my-vehicles"),
    },
    {
      icon: "📟",
      title: "My Devices",
      description: "Správa zariadení a prehľad pripojených jednotiek.",
      action: () => onNavigate("my-devices"),
    },
    {
      icon: "🩺",
      title: "Diagnostics",
      description: "Diagnostické údaje, DTC kódy a stav vozidla.",
      action: () => onNavigate("my-devices"),
    },
    {
      icon: "📋",
      title: "DTC History",
      description: "História chybových kódov pre konkrétne vozidlo.",
      action: () => onNavigate("dtc-history"),
    },
  ];

  const quickActions = [
    {
      label: "Add Device",
      action: () => onNavigate("add-device"),
    },
    {
      label: "Open My Devices",
      action: () => onNavigate("my-devices"),
    },
    {
      label: "Open My Vehicles",
      action: () => onNavigate("my-vehicles"),
    },
  ];

  if (loading) {
    return (
      <div className="main-screen">
        <div className="loading-center">
          <div className="spinner-large"></div>
          <p>Loading home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-screen">
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">Car Diagnostics</h1>
          <p style={{ marginTop: "0.5rem", opacity: 0.85 }}>
            Welcome back, <strong>{displayName}</strong>
          </p>
        </div>
      </header>

      {error && (
        <div className="error-card" style={{ marginBottom: "1.5rem" }}>
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      <section
        className="hero-card"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ marginBottom: "0.75rem" }}>Overview</h2>
        <p style={{ marginBottom: "1rem", opacity: 0.9 }}>
          Tu nájdeš rýchly prehľad a hlavné vstupy do aplikácie. Vyber si sekciu,
          s ktorou chceš pracovať.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {quickActions.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                padding: "0.85rem 1.1rem",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <div className="stats-grid">
        <div
          className="stat-card"
          onClick={() => onNavigate("my-vehicles")}
          style={{ cursor: "pointer" }}
        >
          <div
            className="stat-icon"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            🚗
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{stats.totalVehicles}</h3>
            <p className="stat-label">My Vehicles</p>
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigate("my-devices")}
          style={{ cursor: "pointer" }}
        >
          <div
            className="stat-icon"
            style={{
              background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
            }}
          >
            📟
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{stats.totalDevices}</h3>
            <p className="stat-label">My Devices</p>
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigate("my-devices")}
          style={{ cursor: "pointer" }}
        >
          <div
            className="stat-icon"
            style={{
              background: "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)",
            }}
          >
            ✅
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{stats.onlineDevices}</h3>
            <p className="stat-label">Online Devices</p>
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigate("dtc-history")}
          style={{ cursor: "pointer" }}
        >
          <div
            className="stat-icon"
            style={{
              background: "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)",
            }}
          >
            ⚠️
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{stats.activeDTCs}</h3>
            <p className="stat-label">Active DTCs</p>
          </div>
        </div>
      </div>

      <section style={{ marginTop: "2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Main sections</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {mainSections.map((section) => (
            <div
              key={section.title}
              onClick={section.action}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "18px",
                padding: "1.25rem",
                cursor: "pointer",
                transition: "0.2s ease",
              }}
            >
              <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>
                {section.icon}
              </div>
              <h3 style={{ marginBottom: "0.5rem" }}>{section.title}</h3>
              <p style={{ opacity: 0.85, lineHeight: 1.5 }}>
                {section.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {stats.totalDevices === 0 && stats.totalVehicles === 0 && (
        <section
          style={{
            marginTop: "2rem",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "18px",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ marginBottom: "0.75rem" }}>Getting started</h2>
          <p style={{ marginBottom: "1rem", opacity: 0.9 }}>
            Zatiaľ nemáš pridané zariadenia ani vozidlá. Začni pridaním zariadenia
            a po pripojení k vozidlu sa načítajú diagnostické údaje.
          </p>
          <button
            onClick={() => onNavigate("add-device")}
            style={{
              padding: "0.85rem 1.1rem",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Add first device
          </button>
        </section>
      )}

      <footer className="dashboard-footer">
        <p>Car Diagnostics {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default MainScreen;
