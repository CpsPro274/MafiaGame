import { useNavigate } from 'react-router-dom';
import StaggeredMenu from '../components/StaggeredMenu';
import AnimatedLogo from '../components/AnimatedLogo';
import {
  ArrowRight,
  Code2,
  Eye,
  Users,
  Bug,
  Shield,
  Vote,
} from 'lucide-react';
import styles from './styles/Home.module.css';

const menuItems = [
  {
    label: 'Home',
    ariaLabel: 'Go to Home',
    link: '/home',
  },
  {
    label: 'How It Works',
    ariaLabel: 'Learn how Code Mafia works',
    link: '/about',
  },
  {
    label: 'Login',
    ariaLabel: 'Login to Code Mafia',
    link: '/login',
  },
];

const socialItems = [
  { label: 'GitHub', link: 'https://github.com' },
  { label: 'Discord', link: 'https://discord.com' },
  { label: 'LinkedIn', link: 'https://linkedin.com' },
];

export default function Home() {
  const navigate = useNavigate();

  function handleCreateGame() {
    const token = localStorage.getItem('token');
    navigate('/lobby');
  }

  function handleJoinGame() {
    const token = localStorage.getItem('token');
    navigate('/lobby');
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
        logoUrl={
          <div className={styles.logo}>
            <AnimatedLogo />
          </div>
        }
        accentColor="#5227FF"
      />

      <div className={styles.bg}></div>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.badge}>
            <span className={styles.badgeDot}></span>
            REAL-TIME MULTIPLAYER DEBUGGING
          </div>

          <h1 className={styles.title}>
            Code together.
            <br />
            <span className={styles.gradient}>
              Trust nobody.
            </span>
          </h1>

          <p className={styles.description}>
            Welcome to <strong>Code Mafia</strong> — a multiplayer coding
            challenge where your team must debug a broken project, pass the
            tests, and uncover the hidden Mafia sabotaging your code.
          </p>

          <div className={styles.btngroup}>
            <button
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`}
              onClick={handleCreateGame}
            >
              <Code2 size={18} />
              Create Game
              <ArrowRight size={18} />
            </button>

            <button
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnLarge}`}
              onClick={handleJoinGame}
            >
              <Users size={18} />
              Join a Game
            </button>
          </div>

          <div className={styles.heroHint}>
            <span>Debug.</span>
            <span>Collaborate.</span>
            <span>Investigate.</span>
            <span>Survive.</span>
          </div>
        </section>

        <section className={styles.gameSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>THE GAME</span>

            <h2 className={styles.sectionTitle}>
              Everyone is fixing the code.
              <br />
              <span className={styles.gradient}>
                Someone is breaking it.
              </span>
            </h2>

            <p className={styles.sectionDescription}>
              Work together as developers to stabilize an intentionally flawed
              software project. But beware — one or more players are secretly
              Mafia. Their mission is simple: sabotage the code without getting
              caught.
            </p>
          </div>

          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.icon}>
                <Code2 size={24} />
              </div>

              <h3 className={styles.featureTitle}>
                Debug Together
              </h3>

              <p className={styles.description}>
                Collaborate in a shared real-time code editor. Inspect files,
                identify bugs, modify code, and work as a team to make the
                application stable.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.icon}>
                <Bug size={24} />
              </div>

              <h3 className={styles.featureTitle}>
                Find the Bugs
              </h3>

              <p className={styles.description}>
                Run the project's test suite and investigate failing tests.
                Every regression could be an innocent mistake — or deliberate
                sabotage.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.icon}>
                <Eye size={24} />
              </div>

              <h3 className={styles.featureTitle}>
                Watch Everyone
              </h3>

              <p className={styles.description}>
                Observe player activity, code changes, test runs, and suspicious
                behavior. Figure out who is genuinely debugging and who is
                quietly causing chaos.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.howSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>
              HOW IT WORKS
            </span>

            <h2 className={styles.sectionTitle}>
              Four phases.
              <br />
              <span className={styles.gradient}>
                One winner.
              </span>
            </h2>
          </div>

          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>01</div>

              <div className={styles.stepIcon}>
                <Users size={22} />
              </div>

              <h3>Build Your Team</h3>

              <p>
                Create a game, configure the rules, invite your friends, and
                start the match.
              </p>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>02</div>

              <div className={styles.stepIcon}>
                <Shield size={22} />
              </div>

              <h3>Receive Your Role</h3>

              <p>
                Developers receive their mission. Mafia receives a secret
                identity. Nobody knows who is who.
              </p>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>03</div>

              <div className={styles.stepIcon}>
                <Code2 size={22} />
              </div>

              <h3>Debug & Sabotage</h3>

              <p>
                Developers fix bugs and pass tests while Mafia secretly
                introduces regressions or protects existing problems.
              </p>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>04</div>

              <div className={styles.stepIcon}>
                <Vote size={22} />
              </div>

              <h3>Discuss & Vote</h3>

              <p>
                Analyze everyone's actions, debate suspicious behavior, and
                vote to eliminate the player you believe is Mafia.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.rolesSection}>
          <div className={styles.roleCard}>
            <div className={styles.roleIcon}>
              <Code2 size={28} />
            </div>

            <span className={styles.roleLabel}>
              DEVELOPER
            </span>

            <h2>
              Fix the project.
              <br />
              Find the traitor.
            </h2>

            <p>
              Work with your teammates to repair the application, get the
              tests passing, and identify the players who are deliberately
              sabotaging your progress.
            </p>

            <div className={styles.rolePoints}>
              <span>✓ Fix bugs</span>
              <span>✓ Pass tests</span>
              <span>✓ Investigate players</span>
            </div>
          </div>

          <div className={`${styles.roleCard} ${styles.mafiaCard}`}>
            <div className={styles.roleIcon}>
              <Eye size={28} />
            </div>

            <span className={styles.roleLabel}>
              MAFIA
            </span>

            <h2>
              Break the code.
              <br />
              Don't get caught.
            </h2>

            <p>
              Blend into the team while secretly creating bugs, causing
              regressions, preserving existing issues, and misleading your
              fellow developers.
            </p>

            <div className={styles.rolePoints}>
              <span>✓ Introduce regressions</span>
              <span>✓ Mislead the team</span>
              <span>✓ Survive the vote</span>
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <span className={styles.sectionLabel}>
            READY?
          </span>

          <h2 className={styles.ctaTitle}>
            Your code is broken.
            <br />
            <span className={styles.gradient}>
              Who broke it?
            </span>
          </h2>

          <p className={styles.description}>
            Gather your team, start a match, and find out who you can trust.
          </p>

          <button
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`}
            onClick={handleCreateGame}
          >
            Start Playing
            <ArrowRight size={18} />
          </button>
        </section>

        <footer className={styles.footer}>
          <div>
            <span className={styles.footerLogo}>
              CODE MAFIA
            </span>

            <span className={styles.footerText}>
              Multiplayer Collaborative Debugging
            </span>
          </div>

          <span className={styles.footerCopyright}>
            © 2026 Code Mafia
          </span>
        </footer>
      </main>
    </div>
  );
}