import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StaggeredMenu from '../components/StaggeredMenu';
import AnimatedLogo from '../components/AnimatedLogo'; 
import { ArrowRight, MessageSquare, ShieldCheck, Zap } from 'lucide-react';
import styles from './styles/Home.module.css';

const menuItems=[
  { label: 'Home', ariaLabel: 'Go to Home', link: '/home' },
  { label: 'About', ariaLabel: 'About the portal', link: '/about' },
  { label: 'Login', ariaLabel: 'Login In', link: '/login' },
];

const socialItems=[
  { label: 'Twitter', link: 'https://twitter.com' },
  { label: 'Instagram', link: 'https://instagram.com' },
  { label: 'LinkedIn', link: 'https://linkedin.com' }
];

export default function Home(){
  const navigate=useNavigate();

  function handleStartApp(){
   window.open("http://sbmp.ac.in/", "_blank");
  }
  function handleChat(){
    const token = localStorage.getItem("token");
    if(token){
      navigate("/dashboard");
    }
    else{
      navigate("/login");
    } 
  }
  return (
    <div className={styles.wrapper}>
      <StaggeredMenu
        position="left"
        items={menuItems}
        socialItems={socialItems}
        displaySocials
        displayItemNumbering={true}
        menuButtonColor="#ffffff"
        openMenuButtonColor="#000000"
        changeMenuColorOnOpen={true}
        colors={['#B497CF', '#5227FF']}
        logoUrl={<div className={styles.logo} ><AnimatedLogo/></div>}
        accentColor="#5227FF"
      />
      <div className={styles.bg}></div>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Navigate your future <br className="hide-mobile"/>
          <span className={styles.gradient}>
            with confidence.
          </span>
        </h1>
        <p className={styles.description}>
          The intelligent, AI-powered admission and counselling portal for SVKM's Shri Bhagubhai Mafatlal Polytechnic. Get personalized guidance, instant document verification, and real-time status updates.
        </p>

        <div className={styles.btngroup}>
          <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`} onClick={handleStartApp}>
            <ArrowRight size={18} className={styles.hide}/>
            Start Application 
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnLarge}`} onClick={handleChat}>
            <MessageSquare size={18} className={styles.hide}/>
            Ask AI Counselor
          </button>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.icon}>
              <MessageSquare size={24} />
            </div>
            <h3 className={styles.featureTitle}>24/7 AI Guidance</h3>
            <p className={styles.description}>Have questions about courses, cut-offs, or fees? Our AI chatbot provides instant, accurate answers anytime.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.icon}>
              <ShieldCheck size={24} />
            </div>
            <h3 className={styles.featureTitle}>Smart Verification</h3>
            <p className={styles.description}>Upload your documents securely. Our system automatically scans and verifies them to speed up your admission process.</p>
          </div>

          <div className={styles.card}>
            <div className={styles.icon}>
              <Zap size={24} />
            </div>
            <h3 className={styles.featureTitle}>Live Tracking</h3>
            <p className={styles.description}>Never wonder where you stand. Track your application status step-by-step from inquiry to final confirmation.</p>
          </div>
        </div>
      </main>
    </div>
  );
}