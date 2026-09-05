import { describe, expect, it } from 'vitest';

import {
  JIRA_ADF_LIMITS,
  insertJiraAdfManagedContent,
  inspectJiraAdf,
  replaceJiraAdfManagedContent,
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
});
