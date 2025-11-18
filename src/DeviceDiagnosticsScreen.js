import React, { useEffect, useState } from "react";
import { api } from "./api";

function DeviceDiagnosticsScreen({ deviceId, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  // ➕ nové
  const [clearStatus, setClearStatus] = useState("");
  const [polling, setPolling] = useState(false);
  let pollingInterval = null;

  // Fetch diagnostics on mount
  useEffect(() => {
    fetchDiagnostics();
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

  // --------- NOVÉ: POLLING PO CLEAR ---------
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

          setData(diag); // refresh
        } else {
          setClearStatus("Waiting for RPi to clear DTC...");
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 3000);
  };

  // --------- UPRAVENÉ CLEAR DTC ---------
  const handleClearDTCs = async () => {
    if (!window.confirm("Are you sure you want to clear all active DTCs?")) return;

    setClearing(true);
    setClearStatus("Sending clear command...");

    try {
      // BE pridá command, nečistí databázu okamžite
      await api.post(`/api/device/${deviceId}/clear-dtcs`);

      setClearStatus("Command sent. Waiting for RPi...");

      // spusti polling diagnostiky
      startPollingDiagnostics();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send clear command.");
      setClearing(false);
    }
  };

  // -------------------- UI --------------------
  if (loading)
    return <p style={{ padding: "2rem" }}>Loading diagnostics...</p>;

  if (error)
    return (
      <div style={{ padding: "2rem" }}>
        <p style={{ color: "red" }}>❌ {error}</p>
        <button
          onClick={onBack}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            background: "gray",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Back
        </button>
      </div>
    );

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h2>Device Diagnostics</h2>

      <div style={{ marginBottom: "1rem" }}>
        <p>
          <strong>Device ID:</strong> {data.device_id} <br />
          <strong>VIN:</strong> {data.vin || "N/A"} <br />
          <strong>Status:</strong>{" "}
          <span style={{ color: data.online ? "green" : "red" }}>
            {data.online ? "Online" : "Offline"}
          </span>
        </p>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={onBack}
          style={{
            marginRight: "1rem",
            padding: "0.5rem 1rem",
            background: "gray",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Back
        </button>

        <button
          onClick={handleClearDTCs}
          disabled={clearing}
          style={{
            padding: "0.5rem 1rem",
            background: "darkred",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {clearing ? "Clearing..." : "Clear Active DTCs"}
        </button>
      </div>

      {/* ➕ Zobrazenie clear statusu */}
      {clearing || polling ? (
        <p style={{ color: "orange", marginBottom: "1.5rem" }}>
          {clearStatus}
        </p>
      ) : null}

      <h3>Active DTC Codes</h3>

      {(!data.dtc_codes || data.dtc_codes.length === 0) && (
        <p>No active DTC codes found.</p>
      )}

      {data.dtc_codes && data.dtc_codes.length > 0 && (
        <table
          border="1"
          cellPadding="8"
          style={{
            borderCollapse: "collapse",
            width: "100%",
            marginTop: "1rem",
          }}
        >
          <thead style={{ background: "#f5f5f5" }}>
            <tr>
              <th>DTC Code</th>
              <th>Description</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {data.dtc_codes.map((item, i) => (
              <tr key={i}>
                <td>{item.dtc_code}</td>
                <td>{item.description}</td>
                <td>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString("en-GB")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DeviceDiagnosticsScreen;
