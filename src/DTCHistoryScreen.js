import React, { useState, useEffect } from "react";
import { api } from "./api";
import "./styles/global.css";
import {
  ExclamationTriangleIcon,
  TruckIcon,
  ArrowsUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  MapIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

function VehicleTelemetryComparison({ onNavigate }) {
  const [vehicles, setVehicles] = useState([]);
  const [summary, setSummary] = useState({
    totalVehicles: 0,
    onlineVehicles: 0,
    totalSamples: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "online", direction: "desc" });
  const [deletingVin, setDeletingVin] = useState(null);

  useEffect(() => {
    fetchTelemetryComparison();
    const interval = setInterval(fetchTelemetryComparison, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTelemetryComparison = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login first");
        setLoading(false);
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const response = await api.get("/api/vehicles/telemetry-comparison");

      if (response.data.status === "success") {
        setVehicles(response.data.vehicles);
        setSummary({
          totalVehicles: response.data.summary.total_vehicles,
          onlineVehicles: response.data.summary.online_vehicles,
          totalSamples: response.data.summary.total_samples || 0
        });
      }

      setError(null);
    } catch (error) {
      console.error("Error fetching telemetry comparison:", error);
      setError("Failed to load vehicle telemetry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (vin) => {
    if (!window.confirm(`Are you sure you want to delete vehicle ${vin}?`)) return;

    setDeletingVin(vin);
    try {
      const token = localStorage.getItem("token");
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      await api.delete(`/api/user-vehicle/${vin}`);
      await fetchTelemetryComparison();
      alert("Vehicle deleted successfully");
    } catch (err) {
      console.error("Error deleting vehicle:", err);
      alert(err.response?.data?.error || "Failed to delete vehicle");
    } finally {
      setDeletingVin(null);
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedVehicles = () => {
    return [...vehicles].sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case "online":
          aVal = a.online ? 1 : 0;
          bVal = b.online ? 1 : 0;
          break;
        case "vin":
          aVal = a.vin || "ZZZ";
          bVal = b.vin || "ZZZ";
          break;
        case "brand":
          aVal = a.brand || "ZZZ";
          bVal = b.brand || "ZZZ";
          break;
        case "avg_speed":
          aVal = a.statistics?.avg_speed || -1;
          bVal = b.statistics?.avg_speed || -1;
          break;
        case "avg_rpm":
          aVal = a.statistics?.avg_rpm || -1;
          bVal = b.statistics?.avg_rpm || -1;
          break;
        case "avg_consumption":
          aVal = a.statistics?.avg_consumption || 999;
          bVal = b.statistics?.avg_consumption || 999;
          break;
        case "samples":
          aVal = a.statistics?.samples || 0;
          bVal = b.statistics?.samples || 0;
          break;
        default:
          aVal = a[sortConfig.key];
          bVal = b[sortConfig.key];
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const formatNumber = (num, decimals = 1) => {
    if (num === null || num === undefined) return "—";
    return num.toFixed(decimals);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowsUpDownIcon style={{ width: "1rem", height: "1rem" }} />;
    }
    return sortConfig.direction === "asc"
      ? <ArrowUpIcon style={{ width: "1rem", height: "1rem" }} />
      : <ArrowDownIcon style={{ width: "1rem", height: "1rem" }} />;
  };

  const getStatusColor = (status) => {
    return status ? "success" : "danger";
  };

  if (loading) {
    return (
      <div className="devices-container">
        <div className="loading-center">
          <div className="spinner-large"></div>
          <p>Loading vehicle statistics...</p>
        </div>
      </div>
    );
  }

  const sortedVehicles = getSortedVehicles();

  return (
    <div className="devices-container">
      <div className="devices-header">
        <div className="header-content">
          <h1>My Vehicles</h1>
        </div>
        {/* Refresh button removed as requested */}
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">{summary.totalVehicles}</span>
          <span className="stat-label">Total Vehicles</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{summary.onlineVehicles}</span>
          <span className="stat-label">Online</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{summary.totalSamples.toLocaleString()}</span>
          <span className="stat-label">Total Samples</span>
        </div>
      </div>

      {/* Filter section completely removed as requested */}

      {error && (
        <div className="error-message card">
          <ExclamationTriangleIcon className="error-icon" style={{ width: "1.5rem", height: "1.5rem" }} />
          <p>{error}</p>
        </div>
      )}

      <div className="devices-table-container card">
        <div className="table-header">
          <h3>Vehicles ({sortedVehicles.length})</h3>
          <span className="table-info">
            Showing {sortedVehicles.length} of {vehicles.length} vehicles
          </span>
        </div>

        {sortedVehicles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <TruckIcon style={{ width: "3rem", height: "3rem", margin: "0 auto" }} />
            </div>
            <h3>No Vehicles Found</h3>
            <p>No vehicles are currently registered to your account</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="devices-table" style={{ tableLayout: "fixed", width: "100%" }}>
              <colgroup>
                <col style={{ width: "7%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "22%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th onClick={() => handleSort("online")}>
                    Status {getSortIcon("online")}
                  </th>
                  <th onClick={() => handleSort("vin")}>
                    Vehicle {getSortIcon("vin")}
                  </th>
                  <th onClick={() => handleSort("avg_speed")}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      Avg Speed {getSortIcon("avg_speed")}
                    </span>
                  </th>
                  <th onClick={() => handleSort("avg_rpm")}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      Avg RPM {getSortIcon("avg_rpm")}
                    </span>
                  </th>
                  <th onClick={() => handleSort("avg_consumption")}>
                    Avg Cons. {getSortIcon("avg_consumption")}
                  </th>
                  <th>Range (RPM)</th>
                  <th>Odometer</th>
                  <th onClick={() => handleSort("samples")}>
                    Samples {getSortIcon("samples")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedVehicles.map((vehicle) => (
                  <tr key={vehicle.vin} className="device-row">
                    <td>
                      <span className={`status-badge ${getStatusColor(vehicle.online)}`}>
                        <span className="status-dot"></span>
                        {vehicle.online ? "Online" : "Offline"}
                      </span>
                    </td>

                    <td className="vehicle-info" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                      <div className="vehicle-name" style={{ fontSize: "0.9rem" }}>
                        {vehicle.brand || "Unknown"} {vehicle.model || ""}
                      </div>
                      <div className="vehicle-vin" style={{ fontSize: "0.8rem" }}>
                        <code className="vin-code" style={{ fontSize: "0.8rem" }}>{vehicle.vin || "No VIN"}</code>
                      </div>
                    </td>

                    <td style={{ fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                      {vehicle.statistics?.avg_speed ? (
                        <span>{formatNumber(vehicle.statistics.avg_speed)} km/h</span>
                      ) : "—"}
                    </td>

                    <td style={{ fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                      {vehicle.statistics?.avg_rpm ? (
                        <span>{formatNumber(vehicle.statistics.avg_rpm)} rpm</span>
                      ) : "—"}
                    </td>

                    <td style={{ fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                      {vehicle.statistics?.avg_consumption ? (
                        <span>{formatNumber(vehicle.statistics.avg_consumption)} L/100km</span>
                      ) : "—"}
                    </td>

                    <td style={{ fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                      {vehicle.statistics?.min_rpm && vehicle.statistics?.max_rpm ? (
                        <span>{vehicle.statistics.min_rpm} - {vehicle.statistics.max_rpm}</span>
                      ) : "—"}
                    </td>

                    <td style={{ fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                      {vehicle.statistics?.total_odometer ? (
                        <span>{(vehicle.statistics.total_odometer / 1000).toFixed(1)}k km</span>
                      ) : "—"}
                    </td>

                    <td style={{ fontSize: "0.9rem", textAlign: "center" }}>
                      {vehicle.statistics?.samples ? (
                        <span className="samples-badge">{vehicle.statistics.samples}</span>
                      ) : "0"}
                    </td>

                    <td>
                      <div className="action-buttons" style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        {vehicle.device_id ? (
                          <>
                            <button
                              className="btn-action diagnostics"
                              onClick={() => onNavigate("device-diagnostics", { deviceId: vehicle.device_id })}
                              title="View Diagnostics"
                              disabled={deletingVin === vehicle.vin}
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem" }}
                            >
                              <WrenchScrewdriverIcon style={{ width: "0.95rem", height: "0.95rem" }} />
                              Diag
                            </button>
                            <button
                              className="btn-action live-data"
                              onClick={() => onNavigate("live-data", {
                                type: "live",
                                deviceId: vehicle.device_id,
                                deviceInfo: {
                                  device_id: vehicle.device_id,
                                  vin: vehicle.vin,
                                  brand: vehicle.brand,
                                  model: vehicle.model
                                }
                              })}
                              title="View Live Data"
                              disabled={deletingVin === vehicle.vin}
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem", backgroundColor: "#4caf50" }}
                            >
                              <ChartBarIcon style={{ width: "0.95rem", height: "0.95rem" }} />
                              Live
                            </button>
                          </>
                        ) : (
                          <span className="no-device" style={{ color: "#999", fontSize: "0.8rem" }}>
                            No device
                          </span>
                        )}

                        <button
                          className="btn-action trips"
                          onClick={() => onNavigate("vehicle-trips", {
                            vin: vehicle.vin,
                            vehicleInfo: {
                              vin: vehicle.vin,
                              brand: vehicle.brand,
                              model: vehicle.model,
                              year: vehicle.year
                            }
                          })}
                          title="View Trips"
                          disabled={deletingVin === vehicle.vin}
                          style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem", backgroundColor: "#9c27b0" }}
                        >
                          <MapIcon style={{ width: "0.95rem", height: "0.95rem" }} />
                          Trips
                        </button>

                        <button
                          className="btn-action delete"
                          onClick={() => handleDeleteVehicle(vehicle.vin)}
                          title="Delete Vehicle"
                          disabled={deletingVin === vehicle.vin}
                          style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem" }}
                        >
                          {deletingVin === vehicle.vin ? (
                            <div className="spinner-small"></div>
                          ) : (
                            <TrashIcon style={{ width: "0.95rem", height: "0.95rem" }} />
                          )}
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

      <div className="legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#4caf50" }}></span> Online
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#f44336" }}></span> Offline
        </div>
        <div className="legend-item">
          <ChartBarIcon className="legend-icon" style={{ width: "1rem", height: "1rem" }} /> Historical averages
        </div>
      </div>
    </div>
  );
}

export default VehicleTelemetryComparison;
