import { describe, expect, it } from 'vitest';

import {
  buildManagedMarkdownBlock,
  insertManagedMarkdown,
  inspectManagedMarkdown,
  replaceManagedMarkdown,
} from './managed-markdown';

const bindingId = 'bnd_binding_123';

describe('managed Markdown boundaries', () => {
  it('distinguishes absent content and inserts a first managed block explicitly', () => {
    const original = '# User body\n\nKeep every byte.  ';
    expect(inspectManagedMarkdown(original, bindingId)).toEqual({
      status: 'absent',
      content: null,
    });

    const inserted = insertManagedMarkdown(original, bindingId, 'OAT content');
    expect(inserted.status).toBe('updated');
    if (inserted.status !== 'updated') return;
    expect(inserted.body).toBe(
      `${original}\n\n${buildManagedMarkdownBlock(bindingId, 'OAT content')}`,
    );
    expect(inserted.operation).toBe('insert');
  });

  it('extracts and replaces one unique managed region while preserving surrounding bytes', () => {
    const prefix = 'User prefix\r\n\r\n';
    const suffix = '\r\n\r\nUser suffix with spaces  ';
    const original = `${prefix}${buildManagedMarkdownBlock(
      bindingId,
      'Old managed content',
    )}${suffix}`;
    const inspected = inspectManagedMarkdown(original, bindingId);

    expect(inspected).toMatchObject({
      status: 'managed',
      content: 'Old managed content',
    });
    const replaced = replaceManagedMarkdown(
      original,
      bindingId,
      'New\ncontent',
    );
    expect(replaced).toEqual({
      status: 'updated',
      operation: 'replace',
      body: `${prefix}${buildManagedMarkdownBlock(
        bindingId,
        'New\ncontent',
      )}${suffix}`,
    });
  });

  it.each([
    [
      'duplicated',
      `${buildManagedMarkdownBlock(bindingId, 'One')}\n${buildManagedMarkdownBlock(
        bindingId,
        'Two',
      )}`,
      'duplicate-boundary',
    ],
    [
      'nested',
      buildManagedMarkdownBlock(
        bindingId,
        buildManagedMarkdownBlock('bnd_binding_456', 'Nested'),
      ),
      'nested-boundary',
    ],
    [
      'missing end',
      `<!-- OAT-MANAGED:${bindingId}:START -->\n## OAT-managed\n\nContent`,
      'malformed-boundary',
    ],
    [
      'crossed',
      `<!-- OAT-MANAGED:${bindingId}:END -->\n<!-- OAT-MANAGED:${bindingId}:START -->`,
      'malformed-boundary',
    ],
    [
      'user-edited heading',
      `<!-- OAT-MANAGED:${bindingId}:START -->\n## Renamed by user\n\nContent\n<!-- OAT-MANAGED:${bindingId}:END -->`,
      'heading-mismatch',
    ],
  ] as const)(
    'returns choice-required for %s markers',
    (_name, body, reason) => {
      expect(inspectManagedMarkdown(body, bindingId)).toEqual({
        status: 'choice-required',
        reason,
        body,
      });
      expect(replaceManagedMarkdown(body, bindingId, 'replacement')).toEqual({
        status: 'choice-required',
        reason,
        body,
      });
    },
  );

  it('never falls back to full replacement when anchors are absent', () => {
    const body = 'Entirely user-owned body.';
    expect(replaceManagedMarkdown(body, bindingId, 'replacement')).toEqual({
      status: 'choice-required',
      reason: 'missing-boundary',
      body,
    });
  });
});
