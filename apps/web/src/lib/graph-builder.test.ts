import { describe, it, expect } from "vitest";
import { extractIssueReferences, parseIssuesEvent, parsePullRequestEvent, parseCheckRunEvent } from "./graph-builder";

describe("extractIssueReferences", () => {
  it("classifies a closing-keyword reference as FIXES", () => {
    const refs = extractIssueReferences("This fixes #42 and closes #7");
    expect(refs).toContainEqual({ type: "ISSUE", externalId: "42", edgeType: "FIXES" });
    expect(refs).toContainEqual({ type: "ISSUE", externalId: "7", edgeType: "FIXES" });
  });

  it("classifies a bare mention as REFERENCES", () => {
    const refs = extractIssueReferences("Related to #99, needs discussion");
    expect(refs).toContainEqual({ type: "ISSUE", externalId: "99", edgeType: "REFERENCES" });
  });

  it("never double-counts the same number as both FIXES and REFERENCES", () => {
    const refs = extractIssueReferences("Fixes #42, see also #42 for context");
    const forty2 = refs.filter((r) => r.externalId === "42");
    expect(forty2).toHaveLength(1);
    expect(forty2[0]!.edgeType).toBe("FIXES");
  });

  it("returns an empty array for null/undefined/no-reference text", () => {
    expect(extractIssueReferences(null)).toEqual([]);
    expect(extractIssueReferences(undefined)).toEqual([]);
    expect(extractIssueReferences("no references here")).toEqual([]);
  });

  it("matches GitHub's full set of closing keywords case-insensitively", () => {
    for (const keyword of ["close", "closes", "closed", "fix", "fixes", "fixed", "resolve", "resolves", "resolved"]) {
      const refs = extractIssueReferences(`${keyword.toUpperCase()} #1`);
      expect(refs).toEqual([{ type: "ISSUE", externalId: "1", edgeType: "FIXES" }]);
    }
  });
});

describe("parseIssuesEvent", () => {
  it("extracts a node matching the issue payload", () => {
    const result = parseIssuesEvent({
      action: "opened",
      issue: {
        number: 123,
        title: "Login is broken on mobile",
        body: "Steps to reproduce...",
        html_url: "https://github.com/acme/repo/issues/123",
        state: "open",
        user: { login: "alice" },
      },
    });

    expect(result.node).toEqual({
      type: "ISSUE",
      externalId: "123",
      title: "Login is broken on mobile",
      body: "Steps to reproduce...",
      url: "https://github.com/acme/repo/issues/123",
      state: "open",
      authorLogin: "alice",
    });
  });

  it("handles a deleted/null author gracefully", () => {
    const result = parseIssuesEvent({
      action: "opened",
      issue: { number: 1, title: "t", body: null, html_url: "u", state: "open", user: null },
    });
    expect(result.node.authorLogin).toBeNull();
  });
});

describe("parsePullRequestEvent", () => {
  it("marks a merged PR's state as merged, overriding the raw 'closed' state", () => {
    const result = parsePullRequestEvent({
      action: "closed",
      pull_request: {
        number: 45,
        title: "Fix login bug",
        body: "Fixes #123",
        html_url: "https://github.com/acme/repo/pull/45",
        state: "closed",
        merged: true,
        user: { login: "bob" },
      },
    });
    expect(result.node.state).toBe("merged");
    expect(result.edgeTargets).toEqual([{ type: "ISSUE", externalId: "123", edgeType: "FIXES" }]);
  });

  it("keeps the raw state for a closed-without-merge PR", () => {
    const result = parsePullRequestEvent({
      action: "closed",
      pull_request: { number: 46, title: "t", body: null, html_url: "u", state: "closed", merged: false, user: null },
    });
    expect(result.node.state).toBe("closed");
  });
});

describe("parseCheckRunEvent", () => {
  it("produces a PART_OF edge to every associated pull request", () => {
    const result = parseCheckRunEvent({
      action: "completed",
      check_run: {
        id: 999,
        name: "CI / build",
        html_url: "https://github.com/acme/repo/runs/999",
        status: "completed",
        conclusion: "failure",
        pull_requests: [{ number: 45 }, { number: 46 }],
      },
    });
    expect(result.node.state).toBe("failure");
    expect(result.edgeTargets).toEqual([
      { type: "PULL_REQUEST", externalId: "45", edgeType: "PART_OF" },
      { type: "PULL_REQUEST", externalId: "46", edgeType: "PART_OF" },
    ]);
  });

  it("falls back to status when there is no conclusion yet (in-progress run)", () => {
    const result = parseCheckRunEvent({
      action: "created",
      check_run: { id: 1, name: "CI", html_url: "u", status: "in_progress", conclusion: null, pull_requests: [] },
    });
    expect(result.node.state).toBe("in_progress");
  });
});
