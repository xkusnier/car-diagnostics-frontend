import React, { useEffect, useState } from "react";
import { api } from "./api";

function MyDevicesScreen({ onBack, onDiagnostics, role }) {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");

  useEffect(() => {
    api
      .get("/api/my-devices")
      .then((res) => setDevices(res.data.devices))
      .catch((err) =>
        setError(err.response?.data?.error || "Failed to load devices")
      );
  }, []);

  const handleAddDevice = () => {
    if (!newDeviceId) return alert("Enter device ID");

    const payload =
      role === "admin"
        ? { device_id: newDeviceId, user_id: assignUserId }
        : { device_id: newDeviceId };

    api
      .post("/api/add-device", payload)
      .then((res) => {
        alert("Device added!");
        setNewDeviceId("");
        setAssignUserId("");

        const newDev = {
          device_id: res.data.device_id,
          user_id: res.data.assigned_to,
          vin: "—",
          status: "Offline",
        };

        // ✅ okamžite pridáme správne user_id z backendu
        setDevices((prev) => [...prev, newDev]);
      })
      .catch((err) => {
        alert(err.response?.data?.error || "Failed to add device");
      });
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h2>{role === "admin" ? "All Devices (Admin)" : "My Devices"}</h2>

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

      {/* --- FORM NA PRIDANIE DEVICE --- */}
      <div
        style={{
          marginBottom: "1rem",
          background: "#f3f3f3",
          padding: "1rem",
          borderRadius: "6px",
        }}
      >
        <h4>Add New Device</h4>
        <input
          type="number"
          placeholder="Device ID"
          value={newDeviceId}
          onChange={(e) => setNewDeviceId(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        {role === "admin" && (
          <input
            type="number"
            placeholder="User ID"
            value={assignUserId}
            onChange={(e) => setAssignUserId(e.target.value)}
            style={{ marginRight: "0.5rem" }}
          />
        )}
        <button
          onClick={handleAddDevice}
          style={{
            padding: "0.4rem 1rem",
            background: "green",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Add
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {devices.length === 0 ? (
        <p>No devices found.</p>
      ) : (
        <table
          border="1"
          cellPadding="8"
          style={{ borderCollapse: "collapse", width: "100%" }}
        >
          <thead>
            <tr>
              <th>Device ID</th>
              {/* 👇 Tento stĺpec uvidí len admin */}
              {role === "admin" && <th>User ID</th>}
              <th>VIN</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d, i) => (
              <tr key={i}>
                <td>{d.device_id}</td>
                {/* 👇 Hodnota user_id len pre admina */}
                {role === "admin" && <td>{d.user_id || "—"}</td>}
                <td>{d.vin || "—"}</td>
                <td
                  style={{
                    color: d.status === "Online" ? "green" : "red",
                  }}
                >
                  {d.status}
                </td>
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
