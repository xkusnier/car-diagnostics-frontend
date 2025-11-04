import React, { useState } from "react";
import { api } from "./api";

function AddDeviceScreen({ onBack }) {
  const [deviceId, setDeviceId] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleAddDevice = () => {
    if (!deviceId) {
      setError("Please enter a valid Device ID.");
      return;
    }

    api
      .post("/api/add-device", { device_id: parseInt(deviceId) })
      .then((res) => {
        setMessage(`✅ Device ${res.data.device_id} successfully added!`);
        setError(null);
        setDeviceId("");
      })
      .catch((err) => {
        const msg = err.response?.data?.error || "Failed to add device.";
        setError(`❌ ${msg}`);
        setMessage(null);
      });
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h2>Add New Device</h2>
      <input
        type="number"
        placeholder="Enter Device ID"
        value={deviceId}
        onChange={(e) => setDeviceId(e.target.value)}
        style={{ marginRight: "1rem", padding: "0.5rem" }}
      />
      <button
        onClick={handleAddDevice}
        style={{
          padding: "0.5rem 1rem",
          background: "green",
          color: "white",
          border: "none",
          borderRadius: "4px",
        }}
      >
        Add Device
      </button>
      <button
        onClick={onBack}
        style={{
          marginLeft: "1rem",
          padding: "0.5rem 1rem",
          background: "gray",
          color: "white",
          border: "none",
          borderRadius: "4px",
        }}
      >
        Back
      </button>
      {message && <p style={{ color: "green", marginTop: "1rem" }}>{message}</p>}
      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
    </div>
  );
}

export default AddDeviceScreen;
