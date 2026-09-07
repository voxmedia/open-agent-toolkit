import assert from 'node:assert/strict';
import test from 'node:test';

import {
  probeRecapSeams,
  RECAP_SEAM_IDS,
} from '../scripts/probe-recap-seams.mjs';

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

test('enumerates exactly the five seams an unattended recap requires', () => {
  assert.deepEqual(RECAP_SEAM_IDS, [
    'author',
    'critic',
    'browserSession',
    'visualCritic',
    'planSet',
  ]);
});

test('reports every unattended seam missing with actionable guidance', () => {
  const result = probeRecapSeams({ mode: 'unattended' });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'seams-unavailable');
  assert.deepEqual(result.missing, [
    'author',
    'critic',
    'browserSession',
    'visualCritic',
    'planSet',
  ]);
  assert.deepEqual(result.invalid, []);
  assert.deepEqual(result.resolved, []);
  assert.match(result.guidance, /skip \/ capability_probe/);
});

test('guidance offers a capability skip only where autonomy can record one', () => {
  // Only autonomous resolution produces `skip / capability_probe`, so the
  // interactive branch must not offer it as a remedy.
  const interactive = probeRecapSeams({ mode: 'interactive' });
  assert.equal(interactive.code, 'seams-unavailable');
  assert.doesNotMatch(interactive.guidance, /capability_probe/);
  assert.match(interactive.guidance, /record an interactive skip decision/);
  assert.match(interactive.message, /an interactive project recap/);

  const unattended = probeRecapSeams({ mode: 'unattended' });
  assert.match(unattended.guidance, /skip \/ capability_probe/);
  assert.match(unattended.message, /an unattended project recap/);
});

test('is ok when all five unattended seams resolve', () => {
  const result = probeRecapSeams(allFiveSeams());

  assert.equal(result.ok, true);
  assert.equal(result.code, 'seams-ok');
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid, []);
  assert.deepEqual(result.resolved, RECAP_SEAM_IDS);
  assert.equal(result.guidance, null);
});

