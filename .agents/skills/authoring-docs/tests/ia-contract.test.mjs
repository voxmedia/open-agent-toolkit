import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (name) =>
  readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('portable IA contract keeps the six approved presets, reader-first decisions and companion coverage', () => {
  const ia = read('references/information-architecture.md');
  for (const label of [
    'Product/Engineering/QA',
    'Consumer and Maintainer',
    'Domain Engineering',
    'Task Type',
    'Toolkit and CLI',
    'Flat Small',
  ]) {
    assert.ok(
      ia.split('\n').some((line) => line.split('|')[1]?.trim() === label),
      label,
    );
  }
  for (const heading of [
    'Five axes',
    'Standard section set per track',
    'Placement and section entries',
    'Landing page contract',
    'Specialized tracks',
  ]) {
    assert.ok(ia.includes(`## ${heading}`), heading);
  }
  assert.ok(!ia.includes('## Standard Top-Level Model'));
  assert.match(ia, /Page count chooses how much structure to materialize/);
  assert.match(ia, /UI alone\s+does not justify three tracks/);
  const types = read('references/page-types.md');
  for (const type of [
    'Feature Guide',
    'Validation Matrix',
    'Solution',
    'Decision Record',
  ])
    assert.ok(types.includes(`## ${type}`));
  assert.match(read('references/templates.md'), /## IA Proposal/);
  assert.match(
    read('references/templates.md'),
    /Feature and QA\s+validation page templates are deferred/,
  );
  assert.match(
    read('references/workflow.md'),
    /Map personas to tracks by work context/,
  );
  assert.match(
    read('references/review-rubric.md'),
    /information-architecture\.md/,
  );
  assert.match(
    read('references/writing-style.md'),
    /Use `bash` for shell commands/,
  );
  assert.match(read('SKILL.md'), /references\/guidance-sources\.md/);
});
