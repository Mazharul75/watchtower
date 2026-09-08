import "server-only";
import { prisma } from "@/lib/prisma";
import { embedText, EMBEDDING_MODEL_ID } from "@/lib/embeddings";
import { isSupportedEventType, parseWebhookPayload, type ParseResult } from "@/lib/graph-builder";
import { investigateNode } from "@/lib/investigation";
import type { GraphNodeType } from "@prisma/client";

/**
 * Writes one parsed webhook event into the engineering graph:
 *   1. Upsert the node this event describes (issue/PR/check-run).
 *   2. For every edge it implies, find-or-create a minimal placeholder node
 *      for the target (e.g. an issue referenced by a PR that hasn't sent us
 *      its own "issues" webhook yet) and create the edge.
 *   3. Embed the node's text and store it, so Phase 3's retrieval has
 *      something to search over immediately, not after a separate backfill.
 */
export async function ingestParsedEvent(repositoryId: string, result: ParseResult): Promise<{ nodeId: string }> {
  const { node, edgeTargets } = result;

  const savedNode = await prisma.graphNode.upsert({
    where: { repositoryId_type_externalId: { repositoryId, type: node.type, externalId: node.externalId } },
    create: {
      repositoryId,
      type: node.type,
      externalId: node.externalId,
      title: node.title,
      body: node.body,
      url: node.url,
      state: node.state,
      authorLogin: node.authorLogin,
    },
    update: {
      title: node.title,
      body: node.body,
      url: node.url,
      state: node.state,
      authorLogin: node.authorLogin,
    },
  });

  for (const target of edgeTargets) {
    const targetNode = await findOrCreatePlaceholderNode(repositoryId, target.type, target.externalId);
    await prisma.graphEdge.upsert({
      where: { sourceId_targetId_type: { sourceId: savedNode.id, targetId: targetNode.id, type: target.edgeType } },
      create: { sourceId: savedNode.id, targetId: targetNode.id, type: target.edgeType },
      update: {},
    });
  }

  const embeddableText = [node.title, node.body].filter(Boolean).join("\n\n");
  if (embeddableText.trim().length > 0) {
    const vector = embedText(embeddableText);
    await prisma.embedding.upsert({
      where: { nodeId: savedNode.id },
      create: { nodeId: savedNode.id, vector, model: EMBEDDING_MODEL_ID },
      update: { vector, model: EMBEDDING_MODEL_ID },
    });
  }

  return { nodeId: savedNode.id };
}

/**
 * A referenced node (e.g. "fixes #42") we haven't independently received a
 * webhook for yet — created as a minimal stub so the edge has somewhere to
 * point. A later webhook for that same node fills in the real title/body
 * via the upsert above; nothing is lost, and the graph never has a dangling edge.
 */
async function findOrCreatePlaceholderNode(repositoryId: string, type: GraphNodeType, externalId: string) {
  return prisma.graphNode.upsert({
    where: { repositoryId_type_externalId: { repositoryId, type, externalId } },
    create: { repositoryId, type, externalId },
    update: {},
  });
}

export async function processWebhookEvent(webhookEventId: string): Promise<void> {
  const event = await prisma.webhookEvent.findUniqueOrThrow({ where: { id: webhookEventId } });

  if (!event.repositoryId) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date(), error: "No matching Repository for this event's repository id." },
    });
    return;
  }

  if (!isSupportedEventType(event.eventType)) {
    // Not an error — plenty of GitHub event types (star, fork, ...) simply
    // aren't part of the engineering graph. Mark processed so it's not
    // retried forever, with no error text since nothing went wrong.
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    return;
  }

  try {
    const result = parseWebhookPayload(event.eventType, event.payload);
    const { nodeId } = await ingestParsedEvent(event.repositoryId, result);
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    await prisma.repository.update({ where: { id: event.repositoryId }, data: { lastIngestedAt: new Date() } });

    if (event.eventType === "check_run" && result.node.state === "failure") {
      await maybeAutoInvestigate(nodeId);
    }
  } catch (err) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date(), error: err instanceof Error ? err.message : "Unknown ingestion error" },
    });
  }
}

/**
 * Auto-triggers an investigation on a failed check run — the roadmap's "CI
 * failure" detection trigger — gated behind its own feature flag so a fresh
 * deployment doesn't start making LLM calls (even to the free Ollama
 * default) the moment ingestion is turned on. A failure investigation can
 * always be started manually from the UI regardless of this flag.
 */
async function maybeAutoInvestigate(nodeId: string): Promise<void> {
  const flag = await prisma.featureFlag.findUnique({ where: { key: "phase3.ai_rca" } });
  if (!flag?.enabled) return;

  try {
    await investigateNode(nodeId);
  } catch {
    // Investigation failures are visible on the Incident row itself
    // (status stays ABSTAINED with a reason) for anything that gets that
    // far; a failure before an Incident row even exists (e.g. the trigger
    // node lookup itself throwing) is swallowed here rather than marking
    // the webhook event as failed — ingestion succeeded, investigation is
    // a separate concern.
  }
}
