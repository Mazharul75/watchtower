/** A drawn, slightly hand-made-feeling divider between page bands — an
 * organizing device (like the zig-zag seams between sections on Sentry's
 * marketing pages) done as one thin wavy stroke in the brand gradient
 * instead of copying their dashed-line treatment. */
export function WavyDivider({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className="block h-6 w-full" aria-hidden>
      <path
        d={flip ? "M0,18 Q30,4 60,18 T120,18 T180,18 T240,18 T300,18 T360,18 T420,18 T480,18 T540,18 T600,18 T660,18 T720,18 T780,18 T840,18 T900,18 T960,18 T1020,18 T1080,18 T1140,18 T1200,18" : "M0,6 Q30,20 60,6 T120,6 T180,6 T240,6 T300,6 T360,6 T420,6 T480,6 T540,6 T600,6 T660,6 T720,6 T780,6 T840,6 T900,6 T960,6 T1020,6 T1080,6 T1140,6 T1200,6"}
        fill="none"
        stroke="url(#wt-wave-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="wt-wave-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
    </svg>
  );
}
