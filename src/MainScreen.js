import React, { useState, useEffect } from "react";
import "./styles/global.css";
import { api } from "./api";
import {
  TruckIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";

// Dashboard po prihlaseni zobrazuje rychly prehlad a navigacne karty.
function MainScreen({ onNavigate, user }) {
  // Statistiky su pokope, lebo sa vykresluju v spolocnych kartach.
  const [stats, setStats] = useState({
    totalDevices: 0,
    totalVehicles: 0,
    activeDTCs: 0,
    vehiclesWithIssues: 0,
  });

  // Vozidla s problemami sa drzia oddelene pre spodny prehlad.
  const [vehiclesWithIssuesList, setVehiclesWithIssuesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Meno v hlavicke sa sklada z najdostupnejsieho udaja o pouzivatelovi.
  const displayName =
    user?.name || user?.nickname || user?.email?.split("@")[0] || "User";

  // Rola urcuje, ci sa maju zobrazit aj admin casti.
  const isAdmin = user?.role === "admin";

  // Po otvoreni dashboardu sa nacita suhrn zo servera.
  useEffect(() => {
    fetchHomeData();
  }, []);

  // Dashboard summary endpoint vracia cisla pre hlavne karty.
  const fetchHomeData = async () => {
    try {
      // Bez tokenu nema zmysel volat chraneny dashboard endpoint.
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login first");
        setLoading(false);
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Backend vracia pocet zariadeni, vozidiel a problemov.
      const response = await api.get("/api/dashboard-summary");
      const data = response.data;

      // Stav sa nastavuje iba pri uspesnej odpovedi backendu.
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

  // Definicia navigacnych sekcii je v poli, aby sa karty dali renderovat mapom.
  const mainSections = [
    {
      icon: CpuChipIcon,
      title: "My Devices, Diagnostics & Live Access",
      description:
        "Manage your diagnostic devices, linked VINs, connection status, diagnostics access, and live vehicle data entry points.",
      action: () => onNavigate("my-devices"),
    },
    {
      icon: TruckIcon,
      title: "My Vehicles, Statistics, Trips & Events",
      description:
        "Browse all linked vehicles, compare telemetry statistics, sort by speed/RPM/consumption, view trips, events, odometer, and open available vehicle actions.",
      action: () => onNavigate("telemetry-comparison"),
    },
    {
      icon: DocumentTextIcon,
      title: "DTC History & Fault Code Records",
      description:
        "Browse saved DTC history, previously detected fault codes, descriptions, and historical issue records by VIN.",
      action: () => onNavigate("dtc-history"),
    },
  ];

  // Diagnostika potrebuje deviceId z konkretneho problemoveho vozidla.
  const handleOpenDiagnostics = (deviceId) => {
    if (!deviceId) return;
    onNavigate("device-diagnostics", { deviceId });
  };

  // Pri nacitani dashboardu sa neukazuje prazdny obsah.
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
            Welcome back,{" "}
            <strong style={{ color: "var(--text-primary)" }}>{displayName}</strong>
          </p>
          <p className="subtitle" style={{ marginTop: "0.5rem" }}>
            Start in <strong>My Devices</strong> by adding your diagnostic device.
            After the device is physically connected to a vehicle, it will appear
            automatically in <strong>My Vehicles</strong>, where you can view
            telemetry statistics, trips, events, and related vehicle actions.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-message card">
          <span
            className="error-icon"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ExclamationTriangleIcon style={{ width: "1.5rem", height: "1.5rem" }} />
          </span>
          <p>{error}</p>
        </div>
      )}

      <div
        className="status-message info"
        style={{ marginBottom: "1.5rem", alignItems: "flex-start" }}
      >
        <InformationCircleIcon
          style={{
            width: "1.1rem",
            height: "1.1rem",
            marginTop: "0.1rem",
            flexShrink: 0,
          }}
        />
        <div>
          Vehicles are created automatically from linked device data. Diagnostics,
          live data, trips, events, and telemetry comparison features depend on an
          active device-to-vehicle relationship.
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">{stats.totalVehicles}</span>
          <span className="stat-label">{isAdmin ? "Total Vehicles" : "My Vehicles"}</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.totalDevices}</span>
          <span className="stat-label">{isAdmin ? "Total Devices" : "My Devices"}</span>
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
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "1rem",
          }}
        >
          {mainSections.map((section) => {
            const Icon = section.icon;

            return (
              <div
                key={section.title}
                onClick={section.action}
                className="card"
                style={{
                  cursor: "pointer",
                  transition: "0.2s ease",
                }}
              >
                <div
                  style={{
                    marginBottom: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Icon style={{ width: "1.8rem", height: "1.8rem" }} />
                </div>
                <h3 style={{ marginBottom: "0.5rem" }}>{section.title}</h3>
                <p style={{ opacity: 0.85, lineHeight: 1.5 }}>
                  {section.description}
                </p>
              </div>
            );
          })}
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
            <div
              className="empty-icon"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CheckCircleIcon style={{ width: "3rem", height: "3rem" }} />
            </div>
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
                  {isAdmin && <th>User ID</th>}
                  <th>Active DTCs</th>
                  <th>Linked Device</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehiclesWithIssuesList.map((vehicle) => (
                  <tr key={vehicle.vin} className="device-row">
                    <td>
                      <span
                        className={`status-badge ${
                          vehicle.online ? "success" : "danger"
                        }`}
                      >
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

                    {isAdmin && (
                      <td>
                        {vehicle.user_id ? (
                          <span className="user-id-badge">{vehicle.user_id}</span>
                        ) : (
                          <span className="unassigned">—</span>
                        )}
                      </td>
                    )}

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
                        ) : (
                          <span className="input-hint">
                            Link a device to open diagnostics.
                          </span>
                        )}
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
          <p style={{ marginBottom: "0.75rem", opacity: 0.9 }}>
            You do not have any registered devices or vehicles yet.
          </p>
          <p style={{ marginBottom: "1rem", opacity: 0.85 }}>
            Add your diagnostic device first. Once it is physically connected to
            a vehicle, that vehicle will be added automatically to your account.
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
