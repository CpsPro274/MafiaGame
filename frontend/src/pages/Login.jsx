import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PixelTrail from "../components/PixelTrail.jsx";
import api from "../api/api.js";
import AnimatedLogo from "../components/AnimatedLogo.jsx";
import styles from "./styles/Login.module.css";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [data, setData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setData({ ...data, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const cleanUsername = data.username.trim();

    if (!cleanUsername) {
      setError("Username is required");
      return;
    }
    if (!data.password.trim()) {
      setError("Password is required");
      return;
    }

    try {
      setLoading(true);
      const endpoint = isLogin ? "/auth/login" : "/auth/register";

      const payload = isLogin
        ? { username: cleanUsername, password: data.password }
        : { username: cleanUsername, email: data.email.trim(), password: data.password };

      const resp = await api.post(endpoint, payload, { withCredentials: true });

      if (resp.data?.token) {
        localStorage.setItem("token", resp.data.token);
      }

      // Store username for room sessions & multiplayer
      const usernameToSave = resp.data?.user?.username || cleanUsername;
      localStorage.setItem("username", usernameToSave);

      navigate("/lobby");
    } catch (err) {
      console.error("Auth Error:", err);
      const backendMessage = err.response?.data?.error || err.response?.data?.message;
      setError(backendMessage || (isLogin ? "Login failed. Check your credentials." : "Registration failed. Username may be taken."));
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
          color="#2563eb"
          gooeyFilter={{ id: "custom-goo-filter", strength: 2 }}
          gooeyEnabled
          gooStrength={2}
        />
        <div className={styles.left}>
          <div className={styles.logo}>
            <AnimatedLogo />
          </div>
          <h1>Code Mafia</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", marginTop: "4px" }}>
            The Ultimate Social Deduction Coding Game
          </p>
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.box}>
          <h1 className={styles.title}>{isLogin ? "Sign In" : "Create Account"}</h1>
          <p className={styles.subtitle}>
            {isLogin ? "Welcome back! Enter your details to continue." : "Register to start playing Code Mafia with your team."}
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={data.username}
              onChange={handleChange}
              className={styles.loginInput}
              autoComplete="username"
            />

            {!isLogin && (
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={data.email}
                onChange={handleChange}
                className={styles.loginInput}
                autoComplete="email"
              />
            )}

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={data.password}
              onChange={handleChange}
              className={styles.loginInput}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />

            <button
              type="submit"
              className={styles.btn}
              disabled={loading}
            >
              {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
            </button>
          </form>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.switch}>
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <span onClick={() => { setIsLogin(false); setError(""); }}>Register now</span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span onClick={() => { setIsLogin(true); setError(""); }}>Login here</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}