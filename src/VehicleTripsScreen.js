import React, { useState, useEffect } from "react";
import { api } from "./api";
import "./styles/global.css";
import {
  MapIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
  ChartBarIcon,
  FireIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  InformationCircleIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet v React builde potrebuje rucne nastavene cesty k ikonam markerov.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Obrazovka zobrazuje historiu jazd vozidla vratane mapy.
function VehicleTripsScreen({ vin, vehicleInfo, onBack }) {
  // Jazdy sa pouzivaju pre zoznam, mapu aj prepocet suhrnu.
  const [trips, setTrips] = useState([]);
  const [vehicle, setVehicle] = useState(vehicleInfo || { vin });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Suhrn drzi prepocitane hodnoty nad nacitanymi jazdami.
  const [summary, setSummary] = useState({
    totalTrips: 0,
    totalDistance: 0,
    totalDuration: 0,
    avgSpeed: 0,
    avgConsumption: 0,
  });

  // Pri zmene VIN sa musi nacitat ina historia jazd.
  useEffect(() => {
    fetchTrips();
  }, [vin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Request nacita jazdy a pripadne doplni informacie o vozidle.
  const fetchTrips = async () => {
    try {
      // Endpoint je chraneny, preto sa najprv kontroluje token.
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login first");
        setLoading(false);
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Backend vracia zoznam jazd pre dane VIN.
      const response = await api.get(`/api/vehicle/${vin}/trips`);

      if (response.data.status === "success") {
        // Prazdna odpoved sa berie ako prazdny zoznam jazd.
        const loadedTrips = response.data.trips || [];
        setTrips(loadedTrips);
        // Info o vozidle sa doplni k tomu, co prislo z navigacie.
        setVehicle((prev) => ({
          ...prev,
          ...response.data.vehicle,
        }));

        // Vzdialenost sa rata suctom jednotlivych jazd.
        const totalDistance = loadedTrips.reduce(
          (sum, t) => sum + (t.distance_km || 0),
          0
        );
        // Celkovy cas sa rata zo sekund ulozenych pri jazdach.
        const totalDuration = loadedTrips.reduce(
          (sum, t) => sum + (t.duration_seconds || 0),
          0
        );
        // Priemer rychlosti sa rata iba z jazd, ktore hodnotu maju.
        const speeds = loadedTrips
          .filter((t) => t.avg_speed)
          .map((t) => t.avg_speed);
        // Spotreba sa priemeruje len z dostupnych hodnot.
        const consumptions = loadedTrips
          .filter((t) => t.avg_consumption_l100km)
          .map((t) => t.avg_consumption_l100km);

        // Suhrnne karty dostanu prepocitane hodnoty naraz.
        setSummary({
          totalTrips: response.data.total_trips || loadedTrips.length,
          totalDistance,
          totalDuration,
          avgSpeed: speeds.length
            ? speeds.reduce((a, b) => a + b, 0) / speeds.length
            : 0,
          avgConsumption: consumptions.length
            ? consumptions.reduce((a, b) => a + b, 0) / consumptions.length
            : 0,
        });

        setError(null);
      } else {
        setError("Failed to load trip history.");
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
      setError(error.response?.data?.error || "Failed to load trip history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Sekundy sa pre UI prevadzaju na hodiny, minuty a sekundy.
  const formatDuration = (seconds) => {
    if (!seconds) return "—";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Datum jazdy sa prevadza do citatelneho formatu.
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

  // GPS suradnice sa zobrazia na sest desatinnych miest.
  const formatCoordinate = (num) => {
    if (num === null || num === undefined) return "—";
    return Number(num).toFixed(6);
  };

  // Mapovy link zacina na prvom bode trasy.
  const getOpenStreetMapTripLink = (points) => {
    if (!points || points.length === 0) return "#";
    const first = points[0];
    return `https://www.openstreetmap.org/?mlat=${first.latitude}&mlon=${first.longitude}#map=14/${first.latitude}/${first.longitude}`;
  };

  // Google Maps link sa sklada z prvej dostupnej suradnice.
  const getGoogleMapsTripLink = (points) => {
    if (!points || points.length === 0) return "#";
    const first = points[0];
    return `https://www.google.com/maps?q=${first.latitude},${first.longitude}`;
  };

  // Pri nacitani sa nezobrazuje prazdny zoznam jazd.
  if (loading) {
    return (
      <div className="devices-container">
        <div className="loading-center">
          <div className="spinner-large"></div>
          <p>Loading trip history...</p>
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
          <h1>Trip History</h1>
          <p className="subtitle">
            {vehicle.brand || "Unknown"} {vehicle.model || ""} {vehicle.year || ""} • {vin}
          </p>
          <p className="table-info" style={{ marginTop: "0.5rem" }}>
            Trips are detected automatically from telemetry data.
          </p>

          <div
            className="status-message info"
            style={{ marginTop: "1rem", marginBottom: "1.5rem", alignItems: "flex-start" }}
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
              A trip starts when the engine turns on and ends when the engine turns off.
            </div>
          </div>
        </div>
      </div>

      <div
        className="summary-cards"
        style={{ marginTop: "1rem", marginBottom: "2rem" }}
      >
        <div className="summary-card">
          <div className="summary-icon">
            <MapIcon style={{ width: "2.5rem", height: "2.5rem" }} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Trips</span>
            <span className="summary-value">{summary.totalTrips}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <ArrowsRightLeftIcon style={{ width: "2.5rem", height: "2.5rem" }} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Distance</span>
            <span className="summary-value">
              {summary.totalDistance ? `${summary.totalDistance.toFixed(1)} km` : "—"}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <ClockIcon style={{ width: "2.5rem", height: "2.5rem" }} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Time</span>
            <span className="summary-value">
              {summary.totalDuration ? formatDuration(summary.totalDuration) : "—"}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <ChartBarIcon style={{ width: "2.5rem", height: "2.5rem" }} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Avg Speed</span>
            <span className="summary-value">
              {summary.avgSpeed ? `${summary.avgSpeed.toFixed(1)} km/h` : "—"}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <FireIcon style={{ width: "2.5rem", height: "2.5rem" }} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Avg Consumption</span>
            <span className="summary-value">
              {summary.avgConsumption ? `${summary.avgConsumption.toFixed(1)} L/100km` : "—"}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: "2rem" }}>
          <ExclamationTriangleIcon
            style={{
              width: "1.25rem",
              height: "1.25rem",
              marginRight: "0.5rem",
              display: "inline-block",
              verticalAlign: "middle",
            }}
          />
          {error}
        </div>
      )}

      <div className="vehicles-table-container">
        {trips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <MapIcon style={{ width: "3rem", height: "3rem", margin: "0 auto" }} />
            </div>
            <h3>No Trips Found</h3>
            <p>No trip history is available for this vehicle yet.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {trips.map((trip) => {
              const points = trip.location_points || [];
              const hasRoute = points.length > 0;
              const polylinePositions = points.map((p) => [p.latitude, p.longitude]);
              const firstPoint = hasRoute ? points[0] : null;
              const lastPoint = hasRoute ? points[points.length - 1] : null;
              const mapCenter = hasRoute
                ? [points[Math.floor(points.length / 2)].latitude, points[Math.floor(points.length / 2)].longitude]
                : [48.1486, 17.1077];

              return (
                <div
                  key={trip.id}
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
                        className="status-badge info"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                      >
                        <MapIcon style={{ width: "1rem", height: "1rem" }} />
                        Trip #{trip.id}
                      </span>
                    </div>

                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <ClockIcon style={{ width: "1rem", height: "1rem" }} />
                      {formatDate(trip.start_time)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "0.9rem",
                      marginBottom: hasRoute ? "1rem" : 0,
                    }}
                  >
                    <div>
                      <div className="table-info">Duration</div>
                      <div>{formatDuration(trip.duration_seconds)}</div>
                    </div>

                    <div>
                      <div className="table-info">Distance</div>
                      <div>{trip.distance_km ? `${trip.distance_km.toFixed(1)} km` : "—"}</div>
                    </div>

                    <div>
                      <div className="table-info">Avg Speed</div>
                      <div>{trip.avg_speed ? `${trip.avg_speed} km/h` : "—"}</div>
                    </div>

                    <div>
                      <div className="table-info">Max Speed</div>
                      <div>{trip.max_speed ? `${trip.max_speed} km/h` : "—"}</div>
                    </div>

                    <div>
                      <div className="table-info">Avg RPM</div>
                      <div>{trip.avg_rpm ? `${trip.avg_rpm} rpm` : "—"}</div>
                    </div>

                    <div>
                      <div className="table-info">Max RPM</div>
                      <div>{trip.max_rpm ? `${trip.max_rpm} rpm` : "—"}</div>
                    </div>

                    <div>
                      <div className="table-info">Avg Consumption</div>
                      <div>
                        {trip.avg_consumption_l100km
                          ? `${trip.avg_consumption_l100km} L/100km`
                          : "—"}
                      </div>
                    </div>

                    <div>
                      <div className="table-info">Fuel Used</div>
                      <div>
                        {trip.total_fuel_used_l
                          ? `${trip.total_fuel_used_l.toFixed(2)} L`
                          : "—"}
                      </div>
                    </div>

                    <div>
                      <div className="table-info">Avg Coolant</div>
                      <div>
                        {trip.avg_coolant_temp ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                            }}
                          >
                            <BeakerIcon style={{ width: "1rem", height: "1rem" }} />
                            {trip.avg_coolant_temp}°C
                          </span>
                        ) : (
                          "—"
                        )}
                        {trip.max_coolant_temp && (
                          <div>
                            <small>max: {trip.max_coolant_temp}°C</small>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="table-info">Route Points</div>
                      <div>{points.length || "—"}</div>
                    </div>
                  </div>

                  {hasRoute && (
                    <div
                      style={{
                        borderRadius: "14px",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <MapContainer
                        center={mapCenter}
                        zoom={13}
                        scrollWheelZoom={true}
                        dragging={true}
                        doubleClickZoom={true}
                        touchZoom={true}
                        zoomControl={true}
                        style={{ height: "260px", width: "100%" }}
                      >
                        <TileLayer
                          attribution='&copy; OpenStreetMap contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {polylinePositions.length > 1 && (
                          <Polyline positions={polylinePositions} />
                        )}

                        {firstPoint && (
                          <Marker position={[firstPoint.latitude, firstPoint.longitude]} />
                        )}

                        {lastPoint &&
                          (lastPoint.latitude !== firstPoint.latitude ||
                            lastPoint.longitude !== firstPoint.longitude) && (
                            <Marker position={[lastPoint.latitude, lastPoint.longitude]} />
                          )}
                      </MapContainer>

                      <div
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          flexWrap: "wrap",
                          padding: "0.9rem 1rem",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)",
                          borderTop: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            padding: "0.7rem 1rem",
                            borderRadius: "12px",
                            color: "#cbd5e1",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            fontSize: "0.9rem",
                          }}
                        >
                          <MapPinIcon style={{ width: "1rem", height: "1rem" }} />
                          Start: {formatCoordinate(firstPoint.latitude)}, {formatCoordinate(firstPoint.longitude)}
                        </div>

                        <a
                          href={getOpenStreetMapTripLink(points)}
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
                          }}
                        >
                          Open in OpenStreetMap
                        </a>

                        <a
                          href={getGoogleMapsTripLink(points)}
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

export default VehicleTripsScreen;
