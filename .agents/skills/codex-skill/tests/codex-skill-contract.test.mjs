import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const route = new URL('../SKILL.md', import.meta.url);

const guidance = await readFile(route, 'utf8');

// Undo soft wraps first: a sentence that spans two physical lines is still one
// statement, so a cosmetic rewrap must not change whether it reads as prose or
// as an example. List items, table rows, fences, and fenced content stay whole.
const logicalLines = [];
for (const line of guidance.split('\n')) {
  const continuesPrevious =
    logicalLines.length > 0 &&
    /^\s{2,}\S/.test(line) &&
    !/^\s*(?:[-*+]\s|\d+\.\s|\||```)/.test(line);

  if (continuesPrevious) {
    logicalLines[logicalLines.length - 1] += ` ${line.trim()}`;
  } else {
    logicalLines.push(line);
  }
}

// Command-ish content: `codex …` with or without inline-code or fence markup,
// any line spelling a sandbox flag, and flag-bearing table rows (Quick
// Reference rows carry the initial-run and cross-directory examples but never
// the literal `codex exec`).
const isFlagBearingTableRow = (line) => /^\s*\|.*`-{1,2}[a-z]/.test(line);

const commandLines = logicalLines.filter(
  (line) =>
    /(?:^|[`\s])codex\s/.test(line) ||
    /-s |--sandbox/.test(line) ||
    isFlagBearingTableRow(line),
);

// A line that invokes the binary at all — `codex exec`, `codex resume`, the
// `codex e` alias, or bare `codex` — is an example, whatever else it says.
const invokesCodex = (line) => /(?:^|[`\s])codex(?:\s|`)/.test(line);

// Prose that names the bypass without exemplifying it. A flag-bearing table row
// is exempt only when its *use-case cell* is the documented non-repository
// exception: a phrase sitting in the flag cell of an ordinary default row must
// not buy an exemption, and authorization wording never does.
// The prohibition branch does not fire at HEAD (step 5 is not command-ish); it
// is kept so a rewrap or a stronger prohibition sentence cannot start failing.
const documentsTheException = (line) => {
  if (invokesCodex(line)) return false;
  if (isFlagBearingTableRow(line)) {
    return /not a Git repo/i.test(line.split('|')[1] ?? '');
  }

  return (
    /not a Git repo/i.test(line) ||
    /high-impact flags/i.test(line) ||
    /Do \*\*not\*\* add|Never pass/i.test(line)
  );
};

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
    /`gpt-5\.[0-3][^`\n]*`|`gpt-5\.4`(?!-)|`gpt-5\.5[^`\n]*`/i,
    'the skill must not name a retired model slug as a route',
  );
});

test('codex-skill keeps the below-floor warning non-blocking', () => {
  // The plan forbids re-asking when the user already supplied a model and
  // effort, so the below-floor clause may warn but must not gate on a
  // confirmation. Only the direct-API classification does.
  const prose = guidance.replace(/\s+/g, ' ');
  const clauses = prose.split(/(?<=[.;])\s+/);
  const belowFloor = clauses.filter((clause) =>
    /below the route/i.test(clause),
  );

  assert.ok(
    belowFloor.length >= 1,
    'expected the guidance to describe a below-floor pairing',
  );
  // Semantic, not phrase-co-located: the non-blocking rule may live in a
  // neighbouring sentence, but it must be stated near the below-floor rule.
  assert.match(
    prose,
    /without blocking[\s\S]{0,200}?below the route|below the route[\s\S]{0,200}?without blocking/i,
    'the below-floor pairing must be reported without blocking the run',
  );
  // Property, not phrase: any construction that *requires* a confirmation or
  // authorization is rejected. It applies to every below-floor clause with no
  // negation escape — a merely negated mention ("you do not need to confirm the
  // run") matches none of these alternatives, so nothing legitimate needs one,
  // while a clause-wide skip would let a negation mask a real requirement.
  const requiresConfirmation =
    /\b(?:ask (?:the user )?(?:for|to) (?:a )?confirm|confirm before|must confirm|require[sd]? (?:a )?confirmation|obtain (?:the user'?s )?(?:confirmation|authorization))/i;

  for (const clause of belowFloor) {
    assert.doesNotMatch(
      clause,
      requiresConfirmation,
      'the below-floor pairing must not require a confirmation',
    );
  }
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
  const crossDirectory = logicalLines.filter((line) =>
    /-C[ ,]|--cd/.test(line),
  );

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
