import React, { useState, useEffect } from "react";
import {
  Eye,
  Shield,
  Zap,
  Lock,
  Radio,
  Bug,
  AlertTriangle,
  Siren,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock
} from "lucide-react";

export default function TacticalDeck({
  role = "MAFIA", // 'MAFIA' | 'DEVELOPER'
  onTriggerAbility,
  onCallMeeting,
  meetingUsed = false
}) {
  // Cooldown timers in seconds (0 = ready)
  const [cooldowns, setCooldowns] = useState({
    SCREEN_GLITCH: 0,
    FALSE_GREEN: 0,
    FUNCTION_LOCK: 0,
    CODE_RADAR: 0
  });

  // Cooldown countdown interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const key of Object.keys(next)) {
          if (next[key] > 0) {
            next[key] -= 1;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleUseAbility = (abilityName, cooldownSec) => {
    if (cooldowns[abilityName] > 0) return;
    setCooldowns((prev) => ({ ...prev, [abilityName]: cooldownSec }));
    onTriggerAbility?.(abilityName);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="rounded-2xl border border-slate-800 bg-[#0b0d17]/95 shadow-2xl backdrop-blur-xl p-3 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left Role Identity */}
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-md shrink-0 ${
              role === "MAFIA"
                ? "bg-rose-500 text-slate-950 shadow-rose-950/60 animate-pulse"
                : "bg-cyan-500 text-slate-950 shadow-cyan-950/60"
            }`}
          >
            {role === "MAFIA" ? "🕵️" : "👨‍💻"}
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
              {role === "MAFIA" ? "TACTICAL SABOTAGE DECK" : "TACTICAL COUNTER-MEASURES"}
            </div>
            <div className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
              <span>{role === "MAFIA" ? "Secret Mafia Abilities" : "Developer Tools"}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Deck (Responsive Grid on Mobile) */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {role === "MAFIA" ? (
            /* MAFIA ABILITIES */
            <>
              {/* Ability 1: Screen Glitch */}
              <button
                onClick={() => handleUseAbility("SCREEN_GLITCH", 60)}
                disabled={cooldowns.SCREEN_GLITCH > 0}
                className={`group relative flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  cooldowns.SCREEN_GLITCH > 0
                    ? "bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-rose-950/40 border-rose-500/50 hover:bg-rose-900/60 text-rose-300 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95"
                }`}
              >
                <Zap size={14} className={cooldowns.SCREEN_GLITCH === 0 ? "text-rose-400 animate-bounce shrink-0" : "shrink-0"} />
                <span className="truncate">Screen Glitch</span>
                {cooldowns.SCREEN_GLITCH > 0 && (
                  <span className="font-mono text-[10px] bg-slate-900 px-1 rounded text-rose-400 font-bold ml-auto">
                    {cooldowns.SCREEN_GLITCH}s
                  </span>
                )}
              </button>

              {/* Ability 2: False Green */}
              <button
                onClick={() => handleUseAbility("FALSE_GREEN", 90)}
                disabled={cooldowns.FALSE_GREEN > 0}
                className={`group relative flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  cooldowns.FALSE_GREEN > 0
                    ? "bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-emerald-950/30 border-emerald-500/40 hover:bg-emerald-900/40 text-emerald-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95"
                }`}
              >
                <CheckCircle2 size={14} className={cooldowns.FALSE_GREEN === 0 ? "text-emerald-400 shrink-0" : "shrink-0"} />
                <span className="truncate">False Green</span>
                {cooldowns.FALSE_GREEN > 0 && (
                  <span className="font-mono text-[10px] bg-slate-900 px-1 rounded text-emerald-400 font-bold ml-auto">
                    {cooldowns.FALSE_GREEN}s
                  </span>
                )}
              </button>

              {/* Ability 3: Function Lock */}
              <button
                onClick={() => handleUseAbility("FUNCTION_LOCK", 45)}
                disabled={cooldowns.FUNCTION_LOCK > 0}
                className={`group relative flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  cooldowns.FUNCTION_LOCK > 0
                    ? "bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-purple-950/40 border-purple-500/50 hover:bg-purple-900/60 text-purple-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-105 active:scale-95"
                }`}
              >
                <Lock size={14} className={cooldowns.FUNCTION_LOCK === 0 ? "text-purple-400 shrink-0" : "shrink-0"} />
                <span className="truncate">Function Lock</span>
                {cooldowns.FUNCTION_LOCK > 0 && (
                  <span className="font-mono text-[10px] bg-slate-900 px-1 rounded text-purple-400 font-bold ml-auto">
                    {cooldowns.FUNCTION_LOCK}s
                  </span>
                )}
              </button>
            </>
          ) : (
            /* DEVELOPER ABILITIES */
            <>
              {/* Radar Counter-Ability */}
              <button
                onClick={() => handleUseAbility("CODE_RADAR", 30)}
                disabled={cooldowns.CODE_RADAR > 0}
                className={`group relative flex items-center justify-center sm:justify-start gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  cooldowns.CODE_RADAR > 0
                    ? "bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-amber-950/40 border-amber-500/50 hover:bg-amber-900/60 text-amber-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95"
                }`}
              >
                <Radio size={14} className={cooldowns.CODE_RADAR === 0 ? "text-amber-400 animate-pulse shrink-0" : "shrink-0"} />
                <span className="truncate">Code Radar Scan</span>
                {cooldowns.CODE_RADAR > 0 && (
                  <span className="font-mono text-[10px] bg-slate-900 px-1 rounded text-amber-400 font-bold ml-auto">
                    {cooldowns.CODE_RADAR}s
                  </span>
                )}
              </button>
            </>
          )}

          {/* Emergency Siren Button (Spans Full on Mobile) */}
          <button
            onClick={onCallMeeting}
            disabled={meetingUsed}
            className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all shadow-lg cursor-pointer ${
              meetingUsed
                ? "bg-slate-950 border border-slate-800 text-slate-600 cursor-not-allowed"
                : "bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white hover:shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:scale-105 active:scale-95"
            }`}
          >
            <Siren size={15} className={meetingUsed ? "shrink-0" : "animate-spin shrink-0"} />
            <span className="truncate">{meetingUsed ? "Meeting Spent (1/1)" : "EMERGENCY MEETING"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
