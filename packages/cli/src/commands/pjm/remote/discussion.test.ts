import { describe, expect, it } from 'vitest';

import {
  distillDiscussionLocally,
  readRemoteDiscussion,
  type DiscussionPageSource,
} from './discussion';

const NOW = '2026-09-05T12:00:00.000Z';

function source(
  pages: Array<{
    items: Array<{ id: string; body: string; createdAt: string }>;
    nextCursor: string | null;
  }>,
): DiscussionPageSource {
  let index = 0;
  return {
    async readPage() {
      return pages[index++] ?? { items: [], nextCursor: null };
    },
  };
}

describe('bounded discussion evidence', () => {
  it('reads paginated evidence up to the requested limit', async () => {
    const result = await readRemoteDiscussion(
      {
        bindingId: 'bnd_discussion_001',
        limit: 2,
        maxPages: 3,
        observedAt: NOW,
      },
      source([
        {
          items: [{ id: 'c1', body: 'one', createdAt: NOW }],
          nextCursor: 'page-2',
        },
        {
          items: [{ id: 'c2', body: 'two', createdAt: NOW }],
          nextCursor: null,
        },
      ]),
    );

    expect(result.items.map((item) => item.id)).toEqual(['c1', 'c2']);
    expect(result.pagesRead).toBe(2);
    expect(result.persisted).toBe(false);
  });

  it('stops at the configured page limit', async () => {
    const result = await readRemoteDiscussion(
      {
        bindingId: 'bnd_discussion_001',
        limit: 5,
        maxPages: 1,
        observedAt: NOW,
      },
      source([
        {
          items: [{ id: 'c1', body: 'one', createdAt: NOW }],
          nextCursor: 'page-2',
        },
      ]),
    );
    expect(result.items).toHaveLength(1);
    expect(result.truncated).toBe(true);
  });

  it('does not mark an exact complete page as truncated', async () => {
    const result = await readRemoteDiscussion(
      {
        bindingId: 'bnd_discussion_001',
        limit: 2,
        maxPages: 1,
        observedAt: NOW,
      },
      source([
        {
          items: [
            { id: 'c1', body: 'one', createdAt: NOW },
            { id: 'c2', body: 'two', createdAt: NOW },
          ],
          nextCursor: null,
        },
      ]),
    );
    expect(result.items).toHaveLength(2);
    expect(result.truncated).toBe(false);
  });

  it('suppresses an entire discussion body on a conservative signal', async () => {
    const result = await readRemoteDiscussion(
      {
        bindingId: 'bnd_discussion_001',
        limit: 1,
        maxPages: 1,
        observedAt: NOW,
      },
      source([
        {
          items: [{ id: 'c1', body: 'api key appears here', createdAt: NOW }],
          nextCursor: null,
        },
      ]),
    );
    expect(result.items[0]).toMatchObject({
      body: '[SUPPRESSED:SENSITIVE-CONTENT]',
      incomplete: true,
    });
  });

  it('returns explicit unavailable evidence without a provider source', async () => {
    const result = await readRemoteDiscussion(
      {
        bindingId: 'bnd_discussion_001',
        limit: 2,
        maxPages: 1,
        observedAt: NOW,
      },
      null,
    );
    expect(result.status).toBe('unavailable');
    expect(result.items).toEqual([]);
  });

  it('never invokes a persistence surface', async () => {
    let reads = 0;
    const result = await readRemoteDiscussion(
      {
        bindingId: 'bnd_discussion_001',
        limit: 1,
        maxPages: 1,
        observedAt: NOW,
      },
      {
        async readPage() {
          reads += 1;
          return { items: [], nextCursor: null };
        },
      },
    );
    expect(reads).toBe(1);
    expect(Object.keys(result)).not.toContain('snapshot');
    expect(Object.keys(result)).not.toContain('journal');
  });

  it('distills only explicitly selected evidence into local authored text', () => {
    const authored = distillDiscussionLocally({
      bindingId: 'bnd_discussion_001',
      observedAt: NOW,
      selectedItemIds: ['c2'],
      items: [
        { id: 'c1', body: 'skip', createdAt: NOW, incomplete: false },
        { id: 'c2', body: 'keep', createdAt: NOW, incomplete: false },
      ],
    });
    expect(authored).toContain('keep');
    expect(authored).not.toContain('skip');
    expect(authored).toContain('locally authored');
  });
});