test('accepts module entry points in place of callbacks', () => {
  const result = probeRecapSeams({
    mode: 'unattended',
    authorModulePath: '/seams/author.mjs',
    criticModulePath: '/seams/critic.mjs',
    browserSessionModulePath: '/seams/session.mjs',
    visualCriticModulePath: '/seams/visual.mjs',
    planSetModulePath: '/seams/planner.mjs',
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, 'seams-ok');
});

test('a four-seam host with no planner is unavailable rather than a runtime throw', () => {
  const result = probeRecapSeams(allFiveSeams({ planSet: undefined }));

  assert.equal(result.ok, false);
  assert.equal(result.code, 'seams-unavailable');
  assert.deepEqual(result.missing, ['planSet']);
  assert.deepEqual(result.invalid, []);
  assert.match(result.message, /planSet/);
});

test('interactive mode requires only the author and critic seams', () => {
  const result = probeRecapSeams({
    mode: 'interactive',
    author: noop,
    critic: noop,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);

  const withoutCritic = probeRecapSeams({ mode: 'interactive', author: noop });
  assert.equal(withoutCritic.ok, false);
  assert.deepEqual(withoutCritic.missing, ['critic']);
});

test('a planner supplied as both callback and module path is invalid, never a skip', () => {
  const result = probeRecapSeams(
    allFiveSeams({ planSetModulePath: '/seams/planner.mjs' }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, 'seams-invalid');
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid, [
    {
      seam: 'planSet',
      reason: 'multiple-sources',
      message:
        'Supply only one provider-neutral set planner callback or set planner module entry point.',
    },
  ]);
});

test('a planner callback that is not a function is invalid, never a skip', () => {
  const result = probeRecapSeams(allFiveSeams({ planSet: 'planner' }));

  assert.equal(result.ok, false);
  assert.equal(result.code, 'seams-invalid');
  assert.deepEqual(result.invalid, [
    {
      seam: 'planSet',
      reason: 'callback-not-a-function',
      message: 'planSet must be a function when supplied.',
    },
  ]);
});

test('an empty module path is invalid, never a skip', () => {
  const result = probeRecapSeams(
    allFiveSeams({ planSet: undefined, planSetModulePath: '   ' }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, 'seams-invalid');
  assert.deepEqual(result.invalid, [
    {
      seam: 'planSet',
      reason: 'empty-module-path',
      message: 'planSetModulePath must be a non-empty path.',
    },
  ]);
});

test('invalid seams outrank missing seams so a broken host fails closed', () => {
  const result = probeRecapSeams({
    mode: 'unattended',
    author: noop,
    planSet: 'planner',
  });

  assert.equal(result.code, 'seams-invalid');
  assert.deepEqual(
    result.invalid.map((entry) => entry.seam),
    ['planSet'],
  );
  assert.deepEqual(result.missing, [
    'critic',
    'browserSession',
    'visualCritic',
  ]);
});

test('bare browser probe inputs are invalid rather than a browser session', () => {
  const result = probeRecapSeams(
    allFiveSeams({ browserSession: undefined, browserProbe: noop }),
  );

  assert.equal(result.code, 'seams-invalid');
  assert.deepEqual(result.invalid, [
    {
      seam: 'browserSession',
      reason: 'unsupported-input',
      message:
        'Bare browserProbe callbacks are not supported at the OAT adapter boundary; supply a branded browserSession created by createBrowserProbeSession().',
    },
  ]);
});

test('unsupported coreOptions seam routes are invalid rather than resolved', () => {
  for (const [key, seam] of [
    ['author', 'author'],
    ['planSet', 'planSet'],
    ['browserSession', 'browserSession'],
    ['browserProbe', 'browserSession'],
    ['visualCritic', 'visualCritic'],
  ]) {
    const result = probeRecapSeams(
      allFiveSeams({ coreOptions: { [key]: noop } }),
    );
    assert.equal(result.code, 'seams-invalid', key);
    assert.deepEqual(
      result.invalid.map((entry) => entry.seam),
      [seam],
      key,
    );
  }
});

test('the compatibility coreOptions.critic route satisfies the critic seam', () => {
  const result = probeRecapSeams(
    allFiveSeams({ critic: undefined, coreOptions: { critic: noop } }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.resolved, RECAP_SEAM_IDS);

  const conflicting = probeRecapSeams(
    allFiveSeams({ coreOptions: { critic: noop } }),
  );
  assert.equal(conflicting.code, 'seams-invalid');
  assert.deepEqual(conflicting.invalid, [
    {
      seam: 'critic',
      reason: 'multiple-sources',
      message:
        'Supply only one provider-neutral critic callback or critic module entry point.',
    },
  ]);
});

test('the probe never loads a module, so an unloadable path still resolves', () => {
  const result = probeRecapSeams(
    allFiveSeams({
      planSet: undefined,
      planSetModulePath: '/nonexistent/planner.mjs',
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.code, 'seams-ok');
});

test('a falsy browser session descriptor is unavailable, matching the runtime', () => {
  // `run.mjs` resolves the session by truthiness (`if (!resolvedSession)`), so
  // `browserSession: null` raises E_BROWSER_PROBE_REQUIRED there. Classifying it
  // invalid here would fail an unattended completion the plan exists to unblock.
  for (const value of [null, false, '']) {
    const result = probeRecapSeams(allFiveSeams({ browserSession: value }));
    assert.equal(result.code, 'seams-unavailable', String(value));
    assert.deepEqual(result.missing, ['browserSession'], String(value));
    assert.deepEqual(result.invalid, [], String(value));
  }

  // A falsy descriptor plus a module path is still the runtime's conflict.
  const conflicting = probeRecapSeams(
    allFiveSeams({
      browserSession: null,
      browserSessionModulePath: '/seams/session.mjs',
    }),
  );
  assert.equal(conflicting.code, 'seams-invalid');
  assert.deepEqual(conflicting.invalid, [
    {
      seam: 'browserSession',
      reason: 'multiple-sources',
      message:
        'Supply only one browser session descriptor or browser session module entry point.',
    },
  ]);
});

test('a doubly invalid seam reports the message its runtime resolver raises first', () => {
  // The author, visual critic, and set planner validate the callback's type
  // before the direct-plus-module conflict; the critic and browser session
  // check for multiple sources first.
  const cases = [
    ['author', 'authorModulePath', 'author must be a function when supplied.'],
    [
      'visualCritic',
      'visualCriticModulePath',
      'visualCritic must be a function when supplied.',
    ],
    [
      'planSet',
      'planSetModulePath',
      'planSet must be a function when supplied.',
    ],
    // `resolveLifecycleCritic` counts only function/truthy candidates, so a
    // non-function critic beside a module path is one candidate and falls
    // through to the type error rather than the conflict error.
    ['critic', 'criticModulePath', 'critic must be a function when supplied.'],
  ];

  for (const [seam, modulePathKey, expected] of cases) {
    const result = probeRecapSeams(
      allFiveSeams({
        [seam]: 'not-a-function',
        [modulePathKey]: '/seams/x.mjs',
      }),
    );
    assert.equal(result.code, 'seams-invalid', seam);
    assert.equal(result.invalid.length, 1, seam);
    assert.equal(result.invalid[0].seam, seam);
    assert.equal(result.invalid[0].message, expected, seam);
  }
});

test('rejects unsupported modes and malformed inputs', () => {
  assert.throws(
    () => probeRecapSeams({ mode: 'autonomous' }),
    /Unsupported lifecycle mode: autonomous/,
  );
  assert.throws(() => probeRecapSeams(null), /must be an object/);
  assert.throws(
    () => probeRecapSeams({ mode: 'unattended', coreOptions: 'nope' }),
    /coreOptions must be an object when supplied/,
  );
});
