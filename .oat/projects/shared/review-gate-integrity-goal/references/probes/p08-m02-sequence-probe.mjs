#!/usr/bin/env node
// p08 gate convergence probe (rgi-p08-impl-20261107-01, p08-t02).
//
// Usage: node p08-m02-sequence-probe.mjs <cli-entry> [<repo-root>]
//   <cli-entry>  a built CLI entry, e.g. packages/cli/dist/index.js (branch)
//                or a copy of the phase-base build's dist/index.js.
//
// Runs the real `oat --json gate review` of the given build in scratch goal
// projects. A scratch exec target stands in for the reviewer: it writes the
// requested fixture as the review artifact, copying the gate invocation values
// from the dispatch prompt as a reviewer does, and writes the inline route
// receipt. Fixtures are the captured m02 exit-gate artifacts and the two reruns
// derived from run 1 (provenance in each fixture's header), with the header
// stripped.
//
// Sequences:
//   m02     r1 (first run), r2, r3 in one project: expect run 1 without
//           convergence fields, run 2 new:1 carried:0 resolved:2, run 3
//           new:0 carried:0 resolved:1, all subject milestone:m02.
//   stuck   r1, then the stuck rerun: expect new:0 carried:2 resolved:0.
//   reworded r1, then the reworded rerun: expect new:0 carried:2 resolved:0.
//
// Prints one JSON line per gate run: exit code, status, counts, the
// convergence summary (or `absent`), the gate's project-log record body with
// volatile values masked, and the first run's whole envelope with volatile
// values masked (`envelope`), for a before/after comparison between builds.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const cliEntry = resolve(process.argv[2] ?? 'packages/cli/dist/index.js');
const repoRoot = resolve(process.argv[3] ?? '.');
const fixtures = join(
  repoRoot,
  'packages/cli/src/commands/gate/__fixtures__/convergence',
);
const project = '.oat/projects/shared/review-gate-integrity-goal';
const m02Phases = ['p07', 'p12', 'p13', 'p-rev1', 'p-rev2', 'p-rev3'];
const R1 = 'm02-exit-r1-range-review-2026-11-03T215601Z.md';
const R2 = 'm02-exit-r2-range-review-2026-11-03T224623Z.md';
const R3 = 'm02-exit-r3-range-review-2026-11-04T015726Z.md';

const reviewerScript = `
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
const prompt = process.argv.at(-1) ?? '';
const fixture = process.env.PROBE_FIXTURE;
let content = (await readFile(fixture, 'utf8')).replace(/^<!--[\\s\\S]*?-->\\n\\n/, '');
for (const key of ['oat_gate_run_id', 'oat_gate_target', 'oat_gate_runtime',
  'oat_invocation_model', 'oat_invocation_reasoning_effort', 'oat_invocation_source']) {
  const value = prompt.match(new RegExp('^' + key + ': (.+)$', 'm'))?.[1] ?? 'unknown';
  content = content.replace(new RegExp('^' + key + ': .+$', 'm'), key + ': ' + value);
}
await writeFile(join(process.cwd(), process.env.PROBE_PROJECT, 'reviews', basename(fixture)), content);
await writeFile(process.env.OAT_GATE_ROUTE_RECEIPT_PATH, JSON.stringify({
  route: 'inline', reason: 'p08 probe route receipt',
  cliRoot: process.env.OAT_GATE_CLI_ROOT, runtime: process.env.OAT_GATE_RUNTIME,
}));
`;

