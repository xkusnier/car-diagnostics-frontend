import React, { useState, useEffect } from "react";
import "./styles/global.css";
import "./MainScreen.css";
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Simulate API calls
      const devicesRes = await api.get("/api/my-devices");
      const devices = devicesRes.data.devices || [];
      
      setStats({
        totalDevices: devices.length,
        onlineDevices: devices.filter(d => d.status === "Online").length,
        activeDTCs: 0, // You would fetch this from your API
        recentIssues: 0 // You would fetch this from your API
      });

      setRecentActivity([
        { id: 1, device: "Device #1234", action: "DTC Cleared", time: "5 min ago", status: "success" },
        { id: 2, device: "Device #5678", action: "New DTC Detected", time: "1 hour ago", status: "warning" },
        { id: 3, device: "Device #9012", action: "Device Connected", time: "2 hours ago", status: "info" },
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            🔔
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{stats.recentIssues}</h3>
            <p className="stat-label">Recent Issues</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="quick-action-card"
              onClick={action.action}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-label">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity-section">
        <div className="section-header">
          <h2 className="section-title">Recent Activity</h2>
          <button className="btn btn-secondary btn-sm">View All</button>
        </div>
        <div className="activity-list">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">
                {activity.status === 'success' && '✅'}
                {activity.status === 'warning' && '⚠️'}
                {activity.status === 'info' && 'ℹ️'}
              </div>
              <div className="activity-content">
                <div className="activity-main">
                  <strong>{activity.device}</strong>
                  <span>{activity.action}</span>
                </div>
                <div className="activity-time">{activity.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>Car Diagnostics System • v1.0.0 • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default MainScreen;
