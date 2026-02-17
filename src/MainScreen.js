import React, { useState, useEffect } from "react";
import "./styles/global.css";
import { api } from "./api";

function MainScreen({ onNavigate, user }) {
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    activeDTCs: 0,
    recentIssues: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Skontroluj, či máme token
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login first");
        setLoading(false);
        return;
      }

      // Pridaj Authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      const devicesRes = await api.get("/api/my-devices");
      const devices = devicesRes.data.devices || [];
      
      setStats({
        totalDevices: devices.length,
        onlineDevices: devices.filter(d => d.status === "Online").length,
        activeDTCs: 0,
        recentIssues: 0
      });


      
      setError(null);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load devices. Please try again.");
      
      // Fallback: demo data ak API zlyhá
      setStats({
        totalDevices: 3,
        onlineDevices: 2,
        activeDTCs: 1,
        recentIssues: 0
      });
      
      setRecentActivity([
        { id: 1, device: "Demo Device #1001", action: "Device Connected", time: "Just now", status: "success" },
        { id: 2, device: "Demo Device #1002", action: "System Check", time: "5 min ago", status: "info" },
        { id: 3, device: "Demo Device #1003", action: "Offline", time: "1 hour ago", status: "warning" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { icon: "🔍", label: "Device Diagnostics", action: () => onNavigate('my-devices') },
    { icon: "📋", label: "DTC History", action: () => onNavigate('dtc-history') },
    { icon: "➕", label: "Add Device", action: () => onNavigate('add-device') },
    { icon: "⚙️", label: "Settings", action: () => alert("Settings coming soon!") },
  ];

  if (loading) {
    return (
      <div className="main-screen">
        <div className="loading-center">
          <div className="spinner-large"></div>
          <p>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-screen">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">Car Diagnostics Dashboard</h1>
          <p className="dashboard-subtitle">Welcome back, {user?.email || "User"}!</p>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-avatar">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </span>
            <div className="user-details">
              <span className="user-name">{user?.email || "User"}</span>
              <span className="user-role">{user?.role || "User"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="error-card" style={{ marginBottom: '2rem' }}>
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            📊
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{stats.totalDevices}</h3>
            <p className="stat-label">Total Devices</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
            ✅
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{stats.onlineDevices}</h3>
            <p className="stat-label">Online Now</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)' }}>
            ⚠️
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{stats.activeDTCs}</h3>
            <p className="stat-label">Active DTCs</p>
          </div>
        </div>
      </div>


      {/* Footer */}
      <footer className="dashboard-footer">
        <p>Car Diagnostics {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default MainScreen;
