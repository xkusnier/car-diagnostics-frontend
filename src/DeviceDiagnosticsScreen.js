import React, { useEffect, useState } from "react";
import { api } from "./api";
import "./DeviceDiagnosticsScreen.css"; // Nový CSS súbor

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

  // -------------------- LOADING --------------------
  if (loading) {
    return (
      <div className="diagnostics-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading diagnostics data...</p>
        </div>
      </div>
    );
  }

  // -------------------- ERROR --------------------
  if (error) {
    return (
      <div className="diagnostics-container">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Diagnostics</h3>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back to Devices
          </button>
        </div>
      </div>
    );
  }

  // -------------------- MAIN UI --------------------
  return (
    <div className="diagnostics-container">
      {/* Header */}
      <div className="diagnostics-header">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
        <h1>Device Diagnostics</h1>
        <div className="device-status">
          <span className={`status-indicator ${data.online ? 'online' : 'offline'}`}></span>
          {data.online ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Device Info Cards */}
      <div className="device-info-grid">
        <div className="info-card">
          <h4>Device ID</h4>
          <p>{data.device_id}</p>
        </div>
        <div className="info-card">
          <h4>VIN</h4>
          <p>{data.vin || "N/A"}</p>
        </div>
        <div className="info-card">
          <h4>Vehicle</h4>
          <p>{data.brand || "N/A"} {data.model || ""} ({data.year || "N/A"})</p>
        </div>
        <div className="info-card">
          <h4>Engine</h4>
          <p>{data.engine || "N/A"}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="control-panel">
        <div className="button-group">
          <button
            className={`btn btn-primary ${reading ? 'loading' : ''}`}
            onClick={handleReadDTCs}
            disabled={reading || !data.online}
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
          <span className="dtc-count">
            {data.dtc_codes?.length || 0} codes found
          </span>
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
                  <th>Date Detected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.dtc_codes.map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'even' : 'odd'}>
                    <td>
                      <span className="dtc-code-badge">{item.dtc_code}</span>
                    </td>
                    <td className="description-cell">{item.description}</td>
                    <td>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString("en-GB")
                        : "—"}
                    </td>
                    <td>
                      <span className="status-badge active">Active</span>
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

export default DeviceDiagnosticsScreen;
