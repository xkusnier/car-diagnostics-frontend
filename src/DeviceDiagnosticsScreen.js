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
  const [patterns, setPatterns] = useState([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);

  // NEW: live data states
  const [live, setLive] = useState({
    odometer: null,
    battery: null,
    engine: null,
    fuel: null,
    speed: null,
    updatedAt: null,
    error: null,
  });

  // NOTE: these are not React state/refs; keeping your style, but be aware this resets per render.
  let pollingInterval = null;
  let liveInterval = null;

  useEffect(() => {
    fetchDiagnostics();
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      if (liveInterval) clearInterval(liveInterval);
    };
  }, [deviceId]);

  useEffect(() => {
    // Ak máme VIN, načítame patterny
    if (data?.vin) {
      checkDtcPatterns(data.vin);
    }
  }, [data?.vin]);

  // NEW: start/stop live polling based on online status
  useEffect(() => {
    if (liveInterval) clearInterval(liveInterval);

    if (data?.online) {
      fetchLive();
      liveInterval = setInterval(() => {
        fetchLive();
      }, 3000);
    }

    return () => {
      if (liveInterval) clearInterval(liveInterval);
    };
  }, [deviceId, data?.online]);

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

  // NEW: load live data from new BE endpoints
  const fetchLive = async () => {
    try {
      const [odo, batt, eng, fuel, spd] = await Promise.allSettled([
        api.get(`/api/device/${deviceId}/odometer`),
        api.get(`/api/device/${deviceId}/battery`),
        api.get(`/api/device/${deviceId}/engine`),
        api.get(`/api/device/${deviceId}/fuel`),
        api.get(`/api/device/${deviceId}/speed`),
      ]);

      setLive((prev) => {
        const next = { ...prev, error: null };

        if (odo.status === "fulfilled") next.odometer = odo.value.data;
        if (batt.status === "fulfilled") next.battery = batt.value.data;
        if (eng.status === "fulfilled") next.engine = eng.value.data;
        if (fuel.status === "fulfilled") next.fuel = fuel.value.data;
        if (spd.status === "fulfilled") next.speed = spd.value.data;

        const ts = [
          next.odometer?.timestamp,
          next.battery?.timestamp,
          next.engine?.timestamp,
          next.fuel?.timestamp,
          next.speed?.timestamp,
        ]
          .filter(Boolean)
          .sort()
          .slice(-1)[0];

        next.updatedAt = ts || null;

        const allFailed =
          odo.status === "rejected" &&
          batt.status === "rejected" &&
          eng.status === "rejected" &&
          fuel.status === "rejected" &&
          spd.status === "rejected";

        if (allFailed) {
          const msg =
            odo.reason?.response?.data?.error ||
            batt.reason?.response?.data?.error ||
            eng.reason?.response?.data?.error ||
            fuel.reason?.response?.data?.error ||
            spd.reason?.response?.data?.error ||
            "No live data available";
          next.error = msg;
        }

        return next;
      });
    } catch (e) {
      setLive((prev) => ({
        ...prev,
        error: e.response?.data?.error || "Error fetching live data",
      }));
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
          // Aktualizuj patterny po vymazaní DTC
          if (diag.vin) {
            checkDtcPatterns(diag.vin);
          }
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
      await api.post(`/api/device/${deviceId}/read-dtcs`);

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
      case "critical":
        return "#d32f2f"; // červená
      case "high":
        return "#f57c00"; // oranžová
      case "medium":
        return "#ffb300"; // žltá
      case "low":
        return "#388e3c"; // zelená
      default:
        return "#5f6368"; // šedá
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "badge-critical";
      case "high":
        return "badge-high";
      case "medium":
        return "badge-medium";
      case "low":
        return "badge-low";
      default:
        return "badge-info";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "🔥";
      case "high":
        return "⚠️";
      case "medium":
        return "🔶";
      case "low":
        return "ℹ️";
      default:
        return "❓";
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return "#388e3c"; // zelená
    if (confidence >= 80) return "#ffb300"; // žltá
    return "#f57c00"; // oranžová
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
          <p className="subtitle">Real-time diagnostics for device #{deviceId}</p>
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

      {/* NEW: Live Data Section */}
      <div className="dtc-section" style={{ marginBottom: "2rem" }}>
        <div className="section-header">
          <h2>📈 Live Data</h2>
          <div className="dtc-count">
            {live.updatedAt ? (
              <span>
                Updated:{" "}
                {new Date(live.updatedAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            ) : (
              <span>—</span>
            )}
          </div>
        </div>

        {!data.online ? (
          <div className="empty-state">
            <div className="empty-icon">📴</div>
            <h3>Device Offline</h3>
            <p>Live data is available only when the device is online.</p>
          </div>
        ) : live.error ? (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>No Live Data</h3>
            <p>{live.error}</p>
          </div>
        ) : (
          <div className="stats-bar" style={{ marginTop: "1rem" }}>
            <div className="stat-item">
              <span className="stat-number">
                {live.odometer?.odometer != null ? `${live.odometer.odometer} km` : "—"}
              </span>
              <span className="stat-label">Odometer</span>
            </div>

            <div className="stat-item">
              <span className="stat-number">{live.speed?.speed != null ? `${live.speed.speed} km/h` : "—"}</span>
              <span className="stat-label">Speed</span>
            </div>

            <div className="stat-item">
              <span className="stat-number">
                {live.battery?.battery_voltage != null ? `${Number(live.battery.battery_voltage).toFixed(2)} V` : "—"}
              </span>
              <span className="stat-label">
                Battery {live.battery?.health ? `(${live.battery.health})` : ""}
              </span>
            </div>

            <div className="stat-item">
              <span className="stat-number">{live.engine?.engine?.rpm != null ? `${live.engine.engine.rpm} rpm` : "—"}</span>
              <span className="stat-label">
                Engine{" "}
                {live.engine?.engine?.running === true
                  ? "(running)"
                  : live.engine?.engine?.running === false
                  ? "(off)"
                  : ""}
              </span>
            </div>

            <div className="stat-item">
              <span className="stat-number">
                {live.engine?.engine?.coolant_temp != null ? `${live.engine.engine.coolant_temp} °C` : "—"}
              </span>
              <span className="stat-label">Coolant</span>
            </div>

            <div className="stat-item">
              <span className="stat-number">{live.engine?.engine?.oil_temp != null ? `${live.engine.engine.oil_temp} °C` : "—"}</span>
              <span className="stat-label">Oil Temp</span>
            </div>

            <div className="stat-item">
              <span className="stat-number">
                {live.engine?.engine?.intake_air_temp != null ? `${live.engine.engine.intake_air_temp} °C` : "—"}
              </span>
              <span className="stat-label">Intake Air</span>
            </div>

            <div className="stat-item">
              <span className="stat-number">{live.engine?.engine?.load != null ? `${live.engine.engine.load}%` : "—"}</span>
              <span className="stat-label">Engine Load</span>
            </div>

            <div className="stat-item">
              <span className="stat-number">
                {live.fuel?.fuel?.consumption_lh != null ? `${live.fuel.fuel.consumption_lh} L/h` : "—"}
              </span>
              <span className="stat-label">Fuel (L/h)</span>
            </div>

            <div className="stat-item">
              <span className="stat-number">
                {live.fuel?.fuel?.consumption_l100km != null ? `${live.fuel.fuel.consumption_l100km} L/100km` : "—"}
              </span>
              <span className="stat-label">Fuel (L/100km)</span>
            </div>

            <div className="stat-item">
              <span className="stat-number">{live.fuel?.fuel?.maf != null ? `${live.fuel.fuel.maf} g/s` : "—"}</span>
              <span className="stat-label">MAF</span>
            </div>

            <div className="stat-item">
              <span className="stat-number">{live.fuel?.fuel?.type ? `${live.fuel.fuel.type}` : "—"}</span>
              <span className="stat-label">Fuel Type</span>
            </div>
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
                            style={{
                              background: severityColor,
                              color: "white",
                            }}
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

      {/* Severity Legend */}
      {data.dtc_codes && data.dtc_codes.length > 0 && (
        <div className="quick-tips">
          <h4>⚠️ Severity Legend</h4>
          <div className="severity-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ background: "#d32f2f" }}></span>
              <span className="legend-label">
                <strong>CRITICAL</strong> - Requires immediate attention
              </span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: "#f57c00" }}></span>
              <span className="legend-label">
                <strong>HIGH</strong> - Needs attention soon
              </span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: "#ffb300" }}></span>
              <span className="legend-label">
                <strong>MEDIUM</strong> - Monitor condition
              </span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: "#388e3c" }}></span>
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
