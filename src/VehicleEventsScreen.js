import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import "./styles/global.css";
import {
  ExclamationTriangleIcon,
  TruckIcon,
  BoltIcon,
  ArrowPathRoundedSquareIcon,
  ShieldExclamationIcon,
  FunnelIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";

function VehicleEventsScreen({ vin, vehicleInfo, onBack }) {
  const [events, setEvents] = useState([]);
  const [vehicle, setVehicle] = useState(vehicleInfo || { vin });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("ALL");

  useEffect(() => {
    fetchVehicleEvents();
  }, [vin]);

  const fetchVehicleEvents = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login first");
        setLoading(false);
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const response = await api.get(`/api/vehicle/${vin}/events`);

      if (response.data.status === "success") {
        setEvents(response.data.events || []);
        setVehicle((prev) => ({
          ...prev,
          vin,
          ...(response.data.vehicle || {}),
        }));
        setError(null);
      } else {
        setError("Failed to load vehicle events.");
      }
    } catch (err) {
      console.error("Error fetching vehicle events:", err);
      setError(err.response?.data?.error || "Failed to load vehicle events.");
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    if (filterType === "ALL") return events;
    return events.filter((event) => event.event_type === filterType);
  }, [events, filterType]);

  const summary = useMemo(() => {
    return {
      total: events.length,
      hardBrake: events.filter((e) => e.event_type === "HARD_BRAKE").length,
      sharpAcceleration: events.filter((e) => e.event_type === "SHARP_ACCELERATION").length,
      hardTurn: events.filter((e) => e.event_type === "HARD_TURN").length,
      crash: events.filter((e) => e.event_type === "CRASH").length,
    };
  }, [events]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return "—";
    return Number(num).toFixed(decimals);
  };

  const getEventLabel = (eventType) => {
    switch (eventType) {
      case "HARD_BRAKE":
        return "Hard Brake";
      case "SHARP_ACCELERATION":
        return "Sharp Acceleration";
      case "HARD_TURN":
        return "Hard Turn";
      case "CRASH":
        return "Crash";
      default:
        return eventType || "Unknown";
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case "HARD_BRAKE":
        return <TruckIcon style={{ width: "1rem", height: "1rem" }} />;
      case "SHARP_ACCELERATION":
        return <BoltIcon style={{ width: "1rem", height: "1rem" }} />;
      case "HARD_TURN":
        return <ArrowPathRoundedSquareIcon style={{ width: "1rem", height: "1rem" }} />;
      case "CRASH":
        return <ShieldExclamationIcon style={{ width: "1rem", height: "1rem" }} />;
      default:
        return <ExclamationTriangleIcon style={{ width: "1rem", height: "1rem" }} />;
    }
  };

  const getEventClass = (eventType) => {
    switch (eventType) {
      case "HARD_BRAKE":
        return "warning";
      case "SHARP_ACCELERATION":
        return "success";
      case "HARD_TURN":
        return "secondary";
      case "CRASH":
        return "danger";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="devices-container">
        <div className="loading-center">
          <div className="spinner-large"></div>
          <p>Loading vehicle events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="devices-container">
      <div className="devices-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>

        <div className="header-content">
          <h1>Vehicle Events</h1>
          <p className="subtitle">
            {vehicle.brand || "Unknown"} {vehicle.model || ""} {vehicle.year || ""} • {vin}
          </p>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">{summary.total}</span>
          <span className="stat-label">Total Events</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{summary.hardBrake}</span>
          <span className="stat-label">Hard Brakes</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{summary.sharpAcceleration}</span>
          <span className="stat-label">Sharp Accelerations</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{summary.hardTurn}</span>
          <span className="stat-label">Hard Turns</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{summary.crash}</span>
          <span className="stat-label">Crashes</span>
        </div>
      </div>

      {error && (
        <div className="error-message card">
          <ExclamationTriangleIcon className="error-icon" style={{ width: "1.5rem", height: "1.5rem" }} />
          <p>{error}</p>
        </div>
      )}

      <div className="control-bar" style={{ justifyContent: "space-between" }}>
        <div className="filters" style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <FunnelIcon style={{ width: "1rem", height: "1rem" }} />
            <span style={{ fontWeight: 600 }}>Filter:</span>
          </div>

          <select
            className="input"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ maxWidth: "220px" }}
          >
            <option value="ALL">All Events</option>
            <option value="HARD_BRAKE">Hard Brake</option>
            <option value="SHARP_ACCELERATION">Sharp Acceleration</option>
            <option value="HARD_TURN">Hard Turn</option>
            <option value="CRASH">Crash</option>
          </select>
        </div>
      </div>

      <div className="devices-table-container card">
        <div className="table-header">
          <h3>Events ({filteredEvents.length})</h3>
          <span className="table-info">
            Showing {filteredEvents.length} of {events.length} events
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <ShieldExclamationIcon style={{ width: "3rem", height: "3rem", margin: "0 auto" }} />
            </div>
            <h3>No Events Found</h3>
            <p>No driving events are available for this vehicle.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="devices-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Timestamp</th>
                  <th>Speed</th>
                  <th>G-Force</th>
                  <th>Acceleration</th>
                  <th>Gyroscope</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="device-row">
                    <td>
                      <span
                        className={`status-badge ${getEventClass(event.event_type)}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                      >
                        {getEventIcon(event.event_type)}
                        {getEventLabel(event.event_type)}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                        <ClockIcon style={{ width: "1rem", height: "1rem" }} />
                        {formatDate(event.event_timestamp)}
                      </div>
                    </td>

                    <td>{event.speed_kmh != null ? `${formatNumber(event.speed_kmh, 1)} km/h` : "—"}</td>

                    <td>{event.g_force != null ? `${formatNumber(event.g_force, 2)} g` : "—"}</td>

                    <td style={{ fontSize: "0.9rem" }}>
                      {event.accel ? (
                        <div>
                          <div>X: {formatNumber(event.accel.x)}</div>
                          <div>Y: {formatNumber(event.accel.y)}</div>
                          <div>Z: {formatNumber(event.accel.z)}</div>
                        </div>
                      ) : "—"}
                    </td>

                    <td style={{ fontSize: "0.9rem" }}>
                      {event.gyro ? (
                        <div>
                          <div>X: {formatNumber(event.gyro.x)}</div>
                          <div>Y: {formatNumber(event.gyro.y)}</div>
                          <div>Z: {formatNumber(event.gyro.z)}</div>
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="legend" style={{ marginTop: "2rem" }}>
        <div className="legend-item">
          <TruckIcon className="legend-icon" style={{ width: "1rem", height: "1rem" }} /> Hard Brake
        </div>
        <div className="legend-item">
          <BoltIcon className="legend-icon" style={{ width: "1rem", height: "1rem" }} /> Sharp Acceleration
        </div>
        <div className="legend-item">
          <ArrowPathRoundedSquareIcon className="legend-icon" style={{ width: "1rem", height: "1rem" }} /> Hard Turn
        </div>
        <div className="legend-item">
          <ShieldExclamationIcon className="legend-icon" style={{ width: "1rem", height: "1rem" }} /> Crash
        </div>
        <div className="legend-item">
          <ArrowsRightLeftIcon className="legend-icon" style={{ width: "1rem", height: "1rem" }} /> IMU sensor event history
        </div>
      </div>
    </div>
  );
}

export default VehicleEventsScreen;
