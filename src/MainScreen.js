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

// INLINE STYLES - aby sme sa vyhli chýbajúcim CSS súborom
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '1.5rem'
  },
  loadingCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    gap: '1.5rem'
  },
  spinnerLarge: {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(0, 0, 0, 0.1)',
    borderTop: '4px solid #1a73e8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' }
  },
  dashboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '3rem',
    paddingBottom: '1.5rem',
    borderBottom: '2px solid #e0e0e0'
  },
  headerLeft: {
    flex: 1
  },
  dashboardTitle: {
    fontSize: '2.25rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #1a73e8, #0d47a1)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.25rem'
  },
  dashboardSubtitle: {
    color: '#5f6368',
    fontSize: '1.125rem'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #1a73e8, #0d47a1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '1.125rem'
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  userName: {
    fontWeight: '600',
    color: '#202124'
  },
  userRole: {
    fontSize: '0.875rem',
    color: '#5f6368',
    textTransform: 'capitalize'
  },
  errorCard: {
    background: '#ffebee',
    borderLeft: '4px solid #d32f2f',
    padding: '1rem',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
    color: '#d32f2f',
    fontWeight: '500'
  },
  errorIcon: {
    fontSize: '1.25rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem'
  },
  statCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    transition: 'all 0.3s ease',
    border: '1px solid #e0e0e0',
    cursor: 'pointer'
  },
  statCardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
  },
  statIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    color: 'white'
  },
  statContent: {
    flex: 1
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#202124',
    marginBottom: '0.25rem'
  },
  statLabel: {
    color: '#5f6368',
    fontSize: '0.875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  quickActionsSection: {
    marginBottom: '3rem'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#202124',
    marginBottom: '1.5rem'
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  quickActionCard: {
    background: '#ffffff',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    borderColor: '#1a73e8',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
  },
  actionIcon: {
    fontSize: '2rem'
  },
  actionLabel: {
    fontWeight: '600',
    color: '#202124'
  },
  recentActivitySection: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  btnSecondary: {
    padding: '0.5rem 1rem',
    background: '#e0e0e0',
    color: '#202124',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderRadius: '8px',
    background: '#f8f9fa',
    transition: 'all 0.3s ease'
  },
  activityIcon: {
    fontSize: '1.25rem',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    borderRadius: '8px'
  },
  activityContent: {
    flex: 1
  },
  activityMain: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.25rem'
  },
  activityTime: {
    fontSize: '0.875rem',
    color: '#5f6368'
  },
  dashboardFooter: {
    textAlign: 'center',
    padding: '1.5rem',
    color: '#5f6368',
    fontSize: '0.875rem',
    borderTop: '1px solid #e0e0e0'
  }
};

export default MainScreen;
