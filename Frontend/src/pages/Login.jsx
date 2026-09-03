import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PixelTrail from "../components/PixelTrail.jsx";
import api from "../api/api.js";
import AnimatedLogo from "../components/AnimatedLogo.jsx";
import styles from "./styles/Login.module.css";
import { Lock, User, Terminal, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

function Login() {
  const [data, setData] = useState({
    username: "",
    password: "",
  });
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setData({ ...data, [e.target.name]: e.target.value });
  }

  async function handleLogin(e) {
    e?.preventDefault();
    setError("");

    if (!data.username.trim() || !data.password.trim()) {
      setError("Username and Password are required.");
      return;
    }

    try {
      setLoading(true);
      const resp = await api.post("/auth/login", {
        username: data.username.trim(),
        password: data.password,
      });

      if (resp.data?.token) {
        localStorage.setItem("token", resp.data.token);
        localStorage.setItem("user", JSON.stringify(resp.data.user));
        navigate("/lobby");
      }
    } catch (err) {
      console.error("Login Error:", err);
      const backendMessage =
        err.response?.data?.error || err.response?.data?.message || "Invalid username or password";
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e?.preventDefault();
    setError("");

    if (!data.username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!data.password.trim()) {
      setError("Password is required.");
      return;
    }
    if (data.password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    try {
      setLoading(true);
      const resp = await api.post("/auth/register", {
        username: data.username.trim(),
        password: data.password,
      });

      if (resp.data?.token) {
        localStorage.setItem("token", resp.data.token);
        localStorage.setItem("user", JSON.stringify(resp.data.user));
        navigate("/lobby");
      }
    } catch (err) {
      console.error("Registration Error:", err);
      const backendMessage =
        err.response?.data?.error || err.response?.data?.message || "Registration failed. Try a different username.";
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.leftSection}>
        <PixelTrail
          gridSize={50}
          trailSize={0.1}
          maxAge={250}
          interpolate={5}
          color="#7F77DD"
          gooeyFilter={{ id: "custom-goo-filter", strength: 2 }}
          gooeyEnabled
          gooStrength={2}
        />

        <div className={styles.left}>
          <div className={styles.logo}>
            <AnimatedLogo />
          </div>
          <h1>CODE MAFIA</h1>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "8px" }}>
            Multiplayer Collaborative Debugging Challenge
          </p>
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.box}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#a855f7", fontSize: "12px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>
            <Terminal size={14} />
            {isRegister ? "New Detective Registration" : "Player Authentication"}
          </div>

          <h1 className={styles.title}>{isRegister ? "Create Account" : "Log In"}</h1>
          <p className={styles.subtitle}>
            {isRegister
              ? "Register your codename to save your wins and match stats to PostgreSQL."
              : "Enter your credentials to access the multiplayer lobby."}
          </p>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#f87171", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={isRegister ? handleRegister : handleLogin} className={styles.form}>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type="text"
                name="username"
                placeholder="Codename / Username"
                value={data.username}
                onChange={handleChange}
                className={styles.loginInput}
                required
                autoFocus
              />
            </div>

            <div style={{ position: "relative", width: "100%" }}>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={data.password}
                onChange={handleChange}
                className={styles.loginInput}
                required
              />
            </div>

            <button
              type="submit"
              className={styles.btn}
              onMouseEnter={(e) => (e.target.style.background = "#776bfc")}
              onMouseLeave={(e) => (e.target.style.background = "#594bf9")}
              disabled={loading}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{isRegister ? "Register & Enter Lobby" : "Login to Lobby"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className={styles.switch}>
            {isRegister ? "Already Have An Account?" : "Don't have an Account?"}
            <span
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              style={{ cursor: "pointer", color: "#38bdf8", fontWeight: "600", marginLeft: "6px" }}
            >
              {isRegister ? "Log In" : "Sign up"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;