import { describe, expect, it } from 'vitest';

import {
  JIRA_ADF_LIMITS,
  insertJiraAdfManagedContent,
  inspectJiraAdf,
  replaceJiraAdfManagedContent,
  validateJiraAdfDocument,
  verifyJiraAdfReplacement,
  type JiraAdfDocument,
} from './jira-adf';

const richDocument: JiraAdfDocument = {
  type: 'doc',
  version: 1,
  content: [
    {
      type: 'paragraph',
      attrs: { unknown: { nested: true } },
      content: [
        { type: 'text', text: 'Remote ', marks: [{ type: 'strong' }] },
        { type: 'text', text: 'owned' },
      ],
    },
  ],
};

describe('Jira ADF managed content', () => {
  it('inserts and replaces one unique managed node without changing rich surrounding nodes', () => {
    const inserted = insertJiraAdfManagedContent(
      richDocument,
      'binding_42',
      'First',
    );
    const replaced = replaceJiraAdfManagedContent(
      inserted,
      'binding_42',
      'Second',
    );
    expect(inspectJiraAdf(replaced, 'binding_42')).toMatchObject({
      state: 'managed',
      managedText: 'Second',
    });
    expect(replaced.content[0]).toEqual(richDocument.content[0]);
    expect(
      verifyJiraAdfReplacement(inserted, replaced, 'binding_42', 'Second'),
    ).toBe(true);
  });

  it('fails closed for absent, duplicate, malformed, or lossy managed content', () => {
    expect(() =>
      replaceJiraAdfManagedContent(richDocument, 'binding_42', 'x'),
    ).toThrow('absent');
    const inserted = insertJiraAdfManagedContent(
      richDocument,
      'binding_42',
      'x',
    );
    expect(() =>
      inspectJiraAdf(
        { ...inserted, content: [...inserted.content, inserted.content[1]!] },
        'binding_42',
      ),
    ).toThrow('duplicated');
    expect(() =>
      inspectJiraAdf(
        {
          ...inserted,
          content: [{ ...inserted.content[1]!, type: 'paragraph' }],
        },
        'binding_42',
      ),
    ).toThrow('malformed');
    expect(
      verifyJiraAdfReplacement(
        inserted,
        {
          ...inserted,
          content: [{ type: 'paragraph', content: [] }, inserted.content[1]!],
        },
        'binding_42',
        'x',
      ),
    ).toBe(false);
  });

  it('uses UTF-8 byte limits and canonical structural equality', () => {
    const exact = 'a'.repeat(JIRA_ADF_LIMITS.maxManagedTextBytes);
    expect(
      insertJiraAdfManagedContent(richDocument, 'binding_42', exact),
    ).toBeDefined();
    expect(() =>
      insertJiraAdfManagedContent(richDocument, 'binding_42', `${exact}a`),
    ).toThrow('byte limit');
    const reordered: JiraAdfDocument = {
      version: 1,
      content: richDocument.content,
      type: 'doc',
    };
    expect(inspectJiraAdf(reordered, 'binding_42').surroundingDigest).toBe(
      inspectJiraAdf(richDocument, 'binding_42').surroundingDigest,
    );
  });

  it('recursively rejects nested or crossing managed anchors', () => {
    const inserted = insertJiraAdfManagedContent(
      richDocument,
      'binding_42',
      'managed',
    );
    const nested: JiraAdfDocument = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'blockquote',
          content: [inserted.content[1]!],
        },
      ],
    };
    expect(() => inspectJiraAdf(nested, 'binding_42')).toThrow('malformed');
    expect(() =>
      insertJiraAdfManagedContent(nested, 'binding_42', 'duplicate'),
    ).toThrow('malformed');
  });

  it('validates normalized ADF depth, node count, and document bytes', () => {
    const oversized: JiraAdfDocument = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'a'.repeat(JIRA_ADF_LIMITS.maxDocumentBytes),
            },
          ],
        },
      ],
    };
    expect(() => validateJiraAdfDocument(oversized)).toThrow('byte limit');
    let node = { type: 'text', text: 'deep' };
    for (let depth = 0; depth <= JIRA_ADF_LIMITS.maxDepth; depth += 1) {
      node = { type: 'paragraph', content: [node] } as typeof node;
    }
    expect(() =>
      validateJiraAdfDocument({ type: 'doc', version: 1, content: [node] }),
    ).toThrow('structural limits');
  });

  it('detects rich-mark or surrounding-node loss in readback', () => {
    const inserted = insertJiraAdfManagedContent(
      richDocument,
      'binding_42',
      'before',
    );
    const replaced = replaceJiraAdfManagedContent(
      inserted,
      'binding_42',
      'after',
    );
    const lossy = structuredClone(replaced);
    delete lossy.content[0]!.content![0]!.marks;
    expect(
      verifyJiraAdfReplacement(inserted, lossy, 'binding_42', 'after'),
    ).toBe(false);
  });
});
