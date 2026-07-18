import { describe, expect, it } from 'vitest';

import {
  CURSOR_MODEL_PIN_MAPPINGS,
  SUPPORTED_CURSOR_ROLE_TARGETS,
} from './catalog';

const APPROVED_G01_MAPPINGS = [
  ['composer-2.5', 'composer-2.5[fast=true]'],
  ['composer-2.5-fast', 'composer-2.5[fast=true]'],
  ['claude-sonnet-5-high', 'claude-sonnet-5[effort=high]'],
  ['gpt-5.6-luna-high', 'gpt-5.6-luna[reasoning=high]'],
  ['gpt-5.6-luna-xhigh', 'gpt-5.6-luna[reasoning=xhigh]'],
  ['cursor-grok-4.5-high', 'grok-4.5[effort=high,fast=false]'],
  ['cursor-grok-4.5-high-fast', 'grok-4.5[effort=high,fast=true]'],
  ['gpt-5.6-terra-high', 'gpt-5.6-terra[reasoning=high]'],
  ['gpt-5.6-sol-medium', 'gpt-5.6-sol[reasoning=medium]'],
  ['gpt-5.6-sol-high', 'gpt-5.6-sol[reasoning=high]'],
  ['claude-fable-5-thinking-high', 'claude-fable-5[effort=high]'],
  ['claude-fable-5-thinking-xhigh', 'claude-fable-5[effort=xhigh]'],
  ['claude-fable-5-xhigh', 'claude-fable-5[effort=xhigh]'],
  ['gpt-5.6-sol-xhigh', 'gpt-5.6-sol[reasoning=xhigh]'],
  ['gpt-5.6-sol-max', 'gpt-5.6-sol[reasoning=max]'],
] as const;

describe('cursor model pin catalogue', () => {
  it('copies every approved g01 ladder-to-frontmatter mapping exactly', () => {
    expect(
      CURSOR_MODEL_PIN_MAPPINGS.map(
        ({ ladderModelId, frontmatterModel }) =>
          [ladderModelId, frontmatterModel] as const,
      ),
    ).toEqual(APPROVED_G01_MAPPINGS);
  });

  it('requires mapping-specific approved evidence and non-empty brackets', () => {
    for (const mapping of CURSOR_MODEL_PIN_MAPPINGS) {
      expect(mapping.gateEvidence).toMatchObject({
        gate: 'g01',
        disposition: 'approved',
      });
      expect(mapping.gateEvidence.probeName).not.toBe('');
      expect(mapping.frontmatterModel).toMatch(/\[[^\]]+\]$/);
      expect(mapping.frontmatterModel).not.toBe(mapping.ladderModelId);
    }
  });

  it('keeps approved aliases materializable outside the supported catalogue', () => {
    const supported = new Set(
      SUPPORTED_CURSOR_ROLE_TARGETS.map(({ ladderModelId }) => ladderModelId),
    );

    expect(supported).not.toContain('composer-2.5-fast');
    expect(supported).not.toContain('cursor-grok-4.5-high-fast');
    expect(supported).not.toContain('claude-fable-5-xhigh');
    expect(SUPPORTED_CURSOR_ROLE_TARGETS).toHaveLength(12);
  });

  it('contains unique ladder ids', () => {
    const ids = CURSOR_MODEL_PIN_MAPPINGS.map(
      ({ ladderModelId }) => ladderModelId,
    );
    expect(new Set(ids)).toHaveLength(ids.length);
  });
});
