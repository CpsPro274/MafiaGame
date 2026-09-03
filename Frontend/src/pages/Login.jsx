import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PixelTrail from '../components/PixelTrail.jsx';
import api from '../api/api.js';
import AnimatedLogo from "../components/AnimatedLogo.jsx";
import styles from "./styles/Login.module.css";

// npm install three @react-three/fiber @react-three/drei axios react-router-dom tailwindcss @tailwindcss/vite gsap
function Login() {
    const [data, setData] = useState({
        username: "",
        role: "Student",
        password: "",
    })
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    function handleChange(e){
        setData({ ...data, [e.target.name]: e.target.value });
    }
    async function handleLogin(){
        setError("");
        if(!data.username.trim() || !data.password.trim()){
            setError("Username and Password are required");
            return;
        }
        if(data.password.length < 6){
            setError("Password must be 6 characters");
            return;
        }
        try{
            setLoading(true);
                const resp = await api.post(
                "/auth/login",
                {
                    username: data.username,
                    password: data.password
                },
                { withCredentials: true });
                if(resp.data?.success && resp.data?.token){
                    localStorage.setItem("token", resp.data.token);
                }

                const user = resp.data?.user;
                if(user?.role === "Student" && !user?.student_id){
                    navigate("/onboarding/student-profile");
                }
                else if(user?.role === "Counselor" && !user?.counselor_id){
                    navigate("/onboarding/counselor-profile");
                }
                else{
                    navigate("/home");
                }
            } catch(err){
            console.log("Login Error Occured: ", err);
            const backendMessage = err.response?.data?.message;
            setError(backendMessage || "Login Failed");
        }
        finally{
            setLoading(false);
        }
    }
    async function handleRegisterInitiate(e){
        e.preventDefault();
        setError("");
        if(!data.username.trim()){
            setError("Username is Required")
            return
        }
        if(!data.password.trim()){
            setError("Password is Required")
            return
        }
        if(data.password.length < 6){
            setError("Password must be atleast 6 characters")
            return
        }
        try{
            setLoading(true);
            const resp = await api.post(
            "/auth/register",
            {
                username: data.username,
                role: data.role, 
                password: data.password
            },
            { withCredentials: true });
            if(resp.data?.success && resp.data?.token){
                localStorage.setItem("token", resp.data.token);
            }
            const user = resp.data?.user;
            if(!user.onboardingCompleted){
                navigate("/onboarding");
            }
            else{
                navigate("/dashboard");
            }
        }
        catch(err){
            console.log("Registeration Error Occured: ", err);
            const backendMessage = err.response?.data?.message;
            console.log("Backend Message: ", backendMessage);
            setError(backendMessage || "Registeration Failed");
        }
        finally {
            setLoading(false);
        } 
    }
    async function handleLogout(){
        try{
            await api.post("/auth/logout", {}, { withCredentials: true });
        }
        catch(err){
            console.log("Logout Error Occured: ", err);
        }
        finally{
            localStorage.removeItem("token");
            navigate("/home", {replace: true});
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
                    gooStrength={2}/>
                    
                <div className={styles.left}>
                    <div className={styles.logo}>
                        <AnimatedLogo/>
                    </div>
                    <h1>Welcome Back</h1>
                    <p>Your ChatBot is waiting</p>
                </div>
            </div>
            <div className={styles.rightSection}>
                <div className={styles.box}>
                    <h1 className={styles.title}>
                        {
                            isRegister?"Register":"Login"
                        }
                    </h1>
                    <p className={styles.subtitle}>Enter your credentials to continue</p>

                    {isRegister && (
                        <div className={styles.form}>
                            <input
                                type="text"
                                name="username"
                                placeholder="Username"
                                value={data.username}
                                onChange={handleChange}
                                className={styles.loginInput}
                                style={{
                                    background: "#0E0C1A",
                                    border: "1px solid #594bf9",
                                    color: "#EEEDFE",
                                }}
                            />
                            <select
                                name="role"
                                value={data.role}
                                onChange={handleChange}
                                className={styles.loginSelect}
                                style={{
                                    background: "#0E0C1A",
                                    border: "1px solid #594bf9",
                                    color: "#EEEDFE",
                                }}>
                                <option value="" disabled hidden>
                                    Select your role
                                </option>
                                <option value="Student">Student</option>
                                <option value="Admin">Admin</option>
                                <option value="Counselor">Counselor</option>
                            </select>

                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={data.password}
                                onChange={handleChange}
                                className={styles.loginInput}
                                style={{
                                    background: "#0E0C1A",
                                    border: "1px solid #594bf9",
                                    color: "#EEEDFE",
                                }}
                            />
                            <button 
                                className={styles.btn}
                                onMouseEnter={e => e.target.style.background="#776bfc"}
                                onMouseLeave={e => e.target.style.background="#594bf9"}
                                onClick={handleRegisterInitiate}
                                disabled={loading}>
                                Register
                            </button>
                        </div>
                    )}
                    
                    
                    {!isRegister && (
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
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={data.password}
                                onChange={handleChange}
                                className={styles.loginInput}
                            />
                            <button 
                                className={styles.btn}
                                onMouseEnter={e => e.target.style.background="#776bfc"}
                                onMouseLeave={e => e.target.style.background="#594bf9"}
                                onClick={handleLogin}
                                disabled={loading}>
                                {loading?"Loading...":"Login"}
                            </button>
                        </div>
                    )}
                    
                    <p className={styles.switch}>
                        {
                            isRegister?"Already Have An Account ?":"Don't have an Account ?"
                        }
                        <span
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setError("");
                            }}> 
                                {isRegister?" Log In":" Sign up"}
                        </span>
                    </p>
                    {
                        error&&(
                            <p className={styles.error}>
                                {error}
                            </p>
                        )
                    }
                </div>
            </div>
        </div>
    );
}
export default Login;