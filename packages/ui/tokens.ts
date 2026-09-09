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
    // ~11.7:1 against white.
    muted: "#334155",
    // WCAG 2.1 AA fix, round two — see globals.css's twin definition for
    // why the first value (a bare ~4.7:1 pass) still failed axe-core in
    // practice, and keep these two files in sync.
    subtle: "#52606D",
  },
  brand: {
    indigo: "#6366F1",
    violet: "#8B5CF6",
    cyan: "#22D3EE",
    // Brand accents are for fills/borders/gradients, not text — neither
    // clears 4.5:1 as link/button text on this background. Use this for
    // that instead (~7.9:1, see globals.css).
    link: "#4338CA",
  },
  semantic: {
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#F43F5E",
    info: "#38BDF8",
  },
  // Dark, saturated variants of the four above — all >=5:1 against pure
  // white. The semantic colors are tuned for fills/badges/icons, not
  // readable text; use these instead anywhere a semantic color is text.
  semanticText: {
    success: "#047857",
    warning: "#B45309",
    danger: "#B91C3C",
    info: "#0369A1",
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
