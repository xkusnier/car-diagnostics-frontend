import React, { useState } from "react";
import "./styles/global.css";

function RegisterScreen({ onRegister, onNavigateToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (!termsAccepted) {
      setError("You must accept the terms and conditions");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const result = await onRegister(email, password);
      
      if (!result.success) {
        setError(result.message || "Registration failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-shape shape-1"></div>
        <div className="auth-shape shape-2"></div>
        <div className="auth-shape shape-3"></div>
      </div>
      
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">🚗</span>
            <h1 className="logo-text">Car Diagnostics</h1>
          </div>
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join our diagnostics platform today</p>
        </div>

        {error && (
          <div className="auth-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Create a password"
              disabled={loading}
            />
            <small className="input-hint">At least 6 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              placeholder="Confirm your password"
              disabled={loading}
            />
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={loading}
              />
              <span>
                I agree to the{" "}
                <a href="#" className="terms-link">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="terms-link">Privacy Policy</a>
              </span>
            </label>
          </div>

          <button
            type="submit"
            className={`auth-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or sign up with</span>
        </div>

        <div className="social-auth">
          <button className="social-button google">
            <span className="social-icon">🔍</span>
            Google
          </button>
          <button className="social-button microsoft">
            <span className="social-icon">❖</span>
            Microsoft
          </button>
        </div>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <button
              onClick={onNavigateToLogin}
              className="auth-link"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterScreen;
