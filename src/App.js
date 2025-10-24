import React, { useEffect, useState } from "react";
import { api } from "./api";
import LoginScreen from "./LoginScreen"; // Import LoginScreen

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Stav pre autentifikáciu

  // Načítanie dát pre dashboard po prihlásení
  useEffect(() => {
    if (isAuthenticated) {
      api
        .get("/api/all")
        .then((res) => setData(res.data))
        .catch((err) => setError(err.message));
    }
  }, [isAuthenticated]);

  // Funkcia na spracovanie prihlásenia
  const handleLogin = (username, password) => {
    // Simulácia prihlásenia (nahradí sa API volaním)
    if (username && password) {
      // Príklad: api.post("/api/login", { username, password })
      // .then(() => setIsAuthenticated(true))
      // .catch((err) => setError(err.message));
      setIsAuthenticated(true); // Dočasná simulácia úspešného prihlásenia
    } else {
      setError("Invalid credentials");
    }
  };

  // Ak nie je používateľ prihlásený, zobrazí sa LoginScreen
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Ak je používateľ prihlásený, zobrazí sa dashboard
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Car Diagnostics Dashboard</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {!data && !error && <p>Loading data...</p>}
      {data && (
        <table
          border="1"
          cellPadding="8"
          style={{ borderCollapse: "collapse", marginTop: "1rem" }}
        >
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
