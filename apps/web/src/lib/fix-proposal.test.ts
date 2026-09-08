import { describe, it, expect } from "vitest";
import { buildIncidentReportMarkdown } from "./fix-proposal";

describe("buildIncidentReportMarkdown", () => {
  it("includes the hypothesis, proposed fix, confidence, and every cited evidence link", () => {
    const markdown = buildIncidentReportMarkdown({
      id: "inc_1",
      hypothesis: "The connection pool is exhausted under load.",
      proposedFix: "Increase the pool size and add backpressure.",
      confidence: 0.82,
      triggerNode: { type: "CHECK_RUN", externalId: "555", title: "CI / e2e", url: "https://github.com/acme/repo/runs/555" },
      evidence: [
        { node: { type: "ISSUE", externalId: "42", title: "Login broken", url: "https://github.com/acme/repo/issues/42" } },
        { node: { type: "PULL_REQUEST", externalId: "7", title: "Fix attempt", url: "https://github.com/acme/repo/pull/7" } },
      ],
    });

    expect(markdown).toContain("The connection pool is exhausted under load.");
    expect(markdown).toContain("Increase the pool size and add backpressure.");
    expect(markdown).toContain("82%");
    expect(markdown).toContain("[ISSUE #42](https://github.com/acme/repo/issues/42)");
    expect(markdown).toContain("[PULL_REQUEST #7](https://github.com/acme/repo/pull/7)");
    expect(markdown).toContain("does not contain a generated code fix");
  });

  it("degrades gracefully when there is no hypothesis, fix, or evidence yet", () => {
    const markdown = buildIncidentReportMarkdown({
      id: "inc_2",
      hypothesis: null,
      proposedFix: null,
      confidence: null,
      triggerNode: { type: "ISSUE", externalId: "1", title: null, url: null },
      evidence: [],
    });
    expect(markdown).toContain("No hypothesis available");
    expect(markdown).toContain("No fix proposed");
    expect(markdown).toContain("unknown");
  });
});
