import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { checkTerminalOutcome } from '../../oat-explainer-kit/scripts/check-terminal-outcome.mjs';

const route = new URL('../SKILL.md', import.meta.url);

test('project completion accepts only terminal generated recap outcomes', () => {
  for (const outcome of [
    'built-durable',
    'built-not-durable',
    'built-needs-review',
    'failed',
  ]) {
    assert.deepEqual(checkTerminalOutcome({ intent: 'generate', outcome }), {
      ok: true,
      intent: 'generate',
      outcome,
    });
  }

  for (const outcome of [undefined, 'incomplete']) {
    assert.throws(
      () => checkTerminalOutcome({ intent: 'generate', outcome }),
      (error) =>
        error?.code === 'E_RECAP_OUTCOME' &&
        /terminal recap outcome/i.test(error.message),
    );
  }
  assert.deepEqual(checkTerminalOutcome({ intent: 'skip' }), {
    ok: true,
    intent: 'skip',
    outcome: null,
  });
});

test('project completion invokes the shared guard before lifecycle mutation', async () => {
  const guidance = await readFile(route, 'utf8');
  const guard = guidance.indexOf('scripts/check-terminal-outcome.mjs');
  const mutation = guidance.indexOf('### Step 4:', guard);

  assert.notEqual(guard, -1);
  assert.ok(mutation > guard);
  assert.match(
    guidance.slice(guard, mutation),
    /built-durable.*built-not-durable.*built-needs-review.*failed/s,
  );
});
