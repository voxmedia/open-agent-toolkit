import { describe, expect, it } from 'vitest';

import {
  LINKABLE_ARTIFACTS,
  LINKS_END,
  LINKS_START,
  parseGitHubOrigin,
  renderLinksBlock,
  replaceLinksBlock,
  type LinksInput,
} from './render';

const input: LinksInput = {
  slug: 'demo',
  sha: 'a1b2c3d4e5f67890123456789012345678901234',
  ref: 'refs/oat/projects/demo',
  originUrl: 'git@github.com:o/r.git',
  present: ['discovery.md', 'design.md', 'summary.md'],
  pinnedAt: '2026-08-27',
};

describe('parseGitHubOrigin', () => {
  it.each([
    ['git@github.com:o/r.git', { owner: 'o', repo: 'r' }],
    ['https://github.com/o/r.git', { owner: 'o', repo: 'r' }],
    ['https://github.com/o/r', { owner: 'o', repo: 'r' }],
    ['ssh://git@github.com/o/r.git', { owner: 'o', repo: 'r' }],
  ])('parses %s', (url, expected) => {
    expect(parseGitHubOrigin(url)).toEqual(expected);
  });

  it.each([
    'git@gitlab.com:o/r.git',
    'https://bitbucket.org/o/r',
    '../local/repo',
  ])('rejects %s', (url) => {
    expect(parseGitHubOrigin(url)).toBeNull();
  });
});

describe('renderLinksBlock', () => {
  it('renders the complete GitHub block', () => {
    expect(renderLinksBlock(input)).toMatchInlineSnapshot(`
      "<!-- oat:project-links:start -->

      **OAT project** \`demo\` (synced) — pinned to \`refs/oat/projects/demo\` @ \`a1b2c3d\` (2026-08-27)
      [Discovery](https://github.com/o/r/blob/a1b2c3d4e5f67890123456789012345678901234/discovery.md) · [Design](https://github.com/o/r/blob/a1b2c3d4e5f67890123456789012345678901234/design.md) · [Summary](https://github.com/o/r/blob/a1b2c3d4e5f67890123456789012345678901234/summary.md)

      <!-- oat:project-links:end -->"
    `);
  });

  it('omits artifacts not present and appends a durable summary path', () => {
    const block = renderLinksBlock({
      ...input,
      present: ['summary.md'],
      durableSummaryPath: 'docs/project-summaries/demo.md',
    });
    expect(block).toContain('[Summary](');
    expect(block).not.toContain('[Discovery](');
    expect(block).not.toContain('[Design](');
    expect(block).toContain(
      'Durable summary: `docs/project-summaries/demo.md`',
    );
  });

  it('degrades non-GitHub origins to plain ref text', () => {
    const block = renderLinksBlock({
      ...input,
      originUrl: 'https://gitlab.com/o/r.git',
    });
    expect(block).toContain('refs/oat/projects/demo` @ `a1b2c3d`');
    expect(block).not.toContain('https://');
  });

  it('renders completed-ref labels while keeping URLs pinned to the full SHA', () => {
    const completed = renderLinksBlock({
      ...input,
      ref: 'refs/oat/completed/demo',
    });
    expect(completed).toContain('refs/oat/completed/demo');
    expect(completed).toContain(`/blob/${input.sha}/discovery.md`);
    expect(completed).not.toContain('/blob/refs/oat/completed/demo/');
  });
});

describe('replaceLinksBlock', () => {
  const block = renderLinksBlock(input);

  it('replaces an existing block idempotently', () => {
    const original = `Before\n\n${LINKS_START}\nold\n${LINKS_END}\n\nAfter`;
    const once = replaceLinksBlock(original, block);
    const twice = replaceLinksBlock(once.body, block);
    expect(once).toEqual({
      body: `Before\n\n${block}\n\nAfter`,
      replaced: true,
      malformed: false,
    });
    expect(twice.body).toBe(once.body);
  });

  it('appends an absent block with a blank line', () => {
    expect(replaceLinksBlock('Body', block)).toEqual({
      body: `Body\n\n${block}`,
      replaced: false,
      malformed: false,
    });
  });

  it.each([`Body\n${LINKS_START}\nold`, `Body\nold\n${LINKS_END}`])(
    'leaves malformed bodies unchanged',
    (body) => {
      expect(replaceLinksBlock(body, block)).toEqual({
        body,
        replaced: false,
        malformed: true,
      });
    },
  );
});

it('exposes the exact reviewer-facing artifact allowlist', () => {
  expect(LINKABLE_ARTIFACTS).toEqual([
    'discovery.md',
    'design.md',
    'summary.md',
  ]);
});
