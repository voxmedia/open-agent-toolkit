import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { EXPECTED_PHASE_IDS, EXPECTED_TASK_IDS } from './assertions.mjs';

const smokeRoot = resolve(import.meta.dirname, '..');

test('normative smoke contract matches executable fixture cardinality', async () => {
  const [contract, fixturePlan] = await Promise.all([
    readFile(resolve(smokeRoot, 'CONTRACT.md'), 'utf8'),
    readFile(resolve(smokeRoot, 'fixture/project/plan.md'), 'utf8'),
  ]);
  const fixtureTaskIds = [
    ...fixturePlan.matchAll(/^### Task (p\d{2}-t\d{2}):/gmu),
  ].map((match) => match[1]);

  assert.deepEqual(fixtureTaskIds, EXPECTED_TASK_IDS);
  assert.match(
    contract,
    new RegExp(
      `EXPECTED_TASK_IDS[^\\n]*currently ${EXPECTED_TASK_IDS.length} tasks`,
    ),
  );
  assert.match(
    contract,
    new RegExp(
      `EXPECTED_PHASE_IDS[^\\n]*currently ${EXPECTED_PHASE_IDS.length} phases`,
    ),
  );
  assert.match(
    contract,
    /one accepted\s+completed phase implementer and one direct-root reviewer/u,
  );
  assert.match(
    contract,
    /Optional nested launches are validated when present but are\s+not required/u,
  );
  assert.doesNotMatch(contract, /canonical nine task|nine marker/iu);
  assert.doesNotMatch(contract, /accepted completed launch per\s+task/iu);
});

test('shipped runbook and provider references cannot drift to coordinator-era topology', async () => {
  const repositoryRoot = resolve(smokeRoot, '../..');
  const [runbook, references] = await Promise.all([
    readFile(
      resolve(
        repositoryRoot,
        'apps/oat-docs/docs/contributing/smoke-testing.md',
      ),
      'utf8',
    ),
    readdir(
      resolve(
        repositoryRoot,
        '.agents/skills/oat-dispatch-subagents/references',
      ),
    ),
  ]);

  assert.match(
    runbook,
    /one accepted, completed phase implementer[\s\S]{0,160}one direct-root phase reviewer[\s\S]{0,160}p01[\s\S]{0,80}p02[\s\S]{0,80}p03/iu,
  );
  assert.match(
    runbook,
    /\*\*`implement`\*\*[\s\S]{0,700}exactly one final code gate[\s\S]{0,40}after `p03`/iu,
  );
  assert.match(
    runbook,
    /full[\s\S]{0,220}exactly\s+two external gates[\s\S]{0,180}plan-review gate[\s\S]{0,180}final\s+code gate/iu,
  );
  assert.doesNotMatch(runbook, /launch per\s+fixture task/iu);
  assert.deepEqual(
    references
      .filter((name) => /^(?:claude|codex|cursor)\.md$/u.test(name))
      .sort(),
    [],
  );
});
