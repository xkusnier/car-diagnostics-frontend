import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import "./styles/global.css";

function LiveDataScreen({ deviceId, onBack, deviceInfo }) {
  const [live, setLive] = useState({
    odometer: null,
    battery: null,
    engine: null,
    fuel: null,
    speed: null,
    updatedAt: null,
    error: null,
  });
  
  const [wsStatus, setWsStatus] = useState({
    connected: false,
    error: null,
  });

  const [deviceDetails, setDeviceDetails] = useState(deviceInfo || null);
  const socketRef = useRef(null);

  // Fetch device info if not provided
  useEffect(() => {
    if (!deviceDetails && deviceId) {
      fetchDeviceInfo();
    }
  }, [deviceId]);

  const fetchDeviceInfo = async () => {
    try {
      const res = await api.get(`/api/device/${deviceId}/diagnostics`);
      setDeviceDetails(res.data);
    } catch (err) {
      console.error("Error fetching device info:", err);
    }
  };

  // Fetch initial snapshots
  const fetchLiveSnapshots = async () => {
    try {
      const [odo, batt, eng, fuelRes, spd] = await Promise.allSettled([
        api.get(`/api/device/${deviceId}/odometer`),
        api.get(`/api/device/${deviceId}/battery`),
        api.get(`/api/device/${deviceId}/engine`),
        api.get(`/api/device/${deviceId}/fuel`),
        api.get(`/api/device/${deviceId}/speed`),
      ]);

      setLive((prev) => {
        const next = { ...prev, error: null };

        if (odo.status === "fulfilled") next.odometer = odo.value.data;
        if (batt.status === "fulfilled") next.battery = batt.value.data;
        if (eng.status === "fulfilled") next.engine = eng.value.data;
        if (fuelRes.status === "fulfilled") next.fuel = fuelRes.value.data;
        if (spd.status === "fulfilled") next.speed = spd.value.data;

        const ts = [
          next.odometer?.timestamp,
          next.battery?.timestamp,
          next.engine?.timestamp,
          next.fuel?.timestamp,
          next.speed?.timestamp,
        ]
          .filter(Boolean)
          .sort()
          .slice(-1)[0];

        next.updatedAt = ts || next.updatedAt || null;

        const allFailed =
          odo.status === "rejected" &&
          batt.status === "rejected" &&
          eng.status === "rejected" &&
          fuelRes.status === "rejected" &&
          spd.status === "rejected";

        if (allFailed) {
          const msg =
            odo.reason?.response?.data?.error ||
            batt.reason?.response?.data?.error ||
            eng.reason?.response?.data?.error ||
            fuelRes.reason?.response?.data?.error ||
            spd.reason?.response?.data?.error ||
            "No snapshot data available";
          next.error = msg;
        }

        return next;
      });
    } catch (e) {
      setLive((prev) => ({
        ...prev,
        error: e.response?.data?.error || "Error fetching snapshot data",
      }));
    }
  };

  // WebSocket connection
  useEffect(() => {
    fetchLiveSnapshots();

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const wsUrl =
      process.env.REACT_APP_WS_URL ||
      process.env.REACT_APP_API_URL ||
      "https://car-diagnostics.onrender.com";

    const token = localStorage.getItem("token") || localStorage.getItem("access_token");

    const socket = io(wsUrl, {
      transports: ["websocket"],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    });

    socketRef.current = socket;

    const onConnect = () => {
      setWsStatus({ connected: true, error: null });
      socket.emit("subscribe_device", { device_id: deviceId });
      fetchLiveSnapshots();
    };

    const onDisconnect = () => {
      setWsStatus((prev) => ({ ...prev, connected: false }));
    };

    const onConnectError = (err) => {
      setWsStatus({ connected: false, error: err?.message || "WebSocket connection error" });
    };

    const onTelemetry = (payload) => {
      if (!payload || Number(payload.device_id) !== Number(deviceId)) return;

      setLive((prev) => ({
        ...prev,
        odometer:
          payload.odometer != null
            ? {
                status: "success",
                device_id: payload.device_id,
                odometer: payload.odometer,
                timestamp: payload.timestamp,
              }
            : prev.odometer,
        battery:
          payload.battery != null
            ? {
                status: "success",
                device_id: payload.device_id,
                battery_voltage: payload.battery.battery_voltage,
                health: payload.battery.health,
                timestamp: payload.timestamp,
              }
            : prev.battery,
        engine:
          payload.engine != null
            ? {
                status: "success",
                device_id: payload.device_id,
                engine: payload.engine,
                timestamp: payload.timestamp,
              }
            : prev.engine,
        fuel:
          payload.fuel != null
            ? {
                status: "success",
                device_id: payload.device_id,
                fuel: payload.fuel,
                timestamp: payload.timestamp,
              }
            : prev.fuel,
        speed:
          payload.speed != null
            ? {
                status: "success",
                device_id: payload.device_id,
                speed: payload.speed,
                timestamp: payload.timestamp,
              }
            : prev.speed,
        updatedAt: payload.timestamp || new Date().toISOString(),
        error: null,
      }));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("telemetry_update", onTelemetry);
    socket.on("server_ready", () => {});
    socket.on("subscribed", () => {});
    socket.on("error", (e) => {
      setWsStatus({ connected: false, error: e?.error || "WebSocket error" });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [deviceId]);

  const formatNumber = (num, decimals = 1) => {
    if (num === null || num === undefined) return '—';
    return num.toFixed(decimals);
  };

  const getBatteryColor = (voltage) => {
    if (!voltage) return '#999';
    if (voltage < 11.8) return '#f44336';
    if (voltage < 12.2) return '#ff9800';
    return '#4caf50';
  };

  const getEngineStatusIcon = (running) => {
    if (running === null || running === undefined) return '⚫';
    return running ? '🟢' : '🔴';
  };

  if (!deviceId) {
    return (
      <div className="devices-container">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h3>No Device Selected</h3>
            <p>Please select a device to view live data.</p>
            <button className="btn btn-secondary" onClick={onBack}>
              ← Back to Devices
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="devices-container">
      {/* Header */}
      <div className="devices-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Devices
        </button>

        <div className="header-content">
          <h1>Live Data Stream</h1>
          <p className="subtitle">
            Real-time telemetry for device #{deviceId}
            {deviceDetails?.vin && ` • ${deviceDetails.brand || ''} ${deviceDetails.model || ''} • ${deviceDetails.vin}`}
          </p>
        </div>

        <div className="device-status">
          <span className={`status-indicator ${wsStatus.connected ? "online" : "offline"}`}></span>
          {wsStatus.connected ? "Live Stream Active" : "Disconnected"}
        </div>
      </div>

      {/* Connection Status */}
      {wsStatus.error && (
        <div className="error-message" style={{ marginBottom: "2rem" }}>
          ⚠️ WebSocket Error: {wsStatus.error}
        </div>
      )}

      {/* Live Data Grid */}
      <div className="live-data-grid" style={{ marginBottom: "2rem" }}>
        {/* Odometer */}
        <div className="live-data-card">
          <div className="live-data-header">
            <span className="live-data-icon">📊</span>
            <h3>Odometer</h3>
          </div>
          <div className="live-data-value">
            {live.odometer?.odometer != null ? (
              <>
                <span className="value">{live.odometer.odometer.toLocaleString()}</span>
                <span className="unit">km</span>
              </>
            ) : (
              <span className="value no-data">No data</span>
            )}
          </div>
          {live.odometer?.timestamp && (
            <div className="live-data-timestamp">
              {new Date(live.odometer.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Speed */}
        <div className="live-data-card">
          <div className="live-data-header">
            <span className="live-data-icon">🚗</span>
            <h3>Speed</h3>
          </div>
          <div className="live-data-value">
            {live.speed?.speed != null ? (
              <>
                <span className="value">{live.speed.speed}</span>
                <span className="unit">km/h</span>
              </>
            ) : (
              <span className="value no-data">No data</span>
            )}
          </div>
          {live.speed?.timestamp && (
            <div className="live-data-timestamp">
              {new Date(live.speed.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Battery */}
        <div className="live-data-card">
          <div className="live-data-header">
            <span className="live-data-icon">🔋</span>
            <h3>Battery</h3>
          </div>
          <div className="live-data-value">
            {live.battery?.battery_voltage != null ? (
              <>
                <span 
                  className="value" 
                  style={{ color: getBatteryColor(live.battery.battery_voltage) }}
                >
                  {formatNumber(live.battery.battery_voltage, 2)}
                </span>
                <span className="unit">V</span>
              </>
            ) : (
              <span className="value no-data">No data</span>
            )}
          </div>
          {live.battery?.health && (
            <div className="live-data-badge" style={{ 
              background: live.battery.health === 'good' ? '#4caf50' : '#ff9800',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              marginTop: '0.5rem'
            }}>
              {live.battery.health}
            </div>
          )}
        </div>

        {/* Engine RPM */}
        <div className="live-data-card">
          <div className="live-data-header">
            <span className="live-data-icon">⚙️</span>
            <h3>Engine RPM</h3>
          </div>
          <div className="live-data-value">
            {live.engine?.engine?.rpm != null ? (
              <>
                <span className="value">{live.engine.engine.rpm}</span>
                <span className="unit">rpm</span>
              </>
            ) : (
              <span className="value no-data">No data</span>
            )}
          </div>
          <div className="engine-status" style={{ marginTop: '0.5rem' }}>
            {getEngineStatusIcon(live.engine?.engine?.running)} 
            {live.engine?.engine?.running === true ? ' Engine On' : 
             live.engine?.engine?.running === false ? ' Engine Off' : ''}
          </div>
        </div>

        {/* Engine Load */}
        <div className="live-data-card">
          <div className="live-data-header">
            <span className="live-data-icon">📈</span>
            <h3>Engine Load</h3>
          </div>
          <div className="live-data-value">
            {live.engine?.engine?.load != null ? (
              <>
                <span className="value">{formatNumber(live.engine.engine.load)}</span>
                <span className="unit">%</span>
              </>
            ) : (
              <span className="value no-data">No data</span>
            )}
          </div>
        </div>

        {/* Coolant Temp */}
        <div className="live-data-card">
          <div className="live-data-header">
            <span className="live-data-icon">🌡️</span>
            <h3>Coolant Temp</h3>
          </div>
          <div className="live-data-value">
            {live.engine?.engine?.coolant_temp != null ? (
              <>
                <span className="value">{live.engine.engine.coolant_temp}</span>
                <span className="unit">°C</span>
              </>
            ) : (
              <span className="value no-data">No data</span>
            )}
          </div>
        </div>

        {/* Oil Temp */}
        <div className="live-data-card">
          <div className="live-data-header">
            <span className="live-data-icon">🛢️</span>
            <h3>Oil Temp</h3>
          </div>
          <div className="live-data-value">
            {live.engine?.engine?.oil_temp != null ? (
              <>
                <span className="value">{live.engine.engine.oil_temp}</span>
                <span className="unit">°C</span>
              </>
            ) : (
              <span className="value no-data">No data</span>
            )}
          </div>
        </div>

        {/* Intake Air Temp */}
        <div className="live-data-card">
          <div className="live-data-header">
            <span className="live-data-icon">💨</span>
            <h3>Intake Air</h3>
          </div>
          <div className="live-data-value">
            {live.engine?.engine?.intake_air_temp != null ? (
              <>
                <span className="value">{live.engine.engine.intake_air_temp}</span>
                <span className="unit">°C</span>
              </>
            ) : (
              <span className="value no-data">No data</span>
            )}
          </div>
        </div>

        {/* Fuel Consumption (L/h) */}
        <div className="live-data-card">
          <div className="live-data-header">
            <span className="live-data-icon">⛽</span>
            <h3>Fuel (L/h)</h3>
          </div>
          <div className="live-data-value">
            {live.fuel?.fuel?.consumption_lh != null ? (
              <>
                <span className="value">{formatNumber(live.fuel.fuel.consumption_lh)}</span>
                <span className="unit">L/h</span>
              </>
            ) : (
              <span className="value no-data">No data</span>
            )}
          </div>
        </div>

        {/* Fuel Consumption (L/100km) */}
        <div className="live-data-card">
          <div className="live-data-header">
            <span className="live-data-icon">📉</span>
            <h3>Fuel (L/100km)</h3>
          </div>
          <div className="live-data-value">
            {live.fuel?.fuel?.consumption_l100km != null ? (
              <>
                <span className="value">{formatNumber(live.fuel.fuel.consumption_l100km)}</span>
                <span className="unit">L/100km</span>
              </>
            ) : (
              <span className="value no-data">No data</span>
            )}
          </div>
        </div>

        {/* MAF */}
        <div className="live-data-card">
          <div className="live-data-header">
            <span className="live-data-icon">🌪️</span>
            <h3>MAF</h3>
          </div>
          <div className="live-data-value">
            {live.fuel?.fuel?.maf != null ? (
              <>
                <span className="value">{formatNumber(live.fuel.fuel.maf)}</span>
                <span className="unit">g/s</span>
              </>
            ) : (
              <span className="value no-data">No data</span>
            )}
          </div>
        </div>

        {/* Fuel Type */}
        <div className="live-data-card">
          <div className="live-data-header">
            <span className="live-data-icon">🔋</span>
            <h3>Fuel Type</h3>
          </div>
          <div className="live-data-value">
            {live.fuel?.fuel?.type ? (
              <span className="value" style={{ fontSize: '1.2rem' }}>{live.fuel.fuel.type}</span>
            ) : (
              <span className="value no-data">No data</span>
            )}
          </div>
        </div>
      </div>


      {/* Last Updated */}
      {live.updatedAt && (
        <div className="last-updated" style={{ textAlign: 'center', marginTop: '2rem' }}>
          <small>Last updated: {new Date(live.updatedAt).toLocaleString()}</small>
        </div>
      )}
    </div>
  );
}

export default LiveDataScreen;
