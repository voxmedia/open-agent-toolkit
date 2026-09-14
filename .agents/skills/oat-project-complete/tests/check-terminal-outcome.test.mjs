import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { writeFailure } from '../../explainer-kit/scripts/bundle.mjs';
import { runRecord } from '../../explainer-kit/scripts/record.mjs';
import { checkTerminalOutcome } from '../../oat-explainer-kit/scripts/check-terminal-outcome.mjs';
import {
  hashStateContent,
  persistIntent,
} from '../../oat-explainer-kit/scripts/persist-intent.mjs';

const route = new URL('../SKILL.md', import.meta.url);
const consumerScript = new URL(
  '../scripts/consume-persisted-recap-intent.mjs',
  import.meta.url,
);
const guardScript = new URL(
  '../../oat-explainer-kit/scripts/check-terminal-outcome.mjs',
  import.meta.url,
);
const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const packageFixture = join(
  here,
  '..',
  '..',
  '..',
  '..',
  'packages',
  'cli',
  'src',
  'commands',
  'project',
  'archive',
  'fixtures',
  'v2-package',
);

function recordArgs(root) {
  return [
    '--run-root',
    root,
    '--recipe',
    'project-recap',
    '--slug',
    'failed-recap',
    '--mode',
    'unattended',
    '--theme',
    join(root, 'theme.resolved.json'),
    '--run-id',
    'failed-recap',
    '--created-at',
    '2026-09-11T14:45:00.000Z',
  ];
}

function runGenerateGuard(manifestPath) {
  return execFileAsync(process.execPath, [
    guardScript.pathname,
    '--intent',
    'generate',
    '--manifest',
    manifestPath,
  ]);
}

test('project completion rejects outcome-only generated recap claims', () => {
  for (const outcome of [
    undefined,
    'built',
    'built-needs-review',
    'failed',
    'incomplete',
    'built-durable',
    'built-not-durable',
  ]) {
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
    reason: null,
  });
  assert.deepEqual(
    checkTerminalOutcome({ intent: 'skip', reason: 'capability_probe' }),
    {
      ok: true,
      intent: 'skip',
      outcome: null,
      reason: 'capability_probe',
    },
  );
  for (const invalid of [
    { intent: 'skip', reason: 'seams-unavailable' },
    { intent: 'generate', outcome: 'failed', reason: 'capability_probe' },
  ]) {
    assert.throws(
      () => checkTerminalOutcome(invalid),
      (error) => error?.code === 'E_RECAP_OUTCOME',
    );
  }
});

test('project completion accepts a complete recorded project-recap package', async () => {
  const { stdout } = await runGenerateGuard(
    join(packageFixture, 'manifest.json'),
  );
  assert.deepEqual(JSON.parse(stdout), {
    ok: true,
    intent: 'generate',
    outcome: 'built-needs-review',
  });
});

