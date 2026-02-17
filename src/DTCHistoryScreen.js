import React, { useState } from "react";
import { api } from "./api";
import "./styles/global.css";

function DTCHistoryScreen({ onBack }) {
  const [vin, setVin] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    severity: "all"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    
    try {
      const payload = { vin };
      if (filters.dateFrom) payload.date_from = filters.dateFrom;
      if (filters.dateTo) payload.date_to = filters.dateTo;
      if (filters.severity !== "all") payload.severity = filters.severity;
      
      const res = await api.post("/api/dtc-history-full", payload);
      setData(res.data.history);
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

  const formatDate = (dateString) => {
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
                      return (
                        <tr key={i}>
                          <td>
                            <span className={`dtc-code ${severity}`}>
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
                            <span className={`severity-badge ${severity}`}>
                              {severity.toUpperCase()}
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
                            <span className="status-badge resolved">
                              {item.resolved ? 'Resolved' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
