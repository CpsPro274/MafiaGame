import React, { useState } from "react";
import { useGame } from "../../context/GameContext";
import CardSpotlight from "../ui/CardSpotlight";
import ShimmerButton from "../ui/ShimmerButton";
import {
  Crown,
  Users,
  Copy,
  Check,
  Play,
  LogOut,
  Shield,
  Bug,
  Vote,
  Sparkles,
  AlertCircle,
  Radio,
  Clock,
  Code2,
  Zap
} from "lucide-react";

export default function WaitingRoom() {
  const { currentRoom, isHost, startGame, setDifficulty, leaveRoom, socket, error, setError } = useGame();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  if (!currentRoom) return null;

  const players = currentRoom.players || [];
  const minPlayersMet = players.length >= 1;
  const currentDiff = currentRoom.difficulty || "MEDIUM";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentRoom.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    if (!isHost) return;
    setIsStarting(true);
    const res = await startGame();
    if (!res.success) {
      setError(res.error || "Failed to start match.");
      setIsStarting(false);
    }
  };

  const avatarGradients = [
    "from-purple-500 to-indigo-600 border-purple-400",
    "from-cyan-500 to-blue-600 border-cyan-400",
    "from-emerald-500 to-teal-600 border-emerald-400",
    "from-rose-500 to-pink-600 border-rose-400",
    "from-amber-500 to-orange-600 border-amber-400",
    "from-fuchsia-500 to-purple-600 border-fuchsia-400",
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Header Card */}
      <CardSpotlight
        spotlightColor="rgba(168, 85, 247, 0.2)"
        borderColor="rgba(168, 85, 247, 0.4)"
        className="p-6 sm:p-8"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-purple-400 uppercase tracking-widest mb-1.5">
              <Radio size={14} className="text-emerald-400 animate-pulse" />
              <span>Multiplayer Session Live</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Squad Briefing Room ({players.length}/{currentRoom.maxPlayers || 8})
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Share the Room Key with your crew to join the collaborative challenge.
            </p>
          </div>

          {/* Room Key Badge */}
          <div className="flex items-center gap-3 bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 shadow-xl">
            <div>
              <div className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider">
                Room Key
              </div>
              <div className="text-2xl font-mono font-black tracking-widest text-cyan-300">
                {currentRoom.roomCode}
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Copy Room Key"
            >
              {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </CardSpotlight>

      {/* Difficulty Setting Banner */}
      <div className="p-4 rounded-2xl bg-[#0c0e1a] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Zap size={16} />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-slate-400">
              Match Difficulty & XP Bounty
            </div>
            <div className="font-bold text-sm text-white flex items-center gap-2">
              <span className={
                currentDiff === "EASY" ? "text-emerald-400" : currentDiff === "HARD" ? "text-rose-400" : "text-amber-400"
              }>
                {currentDiff} DIFFICULTY
              </span>
              <span className="text-xs font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded-full border border-purple-800">
                {currentDiff === "EASY" ? "+500 XP" : currentDiff === "HARD" ? "+1400 XP" : "+850 XP"}
              </span>
            </div>
          </div>
        </div>

        {/* Host Difficulty Controls */}
        {isHost ? (
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold font-mono">
            {["EASY", "MEDIUM", "HARD"].map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficulty?.(diff)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  currentDiff === diff
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs font-mono text-slate-500">Selected by Squad Host</span>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-sm">
          <AlertCircle size={17} className="shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Squad Grid & Briefing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Players List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={15} className="text-cyan-400" />
              Connected Agents ({players.length})
            </h3>
            <span className="text-xs text-slate-500 font-mono">Ready to Deploy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {players.map((p, idx) => {
              const isYou = p.socketId === socket.id;
              const gradient = avatarGradients[idx % avatarGradients.length];

              return (
                <div
                  key={p.socketId || idx}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                    isYou
                      ? "bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-950/40"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} border flex items-center justify-center text-white font-extrabold text-base shadow-md`}
                    >
                      {p.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        {p.username}
                        {isYou && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded-md font-mono font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {p.isHost ? "Squad Host 👑" : "Agent Ready"}
                      </div>
                    </div>
                  </div>

                  {p.isHost && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shadow-sm">
                      <Crown size={16} />
                    </div>
                  )}
                </div>
              );
            })}

            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center p-4 rounded-xl border border-dashed border-slate-800/80 bg-slate-950/30 text-slate-600 text-xs font-mono"
              >
                Waiting for incoming agent...
              </div>
            ))}
          </div>
        </div>

        {/* Objectives */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Shield size={15} className="text-purple-400" />
            Classified Directives
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1">
              <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Code2 size={14} /> 👨‍💻 Developers (+500 XP)
              </div>
              <p className="text-slate-400 leading-relaxed">
                Work as a team on the live editor to debug flaws, stabilize the codebase, and pass all automated tests.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1">
              <div className="font-bold text-rose-400 flex items-center gap-1.5">
                <Vote size={14} /> 🕵️‍♂️ Secret Mafia (+600 XP)
              </div>
              <p className="text-slate-400 leading-relaxed">
                Stealthily introduce regressions or protect existing bugs without arousing suspicion during emergency meetings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
        <button
          type="button"
          onClick={leaveRoom}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
        >
          <LogOut size={16} />
          Leave Squad
        </button>

        {isHost ? (
          <ShimmerButton
            onClick={handleStartGame}
            disabled={!minPlayersMet || isStarting}
            variant={minPlayersMet ? "emerald" : "slate"}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isStarting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                Deploying Mission...
              </span>
            ) : (
              <>
                <Play size={16} className="fill-current" />
                <span>DEPLOY SQUAD (START MATCH)</span>
              </>
            )}
          </ShimmerButton>
        ) : (
          <div className="text-xs text-slate-400 flex items-center gap-2 italic bg-slate-900/60 border border-slate-800 px-4 py-2.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Standing by for Host to initiate deployment...
          </div>
        )}
      </div>
    </div>
  );
}
