import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StaggeredMenu from "../components/StaggeredMenu";
import AnimatedLogo from "../components/AnimatedLogo";
import CrewmateMascot from "../components/CrewmateMascot";
import {
  Code2,
  Eye,
  Users,
  Bug,
  Shield,
  Vote,
  Gamepad2,
  Terminal,
  CheckCircle2,
} from "lucide-react";
import ButtonWithIcon from "@/components/ui/button-with-icon";
import styles from "./styles/Home.module.css";

const socialItems = [
  { label: "GitHub", link: "https://github.com" },
  { label: "Discord", link: "https://discord.com" },
  { label: "LinkedIn", link: "https://linkedin.com" },
];

export default function Home() {
  const navigate = useNavigate();

  const handleScrollToBottom = (e) => {
    e?.preventDefault?.();
    const bottomEl = document.getElementById("how-it-works") || document.getElementById("bottom");
    if (bottomEl) {
      bottomEl.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    }
  };

  const menuItems = [
    {
      label: "Home",
      ariaLabel: "Go to Home",
      link: "/home",
      onClick: () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    },
    {
      label: "How It Works",
      ariaLabel: "Learn how Code Mafia works",
      link: "#how-it-works",
      onClick: handleScrollToBottom,
    },
    {
      label: "Login",
      ariaLabel: "Login to Code Mafia",
      link: "/login",
    },
  ];

  function handleCreateGame() {
    navigate("/lobby");
  }

  function handleJoinGame() {
    navigate("/lobby");
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.bg} />

      <StaggeredMenu
        position="left"
        items={menuItems}
        socialItems={socialItems}
        displaySocials
        displayItemNumbering={true}
        menuButtonColor="#000000"
        openMenuButtonColor="#000000"
        changeMenuColorOnOpen={true}
        colors={["#E81E25", "#38FEDC"]}
        logoUrl={
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs">
            <AnimatedLogo />
          </div>
        }
        accentColor="#09090b"
      />

      <main className={styles.main}>
        {/* ==========================================================================
            HERO SECTION (CLEAN + SUBTLE AMONG US TOUCHES)
            ========================================================================== */}
        <section className={styles.hero}>
          {/* Minimalist Pill Badge with Red Dot */}
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            <span>Social Deduction • There is 1 Mafia Among Us</span>
          </div>

          <h1 className={styles.title}>
            Code together.
            <br />
            <span className={styles.gradient}>Trust nobody.</span>
          </h1>

          <p className={styles.description}>
            Welcome to <strong>Code Mafia</strong> — a multiplayer coding challenge where your team collaborates in a shared IDE to debug a broken project, pass unit tests, and uncover the secret Imposter sabotaging your code.
          </p>

          {/* Cute Crewmates Showcase */}
          <div className={styles.heroMascots}>
            <div className="flex flex-col items-center">
              <CrewmateMascot color="cyan" role="developer" size={68} glow={false} />
              <span className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full mt-2">
                Developer
              </span>
            </div>

            <span className="text-slate-300 font-bold text-sm">VS</span>

            <div className="flex flex-col items-center">
              <CrewmateMascot color="red" role="imposter" size={68} direction="left" glow={false} />
              <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full mt-2">
                Code Mafia
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.btngroup}>
            <ButtonWithIcon text="Create Game" onClick={handleCreateGame} />
            <ButtonWithIcon
              text="Join a Game"
              onClick={handleJoinGame}
              icon={<Users size={16} />}
            />
          </div>

          {/* Quick Specs Bar */}
          <div className={styles.specsBar}>
            <span>👥 2–10 Players</span>
            <span className={styles.specDot} />
            <span>⚡ Real-Time Monaco IDE</span>
            <span className={styles.specDot} />
            <span>🐳 Sandboxed Docker</span>
            <span className={styles.specDot} />
            <span>🚨 Emergency Tribunal</span>
          </div>
        </section>

        {/* ==========================================================================
            GAME FEATURES SECTION
            ========================================================================== */}
        <section className={styles.gameSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>THE GAME</span>
            <h2 className={styles.sectionTitle}>
              Everyone is fixing the code.
              <br />
              <span className={styles.gradient}>Someone is breaking it.</span>
            </h2>
            <p className={styles.sectionDescription}>
              Work together as developers to stabilize an intentionally flawed software project. But beware — one or more players are secretly Mafia whose mission is to sabotage tests without getting caught.
            </p>
          </div>

          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.icon}>
                <Code2 size={22} />
              </div>
              <h3 className={styles.featureTitle}>Debug Together</h3>
              <p className={styles.description} style={{ margin: 0, fontSize: "0.9rem" }}>
                Collaborate in a shared real-time code editor. Inspect files, identify bugs, and work as a team to make the build pass.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.icon}>
                <Bug size={22} />
              </div>
              <h3 className={styles.featureTitle}>Find the Bugs</h3>
              <p className={styles.description} style={{ margin: 0, fontSize: "0.9rem" }}>
                Run the test suite against sandboxed Docker runners. Every failed test could be an honest mistake — or deliberate sabotage.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.icon}>
                <Eye size={22} />
              </div>
              <h3 className={styles.featureTitle}>Watch Everyone</h3>
              <p className={styles.description} style={{ margin: 0, fontSize: "0.9rem" }}>
                Observe live edits, line changes, and suspicious behaviors. Figure out who is genuinely fixing bugs and who is faking tasks.
              </p>
            </div>
          </div>
        </section>

        {/* ==========================================================================
            ROLES SECTION (WITH SUBTLE AMONG US CREWMATES)
            ========================================================================== */}
        <section className={styles.rolesSection}>
          <div className={styles.roleCard}>
            <CrewmateMascot color="cyan" role="developer" size={80} glow={false} />
            <span className={`${styles.roleLabel} ${styles.roleLabelDev}`}>
              CREWMATE DEVELOPER
            </span>
            <h3>Fix the project. Find the traitor.</h3>
            <p>
              Repair the broken codebase, pass all test cases, inspect suspicious code changes, and vote out the hidden imposter.
            </p>
          </div>

          <div className={styles.roleCard}>
            <CrewmateMascot color="red" role="imposter" size={80} glow={false} />
            <span className={`${styles.roleLabel} ${styles.roleLabelMafia}`}>
              THE CODE MAFIA
            </span>
            <h3>Break the code. Don't get caught.</h3>
            <p>
              Blend into the team while secretly introducing subtle edge-case bugs, poisoning logic, and surviving the voting tribunal.
            </p>
          </div>
        </section>

        {/* ==========================================================================
            HOW IT WORKS SECTION (4 PHASES)
            ========================================================================== */}
        <section id="how-it-works" className={styles.howSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>HOW IT WORKS</span>
            <h2 className={styles.sectionTitle}>
              Four phases.
              <br />
              <span className={styles.gradient}>One winner.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
            <div className="flex flex-col items-center text-center p-6 bg-white border border-slate-200 rounded-2xl">
              <span className="text-xl font-bold text-slate-400 mb-2">01</span>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3 text-slate-800">
                <Users size={18} />
              </div>
              <h4 className="font-bold text-slate-900 mb-1">Assemble Crew</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Create a game lobby, configure round difficulty, and invite 2–10 players.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-white border border-slate-200 rounded-2xl">
              <span className="text-xl font-bold text-slate-400 mb-2">02</span>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3 text-slate-800">
                <Shield size={18} />
              </div>
              <h4 className="font-bold text-slate-900 mb-1">Secret Roles</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Roles are assigned secretly. Developers receive their mission; Mafia receives sabotage orders.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-white border border-slate-200 rounded-2xl">
              <span className="text-xl font-bold text-slate-400 mb-2">03</span>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3 text-slate-800">
                <Code2 size={18} />
              </div>
              <h4 className="font-bold text-slate-900 mb-1">Debug & Sabotage</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Developers race to pass test suites while Mafia quietly injects bugs into the editor.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-white border border-slate-200 rounded-2xl">
              <span className="text-xl font-bold text-slate-400 mb-2">04</span>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3 text-slate-800">
                <Vote size={18} />
              </div>
              <h4 className="font-bold text-slate-900 mb-1">Discuss & Vote</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Debate suspicious code changes in the Emergency Tribunal and vote to eject the imposter.
              </p>
            </div>
          </div>
        </section>

        {/* ==========================================================================
            FINAL CTA SECTION
            ========================================================================== */}
        <section id="bottom" className={styles.cta}>
          <h2 className={styles.ctaTitle}>
            Your code is broken.
            <br />
            <span className={styles.gradient}>Who broke it?</span>
          </h2>

          <p className={styles.description}>
            Gather your team, start a match, and find out who you can trust.
          </p>

          <ButtonWithIcon
            text="Start Playing"
            onClick={handleCreateGame}
            icon={<Gamepad2 size={16} />}
          />
        </section>

        {/* ==========================================================================
            FOOTER
            ========================================================================== */}
        <footer className={styles.footer}>
          <div>
            <span className={styles.footerLogo}>CODE MAFIA</span>
            <span className={styles.footerText}>
              Multiplayer Collaborative Debugging
            </span>
          </div>

          <span className={styles.footerCopyright}>
            © 2026 Code Mafia. All rights reserved.
          </span>
        </footer>
      </main>
    </div>
  );
}
