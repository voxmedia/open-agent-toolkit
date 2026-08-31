import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const skillUrl = new URL('../SKILL.md', import.meta.url);
const protocolUrl = new URL(
  '../references/external-action-protocol.md',
  import.meta.url,
);

test('keeps CLI policy, verdicts, adoption, and continuation authoritative', async () => {
  const [skill, protocol] = await Promise.all([
    readFile(skillUrl, 'utf8'),
    readFile(protocolUrl, 'utf8'),
  ]);
  assert.match(skill, /oat pjm doctor --json/);
  assert.match(
    skill,
    /CLI policy, preview, approval, safety, and terminal verdicts as\s+authoritative/,
  );
  assert.match(skill, /operation continue/);
  assert.match(skill, /Never infer success/);
  assert.match(protocol, /unchanged operation ID, step ID, and action digest/);
  assert.match(protocol, /Execute at most once/);
});

test('requires live discovery and bounded discussion reads', async () => {
  const skill = await readFile(skillUrl, 'utf8');
  assert.match(skill, /currently granted MCP or connector tools/);
  assert.match(skill, /already configured\s+provider CLI and its live help/);
  assert.match(skill, /page\/cursor and maximum\s+item limit/);
  assert.match(skill, /Never scan the repository, worktree, Git history/);
});

test('contains no static native invocation mapping or captured catalog', async () => {
  const content = `${await readFile(skillUrl, 'utf8')}\n${await readFile(protocolUrl, 'utf8')}`;
  for (const forbidden of [
    /mcp__[a-z0-9_]+/i,
    /catalogFingerprint/,
    /nativeRequest/,
    /(?:^|\s)--(?:repo|project|team|site)(?:\s|=)/m,
    /(?:^|\s)(?:acli|linear-cli|gh)(?:\s|$)/m,
  ]) {
    assert.doesNotMatch(content, forbidden);
  }
});
