import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import "./styles/global.css";
import { io } from "socket.io-client";
import {
  ExclamationTriangleIcon,
  ChartBarIcon,
  TruckIcon,
  Battery100Icon,
  Cog6ToothIcon,
  PresentationChartLineIcon,
  BeakerIcon,
  ArrowsUpDownIcon,
  FireIcon,
  ArrowTrendingDownIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";

function LiveDataScreen({ deviceId, onBack, deviceInfo }) {
  const [live, setLive] = useState({
    data: null,
    updatedAt: null,
    error: null,
  });

  const [wsStatus, setWsStatus] = useState({
    connected: false,
    error: null,
  });

  const [deviceDetails, setDeviceDetails] = useState(deviceInfo || null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!deviceDetails && deviceId) {
      fetchDeviceInfo();
    }
  }, [deviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDeviceInfo = async () => {
    try {
      const res = await api.get(`/api/device/${deviceId}/diagnostics`);
      setDeviceDetails(res.data);
    } catch (err) {
      console.error("Error fetching device info:", err);
    }
  };

  const fetchLiveData = async () => {
    try {
      const response = await api.get(`/api/device/${deviceId}/live`);

      if (response.data.status === "success") {
        setLive({
          data: response.data,
          updatedAt: response.data.timestamp,
          error: null,
        });
      }
    } catch (e) {
      setLive((prev) => ({
        ...prev,
        error: e.response?.data?.error || "Error fetching live data",
      }));
    }
  };

  useEffect(() => {
    fetchLiveData();

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const wsUrl =
      process.env.REACT_APP_WS_URL ||
      process.env.REACT_APP_API_URL ||
      "https://car-diagnostics.onrender.com";

    const token =
      localStorage.getItem("token") || localStorage.getItem("access_token");

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
      fetchLiveData();
    };

    const onDisconnect = () => {
      setWsStatus((prev) => ({ ...prev, connected: false }));
    };

    const onConnectError = (err) => {
      setWsStatus({
        connected: false,
        error: err?.message || "WebSocket connection error",
      });
    };

    const onTelemetry = (payload) => {
      if (!payload || Number(payload.device_id) !== Number(deviceId)) return;

      console.log("Telemetry payload:", payload);

      setLive((prev) => {
        const newData = { ...(prev.data || {}) };

        if (payload.odometer !== undefined) newData.odometer = payload.odometer;
        if (payload.speed !== undefined) newData.speed = payload.speed;

        if (payload.battery) {
          newData.battery = {
            voltage: payload.battery.battery_voltage,
            health: payload.battery.health,
          };
        }

        if (payload.engine) newData.engine = payload.engine;
        if (payload.fuel) newData.fuel = payload.fuel;
        newData.timestamp = payload.timestamp || new Date().toISOString();

        return {
          data: newData,
          updatedAt: payload.timestamp || new Date().toISOString(),
          error: null,
        };
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("telemetry_update", onTelemetry);
    socket.on("server_ready", () => {});
    socket.on("subscribed", () => {});
    socket.on("error", (e) => {
      setWsStatus({
        connected: false,
        error: e?.error || "WebSocket error",
      });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [deviceId]);

  const formatNumber = (num, decimals = 1) => {
    if (num === null || num === undefined) return "—";
    return Number(num).toFixed(decimals);
  };

  const getBatteryColor = (voltage) => {
    if (!voltage) return "#999";
    if (voltage < 11.8) return "#f44336";
    if (voltage < 12.2) return "#ff9800";
    return "#4caf50";
  };

  const getEngineStatusIcon = (running) => {
    if (running === null || running === undefined) return "⚫";
    return running ? "🟢" : "🔴";
  };

  if (!deviceId) {
    return (
      <div className="devices-container">
        <div className="error-card">
          <ExclamationTriangleIcon
            className="error-icon"
            style={{ width: "2rem", height: "2rem" }}
          />
          <div className="error-content">
            <h3>No Device Selected</h3>
            <p>Please select a device to view live data.</p>
          </div>
        </div>
      </div>
    );
  }

  const data = live.data;

  return (
    <div className="devices-container">
      <div className="devices-header">
        <div className="header-content">
          <h1>Live Data Stream</h1>
          <p className="subtitle">
            Real-time telemetry for device #{deviceId}
            {deviceDetails?.vin &&
              ` • ${deviceDetails.brand || ""} ${deviceDetails.model || ""} • ${deviceDetails.vin}`}
          </p>
        </div>

        <div className="device-status">
          <span
            className={`status-indicator ${
              wsStatus.connected ? "online" : "offline"
            }`}
          ></span>
          {wsStatus.connected ? "Live Stream Active" : "Disconnected"}
        </div>
      </div>

      {wsStatus.error && (
        <div className="error-message" style={{ marginBottom: "2rem" }}>
          <ExclamationTriangleIcon
            style={{
              width: "1.25rem",
              height: "1.25rem",
              marginRight: "0.5rem",
              display: "inline-block",
              verticalAlign: "middle",
            }}
          />
          WebSocket Error: {wsStatus.error}
        </div>
      )}

      {live.error && !data && (
        <div className="error-message" style={{ marginBottom: "2rem" }}>
          <ExclamationTriangleIcon
            style={{
              width: "1.25rem",
              height: "1.25rem",
              marginRight: "0.5rem",
              display: "inline-block",
              verticalAlign: "middle",
            }}
          />
          {live.error}
        </div>
      )}

      {data && (
        <div className="live-data-grid" style={{ marginBottom: "2rem" }}>
          <div className="live-data-card">
            <div className="live-data-header">
              <ChartBarIcon
                className="live-data-icon"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <h3>Odometer</h3>
            </div>
            <div className="live-data-value">
              {data.odometer != null ? (
                <>
                  <span className="value">{data.odometer.toLocaleString()}</span>
                  <span className="unit">km</span>
                </>
              ) : (
                <span className="value no-data">No data</span>
              )}
            </div>
          </div>

          <div className="live-data-card">
            <div className="live-data-header">
              <TruckIcon
                className="live-data-icon"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <h3>Speed</h3>
            </div>
            <div className="live-data-value">
              {data.speed != null ? (
                <>
                  <span className="value">{data.speed}</span>
                  <span className="unit">km/h</span>
                </>
              ) : (
                <span className="value no-data">No data</span>
              )}
            </div>
          </div>

          <div className="live-data-card">
            <div className="live-data-header">
              <Battery100Icon
                className="live-data-icon"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <h3>Battery</h3>
            </div>
            <div className="live-data-value">
              {data.battery?.voltage != null ? (
                <>
                  <span
                    className="value"
                    style={{ color: getBatteryColor(data.battery.voltage) }}
                  >
                    {formatNumber(data.battery.voltage, 2)}
                  </span>
                  <span className="unit">V</span>
                </>
              ) : (
                <span className="value no-data">No data</span>
              )}
            </div>
            {data.battery?.health && (
              <div
                className="live-data-badge"
                style={{
                  background:
                    data.battery.health === "good" ? "#4caf50" : "#ff9800",
                  color: "white",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  marginTop: "0.5rem",
                }}
              >
                {data.battery.health}
              </div>
            )}
          </div>

          <div className="live-data-card">
            <div className="live-data-header">
              <Cog6ToothIcon
                className="live-data-icon"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <h3>Engine RPM</h3>
            </div>
            <div className="live-data-value">
              {data.engine?.rpm != null ? (
                <>
                  <span className="value">{data.engine.rpm}</span>
                  <span className="unit">rpm</span>
                </>
              ) : (
                <span className="value no-data">No data</span>
              )}
            </div>
            <div className="engine-status" style={{ marginTop: "0.5rem" }}>
              {getEngineStatusIcon(data.engine?.running)}
              {data.engine?.running === true
                ? " Engine On"
                : data.engine?.running === false
                ? " Engine Off"
                : ""}
            </div>
          </div>

          <div className="live-data-card">
            <div className="live-data-header">
              <PresentationChartLineIcon
                className="live-data-icon"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <h3>Engine Load</h3>
            </div>
            <div className="live-data-value">
              {data.engine?.load != null ? (
                <>
                  <span className="value">
                    {formatNumber(data.engine.load)}
                  </span>
                  <span className="unit">%</span>
                </>
              ) : (
                <span className="value no-data">No data</span>
              )}
            </div>
          </div>

          <div className="live-data-card">
            <div className="live-data-header">
              <BeakerIcon
                className="live-data-icon"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <h3>Coolant Temp</h3>
            </div>
            <div className="live-data-value">
              {data.engine?.coolant_temp != null ? (
                <>
                  <span className="value">{data.engine.coolant_temp}</span>
                  <span className="unit">°C</span>
                </>
              ) : (
                <span className="value no-data">No data</span>
              )}
            </div>
          </div>

          <div className="live-data-card">
            <div className="live-data-header">
              <BeakerIcon
                className="live-data-icon"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <h3>Oil Temp</h3>
            </div>
            <div className="live-data-value">
              {data.engine?.oil_temp != null ? (
                <>
                  <span className="value">{data.engine.oil_temp}</span>
                  <span className="unit">°C</span>
                </>
              ) : (
                <span className="value no-data">No data</span>
              )}
            </div>
          </div>

          <div className="live-data-card">
            <div className="live-data-header">
              <ArrowsUpDownIcon
                className="live-data-icon"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <h3>Intake Air</h3>
            </div>
            <div className="live-data-value">
              {data.engine?.intake_air_temp != null ? (
                <>
                  <span className="value">{data.engine.intake_air_temp}</span>
                  <span className="unit">°C</span>
                </>
              ) : (
                <span className="value no-data">No data</span>
              )}
            </div>
          </div>

          <div className="live-data-card">
            <div className="live-data-header">
              <FireIcon
                className="live-data-icon"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <h3>Fuel (L/h)</h3>
            </div>
            <div className="live-data-value">
              {data.fuel?.consumption_lh != null ? (
                <>
                  <span className="value">
                    {formatNumber(data.fuel.consumption_lh)}
                  </span>
                  <span className="unit">L/h</span>
                </>
              ) : (
                <span className="value no-data">No data</span>
              )}
            </div>
          </div>

          <div className="live-data-card">
            <div className="live-data-header">
              <ArrowTrendingDownIcon
                className="live-data-icon"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <h3>Fuel (L/100km)</h3>
            </div>
            <div className="live-data-value">
              {data.fuel?.consumption_l100km != null ? (
                <>
                  <span className="value">
                    {formatNumber(data.fuel.consumption_l100km)}
                  </span>
                  <span className="unit">L/100km</span>
                </>
              ) : (
                <span className="value no-data">No data</span>
              )}
            </div>
          </div>

          <div className="live-data-card">
            <div className="live-data-header">
              <ArrowsUpDownIcon
                className="live-data-icon"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <h3>MAF</h3>
            </div>
            <div className="live-data-value">
              {data.fuel?.maf != null ? (
                <>
                  <span className="value">{formatNumber(data.fuel.maf)}</span>
                  <span className="unit">g/s</span>
                </>
              ) : (
                <span className="value no-data">No data</span>
              )}
            </div>
          </div>

          <div className="live-data-card">
            <div className="live-data-header">
              <BoltIcon
                className="live-data-icon"
                style={{ width: "1.5rem", height: "1.5rem" }}
              />
              <h3>Fuel Type</h3>
            </div>
            <div className="live-data-value">
              {data.fuel?.type ? (
                <span className="value" style={{ fontSize: "1.2rem" }}>
                  {data.fuel.type}
                </span>
              ) : (
                <span className="value no-data">No data</span>
              )}
            </div>
          </div>
        </div>
      )}

      {live.updatedAt && (
        <div
          className="last-updated"
          style={{ textAlign: "center", marginTop: "2rem" }}
        >
          <small>Last updated: {new Date(live.updatedAt).toLocaleString()}</small>
        </div>
      )}
    </div>
  );
}

export default LiveDataScreen;
