import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(fixtureRoot, 'project');
const requiredProjectArtifacts = [
  'state.md',
  'discovery.md',
  'design.md',
  'plan.md',
  'implementation.md',
];

test('fixture project has the required artifact surface', () => {
  for (const artifact of requiredProjectArtifacts) {
    assert.ok(
      existsSync(path.join(projectRoot, artifact)),
      `missing fixture project artifact: ${artifact}`,
    );
  }

  for (const phaseId of ['p01', 'p02', 'p03']) {
    assert.ok(
      existsSync(path.join(fixtureRoot, 'workspace', 'logs', `${phaseId}.log`)),
      `missing fixture phase log: ${phaseId}.log`,
    );
  }
});

test('fixture plan has stable task IDs and an isolated parallel shape', () => {
  const plan = readFileSync(path.join(projectRoot, 'plan.md'), 'utf8');

  assert.match(
    plan,
    /oat_plan_parallel_groups:\s*\[\s*\[\s*['"]?p01['"]?\s*,\s*['"]?p02['"]?\s*\]\s*\]/,
  );
  for (const section of [
    '## Reviews',
    '## Implementation Complete',
    '## References',
  ]) {
    assert.ok(plan.includes(section), `missing plan section: ${section}`);
  }

  const tasks = [
    ...plan.matchAll(
      /^### Task (p(?<phase>\d{2})-t(?<task>\d{2})): .+?\n(?<body>[\s\S]*?)(?=^### Task |(?![\s\S]))/gm,
    ),
  ];
  assert.equal(tasks.length, 9, 'fixture must contain exactly nine tasks');

  const taskIds = tasks.map((match) => match[1]);
  assert.deepEqual(taskIds, [
    'p01-t01',
    'p01-t02',
    'p01-t03',
    'p02-t01',
    'p02-t02',
    'p02-t03',
    'p03-t01',
    'p03-t02',
    'p03-t03',
  ]);

  for (const match of tasks) {
    const phaseId = `p${match.groups.phase}`;
    const taskId = match[1];
    assert.match(
      match.groups.body,
      new RegExp(
        `^\\*\\*Write target:\\*\\* \`workspace/logs/${phaseId}\\.log\`$`,
        'm',
      ),
      `${taskId} must write only to ${phaseId}.log`,
    );
    assert.match(
      match.groups.body,
      new RegExp(
        `^\\*\\*Verification:\\*\\* \`node --input-type=module -e ".*${taskId} completed.*workspace/logs/${phaseId}\\.log.*"\`$`,
        'm',
      ),
      `${taskId} must declare an exact runnable verification command`,
    );
    assert.match(
      match.groups.body,
      new RegExp(
        `^\\*\\*Expected commit:\\*\\* \`feat\\(${taskId}\\): append fixture marker\`$`,
        'm',
      ),
      `${taskId} must declare its expected task commit`,
    );
  }

  assert.match(plan, /^## Phase 3: Fan-in Log\n\nDepends on: `p01`, `p02`\.$/m);
});
