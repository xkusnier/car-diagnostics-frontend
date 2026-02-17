import React, { useState, useEffect } from "react";
import { api } from "./api";
import "./styles/global.css";

function VehicleTelemetryComparison({ onNavigate }) {
  const [vehicles, setVehicles] = useState([]);
  const [summary, setSummary] = useState({
    totalVehicles: 0,
    onlineVehicles: 0,
    avgConsumption: null,
    avgSpeed: null,
    totalOdometer: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'online', direction: 'desc' });
  const [filterOnline, setFilterOnline] = useState('all');

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
          avgConsumption: response.data.summary.avg_consumption,
          avgSpeed: response.data.summary.avg_speed,
          totalOdometer: response.data.summary.total_odometer
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
        case 'speed':
          aVal = a.telemetry?.speed || -1;
          bVal = b.telemetry?.speed || -1;
          break;
        case 'rpm':
          aVal = a.telemetry?.engine_rpm || -1;
          bVal = b.telemetry?.engine_rpm || -1;
          break;
        case 'consumption':
          aVal = a.telemetry?.consumption_l100km || 999;
          bVal = b.telemetry?.consumption_l100km || 999;
          break;
        case 'battery':
          aVal = a.telemetry?.battery_voltage || 0;
          bVal = b.telemetry?.battery_voltage || 0;
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

  const getBatteryColor = (voltage) => {
    if (!voltage) return '#999';
    if (voltage < 11.8) return '#f44336'; // critical
    if (voltage < 12.2) return '#ff9800'; // warning
    return '#4caf50'; // good
  };

  const getEngineStatusIcon = (running) => {
    if (running === null || running === undefined) return '⚫';
    return running ? '🟢' : '🔴';
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
          <p>Loading vehicle telemetry...</p>
        </div>
      </div>
    );
  }

  const sortedVehicles = getSortedVehicles();

  return (
    <div className="telemetry-comparison">
      {/* Summary Cards - bez headeru */}
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
          <div className="summary-icon">⛽</div>
          <div className="summary-content">
            <span className="summary-label">Avg Consumption</span>
            <span className="summary-value">
              {summary.avgConsumption ? `${summary.avgConsumption} L/100km` : '—'}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📏</div>
          <div className="summary-content">
            <span className="summary-label">Avg Speed</span>
            <span className="summary-value">
              {summary.avgSpeed ? `${summary.avgSpeed} km/h` : '—'}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <span className="summary-label">Total Odometer</span>
            <span className="summary-value">
              {summary.totalOdometer ? `${(summary.totalOdometer / 1000).toFixed(1)}k km` : '—'}
            </span>
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
          Click on column headers to sort
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
              No devices
            </button>
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
                <th onClick={() => handleSort('speed')}>
                  Speed {getSortIcon('speed')}
                </th>
                <th onClick={() => handleSort('rpm')}>
                  RPM {getSortIcon('rpm')}
                </th>
                <th onClick={() => handleSort('consumption')}>
                  Consumption {getSortIcon('consumption')}
                </th>
                <th onClick={() => handleSort('battery')}>
                  Battery {getSortIcon('battery')}
                </th>
                <th>Engine</th>
                <th>Temperatures</th>
                <th>Odometer</th>
                <th>Actions</th> {/* NOVÝ STĹPEC */}
              </tr>
            </thead>
            <tbody>
              {sortedVehicles.map((vehicle) => (
                <tr 
                  key={vehicle.device_id} 
                  className={!vehicle.online ? 'offline-row' : ''}
                  // ODSTRÁNENÉ onClick na celý riadok
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
                  <td className="speed-cell">
                    {vehicle.telemetry?.speed !== undefined ? (
                      <span className="speed-value">{vehicle.telemetry.speed} km/h</span>
                    ) : '—'}
                  </td>
                  <td>
                    {vehicle.telemetry?.engine_rpm ? (
                      <span className="rpm-value">{vehicle.telemetry.engine_rpm} rpm</span>
                    ) : '—'}
                  </td>
                  <td>
                    {vehicle.telemetry?.consumption_l100km ? (
                      <span>{formatNumber(vehicle.telemetry.consumption_l100km)} L/100km</span>
                    ) : '—'}
                  </td>
                  <td>
                    {vehicle.telemetry?.battery_voltage ? (
                      <span style={{ color: getBatteryColor(vehicle.telemetry.battery_voltage) }}>
                        {formatNumber(vehicle.telemetry.battery_voltage)} V
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {vehicle.telemetry ? (
                      <div className="engine-indicator">
                        <span title={vehicle.telemetry.engine_running ? 'Engine On' : 'Engine Off'}>
                          {getEngineStatusIcon(vehicle.telemetry.engine_running)}
                        </span>
                        {vehicle.telemetry.engine_load ? (
                          <span className="load-indicator">
                            {vehicle.telemetry.engine_load}%
                          </span>
                        ) : null}
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    {vehicle.telemetry?.coolant_temp ? (
                      <div className="temps">
                        <span title="Coolant">🌡️{vehicle.telemetry.coolant_temp}°C</span>
                        {vehicle.telemetry.oil_temp && (
                          <span title="Oil" className="oil-temp">🛢️{vehicle.telemetry.oil_temp}°C</span>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    {vehicle.telemetry?.odometer ? (
                      <span>{(vehicle.telemetry.odometer / 1000).toFixed(1)}k km</span>
                    ) : '—'}
                  </td>
                  <td>
                    <button
                      className="btn-action diagnostics"
                      onClick={() => onNavigate('device-diagnostics', { deviceId: vehicle.device_id })}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      🔍 Diagnostics
                    </button>
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
          <span className="legend-icon">🟢</span> Engine Running
        </div>
        <div className="legend-item">
          <span className="legend-icon">🔴</span> Engine Off
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#4caf50' }}></span> Battery Good
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#ff9800' }}></span> Battery Warning
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#f44336' }}></span> Battery Critical
        </div>
      </div>
    </div>
  );
}

export default VehicleTelemetryComparison;
