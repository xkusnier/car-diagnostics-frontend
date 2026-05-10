import React, { useState, useEffect } from 'react';
import './styles/global.css';
import {
  TruckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Jednoducha obrazovka pre dlhsie cakanie, hlavne pri prebudzani backendu.
function LoadingScreen({ message, attempt }) {
  // Bodky sa menia v case, aby loading neposobil zamrznuto.
  const [dots, setDots] = useState('');

  // Animácia bodiek pre "Waking up..."
  // Animacia bodiek bezi iba pri sprave o prebudzani servera.
  useEffect(() => {
    if (message.includes("Waking up")) {
      // Interval pravidelne pridava alebo resetuje bodky v texte.
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [message]);

  // Text sa upravi len pre wake-up stav, ostatne spravy ostavaju povodne.
  const displayMessage = message.includes("Waking up") 
    ? `Waking up the server${dots}` 
    : message;

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <TruckIcon style={{ width: '4rem', height: '4rem' }} />
            <h1 className="logo-text" style={{ fontSize: '2rem', margin: '1rem 0' }}>
              Car Diagnostics
            </h1>
          </div>
          <div style={{ margin: '2rem 0' }}>
            <div className="spinner-large" style={{ margin: '0 auto', width: '50px', height: '50px' }}></div>
            <p style={{ marginTop: '2rem', fontSize: '1.2rem', color: '#666' }}>
              {displayMessage}
            </p>
            {attempt > 0 && message.includes("Waking up") && (
              <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '1rem' }}>
                Attempt {attempt} / 30
              </p>
            )}
            {message.includes("long to respond") && (
              <button 
                onClick={() => window.location.reload()} 
                style={{
                  marginTop: '2rem',
                  padding: '0.8rem 2rem',
                  fontSize: '1rem',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ArrowPathIcon style={{ width: '1.1rem', height: '1.1rem' }} />
                Refresh Page
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '2rem' }}>
            Free server is waking up from sleep. This may take 30-60 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
