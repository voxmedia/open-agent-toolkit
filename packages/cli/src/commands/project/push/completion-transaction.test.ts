import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { relative } from 'node:path';

import {
  renderLinksBlock,
  replaceLinksBlock,
} from '@commands/project/links/render';
import { defaultGitRunner } from '@commands/project/sync/git';
import {
  buildSyncedRecord,
  readSyncedRecord,
  writeSyncedRecord,
} from '@commands/project/sync/record';
import {
  buildSyncTarget,
  createSyncedProject,
  pushSynced,
} from '@commands/project/sync/ref-sync';
import { createSyncedFixture } from '@test-support/synced-fixture';
import { describe, expect, it } from 'vitest';

const PROJECT_SLUG = 'completion-receipt';
const PR_ARTIFACT = 'pr/project-pr-2026-08-28.md';
const RECAP_MANIFEST = 'explainers/project-recap/manifest.json';
const RECAP_BUILD_RECORD = 'explainers/project-recap/build-record.json';
const FINAL_ARTIFACT_MESSAGE = 'chore(oat): publish final project links';
const EVIDENCE_MESSAGE = 'chore(oat): attest final project recap';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function changedPaths(cwd: string, commit: string): string[] {
  const output = git(cwd, [
    'diff-tree',
    '--no-commit-id',
    '--name-only',
    '-r',
    commit,
  ]);
  return output === '' ? [] : output.split('\n').sort();
}

async function publishFinalArtifact(
  projectPath: string,
  target: ReturnType<typeof buildSyncTarget>,
): Promise<never> {
  const pinReceipt = await pushSynced(target, defaultGitRunner, {
    message: 'chore(oat): finalize project lifecycle',
  });
  expect(pinReceipt.status).toBe('pushed');

  const artifactPath = `${projectPath}/${PR_ARTIFACT}`;
  const initialBody = await readFile(artifactPath, 'utf8');
  const finalLinks = renderLinksBlock({
    slug: PROJECT_SLUG,
    sha: pinReceipt.sha,
    ref: target.ref,
    originUrl: 'https://github.com/example/oat-fixture.git',
    present: ['summary.md'],
    pinnedAt: '2026-08-28T12:00:00Z',
  });
  const rendered = replaceLinksBlock(initialBody, finalLinks);
  expect(rendered.malformed).toBe(false);
  await writeFile(artifactPath, `${rendered.body.trimEnd()}\n`, 'utf8');

  const finalReceipt = await pushSynced(target, defaultGitRunner, {
    message: FINAL_ARTIFACT_MESSAGE,
  });
  expect(finalReceipt.status).toBe('pushed');
  expect(git(projectPath, ['rev-parse', `${finalReceipt.sha}^`])).toBe(
    pinReceipt.sha,
  );
  expect(changedPaths(projectPath, finalReceipt.sha)).toEqual([PR_ARTIFACT]);

  throw new Error('injected interruption after final artifact publication');
}

function recoverFinalArtifactReceipts(
  projectPath: string,
  originDir: string,
  ref: string,
): { finalArtifactCommit: string; pinSourceCommit: string } {
  expect(git(projectPath, ['status', '--porcelain'])).toBe('');
  const retainedRefCommit = git(projectPath, ['rev-parse', 'HEAD']);
  expect(git(originDir, ['rev-parse', ref])).toBe(retainedRefCommit);
  const retainedSubject = git(projectPath, [
    'show',
    '-s',
    '--format=%s',
    retainedRefCommit,
  ]);
  const finalArtifactCommit =
    retainedSubject === EVIDENCE_MESSAGE
      ? git(projectPath, ['rev-parse', `${retainedRefCommit}^`])
      : retainedRefCommit;
  expect(
    git(projectPath, ['show', '-s', '--format=%s', finalArtifactCommit]),
  ).toBe(FINAL_ARTIFACT_MESSAGE);
  expect(changedPaths(projectPath, finalArtifactCommit)).toEqual([PR_ARTIFACT]);

  const pinSourceCommit = git(projectPath, [
    'rev-parse',
    `${finalArtifactCommit}^`,
  ]);
  const finalArtifact = git(projectPath, [
    'show',
    `${finalArtifactCommit}:${PR_ARTIFACT}`,
  ]);
  expect(finalArtifact.match(/<!-- oat:project-links:start -->/g)).toHaveLength(
    1,
  );
  expect(finalArtifact.match(/<!-- oat:project-links:end -->/g)).toHaveLength(
    1,
  );
  expect(finalArtifact).toContain(pinSourceCommit.slice(0, 7));

  return { finalArtifactCommit, pinSourceCommit };
}

