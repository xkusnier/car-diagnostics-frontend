import React, { useState, useEffect } from "react";
import ".styles/global.css"; // OPRAVENÉ: odstrániť "styles/"
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

      // Simulácia recent activity
      setRecentActivity([
        { id: 1, device: "Device #1234", action: "DTC Cleared", time: "5 min ago", status: "success" },
        { id: 2, device: "Device #5678", action: "New DTC Detected", time: "1 hour ago", status: "warning" },
        { id: 3, device: "Device #9012", action: "Device Connected", time: "2 hours ago", status: "info" },
      ]);
      
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
      <div style={styles.container}>
        <div style={styles.loadingCenter}>
          <div style={styles.spinnerLarge}></div>
          <p>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.dashboardHeader}>
        <div style={styles.headerLeft}>
          <h1 style={styles.dashboardTitle}>Car Diagnostics Dashboard</h1>
          <p style={styles.dashboardSubtitle}>Welcome back, {user?.email || "User"}!</p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <span style={styles.userAvatar}>
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </span>
            <div style={styles.userDetails}>
              <span style={styles.userName}>{user?.email || "User"}</span>
              <span style={styles.userRole}>{user?.role || "User"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div style={styles.errorCard}>
          <span style={styles.errorIcon}>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
            📊
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{stats.totalDevices}</h3>
            <p style={styles.statLabel}>Total Devices</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'}}>
            ✅
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{stats.onlineDevices}</h3>
            <p style={styles.statLabel}>Online Now</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)'}}>
            ⚠️
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{stats.activeDTCs}</h3>
            <p style={styles.statLabel}>Active DTCs</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
            🔔
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statValue}>{stats.recentIssues}</h3>
            <p style={styles.statLabel}>Recent Issues</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActionsSection}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <button
              key={index}
              style={styles.quickActionCard}
              onClick={action.action}
            >
              <span style={styles.actionIcon}>{action.icon}</span>
              <span style={styles.actionLabel}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={styles.recentActivitySection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Recent Activity</h2>
          <button style={styles.btnSecondary}>View All</button>
        </div>
        <div style={styles.activityList}>
          {recentActivity.map((activity) => (
            <div key={activity.id} style={styles.activityItem}>
              <div style={styles.activityIcon}>
                {activity.status === 'success' && '✅'}
                {activity.status === 'warning' && '⚠️'}
                {activity.status === 'info' && 'ℹ️'}
              </div>
              <div style={styles.activityContent}>
                <div style={styles.activityMain}>
                  <strong>{activity.device}</strong>
                  <span>{activity.action}</span>
                </div>
                <div style={styles.activityTime}>{activity.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.dashboardFooter}>
        <p>Car Diagnostics System • v1.0.0 • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}



export default MainScreen;
