import React, { useState } from "react";
import "./styles/global.css";
import {
  TruckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

// Registracny formular vytvara novy ucet a po uspechu vie pouzivatela prihlasit.
function RegisterScreen({ onRegister, onNavigateToLogin }) {
  // Udaje formulara su ulozene samostatne, lebo kazdy input sa meni nezavisle.
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Prepnutie viditelnosti hesla je iba lokalna UI pomocka.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handler robi zakladnu validaciu este pred volanim backendu.
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prazdne povinne polia sa vratia ako chyba vo formulari.
    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    // Kratke meno sa odmietne hned, aby pouzivatel nemusel cakat na backend.
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }

    // Zhodu hesiel vie frontend overit spolahlivo sam.
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setConfirmPassword("");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await onRegister(username.trim(), email, password);

      if (!result.success) {
        setError(result.message || "Registration failed");

        const msg = String(result.message || "").toLowerCase();

        if (
          msg.includes("already exists") ||
          msg.includes("email") ||
          msg.includes("username")
        ) {
          setPassword("");
          setConfirmPassword("");
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
          <h2 className="auth-title">Create Account</h2>
        </div>

        {error && (
          <div className="auth-error">
            <ExclamationTriangleIcon style={{ width: "1.25rem", height: "1.25rem" }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="Enter your username"
              disabled={loading}
              autoComplete="username"
            />
          </div>

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
              autoComplete="email"
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
                placeholder="Create a password"
                disabled={loading}
                autoComplete="new-password"
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
            <small className="input-hint">At least 6 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input password-input"
                placeholder="Confirm your password"
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? (
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
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div
          className="auth-footer"
          style={{
            position: "relative",
            zIndex: 50,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.25rem",
            marginTop: "1rem",
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>
            Already have an account?
          </span>

          <button
            type="button"
            onClick={() => onNavigateToLogin()}
            style={{
              background: "none",
              border: "none",
              color: "#60a5fa",
              textDecoration: "underline",
              cursor: "pointer",
              font: "inherit",
              padding: 0,
              margin: 0,
              pointerEvents: "auto",
              position: "relative",
              zIndex: 60,
            }}
          >
            Sign in here
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterScreen;
