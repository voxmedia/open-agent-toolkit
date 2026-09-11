import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import {
  CORE_INSTALL_COMMAND,
  MINIMUM_CORE_VERSION,
  checkCoreCompatibility,
} from '../../oat-explainer-kit/scripts/check-core.mjs';
import {
  hashStateContent,
  persistIntent,
  readPersistedIntent,
} from '../../oat-explainer-kit/scripts/persist-intent.mjs';
import { resolveIntent } from '../../oat-explainer-kit/scripts/resolve-intent.mjs';
import { writeFailure } from '../scripts/bundle.mjs';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const coreSource = join(repoRoot, '.agents/skills/explainer-kit');
const adapterSource = join(repoRoot, '.agents/skills/oat-explainer-kit');
const projectFixture = join(here, 'fixtures/bundle/project');
const themeFixture = join(
  repoRoot,
  'packages/cli/src/commands/project/archive/fixtures/v2-package/theme.resolved.json',
);
const { verifySelectedProjectRecapForArchive } = await import(
  pathToFileURL(
    join(
      repoRoot,
      'packages/cli/dist/commands/project/archive/archive-utils.js',
    ),
  ).href
);
async function freshHost(t) {
  const root = await mkdtemp(join(tmpdir(), 'explainer-fresh-host-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const checkout = join(root, 'checkout');
  const projectPath = join(checkout, '.oat/projects/shared/fresh-host-project');
  const home = join(root, 'home');
  const userSkillsRoot = join(home, '.agents/skills');
  const coreRoot = join(userSkillsRoot, 'explainer-kit');
  const adapterRoot = join(userSkillsRoot, 'oat-explainer-kit');
  const themePath = join(root, 'theme.json');

  await mkdir(projectPath, { recursive: true });
  await cp(projectFixture, projectPath, { recursive: true });
  const statePath = join(projectPath, 'state.md');
  const state = await readFile(statePath, 'utf8');
  if (!state.startsWith('---\n')) {
    await writeFile(statePath, `---\n---\n${state}`);
  }
  await mkdir(userSkillsRoot, { recursive: true });
  await cp(coreSource, coreRoot, { recursive: true });
  await cp(adapterSource, adapterRoot, { recursive: true });
  await cp(themeFixture, themePath);
  await execFileAsync('git', ['init', '--quiet'], { cwd: checkout });
  await execFileAsync('git', ['config', 'user.email', 'fresh@example.test'], {
    cwd: checkout,
  });
  await execFileAsync('git', ['config', 'user.name', 'Fresh Host'], {
    cwd: checkout,
  });
  await execFileAsync('git', ['add', '.'], { cwd: checkout });
  await execFileAsync('git', ['commit', '--quiet', '-m', 'fixture'], {
    cwd: checkout,
  });

  return {
    root,
    checkout,
    projectPath,
    home,
    userSkillsRoot,
    coreRoot,
    adapterRoot,
    themePath,
  };
}

async function runInstalledCore(host, script, args) {
  const runName = {
    'bundle.mjs': 'runBundle',
    'verify.mjs': 'runVerify',
    'record.mjs': 'runRecord',
  }[script];
  assert.equal(typeof runName, 'string');
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      'const module = await import(process.env.CORE_SCRIPT_URL); await module[process.env.CORE_RUN_NAME](JSON.parse(process.env.CORE_RUN_ARGS));',
    ],
    {
      cwd: host.checkout,
      env: {
        ...process.env,
        HOME: host.home,
        EXPLAINER_KIT_HEADLESS_PROBE: 'off',
        CORE_SCRIPT_URL: pathToFileURL(join(host.coreRoot, 'scripts', script))
          .href,
        CORE_RUN_NAME: runName,
        CORE_RUN_ARGS: JSON.stringify(args),
      },
    },
  );
  return JSON.parse(stdout.trim());
}

async function runTerminalGuard(host, args) {
  const { stdout } = await execFileAsync(
    process.execPath,
    [join(adapterSource, 'scripts/check-terminal-outcome.mjs'), ...args],
    {
      cwd: host.checkout,
      env: { ...process.env, HOME: host.home },
    },
  );
  return JSON.parse(stdout.trim());
}

async function verifyArchivePackage(projectPath, projectRecapRun) {
  await verifySelectedProjectRecapForArchive(projectPath, projectRecapRun);
}

