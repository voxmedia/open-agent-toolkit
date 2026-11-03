import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CommandContext, GlobalOptions } from '@app/command-context';
import { createLoggerCapture } from '@commands/__tests__/helpers';
import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createReviewResolveCommand,
  resolveReviewEvent,
  type ReviewGateEvent,
} from '../resolve';

const PROJECT = '.oat/projects/shared/demo';
const RUN_ID = '0f6c7a10-3c1e-4c55-9a43-8b1d2c3e4f50';
const GATE_ARTIFACT = 'reviews/p01-review-2026-11-03T120000Z.md';
const MANUAL_ARTIFACT = 'reviews/p01-review-2026-11-03T130000Z.md';

const WIDE_HEADER = [
  '| Scope | Type | Status | Date | Artifact | Reviewed Head | Invocation | Gate Target |',
  '| ----- | ---- | ------ | ---- | -------- | ------------- | ---------- | ----------- |',
];

const tempDirs: string[] = [];

afterEach(async () => {
  process.exitCode = undefined;
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  }).trim();
}

/** A repository with two commits, returning [parent, child]. */
async function createRepo(): Promise<{
  root: string;
  parent: string;
  child: string;
}> {
  const root = await mkdtemp(join(tmpdir(), 'oat-review-resolve-'));
  tempDirs.push(root);
  git(root, ['init', '-q']);
  await writeFile(join(root, 'a.txt'), 'a\n', 'utf8');
  git(root, ['add', 'a.txt']);
  git(root, ['commit', '-q', '-m', 'one']);
  const parent = git(root, ['rev-parse', 'HEAD']);
  await writeFile(join(root, 'a.txt'), 'b\n', 'utf8');
  git(root, ['commit', '-q', '-am', 'two']);
  const child = git(root, ['rev-parse', 'HEAD']);
  await mkdir(join(root, PROJECT, 'reviews', 'archived'), { recursive: true });
  return { root, parent, child };
}

function row(cells: string[]): string {
  return `| ${cells.join(' | ')} |`;
}

async function writePlan(root: string, rows: string[]): Promise<string> {
  const content = ['## Reviews', '', ...WIDE_HEADER, ...rows, ''].join('\n');
  await writeFile(join(root, PROJECT, 'plan.md'), content, 'utf8');
  return content;
}

async function writeArtifact(
  root: string,
  relativePath: string,
  fields: Record<string, string>,
): Promise<void> {
  await writeFile(
    join(root, PROJECT, relativePath),
    [
      '---',
      'oat_generated: true',
      ...Object.entries(fields).map(([key, value]) => `${key}: ${value}`),
      '---',
      '',
      '# Review',
      '',
    ].join('\n'),
    'utf8',
  );
}

async function writeGateArtifact(root: string, head: string): Promise<void> {
  await writeArtifact(root, GATE_ARTIFACT, {
    oat_generated_at: '2026-11-03T12:00:00Z',
    oat_review_scope: 'p01',
    oat_review_type: 'code',
    oat_review_invocation: 'gate',
    oat_review_head_sha: head,
    oat_gate_run_id: RUN_ID,
    oat_gate_target: 'claude-opus-5-5-high',
  });
}

function gateRow(head: string): string {
  return row([
    'p01',
    'code',
    'received',
    '2026-11-03',
    GATE_ARTIFACT,
    head,
    'gate',
    'claude-opus-5-5-high',
  ]);
}

function gateEvent(
  reviewedHead: string,
  overrides: Partial<ReviewGateEvent> = {},
): ReviewGateEvent {
  return {
    artifactPath: `${PROJECT}/${GATE_ARTIFACT}`,
    scope: 'p01',
    type: 'code',
    runId: RUN_ID,
    reviewedHead,
    ...overrides,
  };
}

function codes(result: { diagnostics: Array<{ code: string }> }): string[] {
  return result.diagnostics.map((entry) => entry.code);
}

