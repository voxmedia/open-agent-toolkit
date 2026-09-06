import { z } from 'zod';

import { containsSensitiveContentSignal } from './credential-safety';
import type { ExternalActionEnvelope } from './external-action';
import { semanticDigest } from './provider';
import { WHOLE_FIELD_SUPPRESSION_MARKER } from './schema';

export interface RemoteDiscussionItem {
  id: string;
  body: string;
  createdAt: string;
}

export interface SanitizedDiscussionItem extends RemoteDiscussionItem {
  incomplete: boolean;
}

export interface DiscussionPage {
  items: RemoteDiscussionItem[];
  nextCursor: string | null;
}

export interface DiscussionPageSource {
  readPage(input: {
    bindingId: string;
    cursor: string | null;
    limit: number;
  }): Promise<DiscussionPage>;
}

export interface DiscussionEvidence {
  status: 'available' | 'unavailable';
  bindingId: string;
  observedAt: string;
  items: SanitizedDiscussionItem[];
  pagesRead: number;
  truncated: boolean;
  persisted: false;
}

const DiscussionObservationSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: z.string().min(1).max(128),
    stepId: z.string().min(1).max(128),
    actionDigest: z.string().min(1).max(512),
    observedAt: z.string().datetime({ offset: true }),
    provider: z.enum(['github', 'linear', 'jira']),
    context: z.record(z.string(), z.string().optional()),
    capabilityEvidenceDigest: z.string().min(1).max(512),
    availability: z.enum(['available', 'unavailable']),
    items: z
      .array(
        z
          .object({
            id: z.string().min(1).max(512),
            body: z.string().max(1_048_576),
            createdAt: z.string().datetime({ offset: true }),
          })
          .strict(),
      )
      .max(100),
    nextCursor: z.string().max(512).nullable(),
  })
  .strict();

export async function acceptRemoteDiscussionObservation(input: {
  action: ExternalActionEnvelope;
  observation: unknown;
  bindingId: string;
  limit: number;
  maxPages: number;
}): Promise<DiscussionEvidence> {
  if (input.action.semanticOperation !== 'read-discussion') {
    throw new Error('Discussion continuation requires a discussion action.');
  }
  const observation = DiscussionObservationSchema.parse(input.observation);
  if (
    observation.operationId !== input.action.operationId ||
    observation.stepId !== input.action.stepId ||
    observation.actionDigest !== input.action.actionDigest ||
    observation.provider !== input.action.provider ||
    observation.capabilityEvidenceDigest !==
      input.action.expectedObservation.capabilityEvidenceDigest ||
    semanticDigest(observation.context) !== semanticDigest(input.action.context)
  ) {
    throw new Error(
      'Discussion observation does not match its durable action.',
    );
  }
  return readRemoteDiscussion(
    {
      bindingId: input.bindingId,
      limit: input.limit,
      maxPages: input.maxPages,
      observedAt: observation.observedAt,
    },
    observation.availability === 'available'
      ? {
          async readPage() {
            return {
              items: observation.items,
              nextCursor: observation.nextCursor,
            };
          },
        }
      : null,
  );
}

export async function readRemoteDiscussion(
  input: {
    bindingId: string;
    limit: number;
    maxPages: number;
    observedAt: string;
  },
  source: DiscussionPageSource | null,
): Promise<DiscussionEvidence> {
  assertBounds(input.limit, input.maxPages);
  if (!source) {
    return {
      status: 'unavailable',
      bindingId: input.bindingId,
      observedAt: input.observedAt,
      items: [],
      pagesRead: 0,
      truncated: false,
      persisted: false,
    };
  }
  const items: SanitizedDiscussionItem[] = [];
  let cursor: string | null = null;
  let pagesRead = 0;
  let hasMore = false;
  let droppedItems = false;
  do {
    const page = await source.readPage({
      bindingId: input.bindingId,
      cursor,
      limit: input.limit - items.length,
    });
    pagesRead += 1;
    const remaining = input.limit - items.length;
    droppedItems ||= page.items.length > remaining;
    for (const item of page.items.slice(0, remaining)) {
      const suppressed = containsSensitiveContentSignal(item.body);
      items.push({
        ...item,
        body: suppressed ? WHOLE_FIELD_SUPPRESSION_MARKER : item.body,
        incomplete: suppressed,
      });
    }
    cursor = page.nextCursor;
    hasMore = cursor !== null;
  } while (
    cursor !== null &&
    pagesRead < input.maxPages &&
    items.length < input.limit
  );

  return {
    status: 'available',
    bindingId: input.bindingId,
    observedAt: input.observedAt,
    items,
    pagesRead,
    truncated: hasMore || droppedItems,
    persisted: false,
  };
}

export function distillDiscussionLocally(input: {
  bindingId: string;
  observedAt: string;
  selectedItemIds: readonly string[];
  items: readonly SanitizedDiscussionItem[];
}): string {
  const selected = new Set(input.selectedItemIds);
  const evidence = input.items.filter((item) => selected.has(item.id));
  return [
    `locally authored discussion distillation for ${input.bindingId}`,
    `Observed: ${input.observedAt}`,
    ...evidence.map(
      (item) =>
        `- ${item.body}${item.incomplete ? ' (incomplete evidence)' : ''}`,
    ),
  ].join('\n');
}

function assertBounds(limit: number, maxPages: number): void {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Discussion limit must be an integer from 1 to 100.');
  }
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 10) {
    throw new Error('Discussion maxPages must be an integer from 1 to 10.');
  }
}
