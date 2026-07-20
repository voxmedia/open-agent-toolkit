import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  hashStateContent,
  persistIntent,
  updateStateFrontmatter,
} from '../scripts/persist-intent.mjs';
import { resolveIntent } from '../scripts/resolve-intent.mjs';

const NOW = '2026-07-18T02:30:00Z';

function resolve(overrides = {}) {
  return resolveIntent({
    product: 'projectExplainer',
    mode: 'interactive',
    state: null,
    preference: 'ask',
    kickoffRequest: false,
    now: NOW,
    ...overrides,
  });
}

test('resolves mode before project state, workflow preference, and default', () => {
  const staleSkip = {
    decision: 'skip',
    source: 'interactive',
    decided_at: '2026-07-17T20:00:00Z',
  };

  assert.deepEqual(
    resolve({
      product: 'projectRecap',
      mode: 'autonomous',
      state: staleSkip,
      preference: 'never',
    }),
    {
      product: 'projectRecap',
      decision: 'generate',
      resolutionSource: 'mode',
      needsPrompt: false,
      record: {
        decision: 'generate',
        source: 'autonomous_policy',
        decided_at: NOW,
      },
      warnings: [
        'Autonomous project recap policy overrode a lower-precedence skip decision.',
        'Autonomous project recap policy overrode workflow preference never.',
      ],
    },
  );

  const recordedGenerate = {
    decision: 'generate',
    source: 'interactive',
    decided_at: '2026-07-17T20:00:00Z',
  };
  assert.equal(
    resolve({ state: recordedGenerate, preference: 'never' }).resolutionSource,
    'project_state',
  );
  assert.equal(
    resolve({ state: null, preference: 'always' }).resolutionSource,
    'workflow_preference',
  );
  assert.deepEqual(resolve({ state: null, preference: undefined }), {
    product: 'projectExplainer',
    decision: 'ask',
    resolutionSource: 'default',
    needsPrompt: true,
    record: null,
    warnings: [],
  });
});

test('records an interactive answer whenever an unresolved ask is answered', () => {
  for (const decision of ['generate', 'skip']) {
    const result = resolve({ answer: decision });
    assert.deepEqual(result, {
      product: 'projectExplainer',
      decision,
      resolutionSource: 'interactive_answer',
      needsPrompt: false,
      record: { decision, source: 'interactive', decided_at: NOW },
      warnings: [],
    });
  }
});

test('ask-once persistence makes later gates use project state without prompting', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-intent-'));
  const statePath = join(root, 'state.md');
  try {
    const initial = `---
oat_phase: plan
oat_project_explainer: null
---

# State
`;
    await writeFile(statePath, initial);
    const first = resolve({ answer: 'generate' });
    const persisted = await persistIntent({
      statePath,
      product: first.product,
      record: first.record,
      expectedHash: hashStateContent(initial),
    });

    const second = resolve({
      state: persisted.record,
      preference: 'ask',
    });
    assert.equal(second.decision, 'generate');
    assert.equal(second.resolutionSource, 'project_state');
    assert.equal(second.needsPrompt, false);
    assert.equal(second.record, persisted.record);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('autonomous mode forces recap and only generates an explainer from kickoff prompt', () => {
  const recap = resolve({
    product: 'projectRecap',
    mode: 'autonomous',
    preference: 'never',
  });
  assert.equal(recap.decision, 'generate');
  assert.equal(recap.record.source, 'autonomous_policy');

  const skippedExplainer = resolve({
    mode: 'autonomous',
    state: {
      decision: 'generate',
      source: 'interactive',
      decided_at: NOW,
    },
    preference: 'always',
  });
  assert.equal(skippedExplainer.decision, 'skip');
  assert.equal(skippedExplainer.record, null);

  const requestedExplainer = resolve({
    mode: 'autonomous',
    kickoffRequest: true,
    preference: 'never',
  });
  assert.equal(requestedExplainer.decision, 'generate');
  assert.deepEqual(requestedExplainer.record, {
    decision: 'generate',
    source: 'kickoff_prompt',
    decided_at: NOW,
  });
});

test('rejects invalid intent combinations including autonomous skip', () => {
  const invalidAutonomousSkip = {
    decision: 'skip',
    source: 'autonomous_policy',
    decided_at: NOW,
  };
  assert.throws(
    () =>
      resolve({
        product: 'projectRecap',
        mode: 'interactive',
        state: invalidAutonomousSkip,
      }),
    /invalid projectRecap decision\/source pair/i,
  );
  const unattended = resolve({
    product: 'projectRecap',
    mode: 'autonomous',
    state: invalidAutonomousSkip,
  });
  assert.equal(unattended.decision, 'generate');
  assert.equal(unattended.record.source, 'autonomous_policy');
  assert.match(unattended.warnings[0], /overrode.*skip decision/i);
  assert.throws(
    () =>
      updateStateFrontmatter('---\noat_phase: plan\n---\n', 'projectRecap', {
        decision: 'skip',
        source: 'autonomous_policy',
        decided_at: NOW,
      }),
    /invalid projectRecap decision\/source pair/i,
  );
});

test('safe frontmatter updates preserve unrelated fields and markdown body', () => {
  const original = `---
oat_status: in_progress
custom:
  nested: value
oat_project_explainer:
  decision: skip
  source: interactive
  decided_at: '2026-07-17T20:00:00Z'
oat_generated: false
---

# State

Keep this body byte-for-byte.
`;
  const updated = updateStateFrontmatter(original, 'projectExplainer', {
    decision: 'generate',
    source: 'interactive',
    decided_at: NOW,
  });

  assert.match(updated, /custom:\n  nested: value/);
  assert.match(updated, /oat_generated: false/);
  assert.match(updated, /# State\n\nKeep this body byte-for-byte\.\n$/);
  assert.match(
    updated,
    /oat_project_explainer:\n  decision: generate\n  source: interactive\n  decided_at: '2026-07-18T02:30:00Z'/,
  );
  assert.equal((updated.match(/oat_project_explainer:/g) ?? []).length, 1);
});

test('persistence rejects stale writes and leaves state unchanged', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-intent-conflict-'));
  const statePath = join(root, 'state.md');
  try {
    const initial = '---\noat_phase: plan\n---\n\n# State\n';
    const concurrent = '---\noat_phase: implement\n---\n\n# State\n';
    await writeFile(statePath, initial);
    const expectedHash = hashStateContent(initial);
    await writeFile(statePath, concurrent);

    await assert.rejects(
      persistIntent({
        statePath,
        product: 'projectExplainer',
        record: {
          decision: 'generate',
          source: 'interactive',
          decided_at: NOW,
        },
        expectedHash,
      }),
      (error) => error?.code === 'E_INTENT_STALE_WRITE',
    );
    assert.equal(await readFile(statePath, 'utf8'), concurrent);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
