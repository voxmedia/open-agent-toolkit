import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(fixtureRoot, 'project');
const repoRoot = path.resolve(fixtureRoot, '../../..');
const require = createRequire(import.meta.url);
const tsxCli = require.resolve('tsx/cli');
const cliEntry = path.join(repoRoot, 'packages/cli/src/index.ts');
const cliTsconfig = path.join(repoRoot, 'packages/cli/tsconfig.json');

function frontmatter(source) {
  const match = source.match(/^---\n(?<content>[\s\S]*?)\n---/);

  assert.ok(match, 'fixture artifact must have YAML frontmatter');
  return match.groups.content;
}

function resolveCandidate(provider, candidate) {
  const temporaryRoot = mkdtempSync(
    path.join(os.tmpdir(), 'oat-fixture-resolver-'),
  );
  const home = path.join(temporaryRoot, 'home');

  mkdirSync(path.join(temporaryRoot, '.git'));
  mkdirSync(home);

  try {
    const result = spawnSync(
      process.execPath,
      [
        tsxCli,
        '--tsconfig',
        cliTsconfig,
        cliEntry,
        'project',
        'dispatch-ceiling',
        'resolve',
        '--provider',
        provider,
        '--role',
        'implementer',
        '--ceiling-tier',
        'high',
        '--candidate-model',
        candidate.model,
        ...(candidate.effort ? ['--candidate-effort', candidate.effort] : []),
        '--project-path',
        projectRoot,
        '--json',
      ],
      {
        cwd: temporaryRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          OAT_NON_INTERACTIVE: '1',
          USERPROFILE: home,
        },
      },
    );

    assert.equal(
      result.status,
      0,
      `${provider} resolver failed:\n${result.stderr || result.stdout}`,
    );
    return JSON.parse(result.stdout);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
}

