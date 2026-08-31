import { describe, expect, it } from 'vitest';

import {
  findDanglingAssociatedIssueBindings,
  isAssociationAuthorizing,
  parseAssociatedIssues,
  serializeAssociatedIssues,
} from './association';

describe('associated issue compatibility codec', () => {
  it('parses legacy scalars, reference objects, and canonical bindings', () => {
    expect(
      parseAssociatedIssues([
        'https://github.com/a/b/issues/1',
        { type: 'linear', ref: 'ENG-123' },
        { type: 'jira', ref: 'OAT-9', binding: 'bnd_binding_123' },
      ]),
    ).toEqual([
      {
        kind: 'legacy-scalar',
        ref: 'https://github.com/a/b/issues/1',
      },
      { kind: 'reference', type: 'linear', ref: 'ENG-123' },
      {
        kind: 'reference',
        type: 'jira',
        ref: 'OAT-9',
        bindingId: 'bnd_binding_123',
      },
    ]);
  });

  it('round-trips unrelated values without rewriting them', () => {
    const value = [
      { vendor: 'custom', payload: { id: 1 } },
      42,
      null,
      { type: 'github', ref: 'https://github.com/a/b/issues/1' },
    ];

    expect(serializeAssociatedIssues(parseAssociatedIssues(value))).toEqual(
      value,
    );
  });

  it('emits canonical type/ref/binding keys for bound references', () => {
    expect(
      serializeAssociatedIssues([
        {
          kind: 'reference',
          type: 'github',
          ref: 'https://github.com/a/b/issues/1',
          bindingId: 'bnd_binding_123',
        },
      ]),
    ).toEqual([
      {
        type: 'github',
        ref: 'https://github.com/a/b/issues/1',
        binding: 'bnd_binding_123',
      },
    ]);
  });

  it('reports dangling binding references without treating associations as authority', () => {
    const refs = parseAssociatedIssues([
      { type: 'github', ref: '#1', binding: 'bnd_binding_123' },
      { type: 'linear', ref: 'ENG-1', binding: 'bnd_binding_456' },
    ]);

    expect(
      findDanglingAssociatedIssueBindings(refs, new Set(['bnd_binding_123'])),
    ).toEqual(['bnd_binding_456']);
    expect(refs.every((ref) => !isAssociationAuthorizing(ref))).toBe(true);
  });
});
