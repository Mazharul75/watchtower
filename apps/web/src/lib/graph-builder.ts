import type { GraphEdgeType, GraphNodeType } from "@prisma/client";

/**
 * Pure parsing layer: turns a raw GitHub webhook payload into the node this
 * event describes plus the edges it implies — no Prisma calls here, so this
 * is unit-testable against real recorded payload shapes without a database.
 * The route handler (api/webhooks/github) is the thin layer that takes this
 * output and actually writes it.
 */

export interface ParsedNode {
  type: GraphNodeType;
  externalId: string;
  title: string | null;
  body: string | null;
  url: string | null;
  state: string | null;
  authorLogin: string | null;
}

export interface ParsedEdgeTarget {
  type: GraphNodeType;
  externalId: string;
  edgeType: GraphEdgeType;
}

export interface ParseResult {
  node: ParsedNode;
  edgeTargets: ParsedEdgeTarget[];
}

// GitHub's own "closing keywords" — https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue
const CLOSING_KEYWORD_PATTERN = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
const BARE_REFERENCE_PATTERN = /#(\d+)/g;

/**
 * Every "#N" mention becomes a REFERENCES edge, except ones preceded by a
 * closing keyword ("fixes #12", "closes #34"), which become FIXES edges
 * instead — a FIXES edge is strictly more specific than a REFERENCES one,
 * never both for the same number.
 */
export function extractIssueReferences(text: string | null | undefined): ParsedEdgeTarget[] {
  if (!text) return [];

  const fixNumbers = new Set<string>();
  for (const match of text.matchAll(CLOSING_KEYWORD_PATTERN)) {
    fixNumbers.add(match[1]!);
  }

  const referenceNumbers = new Set<string>();
  for (const match of text.matchAll(BARE_REFERENCE_PATTERN)) {
    const number = match[1]!;
    if (!fixNumbers.has(number)) referenceNumbers.add(number);
  }

  return [
    ...[...fixNumbers].map((n): ParsedEdgeTarget => ({ type: "ISSUE", externalId: n, edgeType: "FIXES" })),
    ...[...referenceNumbers].map((n): ParsedEdgeTarget => ({ type: "ISSUE", externalId: n, edgeType: "REFERENCES" })),
  ];
}

interface GitHubIssuePayload {
  action: string;
  issue: {
    number: number;
    title: string;
    body: string | null;
    html_url: string;
    state: string;
    user: { login: string } | null;
  };
}

export function parseIssuesEvent(payload: GitHubIssuePayload): ParseResult {
  const { issue } = payload;
  return {
    node: {
      type: "ISSUE",
      externalId: String(issue.number),
      title: issue.title,
      body: issue.body,
      url: issue.html_url,
      state: issue.state,
      authorLogin: issue.user?.login ?? null,
    },
    edgeTargets: extractIssueReferences(issue.body),
  };
}

interface GitHubPullRequestPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    body: string | null;
    html_url: string;
    state: string;
    merged: boolean;
    user: { login: string } | null;
  };
}

export function parsePullRequestEvent(payload: GitHubPullRequestPayload): ParseResult {
  const { pull_request: pr } = payload;
  return {
    node: {
      type: "PULL_REQUEST",
      externalId: String(pr.number),
      title: pr.title,
      body: pr.body,
      url: pr.html_url,
      state: pr.merged ? "merged" : pr.state,
      authorLogin: pr.user?.login ?? null,
    },
    edgeTargets: extractIssueReferences(pr.body),
  };
}

interface GitHubCheckRunPayload {
  action: string;
  check_run: {
    id: number;
    name: string;
    html_url: string;
    status: string;
    conclusion: string | null;
    pull_requests: { number: number }[];
  };
}

export function parseCheckRunEvent(payload: GitHubCheckRunPayload): ParseResult {
  const { check_run: checkRun } = payload;
  return {
    node: {
      type: "CHECK_RUN",
      externalId: String(checkRun.id),
      title: checkRun.name,
      body: null,
      url: checkRun.html_url,
      state: checkRun.conclusion ?? checkRun.status,
      authorLogin: null,
    },
    edgeTargets: checkRun.pull_requests.map(
      (pr): ParsedEdgeTarget => ({ type: "PULL_REQUEST", externalId: String(pr.number), edgeType: "PART_OF" }),
    ),
  };
}

export type SupportedWebhookEventType = "issues" | "pull_request" | "check_run";

export function isSupportedEventType(eventType: string): eventType is SupportedWebhookEventType {
  return eventType === "issues" || eventType === "pull_request" || eventType === "check_run";
}

export function parseWebhookPayload(eventType: SupportedWebhookEventType, payload: unknown): ParseResult {
  switch (eventType) {
    case "issues":
      return parseIssuesEvent(payload as GitHubIssuePayload);
    case "pull_request":
      return parsePullRequestEvent(payload as GitHubPullRequestPayload);
    case "check_run":
      return parseCheckRunEvent(payload as GitHubCheckRunPayload);
  }
}
