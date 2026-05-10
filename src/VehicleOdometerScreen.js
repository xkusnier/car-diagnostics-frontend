import React, { useEffect, useState } from "react";
import { api } from "./api";
import "./styles/global.css";
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

// Obrazovka zobrazuje a upravuje stav kilometrov pre vozidlo.
function VehicleOdometerScreen({ vin, vehicleInfo, onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  // Formular drzi editovatelne hodnoty oddelene od odpovede backendu.
  const [form, setForm] = useState({
    odometer: "",
    odometer_source: "rpi",
  });

  // Nacitanie doplni aktualny stav kilometrov a metadata vozidla.
  const fetchOdometer = async () => {
    try {
      setLoading(true);
      // Token sa nastavi pred volanim chraneneho endpointu.
      const token = localStorage.getItem("token");
      if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }

      // Backend vracia posledny znamy odometer pre dane VIN.
      const res = await api.get(`/api/vehicle/${vin}/odometer`);

      // Formular sa predvyplni hodnotami zo servera.
      setForm({
        odometer:
          res.data?.odometer !== null && res.data?.odometer !== undefined
            ? String(res.data.odometer)
            : "",
        odometer_source: res.data?.odometer_source || "rpi",
      });

      setError(null);
    } catch (err) {
      console.error("Error fetching odometer:", err);
      setError(err.response?.data?.error || "Failed to load odometer data.");
    } finally {
      setLoading(false);
    }
  };

  // Pri zmene VIN sa nacita iny odometer.
  useEffect(() => {
    if (vin) {
      fetchOdometer();
    }
  }, [vin]);

  // Helper meni jedno pole formulara bez prepisania ostatnych.
  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Ulozenie validuje vstup a posiela novu hodnotu na backend.
  const handleSave = async () => {
    setSaving(true);
    setStatusMessage("");
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }

      // Payload sa sklada z aktualnych hodnot formulara.
      const payload = {
        odometer_source: form.odometer_source,
      };

      // Pri manualnom zdroji musi byt vyplnena aj konkretna hodnota kilometrov.
      if (form.odometer_source === "manual") {
        if (form.odometer === "" || form.odometer === null) {
          setError("Please enter the odometer value.");
          setSaving(false);
          return;
        }

        const parsed = Number(form.odometer);

        if (Number.isNaN(parsed) || parsed < 0) {
          setError("Odometer must be a valid non-negative number.");
          setSaving(false);
          return;
        }

        payload.odometer = parsed;
      }

      // PUT poziadavka prepise aktualny odometer vozidla.
      await api.put(`/api/vehicle/${vin}/odometer`, payload);

      setStatusMessage("Odometer settings saved successfully.");
      await fetchOdometer();

      setTimeout(() => {
        setStatusMessage("");
      }, 3000);
    } catch (err) {
      console.error("Error saving odometer:", err);
      setError(err.response?.data?.error || "Failed to save odometer settings.");
    } finally {
      setSaving(false);
    }
  };

  // Pri prvom nacitani sa ukaze loading stav.
  if (loading) {
    return (
      <div className="devices-container">
        <div className="loading-center">
          <div className="spinner-large"></div>
          <p>Loading odometer settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="devices-container">
      <div className="screen-topbar">
        <button className="back-button-unified" onClick={onBack} type="button">
          ← Back
        </button>
      </div>

      <div className="devices-header">
        <div className="header-content">
          <h1>Vehicle Odometer</h1>
          <p className="subtitle">
            {vehicleInfo?.brand || "Unknown"} {vehicleInfo?.model || ""} · {vin}
          </p>
        </div>

        <div className="device-status">
          <span
            className={`status-indicator ${
              form.odometer_source === "manual" ? "offline" : "online"
            }`}
          ></span>
          {form.odometer_source === "manual" ? "Manual Odometer" : "RPi Odometer"}
        </div>
      </div>

      <div
        className="status-message info"
        style={{ marginBottom: "1.5rem", alignItems: "flex-start" }}
      >
        <InformationCircleIcon
          style={{
            width: "1.1rem",
            height: "1.1rem",
            marginTop: "0.1rem",
            flexShrink: 0,
          }}
        />
        <div>
          Use <strong>RPi</strong> when odometer is available directly from the
          diagnostic device. Use <strong>manual</strong> when the vehicle does not
          provide odometer data through RPi. For manual mode, completed trip
          distance will be estimated from average speed and trip duration and then
          added to the odometer automatically.
        </div>
      </div>

      {statusMessage && (
        <div className="status-message success">
          <CheckCircleIcon
            style={{ width: "1.1rem", height: "1.1rem", flexShrink: 0 }}
          />
          <div>{statusMessage}</div>
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

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="section-header">
          <h2
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <PencilSquareIcon style={{ width: "1.25rem", height: "1.25rem" }} />
            Odometer Settings
          </h2>
        </div>

        <div className="form-grid" style={{ marginTop: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Odometer Source</label>
            <select
              className="form-input"
              value={form.odometer_source}
              onChange={(e) => handleChange("odometer_source", e.target.value)}
              disabled={saving}
            >
              <option value="rpi">RPi</option>
              <option value="manual">Manual</option>
            </select>
            <small className="input-hint">
              Select how this vehicle should determine its odometer value.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Odometer Value (km)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.1"
              value={form.odometer}
              onChange={(e) => handleChange("odometer", e.target.value)}
              disabled={saving || form.odometer_source !== "manual"}
              placeholder={
                form.odometer_source === "manual"
                  ? "Enter current odometer"
                  : "Managed by RPi"
              }
            />
            <small className="input-hint">
              {form.odometer_source === "manual"
                ? "Enter the current vehicle odometer in kilometers."
                : "When RPi mode is selected, the odometer is controlled by telemetry data from the device."}
            </small>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={onBack}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-small"></span>
                Saving...
              </>
            ) : (
              "Save Odometer"
            )}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h2>Current Summary</h2>
        </div>

        <div className="stats-bar" style={{ marginTop: "1rem", marginBottom: 0 }}>
          <div className="stat-item">
            <span className="stat-number">
              {form.odometer_source === "manual" ? "Manual" : "RPi"}
            </span>
            <span className="stat-label">Current Source</span>
          </div>

          <div className="stat-item">
            <span className="stat-number">
              {form.odometer !== "" && form.odometer !== null
                ? `${Number(form.odometer).toFixed(1)} km`
                : "—"}
            </span>
            <span className="stat-label">Current Odometer</span>
          </div>

          <div className="stat-item stat-item-vin">
            <span className="stat-number stat-number-vin">{vin}</span>
            <span className="stat-label">VIN</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VehicleOdometerScreen;
