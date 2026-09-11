import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);
const selfPath = 'tools/smoke/explainer-kit/no-retired-references.test.mjs';

const RETIRED_PATTERNS = [
  ...[
    'explainer-kit/scripts/run.mjs',
    'explainer-kit/scripts/render-qa.mjs',
    'explainer-kit/scripts/record-durability.mjs',
    'explainer-kit/scripts/publish.mjs',
    'explainer-kit/scripts/validate.mjs',
    'oat-explainer-kit/scripts/run.mjs',
    'oat-explainer-kit/scripts/derive-destination.mjs',
    'oat-explainer-kit/scripts/probe-recap-seams.mjs',
    'oat-explainer-kit/scripts/finalize-tracked-run.mjs',
    'tools/release/build-explainer-rc.mjs',
    'tools/release/run-explainer-rc.mjs',
    'tools/release/validate-explainer-acceptance.mjs',
    'tools/release/validate-explainer-visuals.mjs',
  ].map((value) => ({ id: value, value })),
  ...[
    'runExplainer',
    'runOatExplainer',
    'probeRecapSeams',
    'planSet',
    'visualCritic',
    'browserSession',
    'authorModulePath',
    'criticModulePath',
    'E_AUTHOR_REQUIRED',
    'recordDurability',
    'OatExplainerPublishConfig',
  ].map((value) => ({ id: value, value })),
  ...[
    'explainer-kit.author-request/v2',
    'explainer-kit.author-request/v3',
    'explainer-kit.author-result/v2',
    'explainer-kit.set-plan/v1',
    'explainer-kit.visual-review-request/v1',
    'explainer-kit.visual-review-result/v1',
    'explainer-kit.visual-review-evidence/v1',
    'explainer-kit.terminal-evidence/v1',
    'explainer-kit.durability-evidence/v1',
    'explainer-kit.publish-request/v1',
    'explainer-kit.publish-request/v2',
    'explainer-kit.publish-receipt/v1',
    'explainer-kit.publish-receipt/v2',
  ].map((value) => ({ id: value, value })),
  { id: 'built-durable', value: 'built-durable' },
  { id: 'built-not-durable', value: 'built-not-durable' },
  { id: 'explainers.publish.', value: 'explainers.publish.' },
  { id: 'explainer-kit-providers', value: 'explainer-kit-providers' },
  { id: 'explainer-kit-verification', value: 'explainer-kit-verification' },
];

const NEGATIVE_CONTROL_ALLOWLIST = new Map([
  [
    '.agents/skills/oat-project-complete/tests/check-terminal-outcome.test.mjs',
    new Set(['built-durable', 'built-not-durable']),
  ],
  [
    '.agents/skills/oat-project-implement/tests/check-terminal-outcome.test.mjs',
    new Set(['built-durable', 'built-not-durable']),
  ],
]);

export async function scanRetiredReferences({ root = repoRoot, files } = {}) {
  const candidates = files ?? (await trackedFiles(root));
  const findings = [];

  for (const candidate of candidates) {
    const path = candidate.split(sep).join('/');
    if (
      path === selfPath ||
      path.startsWith('.oat/projects/') ||
      path.startsWith('.oat/repo/reference/') ||
      path.startsWith('.oat/repo/pjm/')
    ) {
      continue;
    }
    const absolutePath = join(root, path);
    if ((await stat(absolutePath)).isDirectory()) continue;
    const content = await readFile(absolutePath, 'utf8');
    const allowed = NEGATIVE_CONTROL_ALLOWLIST.get(path) ?? new Set();
    for (const pattern of RETIRED_PATTERNS) {
      if (!allowed.has(pattern.id) && content.includes(pattern.value)) {
        findings.push({ path, pattern: pattern.id });
      }
    }
  }

  return findings.sort((left, right) =>
    `${left.path}\0${left.pattern}`.localeCompare(
      `${right.path}\0${right.pattern}`,
    ),
  );
}

async function trackedFiles(root) {
  const { stdout } = await execFile('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'buffer',
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.toString('utf8').split('\0').filter(Boolean);
}

test('rejects a retired outcome outside the permanent allowlist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'retired-reference-red-'));
  try {
    const path = 'packages/kept-module.mjs';
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(
      join(root, path),
      "export const outcome = 'built-durable';\n",
    );
    assert.deepEqual(await scanRetiredReferences({ root, files: [path] }), [
      { path, pattern: 'built-durable' },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('honors only the named terminal-outcome negative-control allowlist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'retired-reference-allow-'));
  try {
    const path =
      '.agents/skills/oat-project-complete/tests/check-terminal-outcome.test.mjs';
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(
      join(root, path),
      "const rejected = ['built-durable', 'built-not-durable'];\n",
    );
    assert.deepEqual(await scanRetiredReferences({ root, files: [path] }), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('keeps the tracked repository free of retired references', async () => {
  const findings = await scanRetiredReferences();
  assert.deepEqual(
    findings,
    [],
    findings.map(({ path, pattern }) => `${path}: ${pattern}`).join('\n'),
  );
});