async function bundleProject(host, slug) {
  const runRoot = join(host.projectPath, 'explainers', slug);
  const result = await runInstalledCore(host, 'bundle.mjs', [
    '--recipe',
    'project-recap',
    '--project',
    host.projectPath,
    '--theme',
    host.themePath,
    '--out',
    runRoot,
  ]);
  assert.equal(result.reuse, false);
  return runRoot;
}

async function authorFixture(host, runRoot) {
  const [template, ledger] = await Promise.all([
    readFile(join(host.coreRoot, 'templates/house-style.html'), 'utf8'),
    readJson(join(runRoot, 'source/ledger.json')),
  ]);
  const sections = [
    'original-request',
    'key-agent-decisions',
    'as-built-architecture',
    'implementation-record',
    'validation-evidence',
    'outcome',
  ];
  const terms = (ledger.terminology ?? [])
    .map(({ term }) => `<li>${escapeHtml(term)}</li>`)
    .join('');
  const claims = (ledger.claims ?? [])
    .map(
      ({ subject, value }) =>
        `<tr><td>${escapeHtml(subject)}</td><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  const content = sections
    .map((id) => {
      const body =
        id === 'original-request'
          ? `<p>Grounded scope and requested result.</p><ul>${terms}</ul>`
          : id === 'validation-evidence'
            ? `<p>Machine-readable evidence.</p><table><tbody>${claims}</tbody></table>`
            : '<p>Source-grounded recap narrative.</p>';
      return `<section id="${id}"><h2>${title(id)}</h2>${body}</section>`;
    })
    .join('');
  const navigation = sections
    .map((id) => `<a href="#${id}">${title(id)}</a>`)
    .join('');
  const page = template
    .replaceAll('{{THEME_CSS}}', ':root{color-scheme:light}body{margin:0}')
    .replaceAll('{{TITLE}}', 'Fresh Host Project')
    .replaceAll(
      '{{DESCRIPTION}}',
      'A source-grounded project recap generated without custom modules.',
    )
    .replaceAll('{{EYEBROW}}', 'Project recap')
    .replaceAll('{{NAVIGATION}}', navigation)
    .replaceAll('{{CONTENT}}', content)
    .replaceAll('{{FOOTER}}', 'Generated from the bundled fact base.');
  await mkdir(join(runRoot, 'site'), { recursive: true });
  await writeFile(join(runRoot, 'site/index.html'), page);
}

async function verifyNone(host, runRoot) {
  await runInstalledCore(host, 'verify.mjs', [
    '--run-root',
    runRoot,
    '--recipe',
    'project-recap',
    '--rung',
    'none',
  ]);
  return readJson(join(runRoot, 'qa/result.json'));
}

async function record(host, runRoot, slug) {
  await runInstalledCore(host, 'record.mjs', [
    '--run-root',
    runRoot,
    '--recipe',
    'project-recap',
    '--slug',
    slug,
    '--mode',
    'unattended',
    '--theme',
    join(runRoot, 'theme.resolved.json'),
  ]);
  return readJson(join(runRoot, 'manifest.json'));
}

function allChecksPass(result) {
  return Object.values(result.checks).every(({ status }) => status === 'pass');
}

test('fresh user-scope core builds an archivable browser-less recap', async (t) => {
  const host = await freshHost(t);
  const compatibility = await checkCoreCompatibility({
    adapterRoot: host.adapterRoot,
    userSkillsRoot: host.userSkillsRoot,
    minimumVersion: MINIMUM_CORE_VERSION,
  });
  assert.equal(compatibility.ok, true);

  const runRoot = await bundleProject(host, 'accepted');
  await authorFixture(host, runRoot);
  const qa = await verifyNone(host, runRoot);
  assert.equal(allChecksPass(qa), true, JSON.stringify(qa.checks));
  assert.equal(qa.rung, 'none');
  assert.equal(qa.reason, 'disabled-by-configuration');
  const manifest = await record(host, runRoot, 'fresh-host-accepted');
  assert.equal(manifest.outcome, 'built-needs-review');
  await assert.doesNotReject(
    verifyArchivePackage(host.projectPath, relative(host.projectPath, runRoot)),
  );
});

test('missing narrative section stays failed and provides guarded skip evidence', async (t) => {
  const host = await freshHost(t);
  const runRoot = await bundleProject(host, 'missing-section');
  await authorFixture(host, runRoot);
  const pagePath = join(runRoot, 'site/index.html');
  const page = await readFile(pagePath, 'utf8');
  await writeFile(
    pagePath,
    page.replace(/<section id="outcome">[\s\S]*?<\/section>/, ''),
  );

  const qa = await verifyNone(host, runRoot);
  assert.equal(qa.checks.requiredNarrative.status, 'fail');
  const manifest = await record(host, runRoot, 'fresh-host-missing-section');
  assert.equal(manifest.outcome, 'failed');
  assert.deepEqual(
    await runTerminalGuard(host, [
      '--intent',
      'skip',
      '--skip-reason',
      'failed_attempt',
      '--manifest',
      join(runRoot, 'manifest.json'),
    ]),
    {
      ok: true,
      intent: 'skip',
      outcome: null,
      reason: 'failed_attempt',
    },
  );
});

test('core prerequisite failure persists a skip that reloads into intent resolution', async (t) => {
  const host = await freshHost(t);
  const runRoot = join(host.projectPath, 'explainers/core-missing');
  await rm(host.coreRoot, { recursive: true });
  const compatibility = await checkCoreCompatibility({
    adapterRoot: host.adapterRoot,
    userSkillsRoot: host.userSkillsRoot,
    minimumVersion: MINIMUM_CORE_VERSION,
  });
  assert.equal(compatibility.ok, false);
  assert.equal(compatibility.code, 'missing');
  assert.equal(compatibility.guidance, CORE_INSTALL_COMMAND);

  await writeFailure(
    runRoot,
    'core',
    `${compatibility.message} ${compatibility.guidance}`,
  );
  const failurePath = join(runRoot, 'failure.json');
  assert.equal((await readJson(failurePath)).stage, 'core');
  assert.deepEqual(
    await runTerminalGuard(host, [
      '--intent',
      'skip',
      '--skip-reason',
      'failed_attempt',
      '--failure',
      failurePath,
    ]),
    {
      ok: true,
      intent: 'skip',
      outcome: null,
      reason: 'failed_attempt',
    },
  );

  const statePath = join(host.projectPath, 'state.md');
  const state = await readFile(statePath, 'utf8');
  const intentRecord = {
    decision: 'skip',
    source: 'failed_attempt',
    decided_at: '2026-09-11T19:30:00Z',
    failed_attempt_evidence: 'explainers/core-missing/failure.json',
  };
  await persistIntent({
    statePath,
    product: 'projectRecap',
    record: intentRecord,
    expectedHash: hashStateContent(state),
  });
  const persistedIntent = await readPersistedIntent({
    statePath,
    product: 'projectRecap',
  });
  assert.deepEqual(persistedIntent, intentRecord);
  const resumed = resolveIntent({
    product: 'projectRecap',
    mode: 'interactive',
    state: persistedIntent,
    preference: 'always',
  });
  assert.equal(resumed.decision, 'skip');
  assert.equal(resumed.needsPrompt, false);
  assert.equal(resumed.resolutionSource, 'project_state');
  await assert.rejects(readFile(join(runRoot, 'source/fact-base.json')), {
    code: 'ENOENT',
  });
  await assert.rejects(readFile(join(runRoot, 'site/index.html')), {
    code: 'ENOENT',
  });
});

test('Playwright launch failure is distinct and still records needs-review', async (t) => {
  const host = await freshHost(t);
  const runRoot = await bundleProject(host, 'browser-failure');
  await authorFixture(host, runRoot);
  const nonExecutable = join(host.root, 'not-chromium');
  await writeFile(nonExecutable, 'not executable');

  const installedVerify = await import(
    `${pathToFileURL(join(host.coreRoot, 'scripts/verify.mjs')).href}?browser-failure`
  );
  const qa = await installedVerify.verifyRun({
    runRoot,
    recipe: 'project-recap',
    rung: 'playwright',
    headlessRuntimeOptions: {
      loadDriver: () => import('@playwright/test'),
      env: { PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: nonExecutable },
    },
  });
  assert.equal(allChecksPass(qa), true, JSON.stringify(qa.checks));
  assert.equal(qa.rung, 'none');
  assert.match(qa.reason, /^playwright-launch-failed:/);
  assert.notEqual(qa.reason, 'disabled-by-configuration');

  const manifest = await record(host, runRoot, 'fresh-host-browser-failure');
  assert.equal(manifest.outcome, 'built-needs-review');
});

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function title(id) {
  if (id === 'as-built-architecture') return 'Delivered Architecture';
  return id
    .split('-')
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
