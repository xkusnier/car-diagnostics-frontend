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

// AI: Komponent DeviceDiagnosticsScreen bol ciastocne generovany cez ChatGPT a nasledne upraveny autorom.
// Diagnosticka obrazovka zobrazuje aktualne DTC a dovoluje ich citat alebo mazat.
function DeviceDiagnosticsScreen({ deviceId, onBack }) {
  // AI: Stavova struktura pre diagnosticke data a modalne hlasky bola ciastocne generovana cez ChatGPT a nasledne upravena autorom.
  // Data obsahuju odpoved diagnostickeho endpointu pre konkretne zariadenie.
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [reading, setReading] = useState(false);
  const [clearStatus, setClearStatus] = useState("");
  const [readStatus, setReadStatus] = useState("");
  // Polling sluzi ako poistka, ked realtime udalost nepride hned.
  const [polling, setPolling] = useState(false);
  // Patterny su oddelene od DTC kodov, lebo ide o dodatocnu analyzu historie.
  const [patterns, setPatterns] = useState([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
    tone: "info",
  });

  // Socket ref uchovava aktivne spojenie medzi renderovaniami.
  const socketRef = useRef(null);
  // Interval ref umozni zrusit polling pri odchode z obrazovky.
  const pollingIntervalRef = useRef(null);

  // Jeden modal sa pouziva pre uspech, chybu aj informacne spravy.
  // AI: Funkcia openFeedbackModal bola ciastocne generovana cez ChatGPT na jednotne zobrazovanie stavovych hlasok a nasledne upravena autorom.
  const openFeedbackModal = (title, message, tone = "info") => {
    setFeedbackModal({
      open: true,
      title,
      message,
      tone,
    });
  };

  // Zatvorenie modalu vycisti aj jeho texty.
  const closeFeedbackModal = () => {
    setFeedbackModal({
      open: false,
      title: "",
      message: "",
      tone: "info",
    });
  };

  // Chyby z backendu sa prevadzaju na jeden citatelny text.
  // AI: Funkcia normalizeApiError bola ciastocne generovana cez ChatGPT na spracovanie API chyb a nasledne upravena autorom.
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

  // Pri zmene zariadenia sa vytvori websocket a pripravi realtime diagnostika.
  useEffect(() => {
    fetchDiagnostics();

    // Socket adresa sa sklada podobne ako API URL.
    const socketUrl =
      process.env.REACT_APP_API_URL || "https://car-diagnostics.onrender.com";

    // Websocket sa pripaja cez transport websocket, aby sa obisli problemy s pollingom.
    socketRef.current = io(socketUrl, {
      transports: ["websocket"],
      reconnection: true,
    });

    // Potvrdenie vymazania pride asynchronne zo servera.
    socketRef.current.on("clear_confirmation", (socketData) => {
      // Event sa spracuje iba pre prave otvorene zariadenie.
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

    // DTC update obnovi data bez manualneho refreshu obrazovky.
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

    // Cleanup zrusi interval aj socket, aby po odchode nebezali duplicitne odbery.
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [deviceId]);

  // Ked sa zmeni VIN v diagnostike, nacitaju sa aj pattern vysledky.
  useEffect(() => {
    if (data?.vin) checkDtcPatterns(data.vin);
  }, [data?.vin]);

  // Zakladny request nacita stav zariadenia a zoznam DTC kodov.
  // AI: Funkcia fetchDiagnostics a volanie endpointu /api/device/{deviceId}/diagnostics boli ciastocne generovane cez ChatGPT a nasledne upravene autorom.
  const fetchDiagnostics = async () => {
    try {
      // Endpoint vracia diagnostiku pre jedno konkretne zariadenie.
      const res = await api.get(`/api/device/${deviceId}/diagnostics`);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(normalizeApiError(err, "Error fetching diagnostics"));
    } finally {
      setLoading(false);
    }
  };

  // Pattern kontrola hlada zaujimave kombinacie alebo opakovane chyby pre VIN.
  // AI: Funkcia checkDtcPatterns a volanie endpointu /api/dtc/pattern-check/{vin} boli ciastocne generovane cez ChatGPT a nasledne upravene autorom.
  const checkDtcPatterns = async (vin) => {
    if (!vin) return;

    setLoadingPatterns(true);
    try {
      // Backend vyhodnoti patterny na zaklade historie DTC.
      const res = await api.get(`/api/dtc/pattern-check/${vin}`);
      setPatterns(res.data.matched_patterns || []);
    } catch (err) {
      console.error("Error loading DTC patterns:", err);
      setPatterns([]);
    } finally {
      setLoadingPatterns(false);
    }
  };

  // Manualne citanie poziada backend o nove nacitanie DTC zo zariadenia.
  // AI: Funkcia handleReadDTCs a volanie endpointu /api/device/{deviceId}/read-dtcs boli ciastocne generovane cez ChatGPT a nasledne upravene autorom.
  const handleReadDTCs = async () => {
    setReading(true);
    setReadStatus("Sending read DTC command...");

    try {
      // Poziadavka sa odosiela bez tela, dolezite je deviceId v URL.
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

  // Vymazanie DTC je samostatna akcia a spusta sa az po potvrdeni.
  // AI: Funkcia handleClearDTCs a volanie endpointu /api/device/{deviceId}/clear-dtcs boli ciastocne generovane cez ChatGPT a nasledne upravene autorom.
  const handleClearDTCs = async () => {
    setShowClearConfirm(false);
    setClearing(true);
    setClearStatus("Sending clear command...");

    try {
      // Backend vykona clear akciu na konkretnom zariadeni.
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

  // Vaznost sa meni na jednoduchy nazov farby pre UI.
  // AI: Funkcia getSeverityColor bola ciastocne generovana cez ChatGPT na mapovanie zavaznosti DTC kodov a nasledne upravena autorom.
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

  // Badge trieda oddeluje CSS od dat z backendu.
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

  // Ikony pomahaju rychlo odlisit kriticke chyby.
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

  // Odporucanie sa berie z backendu alebo zo zalozneho pravidla.
  // AI: Funkcia getRecommendedAction bola ciastocne generovana cez ChatGPT na zobrazovanie odporucaneho postupu pri DTC kode a nasledne upravena autorom.
  const getRecommendedAction = (item) => {
    if (item?.recommended_action) return item.recommended_action;

    switch (item?.severity?.toLowerCase()) {
      case "critical":
        return "Stop immediately and do not continue driving";
      case "medium":
        return "Visit a service center soon";
      case "low":
        return "Continue driving and monitor the vehicle";
      default:
        return "Visit a service center soon";
    }
  };


  // Dialog brani nahodnemu vymazaniu chybovych kodov.
  // AI: Komponent ConfirmClearDialog bol ciastocne generovany cez ChatGPT a nasledne upraveny autorom.
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

  // Modal je oddeleny komponent, aby sa neopakoval markup hlasok.
  // AI: Komponent FeedbackModal bol ciastocne generovany cez ChatGPT a nasledne upraveny autorom.
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

  // Pri prvom nacitani sa zobrazi loading namiesto prazdnej diagnostiky.
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

  // Pri chybe sa zobrazi samostatny stav s moznostou navratu.
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
                    <th>Recommended Action</th>
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
                          <div
                            className="recommended-action-cell"
                            style={{
                              fontSize: "0.9rem",
                              lineHeight: "1.35",
                              maxWidth: "220px",
                            }}
                          >
                            <strong>{getRecommendedAction(item)}</strong>
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
// Suhrn vyuzitia AI: V tomto subore bol ChatGPT pouzity pri navrhu diagnostickej obrazovky, volaniach endpointov pre citanie a mazanie DTC kodov, spracovani DTC patternov, mapovani zavaznosti a pri modalnych potvrdeniach. Vysledny kod bol skontrolovany a upraveny autorom.
