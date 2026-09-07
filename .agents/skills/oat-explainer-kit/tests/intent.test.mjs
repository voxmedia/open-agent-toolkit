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
import { probeRecapSeams } from '../scripts/probe-recap-seams.mjs';
import { resolveIntent } from '../scripts/resolve-intent.mjs';

const NOW = '2026-07-18T02:30:00Z';

const noop = () => {};

function allFiveSeams(overrides = {}) {
  return {
    mode: 'unattended',
    author: noop,
    critic: noop,
    browserSession: { brand: 'launched-chromium' },
    visualCritic: noop,
    planSet: noop,
    ...overrides,
  };
}

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

  const probedRecap = resolve({
    product: 'projectRecap',
    mode: 'autonomous',
    preference: 'never',
    seamProbe: probeRecapSeams(allFiveSeams()),
  });
  assert.equal(probedRecap.decision, 'generate');
  assert.equal(probedRecap.record.source, 'autonomous_policy');
  assert.deepEqual(probedRecap.warnings, [
    'Autonomous project recap policy overrode workflow preference never.',
  ]);

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

test('an unavailable seam resolves a recordable autonomous capability skip', () => {
  const unavailable = resolve({
    product: 'projectRecap',
    mode: 'autonomous',
    seamProbe: probeRecapSeams({ mode: 'unattended', author: noop }),
  });

  assert.deepEqual(unavailable, {
    product: 'projectRecap',
    decision: 'skip',
    resolutionSource: 'capability_probe',
    needsPrompt: false,
    record: {
      decision: 'skip',
      source: 'capability_probe',
      decided_at: NOW,
    },
    warnings: [
      'Autonomous project recap skipped: no provider is configured for critic, browserSession, visualCritic and planSet.',
    ],
  });

  // A host with four seams and no set planner is the case the runtime would
  // have thrown E_SET_PLANNER_REQUIRED on.
  const noPlanner = resolve({
    product: 'projectRecap',
    mode: 'autonomous',
    seamProbe: probeRecapSeams(allFiveSeams({ planSet: undefined })),
  });
  assert.equal(noPlanner.decision, 'skip');
  assert.match(noPlanner.warnings[0], /planSet/);

  // The persisted record round-trips through interactive validation.
  assert.equal(
    resolve({
      product: 'projectRecap',
      mode: 'interactive',
      state: noPlanner.record,
    }).resolutionSource,
    'project_state',
  );
});

test('a configured-but-invalid seam is an error rather than a capability skip', () => {
  assert.throws(
    () =>
      resolve({
        product: 'projectRecap',
        mode: 'autonomous',
        seamProbe: probeRecapSeams(allFiveSeams({ planSet: 'planner' })),
      }),
    (error) =>
      error?.code === 'E_RECAP_SEAMS_INVALID' &&
      /planSet must be a function when supplied/.test(error.message),
  );
});

