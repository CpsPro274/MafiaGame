import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useGame } from "../context/GameContext";
import TacticalDeck from "../components/Arena/TacticalDeck";
import { ScreenGlitchOverlay, EmergencyMeetingModal, ImpostorEjectionModal } from "../components/Arena/EffectOverlays";
import ProfileModal from "../components/Profile/ProfileModal";
import sounds from "../services/soundEffects";
import {
  Code2,
  Bug,
  Play,
  CheckCircle2,
  XCircle,
  Shield,
  Eye,
  Vote,
  Sparkles,
  Terminal,
  RotateCcw,
  Zap,
  Clock,
  Users,
  Lock,
  Radio,
  Siren,
  Flame,
  ArrowRight,
  RefreshCw,
  LockKeyhole,
  Trophy,
  Award,
  Volume2,
  VolumeX,
  User
} from "lucide-react";

export default function GameArena() {
  const navigate = useNavigate();
  const { currentRoom, secretRole, activeChallenge, leaderboard, scoreToast, socket } = useGame();
  const [searchParams] = useSearchParams();
  const roomCode = currentRoom?.roomCode || searchParams.get("room") || "7XGRJT";

  // Player identity
  const storedUser = localStorage.getItem("user");
  const username = storedUser ? JSON.parse(storedUser)?.username || "Player" : "Player";

  // Role state
  const [activeRole, setActiveRole] = useState(secretRole || "MAFIA"); // 'MAFIA' | 'DEVELOPER'

  useEffect(() => {
    if (secretRole) {
      setActiveRole(secretRole);
    }
  }, [secretRole]);

  // Code buffer
  const defaultBuggyCode =
`def calculate_cart_total(items, discount_pct):
    subtotal = 0
    # BUG 1: Out of bounds iteration
    for i in range(len(items) + 1):
        subtotal += items[i]["price"] * items[i]["qty"]
    
    # Calculate discount & final total
    total = subtotal - (subtotal * discount_pct / 100)
    return total`;

  const [code, setCode] = useState(activeChallenge?.buggy_code || defaultBuggyCode);

  useEffect(() => {
    if (activeChallenge?.buggy_code) {
      setCode(activeChallenge.buggy_code);
    }
  }, [activeChallenge]);

  // Active tactical effects state
  const [glitchActive, setGlitchActive] = useState(false);
  const [falseGreenActive, setFalseGreenActive] = useState(false);
  const [lockedLines, setLockedLines] = useState([]);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  const [radarActive, setRadarActive] = useState(false);

  // Meeting state
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingCaller, setMeetingCaller] = useState("");
  const [meetingTimeLeft, setMeetingTimeLeft] = useState(45);
  const [hasVoted, setHasVoted] = useState(false);
  const [votes, setVotes] = useState({});

  // Ejection state
  const [ejectionOpen, setEjectionOpen] = useState(false);
  const [ejectedPlayer, setEjectedPlayer] = useState(null);
  const [wasMafiaEjected, setWasMafiaEjected] = useState(false);

  // Test execution state
  const [testStatus, setTestStatus] = useState(null); // null | 'RUNNING' | 'PASS' | 'FAIL'
  const [testOutput, setTestOutput] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const editorRef = useRef(null);
  const decorationsRef = useRef([]);

  const [profileOpen, setProfileOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  // Sound triggers on incoming socket events
  useEffect(() => {
    if (!socket) return;

    const onCodeUpdated = ({ code: newCode, author }) => {
      setCode(newCode);
      showToast(`✏️ ${author} edited the codebase`);
    };

    const onSabotageEffect = ({ type, durationSec, lockedLines: lines, message }) => {
      showToast(message);

      if (type === "SCREEN_GLITCH") {
        sounds.playGlitch();
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), (durationSec || 6) * 1000);
      } else if (type === "FALSE_GREEN") {
        sounds.playVictory();
        setFalseGreenActive(true);
        setTimeout(() => setFalseGreenActive(false), (durationSec || 15) * 1000);
      } else if (type === "FUNCTION_LOCK") {
        sounds.playLock();
        const dur = durationSec || 10;
        setLockedLines(lines || [4, 5, 6, 7, 8]);
        setLockTimeLeft(dur);
      } else if (type === "CODE_RADAR") {
        sounds.playRadar();
        setRadarActive(true);
        setTimeout(() => setRadarActive(false), (durationSec || 8) * 1000);
      }
    };

    const onMeetingStarted = ({ callerName }) => {
      sounds.playSiren();
      setMeetingCaller(callerName);
      setMeetingOpen(true);
      setMeetingTimeLeft(45);
      setHasVoted(false);
      setVotes({});
    };

    const onVoteCast = ({ voterName, targetUsername }) => {
      sounds.playVote();
      setVotes((prev) => ({ ...prev, [voterName]: targetUsername }));
    };

    const onPlayerEjected = ({ ejectedPlayer: ejected, wasMafia }) => {
      setMeetingOpen(false);
      setEjectedPlayer(ejected);
      setWasMafiaEjected(wasMafia);
      setEjectionOpen(true);
      if (wasMafia) {
        sounds.playVictory();
      }
    };

    socket.on("code:updated", onCodeUpdated);
    socket.on("sabotage:effect", onSabotageEffect);
    socket.on("meeting:started", onMeetingStarted);
    socket.on("meeting:vote_cast", onVoteCast);
    socket.on("meeting:ejected", onPlayerEjected);

    return () => {
      socket.off("code:updated", onCodeUpdated);
      socket.off("sabotage:effect", onSabotageEffect);
      socket.off("meeting:started", onMeetingStarted);
      socket.off("meeting:vote_cast", onVoteCast);
      socket.off("meeting:ejected", onPlayerEjected);
    };
  }, [socket]);

  // Lock countdown timer
  useEffect(() => {
    let timer = null;
    if (lockTimeLeft > 0) {
      timer = setInterval(() => {
        setLockTimeLeft((prev) => {
          if (prev <= 1) {
            setLockedLines([]);
            showToast("🔓 Function Unlocked! Editing restored.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockTimeLeft]);

  // Match Timer countdown (10 minutes = 600s)
  const [matchTimeLeft, setMatchTimeLeft] = useState(600);
  const [matchEnded, setMatchEnded] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setMatchTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setMatchEnded(true);
          setWinnerTeam("MAFIA");
          sounds.playGlitch();
          showToast("⏰ TIME EXPIRED: Secret Mafia Victory! (Sabotage Succeeded)");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatMatchTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Meeting timer countdown & Resolution
  useEffect(() => {
    let interval = null;
    if (meetingOpen && meetingTimeLeft > 0) {
      interval = setInterval(() => {
        setMeetingTimeLeft((prev) => {
          if (prev <= 1) {
            resolveMeetingVoting();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [meetingOpen, meetingTimeLeft, votes]);

  const resolveMeetingVoting = () => {
    setMeetingOpen(false);

    // Calculate vote counts
    const voteCounts = {};
    let skipCount = 0;

    Object.values(votes).forEach((target) => {
      if (target === "SKIP") {
        skipCount++;
      } else {
        voteCounts[target] = (voteCounts[target] || 0) + 1;
      }
    });

    // Check for ties or skips
    const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
    let highestPlayer = null;

    if (sorted.length > 0) {
      const topCount = sorted[0][1];
      const isTie = sorted.length > 1 && sorted[1][1] === topCount;

      if (!isTie && topCount > skipCount) {
        highestPlayer = sorted[0][0];
      }
    }

    if (!highestPlayer) {
      setEjectedPlayer("Nobody (Vote Tied or Skipped)");
      setWasMafiaEjected(false);
      setEjectionOpen(true);
      showToast("⚖️ Voting tied or skipped. No agent was ejected.");
      return;
    }

    const isMafia = highestPlayer.toLowerCase().includes("ghost") || highestPlayer === "Ghost" || activeRole === "MAFIA";

    setEjectedPlayer(highestPlayer);
    setWasMafiaEjected(Boolean(isMafia));
    setEjectionOpen(true);

    if (isMafia) {
      setWinnerTeam("DEVELOPERS");
      setMatchEnded(true);
    }

    socket?.emit("meeting:finish", {
      roomCode,
      ejectedPlayer: highestPlayer,
      wasMafia: Boolean(isMafia)
    });
  };

  // Monaco decorations for radar & function lock
  useEffect(() => {
    if (!editorRef.current || !window.monaco) return;
    const monaco = window.monaco;
    const editor = editorRef.current;

    let newDecorations = [];

    if (lockedLines.length > 0) {
      newDecorations = lockedLines.map((lineNum) => ({
        range: new monaco.Range(lineNum, 1, lineNum, 1),
        options: {
          isWholeLine: true,
          className: "monaco-sabotage-line-highlight",
          glyphMarginClassName: "monaco-sabotage-glyph"
        }
      }));
    } else if (radarActive) {
      newDecorations = [3, 4, 5].map((lineNum) => ({
        range: new monaco.Range(lineNum, 1, lineNum, 1),
        options: {
          isWholeLine: true,
          className: "monaco-fix-line-highlight",
          glyphMarginClassName: "monaco-fix-glyph"
        }
      }));
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [lockedLines, radarActive]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCodeChange = (newCode) => {
    if (lockedLines.length > 0) {
      showToast("🔒 FUNCTION LOCKED: Edits are blocked for 10 seconds!");
      return;
    }

    setCode(newCode || "");
    socket?.emit("code:edit", {
      roomCode,
      author: username,
      authorRole: activeRole,
      code: newCode,
      details: `${username} updated code buffer`,
      activeLines: [4, 5]
    });
  };

  const handleRunTests = () => {
    setTestStatus("RUNNING");
    setTimeout(() => {
      // If Mafia activated FALSE_GREEN sabotage, fake a pass!
      if (falseGreenActive) {
        sounds.playVictory();
        setTestStatus("PASS");
        setTestOutput("🟢 All 3 Test Suites Passed (100% Coverage)");
        return;
      }

      let isPassed = false;
      if (activeChallenge?.solution_code) {
        isPassed = !code.includes("IndexError") && !code.includes("1.50") && !code.includes("len(items) + 1");
      } else {
        isPassed = !code.includes("len(items) + 1") && !code.includes("return 0") && !code.includes("1.50");
      }

      if (isPassed) {
        sounds.playVictory();
        setTestStatus("PASS");
        setTestOutput("🟢 Test Case 1: PASS | Test Case 2: PASS | Test Case 3 (Hidden): PASS");
        socket?.emit("test:run", {
          roomCode,
          author: username,
          authorRole: activeRole,
          passed: true,
          details: `${username} stabilized test suite!`,
          code
        });
      } else {
        setTestStatus("FAIL");
        setTestOutput("🔴 Test Suite Failed: Logic Error / Regression Detected in Test Case 1");
        socket?.emit("test:run", {
          roomCode,
          author: username,
          authorRole: activeRole,
          passed: false,
          details: `Regression detected during test execution`,
          code
        });
      }
    }, 700);
  };

  const handleTriggerAbility = (abilityName) => {
    socket?.emit("sabotage:trigger", {
      roomCode,
      ability: abilityName,
      senderName: username,
      senderRole: activeRole,
      targetLines: [4, 5, 6, 7, 8]
    });

    if (abilityName === "CODE_RADAR") {
      sounds.playRadar();
      setRadarActive(true);
      setTimeout(() => setRadarActive(false), 8000);
      showToast("🔍 Code Radar Scan Activated (8s)!");
    } else if (abilityName === "FUNCTION_LOCK") {
      sounds.playLock();
      setLockedLines([4, 5, 6, 7, 8]);
      setLockTimeLeft(10);
      showToast("🔒 Activated Function Lock (10s)!");
    } else if (abilityName === "SCREEN_GLITCH") {
      sounds.playGlitch();
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 6000);
      showToast("🌫️ Activated Screen Glitch (6s)!");
    } else if (abilityName === "FALSE_GREEN") {
      sounds.playVictory();
      setFalseGreenActive(true);
      setTimeout(() => setFalseGreenActive(false), 15000);
      showToast("🎭 Activated False Green (15s)!");
    }
  };

  const handleCallEmergencyMeeting = () => {
    sounds.playSiren();
    socket?.emit("meeting:call", {
      roomCode,
      callerName: username
    });
    setMeetingCaller(username);
    setMeetingOpen(true);
    setMeetingTimeLeft(45);
    setHasVoted(false);
  };

  const handleCastVote = (targetUser) => {
    sounds.playVote();
    setHasVoted(true);
    const updatedVotes = { ...votes, [username]: targetUser };
    setVotes(updatedVotes);

    socket?.emit("meeting:vote", {
      roomCode,
      voterName: username,
      targetUsername: targetUser
    });
    showToast(`🗳️ Vote recorded for ${targetUser}`);

    setTimeout(() => {
      resolveMeetingVoting();
    }, 2500);
  };

  const toggleSound = () => {
    const isMuted = sounds.toggleMute();
    setMuted(isMuted);
    showToast(isMuted ? "🔇 Audio Muted" : "🔊 Audio Enabled");
  };

  const toggleTestRole = () => {
    const nextRole = activeRole === "MAFIA" ? "DEVELOPER" : "MAFIA";
    setActiveRole(nextRole);
    showToast(`🎭 Switched Testing Role to: ${nextRole}`);
  };

  const playersList = currentRoom?.players || [
    { username, isHost: true },
    { username: "Alice", isHost: false },
    { username: "Ghost", isHost: false }
  ];

  const diffLabel = currentRoom?.difficulty || activeChallenge?.difficulty || "MEDIUM";

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 relative overflow-hidden font-sans pb-10">
      {/* 1. Visual Glitch & Meeting Modals */}
      <ScreenGlitchOverlay active={glitchActive} />
      <EmergencyMeetingModal
        isOpen={meetingOpen}
        callerName={meetingCaller}
        players={playersList}
        currentUsername={username}
        onCastVote={handleCastVote}
        hasVoted={hasVoted}
        votes={votes}
        timeLeft={meetingTimeLeft}
      />
      <ImpostorEjectionModal
        isOpen={ejectionOpen}
        ejectedPlayer={ejectedPlayer}
        wasMafia={wasMafiaEjected}
        onClose={() => setEjectionOpen(false)}
        onViewReplay={() => navigate(`/replay?room=${roomCode}`)}
      />

      {/* 2. Top Game HUD (Responsive Wrap) */}
      <header className="border-b border-slate-800 bg-[#0b0d17]/90 px-3 sm:px-8 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono text-xs sm:text-sm font-black text-cyan-300 uppercase">
              #{roomCode}
            </span>
          </div>

          {/* Match Countdown Timer */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs font-bold shadow-inner">
            <Clock size={12} className={matchTimeLeft < 60 ? "text-rose-400 animate-pulse" : "text-cyan-400"} />
            <span className={matchTimeLeft < 60 ? "text-rose-400 animate-pulse" : "text-white"}>
              {formatMatchTime(matchTimeLeft)}
            </span>
          </div>

          {/* Difficulty Badge */}
          <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-mono font-black uppercase border ${
            diffLabel === "EASY"
              ? "bg-emerald-950/60 border-emerald-500 text-emerald-300"
              : diffLabel === "HARD"
              ? "bg-rose-950/60 border-rose-500 text-rose-300"
              : "bg-amber-950/60 border-amber-500 text-amber-300"
          }`}>
            {diffLabel}
          </span>

          {/* Secret Role Badge */}
          <div
            className={`px-2.5 py-1 sm:px-3 sm:py-1 rounded-xl border font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md ${
              activeRole === "MAFIA"
                ? "bg-rose-950/80 border-rose-500 text-rose-300 shadow-rose-950"
                : "bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-cyan-950"
            }`}
          >
            {activeRole === "MAFIA" ? <Eye size={12} className="text-rose-400" /> : <Shield size={12} className="text-cyan-400" />}
            <span>{activeRole === "MAFIA" ? "SECRET MAFIA" : "DEVELOPER"}</span>
          </div>
        </div>

        {/* Center Toast / Points Notification */}
        {scoreToast ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500 text-amber-200 text-[11px] font-mono font-bold animate-bounce shadow-lg shadow-amber-950">
            <Trophy size={13} className="text-amber-400" />
            <span>{scoreToast}</span>
          </div>
        ) : toastMessage ? (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500 text-purple-200 text-xs font-mono font-bold animate-in fade-in">
            <Sparkles size={13} />
            <span>{toastMessage}</span>
          </div>
        ) : null}

        {/* Right Action Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Audio Mute Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={muted ? "Unmute Audio" : "Mute Audio"}
          >
            {muted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} className="text-emerald-400" />}
          </button>

          {/* Profile Stats Button */}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <User size={13} className="text-purple-400" />
            <span>Stats</span>
          </button>

          {/* Test Role Switcher */}
          <button
            onClick={toggleTestRole}
            className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-400 hover:text-white px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 transition-all cursor-pointer"
            title="Toggle Role (Demo Mode)"
          >
            <RefreshCw size={11} className="text-purple-400" />
            <span className="hidden sm:inline">Switch Role</span>
          </button>

          {/* Timeline Link */}
          <button
            onClick={() => navigate(`/replay?room=${roomCode}`)}
            className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg border border-rose-800/40 bg-rose-950/20 hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <Flame size={13} />
            <span className="hidden sm:inline">Timeline</span>
          </button>
        </div>
      </header>

      {/* Profile Modal */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* 3. Main Split View: Monaco Editor + Test Sandbox Runner */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Monaco Editor (8 Cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-[#0c0e17] overflow-hidden shadow-2xl flex flex-col justify-between min-h-[360px] sm:min-h-[460px] relative">
            {lockedLines.length > 0 && (
              <div className="absolute top-12 inset-x-2 sm:inset-x-4 z-20 p-2.5 sm:p-3 rounded-xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 text-[11px] sm:text-xs font-mono font-bold flex items-center justify-between shadow-2xl animate-in slide-in-from-top-2">
                <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                  <LockKeyhole size={14} className="text-rose-400 animate-bounce shrink-0" />
                  <span className="truncate">FUNCTION LOCKED: Editing frozen!</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-rose-900 text-white font-mono text-[10px] sm:text-xs shrink-0">
                  {lockTimeLeft}s
                </span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-[#121422] border-b border-slate-800 text-[11px] sm:text-xs font-mono">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold truncate">
                  <Terminal size={13} className="shrink-0" />
                  <span className="truncate">{activeChallenge?.title || "challenge_solution.py"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-[11px] shrink-0">
                  {lockedLines.length > 0 ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                      <Lock size={11} /> Locked ({lockTimeLeft}s)
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={11} /> CRDT Live
                    </span>
                  )}
                </div>
              </div>

              <Editor
                height="340px"
                language="python"
                theme="vs-dark"
                value={code}
                onChange={handleCodeChange}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  window.monaco = monaco;
                }}
                options={{
                  readOnly: lockedLines.length > 0,
                  fontSize: 13,
                  minimap: { enabled: false },
                  automaticLayout: true,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
                  glyphMargin: true
                }}
              />
            </div>
          </div>

          {/* Right Sandbox Test Suite & Telemetry (4 Cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-[#0a0c14] p-5 flex flex-col justify-between space-y-4 shadow-2xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 uppercase">
                <span>Automated Test Suite</span>
                <span className="text-[10px] text-purple-400">Judge0 Isolated</span>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Test 1: Public Suite</div>
                    <div className="text-[10px] font-mono text-slate-500">Normal execution input</div>
                  </div>
                  {testStatus === "PASS" && <CheckCircle2 size={16} className="text-emerald-400" />}
                  {testStatus === "FAIL" && <XCircle size={16} className="text-rose-400" />}
                  {testStatus === "RUNNING" && <span className="text-xs text-amber-400 animate-spin">⏳</span>}
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Test 2: Edge Case Verification</div>
                    <div className="text-[10px] font-mono text-slate-500">Boundary parameter stress</div>
                  </div>
                  {testStatus === "PASS" && <CheckCircle2 size={16} className="text-emerald-400" />}
                  {testStatus === "FAIL" && <XCircle size={16} className="text-rose-400" />}
                  {testStatus === "RUNNING" && <span className="text-xs text-amber-400 animate-spin">⏳</span>}
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Test 3: Anti-Cheat Suite</span>
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded font-mono">HIDDEN</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">Hidden evaluation edge case</div>
                  </div>
                  {testStatus === "PASS" && <CheckCircle2 size={16} className="text-emerald-400" />}
                  {testStatus === "FAIL" && <XCircle size={16} className="text-rose-400" />}
                  {testStatus === "RUNNING" && <span className="text-xs text-amber-400 animate-spin">⏳</span>}
                </div>
              </div>

              {testOutput && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                    testStatus === "PASS"
                      ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/30 border-rose-500/40 text-rose-300"
                  }`}
                >
                  <div className="font-bold">{testStatus === "PASS" ? "✅ PASSED (+150 XP)" : "❌ FAILED"}</div>
                  <div className="text-[11px] leading-relaxed">{testOutput}</div>
                </div>
              )}
            </div>

            <button
              onClick={handleRunTests}
              disabled={testStatus === "RUNNING"}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-purple-950 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <Play size={14} className="fill-current" />
              <span>{testStatus === "RUNNING" ? "Executing Test Suite..." : "Run Test Suite"}</span>
            </button>
          </div>
        </div>

        {/* 4. Tactical Abilities Dock & Emergency Siren */}
        <section className="pt-2">
          <TacticalDeck
            role={activeRole}
            onTriggerAbility={handleTriggerAbility}
            onCallMeeting={handleCallEmergencyMeeting}
          />
        </section>
      </main>
    </div>
  );
}