describe('resolveReviewEvent', () => {
  it('consumes a matching gate event whose row head equals the event head', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writePlan(root, [gateRow(child)]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child),
    });

    expect(result).toMatchObject({
      status: 'ok',
      project: PROJECT,
      path: `${PROJECT}/${GATE_ARTIFACT}`,
      row: { row: 1, scope: 'p01', artifact: GATE_ARTIFACT },
      checks: {
        scope: 'match',
        type: 'match',
        artifact: 'match',
        reviewedHead: 'match',
        gateRunId: 'match',
        rowStatus: 'match',
        supersession: 'current',
      },
      diagnostics: [],
    });
  });

  it('consumes an anchored event whose reviewedHead is the row head', async () => {
    const { root, parent } = await createRepo();
    await writeGateArtifact(root, parent);
    await writePlan(root, [gateRow(parent)]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(parent),
    });

    expect(result.status).toBe('ok');
    expect(result.checks.reviewedHead).toBe('match');
  });

  it('refuses an event head the row head is only an ancestor of (exact equality)', async () => {
    const { root, parent, child } = await createRepo();
    await writeGateArtifact(root, parent);
    await writePlan(root, [gateRow(parent)]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child),
    });

    expect(result.status).toBe('refused');
    expect(result.checks.reviewedHead).toBe('mismatch');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'reviewed_head_mismatch',
        source: 'row',
        expected: child,
        actual: parent,
      }),
    ]);
  });

  it('accepts a `-` Reviewed Head as unavailable (an artifact gate row)', async () => {
    const { root, child } = await createRepo();
    const artifact = 'reviews/artifact-plan-review-2026-11-03T120000Z.md';
    await writeArtifact(root, artifact, {
      oat_generated_at: '2026-11-03T12:00:00Z',
      oat_review_scope: 'plan',
      oat_review_type: 'artifact',
      oat_review_invocation: 'gate',
      oat_gate_run_id: RUN_ID,
    });
    await writePlan(root, [
      row([
        'plan',
        'artifact',
        'received',
        '2026-11-03',
        artifact,
        '-',
        'gate',
        'claude-opus-5-5-high',
      ]),
    ]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child, {
        artifactPath: `${PROJECT}/${artifact}`,
        scope: 'plan',
        type: 'artifact',
      }),
    });

    expect(result.status).toBe('ok');
    expect(result.checks.reviewedHead).toBe('unavailable');
  });

  it('refuses the wrong artifact: a newer non-gate artifact is not the gate event', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writeArtifact(root, MANUAL_ARTIFACT, {
      oat_generated_at: '2026-11-03T13:00:00Z',
      oat_review_scope: 'p01',
      oat_review_type: 'code',
      oat_review_invocation: 'manual',
      oat_review_head_sha: child,
    });
    await writePlan(root, [
      gateRow(child),
      row([
        'p01',
        'code',
        'received',
        '2026-11-03',
        MANUAL_ARTIFACT,
        child,
        'manual',
        '-',
      ]),
    ]);

    const named = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child),
    });
    const other = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child, {
        artifactPath: `${PROJECT}/${MANUAL_ARTIFACT}`,
      }),
    });

    expect(named).toMatchObject({
      status: 'ok',
      path: `${PROJECT}/${GATE_ARTIFACT}`,
    });
    expect(other.status).toBe('refused');
    expect(codes(other)).toEqual(['gate_run_id_missing']);
  });

  it('refuses a row head that descends from the event head', async () => {
    const { root, parent, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writePlan(root, [gateRow(child)]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(parent),
    });

    expect(result.status).toBe('refused');
    expect(result.checks.reviewedHead).toBe('mismatch');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'reviewed_head_mismatch',
        source: 'row',
        expected: parent,
        actual: child,
      }),
    ]);
  });

  it('refuses an unknown event head as a mismatch', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writePlan(root, [gateRow(child)]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent('a'.repeat(40)),
    });

    expect(result.status).toBe('refused');
    expect(codes(result)).toEqual(['reviewed_head_mismatch']);
  });

  it('refuses the wrong scope from both the row and the artifact', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writePlan(root, [gateRow(child)]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child, { scope: 'p02' }),
    });

    expect(result.status).toBe('refused');
    expect(result.checks.scope).toBe('mismatch');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'scope_mismatch', source: 'artifact' }),
      expect.objectContaining({
        code: 'scope_mismatch',
        source: 'row',
        expected: 'p02',
        actual: 'p01',
      }),
    ]);
  });

  it('refuses the wrong type', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writePlan(root, [gateRow(child)]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child, { type: 'artifact' }),
    });

    expect(result.status).toBe('refused');
    expect(result.checks.type).toBe('mismatch');
    expect(codes(result)).toEqual(['type_mismatch', 'type_mismatch']);
  });

  it('refuses the wrong run ID', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writePlan(root, [gateRow(child)]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child, { runId: 'another-run' }),
    });

    expect(result.status).toBe('refused');
    expect(result.checks.gateRunId).toBe('mismatch');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'gate_run_id_mismatch',
        expected: 'another-run',
        actual: RUN_ID,
      }),
    ]);
  });

  it('refuses an event with no bound row', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writePlan(root, [
      row(['p01', 'code', 'pending', '-', '-', '-', '-', '-']),
    ]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child),
    });

    expect(result).toMatchObject({ status: 'refused', row: null });
    expect(codes(result)).toEqual(['row_not_bound']);
  });

  it('refuses an event key that more than one row claims', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writePlan(root, [gateRow(child), gateRow(child)]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child),
    });

    expect(result.status).toBe('refused');
    expect(codes(result)).toEqual(['duplicate_event_key']);
  });

  it('refuses a row that names a different artifact path for the same filename', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writePlan(root, [
      row([
        'p01',
        'code',
        'received',
        '2026-11-03',
        `reviews/archived/${GATE_ARTIFACT.slice('reviews/'.length)}`,
        child,
        'gate',
        'claude-opus-5-5-high',
      ]),
    ]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child),
    });

    expect(result.status).toBe('refused');
    expect(codes(result)).toEqual(['artifact_mismatch']);
  });

  it('refuses a received row a later gate round supersedes at a descendant head (p07)', async () => {
    const { root, parent, child } = await createRepo();
    const laterArtifact = 'reviews/p01-review-2026-11-03T140000Z.md';
    await writeGateArtifact(root, parent);
    await writeArtifact(root, laterArtifact, {
      oat_generated_at: '2026-11-03T14:00:00Z',
      oat_review_scope: 'p01',
      oat_review_type: 'code',
      oat_review_invocation: 'gate',
      oat_review_head_sha: child,
      oat_gate_run_id: '9a1b2c3d-0000-4000-8000-000000000002',
      oat_gate_target: 'other-target',
    });
    await writePlan(root, [
      gateRow(parent),
      row([
        'p01',
        'code',
        'received',
        '2026-11-03',
        laterArtifact,
        child,
        'gate',
        'other-target',
      ]),
    ]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(parent),
    });

    expect(result.status).toBe('refused');
    expect(result.checks).toMatchObject({
      reviewedHead: 'match',
      rowStatus: 'match',
      supersession: 'superseded',
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'row_superseded',
        source: 'row',
        expected: 'current',
        actual: 'row 2',
        supersededBy: expect.objectContaining({
          row: 2,
          artifact: laterArtifact,
          gateTarget: 'other-target',
        }),
      }),
    ]);
  });

  it('refuses a bound row that is no longer received', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writePlan(root, [
      row([
        'p01',
        'code',
        'passed',
        '2026-11-03',
        GATE_ARTIFACT,
        child,
        'gate',
        'claude-opus-5-5-high',
      ]),
    ]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child),
    });

    expect(result.status).toBe('refused');
    expect(result.checks).toMatchObject({
      reviewedHead: 'match',
      rowStatus: 'mismatch',
      supersession: 'unavailable',
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'row_not_received',
        source: 'row',
        expected: 'received',
        actual: 'passed',
      }),
    ]);
  });

  it('refuses an archived or missing event artifact', async () => {
    const { root, child } = await createRepo();
    await writePlan(root, [gateRow(child)]);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child, {
        artifactPath: `${PROJECT}/reviews/archived/p01-review-2026-11-03T120000Z.md`,
      }),
    });

    expect(result.status).toBe('refused');
    expect(codes(result)).toEqual(
      expect.arrayContaining(['artifact_not_active', 'artifact_not_found']),
    );
  });

  it('refuses when the project has no plan.md', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);

    const result = await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child),
    });

    expect(result.status).toBe('refused');
    expect(codes(result)).toEqual(['ledger_unavailable']);
  });

  it('never edits the ledger or the artifact', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    const plan = await writePlan(root, [gateRow(child)]);
    const artifact = await readFile(join(root, PROJECT, GATE_ARTIFACT), 'utf8');

    await resolveReviewEvent({
      repoRoot: root,
      projectPath: PROJECT,
      event: gateEvent(child, { runId: 'another-run' }),
    });

    expect(await readFile(join(root, PROJECT, 'plan.md'), 'utf8')).toBe(plan);
    expect(await readFile(join(root, PROJECT, GATE_ARTIFACT), 'utf8')).toBe(
      artifact,
    );
  });
});

