import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import "./styles/global.css";
import { io } from "socket.io-client";

function DeviceDiagnosticsScreen({ deviceId, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [reading, setReading] = useState(false);
  const [clearStatus, setClearStatus] = useState("");
  const [readStatus, setReadStatus] = useState("");
  const [polling, setPolling] = useState(false);
  const [patterns, setPatterns] = useState([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);

  // ✅ Socket ref
  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const readPollingIntervalRef = useRef(null); // ✅ Nový ref pre read polling

  // -------------------- INIT --------------------
  useEffect(() => {
    fetchDiagnostics();
    
    // ✅ Vytvorenie socket pripojenia
    const socketUrl = process.env.REACT_APP_API_URL || "https://car-diagnostics.onrender.com";
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true
    });
    
    // ✅ Počúvanie na clear confirmation
    socketRef.current.on("clear_confirmation", (data) => {
      console.log("Clear confirmation received:", data);
      if (data.device_id === deviceId && data.status === "success") {
        // Zastavíme polling ak beží
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        setPolling(false);
        setClearing(false);
        setClearStatus("DTC successfully cleared ✔");
        
        // ✅ OKAMŽITE načítame nové dáta
        fetchDiagnostics();
        
        // Po 3 sekundách skryjeme status
        setTimeout(() => {
          setClearStatus("");
        }, 3000);
      }
    });

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (readPollingIntervalRef.current) clearInterval(readPollingIntervalRef.current); // ✅ Vyčistenie
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [deviceId]);

  useEffect(() => {
    if (data?.vin) checkDtcPatterns(data.vin);
  }, [data?.vin]);

  // -------------------- REST --------------------
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

  const checkDtcPatterns = async (vin) => {
    if (!vin) return;
    setLoadingPatterns(true);
    try {
      const res = await api.get(`/api/dtc/pattern-check/${vin}`);
      setPatterns(res.data.matched_patterns || []);
    } catch (err) {
      console.error("Error loading DTC patterns:", err);
      setPatterns([]);
    } finally {
      setLoadingPatterns(false);
    }
  };

  // ✅ Nová funkcia pre read polling
  const startReadPolling = () => {
    if (readPollingIntervalRef.current) clearInterval(readPollingIntervalRef.current);
    
    let attempts = 0;
    const maxAttempts = 10; // 30 sekúnd (10 * 3s)
    
    readPollingIntervalRef.current = setInterval(async () => {
      attempts++;
      
      try {
        const res = await api.get(`/api/device/${deviceId}/diagnostics`);
        const newData = res.data;
        
        // Ak sa zmenil počet DTC kódov (pribudli nové)
        if (JSON.stringify(data?.dtc_codes) !== JSON.stringify(newData.dtc_codes)) {
          setData(newData);
          setReading(false);
          setReadStatus("DTC read completed ✔");
          if (newData.vin) checkDtcPatterns(newData.vin);
          
          // Zastavíme polling
          clearInterval(readPollingIntervalRef.current);
          readPollingIntervalRef.current = null;
          
          // Po 3 sekundách skryjeme status
          setTimeout(() => setReadStatus(""), 3000);
        } else if (attempts >= maxAttempts) {
          // Ak sa nič nezmenilo po max pokusoch, zastavíme polling
          clearInterval(readPollingIntervalRef.current);
          readPollingIntervalRef.current = null;
          setReading(false);
          setReadStatus("Read timeout - no new DTCs detected");
          setTimeout(() => setReadStatus(""), 3000);
        } else {
          setReadStatus(`Waiting for DTCs... (attempt ${attempts}/${maxAttempts})`);
        }
      } catch (e) {
        console.error("Read polling error:", e);
      }
    }, 3000); // Každé 3 sekundy
  };

  const handleReadDTCs = async () => {
    setReading(true);
    setReadStatus("Sending read DTC command...");

    try {
      await api.post(`/api/device/${deviceId}/read-dtcs`);
      setReadStatus("Command sent. Waiting for DTCs...");
      
      // ✅ Spustíme polling
      startReadPolling();
      
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
      
      // ✅ UŽ NESPÚŠŤAME POLLING, LEN ČAKÁME NA WEBSOCKET
      // startPollingDiagnostics();
      
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send clear command.");
      setClearing(false);
    }
  };

  // -------------------- UI helpers --------------------
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "#d32f2f";
      case "high": return "#f57c00";
      case "medium": return "#ffb300";
      case "low": return "#388e3c";
      default: return "#5f6368";
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "badge-critical";
      case "high": return "badge-high";
      case "medium": return "badge-medium";
      case "low": return "badge-low";
      default: return "badge-info";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "🔥";
      case "high": return "⚠️";
      case "medium": return "🔶";
      case "low": return "ℹ️";
      default: return "❓";
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return "#388e3c";
    if (confidence >= 80) return "#ffb300";
    return "#f57c00";
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

  return (
    <div className="devices-container">
      {/* Header */}
      <div className="devices-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Devices
        </button>

        <div className="header-content">
          <h1>Device Diagnostics</h1>
          <p className="subtitle">Diagnostics for device #{deviceId}</p>
        </div>

        <div className="device-status">
          <span className={`status-indicator ${data.online ? "online" : "offline"}`}></span>
          {data.online ? "Device Online" : "Device Offline"}
        </div>
      </div>

      {/* Device Info Cards */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">#{data.device_id}</span>
          <span className="stat-label">Device ID</span>
        </div>

        <div className="stat-item stat-item-vin">
          <span className="stat-number stat-number-vin">{data.vin ? data.vin : "N/A"}</span>
          <span className="stat-label">VIN</span>
        </div>

        <div className="stat-item">
          <span className="stat-number">{data.brand ? `${data.brand} ${data.model}` : "N/A"}</span>
          <span className="stat-label">Vehicle</span>
        </div>

        <div className="stat-item">
          <span className="stat-number">{data.dtc_codes ? data.dtc_codes.length : 0}</span>
          <span className="stat-label">Active DTCs</span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="control-panel" style={{ marginBottom: "2rem" }}>
        <div className="button-group">
          <button
            className={`btn btn-primary ${reading ? "loading" : ""}`}
            onClick={handleReadDTCs}
            disabled={reading || !data.online}
            style={{ minWidth: "150px" }}
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
            className={`btn btn-danger ${clearing ? "loading" : ""}`}
            onClick={handleClearDTCs}
            disabled={clearing || !data.online}
            style={{ minWidth: "150px" }}
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
          <div className={`status-message ${readStatus.includes("✔") ? "success" : readStatus.includes("timeout") ? "error" : "info"}`}>
            <span className="icon">
              {readStatus.includes("✔") ? "✅" : 
               readStatus.includes("timeout") ? "⚠️" : 
               readStatus.includes("Waiting") ? "⏳" : "ℹ️"}
            </span>
            {readStatus}
          </div>
        )}

        {clearStatus && (
          <div className={`status-message ${clearStatus.includes("✔") ? "success" : "warning"}`}>
            <span className="icon">{clearStatus.includes("✔") ? "✅" : "⏳"}</span>
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
              <span style={{ marginLeft: "1rem", fontSize: "0.875rem", color: "#5f6368" }}>
                {data.dtc_codes.filter((d) => d.severity === "critical").length} critical
              </span>
            )}
          </div>
        </div>

        {!data.dtc_codes || data.dtc_codes.length === 0 ? (
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
                    <tr key={i} className={i % 2 === 0 ? "even" : "odd"}>
                      <td>
                        <span
                          className="dtc-code-badge"
                          style={{
                            borderLeft: `4px solid ${severityColor}`,
                            background: `${severityColor}15`,
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
                            style={{ background: severityColor, color: "white" }}
                          >
                            {severityIcon} {item.severity?.toUpperCase() || "MEDIUM"}
                          </span>
                          <div className="severity-info">
                            <small>
                              {item.severity === "critical" && "Requires immediate attention"}
                              {item.severity === "high" && "Needs attention soon"}
                              {item.severity === "medium" && "Monitor condition"}
                              {item.severity === "low" && "Informational only"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="date-cell">
                          <div className="date">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
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

      {/* DTC Pattern Detection Section */}
      {data.vin && data.dtc_codes && data.dtc_codes.length > 0 && (
        <div className="pattern-section" style={{ marginBottom: "2rem" }}>
          <div className="section-header">
            <h2>🔍 DTC Pattern Detection</h2>
            <div className="pattern-count">
              {loadingPatterns ? <div className="spinner-tiny"></div> : `${patterns.length} pattern(s) detected`}
            </div>
          </div>

          {loadingPatterns ? (
            <div className="empty-state">
              <div className="spinner-medium"></div>
              <p>Analyzing DTC patterns...</p>
            </div>
          ) : patterns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No Patterns Detected</h3>
              <p>No known diagnostic patterns match the current DTC combination.</p>
            </div>
          ) : (
            <div className="pattern-cards">
              {patterns.map((pattern, index) => (
                <div key={index} className="pattern-card">
                  <div className="pattern-header">
                    <div className="pattern-title">
                      <span className="pattern-icon">🎯</span>
                      <h3>{pattern.pattern_name}</h3>
                    </div>
                    <div
                      className="confidence-badge"
                      style={{
                        backgroundColor: getConfidenceColor(pattern.confidence),
                        color: "white",
                      }}
                    >
                      {pattern.confidence}% confidence
                    </div>
                  </div>

                  <div className="pattern-body">
                    <div className="pattern-cause">
                      <strong>Primary Cause:</strong> {pattern.primary_cause}
                    </div>

                    <div className="pattern-codes">
                      <strong>Required DTC Codes:</strong>
                      <div className="dtc-code-list">
                        {pattern.required_codes.map((code, idx) => (
                          <span key={idx} className="dtc-tag">
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pattern-match">
                      <strong>Match Status:</strong>
                      <span className="match-badge success">✅ All required codes present</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DeviceDiagnosticsScreen;
