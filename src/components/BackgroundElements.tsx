import React from "react";

export const BackgroundElements: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#070b16]">
      {/* Primary Atmospheric Gradients */}
      <div 
        aria-hidden="true" 
        className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-b from-cyan-600/15 via-indigo-600/10 to-transparent blur-3xl" 
      />
      <div 
        aria-hidden="true" 
        className="absolute top-[35%] -right-[15%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-700/15 via-indigo-900/10 to-transparent blur-3xl" 
      />
      <div 
        aria-hidden="true" 
        className="absolute -bottom-[10%] -left-[10%] w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-blue-900/20 via-cyan-950/15 to-transparent blur-3xl" 
      />

      {/* Subtle World Map / Global Export Trade Routes Pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.07] stroke-cyan-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(147, 197, 253, 0.12)" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />

        {/* Global Hub Nodes & Flight/Sea Trade Paths */}
        <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 6">
          <path d="M 180 320 Q 320 220 540 280 T 820 380" className="animate-pulse" />
          <path d="M 220 480 Q 420 580 620 420 T 780 620" />
          <path d="M 540 280 Q 580 440 620 420" />
          <path d="M 320 220 L 220 480" />
        </g>

        {/* Hub Dots */}
        <g fill="#38bdf8">
          <circle cx="180" cy="320" r="3.5" />
          <circle cx="320" cy="220" r="2.5" />
          <circle cx="540" cy="280" r="4" />
          <circle cx="820" cy="380" r="3" />
          <circle cx="220" cy="480" r="3" />
          <circle cx="620" cy="420" r="3.5" />
          <circle cx="780" cy="620" r="2.5" />
        </g>
      </svg>

      {/* Subtle Floating Geometric Accent shapes */}
      <div 
        aria-hidden="true" 
        className="absolute top-[18%] left-[8%] w-16 h-16 border border-cyan-500/15 rounded-2xl rotate-12" 
      />
      <div 
        aria-hidden="true" 
        className="absolute top-[52%] right-[10%] w-20 h-20 border border-purple-500/15 rounded-full" 
      />
      <div 
        aria-hidden="true" 
        className="absolute bottom-[22%] left-[14%] w-12 h-12 border border-blue-400/15 rotate-45" 
      />
    </div>
  );
};
