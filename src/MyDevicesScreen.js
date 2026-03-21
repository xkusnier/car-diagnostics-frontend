import React, { useEffect, useState } from "react";
import { api } from "./api";
import "./styles/global.css";
import {
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
  PlusIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  TrashIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

function MyDevicesScreen({ onBack, onDiagnostics, onLiveData, role }) {
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchDevices();

    const interval = setInterval(() => {
      fetchDevices();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setFilteredDevices(devices);
  }, [devices]);

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

  const handleAddDevice = async () => {
    if (!newDeviceId) {
      alert("Please enter a Device ID");
      return;
    }

    const payload =
      role === "admin"
        ? { device_id: newDeviceId, user_id: assignUserId || null }
        : { device_id: newDeviceId };

    try {
      await api.post("/api/add-device", payload);

      alert(
        "Device added successfully. VIN information will appear automatically after the device is connected to a vehicle."
      );
      setNewDeviceId("");
      setAssignUserId("");
      setShowAddForm(false);

      await fetchDevices();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add device");
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    setDeletingId(deviceId);
    try {
      await api.delete(`/api/device/${deviceId}`);
      alert("Device deleted successfully!");
      await fetchDevices();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete device");
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "online":
        return "success";
      case "offline":
        return "danger";
      case "error":
        return "warning";
      default:
        return "secondary";
    }
  };

  const DeleteConfirmDialog = ({ deviceId, onConfirm, onCancel }) => (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Delete Device</h3>
        <p>
          Are you sure you want to delete device <strong>#{deviceId}</strong>?
        </p>
        <p className="warning-text">
          This action cannot be undone. All device data including telemetry and
          DTC history will be permanently removed.
        </p>
        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={deletingId === deviceId}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={() => onConfirm(deviceId)}
            disabled={deletingId === deviceId}
          >
            {deletingId === deviceId ? "Deleting..." : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );

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
      <div className="devices-header">
        <div className="header-content">
          <h1>{role === "admin" ? "Device Management" : "My Devices"}</h1>
          <p className="subtitle">
            Add and manage your Raspberry Pi diagnostic devices. Vehicle VIN
            details are assigned automatically after the device is physically
            connected to a car.
          </p>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">{devices.length}</span>
          <span className="stat-label">Total Devices</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">
            {devices.filter((d) => d.status === "Online").length}
          </span>
          <span className="stat-label">Online</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">
            {devices.filter((d) => d.status === "Offline").length}
          </span>
          <span className="stat-label">Offline</span>
        </div>
      </div>

      <div className="control-bar" style={{ justifyContent: "flex-end" }}>
        <div className="filters">
          <button
            className={`btn ${showAddForm ? "btn-secondary" : "btn-success"}`}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? (
              "Cancel"
            ) : (
              <>
                <PlusIcon style={{ width: "1rem", height: "1rem" }} />
                Add Device
              </>
            )}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="add-device-form card">
          <h3>Add New Device</h3>
          <p className="input-hint" style={{ marginBottom: "1rem" }}>
            The Device ID is printed on the physical Raspberry Pi diagnostic
            unit. After the device is connected to a vehicle, the VIN will
            appear automatically.
          </p>

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
              <small className="input-hint">
                Use the Device ID printed on the physical device.
              </small>
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
                <small className="input-hint">
                  Leave empty to add the device without assigning it to a user.
                </small>
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

      {error && (
        <div className="error-message card">
          <ExclamationTriangleIcon
            className="error-icon"
            style={{ width: "1.5rem", height: "1.5rem" }}
          />
          <p>{error}</p>
        </div>
      )}

      <div className="devices-table-container card">
        <div className="table-header">
          <h3>Devices ({filteredDevices.length})</h3>
          <span className="table-info">
            Diagnostics and live telemetry are available when the device is
            linked to a vehicle.
          </span>
        </div>

        {filteredDevices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <DevicePhoneMobileIcon
                style={{ width: "3rem", height: "3rem", margin: "0 auto" }}
              />
            </div>
            <h3>No Devices Found</h3>
            <p>
              No devices are currently registered to your account. Add your
              Raspberry Pi diagnostic device using the Device ID printed on the
              physical unit.
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
                        <DevicePhoneMobileIcon
                          className="device-icon"
                          style={{ width: "1.25rem", height: "1.25rem" }}
                        />
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
                        <div className="last-seen">
                          <span className="no-vin">Not linked yet</span>
                          <small className="additional-info">
                            VIN will appear after the device is connected to a
                            vehicle.
                          </small>
                        </div>
                      )}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${getStatusColor(device.status)}`}
                      >
                        <span className="status-dot"></span>
                        {device.status}
                      </span>
                    </td>

                    <td>
                      <div className="last-seen">
                        {device.last_seen
                          ? new Date(device.last_seen).toLocaleDateString()
                          : "Never"}
                      </div>
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-action diagnostics"
                          onClick={() => onDiagnostics(device.device_id)}
                          title="View Diagnostics"
                          disabled={deletingId === device.device_id}
                        >
                          <WrenchScrewdriverIcon
                            style={{ width: "1rem", height: "1rem" }}
                          />
                          Diagnostics
                        </button>

                        <button
                          className="btn-action live-data"
                          onClick={() => onLiveData(device.device_id, device)}
                          title="View Live Data"
                          disabled={deletingId === device.device_id}
                        >
                          <ChartBarIcon
                            style={{ width: "1rem", height: "1rem" }}
                          />
                          Live Data
                        </button>

                        <button
                          className="btn-action delete"
                          onClick={() => setShowDeleteConfirm(device.device_id)}
                          title="Delete Device"
                          disabled={deletingId === device.device_id}
                        >
                          <TrashIcon style={{ width: "1rem", height: "1rem" }} />
                          Delete
                        </button>
                      </div>

                      {!device.vin && (
                        <div
                          className="input-hint"
                          style={{ marginTop: "0.5rem", maxWidth: "260px" }}
                        >
                          Connect this device to a vehicle to assign VIN details
                          automatically.
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmDialog
          deviceId={showDeleteConfirm}
          onConfirm={handleDeleteDevice}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

export default MyDevicesScreen;
