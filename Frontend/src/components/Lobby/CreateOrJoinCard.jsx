import React, { useState } from "react";
import { useGame } from "../../context/GameContext";
import CardSpotlight from "../ui/CardSpotlight";
import PinCodeInput from "../ui/PinCodeInput";
import ShimmerButton from "../ui/ShimmerButton";
import { PlusCircle, LogIn, Users, ShieldAlert, Sparkles, Terminal, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function CreateOrJoinCard() {
  const { createRoom, joinRoom, error, setError, isConnected } = useGame();

  const [activeTab, setActiveTab] = useState("create"); // 'create' | 'join'
  const [selectedDifficulty, setSelectedDifficulty] = useState("MEDIUM"); // 'EASY' | 'MEDIUM' | 'HARD'
  const [username, setUsername] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored)?.username || "" : "";
    } catch {
      return "";
    }
  });
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter your player codename.");
      return;
    }

    setIsLoading(true);

    if (activeTab === "create") {
      await createRoom(username.trim(), selectedDifficulty);
    } else {
      if (!roomCode.trim() || roomCode.trim().length < 6) {
        setError("Please enter the complete 6-character room code.");
        setIsLoading(false);
        return;
      }
      await joinRoom(roomCode.trim(), username.trim());
    }

    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <CardSpotlight
        spotlightColor={activeTab === "create" ? "rgba(168, 85, 247, 0.25)" : "rgba(6, 182, 212, 0.25)"}
        borderColor={activeTab === "create" ? "rgba(168, 85, 247, 0.5)" : "rgba(6, 182, 212, 0.5)"}
        className="p-6 sm:p-9 shadow-2xl"
      >
        {/* Header Badge */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-purple-400 text-xs font-mono font-semibold tracking-wider uppercase mb-3">
            <Terminal size={13} className="text-purple-400" />
            <span>Tactical Lobby Protocol</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {activeTab === "create" ? "Host a Challenge" : "Join Detective Squad"}
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-sm mx-auto">
            {activeTab === "create"
              ? "Initialize a room, choose challenge difficulty, and distribute secret roles."
              : "Enter the 6-character room key provided by your host."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800/90 mb-7">
          <button
            type="button"
            onClick={() => {
              setActiveTab("create");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "create"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <PlusCircle size={15} />
            Create Room
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("join");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "join"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LogIn size={15} />
            Join Room
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs sm:text-sm animate-in fade-in duration-200">
            <ShieldAlert size={16} className="shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Your Detective Codename
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={20}
                placeholder="e.g. CipherDev, Neo, Glitch"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
              <Users size={16} className="absolute right-4 top-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Difficulty Selector (Host Mode Only) */}
          {activeTab === "create" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Problem Difficulty & XP Bounty:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty("EASY")}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedDifficulty === "EASY"
                      ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.02]"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-bold">🟢 EASY</div>
                  <div className="text-[10px] font-mono text-emerald-400 mt-0.5">+500 XP</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDifficulty("MEDIUM")}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedDifficulty === "MEDIUM"
                      ? "bg-amber-950/60 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-[1.02]"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-bold">🟡 MEDIUM</div>
                  <div className="text-[10px] font-mono text-amber-400 mt-0.5">+850 XP</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDifficulty("HARD")}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedDifficulty === "HARD"
                      ? "bg-rose-950/60 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] scale-[1.02]"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-bold">🔴 HARD</div>
                  <div className="text-[10px] font-mono text-rose-400 mt-0.5">+1400 XP</div>
                </button>
              </div>
            </div>
          )}

          {/* 6-Box OTP PIN Input (Join Mode Only) */}
          {activeTab === "join" && (
            <div className="space-y-2 pt-1">
              <label className="block text-center text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Enter 6-Character Room Code
              </label>
              <PinCodeInput
                length={6}
                value={roomCode}
                onChange={setRoomCode}
                autoFocus={true}
                error={Boolean(error)}
              />
            </div>
          )}

          {/* Submit CTA */}
          <div className="pt-2">
            <ShimmerButton
              type="submit"
              disabled={isLoading}
              variant={activeTab === "create" ? "purple" : "cyan"}
              size="lg"
              className="w-full"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Synchronizing with Server...
                </span>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>{activeTab === "create" ? "Generate Lobby & Code" : "Enter Game Arena"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </ShimmerButton>
          </div>
        </form>

        {/* Live Status Bar */}
        <div className="mt-7 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-purple-400" />
            End-to-End WebSocket Sync
          </span>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className={isConnected ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
              {isConnected ? "Connected (:5000)" : "Connecting..."}
            </span>
          </div>
        </div>
      </CardSpotlight>
    </div>
  );
}
