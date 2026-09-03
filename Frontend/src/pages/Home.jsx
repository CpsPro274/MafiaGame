import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import CyberBackground from "../components/ui/CyberBackground";
import HologramRoleCards from "../components/Landing/HologramRoleCards";
import InteractiveGameDemo from "../components/Landing/InteractiveGameDemo";
import LiveMatchTicker from "../components/Landing/LiveMatchTicker";
import ProfileModal from "../components/Profile/ProfileModal";
import PinCodeInput from "../components/ui/PinCodeInput";
import ShimmerButton from "../components/ui/ShimmerButton";
import {
  Code2,
  PlusCircle,
  LogIn,
  Users,
  Shield,
  Eye,
  Sparkles,
  ArrowRight,
  Terminal,
  Activity,
  Flame,
  Radio,
  Play,
  HelpCircle,
  Cpu,
  Lock,
  Zap,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, error, setError, isConnected } = useGame();

  const [quickUsername, setQuickUsername] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored)?.username || "" : "";
    } catch {
      return "";
    }
  });
  const [quickRoomCode, setQuickRoomCode] = useState("");
  const [activeTab, setActiveTab] = useState("host"); // 'host' | 'join'
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleAction = async (e) => {
    e.preventDefault();
    setError(null);

    if (!quickUsername.trim()) {
      setError("Please enter your player codename.");
      return;
    }

    setLoading(true);
    if (activeTab === "host") {
      const res = await createRoom(quickUsername.trim());
      if (res?.success) navigate("/lobby");
    } else {
      if (!quickRoomCode || quickRoomCode.length < 6) {
        setError("Please enter the complete 6-character room code.");
        setLoading(false);
        return;
      }
      const res = await joinRoom(quickRoomCode.trim(), quickUsername.trim());
      if (res?.success) navigate("/lobby");
    }
    setLoading(false);
  };

  const handleSelectRoomFromTicker = (code) => {
    setActiveTab("join");
    setQuickRoomCode(code);
    const launcherEl = document.getElementById("game-launcher");
    launcherEl?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 font-sans selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
      {/* Laser Horizon & Ambient Cyber Grid */}
      <CyberBackground />

      {/* TOP LIVE SYSTEM STATUS BAR */}
      <div className="relative z-20 border-b border-[#181b2a]/80 bg-[#080a11]/90 backdrop-blur-md px-4 sm:px-8 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className={isConnected ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {isConnected ? "US-EAST // ONLINE (:5000)" : "CONNECTING..."}
            </span>
          </div>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">CRDT LATENCY: &lt;18MS</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/replay")}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors font-bold cursor-pointer"
          >
            <Flame size={13} className="text-rose-400 animate-pulse" />
            <span>TIME MACHINE REPLAY</span>
          </button>
          <span className="text-slate-700">|</span>
          <button
            onClick={() => setProfileOpen(true)}
            className="text-purple-400 hover:text-purple-300 font-bold transition-colors cursor-pointer"
          >
            CAREER STATS
          </button>
          <span className="text-slate-700">|</span>
          <button
            onClick={() => navigate("/login")}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            LOGIN / REGISTER
          </button>
        </div>
      </div>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* TOP NAVBAR */}
      <header className="relative z-20 border-b border-[#151828] bg-[#070912]/80 backdrop-blur-xl px-4 sm:px-8 py-4 sticky top-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <div className="w-full h-full bg-[#080a11] rounded-[10px] flex items-center justify-center font-mono font-black text-cyan-400 text-sm">
                &gt;_
              </div>
            </div>
            <div>
              <div className="font-black tracking-wider text-base text-white flex items-center gap-2">
                CODE MAFIA
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/60 font-bold">
                  ARENA
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Multiplayer Collaborative Debugging Tournament
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const el = document.getElementById("role-dossier");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-xs font-semibold px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <HelpCircle size={14} />
              <span>Roles & Rules</span>
            </button>

            <ShimmerButton
              onClick={() => navigate("/lobby")}
              variant="purple"
              size="sm"
            >
              Enter Lobby
            </ShimmerButton>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-20">
        {/* HERO SECTION (Split Launch Card) */}
        <section id="game-launcher" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Statement (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <Zap size={13} className="text-amber-400 animate-pulse" />
              <span>Fix the Code. Catch the Traitor.</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.08]">
              Multiplayer Coding with a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-purple-400">
                Secret Saboteur
              </span>
              .
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl font-normal">
              4 to 8 developers collaborate inside a live Monaco editor to debug a broken software system and pass automated test suites. But one team member is secretly the Mafia — planting stealth regressions without getting caught.
            </p>

            {/* Quick Specs Badges */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl border border-slate-800/90 bg-[#0b0e18]/80 backdrop-blur-md">
                <div className="text-base sm:text-lg font-black font-mono text-cyan-400">4-8 Players</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Multiplayer Rooms</div>
              </div>
              <div className="p-3.5 rounded-2xl border border-slate-800/90 bg-[#0b0e18]/80 backdrop-blur-md">
                <div className="text-base sm:text-lg font-black font-mono text-purple-400">Monaco IDE</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Real-Time CRDT Sync</div>
              </div>
              <div className="p-3.5 rounded-2xl border border-slate-800/90 bg-[#0b0e18]/80 backdrop-blur-md">
                <div className="text-base sm:text-lg font-black font-mono text-rose-400">Time-Machine</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Git-Blame Replay</div>
              </div>
            </div>
          </div>

          {/* Right Action Matchmaking Card (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-purple-500/30 bg-[#0c0e1a]/90 shadow-[0_0_50px_rgba(139,92,246,0.15)] backdrop-blur-2xl p-6 sm:p-7 space-y-6">
              {/* Box Title */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-2 font-black text-white text-sm uppercase tracking-wider font-mono">
                  <Play size={15} className="text-purple-400" />
                  <span>Match Control Center</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">Instant Launch</span>
              </div>

              {/* Tab Selector */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#06080e] rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("host");
                    setError(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "host"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-950"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Host New Match
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("join");
                    setError(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "join"
                      ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Join via 6-Digit Key
                </button>
              </div>

              {/* Error Notice */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Launcher Form */}
              <form onSubmit={handleAction} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase font-bold mb-1.5">
                    Your Player Codename
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="e.g. CyberDev, Neo, Glitch"
                    value={quickUsername}
                    onChange={(e) => setQuickUsername(e.target.value)}
                    className="w-full bg-[#06080e] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {activeTab === "join" && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-mono text-slate-300 uppercase font-bold text-center">
                      6-Character Room Key
                    </label>
                    <PinCodeInput
                      length={6}
                      value={quickRoomCode}
                      onChange={setQuickRoomCode}
                      autoFocus={true}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm text-white shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === "host"
                      ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:shadow-purple-600/30"
                      : "bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 hover:shadow-cyan-600/30"
                  } ${loading ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"}`}
                >
                  {loading ? (
                    <span>Synchronizing with Server...</span>
                  ) : (
                    <>
                      <span>{activeTab === "host" ? "Generate Lobby & Room Code" : "Enter Game Arena"}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* LIVE SERVER BROWSER TICKER */}
        <section className="pt-2">
          <LiveMatchTicker onSelectRoom={handleSelectRoomFromTicker} />
        </section>

        {/* PLAYABLE INTERACTIVE CODE SANDBOX */}
        <section className="space-y-4 text-center pt-6">
          <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
            <Activity size={14} className="text-purple-400" />
            <span>Interactive Live Sandbox Preview (Try It Now)</span>
          </div>
          <InteractiveGameDemo />
        </section>

        {/* HOLOGRAPHIC ROLE CARDS (Developer vs Mafia) */}
        <section id="role-dossier" className="space-y-6 pt-10 border-t border-slate-900">
          <div className="text-center space-y-2">
            <div className="text-xs font-mono text-purple-400 uppercase font-bold tracking-widest">
              Classified Directives & Abilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Tactical Role Breakdown
            </h2>
          </div>
          <HologramRoleCards />
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-900 bg-[#05060a] py-8 px-4 sm:px-8 text-center text-xs text-slate-500 font-mono">
        <p>© 2026 CODE MAFIA • Multiplayer Collaborative Debugging & Social Deception Tournament</p>
      </footer>
    </div>
  );
}