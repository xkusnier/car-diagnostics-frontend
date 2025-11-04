import React, { useEffect, useState } from "react";
import { api } from "./api";

function DeviceDiagnosticsScreen({ deviceId, onBack }) {
  const [info, setInfo] = useState(null);
  const [dtcDetails, setDtcDetails] = useState([]); // pre kódy s popisom
  const [error, setError] = useState(null);
  const [loadingDescriptions, setLoadingDescriptions] = useState(false);

  // Načítaj základné info o zariadení
  useEffect(() => {
    api
      .get(`/api/device/${deviceId}/diagnostics`)
      .then((res) => setInfo(res.data))
      .catch((err) => setError(err.response?.data?.error || "Failed to load diagnostics"));
  }, [deviceId]);

  // Keď sa načítajú DTC kódy → pre každý načítaj popis z API
  useEffect(() => {
    if (info && info.dtc_codes && info.dtc_codes.length > 0) {
      setLoadingDescriptions(true);
      Promise.all(
        info.dtc_codes.map((code) =>
          api
            .post("/api/dtc-description", { dtc_code: code })
            .then((res) => ({
              code,
              description: res.data.description || "No description available",
            }))
            .catch(() => ({
              code,
              description: "Unknown code",
            }))
        )
      )
        .then((results) => setDtcDetails(results))
        .finally(() => setLoadingDescriptions(false));
    }
  }, [info]);

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
          <p>
            <strong>VIN:</strong> {info.vin || "—"}
          </p>
          <p>
            <strong>Status:</strong> {info.online ? "Online" : "Offline"}
          </p>
          <h4>DTC Codes:</h4>

          {info.dtc_codes.length === 0 ? (
            <p>No DTC codes found.</p>
          ) : loadingDescriptions ? (
            <p>Loading code descriptions...</p>
          ) : (
            <ul>
              {dtcDetails.map((d, i) => (
                <li key={i}>
                  <strong>{d.code}</strong> — {d.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default DeviceDiagnosticsScreen;
