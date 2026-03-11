import { describe, expect, it } from 'vitest';

import {
  ContentTypeSchema,
  SCOPE_CONTENT_TYPES,
  ScopeSchema,
  SyncStrategySchema,
} from './types';

describe('shared types', () => {
  it('ContentType allows skill, agent, and rule', () => {
    expect(ContentTypeSchema.safeParse('skill').success).toBe(true);
    expect(ContentTypeSchema.safeParse('agent').success).toBe(true);
    expect(ContentTypeSchema.safeParse('rule').success).toBe(true);
    expect(ContentTypeSchema.safeParse('other').success).toBe(false);
  });

  it('SyncStrategy allows symlink, copy, auto', () => {
    expect(SyncStrategySchema.safeParse('symlink').success).toBe(true);
    expect(SyncStrategySchema.safeParse('copy').success).toBe(true);
    expect(SyncStrategySchema.safeParse('auto').success).toBe(true);
    expect(SyncStrategySchema.safeParse('invalid').success).toBe(false);
  });

  it('Scope allows project, user, all', () => {
    expect(ScopeSchema.safeParse('project').success).toBe(true);
    expect(ScopeSchema.safeParse('user').success).toBe(true);
    expect(ScopeSchema.safeParse('all').success).toBe(true);
    expect(ScopeSchema.safeParse('team').success).toBe(false);
  });

  it('SCOPE_CONTENT_TYPES maps scope to valid content types', () => {
    expect(SCOPE_CONTENT_TYPES.project).toEqual(['skill', 'agent', 'rule']);
    expect(SCOPE_CONTENT_TYPES.user).toEqual(['skill']);
    expect(SCOPE_CONTENT_TYPES.all).toEqual(['skill', 'agent', 'rule']);
  });

  it('SCOPE_CONTENT_TYPES.all matches union of project and user scopes', () => {
    const expected = [
      ...new Set([...SCOPE_CONTENT_TYPES.project, ...SCOPE_CONTENT_TYPES.user]),
    ];
    expect(SCOPE_CONTENT_TYPES.all).toEqual(expected);
  });
});
