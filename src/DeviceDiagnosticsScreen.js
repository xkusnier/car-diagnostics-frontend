import React, { useEffect, useState } from "react";
import { api } from "./api";

function DeviceDiagnosticsScreen({ deviceId, onBack }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/api/device/${deviceId}/diagnostics`)
      .then((res) => setInfo(res.data))
      .catch((err) => setError(err.response?.data?.error || "Failed to load diagnostics"));
  }, [deviceId]);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h2>Device Diagnostics (ID: {deviceId})</h2>
      <button
        onClick={onBack}
        style={{
          marginBottom: "1rem",
          padding: "0.5rem 1rem",
          background: "gray",
          color: "white",
          border: "none",
          borderRadius: "4px",
        }}
      >
        Back
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {!info && !error && <p>Loading...</p>}

      {info && (
        <div style={{ marginTop: "1rem" }}>
          <p><strong>VIN:</strong> {info.vin || "—"}</p>
          <p><strong>Status:</strong> {info.online ? "Online" : "Offline"}</p>
          <h4>DTC Codes:</h4>
          {info.dtc_codes.length === 0 ? (
            <p>No DTC codes found.</p>
          ) : (
            <ul>
              {info.dtc_codes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default DeviceDiagnosticsScreen;
