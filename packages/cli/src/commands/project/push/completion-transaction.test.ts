import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const RECOVERY_SCRIPT = fileURLToPath(
  new URL(
    '../../../../../../.agents/skills/oat-project-complete/scripts/recover-completion-receipts.mjs',
    import.meta.url,
  ),
);

interface CompletionReceipts {
  projectLinksPinCommit: string;
  projectRefCommit: string;
  evidenceCommit: string | null;
  evidencePushRequired: boolean;
}

interface CompletionArchiveDecision {
  shouldArchive: boolean;
  source: 'configured' | 'interactive';
}

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
  mutateLinks: (links: string, pinSourceCommit: string) => string = (links) =>
    links,
): Promise<{ finalArtifactCommit: string; pinSourceCommit: string }> {
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
  const rendered = replaceLinksBlock(
    initialBody,
    mutateLinks(finalLinks, pinReceipt.sha),
  );
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

  return {
    finalArtifactCommit: finalReceipt.sha,
    pinSourceCommit: pinReceipt.sha,
  };
}

function resolveArchiveDecision(
  decision: 'configured decline' | 'interactive decline',
): CompletionArchiveDecision {
  const output = execFileSync(
    process.execPath,
    [
      RECOVERY_SCRIPT,
      decision === 'configured decline'
        ? '--archive-preference'
        : '--interactive-archive',
      'false',
    ],
    { encoding: 'utf8' },
  );
  return JSON.parse(output) as CompletionArchiveDecision;
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

async function commitRecapEvidenceLocally(
  projectPath: string,
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
    git(projectPath, ['add', '--', RECAP_MANIFEST, RECAP_BUILD_RECORD]);
    git(projectPath, [
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '--only',
      '-m',
      EVIDENCE_MESSAGE,
      '--',
      RECAP_MANIFEST,
      RECAP_BUILD_RECORD,
    ]);
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

async function recover(
  projectPath: string,
  ref: string,
): Promise<CompletionReceipts> {
  const output = execFileSync(
    process.execPath,
    [
      RECOVERY_SCRIPT,
      '--project-path',
      projectPath,
      '--retained-ref',
      ref,
      '--pr-artifact',
      PR_ARTIFACT,
      '--evidence-path',
      RECAP_MANIFEST,
      '--evidence-path',
      RECAP_BUILD_RECORD,
    ],
    { encoding: 'utf8' },
  );
  return JSON.parse(output) as CompletionReceipts;
}

const interruptionStages = [
  'after final-artifact push',
  'after parent-record commit',
  'after evidence commit before push',
  'after evidence push',
] as const;

describe('non-archive synced completion transaction', () => {
  it.each([
    ...interruptionStages.map((interruption) => ({
      decision: 'configured decline' as const,
      interruption,
    })),
    ...interruptionStages.map((interruption) => ({
      decision: 'interactive decline' as const,
      interruption,
    })),
  ])(
    'recovers exact recap receipts after $decision interrupted $interruption',
    async ({ decision, interruption }) => {
      const fixture = await createSyncedFixture();
      try {
        const archiveDecision = resolveArchiveDecision(decision);
        expect(archiveDecision).toEqual({
          shouldArchive: false,
          source:
            decision === 'configured decline' ? 'configured' : 'interactive',
        });
        if (archiveDecision.shouldArchive) {
          throw new Error('Non-archive transaction selected archive behavior.');
        }

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

        const publishedReceipts = await publishFinalArtifact(
          target.projectPath,
          target,
        );
        let recordCommit: string | null = null;
        let evidenceCommit: string | null = null;

        if (interruption !== 'after final-artifact push') {
          recordCommit = await commitCompletionRecord(
            fixture.cloneA,
            recordPath,
          );
        }
        if (
          interruption === 'after evidence commit before push' ||
          interruption === 'after evidence push'
        ) {
          evidenceCommit = await commitRecapEvidenceLocally(
            target.projectPath,
            publishedReceipts.finalArtifactCommit,
          );
        }
        if (interruption === 'after evidence push') {
          const evidencePush = await pushSynced(target, defaultGitRunner);
          expect(evidencePush).toMatchObject({
            status: 'pushed',
            sha: evidenceCommit,
          });
        }

        const recovered = await recover(target.projectPath, target.ref);
        expect(recovered.projectLinksPinCommit).toBe(
          publishedReceipts.pinSourceCommit,
        );
        expect(recovered.projectRefCommit).toBe(
          publishedReceipts.finalArtifactCommit,
        );

        recordCommit ??= await commitCompletionRecord(
          fixture.cloneA,
          recordPath,
        );
        evidenceCommit ??= await commitRecapEvidenceLocally(
          target.projectPath,
          recovered.projectRefCommit,
        );
        if (recovered.evidencePushRequired) {
          const evidencePush = await pushSynced(target, defaultGitRunner);
          expect(evidencePush).toMatchObject({
            status: 'pushed',
            sha: evidenceCommit,
          });
        } else if (recovered.evidenceCommit === null) {
          const evidencePush = await pushSynced(target, defaultGitRunner);
          expect(evidencePush).toMatchObject({
            status: 'pushed',
            sha: evidenceCommit,
          });
        }

        const retryReceipts = await recover(target.projectPath, target.ref);
        const retryRecordCommit = await commitCompletionRecord(
          fixture.cloneA,
          recordPath,
        );
        const retryEvidenceCommit = await commitRecapEvidenceLocally(
          target.projectPath,
          retryReceipts.projectRefCommit,
        );

        expect(retryReceipts).toMatchObject({
          projectLinksPinCommit: publishedReceipts.pinSourceCommit,
          projectRefCommit: publishedReceipts.finalArtifactCommit,
          evidenceCommit,
          evidencePushRequired: false,
        });
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
        expect(retainedRefReceipt).toBe(evidenceCommit);
        expect(
          git(target.projectPath, ['rev-parse', `${evidenceCommit}^`]),
        ).toBe(publishedReceipts.finalArtifactCommit);
        expect(changedPaths(target.projectPath, evidenceCommit)).toEqual([
          RECAP_BUILD_RECORD,
          RECAP_MANIFEST,
        ]);
      } finally {
        await fixture.cleanup();
      }
    },
    20_000,
  );

  it('fails closed when a recap evidence candidate changes an extra path', async () => {
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
      await mkdir(`${target.projectPath}/explainers/project-recap`, {
        recursive: true,
      });
      await writeFile(
        `${target.projectPath}/${PR_ARTIFACT}`,
        '# Pull request\n\nCompletion body.\n',
        'utf8',
      );
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
      const receipts = await publishFinalArtifact(target.projectPath, target);

      await writeFile(
        `${target.projectPath}/${RECAP_MANIFEST}`,
        `${JSON.stringify({ outcome: 'built-durable', artifactCommit: receipts.finalArtifactCommit }, null, 2)}\n`,
        'utf8',
      );
      await writeFile(
        `${target.projectPath}/${RECAP_BUILD_RECORD}`,
        `${JSON.stringify({ attested: true, artifactCommit: receipts.finalArtifactCommit }, null, 2)}\n`,
        'utf8',
      );
      await writeFile(
        `${target.projectPath}/unexpected.txt`,
        'contamination\n',
      );
      git(target.projectPath, [
        'add',
        '--',
        RECAP_MANIFEST,
        RECAP_BUILD_RECORD,
        'unexpected.txt',
      ]);
      git(target.projectPath, [
        '-c',
        'core.hooksPath=/dev/null',
        'commit',
        '-m',
        EVIDENCE_MESSAGE,
      ]);

      await expect(recover(target.projectPath, target.ref)).rejects.toThrow(
        /changed.*expected exactly/i,
      );
      expect(git(fixture.originDir, ['rev-parse', target.ref])).toBe(
        receipts.finalArtifactCommit,
      );
      expect(git(target.projectPath, ['rev-parse', 'HEAD'])).not.toBe(
        receipts.finalArtifactCommit,
      );
    } finally {
      await fixture.cleanup();
    }
  });

  it.each([
    {
      contamination: 'wrong retained project ref',
      mutateLinks: (links: string) =>
        links.replace(
          `refs/oat/projects/${PROJECT_SLUG}`,
          'refs/oat/projects/another-project',
        ),
      error: /must name retained ref/i,
    },
    {
      contamination: 'wrong full blob-link SHA',
      mutateLinks: (links: string, pinSourceCommit: string) => {
        const replacement = `${pinSourceCommit.slice(0, 39)}${pinSourceCommit.endsWith('0') ? '1' : '0'}`;
        return links.replaceAll(
          `/blob/${pinSourceCommit}/`,
          `/blob/${replacement}/`,
        );
      },
      error: /blob links must use pin-source commit/i,
    },
  ])(
    'fails closed before restoring receipts for a $contamination',
    async ({ mutateLinks, error }) => {
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

        const receipts = await publishFinalArtifact(
          target.projectPath,
          target,
          mutateLinks,
        );
        const finalArtifact = git(target.projectPath, [
          'show',
          `${receipts.finalArtifactCommit}:${PR_ARTIFACT}`,
        ]);
        expect(finalArtifact).toContain(
          `@ \`${receipts.pinSourceCommit.slice(0, 7)}\``,
        );

        await expect(recover(target.projectPath, target.ref)).rejects.toThrow(
          error,
        );
        expect(git(target.projectPath, ['rev-parse', 'HEAD'])).toBe(
          receipts.finalArtifactCommit,
        );
        expect(git(target.projectPath, ['rev-parse', target.ref])).toBe(
          receipts.finalArtifactCommit,
        );
        expect(git(fixture.originDir, ['rev-parse', target.ref])).toBe(
          receipts.finalArtifactCommit,
        );
        expect(git(target.projectPath, ['status', '--porcelain'])).toBe('');
      } finally {
        await fixture.cleanup();
      }
    },
    20_000,
  );
});
