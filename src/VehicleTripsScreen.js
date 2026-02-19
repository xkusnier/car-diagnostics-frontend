import React, { useState, useEffect } from "react";
import { api } from "./api";
import "./styles/global.css";

function VehicleTripsScreen({ vin, vehicleInfo, onBack }) {
  const [trips, setTrips] = useState([]);
  const [vehicle, setVehicle] = useState(vehicleInfo || { vin });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    totalTrips: 0,
    totalDistance: 0,
    totalDuration: 0,
    avgSpeed: 0,
    avgConsumption: 0
  });

  useEffect(() => {
    fetchTrips();
  }, [vin]);

  const fetchTrips = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login first");
        setLoading(false);
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      const response = await api.get(`/api/vehicle/${vin}/trips`);
      
      if (response.data.status === "success") {
        setTrips(response.data.trips);
        setVehicle({
          ...vehicle,
          ...response.data.vehicle
        });
        
        // Vypočítaj súhrnné štatistiky
        const totalDistance = response.data.trips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
        const totalDuration = response.data.trips.reduce((sum, t) => sum + (t.duration_seconds || 0), 0);
        const speeds = response.data.trips.filter(t => t.avg_speed).map(t => t.avg_speed);
        const consumptions = response.data.trips.filter(t => t.avg_consumption_l100km).map(t => t.avg_consumption_l100km);
        
        setSummary({
          totalTrips: response.data.total_trips,
          totalDistance: totalDistance,
          totalDuration: totalDuration,
          avgSpeed: speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
          avgConsumption: consumptions.length ? consumptions.reduce((a, b) => a + b, 0) / consumptions.length : 0
        });
      }
      
      setError(null);
    } catch (error) {
      console.error("Error fetching trips:", error);
      setError("Failed to load trip history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
      {/* Header */}
      <div className="devices-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>

        <div className="header-content">
          <h1>Trip History</h1>
          <p className="subtitle">
            {vehicle.brand} {vehicle.model} {vehicle.year} • {vin}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <div className="summary-card">
          <div className="summary-icon">🗺️</div>
          <div className="summary-content">
            <span className="summary-label">Total Trips</span>
            <span className="summary-value">{summary.totalTrips}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📏</div>
          <div className="summary-content">
            <span className="summary-label">Total Distance</span>
            <span className="summary-value">
              {summary.totalDistance ? `${summary.totalDistance.toFixed(1)} km` : '—'}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">⏱️</div>
          <div className="summary-content">
            <span className="summary-label">Total Time</span>
            <span className="summary-value">
              {summary.totalDuration ? formatDuration(summary.totalDuration) : '—'}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <span className="summary-label">Avg Speed</span>
            <span className="summary-value">
              {summary.avgSpeed ? `${summary.avgSpeed.toFixed(1)} km/h` : '—'}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">⛽</div>
          <div className="summary-content">
            <span className="summary-label">Avg Consumption</span>
            <span className="summary-value">
              {summary.avgConsumption ? `${summary.avgConsumption.toFixed(1)} L/100km` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message" style={{ marginBottom: '2rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Trips Table */}
      <div className="vehicles-table-container">
        {trips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <h3>No Trips Found</h3>
            <p>No trip history available for this vehicle.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="devices-table">
              <thead>
                <tr>
                  <th>Start Time</th>
                  <th>Duration</th>
                  <th>Distance</th>
                  <th>Avg Speed</th>
                  <th>Max Speed</th>
                  <th>Avg RPM</th>
                  <th>Max RPM</th>
                  <th>Avg Consumption</th>
                  <th>Fuel Used</th>
                  <th>Avg Coolant</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.id} className="device-row">
                    <td>
                      <div className="date-cell">
                        {formatDate(trip.start_time)}
                      </div>
                    </td>
                    <td>{formatDuration(trip.duration_seconds)}</td>
                    <td>{trip.distance_km ? `${trip.distance_km.toFixed(1)} km` : '—'}</td>
                    <td>{trip.avg_speed ? `${trip.avg_speed} km/h` : '—'}</td>
                    <td>{trip.max_speed ? `${trip.max_speed} km/h` : '—'}</td>
                    <td>{trip.avg_rpm ? `${trip.avg_rpm} rpm` : '—'}</td>
                    <td>{trip.max_rpm ? `${trip.max_rpm} rpm` : '—'}</td>
                    <td>{trip.avg_consumption_l100km ? `${trip.avg_consumption_l100km} L/100km` : '—'}</td>
                    <td>{trip.total_fuel_used_l ? `${trip.total_fuel_used_l.toFixed(2)} L` : '—'}</td>
                    <td>
                      {trip.avg_coolant_temp ? (
                        <div>
                          <span>🌡️ {trip.avg_coolant_temp}°C</span>
                          {trip.max_coolant_temp && (
                            <div><small>max: {trip.max_coolant_temp}°C</small></div>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="legend" style={{ marginTop: '2rem' }}>
        <div className="legend-item">
          <span className="legend-icon">🗺️</span> Trip statistics based on engine on/off cycles
        </div>
      </div>
    </div>
  );
}

export default VehicleTripsScreen;
