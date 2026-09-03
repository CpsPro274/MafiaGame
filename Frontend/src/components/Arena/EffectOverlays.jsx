import React, { useState, useEffect } from "react";
import { Siren, AlertTriangle, Users, Check, X, ShieldAlert, Vote, Clock, Trophy, Flame, ArrowRight, Skull } from "lucide-react";

export function ScreenGlitchOverlay({ active }) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-red-950/20 backdrop-blur-[6px] mix-blend-color-dodge animate-pulse" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.7)_51%)] bg-[size:100%_4px] opacity-75" />

      <div className="relative z-10 px-8 py-4 rounded-2xl bg-slate-950/90 border-2 border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.6)] text-center space-y-2 animate-bounce">
        <div className="flex items-center justify-center gap-2 text-rose-400 font-mono font-black text-sm uppercase tracking-widest">
          <AlertTriangle size={18} />
          <span>MATRIX INTERFERENCE DETECTED</span>
        </div>
        <p className="text-xs font-mono text-slate-300">
          Screen buffers corrupted by unknown saboteur... Stabilizing in seconds.
        </p>
      </div>
    </div>
  );
}

export function EmergencyMeetingModal({
  isOpen,
  callerName,
  players = [],
  currentUsername,
  onCastVote,
  hasVoted,
  votes = {},
  timeLeft = 45
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl border-2 border-red-500/80 bg-[#0d070a] shadow-[0_0_80px_rgba(239,68,68,0.4)] p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Siren Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500 text-red-300 text-xs font-mono font-bold tracking-widest uppercase animate-pulse">
            <Siren size={15} className="text-red-400 animate-spin" />
            <span>EMERGENCY TRIBUNAL ACTIVE</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Meeting Called by <span className="text-red-400">{callerName || "Teammate"}</span>
          </h2>

          <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
            <Clock size={13} className="text-red-400" />
            <span>Voting concludes in <b className="text-white text-sm font-mono">{timeLeft}s</b></span>
          </div>
        </div>

        {/* Player Voting Grid */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Cast Your Elimination Vote:</span>
            <span>{hasVoted ? "Vote Recorded ✅" : "Select Suspect Below"}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
            {players.map((p) => {
              const isSelf = p.username === currentUsername;
              const voteCount = Object.values(votes).filter((v) => v === p.username).length;

              return (
                <button
                  key={p.username}
                  onClick={() => !hasVoted && !isSelf && onCastVote?.(p.username)}
                  disabled={hasVoted || isSelf}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    isSelf
                      ? "bg-slate-950/40 border-slate-900 opacity-60 cursor-not-allowed"
                      : hasVoted
                      ? "bg-slate-900/60 border-slate-800 cursor-not-allowed"
                      : "bg-[#160a0f] border-red-950 hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] cursor-pointer hover:scale-[1.02]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center font-bold text-white shadow-md">
                      {p.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{p.username}</span>
                        {isSelf && <span className="text-[10px] text-slate-500 font-mono">(YOU)</span>}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {p.isHost ? "Squad Host" : "Agent"}
                      </div>
                    </div>
                  </div>

                  {/* Vote Count Badge */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950 border border-red-900 text-xs font-mono font-bold text-red-400">
                    <Vote size={12} />
                    <span>{voteCount}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Skip Vote Button */}
        <div className="text-center pt-2 border-t border-red-950/80 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-500">
            {hasVoted ? "Waiting for remaining agents to vote..." : "Choose carefully. One wrong vote can cost the match."}
          </span>

          <button
            onClick={() => !hasVoted && onCastVote?.("SKIP")}
            disabled={hasVoted}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Skip Vote
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImpostorEjectionModal({
  isOpen,
  ejectedPlayer,
  wasMafia,
  onClose,
  onViewReplay
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-500">
      {/* Starfield space backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg rounded-3xl border-2 border-slate-800 bg-[#070912]/95 shadow-[0_0_100px_rgba(139,92,246,0.3)] p-8 text-center space-y-6 animate-in zoom-in-90 duration-300">
        {/* Animated Ejected Sprite Avatar */}
        <div className="relative w-28 h-28 mx-auto">
          <div className="w-full h-full rounded-3xl bg-gradient-to-tr from-purple-600 to-rose-600 p-1 animate-spin duration-1000 shadow-2xl">
            <div className="w-full h-full bg-[#0a0c16] rounded-[22px] flex items-center justify-center text-5xl">
              {wasMafia ? "🕵️‍♂️" : "👨‍💻"}
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 p-2 rounded-full bg-rose-600 text-white shadow-lg animate-bounce">
            <Skull size={16} />
          </div>
        </div>

        {/* Ejection Announcement */}
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {ejectedPlayer || "Agent"} was ejected.
          </h2>

          <div className="py-2">
            {wasMafia ? (
              <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-mono text-sm font-bold shadow-lg shadow-emerald-950">
                🎉 {ejectedPlayer} WAS The Secret Cyber Mafia!
                <div className="text-xs text-slate-400 font-normal mt-1">
                  0 Mafia Remaining • DEVELOPER VICTORY! (+300 XP Awarded)
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 font-mono text-sm font-bold shadow-lg shadow-rose-950">
                💀 {ejectedPlayer} was NOT The Mafia!
                <div className="text-xs text-slate-400 font-normal mt-1">
                  1 Mafia Still Infiltrating the Codebase...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onViewReplay}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-950 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Flame size={15} />
            <span>View Forensic Time-Machine Replay</span>
            <ArrowRight size={14} />
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Continue Match
          </button>
        </div>
      </div>
    </div>
  );
}
