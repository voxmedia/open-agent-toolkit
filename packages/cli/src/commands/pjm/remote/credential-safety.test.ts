import { describe, expect, it } from 'vitest';

import { containsSensitiveContentSignal } from './credential-safety';

describe('field-level sensitive content signal', () => {
  it.each([
    'password',
    '[password]',
    '{"api_key":"value"}',
    '[api-key]',
    '<api key>',
    'access_token',
    '[access-token]',
    'access token',
    '.authorization:',
    '/secret/',
    '(token)',
  ])('detects bounded credential-key signal %s', (value) => {
    expect(containsSensitiveContentSignal(value)).toBe(true);
  });

  it.each([
    'compassword=value',
    'api_keychain=value',
    'access_tokenizer=value',
    'authorization_code=value',
    'secretary=value',
    'token_bucket=value',
    'ordinary non-secret description',
  ])('ignores credential-key substrings embedded in identifier %s', (value) => {
    expect(containsSensitiveContentSignal(value)).toBe(false);
  });
});
