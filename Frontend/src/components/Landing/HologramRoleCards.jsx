import React, { useState } from "react";
import { Shield, Eye, Bug, Code2, Sparkles, Terminal, Cpu, Zap, Radio, CheckCircle, AlertTriangle } from "lucide-react";

export default function HologramRoleCards() {
  const [activeRole, setActiveRole] = useState("MAFIA");

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Role Switcher Pill */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setActiveRole("DEV")}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeRole === "DEV"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] scale-105"
              : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white"
          }`}
        >
          <Shield size={16} className="text-cyan-400" />
          <span>👨‍💻 The Developer Operative</span>
        </button>

        <button
          onClick={() => setActiveRole("MAFIA")}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            activeRole === "MAFIA"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.3)] scale-105"
              : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white"
          }`}
        >
          <Eye size={16} className="text-rose-400" />
          <span>🕵️‍♂️ The Secret Cyber Mafia</span>
        </button>
      </div>

      {/* Holographic Card Stage */}
      <div className="relative">
        {activeRole === "DEV" ? (
          /* DEVELOPER HUD CARD */
          <div className="relative rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-[#080d18] via-[#0b1222] to-[#060911] p-6 sm:p-10 shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Ambient Cyan Flare */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              {/* Left Persona & Avatar */}
              <div className="lg:col-span-4 text-center lg:text-left space-y-4">
                <div className="w-24 h-24 mx-auto lg:mx-0 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-blue-500 p-0.5 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                  <div className="w-full h-full bg-[#070c16] rounded-[14px] flex items-center justify-center text-4xl">
                    👨‍💻
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                    PRIMARY OBJECTIVE
                  </div>
                  <h3 className="text-2xl font-black text-white mt-1">Codebase Guardian</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Stabilize broken production code, identify sabotage attempts, and eliminate infiltrators.
                  </p>
                </div>
              </div>

              {/* Center Tactical Specs & Abilities (8 Cols) */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Stat 1 */}
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-400 font-bold">
                    <span>LIVE IDE SYNC</span>
                    <Code2 size={15} />
                  </div>
                  <div className="text-2xl font-black font-mono text-white">Monaco</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Real-time multi-cursor collaboration with instant CRDT buffer updates.
                  </p>
                </div>

                {/* Stat 2 */}
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-400 font-bold">
                    <span>TEST RUNNER</span>
                    <Cpu size={15} />
                  </div>
                  <div className="text-2xl font-black font-mono text-white">3-Sec Isolation</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Automated sandbox test verification against public and hidden test suites.
                  </p>
                </div>

                {/* Stat 3 */}
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-400 font-bold">
                    <span>COUNTER-INTEL</span>
                    <Radio size={15} />
                  </div>
                  <div className="text-2xl font-black font-mono text-white">Emergency Siren</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Sound emergency alarms to freeze editing, debate suspicious diffs, and vote.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MAFIA HUD CARD */
          <div className="relative rounded-3xl border border-rose-500/40 bg-gradient-to-br from-[#14080e] via-[#1a0b12] to-[#090507] p-6 sm:p-10 shadow-[0_0_50px_rgba(244,63,94,0.2)] backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Ambient Rose Flare */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              {/* Left Persona & Avatar */}
              <div className="lg:col-span-4 text-center lg:text-left space-y-4">
                <div className="w-24 h-24 mx-auto lg:mx-0 rounded-2xl bg-gradient-to-tr from-rose-600 via-red-600 to-amber-500 p-0.5 shadow-[0_0_30px_rgba(244,63,94,0.4)] animate-pulse">
                  <div className="w-full h-full bg-[#12070c] rounded-[14px] flex items-center justify-center text-4xl">
                    🕵️‍♂️
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-rose-400 uppercase tracking-widest font-bold">
                    CLASSIFIED DIRECTIVE
                  </div>
                  <h3 className="text-2xl font-black text-white mt-1">Undercover Saboteur</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Inject stealth regressions, corrupt calculations, and divert suspicion during voting tribunals.
                  </p>
                </div>
              </div>

              {/* Center Tactical Specs & Abilities (8 Cols) */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Ability 1 */}
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-rose-400 font-bold">
                    <span>STEALTH REFACTOR</span>
                    <Bug size={15} />
                  </div>
                  <div className="text-2xl font-black font-mono text-white">Subtle Regressions</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Plant plausible edge-case bugs that fail hidden test suites without arousing suspicion.
                  </p>
                </div>

                {/* Ability 2 */}
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-rose-400 font-bold">
                    <span>SABOTAGE DECK</span>
                    <Zap size={15} />
                  </div>
                  <div className="text-2xl font-black font-mono text-white">Screen Glitch</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Trigger matrix fog to blur developers' code editors while you plant the exploit.
                  </p>
                </div>

                {/* Ability 3 */}
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-rose-400 font-bold">
                    <span>DECEPTION MATRIX</span>
                    <Eye size={15} />
                  </div>
                  <div className="text-2xl font-black font-mono text-white">Frame Innocents</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Manipulate git diffs and deflect blame during emergency votes to get devs ejected.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
