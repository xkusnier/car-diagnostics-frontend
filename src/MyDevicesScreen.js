import React, { useEffect, useState } from "react";
import { api } from "./api";
import "./styles/global.css";
import "./MyDevicesScreen.css";

function MyDevicesScreen({ onBack, onDiagnostics, role }) {
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    filterDevices();
  }, [devices, searchTerm, statusFilter]);

  const fetchDevices = async () => {
    try {
      const res = await api.get("/api/my-devices");
      setDevices(res.data.devices || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  const filterDevices = () => {
    let filtered = [...devices];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(device =>
        device.device_id.toString().includes(searchTerm) ||
        (device.vin && device.vin.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(device => 
        device.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    setFilteredDevices(filtered);
  };

  const handleAddDevice = async () => {
    if (!newDeviceId) {
      alert("Please enter a Device ID");
      return;
    }

    const payload = role === "admin"
      ? { device_id: newDeviceId, user_id: assignUserId || null }
      : { device_id: newDeviceId };

    try {
      const res = await api.post("/api/add-device", payload);
      
      alert("Device added successfully!");
      setNewDeviceId("");
      setAssignUserId("");
      setShowAddForm(false);
      
      // Refresh device list
      await fetchDevices();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add device");
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchDevices();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'online': return 'success';
      case 'offline': return 'danger';
      case 'error': return 'warning';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="devices-container">
        <div className="loading-center">
          <div className="spinner-large"></div>
          <p>Loading devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="devices-container">
      {/* Header */}
      <div className="devices-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1>{role === "admin" ? "Device Management" : "My Devices"}</h1>
          <p className="subtitle">
            {role === "admin" 
              ? "Manage all devices in the system" 
              : "View and manage your connected devices"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleRefresh}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">{devices.length}</span>
          <span className="stat-label">Total Devices</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">
            {devices.filter(d => d.status === "Online").length}
          </span>
          <span className="stat-label">Online</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">
            {devices.filter(d => d.status === "Offline").length}
          </span>
          <span className="stat-label">Offline</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="control-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search devices by ID or VIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filters">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
            <option value="error">Error</option>
          </select>

          <button
            className={`btn ${showAddForm ? 'btn-secondary' : 'btn-success'}`}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : '➕ Add Device'}
          </button>
        </div>
      </div>

      {/* Add Device Form */}
      {showAddForm && (
        <div className="add-device-form card">
          <h3>Add New Device</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Device ID *</label>
              <input
                type="number"
                placeholder="Enter device ID"
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                className="input"
              />
            </div>

            {role === "admin" && (
              <div className="form-group">
                <label>Assign to User ID (optional)</label>
                <input
                  type="number"
                  placeholder="Enter user ID"
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="input"
                />
              </div>
            )}

            <div className="form-group">
              <button
                className="btn btn-primary"
                onClick={handleAddDevice}
                disabled={!newDeviceId}
              >
                Add Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message card">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Devices Table */}
      <div className="devices-table-container card">
        <div className="table-header">
          <h3>Devices ({filteredDevices.length})</h3>
          <span className="table-info">
            Showing {filteredDevices.length} of {devices.length} devices
          </span>
        </div>

        {filteredDevices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📱</div>
            <h3>No Devices Found</h3>
            <p>
              {searchTerm || statusFilter !== "all" 
                ? "Try changing your search or filter criteria"
                : "No devices are currently registered to your account"}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="devices-table">
              <thead>
                <tr>
                  <th>Device ID</th>
                  {role === "admin" && <th>User ID</th>}
                  <th>VIN</th>
                  <th>Status</th>
                  <th>Last Seen</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device, index) => (
                  <tr key={index} className="device-row">
                    <td>
                      <div className="device-id-cell">
                        <span className="device-icon">📱</span>
                        <span className="device-id">#{device.device_id}</span>
                      </div>
                    </td>
                    
                    {role === "admin" && (
                      <td>
                        {device.user_id ? (
                          <span className="user-id-badge">{device.user_id}</span>
                        ) : (
                          <span className="unassigned">Unassigned</span>
                        )}
                      </td>
                    )}
                    
                    <td>
                      {device.vin ? (
                        <code className="vin-code">{device.vin}</code>
                      ) : (
                        <span className="no-vin">Not linked</span>
                      )}
                    </td>
                    
                    <td>
                      <span className={`status-badge ${getStatusColor(device.status)}`}>
                        <span className="status-dot"></span>
                        {device.status}
                      </span>
                    </td>
                    
                    <td>
                      <div className="last-seen">
                        {device.last_seen 
                          ? new Date(device.last_seen).toLocaleDateString()
                          : 'Never'}
                      </div>
                    </td>
                    
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-action diagnostics"
                          onClick={() => onDiagnostics(device.device_id)}
                          title="View Diagnostics"
                        >
                          🔧 Diagnostics
                        </button>
                        
                        <button
                          className="btn-action details"
                          onClick={() => alert(`Details for device ${device.device_id}`)}
                          title="View Details"
                        >
                          ℹ️ Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="quick-tips card">
        <h4>💡 Quick Tips</h4>
        <ul>
          <li>Click on "Diagnostics" to view and manage DTC codes for a device</li>
          <li>Use the search box to quickly find specific devices</li>
          <li>Only online devices can execute diagnostics commands</li>
          {role === "admin" && <li>As an admin, you can assign devices to any user</li>}
        </ul>
      </div>
    </div>
  );
}

export default MyDevicesScreen;
