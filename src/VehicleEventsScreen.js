import React, { useState, useEffect, useMemo } from "react";
import { api } from "./api";
import "./styles/global.css";
import {
  ExclamationTriangleIcon,
  TruckIcon,
  BoltIcon,
  ArrowPathRoundedSquareIcon,
  ShieldExclamationIcon,
  ClockIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Obrazovka zobrazuje udalosti vozidla pre konkretne VIN.
function VehicleEventsScreen({ vin, vehicleInfo, onBack }) {
  // Udalosti su hlavny zoznam pre suhrn aj detailne karty.
  const [events, setEvents] = useState([]);
  const [vehicle, setVehicle] = useState(vehicleInfo || { vin });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pri zmene VIN sa nacitaju udalosti pre ine vozidlo.
  useEffect(() => {
    fetchVehicleEvents();
  }, [vin]);

  // Request nacita eventy a zakladne informacie o vozidle.
  const fetchVehicleEvents = async () => {
    try {
      // Token sa nastavi pred volanim chraneneho endpointu.
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login first");
        setLoading(false);
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Endpoint vracia udalosti ulozene pre dane vozidlo.
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

  // Suhrn sa prepocita iba ked sa zmeni zoznam udalosti.
  const summary = useMemo(() => {
    return {
      total: events.length,
      hardBrake: events.filter((e) => e.event_type === "HARD_BRAKE").length,
      sharpAcceleration: events.filter((e) => e.event_type === "SHARP_ACCELERATION").length,
      hardTurn: events.filter((e) => e.event_type === "HARD_TURN").length,
      crash: events.filter((e) => e.event_type === "CRASH").length,
    };
  }, [events]);

  // Datum udalosti sa zobrazuje v citatelnejsom tvare.
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

  // Chybajuce cisla sa nahradia pomlckou.
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return "—";
    return Number(num).toFixed(decimals);
  };

  // GPS suradnice potrebuju viac desatinnych miest.
  const formatCoordinate = (num) => {
    if (num === null || num === undefined) return "—";
    return Number(num).toFixed(6);
  };

  // Interny typ eventu sa prevadza na text pre pouzivatela.
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

  // Ikony ulahcuju rychle rozlisenie typov udalosti.
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

  // CSS trieda urcuje vizualne zvyraznenie eventu.
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

  // Link na mapu sa sklada z GPS suradnic eventu.
  const getOpenStreetMapLink = (lat, lng) =>
    `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  const getGoogleMapsLink = (lat, lng) =>
    `https://www.google.com/maps?q=${lat},${lng}`;

  // Loading stav sa zobrazi pred prichodom eventov.
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
      <div className="screen-topbar">
        <button className="back-button-unified" onClick={onBack} type="button">
          ← Back
        </button>
      </div>

      <div className="devices-header">
        <div className="header-content">
          <h1>Vehicle Events</h1>
          <p className="subtitle">
            {vehicle.brand || "Unknown"} {vehicle.model || ""} {vehicle.year || ""} • {vin}
          </p>
          <p className="table-info" style={{ marginTop: "0.5rem" }}>
            Driving events are generated automatically from motion and telemetry data reported by the diagnostic device.
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

      <div className="devices-table-container card">
        <div className="table-header">
          <div>
            <h3>Events ({events.length})</h3>
            <p className="table-info" style={{ marginTop: "0.35rem" }}>
              Events such as hard braking, sharp acceleration, hard turns, and crash detection are stored for this vehicle.
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <ShieldExclamationIcon style={{ width: "3rem", height: "3rem", margin: "0 auto" }} />
            </div>
            <h3>No Events Found</h3>
            <p>No driving events are available for this vehicle yet.</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "1rem",
            }}
          >
            {events.map((event) => {
              const hasLocation =
                event.latitude !== null &&
                event.latitude !== undefined &&
                event.longitude !== null &&
                event.longitude !== undefined;

              return (
                <div
                  key={event.id}
                  className="card"
                  style={{
                    padding: "1rem",
                    background: "var(--card-bg, #111827)",
                    border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
                    borderRadius: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "1rem",
                      flexWrap: "wrap",
                      marginBottom: "1rem",
                    }}
                  >
                    <div>
                      <span
                        className={`status-badge ${getEventClass(event.event_type)}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                      >
                        {getEventIcon(event.event_type)}
                        {getEventLabel(event.event_type)}
                      </span>
                    </div>

                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <ClockIcon style={{ width: "1rem", height: "1rem" }} />
                      {formatDate(event.event_timestamp)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "0.9rem",
                      marginBottom: hasLocation ? "1rem" : 0,
                    }}
                  >
                    <div>
                      <div className="table-info">Speed</div>
                      <div>{event.speed_kmh != null ? `${formatNumber(event.speed_kmh, 1)} km/h` : "—"}</div>
                    </div>

                    <div>
                      <div className="table-info">G-Force</div>
                      <div>{event.g_force != null ? `${formatNumber(event.g_force, 2)} g` : "—"}</div>
                    </div>

                    <div>
                      <div className="table-info">Acceleration</div>
                      {event.accel ? (
                        <div style={{ fontSize: "0.9rem" }}>
                          <div>X: {formatNumber(event.accel.x)}</div>
                          <div>Y: {formatNumber(event.accel.y)}</div>
                          <div>Z: {formatNumber(event.accel.z)}</div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </div>

                    <div>
                      <div className="table-info">Gyroscope</div>
                      {event.gyro ? (
                        <div style={{ fontSize: "0.9rem" }}>
                          <div>X: {formatNumber(event.gyro.x)}</div>
                          <div>Y: {formatNumber(event.gyro.y)}</div>
                          <div>Z: {formatNumber(event.gyro.z)}</div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </div>

                    <div>
                      <div className="table-info">Location</div>
                      {hasLocation ? (
                        <div style={{ fontSize: "0.9rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <MapPinIcon style={{ width: "1rem", height: "1rem" }} />
                            GPS available
                          </div>
                          <div>Lat: {formatCoordinate(event.latitude)}</div>
                          <div>Lng: {formatCoordinate(event.longitude)}</div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>

                  {hasLocation && (
                    <div
                      style={{
                        borderRadius: "14px",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <MapContainer
                        center={[event.latitude, event.longitude]}
                        zoom={15}
                        scrollWheelZoom={true}
                        dragging={true}
                        doubleClickZoom={true}
                        touchZoom={true}
                        zoomControl={true}
                        style={{ height: "220px", width: "100%" }}
                      >
                        <TileLayer
                          attribution='&copy; OpenStreetMap contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[event.latitude, event.longitude]} />
                      </MapContainer>

                      <div
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          flexWrap: "wrap",
                          padding: "0.9rem 1rem",
                          background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)",
                          borderTop: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <a
                          href={getOpenStreetMapLink(event.latitude, event.longitude)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.7rem 1rem",
                            borderRadius: "12px",
                            textDecoration: "none",
                            fontWeight: 600,
                            fontSize: "0.92rem",
                            color: "#e5eefc",
                            background: "rgba(37, 99, 235, 0.14)",
                            border: "1px solid rgba(59, 130, 246, 0.28)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(37, 99, 235, 0.22)";
                            e.currentTarget.style.borderColor = "rgba(96, 165, 250, 0.45)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(37, 99, 235, 0.14)";
                            e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.28)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          Open in OpenStreetMap
                        </a>
                      
                        <a
                          href={getGoogleMapsLink(event.latitude, event.longitude)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.7rem 1rem",
                            borderRadius: "12px",
                            textDecoration: "none",
                            fontWeight: 600,
                            fontSize: "0.92rem",
                            color: "#f3f4f6",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          Open in Google Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default VehicleEventsScreen;
