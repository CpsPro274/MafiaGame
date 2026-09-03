import React from "react";

export function ShimmerButton({
  children,
  onClick,
  disabled = false,
  className = "",
  variant = "purple", // "purple" | "cyan" | "crimson" | "slate"
  size = "md",
  type = "button",
  ...props
}) {
  const variantStyles = {
    purple:
      "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-purple-900/40 hover:shadow-purple-600/40 border-purple-400/30",
    cyan:
      "bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 text-white shadow-cyan-900/40 hover:shadow-cyan-500/40 border-cyan-400/30",
    crimson:
      "bg-gradient-to-r from-rose-600 via-red-600 to-pink-700 text-white shadow-rose-900/40 hover:shadow-rose-600/40 border-rose-400/30",
    emerald:
      "bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 text-slate-950 font-extrabold shadow-emerald-900/40 hover:shadow-emerald-500/40 border-emerald-400/40",
    slate:
      "bg-slate-900/90 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700 shadow-slate-950/50",
  };

  const sizeStyles = {
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-3 text-sm",
    lg: "px-7 py-4 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group relative inline-flex items-center justify-center gap-2.5 rounded-xl border font-semibold shadow-xl transition-all duration-300 overflow-hidden ${
        variantStyles[variant] || variantStyles.purple
      } ${sizeStyles[size] || sizeStyles.md} ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
      } ${className}`}
      {...props}
    >
      {/* Moving Shimmer Sheen effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}

export default ShimmerButton;
