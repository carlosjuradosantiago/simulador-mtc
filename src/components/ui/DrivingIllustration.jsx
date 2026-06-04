export default function DrivingIllustration({ className = 'h-full w-full' }) {
  return (
    <svg viewBox="0 0 900 260" className={className} role="img" aria-label="Escena de tránsito con automóvil azul">
      <defs>
        <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#f8fbff" />
        </linearGradient>
        <linearGradient id="road" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#14284c" />
          <stop offset="100%" stopColor="#061b3d" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#0b1638" floodOpacity="0.18" />
        </filter>
      </defs>
      <rect width="900" height="260" rx="18" fill="url(#sky)" />
      <g opacity="0.85">
        <path d="M500 130 L615 48 L735 130 Z" fill="#bdd7f6" />
        <path d="M665 132 L758 66 L890 132 Z" fill="#c7ddf7" />
        <path d="M594 64 L615 48 L638 66" fill="#f8fbff" />
        <path d="M740 78 L758 66 L780 82" fill="#f8fbff" />
      </g>
      <g opacity="0.75">
        <rect x="230" y="72" width="30" height="100" rx="3" fill="#a6c8f2" />
        <rect x="272" y="45" width="42" height="128" rx="4" fill="#b6d2f4" />
        <rect x="332" y="86" width="36" height="88" rx="3" fill="#9fc3ef" />
        <rect x="386" y="63" width="31" height="110" rx="3" fill="#c5dbf7" />
        <rect x="442" y="102" width="28" height="72" rx="3" fill="#a6c8f2" />
      </g>
      <g>
        <circle cx="205" cy="170" r="28" fill="#69b87f" />
        <circle cx="246" cy="176" r="24" fill="#78c18b" />
        <circle cx="294" cy="170" r="31" fill="#69b87f" />
        <circle cx="812" cy="176" r="32" fill="#7ec68f" />
        <circle cx="856" cy="170" r="27" fill="#71bd84" />
      </g>
      <path d="M0 218 C130 186 286 203 444 190 C610 176 760 182 900 154 L900 260 L0 260 Z" fill="url(#road)" />
      <path d="M366 220 C506 204 662 200 840 178" fill="none" stroke="#facc15" strokeWidth="7" strokeDasharray="30 28" strokeLinecap="round" />
      <g transform="translate(428 116) scale(0.96)" filter="url(#softShadow)">
        <path d="M38 68 C48 32 78 14 126 14 L202 14 C236 14 266 35 279 68 L300 74 C312 77 320 88 320 101 L320 126 L18 126 L18 101 C18 86 27 76 38 68 Z" fill="#1457e8" />
        <path d="M86 28 L136 28 C156 28 175 40 188 62 L61 62 C68 43 76 33 86 28 Z" fill="#cfe4ff" />
        <path d="M202 31 C224 37 244 49 257 64 L199 64 C194 51 192 40 202 31 Z" fill="#cfe4ff" />
        <rect x="54" y="75" width="212" height="18" rx="9" fill="#0f3fbe" opacity="0.35" />
        <circle cx="78" cy="126" r="30" fill="#0b1638" />
        <circle cx="78" cy="126" r="16" fill="#e2e8f0" />
        <circle cx="258" cy="126" r="30" fill="#0b1638" />
        <circle cx="258" cy="126" r="16" fill="#e2e8f0" />
        <rect x="28" y="91" width="34" height="10" rx="5" fill="#f8fbff" />
        <rect x="275" y="91" width="26" height="10" rx="5" fill="#fde68a" />
      </g>
      <g transform="translate(788 86) rotate(10)">
        <rect x="31" y="52" width="7" height="78" rx="3" fill="#6b7280" />
        <rect x="0" y="0" width="70" height="70" rx="10" fill="#fbbf24" />
        <path d="M23 36 H45 M45 36 L36 27 M45 36 L36 45" fill="none" stroke="#082a5f" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="110" cy="70" rx="34" ry="15" />
        <ellipse cx="146" cy="70" rx="26" ry="12" />
        <ellipse cx="760" cy="48" rx="40" ry="16" />
        <ellipse cx="802" cy="48" rx="28" ry="13" />
      </g>
    </svg>
  );
}
