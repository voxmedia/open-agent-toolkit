import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