test('project completion rejects a partial built manifest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recap-partial-built-complete-'));
  try {
    const manifestPath = join(root, 'manifest.json');
    await writeFile(manifestPath, '{"outcome":"built"}\n');
    await assert.rejects(runGenerateGuard(manifestPath));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('project completion rejects corrupted package bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recap-corrupt-complete-'));
  try {
    await cp(packageFixture, root, { recursive: true });
    await writeFile(join(root, 'site/index.html'), 'corrupted');
    await assert.rejects(runGenerateGuard(join(root, 'manifest.json')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('project completion rejects partial failed-attempt objects', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recap-outcome-partial-complete-'));
  try {
    const partialManifest = join(root, 'partial-manifest.json');
    const partialFailure = join(root, 'failure.json');
    await writeFile(partialManifest, '{"outcome":"failed"}\n');
    await writeFile(
      partialFailure,
      '{"stage":"authoring","cause":"interrupted","at":"2026-09-11T14:45:00.000Z"}\n',
    );
    for (const evidenceArgs of [
      ['--manifest', partialManifest],
      ['--failure', partialFailure],
    ]) {
      await assert.rejects(
        execFileAsync(process.execPath, [
          guardScript.pathname,
          '--intent',
          'skip',
          '--skip-reason',
          'failed_attempt',
          ...evidenceArgs,
        ]),
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('project completion requires evidence for skip failed_attempt', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recap-outcome-complete-'));
  try {
    const failedRoot = join(root, 'failed');
    const incompleteRoot = join(root, 'incomplete');
    const failureRoot = join(root, 'flow-failure');
    await cp(packageFixture, failedRoot, { recursive: true });
    await rm(join(failedRoot, 'manifest.json'));
    const qa = JSON.parse(
      await readFile(join(failedRoot, 'qa/result.json'), 'utf8'),
    );
    qa.checks.structure = { status: 'fail', cause: 'interrupted' };
    await writeFile(
      join(failedRoot, 'qa/result.json'),
      `${JSON.stringify(qa)}\n`,
    );
    await runRecord(recordArgs(failedRoot), { log() {} });

    await cp(packageFixture, incompleteRoot, { recursive: true });
    await rm(join(incompleteRoot, 'manifest.json'));
    await rm(join(incompleteRoot, 'qa/result.json'));
    await runRecord(recordArgs(incompleteRoot), { log() {} });

    await writeFailure(failureRoot, 'interrupted', 'operator stopped the flow');
    const failedManifest = join(failedRoot, 'manifest.json');
    const incompleteManifest = join(incompleteRoot, 'manifest.json');
    const builtManifest = join(packageFixture, 'manifest.json');
    const failure = join(failureRoot, 'failure.json');

    for (const evidenceArgs of [
      ['--manifest', failedManifest],
      ['--manifest', incompleteManifest],
      ['--failure', failure],
    ]) {
      const { stdout } = await execFileAsync(process.execPath, [
        guardScript.pathname,
        '--intent',
        'skip',
        '--skip-reason',
        'failed_attempt',
        ...evidenceArgs,
      ]);
      assert.deepEqual(JSON.parse(stdout), {
        ok: true,
        intent: 'skip',
        outcome: null,
        reason: 'failed_attempt',
      });
    }

    const unknownFailure = JSON.parse(await readFile(failure, 'utf8'));
    unknownFailure.stage = 'unknown-stage';
    await writeFile(failure, `${JSON.stringify(unknownFailure)}\n`);
    await assert.rejects(
      execFileAsync(process.execPath, [
        guardScript.pathname,
        '--intent',
        'skip',
        '--skip-reason',
        'failed_attempt',
        '--failure',
        failure,
      ]),
      (error) =>
        error?.code === 1 &&
        /failed_attempt requires a failed or incomplete manifest or failure\.json/.test(
          error.stderr,
        ),
    );
    await assert.rejects(
      writeFailure(join(root, 'unknown-writer'), 'unknown-stage', 'invalid'),
      /Unsupported failure stage/,
    );

    const partialManifest = join(root, 'partial-manifest.json');
    const partialFailure = join(root, 'failure.json');
    await writeFile(partialManifest, '{"outcome":"failed"}\n');
    await writeFile(
      partialFailure,
      '{"stage":"authoring","cause":"interrupted","at":"2026-09-11T14:45:00.000Z"}\n',
    );
    for (const evidenceArgs of [
      [],
      ['--manifest', builtManifest],
      ['--manifest', partialManifest],
      ['--failure', partialFailure],
    ]) {
      await assert.rejects(
        execFileAsync(process.execPath, [
          guardScript.pathname,
          '--intent',
          'skip',
          '--skip-reason',
          'failed_attempt',
          ...evidenceArgs,
        ]),
        (error) =>
          error?.code === 1 &&
          /failed_attempt requires a failed or incomplete manifest or failure\.json/.test(
            error.stderr,
          ),
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('terminal guard grants failed-attempt evidence only to failed-attempt skips', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recap-evidence-privilege-'));
  try {
    await writeFailure(root, 'interrupted', 'operator stopped the flow');
    const failurePath = join(root, 'failure.json');
    for (const args of [
      [
        '--intent',
        'skip',
        '--skip-reason',
        'interactive',
        '--failure',
        failurePath,
      ],
      ['--intent', 'generate', '--failure', failurePath],
    ]) {
      await assert.rejects(
        execFileAsync(process.execPath, [guardScript.pathname, ...args]),
        (error) =>
          error?.code === 1 &&
          /failed-attempt evidence|generated project recaps require/i.test(
            error.stderr,
          ),
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('fresh completion processes carry both persisted failed-attempt proof forms into the real guard', async () => {
  for (const proofKind of ['manifest', 'failure']) {
    const root = await mkdtemp(join(tmpdir(), `recap-resume-${proofKind}-`));
    try {
      const statePath = join(root, 'state.md');
      const runRoot = join(root, 'explainers', `${proofKind}-run`);
      const initial = '---\noat_phase: implement\n---\n\n# State\n';
      await writeFile(statePath, initial);

      let evidencePath;
      if (proofKind === 'manifest') {
        await cp(packageFixture, runRoot, { recursive: true });
        await rm(join(runRoot, 'manifest.json'));
        const qa = JSON.parse(
          await readFile(join(runRoot, 'qa/result.json'), 'utf8'),
        );
        qa.checks.structure = { status: 'fail', cause: 'interrupted' };
        await writeFile(
          join(runRoot, 'qa/result.json'),
          `${JSON.stringify(qa)}\n`,
        );
        await runRecord(recordArgs(runRoot), { log() {} });
        evidencePath = `explainers/${proofKind}-run/manifest.json`;
      } else {
        await writeFailure(runRoot, 'interrupted', 'operator stopped the flow');
        evidencePath = `explainers/${proofKind}-run/failure.json`;
      }

      await persistIntent({
        statePath,
        product: 'projectRecap',
        record: {
          decision: 'skip',
          source: 'failed_attempt',
          decided_at: '2026-09-11T14:45:00.000Z',
          failed_attempt_evidence: evidencePath,
        },
        expectedHash: hashStateContent(initial),
      });

      const { stdout: consumptionOutput } = await execFileAsync(
        process.execPath,
        [consumerScript.pathname, root],
      );
      const consumption = JSON.parse(consumptionOutput);
      assert.equal(consumption.route, 'skip');
      assert.equal(consumption.manifestDiscoveryPerformed, false);
      assert.equal(consumption.authoringPermitted, false);
      assert.deepEqual(consumption.failedAttemptEvidence, {
        kind: proofKind,
        path: await realpath(join(root, evidencePath)),
      });

      const flag = proofKind === 'manifest' ? '--manifest' : '--failure';
      const { stdout: guardOutput } = await execFileAsync(process.execPath, [
        guardScript.pathname,
        '--intent',
        consumption.decision,
        '--skip-reason',
        consumption.source,
        '--project-root',
        root,
        flag,
        consumption.failedAttemptEvidence.path,
      ]);
      assert.deepEqual(JSON.parse(guardOutput), {
        ok: true,
        intent: 'skip',
        outcome: null,
        reason: 'failed_attempt',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test('deployed consumer rejects unsafe or unusable persisted evidence locators', async () => {
  const outside = await mkdtemp(join(tmpdir(), 'recap-evidence-outside-'));
  const outsideRun = join(outside, 'run');
  await writeFailure(outsideRun, 'interrupted', 'outside project');

  const cases = [
    {
      name: 'absolute escape',
      locator: join(outsideRun, 'failure.json'),
    },
    {
      name: 'parent traversal',
      locator: '../outside/failure.json',
    },
    {
      name: 'missing evidence',
      locator: 'explainers/run/failure.json',
    },
    {
      name: 'wrong-kind evidence',
      locator: 'explainers/run/failure.json',
      setup: (root) =>
        mkdir(join(root, 'explainers/run/failure.json'), { recursive: true }),
    },
    {
      name: 'invalid terminal evidence',
      locator: 'explainers/run/failure.json',
      setup: async (root) => {
        await mkdir(join(root, 'explainers/run'), { recursive: true });
        await writeFile(join(root, 'explainers/run/failure.json'), '{}\n');
      },
    },
    {
      name: 'symlink escape',
      locator: 'explainers/run/failure.json',
      setup: async (root) => {
        await mkdir(join(root, 'explainers/run'), { recursive: true });
        await symlink(
          join(outsideRun, 'failure.json'),
          join(root, 'explainers/run/failure.json'),
        );
      },
    },
  ];

  try {
    for (const testCase of cases) {
      const root = await mkdtemp(
        join(tmpdir(), `recap-evidence-${testCase.name.replaceAll(' ', '-')}-`),
      );
      try {
        await testCase.setup?.(root);
        await writeFile(
          join(root, 'state.md'),
          `---\noat_project_recap:\n  decision: skip\n  source: failed_attempt\n  decided_at: '2026-09-11T14:45:00.000Z'\n  failed_attempt_evidence: '${testCase.locator}'\n---\n`,
        );
        await assert.rejects(
          execFileAsync(process.execPath, [consumerScript.pathname, root]),
          (error) =>
            error?.code === 1 &&
            /failed_attempt_evidence|failed-attempt evidence/i.test(
              error.stderr,
            ),
          testCase.name,
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  } finally {
    await rm(outside, { recursive: true, force: true });
  }
});

test('real terminal guard rechecks project containment in the fresh process', async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), 'recap-guard-project-'));
  const outsideRoot = await mkdtemp(join(tmpdir(), 'recap-guard-outside-'));
  try {
    await writeFailure(outsideRoot, 'interrupted', 'outside project');
    await assert.rejects(
      execFileAsync(process.execPath, [
        guardScript.pathname,
        '--intent',
        'skip',
        '--skip-reason',
        'failed_attempt',
        '--project-root',
        projectRoot,
        '--failure',
        join(outsideRoot, 'failure.json'),
      ]),
      (error) =>
        error?.code === 1 &&
        /failed-attempt evidence containment/i.test(error.stderr),
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
});

test('deployed completion boundary suppresses discovery and authoring for interactive skip', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recap-persisted-skip-'));
  try {
    const statePath = join(root, 'state.md');
    await writeFile(join(root, 'explainers'), 'fail if discovery is attempted');
    await writeFile(
      statePath,
      "---\noat_project_recap:\n  decision: skip\n  source: interactive\n  decided_at: '2026-09-11T14:45:00.000Z'\n---\n",
    );
    const { stdout } = await execFileAsync(process.execPath, [
      consumerScript.pathname,
      root,
    ]);
    const result = JSON.parse(stdout);
    assert.equal(result.decision, 'skip');
    assert.equal(result.source, 'interactive');
    assert.equal(result.route, 'skip');
    assert.equal(result.manifestDiscoveryPerformed, false);
    assert.deepEqual(result.manifestCandidates, []);
    assert.equal(result.authoringPermitted, false);
    assert.equal(result.failedAttemptEvidence, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('deployed completion boundary discovers manifests and permits authoring for generate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'recap-persisted-generate-'));
  try {
    const statePath = join(root, 'state.md');
    await writeFile(
      statePath,
      "---\noat_project_recap:\n  decision: generate\n  source: interactive\n  decided_at: '2026-09-11T14:45:00.000Z'\n---\n",
    );
    const runPath = join(root, 'explainers', 'candidate-run');
    await mkdir(runPath, { recursive: true });
    await writeFile(join(runPath, 'manifest.json'), '{"outcome":"built"}\n');
    const { stdout } = await execFileAsync(process.execPath, [
      consumerScript.pathname,
      root,
    ]);
    const result = JSON.parse(stdout);
    assert.equal(result.decision, 'generate');
    assert.equal(result.route, 'generate');
    assert.equal(result.manifestDiscoveryPerformed, true);
    assert.deepEqual(result.manifestCandidates, [
      'explainers/candidate-run/manifest.json',
    ]);
    assert.equal(result.authoringPermitted, true);
    assert.equal(result.failedAttemptEvidence, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('project completion consumes boundary discovery and authoring permission', async () => {
  const guidance = await readFile(route, 'utf8');
  const start = guidance.indexOf('### Step 3.6: Select Final Project Recap');
  const end = guidance.indexOf('### Step 3.65:', start);
  const section = guidance.slice(start, end);

  assert.match(
    section,
    /RECAP_CONSUMPTION=.*RECAP_INTENT_CONSUMER[\s\S]*"\$PROJECT_PATH"/,
  );
  assert.match(section, /RECAP_MANIFEST_CANDIDATES_JSON/);
  assert.match(section, /RECAP_FAILED_ATTEMPT_EVIDENCE_JSON/);
  assert.match(
    section,
    /RECAP_TERMINAL_EVIDENCE_ARGS\+=\("\$RECAP_EVIDENCE_ARG"\)/,
  );
  assert.match(
    section,
    /RECAP_AUTHORING_PERMITTED="true"[\s\S]*`oat-explainer-kit` adapter's § Generate/,
  );
});

test('project completion binds the terminal guard to installed skill roots', async () => {
  const guidance = await readFile(route, 'utf8');
  assert.match(guidance, /RECAP_TERMINAL_GUARD=/);
  assert.match(guidance, /loaded, user, or project skill root/);
  assert.equal(
    guidance.includes('`oat-explainer-kit/scripts/check-terminal-outcome.mjs`'),
    false,
  );
  const guard = guidance.indexOf('"$RECAP_TERMINAL_GUARD"');
  const mutation = guidance.indexOf('### Step 4:', guard);
  assert.notEqual(guard, -1);
  assert.ok(mutation > guard);
  assert.match(
    guidance.slice(guard, mutation),
    /`built`.*`built-needs-review`.*`failed`.*`incomplete`/s,
  );
});

test('interactive skip consumption does not load the sibling explainer-kit core', async () => {
  const isolated = await mkdtemp(join(tmpdir(), 'recap-skip-isolated-'));
  try {
    const completeScripts = join(isolated, 'oat-project-complete', 'scripts');
    const adapterScripts = join(isolated, 'oat-explainer-kit', 'scripts');
    await mkdir(completeScripts, { recursive: true });
    await mkdir(adapterScripts, { recursive: true });
    await cp(
      fileURLToPath(consumerScript),
      join(completeScripts, 'consume-persisted-recap-intent.mjs'),
    );
    await cp(
      join(here, '../../oat-explainer-kit/scripts/persist-intent.mjs'),
      join(adapterScripts, 'persist-intent.mjs'),
    );
    await cp(
      join(here, '../../oat-explainer-kit/scripts/resolve-intent.mjs'),
      join(adapterScripts, 'resolve-intent.mjs'),
    );
    const project = await mkdtemp(join(tmpdir(), 'recap-skip-project-'));
    try {
      await writeFile(
        join(project, 'state.md'),
        "---\noat_project_recap:\n  decision: skip\n  source: interactive\n  decided_at: '2026-09-11T14:45:00.000Z'\n---\n",
      );
      const { consumePersistedRecapIntent } = await import(
        pathToFileURL(
          join(completeScripts, 'consume-persisted-recap-intent.mjs'),
        ).href
      );
      const result = await consumePersistedRecapIntent({
        projectPath: project,
      });
      assert.equal(result.route, 'skip');
    } finally {
      await rm(project, { recursive: true, force: true });
    }
  } finally {
    await rm(isolated, { recursive: true, force: true });
  }
});