test('capability_probe is scoped to autonomous projectRecap skips', () => {
  const probe = probeRecapSeams({ mode: 'unattended' });

  assert.throws(
    () =>
      resolve({
        product: 'projectExplainer',
        mode: 'autonomous',
        seamProbe: probe,
      }),
    /apply only to projectRecap resolution/,
  );
  assert.throws(
    () =>
      resolve({
        product: 'projectRecap',
        mode: 'interactive',
        seamProbe: probe,
      }),
    /apply only to autonomous projectRecap resolution/,
  );
  assert.throws(
    () =>
      updateStateFrontmatter(
        '---\noat_phase: plan\n---\n',
        'projectExplainer',
        { decision: 'skip', source: 'capability_probe', decided_at: NOW },
      ),
    /invalid projectExplainer decision\/source pair/i,
  );
  assert.throws(
    () =>
      updateStateFrontmatter('---\noat_phase: plan\n---\n', 'projectRecap', {
        decision: 'generate',
        source: 'capability_probe',
        decided_at: NOW,
      }),
    /invalid projectRecap decision\/source pair/i,
  );

  // A half-populated probe object must never forge a capability skip out of an
  // invalid seam, and an `ok` claim must carry the matching code.
  for (const forged of [
    { ok: false, mode: 'unattended', code: 'seams-unavailable' },
    {
      ok: false,
      mode: 'unattended',
      code: 'seams-unavailable',
      missing: [],
      invalid: [{ seam: 'planSet', reason: 'multiple-sources', message: 'x' }],
      resolved: [],
    },
    {
      ok: true,
      mode: 'unattended',
      code: 'seams-unavailable',
      missing: ['planSet'],
      invalid: [],
      resolved: [],
    },
    {
      ok: false,
      mode: 'unattended',
      code: 'seams-invalid',
      missing: [],
      invalid: [],
      resolved: [],
    },
  ]) {
    assert.throws(
      () =>
        resolve({
          product: 'projectRecap',
          mode: 'autonomous',
          seamProbe: forged,
        }),
      (error) =>
        error instanceof TypeError &&
        /must partition the canonical recap seams|must list the seams its code claims/.test(
          error.message,
        ),
      JSON.stringify(forged),
    );
  }
  assert.throws(
    () =>
      resolve({
        product: 'projectRecap',
        mode: 'autonomous',
        seamProbe: {
          ok: true,
          mode: 'unattended',
          code: 'seams-ok',
          missing: [],
          invalid: [],
          resolved: ['author'],
        },
      }),
    // A short `resolved` list fails the partition's coverage requirement first;
    // either rejection keeps the forged success out of the generate path.
    (error) =>
      error instanceof TypeError &&
      /must partition the canonical recap seams|must list the seams its code claims/.test(
        error.message,
      ),
  );

  // An interactive probe checks only the author and critic, so it would report
  // a host with no set planner as fully available. It is the wrong evidence for
  // a decision whose recap runs unattended.
  assert.throws(
    () =>
      resolve({
        product: 'projectRecap',
        mode: 'autonomous',
        seamProbe: probeRecapSeams({
          mode: 'interactive',
          author: noop,
          critic: noop,
        }),
      }),
    /must come from an unattended probe/,
  );
  assert.throws(
    () =>
      resolve({
        product: 'projectRecap',
        mode: 'autonomous',
        seamProbe: {
          ok: false,
          mode: 'unattended',
          code: 'seams-unavailable',
          missing: ['notASeam'],
          invalid: [],
          resolved: [],
        },
      }),
    /must partition the canonical recap seams/,
  );

  // The partition must be disjoint and cover the canonical set, because the
  // error message promises exactly that. Both shapes below were accepted before
  // the coverage/disjointness checks existed: the first claims `planSet` is
  // both missing and resolved and yielded a capability skip, the second pads
  // `resolved` with one seam repeated five times and forced a generate.
  // `probeRecapSeams` can emit neither: every seam lands in exactly one bucket.
  assert.throws(
    () =>
      resolve({
        product: 'projectRecap',
        mode: 'autonomous',
        seamProbe: {
          ok: false,
          mode: 'unattended',
          code: 'seams-unavailable',
          missing: ['planSet'],
          invalid: [],
          resolved: [
            'planSet',
            'author',
            'critic',
            'browserSession',
            'visualCritic',
          ],
        },
      }),
    /must partition the canonical recap seams/,
    'a seam claimed both missing and resolved must not yield a capability skip',
  );
  assert.throws(
    () =>
      resolve({
        product: 'projectRecap',
        mode: 'autonomous',
        seamProbe: {
          ok: true,
          mode: 'unattended',
          code: 'seams-ok',
          missing: [],
          invalid: [],
          resolved: ['author', 'author', 'author', 'author', 'author'],
        },
      }),
    /must partition the canonical recap seams/,
    'duplicate resolved entries must not fake full seam availability',
  );
  // An invalid seam counts toward the partition, so a well-formed
  // `seams-invalid` result still validates and fails closed on its own path.
  assert.throws(
    () =>
      resolve({
        product: 'projectRecap',
        mode: 'autonomous',
        seamProbe: probeRecapSeams(allFiveSeams({ planSet: 'not-a-function' })),
      }),
    (error) => error?.code === 'E_RECAP_SEAMS_INVALID',
  );
  assert.throws(
    () =>
      resolve({
        product: 'projectRecap',
        mode: 'autonomous',
        seamProbe: {
          ok: false,
          mode: 'unattended',
          code: 'not-a-code',
          missing: ['planSet'],
          invalid: [],
          resolved: [],
        },
      }),
    /ok and a known code/,
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
