import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// The shipped prose is the contract here: analyze must audit shell fences
// against the same default that authoring-docs tells writers to use.
const read = (path) =>
  readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\s+/g, ' ');

test('analyze surfaces share the authoring-docs default shell fence', () => {
  const canonical = read(
    '../../authoring-docs/references/writing-style.md',
  ).match(/Use `(\w+)` for shell commands unless the example is POSIX-only/);
  assert.ok(canonical, 'authoring-docs states the shell fence default');
  for (const [path, pattern] of [
    [
      '../SKILL.md',
      /shell examples should follow local fence conventions, defaulting to `(\w+)`/,
    ],
    [
      '../references/quality-checklist.md',
      /Shell command examples follow the repo's documented fence convention; default to `(\w+)`/,
    ],
  ]) {
    const match = read(path).match(pattern);
    assert.ok(match, `${path} states a shell fence default`);
    assert.equal(match[1], canonical[1], path);
  }
});
