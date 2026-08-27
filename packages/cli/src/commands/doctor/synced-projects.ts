import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  readSyncedRecord,
  type SyncedProjectRecord,
} from '@commands/project/sync/record';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { resolveScopeRoot } from '@commands/shared/project-scope';
import type { DoctorCheck } from '@ui/output';

interface SyncedDoctorDependencies {
  git: GitRunner;
  resolveProjectsRoot: typeof resolveProjectsRoot;
  env: NodeJS.ProcessEnv;
}

const DEFAULT_DEPENDENCIES: SyncedDoctorDependencies = {
  git: defaultGitRunner,
  resolveProjectsRoot,
  env: process.env,
};

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function repoRelative(repoRoot: string, path: string): string {
  return relative(resolve(repoRoot), resolve(path)).split(sep).join('/');
}

function check(
  slug: string,
  kind: string,
  status: DoctorCheck['status'],
  message: string,
  fix?: string,
): DoctorCheck {
  return {
    name: `project:synced_${slug}_${kind}`,
    description: `Synced project ${slug}: ${kind.replaceAll('_', ' ')}`,
    status,
    message,
    ...(fix ? { fix } : {}),
  };
}

async function recordEntries(syncedRoot: string): Promise<string[]> {
  try {
    return (await readdir(syncedRoot, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => join(syncedRoot, entry.name))
      .sort();
  } catch {
    return [];
  }
}

async function editorHint(repoRoot: string): Promise<DoctorCheck | null> {
  for (const editorDirectory of ['.vscode', '.cursor']) {
    const directory = join(repoRoot, editorDirectory);
    if (!(await pathExists(directory))) continue;
    let settings: Record<string, unknown> = {};
    try {
      settings = JSON.parse(
        await readFile(join(directory, 'settings.json'), 'utf8'),
      ) as Record<string, unknown>;
    } catch {
      // Missing or non-JSON settings still receive the non-blocking hint.
    }
    if (!('git.scanRepositories' in settings)) {
      return {
        name: 'project:synced_editor_hint',
        description: 'Nested synced-project repository discovery',
        status: 'pass',
        message: `${editorDirectory} can set git.scanRepositories to include nested synced project checkouts.`,
      };
    }
  }
  return null;
}

export async function checkSyncedProjects(
  repoRoot: string,
  overrides: Partial<SyncedDoctorDependencies> = {},
): Promise<DoctorCheck[]> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const projectsRoot = await dependencies.resolveProjectsRoot(
    repoRoot,
    dependencies.env,
  );
  const syncedRoot = resolveScopeRoot(repoRoot, projectsRoot, 'synced');
  const syncedRelative = repoRelative(repoRoot, syncedRoot);
  const checks: DoctorCheck[] = [];
  const tracked = await dependencies.git.run(
    ['ls-files', '--', syncedRelative],
    { cwd: repoRoot, allowFailure: true },
  );
  const missingRepository =
    tracked.code !== 0 &&
    /not a git repository/i.test(`${tracked.stderr}\n${tracked.stdout}`);
  if (tracked.code !== 0 && !missingRepository) {
    checks.push({
      name: 'project:synced_tracked_artifacts',
      description: 'Synced artifacts excluded from the parent branch',
      status: 'fail',
      message: `Unable to inspect tracked synced artifacts: ${tracked.stderr || tracked.stdout || `git ls-files exited ${tracked.code}`}.`,
      fix: 'Resolve the Git error, then rerun `oat doctor --scope project`.',
    });
  } else if (tracked.code === 0 && tracked.stdout.trim()) {
    checks.push({
      name: 'project:synced_tracked_artifacts',
      description: 'Synced artifacts excluded from the parent branch',
      status: 'fail',
      message: `Tracked synced artifact files: ${tracked.stdout.split('\n').join(', ')}`,
      fix: 'Run `oat project migrate` or remove them with `git rm --cached`.',
    });
  }

  const entries = (await pathExists(syncedRoot))
    ? await recordEntries(syncedRoot)
    : [];
  if (entries.length === 0 && checks.length === 0) {
    return [
      {
        name: 'project:synced_projects',
        description: 'Synced project health',
        status: 'pass',
        message: 'No synced projects found.',
      },
    ];
  }

  const records: SyncedProjectRecord[] = [];
  for (const entry of entries) {
    const slug = entry.slice(entry.lastIndexOf('/') + 1, -'.json'.length);
    try {
      const record = await readSyncedRecord(entry);
      if (record) records.push(record);
    } catch (error) {
      checks.push(
        check(
          slug,
          'record_schema',
          'fail',
          error instanceof Error ? error.message : String(error),
          'Upgrade the OAT CLI before reading this synced project record.',
        ),
      );
    }
  }

  for (const record of records) {
    const checkoutPath = join(syncedRoot, record.slug);
    const checkoutExists = await pathExists(checkoutPath);
    if (!checkoutExists) {
      checks.push(
        check(
          record.slug,
          'checkout',
          'warn',
          `Synced project ${record.slug} checkout is absent.`,
          `Run \`oat project pull ${record.slug}\`.`,
        ),
      );
    } else {
      const status = await dependencies.git.run(['status', '--porcelain'], {
        cwd: checkoutPath,
        allowFailure: true,
      });
      if (status.code === 0 && status.stdout.trim()) {
        checks.push(
          check(
            record.slug,
            'working_tree',
            'warn',
            `Synced project ${record.slug} has uncommitted changes.`,
            `Run \`oat project push ${record.slug}\`.`,
          ),
        );
      }
    }

    const [local, remote] = await Promise.all([
      dependencies.git.run(['show-ref', '--hash', record.ref], {
        cwd: repoRoot,
        allowFailure: true,
      }),
      dependencies.git.run(['ls-remote', record.remote, record.ref], {
        cwd: repoRoot,
        allowFailure: true,
      }),
    ]);
    if (remote.code !== 0) {
      checks.push(
        check(
          record.slug,
          'remote_ref',
          'pass',
          `Remote comparison skipped: ${remote.stderr || remote.stdout || 'offline'}.`,
        ),
      );
    } else {
      const remoteSha = remote.stdout.trim().split(/\s+/)[0] ?? '';
      const localSha = local.stdout.trim();
      if (localSha && remoteSha && localSha !== remoteSha) {
        checks.push(
          check(
            record.slug,
            'ref_sync',
            'warn',
            `Local ref for ${record.slug} differs from origin.`,
            `Run \`oat project pull ${record.slug}\` or \`oat project push ${record.slug}\`.`,
          ),
        );
      }
    }
  }

  const ignored = await dependencies.git.run(
    ['check-ignore', '-q', join(syncedRoot, records[0]?.slug ?? '__probe__')],
    { cwd: repoRoot, allowFailure: true },
  );
  if (ignored.code === 1) {
    checks.push({
      name: 'project:synced_gitignore',
      description: 'Managed synced-project gitignore rule',
      status: 'warn',
      message:
        'The managed gitignore block does not ignore synced project directories.',
      fix: 'Run `oat tools update`.',
    });
  }

  const hint = await editorHint(repoRoot);
  if (hint) checks.push(hint);
  return checks.length > 0
    ? checks
    : [
        {
          name: 'project:synced_projects',
          description: 'Synced project health',
          status: 'pass',
          message: `Checked ${records.length} synced project(s).`,
        },
      ];
}
