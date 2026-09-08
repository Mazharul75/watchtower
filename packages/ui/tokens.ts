/**
 * Watchtower design tokens — single source of truth for brand color/typography
 * decisions, shared by apps/web's Tailwind config (and any future app).
 *
 * Palette rationale (from the Phase 1 roadmap):
 *  - Deep-space background reads as a serious engineering/ops tool, not a toy.
 *  - Indigo -> Violet -> Cyan gradient is the "AI dev tool" visual language
 *    used across the analyzed reference repos (Aegis, IncidentLens, ScopeForce).
 *  - Semantic colors map 1:1 to incident severity so Phase 3's incident UI
 *    reuses these tokens without redefinition.
 */
export const colors = {
  background: {
    DEFAULT: "#0B0F1A",
    raised: "#111827",
    overlay: "rgba(17, 24, 39, 0.72)",
  },
  border: {
    DEFAULT: "rgba(148, 163, 184, 0.16)",
    strong: "rgba(148, 163, 184, 0.32)",
  },
  foreground: {
    DEFAULT: "#E5E7EB",
    muted: "#94A3B8",
    // WCAG 2.1 AA fix (Phase 4 accessibility pass) — see globals.css's twin
    // definition for the contrast math; keep these two files in sync.
    subtle: "#7B8AA0",
  },
  brand: {
    indigo: "#6366F1",
    violet: "#8B5CF6",
    cyan: "#22D3EE",
  },
  semantic: {
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#F43F5E",
    info: "#38BDF8",
  },
} as const;

export const gradients = {
  brand: `linear-gradient(115deg, ${colors.brand.indigo} 0%, ${colors.brand.violet} 50%, ${colors.brand.cyan} 100%)`,
  brandSoft: `linear-gradient(115deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.14) 50%, rgba(34,211,238,0.12) 100%)`,
  radialGlow: `radial-gradient(60% 60% at 50% 0%, rgba(139,92,246,0.35) 0%, rgba(11,15,26,0) 70%)`,
} as const;

export const fonts = {
  sans: "'Geist', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  mono: "'Geist Mono', ui-monospace, 'SFMono-Regular', monospace",
} as const;

export const radii = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  full: "9999px",
} as const;
