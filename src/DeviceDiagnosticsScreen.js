import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import "./styles/global.css";
import { io } from "socket.io-client";
import {
  ExclamationTriangleIcon,
  CommandLineIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
    tone: "info",
  });

  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const openFeedbackModal = (title, message, tone = "info") => {
    setFeedbackModal({
      open: true,
      title,
      message,
      tone,
    });
  };

  const closeFeedbackModal = () => {
    setFeedbackModal({
      open: false,
      title: "",
      message: "",
      tone: "info",
    });
  };

  const normalizeApiError = (err, fallbackMessage) => {
    const raw =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      "";

    const normalized = String(raw).trim().toLowerCase();

    if (
      normalized.includes("content-type must be application/json") ||
      normalized.includes("please set content-type header") ||
      normalized.includes("application/json")
    ) {
      return fallbackMessage;
    }

    return raw || fallbackMessage;
  };

  useEffect(() => {
    fetchDiagnostics();

    const socketUrl =
      process.env.REACT_APP_API_URL || "https://car-diagnostics.onrender.com";

    socketRef.current = io(socketUrl, {
      transports: ["websocket"],
      reconnection: true,
    });

    socketRef.current.on("clear_confirmation", (socketData) => {
      if (socketData.device_id === deviceId && socketData.status === "success") {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        setPolling(false);
        setClearing(false);
        setClearStatus("DTC successfully cleared");
        fetchDiagnostics();

        setTimeout(() => {
          setClearStatus("");
        }, 3000);
      }
    });

    socketRef.current.on("dtc_update", (socketData) => {
      if (socketData.device_id === deviceId) {
        setReading(false);
        setReadStatus("DTC read completed");
        fetchDiagnostics();

        setTimeout(() => {
          setReadStatus("");
        }, 3000);
      }
    });

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [deviceId]);

  useEffect(() => {
    if (data?.vin) checkDtcPatterns(data.vin);
  }, [data?.vin]);

  const fetchDiagnostics = async () => {
    try {
      const res = await api.get(`/api/device/${deviceId}/diagnostics`);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(normalizeApiError(err, "Error fetching diagnostics"));
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

  const handleReadDTCs = async () => {
    setReading(true);
    setReadStatus("Sending read DTC command...");

    try {
      await api.post(`/api/device/${deviceId}/read-dtcs`, {});
      setReadStatus("Command sent. Waiting for DTCs...");
    } catch (err) {
      setReading(false);
      setReadStatus("");
      openFeedbackModal(
        "Read DTC Failed",
        normalizeApiError(err, "Failed to send the read DTC command."),
        "danger"
      );
    }
  };

  const handleClearDTCs = async () => {
    setShowClearConfirm(false);
    setClearing(true);
    setClearStatus("Sending clear command...");

    try {
      await api.post(`/api/device/${deviceId}/clear-dtcs`, {});
      setClearStatus("Command sent. Waiting for device confirmation...");
    } catch (err) {
      setClearing(false);
      setClearStatus("");
      openFeedbackModal(
        "Clear DTC Failed",
        normalizeApiError(err, "Failed to send the clear DTC command."),
        "danger"
      );
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "#d32f2f";
      case "high":
        return "#f57c00";
      case "medium":
        return "#ffb300";
      case "low":
        return "#388e3c";
      default:
        return "#5f6368";
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
    const iconStyle = {
      width: "0.95rem",
      height: "0.95rem",
      marginRight: "0.35rem",
      verticalAlign: "text-bottom",
    };

    switch (severity?.toLowerCase()) {
      case "critical":
      case "high":
      case "medium":
        return <ExclamationTriangleIcon style={iconStyle} />;
      case "low":
      default:
        return <InformationCircleIcon style={iconStyle} />;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return "#388e3c";
    if (confidence >= 80) return "#ffb300";
    return "#f57c00";
  };

  const ConfirmClearDialog = ({ onConfirm, onCancel }) => (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Clear Active DTC Codes</h3>
        <p>Are you sure you want to clear all active DTC codes for this device?</p>
        <p className="warning-text">
          This will send a clear command to the diagnostic device and wait for
          confirmation from the vehicle.
        </p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={clearing}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={clearing}>
            Confirm Clear
          </button>
        </div>
      </div>
    </div>
  );

  const FeedbackModal = ({ title, message, tone, onClose }) => (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{title}</h3>
        <div
          className={`status-message ${
            tone === "success" ? "success" : tone === "danger" ? "warning" : "info"
          }`}
          style={{ marginTop: "1rem", marginBottom: "1rem" }}
        >
          {tone === "success" ? (
            <CheckCircleIcon style={{ width: "1.1rem", height: "1.1rem", flexShrink: 0 }} />
          ) : (
            <ExclamationTriangleIcon
              style={{ width: "1.1rem", height: "1.1rem", flexShrink: 0 }}
            />
          )}
          <div>{message}</div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );

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
          <div className="error-icon">
            <ExclamationTriangleIcon style={{ width: "2rem", height: "2rem" }} />
          </div>
          <div className="error-content">
            <h3>Error Loading Diagnostics</h3>
            <p>{error}</p>
          </div>
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
          <h1>Device Diagnostics</h1>
          <p className="subtitle">Diagnostics for device #{deviceId}</p>
        </div>

        <div className="device-status">
          <span className={`status-indicator ${data.online ? "online" : "offline"}`}></span>
          {data.online ? "Device Online" : "Device Offline"}
        </div>
      </div>

      <div
        className="status-message info"
        style={{ marginBottom: "1.5rem", alignItems: "flex-start" }}
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
          Read DTC requests active fault codes directly from the vehicle. Clear
          DTC sends a clear command and waits for confirmation from the
          diagnostic device.
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">#{data.device_id}</span>
          <span className="stat-label">Device ID</span>
        </div>

        <div className="stat-item stat-item-vin">
          <span className="stat-number stat-number-vin">
            {data.vin ? data.vin : "N/A"}
          </span>
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

      {!data.vin && (
        <div className="status-message warning" style={{ marginBottom: "1.5rem" }}>
          <InformationCircleIcon
            style={{ width: "1rem", height: "1rem", flexShrink: 0 }}
          />
          <div>
            No vehicle is currently linked to this device. Connect the
            diagnostic device to a vehicle to read live diagnostic trouble
            codes.
          </div>
        </div>
      )}

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
                <CommandLineIcon
                  style={{
                    width: "1rem",
                    height: "1rem",
                    marginRight: "0.45rem",
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                />
                Read DTC
              </>
            )}
          </button>

          <button
            className={`btn btn-danger ${clearing ? "loading" : ""}`}
            onClick={() => setShowClearConfirm(true)}
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
                <TrashIcon
                  style={{
                    width: "1rem",
                    height: "1rem",
                    marginRight: "0.45rem",
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                />
                Clear DTC
              </>
            )}
          </button>
        </div>

        {!data.online && (
          <div className="input-hint">
            The device must be online and connected to a vehicle to read or
            clear current DTC data.
          </div>
        )}

        {readStatus && (
          <div
            className={`status-message ${
              readStatus.toLowerCase().includes("completed") ? "success" : "info"
            }`}
          >
            <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}>
              {readStatus.toLowerCase().includes("completed") ? (
                <CheckCircleIcon
                  style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }}
                />
              ) : (
                <ClockIcon
                  style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }}
                />
              )}
            </span>
            {readStatus}
          </div>
        )}

        {clearStatus && (
          <div
            className={`status-message ${
              clearStatus.toLowerCase().includes("cleared") ? "success" : "warning"
            }`}
          >
            <span className="icon" style={{ display: "inline-flex", alignItems: "center" }}>
              {clearStatus.toLowerCase().includes("cleared") ? (
                <CheckCircleIcon
                  style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }}
                />
              ) : (
                <ClockIcon
                  style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }}
                />
              )}
            </span>
            {clearStatus}
          </div>
        )}
      </div>

      <div className="results-section card">
        <div className="results-header">
          <div>
            <h2>Active DTC Codes</h2>
          </div>
          <div className="dtc-count">
            {data.dtc_codes ? data.dtc_codes.length : 0} active codes
            {data.dtc_codes && data.dtc_codes.length > 0 && (
              <span
                style={{
                  marginLeft: "1rem",
                  fontSize: "0.875rem",
                  color: "#5f6368",
                }}
              >
                {data.dtc_codes.filter((d) => d.severity === "critical").length} critical
              </span>
            )}
          </div>
        </div>

        {!data.dtc_codes || data.dtc_codes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <CheckCircleIcon
                style={{ width: "3rem", height: "3rem", margin: "0 auto" }}
              />
            </div>
            <h3>No Active DTC Codes</h3>
            <p>No diagnostic trouble codes are currently reported for this device.</p>
          </div>
        ) : (
          <div className="dtc-table-card">
            <div className="table-container">
              <table className="table dtc-shared-table">
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

                    return (
                      <tr key={i}>
                        <td>
                          <span className="dtc-code-badge dtc-code-active">
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
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              {getSeverityIcon(item.severity)}
                              {item.severity?.toUpperCase() || "MEDIUM"}
                            </span>
                            <div className="severity-info">
                              <small>
                                {item.severity === "critical" &&
                                  "Requires immediate attention"}
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
          </div>
        )}
      </div>

      {data.vin && data.dtc_codes && data.dtc_codes.length > 0 && (
        <div className="pattern-section" style={{ marginBottom: "2rem" }}>
          <div className="section-header">
            <h2 style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <MagnifyingGlassIcon style={{ width: "1.25rem", height: "1.25rem" }} />
              DTC Pattern Detection
            </h2>
            <div className="pattern-count">
              {loadingPatterns ? (
                <div className="spinner-tiny"></div>
              ) : (
                `${patterns.length} pattern(s) detected`
              )}
            </div>
          </div>

          {loadingPatterns ? (
            <div className="empty-state">
              <div className="spinner-medium"></div>
              <p>Analyzing DTC patterns...</p>
            </div>
          ) : patterns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <MagnifyingGlassIcon
                  style={{ width: "3rem", height: "3rem", margin: "0 auto" }}
                />
              </div>
              <h3>No Patterns Detected</h3>
              <p>No known diagnostic patterns match the current DTC combination.</p>
            </div>
          ) : (
            <div className="pattern-cards">
              {patterns.map((pattern, index) => (
                <div key={index} className="pattern-card">
                  <div className="pattern-header">
                    <div
                      className="pattern-title"
                      style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
                    >
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
                      <span
                        className="match-badge success"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                      >
                        <CheckCircleIcon style={{ width: "1rem", height: "1rem" }} />
                        All required codes present
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showClearConfirm && (
        <ConfirmClearDialog
          onConfirm={handleClearDTCs}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      {feedbackModal.open && (
        <FeedbackModal
          title={feedbackModal.title}
          message={feedbackModal.message}
          tone={feedbackModal.tone}
          onClose={closeFeedbackModal}
        />
      )}
    </div>
  );
}

export default DeviceDiagnosticsScreen;
