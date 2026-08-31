import { describe, expect, it } from 'vitest';

import {
  containsCredentialAssignment,
  redactCredentialAssignments,
} from './credential-safety';

const marker = '[REDACTED:CREDENTIAL]';

describe('credential assignment safety', () => {
  it.each([
    '(password=SECRET_PAREN)',
    '!api_key=SECRET_BANG!',
    '<access_token=SECRET_ANGLE>',
    '.authorization=SECRET_PERIOD',
    '/secret=SECRET_SLASH/',
    '{"token":"SECRET_JSON"}',
  ])('detects and redacts punctuation-delimited assignment %s', (value) => {
    expect(containsCredentialAssignment(value)).toBe(true);
    const redacted = redactCredentialAssignments(value, marker);
    expect(redacted).toContain(marker);
    expect(redacted).not.toMatch(/SECRET_[A-Z]+/);
  });

  it('redacts complete multiline quoted values with escaped and doubled quotes', () => {
    const value = `password="prefix
escaped \\"quote\\" and ""paired""
SECRET_SUFFIX"`;
    const redacted = redactCredentialAssignments(value, marker);

    expect(redacted).toBe(`password="${marker}"`);
    expect(redacted).not.toMatch(/prefix|quote|paired|SECRET_SUFFIX/);
  });

  it.each([
    'compassword=value',
    'api_keychain=value',
    'access_tokenizer=value',
    'authorization_code=value',
    'secretary=value',
    'token_bucket=value',
  ])('ignores key substrings embedded in identifier %s', (value) => {
    expect(containsCredentialAssignment(value)).toBe(false);
    expect(redactCredentialAssignments(value, marker)).toBe(value);
  });
});
