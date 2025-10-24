import React, { useEffect, useState } from "react";
import { api } from "./api";

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/api/all")
      .then(res => setData(res.data))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Car Diagnostics Dashboard</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {!data && !error && <p>Loading data...</p>}
      {data && (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr>
              <th>VIN</th>
              <th>DTC Codes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((v, i) => (
              <tr key={i}>
                <td>{v.vin}</td>
                <td>{v.dtc_codes.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