async function commitCompletionRecord(
  repoRoot: string,
  recordPath: string,
): Promise<string> {
  const record = await readSyncedRecord(recordPath);
  expect(record).not.toBeNull();
  const relativeRecordPath = relative(repoRoot, recordPath);

  if (record?.status === 'active') {
    await writeSyncedRecord(recordPath, {
      ...record,
      status: 'complete',
      completedAt: '2026-08-28T12:01:00.000Z',
    });
    git(repoRoot, [
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '--only',
      '-m',
      `chore(oat): complete synced project ${PROJECT_SLUG}`,
      '--',
      relativeRecordPath,
    ]);
  }

  const recordCommit = git(repoRoot, [
    'log',
    '-1',
    '--format=%H',
    '--',
    relativeRecordPath,
  ]);
  expect(changedPaths(repoRoot, recordCommit)).toEqual([relativeRecordPath]);
  expect(
    JSON.parse(
      git(repoRoot, ['show', `${recordCommit}:${relativeRecordPath}`]),
    ),
  ).toMatchObject({
    slug: PROJECT_SLUG,
    ref: `refs/oat/projects/${PROJECT_SLUG}`,
    status: 'complete',
  });
  return recordCommit;
}

async function commitRecapEvidence(
  projectPath: string,
  target: ReturnType<typeof buildSyncTarget>,
  finalArtifactCommit: string,
): Promise<string> {
  const head = git(projectPath, ['rev-parse', 'HEAD']);
  if (head === finalArtifactCommit) {
    await writeFile(
      `${projectPath}/${RECAP_MANIFEST}`,
      `${JSON.stringify({ outcome: 'built-durable', artifactCommit: finalArtifactCommit }, null, 2)}\n`,
      'utf8',
    );
    await writeFile(
      `${projectPath}/${RECAP_BUILD_RECORD}`,
      `${JSON.stringify({ attested: true, artifactCommit: finalArtifactCommit }, null, 2)}\n`,
      'utf8',
    );
    const evidenceReceipt = await pushSynced(target, defaultGitRunner, {
      message: EVIDENCE_MESSAGE,
    });
    expect(evidenceReceipt.status).toBe('pushed');
    expect(evidenceReceipt.sha).toBe(git(projectPath, ['rev-parse', 'HEAD']));
  }

  const evidenceCommit = git(projectPath, ['rev-parse', 'HEAD']);
  expect(git(projectPath, ['show', '-s', '--format=%s', evidenceCommit])).toBe(
    EVIDENCE_MESSAGE,
  );
  expect(git(projectPath, ['rev-parse', `${evidenceCommit}^`])).toBe(
    finalArtifactCommit,
  );
  expect(changedPaths(projectPath, evidenceCommit)).toEqual([
    RECAP_BUILD_RECORD,
    RECAP_MANIFEST,
  ]);
  return evidenceCommit;
}

