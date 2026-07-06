import { describe, expect, it } from 'vitest';

import {
  DISPATCH_CEILING_PRESETS,
  compileAdvancedDispatchCeiling,
  compileDispatchCeilingPreset,
  compileDispatchPolicyPreset,
} from './dispatch-ceiling-preset';

describe('compileDispatchCeilingPreset', () => {
  it('balanced → { codex: high, claude: sonnet }', () => {
    const result = compileDispatchCeilingPreset('balanced');
    expect(result.providers).toEqual({ codex: 'high', claude: 'sonnet' });
    expect(result.preset).toBe('balanced');
  });

  it('maximum → { codex: xhigh, claude: opus }', () => {
    const result = compileDispatchCeilingPreset('maximum');
    expect(result.providers).toEqual({ codex: 'xhigh', claude: 'opus' });
    expect(result.preset).toBe('maximum');
  });

  it('cost-conscious → { codex: medium, claude: sonnet } (never haiku)', () => {
    const result = compileDispatchCeilingPreset('cost-conscious');
    expect(result.providers).toEqual({ codex: 'medium', claude: 'sonnet' });
    expect(result.providers.claude).not.toBe('haiku');
  });

  it('returns providers + preset provenance for a preset selection', () => {
    const result = compileDispatchCeilingPreset('balanced');
    expect(result).toMatchObject({
      preset: 'balanced',
      providers: expect.objectContaining({ codex: expect.any(String) }),
    });
  });

  it('DISPATCH_CEILING_PRESETS table contains all three presets', () => {
    expect(Object.keys(DISPATCH_CEILING_PRESETS)).toEqual([
      'balanced',
      'maximum',
      'cost-conscious',
    ]);
  });
});

describe('compileDispatchPolicyPreset', () => {
  it('economy → capped managed { codex: medium, claude: sonnet }', () => {
    const result = compileDispatchPolicyPreset('economy');
    expect(result).toEqual({
      mode: 'managed',
      policy: 'economy',
      providers: { codex: 'medium', claude: 'sonnet' },
    });
  });

  it('balanced → capped managed { codex: high, claude: sonnet }', () => {
    const result = compileDispatchPolicyPreset('balanced');
    expect(result).toEqual({
      mode: 'managed',
      policy: 'balanced',
      providers: { codex: 'high', claude: 'sonnet' },
    });
  });

  it('high → capped managed { codex: xhigh, claude: opus }', () => {
    const result = compileDispatchPolicyPreset('high');
    expect(result).toEqual({
      mode: 'managed',
      policy: 'high',
      providers: { codex: 'xhigh', claude: 'opus' },
    });
  });

  it('frontier → capped managed { codex: xhigh, claude: fable }', () => {
    const result = compileDispatchPolicyPreset('frontier');
    expect(result).toEqual({
      mode: 'managed',
      policy: 'frontier',
      providers: { codex: 'xhigh', claude: 'fable' },
    });
  });

  it('uncapped is explicit managed selection without concrete provider caps', () => {
    const result = compileDispatchPolicyPreset('uncapped');
    expect(result).toEqual({
      mode: 'managed',
      policy: 'uncapped',
    });
    expect('providers' in result).toBe(false);
  });
});

describe('compileAdvancedDispatchCeiling', () => {
  it('advanced/manual input passes providers through with NO preset key', () => {
    const result = compileAdvancedDispatchCeiling({ codex: 'low' });
    expect(result.providers).toEqual({ codex: 'low' });
    expect('preset' in result).toBe(false);
  });

  it('passes claude-only providers through', () => {
    const result = compileAdvancedDispatchCeiling({ claude: 'opus' });
    expect(result.providers).toEqual({ claude: 'opus' });
    expect('preset' in result).toBe(false);
  });

  it('passes both providers through', () => {
    const result = compileAdvancedDispatchCeiling({
      codex: 'xhigh',
      claude: 'sonnet',
    });
    expect(result.providers).toEqual({ codex: 'xhigh', claude: 'sonnet' });
    expect('preset' in result).toBe(false);
  });
});
