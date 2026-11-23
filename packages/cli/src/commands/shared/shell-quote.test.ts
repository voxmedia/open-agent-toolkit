import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { shellQuote } from './shell-quote';

/** What a POSIX shell passes as the first argument for the printed word. */
function shellReads(word: string): string {
  return execFileSync('sh', ['-c', `printf '%s' ${word}`], {
    encoding: 'utf8',
  });
}

describe('shellQuote', () => {
  it('leaves a plain project path bare', () => {
    expect(shellQuote('.oat/projects/shared/alpha')).toBe(
      '.oat/projects/shared/alpha',
    );
  });

  it('quotes a path with spaces or quotes so the shell reads it as one word', () => {
    for (const value of [
      '/tmp/probe with spaces/.oat/projects/shared/alpha',
      "/tmp/it's here/alpha",
    ]) {
      expect(shellReads(shellQuote(value))).toBe(value);
    }
  });
});
