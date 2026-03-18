import React, { useState } from "react";
import "./styles/global.css";
import {
  TruckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

function LoginScreen({ onLogin, onNavigateToRegister }) {
  const [identifier, setIdentifier] = useState(""); // email alebo username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!identifier || !password) {
      setError("Please enter your email/username and password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await onLogin(identifier, password);

      if (!result.success) {
        setError(result.message || "Invalid email/username or password");

        const msg = String(result.message || "").toLowerCase();
        if (
          msg.includes("invalid") ||
          msg.includes("password") ||
          msg.includes("credentials") ||
          msg.includes("401")
        ) {
          setPassword("");
        }
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
            <TruckIcon style={{ width: "2.5rem", height: "2.5rem" }} />
            <h1 className="logo-text">Car Diagnostics</h1>
          </div>
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your account to continue</p>
        </div>

        {error && (
          <div className="auth-error">
            <ExclamationTriangleIcon style={{ width: "1.25rem", height: "1.25rem" }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="identifier" className="form-label">
              Email or Username
            </label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="form-input"
              placeholder="Enter your email or username"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input password-input"
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? (
                  <EyeIcon style={{ width: "1.2rem", height: "1.2rem" }} />
                ) : (
                  <EyeSlashIcon style={{ width: "1.2rem", height: "1.2rem" }} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`auth-button ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don&apos;t have an account?{" "}
            <button
              onClick={onNavigateToRegister}
              className="auth-link"
              type="button"
            >
              Sign up now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
