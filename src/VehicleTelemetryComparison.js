import React, { useState, useEffect } from "react";
import { api } from "./api";
import "./styles/global.css";

function VehicleTelemetryComparison({ onNavigate }) {
  const [vehicles, setVehicles] = useState([]);
  const [summary, setSummary] = useState({
    totalVehicles: 0,
    onlineVehicles: 0,
    totalSamples: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'online', direction: 'desc' });
  const [filterOnline, setFilterOnline] = useState('all');
  const [deletingVin, setDeletingVin] = useState(null); // Pre loading stav pri mazaní

  useEffect(() => {
    fetchTelemetryComparison();
    
    // Refresh každých 30 sekúnd
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
    if (!window.confirm(`Are you sure you want to delete vehicle ${vin}? This will remove it from your vehicle list.`)) {
      return;
    }

    setDeletingVin(vin);
    try {
      const token = localStorage.getItem("token");
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      await api.delete(`/api/user-vehicle/${vin}`);
      
      // Refresh the list after successful delete
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
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedVehicles = () => {
    const filteredVehicles = filterOnline === 'all' 
      ? vehicles 
      : vehicles.filter(v => filterOnline === 'online' ? v.online : !v.online);

    return [...filteredVehicles].sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case 'online':
          aVal = a.online ? 1 : 0;
          bVal = b.online ? 1 : 0;
          break;
        case 'vin':
          aVal = a.vin || 'ZZZ';
          bVal = b.vin || 'ZZZ';
          break;
        case 'brand':
          aVal = a.brand || 'ZZZ';
          bVal = b.brand || 'ZZZ';
          break;
        case 'avg_speed':
          aVal = a.statistics?.avg_speed || -1;
          bVal = b.statistics?.avg_speed || -1;
          break;
        case 'avg_rpm':
          aVal = a.statistics?.avg_rpm || -1;
          bVal = b.statistics?.avg_rpm || -1;
          break;
        case 'avg_consumption':
          aVal = a.statistics?.avg_consumption || 999;
          bVal = b.statistics?.avg_consumption || 999;
          break;
        case 'samples':
          aVal = a.statistics?.samples || 0;
          bVal = b.statistics?.samples || 0;
          break;
        default:
          aVal = a[sortConfig.key];
          bVal = b[sortConfig.key];
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const formatNumber = (num, decimals = 1) => {
    if (num === null || num === undefined) return '—';
    return num.toFixed(decimals);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="telemetry-comparison">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading vehicle statistics...</p>
        </div>
      </div>
    );
  }

  const sortedVehicles = getSortedVehicles();

  return (
    <div className="telemetry-comparison">
      {/* Summary Cards */}
      <div className="summary-cards" style={{ marginTop: 0 }}>
        <div className="summary-card">
          <div className="summary-icon">🚗</div>
          <div className="summary-content">
            <span className="summary-label">Total Vehicles</span>
            <span className="summary-value">{summary.totalVehicles}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">✅</div>
          <div className="summary-content">
            <span className="summary-label">Online</span>
            <span className="summary-value">{summary.onlineVehicles}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <span className="summary-label">Total Samples</span>
            <span className="summary-value">{summary.totalSamples.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={filterOnline} 
            onChange={(e) => setFilterOnline(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Vehicles</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
          </select>
        </div>
        <div className="filter-info">
          Click on column headers to sort • Historical averages from {summary.totalSamples} data points
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Vehicles Table */}
      <div className="vehicles-table-container">
        {sortedVehicles.length === 0 ? (
          <div className="empty-state">
            <p>No vehicles found</p>
          </div>
        ) : (
          <table className="vehicles-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('online')}>
                  Status {getSortIcon('online')}
                </th>
                <th onClick={() => handleSort('vin')}>
                  Vehicle {getSortIcon('vin')}
                </th>
                <th onClick={() => handleSort('avg_speed')}>
                  Avg Speed {getSortIcon('avg_speed')}
                </th>
                <th onClick={() => handleSort('avg_rpm')}>
                  Avg RPM {getSortIcon('avg_rpm')}
                </th>
                <th onClick={() => handleSort('avg_consumption')}>
                  Avg Consumption {getSortIcon('avg_consumption')}
                </th>
                <th>Range (RPM)</th>
                <th>Total Odometer</th>
                <th onClick={() => handleSort('samples')}>
                  Samples {getSortIcon('samples')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedVehicles.map((vehicle) => (
                <tr 
                  key={vehicle.vin} 
                  className={!vehicle.online ? 'offline-row' : ''}
                >
                  <td>
                    <span className={`status-indicator ${vehicle.online ? 'online' : 'offline'}`}>
                      {vehicle.online ? '●' : '○'}
                    </span>
                  </td>
                  <td className="vehicle-info">
                    <div className="vehicle-name">
                      {vehicle.brand || 'Unknown'} {vehicle.model || ''}
                    </div>
                    <div className="vehicle-vin">
                      {vehicle.vin ? `${vehicle.vin.slice(0, 8)}...` : 'No VIN'}
                    </div>
                  </td>
                  <td>
                    {vehicle.statistics?.avg_speed ? (
                      <span className="speed-value">{formatNumber(vehicle.statistics.avg_speed)} km/h</span>
                    ) : '—'}
                  </td>
                  <td>
                    {vehicle.statistics?.avg_rpm ? (
                      <span>{formatNumber(vehicle.statistics.avg_rpm)} rpm</span>
                    ) : '—'}
                  </td>
                  <td>
                    {vehicle.statistics?.avg_consumption ? (
                      <span>{formatNumber(vehicle.statistics.avg_consumption)} L/100km</span>
                    ) : '—'}
                  </td>
                  <td>
                    {vehicle.statistics?.min_rpm && vehicle.statistics?.max_rpm ? (
                      <span>
                        {vehicle.statistics.min_rpm} - {vehicle.statistics.max_rpm} rpm
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {vehicle.statistics?.total_odometer ? (
                      <span>{(vehicle.statistics.total_odometer / 1000).toFixed(1)}k km</span>
                    ) : '—'}
                  </td>
                  <td>
                    {vehicle.statistics?.samples ? (
                      <span className="samples-badge">{vehicle.statistics.samples}</span>
                    ) : '0'}
                  </td>
                  <td>
                    <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {vehicle.device_id ? (
                        <>
                          <button
                            className="btn-action diagnostics"
                            onClick={() => onNavigate('device-diagnostics', { deviceId: vehicle.device_id })}
                            style={{
                              padding: '0.5rem 0.8rem',
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            🔧 Diagnostics
                          </button>
                          <button
                            className="btn-action live-data"
                            onClick={() => {
                              console.log("Navigating to live-data with deviceId:", vehicle.device_id);
                              onNavigate('live-data', { 
                                deviceId: vehicle.device_id,
                                deviceInfo: {
                                  device_id: vehicle.device_id,
                                  vin: vehicle.vin,
                                  brand: vehicle.brand,
                                  model: vehicle.model
                                }
                              });
                            }}
                            style={{
                              padding: '0.5rem 0.8rem',
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap',
                              backgroundColor: '#4caf50',
                              color: 'white'
                            }}
                          >
                            📊 Live Data
                          </button>
                        </>
                      ) : (
                        <span className="no-device" style={{ color: '#999', fontSize: '0.85rem' }}>
                          No device
                        </span>
                      )}
                      {/* DELETE BUTTON - vždy viditeľný */}
                      <button
                        className="btn-action delete"
                        onClick={() => handleDeleteVehicle(vehicle.vin)}
                        disabled={deletingVin === vehicle.vin}
                        style={{
                          padding: '0.5rem 0.8rem',
                          fontSize: '0.85rem',
                          whiteSpace: 'nowrap',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          opacity: deletingVin === vehicle.vin ? 0.7 : 1
                        }}
                      >
                        {deletingVin === vehicle.vin ? '🗑️ Deleting...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="legend">
        <div className="legend-item">
          <span className="legend-dot online"></span> Online
        </div>
        <div className="legend-item">
          <span className="legend-dot offline"></span> Offline
        </div>
        <div className="legend-item">
          <span className="legend-icon">📊</span> Historical averages
        </div>
      </div>
    </div>
  );
}

export default VehicleTelemetryComparison;
