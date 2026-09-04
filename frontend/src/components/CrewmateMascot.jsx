import React from "react";

const COLOR_MAP = {
  red: {
    primary: "#E81E25",
    shadow: "#990E17",
    visorPrimary: "#8EE4FF",
    visorShadow: "#4F96A9",
    visorHighlight: "#FFFFFF",
    glow: "rgba(232, 30, 37, 0.4)",
  },
  cyan: {
    primary: "#38FEDC",
    shadow: "#1A9C87",
    visorPrimary: "#8EE4FF",
    visorShadow: "#4F96A9",
    visorHighlight: "#FFFFFF",
    glow: "rgba(56, 254, 220, 0.4)",
  },
  yellow: {
    primary: "#F5F557",
    shadow: "#9D9D24",
    visorPrimary: "#8EE4FF",
    visorShadow: "#4F96A9",
    visorHighlight: "#FFFFFF",
    glow: "rgba(245, 245, 87, 0.4)",
  },
  purple: {
    primary: "#6B2FBC",
    shadow: "#3B1766",
    visorPrimary: "#8EE4FF",
    visorShadow: "#4F96A9",
    visorHighlight: "#FFFFFF",
    glow: "rgba(107, 47, 188, 0.4)",
  },
  green: {
    primary: "#117F2D",
    shadow: "#0A4E1B",
    visorPrimary: "#8EE4FF",
    visorShadow: "#4F96A9",
    visorHighlight: "#FFFFFF",
    glow: "rgba(17, 127, 45, 0.4)",
  },
  orange: {
    primary: "#F07D10",
    shadow: "#8D4304",
    visorPrimary: "#8EE4FF",
    visorShadow: "#4F96A9",
    visorHighlight: "#FFFFFF",
    glow: "rgba(240, 125, 16, 0.4)",
  },
  blue: {
    primary: "#132ED1",
    shadow: "#09158E",
    visorPrimary: "#8EE4FF",
    visorShadow: "#4F96A9",
    visorHighlight: "#FFFFFF",
    glow: "rgba(19, 46, 209, 0.4)",
  },
  ghost: {
    primary: "rgba(142, 228, 255, 0.6)",
    shadow: "rgba(79, 150, 169, 0.7)",
    visorPrimary: "#FFFFFF",
    visorShadow: "#A0D8EF",
    visorHighlight: "#FFFFFF",
    glow: "rgba(142, 228, 255, 0.6)",
  },
};

