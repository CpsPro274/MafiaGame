import { useEffect, useState } from "react";
import AnimatedLogo from "../components/AnimatedLogo";
import {
  ArrowUpRight,
  Bell,
  Bot,
  FileText,
  MessageSquare,
  UserRound,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import styles from "./styles/Dashboard.module.css";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = new useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      return;
    }
    try {
      setUser(JSON.parse(storedUser));
    } 
    catch {
      setUser(null);
    }
  }, []);

    const handleChat = () => {
      navigate("/onboarding");
  };

  const displayName = user?.username || "Student";

  return (
    <div className={styles.dashboard}>
      <div className={styles.bg} />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.topPanel}> 
            <h1>Welcome back, <span>{displayName}</span></h1>
          </div>

          <button
            className={styles.notificationButton}
            aria-label="Notifications">
            <Bell size={20} />
            <span className={styles.notificationDot} />
          </button>
        </header>

        <section className={styles.contentGrid}>
          <div className={`${styles.card} ${styles.aiCard}`}>
            <div className={styles.aiGlow} />
            <div className={styles.aiIcon}>
              <Bot size={25} />
            </div>
            <h2 className={styles.aiTitle}>
              Your admission questions, answered.
            </h2>
            <p className={styles.aiDescription}>
              Get help with courses, eligibility, cut-offs, documents,
              fees, and everything else related to your admission.
            </p>

            <button className={styles.primaryButton} onClick={handleChat}>
              <MessageSquare size={17} />
              Chat with AI Counselor
              <ArrowUpRight size={16} />
            </button>
          </div>

          <div className={`${styles.card} ${styles.actionCard}`}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.cardEyebrow}>NEXT STEP</p>
                <button className={styles.cardTitle}>
                  Complete your profile
                </button>
              </div>

              <div className={styles.warningIcon}>
                <AlertCircle size={21} />
              </div>
            </div>

            <p className={styles.actionDescription}>
              Complete your student profile so we can personalize your
              counselling experience and keep your admission information
              up to date.
            </p>

            <button className={styles.actionButton}>
              Complete profile
              <ChevronRight size={17} />
            </button>
          </div>

          <div className={`${styles.card} ${styles.quickCard}`}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.cardEyebrow}>QUICK ACCESS</p>

                <h2 className={styles.cardTitle}>
                  What would you like to do?
                </h2>
              </div>
            </div>

            <div className={styles.quickActions}>
              <button className={styles.quickAction}>
                <div className={styles.quickIcon}>
                  <MessageSquare size={19} />
                </div>

                <div>
                  <strong>Ask AI Counselor</strong>
                  <span>Get instant guidance</span>
                </div>

                <ChevronRight size={17} />
              </button>

              <button className={styles.quickAction}>
                <div className={styles.quickIcon}>
                  <UserRound size={19} />
                </div>

                <div>
                  <strong>My Profile</strong>
                  <span>Manage your information</span>
                </div>

                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}