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

test('copyable page assets retain their required field and evidence contracts', () => {
  const headings = {
    'product-feature': [
      'Availability and entry points',
      'Expected journey',
      'Behavior rules',
      'States and edge cases',
      'External boundary',
      'Paired documentation',
      'Evidence and owner-review gaps',
    ],
    'engineering-feature': [
      'Routes and params',
      'Primary files',
      'Data and state',
      'Flags',
      'Failure modes and constraints',
      'Testing seams',
      'Paired documentation',
      'Source references',
    ],
    'qa-validation': [
      'Scope',
      'Named seeds',
      'Configuration matrix',
      'Scenarios',
      'Ready signal',
      'Cleanup',
      'Platform deltas',
      'External boundary',
      'Out of scope',
    ],
    'screen-spec': [
      'When to use',
      'Route and params',
      'Entry points',
      'Visible states',
      'Locators',
      'Transitions',
      'Back behavior',
    ],
    'alert-runbook': [
      'When to use and entry criteria',
      'Production context',
      'Ownership',
      'First-five-minutes triage',
      'Procedure',
      'Why this approach',
      'Rollback',
      'Verification checklist',
    ],
    'solution-record': ['Problem', 'Root cause', 'Fix', 'Prevention'],
    'command-reference': [
      'Production impact',
      'Command group index',
      'Shared flags',
      'Per-command arguments',
      'Outputs and JSON',
      'Exit codes',
      'Side effects',
    ],
    'skill-command-guide': [
      'Invocation',
      'Prerequisites',
      'Example scenario',
      'What it does without asking',
      'Expected output',
      'Next step',
    ],
    'decisions-pointer': [
      'Where records live',
      'How records are created',
      'Selected decisions',
      'Staleness and review',
    ],
    'per-area-agents': [
      'Audience',
      'Voice',
      'Belongs here versus elsewhere',
      'Cross-area triggers',
      'Verification',
    ],
  };
  for (const [name, required] of Object.entries(headings)) {
    const body = read(`references/page-templates/${name}.md`);
    for (const heading of required)
      assert.ok(body.includes(`## ${heading}`), `${name}: ${heading}`);
    for (const rule of [
      'Use backticks only for literals verified verbatim in source',
      'Write concepts in ordinary prose',
      'Planned automation:',
      'Implemented assertions:',
      'Dated execution evidence:',
    ])
      assert.ok(body.includes(rule), `${name}: ${rule}`);
  }
  const qa = read('references/page-templates/qa-validation.md');
  assert.match(
    qa,
    /ID\s*\|\s*Priority\s*\|\s*Given\s*\|\s*When\s*\|\s*Then \(exact copy\)\s*\|\s*Evidence\s*\|\s*Automation/,
  );
  const screen = read('references/page-templates/screen-spec.md');
  assert.match(
    screen,
    /Test ID\s*\|\s*A11y label\s*\|\s*Literal text\s*\|\s*Source path/,
  );
  const solution = read('references/page-templates/solution-record.md');
  for (const field of [
    'symptoms',
    'root_cause',
    'component',
    'severity',
    'date',
  ])
    assert.match(solution, new RegExp(`^${field}:`, 'm'));
});
