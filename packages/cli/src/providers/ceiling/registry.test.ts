import { describe, expect, it } from 'vitest';

import {
  CLAUDE_TIER_ORDER,
  getCeilingAdapter,
  type ProviderCeilingAdapter,
} from './registry';

describe('provider ceiling adapters', () => {
  describe('codex adapter', () => {
    const codex = getCeilingAdapter('codex');

    it('declares pinned-variant mechanism and supports the ceiling', () => {
      expect(codex.provider).toBe('codex');
      expect(codex.supportsCeiling).toBe(true);
      expect(codex.mechanism).toBe('pinned-variant');
      expect(codex.validValues).toEqual(['low', 'medium', 'high', 'xhigh']);
    });

    it('compiles a value to the implementer pinned-variant name', () => {
      expect(codex.compileToDispatchArgs('high', 'implementer', {})).toEqual({
        variant: 'oat-phase-implementer-high',
      });
    });

    it('compiles a value to the reviewer pinned-variant name', () => {
      expect(codex.compileToDispatchArgs('xhigh', 'reviewer', {})).toEqual({
        variant: 'oat-reviewer-xhigh',
      });
    });

    it('returns null for an invalid value', () => {
      expect(
        codex.compileToDispatchArgs('turbo', 'implementer', {}),
      ).toBeNull();
    });

    it('never flags verifyOnDispatch (effort is not an above-orchestrator upgrade)', () => {
      expect(
        codex.verifyOnDispatch('high', { orchestratorTier: 'medium' }),
      ).toBe(false);
    });
  });

  describe('claude adapter', () => {
    const claude = getCeilingAdapter('claude');

    it('declares model-arg mechanism and supports the ceiling', () => {
      expect(claude.provider).toBe('claude');
      expect(claude.supportsCeiling).toBe(true);
      expect(claude.mechanism).toBe('model-arg');
      expect(claude.validValues).toEqual(['haiku', 'sonnet', 'opus', 'fable']);
    });

    it('compiles a value to a model arg for the implementer role', () => {
      expect(claude.compileToDispatchArgs('sonnet', 'implementer', {})).toEqual(
        {
          model: 'sonnet',
        },
      );
    });

    it('compiles a value to a model arg for the reviewer role', () => {
      expect(claude.compileToDispatchArgs('opus', 'reviewer', {})).toEqual({
        model: 'opus',
      });
    });

    it('compiles fable to a model arg for Frontier dispatch', () => {
      expect(claude.compileToDispatchArgs('fable', 'reviewer', {})).toEqual({
        model: 'fable',
      });
    });

    it('returns null for an invalid value', () => {
      expect(claude.compileToDispatchArgs('gpt', 'implementer', {})).toBeNull();
    });

    it('flags verifyOnDispatch when the requested tier is above the orchestrator', () => {
      expect(
        claude.verifyOnDispatch('opus', { orchestratorTier: 'sonnet' }),
      ).toBe(true);
    });

    it('flags verifyOnDispatch when fable is above the orchestrator', () => {
      expect(
        claude.verifyOnDispatch('fable', { orchestratorTier: 'opus' }),
      ).toBe(true);
    });

    it('does not flag verifyOnDispatch for a cap-down request', () => {
      expect(
        claude.verifyOnDispatch('sonnet', { orchestratorTier: 'opus' }),
      ).toBe(false);
    });

    it('does not flag verifyOnDispatch for a lateral request', () => {
      expect(
        claude.verifyOnDispatch('sonnet', { orchestratorTier: 'sonnet' }),
      ).toBe(false);
    });

    it('does not flag verifyOnDispatch when the orchestrator tier is unknown', () => {
      expect(claude.verifyOnDispatch('opus', {})).toBe(false);
    });

    it('exposes a tier order for above-orchestrator comparison', () => {
      expect(CLAUDE_TIER_ORDER).toEqual(['haiku', 'sonnet', 'opus', 'fable']);
    });
  });

  describe('cursor adapter', () => {
    const cursor = getCeilingAdapter('cursor');

    it('declares model-arg mechanism and supports the ceiling', () => {
      expect(cursor.provider).toBe('cursor');
      expect(cursor.supportsCeiling).toBe(true);
      expect(cursor.mechanism).toBe('model-arg');
      expect(cursor.validValues).toEqual([]);
    });

    it('compiles opaque slugs to model args for implementer and reviewer roles', () => {
      expect(
        cursor.compileToDispatchArgs('composer-2.5', 'implementer', {}),
      ).toEqual({
        model: 'composer-2.5',
      });
      expect(
        cursor.compileToDispatchArgs('gpt-5.3-codex-high', 'reviewer', {}),
      ).toEqual({
        model: 'gpt-5.3-codex-high',
      });
    });

    it('returns null for blank model values', () => {
      expect(cursor.compileToDispatchArgs('', 'implementer', {})).toBeNull();
      expect(cursor.compileToDispatchArgs('   ', 'reviewer', {})).toBeNull();
    });

    it('never flags verifyOnDispatch because Cursor has no total order', () => {
      expect(
        cursor.verifyOnDispatch('gpt-5.3-codex-high', {
          orchestratorTier: 'composer-2.5',
        }),
      ).toBe(false);
    });
  });

  describe('unknown provider', () => {
    const unknown: ProviderCeilingAdapter = getCeilingAdapter('other-provider');

    it('falls back to an advisory no-op adapter', () => {
      expect(unknown.provider).toBe('other-provider');
      expect(unknown.supportsCeiling).toBe(false);
      expect(unknown.mechanism).toBe('none');
      expect(unknown.validValues).toEqual([]);
    });

    it('compiles to null (advisory) regardless of value or role', () => {
      expect(
        unknown.compileToDispatchArgs('high', 'implementer', {}),
      ).toBeNull();
      expect(unknown.compileToDispatchArgs('opus', 'reviewer', {})).toBeNull();
    });

    it('never flags verifyOnDispatch', () => {
      expect(
        unknown.verifyOnDispatch('opus', { orchestratorTier: 'sonnet' }),
      ).toBe(false);
    });
  });
});
