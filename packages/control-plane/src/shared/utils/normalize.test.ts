import { describe, expect, it } from 'vitest';

import { normalizeNullableString, parseBoolean } from './normalize';

describe('normalize utils', () => {
  it('normalizes null-like strings and optional placeholders', () => {
    expect(normalizeNullableString('  value  ')).toBe('value');
    expect(normalizeNullableString('null')).toBeNull();
    expect(
      normalizeNullableString('{ OAT_PHASE }', {
        treatPlaceholdersAsNull: true,
      }),
    ).toBeNull();
    expect(normalizeNullableString('{ OAT_PHASE }')).toBe('{ OAT_PHASE }');
  });

  it('parses booleans from booleans and strings', () => {
    expect(parseBoolean(true)).toBe(true);
    expect(parseBoolean('true')).toBe(true);
    expect(parseBoolean('false')).toBe(false);
    expect(parseBoolean('nope')).toBe(false);
  });
});
