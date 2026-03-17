import React, { useState, useEffect } from "react";
import "./styles/global.css";
import { api } from "./api";

function MainScreen({ onNavigate, user }) {
  const [stats, setStats] = useState({
    totalDevices: 0,
    totalVehicles: 0,
    activeDTCs: 0,
    vehiclesWithIssues: 0,
  });

  const [vehiclesWithIssuesList, setVehiclesWithIssuesList] = useState([]);
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

      const response = await api.get("/api/dashboard-summary");
      const data = response.data;

      if (data.status === "success") {
        setStats({
          totalDevices: data.summary.total_devices || 0,
          totalVehicles: data.summary.total_vehicles || 0,
          activeDTCs: data.summary.active_dtcs || 0,
          vehiclesWithIssues: data.summary.vehicles_with_issues || 0,
        });

        setVehiclesWithIssuesList(data.vehicles_with_issues_list || []);
      }

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
      description: "View your registered vehicles and their current status.",
      action: () => onNavigate("telemetry-comparison"),
    },
    {
      icon: "📟",
      title: "My Devices",
      description: "Manage devices and view linked vehicle information.",
      action: () => onNavigate("my-devices"),
    },
    {
      icon: "🩺",
      title: "Diagnostics",
      description: "Open diagnostics for a linked device and view active DTCs.",
      action: () => onNavigate("my-devices"),
    },
    {
      icon: "📋",
      title: "DTC History",
      description: "Browse stored fault code history by VIN.",
      action: () => onNavigate("dtc-history"),
    },
  ];

  const handleOpenDiagnostics = (deviceId) => {
    if (!deviceId) return;
    onNavigate("device-diagnostics", { deviceId });
  };

  if (loading) {
    return (
      <div className="devices-container">
        <div className="loading-center">
          <div className="spinner-large"></div>
          <p>Loading home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="devices-container">
      <div className="devices-header">
        <div className="header-content">
          <h1>Home</h1>
          <p style={{ marginTop: "0.35rem", color: "var(--text-secondary)" }}>
            Welcome back, <strong style={{ color: "var(--text-primary)" }}>{displayName}</strong>
          </p>
        </div>
      </div>

      {error && (
        <div className="error-message card">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">{stats.totalVehicles}</span>
          <span className="stat-label">My Vehicles</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.totalDevices}</span>
          <span className="stat-label">My Devices</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.activeDTCs}</span>
          <span className="stat-label">Active DTCs</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.vehiclesWithIssues}</span>
          <span className="stat-label">Vehicles with Issues</span>
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
              className="card"
              style={{
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

      <div className="devices-table-container card" style={{ marginTop: "2rem" }}>
        <div className="table-header">
          <h3>Vehicles with Issues ({vehiclesWithIssuesList.length})</h3>
          <span className="table-info">
            Vehicles with currently active fault codes
          </span>
        </div>

        {vehiclesWithIssuesList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>No Active Issues</h3>
            <p>No vehicles with active DTC codes were found</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="devices-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Vehicle</th>
                  <th>VIN</th>
                  <th>Active DTCs</th>
                  <th>Linked Device</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehiclesWithIssuesList.map((vehicle) => (
                  <tr key={vehicle.vin} className="device-row">
                    <td>
                      <span className={`status-badge ${vehicle.online ? "success" : "danger"}`}>
                        <span className="status-dot"></span>
                        {vehicle.online ? "Online" : "Offline"}
                      </span>
                    </td>

                    <td className="vehicle-info">
                      <div className="vehicle-name">
                        {vehicle.brand || "Unknown"} {vehicle.model || ""}
                      </div>
                      <div className="vehicle-vin">
                        {vehicle.year || "—"} {vehicle.engine ? `• ${vehicle.engine}` : ""}
                      </div>
                    </td>

                    <td>
                      <code className="vin-code">{vehicle.vin}</code>
                    </td>

                    <td>
                      <span className="badge badge-danger">
                        {vehicle.dtc_count} active
                      </span>
                    </td>

                    <td>
                      {vehicle.device_id ? `#${vehicle.device_id}` : "Not linked"}
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {vehicle.device_id ? (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleOpenDiagnostics(vehicle.device_id)}
                            style={{ padding: "0.55rem 0.85rem", fontSize: "0.9rem" }}
                          >
                            Open Diagnostics
                          </button>
                        ) : null}

                        <button
                          className="btn btn-secondary"
                          onClick={() => onNavigate("dtc-history")}
                          style={{ padding: "0.55rem 0.85rem", fontSize: "0.9rem" }}
                        >
                          View DTC History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {stats.totalDevices === 0 && stats.totalVehicles === 0 && (
        <section
          className="card"
          style={{
            marginTop: "2rem",
          }}
        >
          <h2 style={{ marginBottom: "0.75rem" }}>Getting started</h2>
          <p style={{ marginBottom: "1rem", opacity: 0.9 }}>
            You do not have any registered devices or vehicles yet. Start by adding a device.
          </p>
          <button
            onClick={() => onNavigate("my-devices")}
            className="btn btn-primary"
          >
            Open My Devices
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
