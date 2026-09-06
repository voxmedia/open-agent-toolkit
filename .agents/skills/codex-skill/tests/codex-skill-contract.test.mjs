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

// The bypass flag itself is a marker too: a bare `--skip-git-repo-check` option
// bullet carries no `codex` token, no `-s `, and is not a table row, yet it is
// the literal pre-fix construct the plan removed from the option list.
const commandLines = logicalLines.filter(
  (line) =>
    /(?:^|[`\s])codex\s/.test(line) ||
    /-s |--sandbox/.test(line) ||
    /--skip-git-repo-check/.test(line) ||
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

// --- Below-floor confirmation guard --------------------------------------
// A confirmation requirement escapes a clause-local check by sitting in the
// *next* clause: "...sits below the route the matrix gives...  In that case,
// confirm before launching." The anaphor carries the below-floor subject
// forward, so that clause restates the same rule and must obey it.
//
// Attachment is relational, never a proximity window. A guarded span is one
// below-floor clause plus the consecutive run of clauses that *open with* a
// bounded anaphor. The first clause that stands on its own ends the span --
// including the shipped direct-API sentence, which opens with its own
// imperative and its own `when` condition instead of pointing back. Nothing
// here inspects the words "direct API": that exception survives because it is
// structurally independent, not because it is whitelisted.
const BELOW_FLOOR_ANCHOR = /below the route/i;

// Closed set, deliberately. Growing this into general paraphrase or antecedent
// detection is the separate span-based prose-guard work, not this guard. The
// `(?!-)` guards keep a hyphenated compound ("Then-current policy...") from
// reading as an anaphor. A case noun that continues into another noun ("In this
// instance method, ...") does still attach: separating that needs noun-phrase
// parsing, which this plan puts out of scope, and it fails closed -- such prose
// is rejected and rewritten, never silently permitted.
const ANAPHORIC_CONTINUATION =
  /^(?:and\b,?\s*)?(?:(?:in|under)\s+(?:that|this|such|those|these)\s+(?:an?\s+)?(?:cases?|events?|situations?|instances?|circumstances?)(?!-)|in\s+which\s+case|if\s+so|then(?!-))\b/i;

// A continuation is guarded whatever condition it then carries. Exempting an
// anaphoric clause that states its own route classification was tried and
// reverted: every workable form of that test was an ordered-token heuristic
// that admitted real escapes ("Then, if the reference classifies the pairing as
// a below-floor route, confirm before launching") while still rejecting the
// passive voice of the very clause it meant to protect. The direct-API rule is
// preserved instead by how it is written -- as an independent clause, exactly
// as the shipped prose states it -- so prose that hangs a confirmation off "In
// that case" is rejected and must be restated independently.

// Property, not phrase: any construction that *requires* a confirmation or
// authorization is rejected. Deliberately fail-closed on negation: this matches
// the requirement wording wherever it appears, so "do not ask the user for
// confirmation" is rejected too. A clause-wide negation skip is the alternative
// and it is worse, because one "not" anywhere would then mask a real
// requirement. Prose that means to permit a run says so without naming the
// requirement ("you do not need to confirm the run").
const requiresConfirmation =
  /\b(?:ask (?:the user )?(?:for|to) (?:a )?confirm|confirm before|must confirm|require[sd]? (?:a )?confirmation|obtain (?:the user'?s )?(?:confirmation|authorization))/i;

// A bare list marker is markup, not a clause: an ordered marker ends in a
// period, so it otherwise splits off as its own "clause" and breaks the
// adjacency the anaphor depends on.
const LIST_MARKER_ONLY = /^(?:[-*+]|\d+[.)])$/;

const splitClauses = (prose) =>
  prose
    .replace(/\s+/g, ' ')
    .split(/(?<=[.;])\s+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0 && !LIST_MARKER_ONLY.test(clause));

// Markup, not meaning: a clause lifted out of a list item or a bolded lead-in
// still opens with its anaphor. Strip only the marker, and keep the verbatim
// clause for failure labels.
const clauseOpener = (clause) =>
  clause.replace(/^(?:[-*+]|\d+[.)])\s+/, '').replace(/^[*_`]+/, '');

const isAnaphoricContinuation = (clause) =>
  ANAPHORIC_CONTINUATION.test(clauseOpener(clause));

// Every below-floor clause paired with the continuations that inherit it.
const belowFloorSpans = (prose) => {
  const clauses = splitClauses(prose);
  const spans = [];

  for (const [index, clause] of clauses.entries()) {
    if (!BELOW_FLOOR_ANCHOR.test(clause)) continue;

    const attached = [];
    for (let next = index + 1; next < clauses.length; next += 1) {
      const continuation = clauses[next];
      if (!isAnaphoricContinuation(continuation)) break;
      attached.push(continuation);
    }

    spans.push({ anchor: clause, attached });
  }

  return spans;
};

// null when clean, otherwise the anchor and the offending clause so a failure
// names the semantic relation rather than a line number.
const findConfirmationEscape = (prose) => {
  for (const { anchor, attached } of belowFloorSpans(prose)) {
    for (const clause of [anchor, ...attached]) {
      if (requiresConfirmation.test(clause)) {
        return { anchor, clause, attached: clause !== anchor };
      }
    }
  }

  return null;
};

const describeConfirmationEscape = (escape) =>
  escape === null
    ? null
    : `${escape.attached ? 'an anaphoric continuation of the' : 'the'} below-floor clause "${escape.anchor}" requires a confirmation: "${escape.clause}"`;

test('codex-skill keeps the below-floor warning non-blocking', () => {
  // The plan forbids re-asking when the user already supplied a model and
  // effort, so the below-floor rule may warn but must not gate on a
  // confirmation. Only the direct-API classification does.
  const prose = guidance.replace(/\s+/g, ' ');

  assert.ok(
    belowFloorSpans(guidance).length >= 1,
    'expected the guidance to describe a below-floor pairing',
  );
  // Semantic, not phrase-co-located: the non-blocking rule may live in a
  // neighbouring sentence, but it must be stated near the below-floor rule.
  assert.match(
    prose,
    /without blocking[\s\S]{0,200}?below the route|below the route[\s\S]{0,200}?without blocking/i,
    'the below-floor pairing must be reported without blocking the run',
  );
  assert.equal(
    describeConfirmationEscape(findConfirmationEscape(guidance)),
    null,
    'neither a below-floor clause nor an anaphoric clause attached to one may require a confirmation',
  );
});

test('codex-skill below-floor guard follows anaphora, not proximity', () => {
  // Same helper as the live-prose test above, so these cases pin the behaviour
  // that actually guards the shipped skill.
  const belowFloor =
    'Say so once, without blocking, when the pairing sits below the route the matrix gives the classified work.';
  // Mirrors the shipped sentence: an independent clause carrying its own
  // direct-API condition, joined by a semicolon rather than an anaphor.
  const shippedDirectApiRule =
    'Say so once, without blocking, when the pairing sits below the route the matrix gives the classified work; confirm before launching when the reference classifies that model as a direct-API specialist route rather than a CLI route.';

  for (const [label, prose] of [
    [
      'immediate anaphoric confirmation',
      `${belowFloor} In that case, confirm before launching.`,
    ],
    [
      'immediate anaphoric authorization',
      `${belowFloor} Then obtain authorization.`,
    ],
    [
      'chained anaphora',
      `${belowFloor} In that case, pause. Then obtain the user's confirmation.`,
    ],
    [
      'semicolon-joined anaphora',
      `${belowFloor.replace(/\.$/, ';')} in that case you must confirm.`,
    ],
    [
      'anaphor behind list markup',
      `${belowFloor} - **In that case**, confirm before launching.`,
    ],
    [
      'anaphor behind an ordered list marker',
      `${belowFloor}\n1. In that case, confirm before launching.`,
    ],
    [
      'anaphor behind a parenthesized list marker',
      `${belowFloor} 1) In that case, confirm before launching.`,
    ],
    [
      'demonstrative anaphor with a different case noun',
      `${belowFloor} In those circumstances, confirm before launching.`,
    ],
    [
      'conjunctive lead-in before the anaphor',
      `${belowFloor} And, in that case, confirm before launching.`,
    ],
    // A continuation stays guarded whatever condition it carries: exempting
    // self-classifying continuations let "classifies the pairing as a
    // below-floor route" through. The direct-API rule must be an independent
    // clause, which is how the shipped prose already states it.
    [
      'continuation carrying its own route classification',
      `${belowFloor} Then, if the reference classifies that model as a direct-API specialist route rather than a CLI route, confirm before launching.`,
    ],
    [
      'continuation re-classifying the pairing itself',
      `${belowFloor} Then, if the reference classifies the pairing as a below-floor route, confirm before launching.`,
    ],
  ]) {
    const escape = findConfirmationEscape(prose);
    assert.notEqual(
      escape,
      null,
      `${label}: a confirmation requirement inherited by the below-floor clause must be rejected`,
    );
    assert.ok(
      escape.attached,
      `${label}: the failure must name the attached continuation, not the anchor alone`,
    );
  }

  for (const [label, prose] of [
    ['shipped direct-API exception', shippedDirectApiRule],
    [
      'non-blocking anaphoric continuation',
      `${belowFloor} In that case, note the mismatch in your summary and continue.`,
    ],
    // Permitting wording that never names the requirement is accepted; wording
    // that names it ("do not ask the user for confirmation") is deliberately
    // rejected instead of negation-parsed. See the fail-closed note above.
    [
      'permission granted without naming the requirement',
      `${belowFloor} In that case, you do not need to confirm the run.`,
    ],
    [
      'independent later rule',
      `${belowFloor} A destructive sandbox escalation must confirm before launching.`,
    ],
    [
      'hyphenated compound that merely starts with an anaphor',
      `${belowFloor} Then-current policy requires confirmation before a direct API launch.`,
    ],
  ]) {
    assert.equal(
      describeConfirmationEscape(findConfirmationEscape(prose)),
      null,
      `${label}: this construction must stay accepted`,
    );
  }

  // Structural, not phrase-whitelisted: the direct-API clause is excluded
  // because the span stops at an independent clause, while an anaphoric clause
  // is pulled in. Neither outcome consults the words "direct API".
  const [shipped] = belowFloorSpans(shippedDirectApiRule);
  assert.deepEqual(
    shipped.attached,
    [],
    'an independent clause must end the guarded span',
  );

  const [continued] = belowFloorSpans(
    `${belowFloor} In that case, confirm before launching.`,
  );
  assert.deepEqual(
    continued.attached,
    ['In that case, confirm before launching.'],
    'an immediately following anaphoric clause must join the guarded span',
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
