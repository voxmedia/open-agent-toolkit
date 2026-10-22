import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// These are shipped agent instructions, not an automated apply engine. Literal
// guards protect approval clauses disappearing during prose edits; behavior is
// also exercised by honestly labeled manual skill walkthroughs.
const skill = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
const plan = readFileSync(
  new URL('../references/apply-plan-template.md', import.meta.url),
  'utf8',
);
const compact = (text) => text.replace(/\s+/g, ' ');

test('blanket approval excludes explicit recommendations', () => {
  assert.ok(
    compact(skill).includes(
      'Blanket approval never approves an `approval: explicit` recommendation.',
    ),
  );
  assert.ok(
    compact(plan).includes('explicit items require individual approval by ID'),
  );
});
test('unattended skips explicit even when supplied IDs name them', () => {
  assert.ok(
    compact(skill).includes(
      'In unattended mode, skip every explicit recommendation even when an input list names its ID;',
    ),
  );
  assert.ok(skill.includes('explicit_requires_interactive_approval'));
});
test('individual approval binds the ID and each restructure block', () => {
  assert.ok(
    compact(skill).includes(
      'Ask for individual approval by recommendation ID for each explicit item.',
    ),
  );
  assert.ok(
    compact(skill).includes(
      'restructure block always needs its own approval, including its full map and old-URL plan;',
    ),
  );
});
test('tooling approval stays within three operations and manual scaffold boundary', () => {
  assert.ok(
    compact(skill).includes(
      'its out-of-Markdown allowance is only these three operations:',
    ),
  );
  assert.match(
    skill,
    /1\. Bump the docs app's existing `@open-agent-toolkit\/docs-\*`/,
  );
  assert.match(skill, /2\. Run `oat docs migrate/);
  assert.match(skill, /3\. Run the docs build verifier/);
  assert.ok(
    compact(skill).includes(
      'Scaffold changes the CLI cannot make (app config, routes, package scripts) are `manual`:',
    ),
  );
});
test('result reports every input ID once including skipped reasons and failures', () => {
  assert.ok(
    compact(skill).includes(
      'Each input recommendation ID appears in exactly one outcome;',
    ),
  );
  for (const field of [
    '"analysisArtifact"',
    '"approvedRecommendationIds"',
    '"applied"',
    '"skipped"',
    '"failed"',
  ]) {
    assert.ok(skill.includes(field));
    assert.ok(plan.includes(field));
  }
});
