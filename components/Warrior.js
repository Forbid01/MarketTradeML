// ӨӨРИЙН стайлтай дайчин/баатрын SVG (Moonton-ийн art БИШ — зохиогчийн эрхгүй, copyright-safe).
// Цав цул силуэт + гэрэлтэх ирмэг/сэлэм. Хөдөлгөөнийг эцэг элемент (heroFloat/heroAura)-аар өгнө.

export function Warrior({ size = 320, className = "" }) {
  const h = size;
  const w = Math.round(size * (260 / 340));
  return (
    <svg
      viewBox="0 0 260 340"
      width={w}
      height={h}
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <defs>
        <linearGradient id="wArmor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#222a44" />
          <stop offset="1" stopColor="#0a0d1a" />
        </linearGradient>
        <linearGradient id="wCape" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6D5DF6" />
          <stop offset="1" stopColor="#2a1f6b" />
        </linearGradient>
        <linearGradient id="wBlade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe9ff" />
          <stop offset="0.5" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#6D5DF6" />
        </linearGradient>
        <radialGradient id="wAura" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#6D5DF6" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#38BDF8" stopOpacity="0.16" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <filter id="wGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Аура (гэрлэн бөмбөрцөг) */}
      <circle cx="130" cy="150" r="118" fill="url(#wAura)" className="motion-safe:animate-[heroAura_4s_ease-in-out_infinite]" />

      {/* Нөмрөг (cape) — биеийн ард намирна */}
      <path
        d="M96 86 C60 120 44 210 70 300 C92 250 104 235 120 230 L120 120 Z
           M164 86 C202 122 220 214 192 304 C168 252 156 236 140 230 L140 120 Z"
        fill="url(#wCape)" opacity="0.92"
      />

      {/* Биеийн силуэт: дуулга + мөрний хуяг + бие + хөл */}
      <path
        d="M130 36
           C116 36 108 47 108 60 C108 70 112 78 118 83
           L100 96 78 108 84 132 104 122 104 138
           C90 150 86 176 90 206 L96 250 88 300 116 300 122 250 124 210
           L136 210 138 250 144 300 172 300 164 250 170 206
           C174 176 170 150 156 138 L156 122 176 132 182 108 160 96 142 83
           C148 78 152 70 152 60 C152 47 144 36 130 36 Z"
        fill="url(#wArmor)" stroke="#F5C451" strokeWidth="1.4" strokeOpacity="0.55"
      />
      {/* Дуулганы зүсэлт + нүдний гэрэл */}
      <path d="M122 58 L138 58 L134 66 L126 66 Z" fill="#06070E" />
      <rect x="124" y="60" width="12" height="3" rx="1.5" fill="#38BDF8" className="motion-safe:animate-[glowPulse_3s_ease-in-out_infinite]" />
      {/* Цээжний рун */}
      <path d="M130 120 l9 7 -9 7 -9 -7 z" fill="#F5C451" opacity="0.85" filter="url(#wGlow)" />

      {/* Сэлэм — урдаа савласан, гэрэлтэх ир */}
      <g filter="url(#wGlow)" className="motion-safe:animate-[heroAura_4s_ease-in-out_infinite]">
        <rect x="206" y="150" width="9" height="150" rx="3" fill="url(#wBlade)" />
        <path d="M206 150 l4.5 -120 4.5 120 z" fill="url(#wBlade)" />
        <rect x="192" y="146" width="37" height="8" rx="4" fill="#F5C451" />
        <rect x="207" y="300" width="7" height="20" rx="3" fill="#9aa3bd" />
      </g>
      {/* Сэлэм барьсан гар */}
      <path d="M168 158 C186 150 198 150 210 152 L210 164 C198 162 186 164 172 172 Z" fill="url(#wArmor)" stroke="#F5C451" strokeWidth="1.2" strokeOpacity="0.5" />
    </svg>
  );
}
