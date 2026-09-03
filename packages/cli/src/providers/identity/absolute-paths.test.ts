import { redactDispatchMessage } from '@commands/project/dispatch/record';
import { describe, expect, it } from 'vitest';

import { containsAbsolutePath, redactAbsolutePaths } from './absolute-paths';

describe('absolute path detection', () => {
  it.each([
    ['posix root-level', '/secret'],
    ['posix home', '/Users/tstang/.ssh/id_rsa'],
    ['linux home', '/home/tstang/key'],
    ['windows drive backslash', 'C:\\Users\\tstang\\k.pem'],
    ['windows drive slash', 'C:/Users/tstang'],
    ['unc share', '\\\\server\\share\\secret'],
    ['file url', 'file:///etc/passwd'],
    ['quoted in a message', "EACCES: open '/secret'"],
  ])('catches %s', (_name, value) => {
    expect(containsAbsolutePath(value)).toBe(true);
    expect(redactAbsolutePaths(value)).not.toContain(value);
  });

  it.each([
    ['a conjunction', 'and/or'],
    ['a journal revision', 'dispatch/request-1.json'],
    ['a date', '2026/09/03'],
    ['the canonical role form', '<user>/agents/oat-reviewer.md'],
    ['a relative path', 'a/b/c'],
    ['a lock file', '.dispatch-lock'],
    ['a model selector', 'gpt-5.6-sol'],
  ])('does not treat %s as a path', (_name, value) => {
    expect(containsAbsolutePath(value)).toBe(false);
    expect(redactAbsolutePaths(value)).toBe(value);
  });

  it.each([
    ['assignment', 'run with cwd=/Users/alice/private now'],
    ['assignment file url', 'source=file:///etc/passwd'],
    ['flag assignment', '--path=/Users/x'],
    ['assignment windows drive', 'a=C:\\Users\\x'],
    ['comma separated list', 'paths=/etc/a,/etc/b'],
    ['semicolon separated', 'cmd;/bin/sh'],
    ['pipe separated', 'cat x|/bin/less'],
  ])('catches a path in %s form', (_name, value) => {
    expect(containsAbsolutePath(value)).toBe(true);
    expect(redactAbsolutePaths(value)).toContain('<redacted-path>');
  });

  it.each([
    ['an http url', 'url=https://example.com/x'],
    ['an ssh remote', 'git@github.com:org/repo.git'],
    ['a plain assignment', 'key=value'],
    ['a model assignment', 'model=gpt-5.6-sol'],
    ['a relative assignment', 'out=dist/bundle.js'],
    ['a scheme-relative url', 'src=//cdn.example.com/x.js'],
  ])('does not treat %s as a POSIX path', (_name, value) => {
    expect(containsAbsolutePath(value)).toBe(false);
    expect(redactAbsolutePaths(value)).toBe(value);
  });

  describe('narrowed contract', () => {
    it('rejects a colon-prefixed path in an identity field', () => {
      // Identity fields admit no URL and no regex, so ambiguity is resolved by
      // rejecting rather than by guessing.
      for (const value of ['cwd:/Users/alice/private', 'path:/Users/alice/x']) {
        expect(containsAbsolutePath(value), value).toBe(true);
      }
    });

    it('leaves a colon-prefixed path in prose alone, by design', () => {
      // Pinned so the limit is visible in the suite rather than an unstated
      // gap: `:` cannot be a path delimiter without mangling every URL.
      expect(redactAbsolutePaths('see cwd:/Users/alice/private')).toBe(
        'see cwd:/Users/alice/private',
      );
    });

    it('never mangles a URL route or a regex literal in prose', () => {
      for (const value of [
        'https://site.example/login?next=/dashboard',
        "node -e 'const re=/foo/bar/'",
        'https://example.com/a/b',
        'fetch https://x.example/v1/items/42 now',
      ]) {
        expect(redactAbsolutePaths(value), value).toBe(value);
      }
    });

    it('still redacts an unambiguous path in prose', () => {
      expect(redactAbsolutePaths('read /Users/alice/.ssh/id_rsa now')).toBe(
        'read <redacted-path> now',
      );
      expect(redactAbsolutePaths('cwd=/Users/alice/private')).toBe(
        'cwd=<redacted-path>',
      );
    });
  });

  it('is the same detector the message boundary uses', () => {
    // Two independent notions of "looks like a path" is how a path could be
    // scrubbed from a message and written verbatim into the record.
    expect(redactDispatchMessage("EACCES: open '/secret'")).toBe(
      "EACCES: open '<redacted-path>'",
    );
    expect(redactDispatchMessage('see file:///etc/passwd')).toBe(
      'see <redacted-path>',
    );
    expect(redactDispatchMessage('<user>/agents/oat-reviewer.md')).toBe(
      '<user>/agents/oat-reviewer.md',
    );
  });
});