async function scratchProject(scratch) {
  const root = await mkdtemp(join(scratch, 'repo-'));
  const home = await mkdtemp(join(scratch, 'home-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  await mkdir(join(root, project, 'reviews'), { recursive: true });
  await mkdir(join(root, '.oat'), { recursive: true });
  await writeFile(
    join(root, project, 'state.md'),
    '---\noat_kind: implementation\noat_workflow_mode: goal\n---\n\n# State\n',
  );
  await writeFile(
    join(root, project, 'plan.md'),
    [
      '# Project Brief',
      '',
      '## Milestones',
      '',
      '| Milestone | Phases |',
      '| --------- | ------ |',
      `| m02 | ${m02Phases.join(', ')} |`,
      '',
      ...m02Phases.flatMap((id) => [
        `## Phase ${id}: Work`,
        '',
        '**Intent:** work',
        '**Exit evidence:** done',
        '**Provisional:** no',
        '',
      ]),
    ].join('\n'),
  );
  const reviewer = join(root, 'probe-reviewer.mjs');
  await writeFile(reviewer, reviewerScript);
  await writeFile(
    join(root, '.oat', 'config.local.json'),
    `${JSON.stringify({ version: 1, activeProject: project })}\n`,
  );
  await writeFile(
    join(root, '.oat', 'config.json'),
    `${JSON.stringify({
      version: 1,
      workflow: {
        gates: {
          execTargets: {
            'probe-reviewer': {
              runtime: 'cursor',
              baseCommand: [process.execPath, reviewer],
              invocation: { model: 'probe-model', reasoningEffort: 'none' },
              priority: 999,
            },
          },
        },
      },
    })}\n`,
  );
  execFileSync('git', ['add', '-A'], { cwd: root });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=probe',
      '-c',
      'user.email=probe@example.invalid',
      'commit',
      '-qm',
      'probe base',
    ],
    { cwd: root },
  );
  return { root, home };
}

function mask(value, runId, root) {
  return JSON.parse(
    JSON.stringify(value)
      .replaceAll(root, '<root>')
      .replaceAll(runId ?? '\u0000', '<run>')
      .replace(/\b[0-9a-f]{40}\b/g, '<sha>')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, (match) =>
        /^2026-11-0[34]T/.test(match) ? match : '<time>',
      ),
  );
}

async function gateRun({ root, home }, sequence, fixture, scope) {
  const result = spawnSync(
    process.execPath,
    [
      cliEntry,
      '--json',
      'gate',
      'review',
      '--project',
      project,
      '--review-type',
      'code',
      '--review-scope',
      scope,
      '--target',
      'probe-reviewer',
      'Review the probe fixture.',
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        NO_UPDATE_NOTIFIER: '1',
        PROBE_FIXTURE: join(fixtures, fixture),
        PROBE_PROJECT: project,
      },
    },
  );
  let payload = null;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    payload = { unparsable: result.stdout.slice(0, 400) };
  }
  const log = await readFile(join(root, project, 'project-log.md'), 'utf8')
    .then((text) =>
      text
        .split('\n')
        .filter((line) => line.startsWith('target='))
        .at(-1),
    )
    .catch(() => null);
  const c = payload.convergence;
  return {
    sequence,
    fixture,
    exit: result.status,
    status: payload.status ?? null,
    counts: payload.counts ?? null,
    convergence: c
      ? {
          subject: `${c.sequence.subject.kind}:${c.sequence.subject.value}`,
          run: c.sequence.run,
          previousRun: c.sequence.previousRun?.runId ?? null,
          status: c.status,
          counts: c.counts ?? null,
          reason: c.reason ?? null,
          marks: (c.findings ?? []).map(
            (f) => `${f.id}:${f.mark}${f.previous ? `<-${f.previous.id}` : ''}`,
          ),
          resolved: (c.resolved ?? []).map((f) => f.id),
        }
      : 'absent',
    logBody: log ? mask(log, payload.runId, root) : null,
    envelope: c ? undefined : mask(payload, payload.runId, root),
    stderrTail: result.status === 0 ? undefined : result.stderr.slice(-400),
  };
}

const scratch = await mkdtemp(join(tmpdir(), 'rgi-p08-probe-'));
try {
  const m02 = await scratchProject(scratch);
  console.log(JSON.stringify(await gateRun(m02, 'm02', R1, 'p07-p13')));
  console.log(JSON.stringify(await gateRun(m02, 'm02', R2, 'p07-p-rev2')));
  console.log(JSON.stringify(await gateRun(m02, 'm02', R3, 'p07-p-rev3')));

  for (const [name, rerun] of [
    ['stuck', 'm02-exit-r1-stuck-rerun.md'],
    ['reworded', 'm02-exit-r1-reworded-rerun.md'],
  ]) {
    const repo = await scratchProject(scratch);
    const first = await gateRun(repo, name, R1, 'p07-p13');
    delete first.envelope;
    console.log(JSON.stringify(first));
    console.log(JSON.stringify(await gateRun(repo, name, rerun, 'p07-p13')));
  }
} finally {
  await rm(scratch, { recursive: true, force: true });
}
