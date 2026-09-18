import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'horizontal' | 'vertical' | 'icon-only';
  className?: string;
}

export function Logo({
  size = 'md',
  showText = true,
  variant = 'horizontal',
  className = '',
}: LogoProps) {
  const config = {
    sm: {
      svgSize: 30,
      titleSize: 'text-sm',
      heartDotSize: 'w-2 h-2',
      badge: 'text-[9px] px-1.5 py-0.2',
      sub: 'text-[10px]',
      gap: 'gap-2',
    },
    md: {
      svgSize: 38,
      titleSize: 'text-lg',
      heartDotSize: 'w-2.5 h-2.5',
      badge: 'text-[10px] px-2 py-0.5',
      sub: 'text-[11px]',
      gap: 'gap-2.5',
    },
    lg: {
      svgSize: 52,
      titleSize: 'text-2xl',
      heartDotSize: 'w-3.5 h-3.5',
      badge: 'text-xs px-2.5 py-1',
      sub: 'text-xs',
      gap: 'gap-3',
    },
    xl: {
      svgSize: 84,
      titleSize: 'text-4xl',
      heartDotSize: 'w-5 h-5',
      badge: 'text-sm px-3 py-1',
      sub: 'text-sm',
      gap: 'gap-4',
    },
  }[size];

  const isVertical = variant === 'vertical';

  return (
    <div
      className={`inline-flex items-center select-none ${isVertical ? 'flex-col text-center' : 'flex-row'} ${config.gap} ${className}`}
    >
      {/* Heart Speech Bubble 3D Icon Mark */}
      <div className="relative group/logo cursor-pointer shrink-0">
        {/* Soft Ambient Glow Aura matching pink/coral gradient */}
        <div className="absolute -inset-1.5 bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-400 rounded-full blur-md opacity-40 group-hover/logo:opacity-75 transition-opacity duration-300 pointer-events-none" />

        {/* Vector SVG Emblem */}
        <svg
          width={config.svgSize}
          height={config.svgSize}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 transition-transform duration-300 group-hover/logo:scale-105 drop-shadow-[0_4px_12px_rgba(255,46,117,0.45)]"
        >
          <defs>
            {/* Heart Bubble 3D Linear Gradient */}
            <linearGradient id="rizzHeartMainGrad" x1="88" y1="15" x2="30" y2="82" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFA185" />
              <stop offset="25%" stopColor="#FF4B7E" />
              <stop offset="65%" stopColor="#E6007A" />
              <stop offset="100%" stopColor="#870068" />
            </linearGradient>

            {/* Gloss Highlight Radial/Linear */}
            <linearGradient id="rizzGlossHighlight" x1="36" y1="20" x2="46" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
              <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
            </linearGradient>

            {/* Drop Shadow Filter for White Dots */}
            <filter id="dotShadow" x="0" y="0" width="100" height="100" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#700045" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* 3 Speed Motion Lines / Streaks on Left */}
          {/* Top streak */}
          <rect
            x="19"
            y="33"
            width="9"
            height="3.5"
            rx="1.75"
            fill="#FF3B7A"
            transform="rotate(-28 23.5 34.75)"
          />
          {/* Middle streak */}
          <rect
            x="21"
            y="43"
            width="8.5"
            height="3.5"
            rx="1.75"
            fill="#FF4F7E"
            transform="rotate(-38 25.25 44.75)"
          />
          {/* Bottom streak */}
          <rect
            x="27"
            y="51"
            width="7.5"
            height="3.2"
            rx="1.6"
            fill="#D6186E"
            transform="rotate(-48 30.75 52.6)"
          />

          {/* Heart Speech Bubble Body */}
          <path
            d="M 54 28.5
               C 56.5 24 62.5 19 72 19
               C 83 19 89 27 89 38
               C 89 51 77 61 61.5 68.5
               C 58 70.2 55 71 52.5 71.2
               C 49.5 71 45 68.5 42.5 66.5
               L 35.5 73.8
               C 34.4 74.8 32.8 74.2 33 72.8
               L 35.2 62.2
               C 30 56.5 26.5 48 26.5 38
               C 26.5 27 32.5 19 43.5 19
               C 49.5 19 52.5 24 54 28.5 Z"
            fill="url(#rizzHeartMainGrad)"
          />

          {/* Glossy 3D Reflection Highlight on Top-Left Lobe */}
          <path
            d="M 32 37
               C 30.5 30 34 22 43 21
               C 47.5 21 50 23 51.5 26
               C 47 23.5 41 24.5 37 28
               C 34 30.8 32.8 34 32.5 37.5
               Z"
            fill="url(#rizzGlossHighlight)"
          />
          <ellipse
            cx="40"
            cy="27"
            rx="7"
            ry="3.8"
            transform="rotate(-35 40 27)"
            fill="url(#rizzGlossHighlight)"
          />

          {/* 3 Message Dots (...) */}
          <g filter="url(#dotShadow)">
            <circle cx="45" cy="44" r="3.6" fill="#FFFFFF" />
            <circle cx="54" cy="44" r="3.6" fill="#FFFFFF" />
            <circle cx="63" cy="44" r="3.6" fill="#FFFFFF" />
          </g>
        </svg>

        {/* Live Active Online Status Indicator */}
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-zinc-950 rounded-full shadow-sm shadow-emerald-500/50" />
      </div>

      {/* Typographic Lockup: RizzLine with custom Heart-Dot over 'i' */}
      {showText && (
        <div className={`flex flex-col ${isVertical ? 'items-center' : 'items-start'}`}>
          <div className="flex items-center gap-1.5">
            {/* Custom Brand Lettering */}
            <div className={`flex items-baseline font-black tracking-tight leading-none ${config.titleSize}`}>
              {/* "R" */}
              <span className="text-zinc-100 font-extrabold">R</span>

              {/* "i" with Heart Dot */}
              <span className="relative inline-flex flex-col items-center">
                {/* Heart replacement for the dot */}
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={`${config.heartDotSize} text-rose-500 absolute -top-1 left-1/2 -translate-x-1/2 drop-shadow-sm`}
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {/* Lower stem of 'i' */}
                <span className="text-zinc-100 font-extrabold mt-0.5">ı</span>
              </span>

              {/* "zz" */}
              <span className="text-zinc-100 font-extrabold">zz</span>

              {/* "Line" in vivid coral pink */}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500 font-extrabold ml-0.5">
                Line
              </span>
            </div>

            {/* Offline Badge */}
            <span className={`font-mono font-bold tracking-wider rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase ${config.badge}`}>
              1.4k+ Offline
            </span>
          </div>

          <p className={`${config.sub} text-zinc-400 font-medium tracking-tight mt-0.5`}>
            Daily Rizz & Icebreaker Deck
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Dedicated Heart Chat Bubble Icon Standalone Component
 */
export function RizzHeartIcon({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-[0_3px_10px_rgba(255,46,117,0.4)] ${className}`}
    >
      <defs>
        <linearGradient id="rizzHeartStandaloneGrad" x1="88" y1="15" x2="30" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFA185" />
          <stop offset="25%" stopColor="#FF4B7E" />
          <stop offset="65%" stopColor="#E6007A" />
          <stop offset="100%" stopColor="#870068" />
        </linearGradient>

        <linearGradient id="rizzGlossStandalone" x1="36" y1="20" x2="46" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Speed streaks */}
      <rect x="19" y="33" width="9" height="3.5" rx="1.75" fill="#FF3B7A" transform="rotate(-28 23.5 34.75)" />
      <rect x="21" y="43" width="8.5" height="3.5" rx="1.75" fill="#FF4F7E" transform="rotate(-38 25.25 44.75)" />
      <rect x="27" y="51" width="7.5" height="3.2" rx="1.6" fill="#D6186E" transform="rotate(-48 30.75 52.6)" />

      {/* Heart Speech Bubble */}
      <path
        d="M 54 28.5
           C 56.5 24 62.5 19 72 19
           C 83 19 89 27 89 38
           C 89 51 77 61 61.5 68.5
           C 58 70.2 55 71 52.5 71.2
           C 49.5 71 45 68.5 42.5 66.5
           L 35.5 73.8
           C 34.4 74.8 32.8 74.2 33 72.8
           L 35.2 62.2
           C 30 56.5 26.5 48 26.5 38
           C 26.5 27 32.5 19 43.5 19
           C 49.5 19 52.5 24 54 28.5 Z"
        fill="url(#rizzHeartStandaloneGrad)"
      />

      {/* Gloss reflection */}
      <path
        d="M 32 37
           C 30.5 30 34 22 43 21
           C 47.5 21 50 23 51.5 26
           C 47 23.5 41 24.5 37 28
           C 34 30.8 32.8 34 32.5 37.5
           Z"
        fill="url(#rizzGlossStandalone)"
      />
      <ellipse
        cx="40"
        cy="27"
        rx="7"
        ry="3.8"
        transform="rotate(-35 40 27)"
        fill="url(#rizzGlossStandalone)"
      />

      {/* White dots */}
      <circle cx="45" cy="44" r="3.6" fill="#FFFFFF" />
      <circle cx="54" cy="44" r="3.6" fill="#FFFFFF" />
      <circle cx="63" cy="44" r="3.6" fill="#FFFFFF" />
    </svg>
  );
}
