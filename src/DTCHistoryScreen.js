import React, { useState } from "react";
import { api } from "./api";

function DTCHistoryScreen({ onBack }) {
  const [vin, setVin] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.post("/api/dtc-history-full", { vin });
      setData(res.data.history);
    } catch (err) {
      setError(err.response?.data?.error || "Error fetching history");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h2>DTC History Lookup</h2>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          placeholder="Enter VIN"
          style={{
            padding: "0.5rem",
            width: "250px",
            marginRight: "1rem",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !vin}
          style={{
            padding: "0.5rem 1rem",
            background: "blue",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {loading ? "Loading..." : "Show History"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>❌ {error}</p>}

      {data && (
        <table
          border="1"
          cellPadding="8"
          style={{
            borderCollapse: "collapse",
            width: "100%",
            marginTop: "1rem",
          }}
        >
          <thead>
            <tr>
              <th>DTC Code</th>
              <th>Description</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={i}>
                <td>{item.dtc_code}</td>
                <td>{item.description}</td>
                <td>{new Date(item.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
}

export default DTCHistoryScreen;
