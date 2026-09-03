import React, { useState } from "react";
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
  Zap
} from "lucide-react";

export default function InteractiveGameDemo() {
  const [role, setRole] = useState("DEVELOPER"); // 'DEVELOPER' | 'MAFIA'
  const [code, setCode] = useState(
`def calculate_cart_total(items, discount_pct):
    subtotal = 0
    # BUG: Range index goes 1 too far (IndexError)
    for i in range(len(items) + 1):
        subtotal += items[i]["price"] * items[i]["qty"]
    
    # Calculate discount & final total
    total = subtotal - (subtotal * discount_pct / 100)
    return total`
  );

  const [testResult, setTestResult] = useState(null); // null | 'RUNNING' | 'FAIL' | 'PASS'
  const [sabotaged, setSabotaged] = useState(false);

  const handleRunTests = () => {
    setTestResult("RUNNING");
    setTimeout(() => {
      if (code.includes("len(items) + 1") || code.includes("return 0") || sabotaged) {
        setTestResult("FAIL");
      } else if (code.includes("range(len(items))") || code.includes("for item in items:")) {
        setTestResult("PASS");
      } else {
        setTestResult("FAIL");
      }
    }, 600);
  };

  const handleAutoFix = () => {
    setCode(
`def calculate_cart_total(items, discount_pct):
    subtotal = 0
    # FIXED: Clean loop over items
    for item in items:
        subtotal += item["price"] * item["qty"]
    
    # Calculate discount & final total
    total = subtotal - (subtotal * discount_pct / 100)
    return round(total, 2)`
    );
    setSabotaged(false);
    setTestResult(null);
  };

  const handleSabotage = () => {
    setCode(
`def calculate_cart_total(items, discount_pct):
    subtotal = 0
    for item in items:
        subtotal += item["price"] * item["qty"]
    
    # 🕵️ MAFIA SABOTAGE: Subtle tax penalty injected
    subtotal += (subtotal * 0.18) # hidden inflation bug!
    return subtotal - (subtotal * discount_pct / 100)`
    );
    setSabotaged(true);
    setTestResult(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-[#0c0d14] shadow-2xl overflow-hidden font-sans">
      {/* Top Bar / Role Switcher HUD */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 pl-2 border-l border-slate-800 flex items-center gap-2">
            <Terminal size={14} className="text-purple-400" />
            challenge_room_#8X2K.py
          </span>
        </div>

        {/* Live Role Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">
            Interactive POV:
          </span>
          <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => setRole("DEVELOPER")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                role === "DEVELOPER"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Shield size={13} />
              Developer POV
            </button>
            <button
              onClick={() => setRole("MAFIA")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                role === "MAFIA"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye size={13} />
              Secret Mafia POV
            </button>
          </div>
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
        {/* Left Code Editor View (8 Cols) */}
        <div className="lg:col-span-8 p-5 bg-[#090a0f] border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Collaborative Buffer (3 Players Live)
              </span>
              <span>Python 3.11</span>
            </div>

            {/* Code Textarea / Display */}
            <div className="relative">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={10}
                spellCheck={false}
                className="w-full bg-[#050608] border border-slate-800/80 rounded-xl p-4 font-mono text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-purple-500/80 transition-colors resize-none leading-relaxed selection:bg-purple-500/30"
              />

              {/* Multi-User Cursor Indicators */}
              <div className="absolute top-12 right-6 pointer-events-none hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-mono text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                Alice (Dev) editing Line 4
              </div>

              {role === "MAFIA" && (
                <div className="absolute bottom-6 right-6 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-[11px] font-mono text-rose-300 font-bold shadow-lg shadow-rose-950">
                  🕵️ Stealth Mode Active • Avoid Detection
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              {role === "DEVELOPER" ? (
                <button
                  onClick={handleAutoFix}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Sparkles size={13} />
                  Auto-Apply Fix
                </button>
              ) : (
                <button
                  onClick={handleSabotage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Bug size={13} />
                  Plant Subtle Bug
                </button>
              )}

              <button
                onClick={() => {
                  setCode(
`def calculate_cart_total(items, discount_pct):
    subtotal = 0
    # BUG: Range index goes 1 too far (IndexError)
    for i in range(len(items) + 1):
        subtotal += items[i]["price"] * items[i]["qty"]
    
    # Calculate discount & final total
    total = subtotal - (subtotal * discount_pct / 100)
    return total`
                  );
                  setTestResult(null);
                  setSabotaged(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
                title="Reset Code"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>

            {/* Run Tests CTA */}
            <button
              onClick={handleRunTests}
              disabled={testResult === "RUNNING"}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              {testResult === "RUNNING" ? (
                <span>Executing Sandbox...</span>
              ) : (
                <>
                  <Play size={13} className="fill-current" />
                  <span>Run Sandbox Tests</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Sandbox Test Suite & Event Stream (4 Cols) */}
        <div className="lg:col-span-4 p-5 bg-[#0e1017] flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 uppercase">
              <span>Automated Test Suite</span>
              <span className="text-[10px] text-purple-400">Judge0 Isolated Runner</span>
            </div>

            {/* Test Cases Status Cards */}
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Test 1: Normal Cart Discount</div>
                  <div className="text-[10px] font-mono text-slate-500">items=[(50, 2)], disc=10% ➔ exp 90</div>
                </div>
                {testResult === "RUNNING" && <span className="text-xs text-amber-400 animate-spin">⏳</span>}
                {testResult === "PASS" && <CheckCircle2 size={16} className="text-emerald-400" />}
                {testResult === "FAIL" && <XCircle size={16} className="text-rose-400" />}
                {!testResult && <span className="text-[10px] font-mono text-slate-600">Pending</span>}
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Test 2: Empty Cart Handling</div>
                  <div className="text-[10px] font-mono text-slate-500">items=[] ➔ exp 0</div>
                </div>
                {testResult === "RUNNING" && <span className="text-xs text-amber-400 animate-spin">⏳</span>}
                {testResult === "PASS" && <CheckCircle2 size={16} className="text-emerald-400" />}
                {testResult === "FAIL" && <XCircle size={16} className="text-rose-400" />}
                {!testResult && <span className="text-[10px] font-mono text-slate-600">Pending</span>}
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>Test 3: Zero Out-of-Bounds</span>
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded font-mono">HIDDEN</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">Boundary stress verification</div>
                </div>
                {testResult === "RUNNING" && <span className="text-xs text-amber-400 animate-spin">⏳</span>}
                {testResult === "PASS" && <CheckCircle2 size={16} className="text-emerald-400" />}
                {testResult === "FAIL" && <XCircle size={16} className="text-rose-400" />}
                {!testResult && <span className="text-[10px] font-mono text-slate-600">Pending</span>}
              </div>
            </div>

            {/* Live Test Outcome Banner */}
            {testResult === "FAIL" && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-400">
                  <XCircle size={14} /> Tests Failed (IndexError)
                </div>
                <p className="text-[11px] text-slate-400">
                  {role === "MAFIA"
                    ? "😈 Success! You successfully broke the tests without suspicion."
                    : "⚠️ Loop index exceeded list length. Fix the loop range to pass!"}
                </p>
              </div>
            )}

            {testResult === "PASS" && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={14} /> All 3 Tests Passed!
                </div>
                <p className="text-[11px] text-slate-400">
                  Developers stabilized the codebase. Ready for deployment!
                </p>
              </div>
            )}
          </div>

          {/* Quick Tip Footer */}
          <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span>Try clicking "Auto-Apply Fix" or "Plant Subtle Bug"</span>
            <Zap size={11} className="text-amber-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
