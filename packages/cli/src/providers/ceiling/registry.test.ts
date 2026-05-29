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
      expect(claude.validValues).toEqual(['haiku', 'sonnet', 'opus']);
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

    it('returns null for an invalid value', () => {
      expect(claude.compileToDispatchArgs('gpt', 'implementer', {})).toBeNull();
    });

    it('flags verifyOnDispatch when the requested tier is above the orchestrator', () => {
      expect(
        claude.verifyOnDispatch('opus', { orchestratorTier: 'sonnet' }),
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
      expect(CLAUDE_TIER_ORDER).toEqual(['haiku', 'sonnet', 'opus']);
    });
  });

  describe('unknown provider', () => {
    const unknown: ProviderCeilingAdapter = getCeilingAdapter('cursor');

    it('falls back to an advisory no-op adapter', () => {
      expect(unknown.provider).toBe('cursor');
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