describe('oat review resolve', () => {
  async function run(
    root: string,
    args: string[],
  ): Promise<ReturnType<typeof createLoggerCapture>> {
    const capture = createLoggerCapture();
    const command = createReviewResolveCommand({
      buildCommandContext: (options: GlobalOptions): CommandContext => ({
        scope: 'project',
        dryRun: false,
        verbose: false,
        json: options.json ?? false,
        cwd: root,
        home: root,
        interactive: false,
        logger: capture.logger,
      }),
      resolveProjectRoot: vi.fn(async () => root),
      readOatLocalConfig: vi.fn(async () => ({
        version: 1,
        activeProject: PROJECT,
      })),
    });
    const program = new Command().option('--json').exitOverride();
    program.addCommand(new Command('review').addCommand(command));
    await program.parseAsync(['--json', 'review', 'resolve', ...args], {
      from: 'user',
    });
    return capture;
  }

  function eventArgs(head: string, runId = RUN_ID): string[] {
    return [
      '--artifact',
      `${PROJECT}/${GATE_ARTIFACT}`,
      '--scope',
      'p01',
      '--type',
      'code',
      '--run-id',
      runId,
      '--reviewed-head',
      head,
    ];
  }

  it('exits 0 with the resolution for a matching event', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writePlan(root, [gateRow(child)]);

    const capture = await run(root, eventArgs(child));

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'ok',
      path: `${PROJECT}/${GATE_ARTIFACT}`,
    });
    expect(process.exitCode).toBe(0);
  });

  it('exits 1 with structured diagnostics for a mismatched event', async () => {
    const { root, child } = await createRepo();
    await writeGateArtifact(root, child);
    await writePlan(root, [gateRow(child)]);

    const capture = await run(root, eventArgs(child, 'another-run'));

    expect(capture.jsonPayloads[0]).toMatchObject({
      status: 'refused',
      diagnostics: [{ code: 'gate_run_id_mismatch', severity: 'error' }],
    });
    expect(process.exitCode).toBe(1);
  });

  it('exits 1 when the event is incomplete or its head is not a full SHA', async () => {
    const { root } = await createRepo();

    const missing = await run(root, ['--artifact', 'x.md']);
    expect(missing.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining(
        '--scope, --type, --run-id, --reviewed-head',
      ),
    });
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    const abbreviated = await run(root, eventArgs('abc1234'));
    expect(abbreviated.jsonPayloads[0]).toMatchObject({
      status: 'error',
      message: expect.stringContaining('full 40-character commit SHA'),
    });
    expect(process.exitCode).toBe(1);
  });
});
