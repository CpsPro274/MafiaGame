import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PixelTrail from '../components/PixelTrail.jsx';
import api from '../api/api.js';
import AnimatedLogo from "../components/AnimatedLogo.jsx";
import styles from "./styles/Login.module.css";

function Register() {
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

    async function handleRegister(e) {
        e.preventDefault();
        setError("");

        if (!data.username.trim()) {
            setError("Username is required");
            return;
        }
        if (!data.email.trim()) {
            setError("Email is required");
            return;
        }
        if (!data.password.trim()) {
            setError("Password is required");
            return;
        }
        if (data.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        try {
            setLoading(true);
            const resp = await api.post(
                "/auth/register",
                {
                    username: data.username.trim(),
                    email: data.email.trim(),
                    password: data.password,
                },
                { withCredentials: true }
            );

            if (resp.data?.token) {
                localStorage.setItem("token", resp.data.token);
            }

            navigate("/home");
        } catch (err) {
            console.log("Registration Error Occurred: ", err);
            const backendMessage = err.response?.data?.error;
            setError(backendMessage || "Registration Failed");
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
                    <h1>Welcome</h1>
                </div>
            </div>
            <div className={styles.rightSection}>
                <div className={styles.box}>
                    <h1 className={styles.title}>Register</h1>
                    <p className={styles.subtitle}>Create an account to continue</p>

                    <div className={styles.form}>
                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            value={data.username}
                            onChange={handleChange}
                            className={styles.loginInput}
                        />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={data.email}
                            onChange={handleChange}
                            className={styles.loginInput}
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={data.password}
                            onChange={handleChange}
                            className={styles.loginInput}
                        />
                        <button
                            className={styles.btn}
                            onMouseEnter={e => e.target.style.background = "#776bfc"}
                            onMouseLeave={e => e.target.style.background = "#594bf9"}
                            onClick={handleRegister}
                            disabled={loading}
                        >
                            {loading ? "Loading..." : "Register"}
                        </button>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}
                </div>
            </div>
        </div>
    );
}

export default Register;