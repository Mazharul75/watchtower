/**
 * Watchtower design tokens — single source of truth for brand color/typography
 * decisions, shared by apps/web's Tailwind config (and any future app).
 *
 * Palette rationale:
 *  - Off-white background + pure-white raised surfaces reads as a clean,
 *    professional product UI (the treatment used by e.g. Sentry's own
 *    product pages) rather than a "dark ops tool" aesthetic.
 *  - Indigo -> Violet -> Cyan gradient stays the brand identity from the
 *    logo — used as an accent now (buttons, badges, gradient text) rather
 *    than as the page background.
 *  - Semantic colors map 1:1 to incident severity so Phase 3's incident UI
 *    reuses these tokens without redefinition.
 */
export const colors = {
  background: {
    DEFAULT: "#FAFAF8",
    raised: "#FFFFFF",
    overlay: "rgba(255, 255, 255, 0.72)",
  },
  border: {
    DEFAULT: "rgba(15, 23, 42, 0.08)",
    strong: "rgba(15, 23, 42, 0.14)",
  },
  foreground: {
    DEFAULT: "#14171C",
    // ~7.2:1 against the page background.
    muted: "#475569",
    // WCAG 2.1 AA fix — see globals.css's twin definition for the exact
    // contrast math against #FAFAF8 (not a bare #FFFFFF assumption); keep
    // these two files in sync.
    subtle: "#64748B",
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
  radialGlow: `radial-gradient(60% 60% at 50% 0%, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0) 70%)`,
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