export default function CrewmateMascot({
  color = "cyan",
  size = 120,
  role = "developer",
  hat = "none",
  animated = true,
  direction = "right",
  className = "",
  glow = true,
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.cyan;
  const isFlipped = direction === "left";

  return (
    <div
      className={`inline-block relative select-none ${className}`}
      style={{
        width: size,
        height: size * 1.25,
        filter: glow ? `drop-shadow(0 8px 24px ${c.glow})` : "none",
        transform: isFlipped ? "scaleX(-1)" : "none",
      }}
    >
      <svg
        viewBox="0 0 100 125"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id={`visorGrad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C2F3FF" />
            <stop offset="40%" stopColor={c.visorPrimary} />
            <stop offset="100%" stopColor={c.visorShadow} />
          </linearGradient>
          <filter id={`softGlow-${color}`} x1="-20%" y1="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. BACKPACK */}
        <g id="backpack">
          <path
            d="M14 42 C14 36 18 34 24 34 L28 34 L28 82 L24 82 C18 82 14 78 14 72 Z"
            fill={c.shadow}
            stroke="#000000"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M18 40 C18 37 20 36 24 36 L26 36 L26 78 L24 78 C20 78 18 76 18 72 Z"
            fill={c.primary}
          />
        </g>

        {/* 2. BODY SHADOW (Base outline + Shadow) */}
        <g id="body">
          {/* Main Body Silhouette with stroke */}
          <path
            d="M30 38 C30 15 76 15 76 38 L76 96 C76 102 70 108 64 108 L54 108 C48 108 48 98 48 94 C48 98 48 108 42 108 L32 108 C26 108 24 102 24 96 L24 46 C24 42 26 38 30 38 Z"
            fill={c.shadow}
            stroke="#000000"
            strokeWidth="5"
            strokeLinejoin="round"
          />

          {/* Body Main Color Highlight */}
          <path
            d="M32 36 C32 18 72 18 72 36 L72 78 C68 84 56 88 44 88 C32 88 28 82 28 72 L28 44 C28 40 30 36 32 36 Z"
            fill={c.primary}
          />

          {/* Left Leg Highlight */}
          <path
            d="M28 92 L28 98 C28 102 30 104 34 104 L38 104 C42 104 42 100 42 96 L42 92 Z"
            fill={c.primary}
          />

          {/* Right Leg Highlight */}
          <path
            d="M52 92 L52 96 C52 100 52 104 56 104 L62 104 C66 104 68 102 68 98 L68 92 Z"
            fill={c.primary}
          />
        </g>

        {/* 3. VISOR */}
        <g id="visor">
          {/* Visor Outer Border */}
          <path
            d="M48 34 C68 34 88 36 88 48 C88 60 68 62 48 62 C38 62 36 60 36 48 C36 36 38 34 48 34 Z"
            fill="#000000"
          />
          {/* Visor Glass */}
          <path
            d="M49 37 C66 37 84 39 84 48 C84 57 66 59 49 59 C40 59 39 57 39 48 C39 39 40 37 49 37 Z"
            fill={`url(#visorGrad-${color})`}
          />
          {/* Specular Highlight Pill */}
          <ellipse
            cx="64"
            cy="43"
            rx="14"
            ry="4"
            transform="rotate(-5 64 43)"
            fill="#FFFFFF"
            fillOpacity="0.85"
          />
        </g>

        {/* 4. ACCESSORIES / HATS / ROLES */}
        {role === "developer" && (
          <g id="developer-headset">
            {/* Cyber Developer Headband */}
            <path
              d="M32 26 C32 10 74 10 74 26"
              stroke="#1E293B"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Left Ear Pad */}
            <rect x="26" y="22" width="7" height="14" rx="3" fill="#38FEDC" stroke="#000" strokeWidth="2.5" />
            {/* Right Ear Pad */}
            <rect x="73" y="22" width="7" height="14" rx="3" fill="#38FEDC" stroke="#000" strokeWidth="2.5" />
            {/* Mic */}
            <path d="M74 34 Q80 44 70 48" stroke="#1E293B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="68" cy="49" r="3" fill="#38FEDC" />
          </g>
        )}

        {role === "imposter" && (
          <g id="imposter-horns">
            {/* Left Devil Horn */}
            <path
              d="M36 22 Q30 8 22 10 Q28 18 36 24 Z"
              fill="#E81E25"
              stroke="#000000"
              strokeWidth="3"
            />
            {/* Right Devil Horn */}
            <path
              d="M68 22 Q74 8 82 10 Q76 18 68 24 Z"
              fill="#E81E25"
              stroke="#000000"
              strokeWidth="3"
            />
            {/* Red Visor Glint / Threat Indicator */}
            <path
              d="M52 46 L78 46"
              stroke="#FF2A35"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="drop-shadow(0 0 4px #FF0011)"
            />
          </g>
        )}

        {role === "detective" && (
          <g id="detective-hat">
            {/* Detective Fedora Hat */}
            <ellipse cx="53" cy="24" rx="30" ry="6" fill="#78350F" stroke="#000" strokeWidth="3" />
            <path
              d="M36 23 C36 10 70 10 70 23 Z"
              fill="#B45309"
              stroke="#000"
              strokeWidth="3"
            />
            <rect x="36" y="20" width="34" height="4" fill="#1E293B" />
          </g>
        )}

        {role === "hacker" && (
          <g id="hacker-hoodie">
            {/* Neon Glitch Aura */}
            <path
              d="M30 38 C30 12 76 12 76 38"
              stroke="#22C55E"
              strokeWidth="2"
              strokeDasharray="4 2"
              fill="none"
              opacity="0.8"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
