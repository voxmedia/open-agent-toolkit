import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const route = new URL('../SKILL.md', import.meta.url);

const guidance = await readFile(route, 'utf8');

// Command-ish content: a backticked fragment naming `codex`, or any line that
// spells a sandbox flag (Quick Reference rows never contain the literal
// `codex exec`, yet they are the initial-run and cross-directory examples).
const commandLines = guidance
  .split('\n')
  .filter((line) => /`[^`\n]*codex /.test(line) || /-s |--sandbox/.test(line));

// The one documented exception: the non-repository example. Anything else that
// is command-ish must not carry the bypass.
const documentsTheException = (line) => /not a Git repo/i.test(line);

test('codex-skill routes model and effort through the provider authority', () => {
  assert.match(
    guidance,
    /subagent-orchestration\/references\/provider-codex\.md/,
    'the skill must name the Codex provider reference as the selection authority',
  );
  assert.match(
    guidance,
    /source of truth/i,
    'the skill must mark the provider reference as the source of truth',
  );
  assert.match(
    guidance,
    /reasoning effort/i,
    'the skill must still select a reasoning effort alongside the model',
  );
});

test('codex-skill does not pin the retired fixed model pair', () => {
  // Narrow to the retired pair offered as a choice: incidental prose about a
  // compatibility route (or `gpt-5.4-mini`, still an eligible specialist route)
  // must stay allowed.
  for (const stalePairing of [
    /gpt-5\.3-codex[\s\S]{0,160}?gpt-5\.4/i,
    /gpt-5\.4[\s\S]{0,160}?gpt-5\.3-codex/i,
  ]) {
    assert.doesNotMatch(
      guidance,
      stalePairing,
      'the retired gpt-5.3-codex / gpt-5.4 fixed choice must not return',
    );
  }

  // Slug-level guard, no verb required: a retired slug in a backticked route
  // fails wherever it appears, while live specialist suffixes such as
  // `gpt-5.4-mini` stay allowed.
  assert.doesNotMatch(
    guidance,
    /`gpt-5\.[0-3][^`\n]*`|`gpt-5\.4`(?!-)/i,
    'the skill must not name a retired model slug as a route',
  );
});

test('codex-skill never mandates the repository-check bypass', () => {
  assert.doesNotMatch(
    guidance,
    /always use\s+`?--skip-git-repo-check/i,
    'a blanket "always use" repository-check bypass must not return',
  );

  assert.match(
    guidance,
    /not a Git repository/i,
    'the skill must state the non-repository condition for the bypass',
  );
  assert.match(
    guidance,
    /--skip-git-repo-check[\s\S]{0,600}?authoriz/i,
    'the bypass guidance must require authorization',
  );
  assert.match(
    guidance,
    /high-impact flags[\s\S]{0,300}?--skip-git-repo-check/,
    'the bypass must remain in the high-impact permission-gated flag list',
  );
});

test('codex-skill command examples omit the bypass by default', () => {
  const exampleLines = commandLines.filter(
    (line) => !documentsTheException(line),
  );

  assert.ok(
    exampleLines.length >= 3,
    'expected initial-run, resume, and quick-reference examples to be present',
  );

  for (const line of exampleLines) {
    assert.doesNotMatch(
      line,
      /--skip-git-repo-check/,
      `default command example must not carry the repository-check bypass: ${line}`,
    );
  }

  const resumeLines = commandLines.filter((line) =>
    /codex exec resume/.test(line),
  );
  assert.ok(resumeLines.length >= 2, 'expected multiple resume examples');
  for (const line of resumeLines) {
    assert.doesNotMatch(
      line,
      /--skip-git-repo-check/,
      `resume example must not carry the repository-check bypass: ${line}`,
    );
  }
});

test('codex-skill cross-directory guidance keeps the repository check', () => {
  const crossDirectory = guidance
    .split('\n')
    .filter((line) => /-C[ ,]|--cd/.test(line));

  assert.ok(crossDirectory.length > 0, 'expected -C/--cd guidance');
  for (const line of crossDirectory) {
    assert.doesNotMatch(
      line,
      /--skip-git-repo-check/,
      `-C example must not carry the repository-check bypass: ${line}`,
    );
  }
});

test('codex-skill does not promise inherited resume permissions', () => {
  assert.doesNotMatch(
    guidance,
    /resumed (?:session|run)[^.]{0,120}?(?:inherits|automatically uses)[^.]{0,160}?sandbox/i,
    'the skill must not claim a resumed session restores the original sandbox',
  );
  assert.match(
    guidance,
    /resum[\s\S]{0,400}?(?:current invocation|current defaults|configuration defaults)/i,
    'resume guidance must attribute sandbox and approval policy to current configuration',
  );
});

test('codex-skill uses only live documented approval flags', () => {
  assert.doesNotMatch(
    guidance,
    /--full-auto/,
    '--full-auto is not a live codex exec flag',
  );
  assert.match(
    guidance,
    /--approve-for-me/,
    'the skill must use the live automatic-approval flag',
  );
  assert.match(
    guidance,
    /high-impact flags[\s\S]{0,300}?--approve-for-me/,
    'the live approval flag must be permission-gated as high impact',
  );
});
