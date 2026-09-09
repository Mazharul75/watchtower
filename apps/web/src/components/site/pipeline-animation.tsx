/**
 * The real Watchtower lifecycle, drawn as a live pipeline: a pulse travels
 * the rail and each stage lights up in turn, then the human-gate gets its
 * own emphasis — root-cause analysis never ships anything without a person
 * approving the fix proposal (Incident.status: INVESTIGATING ->
 * AWAITING_APPROVAL -> APPROVED, see prisma/schema.prisma). No JS: pure
 * inline SVG + CSS keyframes, so it costs nothing to hydrate and still
 * plays for users with JS disabled (falls back to a static rail).
 */
const STAGES = [
  { key: "detect", label: "Detect", x: 0 },
  { key: "investigate", label: "Investigate", x: 130 },
  { key: "propose", label: "Propose fix", x: 260 },
  { key: "approve", label: "You approve", x: 390 },
  { key: "verify", label: "Verify", x: 520 },
] as const;

const RAIL_LENGTH = 520;

export function PipelineAnimation() {
  return (
    <svg
      viewBox="0 0 560 90"
      className="mx-auto w-full max-w-2xl"
      role="img"
      aria-label="Watchtower's incident lifecycle: detect, investigate, propose a fix, wait for your approval, then verify."
    >
      <style>{`
        @keyframes wt-travel {
          0%   { transform: translateX(0); opacity: 0; }
          6%   { opacity: 1; }
          94%  { opacity: 1; }
          100% { transform: translateX(${RAIL_LENGTH}px); opacity: 0; }
        }
        @keyframes wt-light {
          0%, 14%, 100% { fill: #cbd5e1; r: 5; }
          6%             { fill: #6366F1; r: 7.5; }
        }
        @keyframes wt-label {
          0%, 14%, 100% { fill: #64748b; }
          6%             { fill: #14171c; }
        }
        .wt-runner { animation: wt-travel 6s cubic-bezier(0.45,0,0.15,1) infinite; }
        .wt-n0 { animation: wt-light 6s linear infinite; }
        .wt-n1 { animation: wt-light 6s linear infinite 1.2s; }
        .wt-n2 { animation: wt-light 6s linear infinite 2.4s; }
        .wt-n3 { animation: wt-light 6s linear infinite 3.6s; }
        .wt-n4 { animation: wt-light 6s linear infinite 4.8s; }
        .wt-l0 { animation: wt-label 6s linear infinite; }
        .wt-l1 { animation: wt-label 6s linear infinite 1.2s; }
        .wt-l2 { animation: wt-label 6s linear infinite 2.4s; }
        .wt-l3 { animation: wt-label 6s linear infinite 3.6s; }
        .wt-l4 { animation: wt-label 6s linear infinite 4.8s; }
        @media (prefers-reduced-motion: reduce) {
          .wt-runner { display: none; }
          .wt-n0, .wt-n1, .wt-n2, .wt-n3, .wt-n4 { fill: #6366F1 !important; r: 6 !important; animation: none; }
          .wt-l0, .wt-l1, .wt-l2, .wt-l3, .wt-l4 { fill: #14171c !important; animation: none; }
        }
      `}</style>

      <defs>
        <linearGradient id="wt-pipeline-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>

      <g transform="translate(20, 30)">
        <line x1="0" y1="0" x2={RAIL_LENGTH} y2="0" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle className="wt-runner" cx="0" cy="0" r="4" fill="url(#wt-pipeline-grad)" />

        {STAGES.map((s, i) => (
          <g key={s.key}>
            <circle className={`wt-n${i}`} cx={s.x} cy="0" r="5" fill="#cbd5e1" />
            <text className={`wt-l${i}`} x={s.x} y="26" textAnchor="middle" fontSize="11" fontWeight="500" fill="#64748b">
              {s.label}
            </text>
          </g>
        ))}

        {/* The human-approval gate — the one non-negotiable step — gets a
            permanent marker, not just a lit dot like the others. */}
        <line x1="390" y1="-30" x2="390" y2="-10" stroke="#6366F1" strokeWidth="1.2" />
        <text x="390" y="-36" textAnchor="middle" fontSize="10" fontWeight="600" fill="#4338CA">
          human gate
        </text>
      </g>
    </svg>
  );
}
