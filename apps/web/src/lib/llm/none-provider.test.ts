import { describe, it, expect } from "vitest";
import { NoneProvider } from "./none-provider";

describe("NoneProvider", () => {
  it("always abstains with a clear reason, regardless of input", async () => {
    const provider = new NoneProvider();
    const result = await provider.generateHypothesis({
      incidentSummary: "anything",
      evidence: [{ nodeId: "n1", type: "ISSUE", externalId: "1", title: "t", body: "b", score: 1 }],
    });
    expect(result.ok).toBe(false);
    expect(result.abstainReason).toBeTruthy();
    expect(result.hypothesis).toBeUndefined();
  });
});
