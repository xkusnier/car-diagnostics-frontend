import React, { useEffect, useState } from "react";
import { api } from "./api";
import "./styles/global.css";

function DeviceDiagnosticsScreen({ deviceId, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [reading, setReading] = useState(false);
  const [clearStatus, setClearStatus] = useState("");
  const [readStatus, setReadStatus] = useState("");
  const [polling, setPolling] = useState(false);
  let pollingInterval = null;

  useEffect(() => {
    fetchDiagnostics();
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [deviceId]);

  const fetchDiagnostics = async () => {
    try {
      const res = await api.get(`/api/device/${deviceId}/diagnostics`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Error fetching diagnostics");
    } finally {
      setLoading(false);
    }
  };

  const startPollingDiagnostics = () => {
    if (pollingInterval) clearInterval(pollingInterval);

    setPolling(true);

    pollingInterval = setInterval(async () => {
      try {
        const res = await api.get(`/api/device/${deviceId}/diagnostics`);
        const diag = res.data;

        if (!diag.dtc_codes || diag.dtc_codes.length === 0) {
          clearInterval(pollingInterval);
          setPolling(false);
          setClearing(false);
          setClearStatus("DTC successfully cleared ✔");

          setData(diag);
        } else {
          setClearStatus("Waiting for RPi to clear DTC...");
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 3000);
  };

  const handleReadDTCs = async () => {
    setReading(true);
    setReadStatus("Sending read DTC command...");

    try {
      const response = await api.post(`/api/device/${deviceId}/read-dtcs`);
      
      setReadStatus("Command sent. Device will read DTC codes...");
      
      setTimeout(() => {
        fetchDiagnostics();
        setReading(false);
        setReadStatus("DTC read command completed");
        
        setTimeout(() => setReadStatus(""), 3000);
      }, 5000);

    } catch (err) {
      alert(err.response?.data?.error || "Failed to send read DTC command.");
      setReading(false);
      setReadStatus("");
    }
  };

  const handleClearDTCs = async () => {
    if (!window.confirm("Are you sure you want to clear all active DTCs?")) return;

    setClearing(true);
    setClearStatus("Sending clear command...");

    try {
      await api.post(`/api/device/${deviceId}/clear-dtcs`);
      setClearStatus("Command sent. Waiting for RPi...");
      startPollingDiagnostics();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send clear command.");
      setClearing(false);
    }
  };

  // Funkcia pre farebné kódovanie severity
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#d32f2f';  // červená
      case 'high': return '#f57c00';      // oranžová
      case 'medium': return '#ffb300';    // žltá
      case 'low': return '#388e3c';       // zelená
      default: return '#5f6368';          // šedá
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'badge-critical';
      case 'high': return 'badge-high';
      case 'medium': return 'badge-medium';
      case 'low': return 'badge-low';
      default: return 'badge-info';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '🔥';
      case 'high': return '⚠️';
      case 'medium': return '🔶';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  };

  // -------------------- UI --------------------
  if (loading) {
    return (
      <div className="devices-container">
        <div className="loading-center">
          <div className="spinner-large"></div>
          <p>Loading diagnostics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="devices-container">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h3>Error Loading Diagnostics</h3>
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={onBack}>
              ← Back to Devices
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------- MAIN UI --------------------
  return (
    <div className="devices-container">
      {/* Header */}
      <div className="devices-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Devices
        </button>
        <div className="header-content">
          <h1>Device Diagnostics</h1>
          <p className="subtitle">
            Real-time diagnostics for device #{deviceId}
          </p>
        </div>
        <div className="device-status">
          <span className={`status-indicator ${data.online ? 'online' : 'offline'}`}></span>
          {data.online ? 'Device Online' : 'Device Offline'}
        </div>
      </div>

      {/* Device Info Cards */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">#{data.device_id}</span>
          <span className="stat-label">Device ID</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{data.vin ? data.vin : "N/A"}</span>
          <span className="stat-label">VIN</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">
            {data.brand ? `${data.brand} ${data.model}` : "N/A"}
          </span>
          <span className="stat-label">Vehicle</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">
            {data.dtc_codes ? data.dtc_codes.length : 0}
          </span>
          <span className="stat-label">Active DTCs</span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="control-panel" style={{ marginBottom: '2rem' }}>
        <div className="button-group">
          <button
            className={`btn btn-primary ${reading ? 'loading' : ''}`}
            onClick={handleReadDTCs}
            disabled={reading || !data.online}
            style={{ minWidth: '150px' }}
          >
            {reading ? (
              <>
                <span className="spinner-small"></span>
                Reading...
              </>
            ) : (
              <>
                <span className="icon">📡</span>
                Read DTC
              </>
            )}
          </button>

          <button
            className={`btn btn-danger ${clearing ? 'loading' : ''}`}
            onClick={handleClearDTCs}
            disabled={clearing || !data.online}
            style={{ minWidth: '150px' }}
          >
            {clearing ? (
              <>
                <span className="spinner-small"></span>
                Clearing...
              </>
            ) : (
              <>
                <span className="icon">🗑️</span>
                Clear DTC
              </>
            )}
          </button>
        </div>

        {/* Status Messages */}
        {readStatus && (
          <div className="status-message info">
            <span className="icon">ℹ️</span>
            {readStatus}
          </div>
        )}

        {(clearing || polling) && (
          <div className="status-message warning">
            <span className="icon">⏳</span>
            {clearStatus}
          </div>
        )}
      </div>

      {/* DTC Codes Section */}
      <div className="dtc-section">
        <div className="section-header">
          <h2>Active DTC Codes</h2>
          <div className="dtc-count">
            {data.dtc_codes ? data.dtc_codes.length : 0} active codes
            {data.dtc_codes && data.dtc_codes.length > 0 && (
              <span style={{ marginLeft: '1rem', fontSize: '0.875rem', color: '#5f6368' }}>
                {data.dtc_codes.filter(d => d.severity === 'critical').length} critical
              </span>
            )}
          </div>
        </div>

        {(!data.dtc_codes || data.dtc_codes.length === 0) ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>No Active DTC Codes</h3>
            <p>No diagnostic trouble codes found for this device.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="dtc-table">
              <thead>
                <tr>
                  <th>DTC Code</th>
                  <th>Description</th>
                  <th>Severity</th>
                  <th>Date Detected</th>
                </tr>
              </thead>
              <tbody>
                {data.dtc_codes.map((item, i) => {
                  const severityColor = getSeverityColor(item.severity);
                  const severityBadgeClass = getSeverityBadgeClass(item.severity);
                  const severityIcon = getSeverityIcon(item.severity);
                  
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'even' : 'odd'}>
                      <td>
                        <span 
                          className="dtc-code-badge" 
                          style={{ 
                            borderLeft: `4px solid ${severityColor}`,
                            background: `${severityColor}15`
                          }}
                        >
                          {item.dtc_code}
                        </span>
                      </td>
                      <td className="description-cell">
                        <div className="description-content">
                          <strong>{item.description || "No description available"}</strong>
                        </div>
                      </td>
                      <td>
                        <div className="severity-display">
                          <span 
                            className={`severity-badge ${severityBadgeClass}`}
                            style={{ 
                              background: severityColor,
                              color: 'white'
                            }}
                          >
                            {severityIcon} {item.severity?.toUpperCase() || 'MEDIUM'}
                          </span>
                          <div className="severity-info">
                            <small>
                              {item.severity === 'critical' && 'Requires immediate attention'}
                              {item.severity === 'high' && 'Needs attention soon'}
                              {item.severity === 'medium' && 'Monitor condition'}
                              {item.severity === 'low' && 'Informational only'}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="date-cell">
                          <div className="date">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : "—"}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Severity Legend */}
      {data.dtc_codes && data.dtc_codes.length > 0 && (
        <div className="quick-tips">
          <h4>⚠️ Severity Legend</h4>
          <div className="severity-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#d32f2f' }}></span>
              <span className="legend-label">
                <strong>CRITICAL</strong> - Requires immediate attention
              </span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#f57c00' }}></span>
              <span className="legend-label">
                <strong>HIGH</strong> - Needs attention soon
              </span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#ffb300' }}></span>
              <span className="legend-label">
                <strong>MEDIUM</strong> - Monitor condition
              </span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#388e3c' }}></span>
              <span className="legend-label">
                <strong>LOW</strong> - Informational only
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceDiagnosticsScreen;
