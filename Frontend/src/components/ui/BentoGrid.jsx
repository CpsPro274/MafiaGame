import React from "react";
import CardSpotlight from "./CardSpotlight";

export function BentoGrid({ className = "", children }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 ${className}`}>
      {children}
    </div>
  );
}

export function BentoCard({
  title,
  description,
  header,
  icon,
  className = "",
  badge,
  spotlightColor = "rgba(139, 92, 246, 0.15)",
}) {
  return (
    <CardSpotlight
      spotlightColor={spotlightColor}
      className={`group flex flex-col justify-between p-6 sm:p-7 border-slate-800/80 bg-slate-950/60 hover:border-slate-700/80 transition-all duration-300 ${className}`}
    >
      <div>
        {header && <div className="mb-4 overflow-hidden rounded-xl">{header}</div>}

        <div className="flex items-center justify-between mb-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:text-cyan-400 transition-all duration-300 shadow-md">
              {icon}
            </div>
          )}
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 group-hover:border-purple-500/30 group-hover:text-purple-300 transition-colors">
              {badge}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-white tracking-tight mb-2 group-hover:text-cyan-300 transition-colors">
          {title}
        </h3>
        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{description}</p>
      </div>
    </CardSpotlight>
  );
}

export default BentoGrid;
