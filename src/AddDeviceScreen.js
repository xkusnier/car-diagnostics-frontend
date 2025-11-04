import React, { useState } from "react";
import { api } from "./api";

function AddDeviceScreen({ onBack }) {
  const [deviceId, setDeviceId] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleAddDevice = async () => {
    setMessage(null);
    setError(null);

    if (!deviceId || isNaN(deviceId) || parseInt(deviceId) <= 0) {
      setError("⚠️ Please enter a valid positive integer as Device ID.");
      return;
    }

    try {
      const res = await api.post("/api/add-device", {
        device_id: parseInt(deviceId),
      });

      setMessage(`✅ Device ${res.data.device_id} successfully added!`);
      setDeviceId("");
    } catch (err) {
      let msg = "❌ Failed to add device.";

      if (err.response) {
        if (err.response.status === 409) {
          msg = "❌ Device with this ID already exists.";
        } else if (err.response.status === 400) {
          msg = "⚠️ Invalid Device ID provided.";
        } else if (err.response.data?.error) {
          msg = `❌ ${err.response.data.error}`;
        }
      }

      setError(msg);
    }
  };

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
        maxWidth: "400px",
        margin: "auto",
        textAlign: "center",
      }}
    >
      <h2 style={{ marginBottom: "1rem" }}>Add New Device</h2>

      <input
        type="number"
        placeholder="Enter Device ID"
        value={deviceId}
        onChange={(e) => setDeviceId(e.target.value)}
        style={{
          marginRight: "1rem",
          padding: "0.5rem",
          width: "150px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      />

      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={handleAddDevice}
          style={{
            padding: "0.5rem 1rem",
            background: "green",
            color: "white",
            border: "none",
            borderRadius: "4px",
            marginRight: "1rem",
            cursor: "pointer",
          }}
        >
          Add Device
        </button>

        <button
          onClick={onBack}
          style={{
            padding: "0.5rem 1rem",
            background: "gray",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Back
        </button>
      </div>

      {message && (
        <p style={{ color: "green", marginTop: "1rem", fontWeight: "bold" }}>
          {message}
        </p>
      )}
      {error && (
        <p style={{ color: "red", marginTop: "1rem", fontWeight: "bold" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default AddDeviceScreen;
