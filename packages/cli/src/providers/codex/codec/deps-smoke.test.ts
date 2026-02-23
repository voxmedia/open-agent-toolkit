import TOML from '@iarna/toml';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

describe('codec dependency wiring', () => {
  it('round-trips TOML and YAML values', () => {
    const yamlInput = { name: 'oat-reviewer', readonly: true };
    const tomlInput = {
      developer_instructions: 'Review',
      sandbox_mode: 'read-only',
    };

    const yamlOut = YAML.parse(YAML.stringify(yamlInput)) as Record<
      string,
      unknown
    >;
    const tomlOut = TOML.parse(TOML.stringify(tomlInput)) as Record<
      string,
      unknown
    >;

    expect(yamlOut.name).toBe('oat-reviewer');
    expect(yamlOut.readonly).toBe(true);
    expect(tomlOut.developer_instructions).toBe('Review');
    expect(tomlOut.sandbox_mode).toBe('read-only');
  });
});
