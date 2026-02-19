import React, { useState, useEffect } from "react";
import { api } from "./api";
import "./styles/global.css";

function DTCHistoryScreen({ onBack }) {
  const [vin, setVin] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeDtcs, setActiveDtcs] = useState([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    severity: "all"
  });

  // Funkcia na získanie aktívnych DTC pre dané VIN
  const fetchActiveDtcs = async (vinCode) => {
    setLoadingActive(true);
    try {
      // Skúsime nájsť zariadenie s týmto VIN
      const devicesRes = await api.get("/api/my-devices");
      const devices = devicesRes.data.devices || [];
      
      // Nájsť zariadenie s týmto VIN
      const deviceWithVin = devices.find(d => d.vin === vinCode);
      
      if (deviceWithVin) {
        // Získať diagnostiku pre toto zariadenie (obsahuje aktívne DTC)
        const diagRes = await api.get(`/api/device/${deviceWithVin.device_id}/diagnostics`);
        const activeCodes = diagRes.data.dtc_codes || [];
        setActiveDtcs(activeCodes.map(d => d.dtc_code));
      } else {
        // Ak nenájdeme zariadenie, skúsime priamo endpoint pre aktívne DTC
        try {
          const activeRes = await api.get(`/api/vehicle/${vinCode}/active-dtcs`);
          setActiveDtcs(activeRes.data.active_dtcs || []);
        } catch {
          // Ak ani to nefunguje, predpokladáme že nie sú žiadne aktívne DTC
          setActiveDtcs([]);
        }
      }
    } catch (err) {
      console.error("Error fetching active DTCs:", err);
      setActiveDtcs([]);
    } finally {
      setLoadingActive(false);
    }
  };

  // Funkcia na kontrolu či je DTC aktívne
  const isDtcActive = (dtcCode) => {
    return activeDtcs.includes(dtcCode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    
    try {
      const payload = { vin: vin.toUpperCase() };
      if (filters.dateFrom) payload.date_from = filters.dateFrom;
      if (filters.dateTo) payload.date_to = filters.dateTo;
      if (filters.severity !== "all") payload.severity = filters.severity;
      
      const res = await api.post("/api/dtc-history-full", payload);
      setData(res.data.history);
      
      // Po získaní histórie, získame aj aktívne DTC pre toto VIN
      await fetchActiveDtcs(vin.toUpperCase());
      
    } catch (err) {
      setError(err.response?.data?.error || "Error fetching DTC history");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (dtcCode) => {
    // Simple severity detection based on DTC code patterns
    if (dtcCode?.startsWith('P0') || dtcCode?.startsWith('P1')) return 'medium';
    if (dtcCode?.startsWith('P2')) return 'high';
    if (dtcCode?.startsWith('C') || dtcCode?.startsWith('U')) return 'critical';
    return 'low';
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "badge-critical";
      case "high": return "badge-high";
      case "medium": return "badge-medium";
      case "low": return "badge-low";
      default: return "badge-info";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "🔥";
      case "high": return "⚠️";
      case "medium": return "🔶";
      case "low": return "ℹ️";
      default: return "❓";
    }
  };

  const getStatusBadge = (dtcCode) => {
    const active = isDtcActive(dtcCode);
    return {
      class: active ? 'active' : 'resolved',
      text: active ? 'ACTIVE' : 'RESOLVED'
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dtc-history-container">
      {/* Header */}
      <div className="devices-header">

        <div className="header-content">
          <h1>DTC History</h1>
          <p className="subtitle">Search diagnostic trouble codes by VIN</p>
        </div>
      </div>

      {/* Search Card */}
      <div className="search-card card">
        <div className="search-header">
          <h2>Search Parameters</h2>
          <span className="search-icon">🔍</span>
        </div>
        
        <form onSubmit={handleSubmit} className="search-form">
          <div className="form-group">
            <label htmlFor="vin">Vehicle Identification Number (VIN)</label>
            <input
              type="text"
              id="vin"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              placeholder="Enter 17-character VIN"
              className="input"
              maxLength="17"
              required
            />
            <small className="input-hint">Enter the complete 17-character VIN</small>
          </div>

          <button
            type="submit"
            disabled={loading || !vin.trim()}
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Searching...
              </>
            ) : (
              'Search DTC History'
            )}
          </button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-card card">
          <div className="error-icon">❌</div>
          <div className="error-content">
            <h3>Search Failed</h3>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {data && (
        <div className="results-section card">
          <div className="results-header">
            <div>
              <h2>Search Results</h2>
              <p className="results-summary">
                Found <strong>{data.length}</strong> DTC records for VIN: <code>{vin}</code>
                {loadingActive && <span className="spinner-tiny" style={{ marginLeft: '1rem' }}></span>}
              </p>
            </div>
          </div>

          {data.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No DTC Records Found</h3>
              <p>No diagnostic trouble codes found for the specified VIN and filters.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card">
                  <span className="summary-value">{data.length}</span>
                  <span className="summary-label">Total Records</span>
                </div>
                <div className="summary-card">
                  <span className="summary-value">
                    {[...new Set(data.map(d => d.dtc_code))].length}
                  </span>
                  <span className="summary-label">Unique DTCs</span>
                </div>
                <div className="summary-card">
                  <span className="summary-value">
                    {data.filter(d => getSeverityColor(d.dtc_code) === 'critical').length}
                  </span>
                  <span className="summary-label">Critical Issues</span>
                </div>
                <div className="summary-card">
                  <span className="summary-value">
                    {data.filter(d => isDtcActive(d.dtc_code)).length}
                  </span>
                  <span className="summary-label">Currently Active</span>
                </div>
              </div>

              {/* DTC Table */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>DTC Code</th>
                      <th>Description</th>
                      <th>Severity</th>
                      <th>Date Detected</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, i) => {
                      const severity = getSeverityColor(item.dtc_code);
                      const severityBadgeClass = getSeverityBadgeClass(severity);
                      const severityIcon = getSeverityIcon(severity);
                      const active = isDtcActive(item.dtc_code);
                      const status = getStatusBadge(item.dtc_code);
                      
                      return (
                        <tr key={i} className={!active ? 'resolved-row' : ''}>
                          <td>
                            <span
                              className="dtc-code-badge"
                              style={{
                                borderLeft: `4px solid ${active ? '#d32f2f' : '#9e9e9e'}`,
                                background: active ? '#ffebee' : '#f5f5f5',
                                opacity: active ? 1 : 0.8
                              }}
                            >
                              {item.dtc_code}
                            </span>
                          </td>
                          <td className="description-cell">
                            <div className="description-content">
                              <strong>{item.description || "No description available"}</strong>
                              {item.additional_info && (
                                <small className="additional-info">{item.additional_info}</small>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`severity-badge ${severityBadgeClass}`}>
                              {severityIcon} {severity.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div className="date-cell">
                              <div className="date">{formatDate(item.created_at)}</div>
                              <div className="time-ago">
                                {Math.floor((new Date() - new Date(item.created_at)) / (1000 * 60 * 60 * 24))} days ago
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${status.class}`}>
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="legend" style={{ marginTop: '2rem' }}>
                <div className="legend-item">
                  <span className="status-badge active" style={{ padding: '0.25rem 0.75rem' }}>ACTIVE</span>
                  <span>Currently active DTC code</span>
                </div>
                <div className="legend-item">
                  <span className="status-badge resolved" style={{ padding: '0.25rem 0.75rem' }}>RESOLVED</span>
                  <span>Previously occurred, now resolved</span>
                </div>
              </div>

              {/* Pagination (if needed) */}
              {data.length > 10 && (
                <div className="pagination">
                  <button className="btn btn-secondary">← Previous</button>
                  <span className="page-info">Page 1 of {Math.ceil(data.length / 10)}</span>
                  <button className="btn btn-secondary">Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default DTCHistoryScreen;
