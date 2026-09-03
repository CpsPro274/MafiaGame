import React, { useRef, useEffect } from "react";

export function PinCodeInput({ length = 6, value = "", onChange, autoFocus = false, error = false }) {
  const inputRefs = useRef([]);

  const chars = value.padEnd(length, "").slice(0, length).split("");

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newChars = [...chars];
      if (newChars[index] && newChars[index] !== " ") {
        newChars[index] = "";
      } else if (index > 0) {
        newChars[index - 1] = "";
        inputRefs.current[index - 1]?.focus();
      }
      onChange(newChars.join("").trim());
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleInputChange = (index, e) => {
    const char = e.target.value.slice(-1).toUpperCase();
    if (!/^[A-Z0-9]$/.test(char)) return;

    const newChars = [...chars];
    newChars[index] = char;
    onChange(newChars.join("").trim());

    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, length);

    onChange(pastedData);
    const nextIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => {
        const char = chars[index] && chars[index] !== " " ? chars[index] : "";
        const isFilled = Boolean(char);

        return (
          <div key={index} className="relative">
            <input
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="text"
              maxLength={1}
              value={char}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onChange={(e) => handleInputChange(index, e)}
              className={`w-10 h-13 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-mono font-black uppercase rounded-xl border transition-all duration-200 focus:outline-none ${
                error
                  ? "border-red-500/80 bg-red-950/30 text-red-400 shadow-lg shadow-red-950/40 focus:border-red-400 focus:ring-2 focus:ring-red-500/30"
                  : isFilled
                  ? "border-cyan-500/80 bg-cyan-950/30 text-cyan-300 shadow-lg shadow-cyan-950/40 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
                  : "border-slate-800 bg-slate-950/80 text-white hover:border-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 focus:bg-slate-900"
              }`}
            />
            {/* Ambient inner glow for filled cell */}
            {isFilled && (
              <span className="absolute inset-x-2 bottom-1 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full opacity-75" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PinCodeInput;
