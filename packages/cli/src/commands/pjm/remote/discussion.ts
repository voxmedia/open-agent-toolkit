import { containsSensitiveContentSignal } from './credential-safety';
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
  do {
    const page = await source.readPage({
      bindingId: input.bindingId,
      cursor,
      limit: input.limit - items.length,
    });
    pagesRead += 1;
    for (const item of page.items.slice(0, input.limit - items.length)) {
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
    truncated: hasMore || items.length >= input.limit,
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
