import { useState } from "react";
import axios from "axios";
import "./Login.css";

function Login({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) return setError("Please fill in all fields");
    if (password.length < 4) return setError("Password must be at least 4 characters");
    setLoading(true);
    setError("");
    const url = tab === "register"
      ? "https://chatapp-16sp.onrender.com/api/auth/register"
      : "https://chatapp-16sp.onrender.com/api/auth/login";
    try {
      const res = await axios.post(url, { username, password });
      if (tab === "register") {
        alert("Registered successfully! Please login.");
        setTab("login");
        setUsername("");
        setPassword("");
      } else {
        onLogin({ username: res.data.username, token: res.data.token, theme: dark ? "dark" : "light" });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className={`login-bg ${dark ? "dark" : "light"}`}>
      <div className="login-orbs">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>

      <button className="theme-pill" onClick={() => setDark(!dark)}>
        <span className="theme-pill-icon">{dark ? "☀️" : "🌙"}</span>
        <span>{dark ? "Light mode" : "Dark mode"}</span>
      </button>

      <div className="login-card">
        <div className="card-glow" />

        <div className="brand">
          <div className="brand-icon">
            <span>💬</span>
          </div>
          <div>
            <h1 className="brand-name">ChatApp</h1>
            <p className="brand-sub">Real-time · Secure · Dockerized</p>
          </div>
        </div>

        <div className="tab-row">
          <button
            className={`tab-btn ${tab === "login" ? "active" : ""}`}
            onClick={() => { setTab("login"); setError(""); }}
          >
            Login
          </button>
          <button
            className={`tab-btn ${tab === "register" ? "active" : ""}`}
            onClick={() => { setTab("register"); setError(""); }}
          >
            Register
          </button>
          <div className="tab-indicator" style={{ transform: `translateX(${tab === "login" ? "0%" : "100%"})` }} />
        </div>

        <div className="fields">
          <div className="field-wrap">
            <span className="field-icon">👤</span>
            <input
              className="field-input"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div className="field-wrap">
            <span className="field-icon">🔒</span>
            <input
              className="field-input"
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
            <button className="eye-btn" onClick={() => setShowPass(!showPass)}>
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-box">
            <span>⚠️</span> {error}
          </div>
        )}

        <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <span className="spinner" />
          ) : (
            <>
              <span>{tab === "login" ? "Sign In" : "Create Account"}</span>
              <span className="submit-arrow">→</span>
            </>
          )}
        </button>

        <p className="switch-text">
          {tab === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            className="switch-btn"
            onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(""); }}
          >
            {tab === "login" ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;