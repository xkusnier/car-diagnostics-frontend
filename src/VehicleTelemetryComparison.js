import React, { useState, useEffect, useRef } from "react";
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
  ShieldExclamationIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";

function VehicleTelemetryComparison({ onNavigate }) {
  const [vehicles, setVehicles] = useState([]);
  const [summary, setSummary] = useState({
    totalVehicles: 0,
    onlineVehicles: 0,
    totalSamples: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "online", direction: "desc" });
  const [deletingVin, setDeletingVin] = useState(null);
  const [openActionMenuVin, setOpenActionMenuVin] = useState(null);

  const actionMenuRef = useRef(null);

  useEffect(() => {
    fetchTelemetryComparison();
    const interval = setInterval(fetchTelemetryComparison, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuVin(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
          totalSamples: response.data.summary.total_samples || 0,
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
      setOpenActionMenuVin(null);
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
      let aVal;
      let bVal;

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
    return sortConfig.direction === "asc" ? (
      <ArrowUpIcon style={{ width: "1rem", height: "1rem" }} />
    ) : (
      <ArrowDownIcon style={{ width: "1rem", height: "1rem" }} />
    );
  };

  const getStatusColor = (status) => {
    return status ? "success" : "danger";
  };

  const toggleActionMenu = (vin) => {
    setOpenActionMenuVin((prev) => (prev === vin ? null : vin));
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

      {error && (
        <div className="error-message card">
          <ExclamationTriangleIcon
            className="error-icon"
            style={{ width: "1.5rem", height: "1.5rem" }}
          />
          <p>{error}</p>
        </div>
      )}

      <div className="devices-table-container card vehicles-table-container">
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
            <table className="devices-table vehicles-telemetry-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("online")}>
                    <span className="sortable-header">
                      Status {getSortIcon("online")}
                    </span>
                  </th>

                  <th onClick={() => handleSort("vin")}>
                    <span className="sortable-header">
                      Vehicle {getSortIcon("vin")}
                    </span>
                  </th>

                  <th onClick={() => handleSort("avg_speed")}>
                    <span className="sortable-header">
                      Avg Speed {getSortIcon("avg_speed")}
                    </span>
                  </th>

                  <th onClick={() => handleSort("avg_rpm")}>
                    <span className="sortable-header">
                      Avg RPM {getSortIcon("avg_rpm")}
                    </span>
                  </th>

                  <th onClick={() => handleSort("avg_consumption")}>
                    <span className="sortable-header">
                      Avg Cons. {getSortIcon("avg_consumption")}
                    </span>
                  </th>

                  <th>Range (RPM)</th>
                  <th>Odometer</th>

                  <th onClick={() => handleSort("samples")}>
                    <span className="sortable-header">
                      Samples {getSortIcon("samples")}
                    </span>
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

                    <td className="vehicle-cell">
                      <div className="vehicle-info">
                        <div className="vehicle-name">
                          {vehicle.brand || "Unknown"} {vehicle.model || ""}
                        </div>
                        <div className="vehicle-vin">
                          <code className="vin-code">{vehicle.vin || "No VIN"}</code>
                        </div>
                      </div>
                    </td>

                    <td className="metric-cell">
                      {vehicle.statistics?.avg_speed ? (
                        <span>{formatNumber(vehicle.statistics.avg_speed)} km/h</span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="metric-cell">
                      {vehicle.statistics?.avg_rpm ? (
                        <span>{formatNumber(vehicle.statistics.avg_rpm)} rpm</span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="metric-cell">
                      {vehicle.statistics?.avg_consumption ? (
                        <span>{formatNumber(vehicle.statistics.avg_consumption)} L/100km</span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="metric-cell">
                      {vehicle.statistics?.min_rpm && vehicle.statistics?.max_rpm ? (
                        <span>
                          {vehicle.statistics.min_rpm} - {vehicle.statistics.max_rpm}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="metric-cell">
                      {vehicle.statistics?.total_odometer ? (
                        <span>{(vehicle.statistics.total_odometer / 1000).toFixed(1)}k km</span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="samples-cell">
                      {vehicle.statistics?.samples ? (
                        <span className="samples-badge">{vehicle.statistics.samples}</span>
                      ) : (
                        "0"
                      )}
                    </td>

                    <td className="actions-cell">
                      <div
                        className="actions-menu-wrapper"
                        ref={openActionMenuVin === vehicle.vin ? actionMenuRef : null}
                      >
                        <button
                          className="btn-action-trigger"
                          type="button"
                          onClick={() => toggleActionMenu(vehicle.vin)}
                          disabled={deletingVin === vehicle.vin}
                        >
                          <EllipsisVerticalIcon style={{ width: "1rem", height: "1rem" }} />
                          Click to action
                        </button>

                        {openActionMenuVin === vehicle.vin && (
                          <div className="actions-popup">
                            {vehicle.device_id ? (
                              <>
                                <button
                                  className="actions-popup-item"
                                  onClick={() => {
                                    setOpenActionMenuVin(null);
                                    onNavigate("device-diagnostics", {
                                      deviceId: vehicle.device_id,
                                    });
                                  }}
                                  type="button"
                                >
                                  <WrenchScrewdriverIcon
                                    style={{ width: "1rem", height: "1rem" }}
                                  />
                                  Diagnostics
                                </button>

                                <button
                                  className="actions-popup-item"
                                  onClick={() => {
                                    setOpenActionMenuVin(null);
                                    onNavigate("live-data", {
                                      type: "live",
                                      deviceId: vehicle.device_id,
                                      deviceInfo: {
                                        device_id: vehicle.device_id,
                                        vin: vehicle.vin,
                                        brand: vehicle.brand,
                                        model: vehicle.model,
                                      },
                                    });
                                  }}
                                  type="button"
                                >
                                  <ChartBarIcon style={{ width: "1rem", height: "1rem" }} />
                                  Live Data
                                </button>
                              </>
                            ) : (
                              <div className="actions-popup-empty">No device available</div>
                            )}

                            <button
                              className="actions-popup-item"
                              onClick={() => {
                                setOpenActionMenuVin(null);
                                onNavigate("vehicle-trips", {
                                  vin: vehicle.vin,
                                  vehicleInfo: {
                                    vin: vehicle.vin,
                                    brand: vehicle.brand,
                                    model: vehicle.model,
                                    year: vehicle.year,
                                  },
                                });
                              }}
                              type="button"
                            >
                              <MapIcon style={{ width: "1rem", height: "1rem" }} />
                              Trips
                            </button>

                            <button
                              className="actions-popup-item"
                              onClick={() => {
                                setOpenActionMenuVin(null);
                                onNavigate("vehicle-events", {
                                  vin: vehicle.vin,
                                  vehicleInfo: {
                                    vin: vehicle.vin,
                                    brand: vehicle.brand,
                                    model: vehicle.model,
                                    year: vehicle.year,
                                  },
                                });
                              }}
                              type="button"
                            >
                              <ShieldExclamationIcon
                                style={{ width: "1rem", height: "1rem" }}
                              />
                              Events
                            </button>

                            <button
                              className="actions-popup-item danger"
                              onClick={() => handleDeleteVehicle(vehicle.vin)}
                              disabled={deletingVin === vehicle.vin}
                              type="button"
                            >
                              {deletingVin === vehicle.vin ? (
                                <div className="spinner-small"></div>
                              ) : (
                                <TrashIcon style={{ width: "1rem", height: "1rem" }} />
                              )}
                              Delete
                            </button>
                          </div>
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
    </div>
  );
}

export default VehicleTelemetryComparison;