test('fixture plan preserves the canonical format contract', () => {
  const plan = readFileSync(path.join(projectRoot, 'plan.md'), 'utf8');
  const yaml = frontmatter(plan);

  for (const [key, value] of [
    ['oat_plan_source', 'quick'],
    ['oat_status', 'in_progress'],
    ['oat_ready_for', 'null'],
    ['oat_template', 'true'],
  ]) {
    assert.match(
      yaml,
      new RegExp(`^${key}: ${value}$`, 'm'),
      `plan frontmatter must declare ${key}`,
    );
  }

  const taskHeadings = [...plan.matchAll(/^### Task (p\d{2}-t\d{2}): .+$/gm)];
  assert.equal(taskHeadings.length, 5, 'fixture must have five task headings');
  assert.deepEqual(
    taskHeadings.map((match) => match[1]),
    ['p01-t01', 'p01-t02', 'p02-t01', 'p02-t02', 'p03-t01'],
    'task headings must retain stable pNN-tNN identifiers',
  );

  assert.match(
    plan,
    /^\| Scope\s+\| Type\s+\| Status\s+\| Date\s+\| Artifact \|$/m,
    'reviews table must include the canonical Date column',
  );
  for (const [scope, type] of [
    ['p01', 'code'],
    ['p02', 'code'],
    ['p03', 'code'],
    ['final', 'code'],
    ['spec', 'artifact'],
    ['design', 'artifact'],
    ['plan', 'artifact'],
  ]) {
    assert.match(
      plan,
      new RegExp(
        `^\\|\\s*${scope}\\s*\\|\\s*${type}\\s*\\|\\s*pending\\s*\\|\\s*-\\s*\\|\\s*-\\s*\\|$`,
        'm',
      ),
      `missing required review row for ${scope}`,
    );
  }
});

test('fixture state preserves quick-mode lifecycle and monotonic dispatch policy', () => {
  const state = readFileSync(path.join(projectRoot, 'state.md'), 'utf8');
  const yaml = frontmatter(state);

  for (const [key, value] of [
    ['oat_current_task', 'null'],
    ['oat_status', 'in_progress'],
    ['oat_ready_for', 'null'],
    ['oat_template', 'true'],
    ['oat_kind', 'implementation'],
    ['oat_phase', 'plan'],
    ['oat_phase_status', 'in_progress'],
    ['oat_workflow_mode', 'quick'],
    ['oat_workflow_origin', 'native'],
    ['oat_generated', 'false'],
  ]) {
    assert.match(
      yaml,
      new RegExp(`^${key}: ${value}$`, 'm'),
      `state frontmatter must declare ${key}`,
    );
  }
  assert.match(yaml, /^oat_dispatch_policy:\n/m);
  assert.match(yaml, /^  mode: managed$/m);
  assert.match(yaml, /^  policy: high$/m);
  assert.match(yaml, /^  source: project-state$/m);
  for (const [provider, lowerCandidate, highCandidate] of [
    ['codex', 'gpt-5.6-terra', 'gpt-5.6-sol'],
    ['claude', 'sonnet', 'opus'],
    ['cursor', 'gpt-5.6-terra-medium', 'gpt-5.6-sol-max'],
  ]) {
    assert.match(
      yaml,
      new RegExp(
        `^    ${provider}:\\n      balanced:\\n        candidates:\\n[\\s\\S]*?${lowerCandidate}[\\s\\S]*?^      high:\\n        candidates:\\n[\\s\\S]*?${highCandidate}`,
        'm',
      ),
      `state must retain monotonic ${provider} balanced and high candidates`,
    );
  }
  assert.doesNotMatch(
    yaml,
    /^\s*(?:selection|requestedCandidate|resolved|dispatchArgs|target):/m,
    'state must not persist compiled selection or dispatch results',
  );
});

test('fixture dispatch matrix supports exact lower candidates under High', () => {
  const cases = [
    {
      provider: 'codex',
      lower: { model: 'gpt-5.6-terra', effort: 'medium' },
      high: { model: 'gpt-5.6-sol', effort: 'high' },
    },
    {
      provider: 'claude',
      lower: { model: 'sonnet' },
      high: { model: 'opus' },
    },
    {
      provider: 'cursor',
      lower: { model: 'gpt-5.6-terra-medium' },
      high: { model: 'gpt-5.6-sol-max' },
    },
  ];

  for (const { provider, lower, high } of cases) {
    const highResolution = resolveCandidate(provider, high);
    const highSelection = highResolution.providers[provider].selection;

    assert.equal(highResolution.status, 'resolved');
    assert.equal(highResolution.source, 'invocation');
    assert.equal(highSelection.ceilingTier, 'high');
    assert.equal(highSelection.target.model, high.model);
    assert.equal(highSelection.target.effort, high.effort);
    assert.equal(highSelection.ceilingTarget.model, high.model);
    assert.equal(highSelection.ceilingTarget.effort, high.effort);

    const lowerResolution = resolveCandidate(provider, lower);
    const lowerSelection = lowerResolution.providers[provider].selection;

    assert.equal(lowerResolution.status, 'resolved');
    assert.equal(lowerResolution.source, 'invocation');
    assert.equal(lowerSelection.ceilingTier, 'high');
    assert.equal(lowerSelection.candidateTier, 'balanced');
    assert.equal(lowerSelection.requestedCandidate.model, lower.model);
    assert.equal(lowerSelection.requestedCandidate.effort, lower.effort);
    assert.equal(lowerSelection.target.model, lower.model);
    assert.equal(lowerSelection.target.effort, lower.effort);
    assert.equal(lowerSelection.ceilingTarget.model, high.model);
    assert.equal(lowerSelection.ceilingTarget.effort, high.effort);
    assert.notEqual(lowerSelection.ceilingTarget.model, lower.model);
  }
});

test('completed fixture discovery and design are durable artifacts', () => {
  for (const artifact of ['discovery.md', 'design.md']) {
    const yaml = frontmatter(
      readFileSync(path.join(projectRoot, artifact), 'utf8'),
    );

    assert.match(yaml, /^oat_status: complete$/m);
    assert.match(yaml, /^oat_template: false$/m);
  }
});
