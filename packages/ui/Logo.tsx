/**
 * Watchtower brand mark: a shield (guarding your codebase) enclosing a lens/eye
 * (the "watching" / evidence-inspection motif shared with Aegis & IncidentLens's
 * visual language). Pure inline SVG, gradient-filled, no external asset —
 * renders crisply at any size, works in the navbar, favicon export, and README.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Watchtower logo"
    >
      <defs>
        <linearGradient id="wt-grad" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <path
        d="M24 2 L43 9 V22 C43 33.5 35.5 42.5 24 46 C12.5 42.5 5 33.5 5 22 V9 Z"
        fill="url(#wt-grad)"
        opacity="0.16"
      />
      <path
        d="M24 4 L41 10.4 V22 C41 32.4 34.3 40.5 24 43.9 C13.7 40.5 7 32.4 7 22 V10.4 Z"
        stroke="url(#wt-grad)"
        strokeWidth="2"
      />
      <circle cx="24" cy="22" r="8" stroke="url(#wt-grad)" strokeWidth="2" />
      <circle cx="24" cy="22" r="3" fill="url(#wt-grad)" />
    </svg>
  );
}

export function LogoWordmark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark size={size + 6} />
      <span
        className="font-semibold tracking-tight"
        style={{ fontSize: size, lineHeight: 1 }}
      >
        Watchtower
      </span>
    </div>
  );
}
