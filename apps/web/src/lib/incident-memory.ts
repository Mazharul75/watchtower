import "server-only";
import { prisma } from "@/lib/prisma";
import { cosineSimilarity } from "@/lib/embeddings";

export interface SimilarIncident {
  id: string;
  status: string;
  hypothesis: string | null;
  createdAt: Date;
  triggerTitle: string | null;
  similarity: number;
}

const SIMILARITY_THRESHOLD = 0.3;
const MAX_RESULTS = 5;

/**
 * "Incident memory": compares this incident's trigger node embedding
 * against every OTHER incident's trigger node embedding in the same repo,
 * so a new failure can surface "this looks like incident #12" instead of
 * starting from zero — the capability none of the reference repos this
 * project analyzed actually persisted across incidents.
 */
export async function findSimilarPastIncidents(incidentId: string): Promise<SimilarIncident[]> {
  const current = await prisma.incident.findUniqueOrThrow({
    where: { id: incidentId },
    include: { triggerNode: { include: { embedding: true } } },
  });

  if (!current.triggerNode.embedding) return [];

  const others = await prisma.incident.findMany({
    where: { repositoryId: current.repositoryId, id: { not: incidentId } },
    include: { triggerNode: { include: { embedding: true } } },
    orderBy: { createdAt: "desc" },
    take: 50, // recent history is what matters most; see docs/ADR-003 on in-memory ranking at this scale
  });

  const scored = others
    .filter((incident) => incident.triggerNode.embedding)
    .map((incident) => ({
      id: incident.id,
      status: incident.status,
      hypothesis: incident.hypothesis,
      createdAt: incident.createdAt,
      triggerTitle: incident.triggerNode.title,
      similarity: cosineSimilarity(current.triggerNode.embedding!.vector, incident.triggerNode.embedding!.vector),
    }))
    .filter((incident) => incident.similarity >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_RESULTS);

  return scored;
}
