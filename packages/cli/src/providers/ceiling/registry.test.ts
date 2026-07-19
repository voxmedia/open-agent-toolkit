import { describe, expect, it } from 'vitest';

import {
  CLAUDE_TIER_ORDER,
  getCeilingAdapter,
  isDirectDispatchRoleName,
  type ProviderCeilingAdapter,
} from './registry';

describe('provider ceiling adapters', () => {
  describe('codex adapter', () => {
    const codex = getCeilingAdapter('codex');

    it('declares pinned-variant mechanism and supports the ceiling', () => {
      expect(codex.provider).toBe('codex');
      expect(codex.supportsCeiling).toBe(true);
      expect(codex.mechanism).toBe('pinned-variant');
      expect(codex.validValues).toEqual([
        'low',
        'medium',
        'high',
        'xhigh',
        'max',
      ]);
    });

    it('compiles a codex model-effort target to the implementer materialized role name', () => {
      expect(
        codex.compileToDispatchArgs('xhigh', 'implementer', {
          target: { model: 'gpt-5.6-sol', effort: 'xhigh' },
        }),
      ).toEqual({
        variant: 'oat-phase-implementer-gpt-5-6-sol-xhigh',
      });
    });

    it('compiles a codex model-effort target to the reviewer materialized role name', () => {
      expect(
        codex.compileToDispatchArgs('xhigh', 'reviewer', {
          target: { model: 'gpt-5.6-sol', effort: 'xhigh' },
        }),
      ).toEqual({
        variant: 'oat-reviewer-gpt-5-6-sol-xhigh',
      });
    });

    it('preserves explicit max effort in a codex materialized target', () => {
      expect(
        codex.compileToDispatchArgs('max', 'implementer', {
          target: { model: 'gpt-5.6-sol', effort: 'max' },
        }),
      ).toEqual({
        variant: 'oat-phase-implementer-gpt-5-6-sol-max',
      });
    });

    it.each([
      [
        'vendor/model.x',
        'vendor.model.x',
        'oat-reviewer-vendor-model-x-high-5330f8196e',
        'oat-reviewer-vendor-model-x-high-ff27ce33ce',
      ],
      [
        'Vendor.Model.X',
        'vendor.model.x',
        'oat-reviewer-vendor-model-x-high-91728b819f',
        'oat-reviewer-vendor-model-x-high-ff27ce33ce',
      ],
    ])(
      'deterministically disambiguates custom targets %s and %s that normalize to the same role slug',
      (leftModel, rightModel, leftVariant, rightVariant) => {
        const compile = (model: string) =>
          codex.compileToDispatchArgs('high', 'reviewer', {
            target: { model, effort: 'high' },
          });

        const left = compile(leftModel);
        const right = compile(rightModel);
        expect(left).toEqual({ variant: leftVariant });
        expect(right).toEqual({ variant: rightVariant });
        expect(compile(leftModel)).toEqual(left);
        expect(compile(rightModel)).toEqual(right);
      },
    );

    it('does not compile bare legacy effort values to deterministic dispatch args', () => {
      expect(codex.compileToDispatchArgs('high', 'implementer', {})).toBeNull();
    });

    it('rejects direct managed role names as candidate models', () => {
      expect(
        codex.compileToDispatchArgs('high', 'implementer', {
          target: {
            model: 'oat-phase-implementer-gpt-5-6-sol-high',
            effort: 'high',
          },
        }),
      ).toBeNull();
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

    it('rejects direct managed role names as model args', () => {
      expect(
        claude.compileToDispatchArgs(
          'oat-reviewer-gpt-5-6-sol-high',
          'reviewer',
          {},
        ),
      ).toBeNull();
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

    it('declares model-axis pinned variants and supports the ceiling', () => {
      expect(cursor.provider).toBe('cursor');
      expect(cursor.supportsCeiling).toBe(true);
      expect(cursor.mechanism).toBe('pinned-variant');
      expect(cursor.selectionAxis).toBe('model');
      expect(cursor.validValues).toEqual([]);
    });

    it('compiles mapped flat IDs to role-specific native variants', () => {
      expect(
        cursor.compileToDispatchArgs('composer-2.5', 'implementer', {}),
      ).toEqual({
        variant: 'oat-phase-implementer-composer-2-5',
      });
      expect(
        cursor.compileToDispatchArgs('gpt-5.6-sol-high', 'reviewer', {}),
      ).toEqual({
        variant: 'oat-reviewer-gpt-5-6-sol-high',
      });
    });

    it('returns null for blank model values', () => {
      expect(cursor.compileToDispatchArgs('', 'implementer', {})).toBeNull();
      expect(cursor.compileToDispatchArgs('   ', 'reviewer', {})).toBeNull();
    });

    it('rejects direct managed role names and unmapped models', () => {
      expect(
        cursor.compileToDispatchArgs(
          'oat-phase-implementer-gpt-5-6-sol-high',
          'implementer',
          {},
        ),
      ).toBeNull();
      expect(
        cursor.compileToDispatchArgs(
          'opaque:model/lower [v1]',
          'implementer',
          {},
        ),
      ).toBeNull();
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

  it.each([
    'oat-phase-implementer',
    'oat-phase-implementer-gpt-5-6-sol-high',
    'oat-reviewer-gpt-5-6-sol-high',
  ])('recognizes direct managed role selector %s', (value) => {
    expect(isDirectDispatchRoleName(value)).toBe(true);
  });

  it('does not infer role selectors from ordinary opaque model strings', () => {
    expect(isDirectDispatchRoleName('opaque:oat-reviewer-ish')).toBe(false);
  });
});
