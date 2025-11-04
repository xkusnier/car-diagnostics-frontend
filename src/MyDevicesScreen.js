import React, { useEffect, useState } from "react";
import { api } from "./api";

function MyDevicesScreen({ onBack, onDiagnostics }) {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/api/my-devices")
      .then((res) => setDevices(res.data.devices))
      .catch((err) => setError(err.response?.data?.error || "Failed to load devices"));
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h2>My Devices</h2>
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
      {devices.length === 0 ? (
        <p>No devices found.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Device ID</th>
              <th>VIN</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d, i) => (
              <tr key={i}>
                <td>{d.device_id}</td>
                <td>{d.vin || "—"}</td>
                <td style={{ color: d.status === "Online" ? "green" : "red" }}>{d.status}</td>
                <td>
                  <button
                    onClick={() => onDiagnostics(d.device_id)}
                    style={{
                      padding: "0.3rem 0.8rem",
                      background: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                    }}
                  >
                    Diagnostics
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MyDevicesScreen;
