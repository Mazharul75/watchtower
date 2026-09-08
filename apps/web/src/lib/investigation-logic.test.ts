import { describe, it, expect } from "vitest";
import { verifyCitations, decideOutcome, MIN_CONFIDENCE_FOR_APPROVAL } from "./investigation-logic";

describe("verifyCitations", () => {
  it("keeps only node ids that were actually retrieved", () => {
    const result = verifyCitations(["a", "b", "hallucinated"], ["a", "b", "c"]);
    expect(result).toEqual(["a", "b"]);
  });

  it("returns an empty array when nothing cited was actually retrieved", () => {
    expect(verifyCitations(["x", "y"], ["a", "b"])).toEqual([]);
  });

  it("handles an empty citation list", () => {
    expect(verifyCitations([], ["a", "b"])).toEqual([]);
  });
});

describe("decideOutcome", () => {
  it("abstains when there are no valid citations, regardless of stated confidence", () => {
    // A model that claims high confidence but cited nothing real is not
    // trusted — this is the guard against a model hallucinating both the
    // citation AND the confidence score.
    expect(decideOutcome(0.95, 0)).toBe("ABSTAINED");
  });

  it("awaits approval when confidence clears the threshold with valid citations", () => {
    expect(decideOutcome(MIN_CONFIDENCE_FOR_APPROVAL, 1)).toBe("AWAITING_APPROVAL");
    expect(decideOutcome(0.9, 3)).toBe("AWAITING_APPROVAL");
  });

  it("abstains when confidence is below the threshold even with valid citations", () => {
    expect(decideOutcome(MIN_CONFIDENCE_FOR_APPROVAL - 0.01, 2)).toBe("ABSTAINED");
    expect(decideOutcome(0, 1)).toBe("ABSTAINED");
  });
});