describe('non-archive synced completion transaction', () => {
  it.each([
    { decision: 'configured decline', recap: false },
    { decision: 'configured decline', recap: true },
    { decision: 'interactive decline', recap: false },
    { decision: 'interactive decline', recap: true },
  ])(
    'publishes the final receipt after $decision with recap=$recap and resumes cleanly',
    async ({ recap }) => {
      const fixture = await createSyncedFixture();
      try {
        const target = buildSyncTarget(
          fixture.cloneA,
          '.oat/projects',
          PROJECT_SLUG,
        );
        await createSyncedProject(target, defaultGitRunner);

        await writeFile(`${target.projectPath}/state.md`, 'complete\n', 'utf8');
        await writeFile(
          `${target.projectPath}/summary.md`,
          '# Durable summary\n',
          'utf8',
        );
        await mkdir(`${target.projectPath}/pr`, { recursive: true });
        await writeFile(
          `${target.projectPath}/${PR_ARTIFACT}`,
          '# Pull request\n\nCompletion body.\n',
          'utf8',
        );
        if (recap) {
          await mkdir(`${target.projectPath}/explainers/project-recap`, {
            recursive: true,
          });
          await writeFile(
            `${target.projectPath}/${RECAP_MANIFEST}`,
            '{"outcome":"built-not-durable"}\n',
            'utf8',
          );
          await writeFile(
            `${target.projectPath}/${RECAP_BUILD_RECORD}`,
            '{"attested":false}\n',
            'utf8',
          );
        }

        const recordPath = `${target.syncedRoot}/${PROJECT_SLUG}.json`;
        await writeSyncedRecord(
          recordPath,
          buildSyncedRecord(PROJECT_SLUG, new Date('2026-08-28T12:00:00Z')),
        );
        await writeFile(`${fixture.cloneA}/unrelated.txt`, 'base\n', 'utf8');
        git(fixture.cloneA, [
          'add',
          relative(fixture.cloneA, recordPath),
          'unrelated.txt',
        ]);
        git(fixture.cloneA, [
          '-c',
          'core.hooksPath=/dev/null',
          'commit',
          '-m',
          'test: seed parent state',
        ]);
        await writeFile(
          `${fixture.cloneA}/unrelated.txt`,
          'staged user change\n',
          'utf8',
        );
        git(fixture.cloneA, ['add', 'unrelated.txt']);
        const unrelatedStage = git(fixture.cloneA, [
          'diff',
          '--cached',
          '--binary',
          '--',
          'unrelated.txt',
        ]);

        await expect(
          publishFinalArtifact(target.projectPath, target),
        ).rejects.toThrow('injected interruption');

        const receipts = recoverFinalArtifactReceipts(
          target.projectPath,
          fixture.originDir,
          target.ref,
        );
        const recordCommit = await commitCompletionRecord(
          fixture.cloneA,
          recordPath,
        );
        const evidenceCommit = recap
          ? await commitRecapEvidence(
              target.projectPath,
              target,
              receipts.finalArtifactCommit,
            )
          : null;

        const retryReceipts = recoverFinalArtifactReceipts(
          target.projectPath,
          fixture.originDir,
          target.ref,
        );
        const retryRecordCommit = await commitCompletionRecord(
          fixture.cloneA,
          recordPath,
        );
        const retryEvidenceCommit = recap
          ? await commitRecapEvidence(
              target.projectPath,
              target,
              receipts.finalArtifactCommit,
            )
          : null;

        expect(retryReceipts).toEqual(receipts);
        expect(retryRecordCommit).toBe(recordCommit);
        expect(retryEvidenceCommit).toBe(evidenceCommit);
        expect(git(target.projectPath, ['status', '--porcelain'])).toBe('');
        expect(
          git(fixture.cloneA, [
            'diff',
            '--cached',
            '--binary',
            '--',
            'unrelated.txt',
          ]),
        ).toBe(unrelatedStage);

        const retainedRefReceipt = git(fixture.originDir, [
          'rev-parse',
          target.ref,
        ]);
        expect(retainedRefReceipt).toBe(
          evidenceCommit ?? receipts.finalArtifactCommit,
        );
        if (evidenceCommit) {
          expect(
            git(target.projectPath, ['rev-parse', `${evidenceCommit}^`]),
          ).toBe(receipts.finalArtifactCommit);
        }
      } finally {
        await fixture.cleanup();
      }
    },
    20_000,
  );
});
