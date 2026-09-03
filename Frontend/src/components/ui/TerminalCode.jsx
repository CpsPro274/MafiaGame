import React, { useState, useEffect } from "react";
import { Terminal, Check, X, Bug, ShieldAlert, Cpu } from "lucide-react";

export function TerminalCode({ className = "" }) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      action: "Developer 'Alice' joined room #7XGRJT",
      type: "info",
    },
    {
      action: "Analyzing broken project: cart_discount.py...",
      type: "process",
    },
    {
      action: "🔴 BUG DETECTED: Line 14: tax applied before discount",
      type: "bug",
    },
    {
      action: "🟢 Alice patched Line 14: subtotal * (1 - discount)",
      type: "fix",
    },
    {
      action: "🕵️ Mafia 'Ghost' stealthily modified Line 22: loop index out-of-bounds",
      type: "sabotage",
    },
    {
      action: "🚨 Tests: 2 PASSED | 1 FAILED (Regression)",
      type: "alert",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl backdrop-blur-xl overflow-hidden font-mono text-xs ${className}`}>
      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
            <Cpu size={12} className="text-purple-400" />
            live-debugging-session.py — 60 FPS
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Multiplayer Active
        </div>
      </div>

      {/* Code Block / Activity Stream */}
      <div className="p-4 sm:p-5 space-y-2.5 min-h-[220px]">
        {steps.slice(0, activeStep + 1).map((step, idx) => {
          let badgeColor = "text-slate-400 bg-slate-800/60 border-slate-700";
          let icon = <Terminal size={12} />;

          if (step.type === "bug") {
            badgeColor = "text-rose-400 bg-rose-950/40 border-rose-800/40";
            icon = <Bug size={12} />;
          } else if (step.type === "fix") {
            badgeColor = "text-emerald-400 bg-emerald-950/40 border-emerald-800/40";
            icon = <Check size={12} />;
          } else if (step.type === "sabotage") {
            badgeColor = "text-purple-400 bg-purple-950/40 border-purple-800/40";
            icon = <ShieldAlert size={12} />;
          } else if (step.type === "alert") {
            badgeColor = "text-amber-400 bg-amber-950/40 border-amber-800/40";
            icon = <X size={12} />;
          }

          return (
            <div
              key={idx}
              className="flex items-start gap-2.5 animate-in fade-in slide-in-from-left-2 duration-300"
            >
              <span className="text-slate-600 select-none">{String(idx + 1).padStart(2, "0")}</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] ${badgeColor}`}>
                {icon}
                {step.action}
              </span>
            </div>
          );
        })}

        {/* Blinking Cursor */}
        <div className="flex items-center gap-2 pt-1 text-slate-500 text-[11px]">
          <span className="text-purple-400 font-bold">$</span>
          <span className="text-slate-400">waiting for next collaborator keystroke...</span>
          <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default TerminalCode;
