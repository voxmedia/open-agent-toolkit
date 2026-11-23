import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { appendProjectLog } from '@commands/project/log/append';
import { assertOrchestratorCheckout } from '@commands/project/orchestrator/branch';
import {
  resolveNamedProject,
  resolveProjectOrActive,
  type NamedProject,
} from '@commands/project/resolve-named-project';
import type { GitRunner } from '@commands/project/sync/git';
import { isFreestyleState } from '@commands/shared/frontmatter';
import { CliError } from '@errors/cli-error';

import {
  LINKED_PROJECTS_FILENAME,
  readLinkedProjects,
  validatePurpose,
  writeLinkedProjects,
  type LinkedProjectRow,
} from './ledger';

/** The parent's ledger as output names it: beside the parent's own path. */
function ledgerDisplayPath(parent: NamedProject): string {
  return `${parent.projectPath}/${LINKED_PROJECTS_FILENAME}`;
}

/** The structural log entry's producer for an acknowledged link. */
export const LINKED_LOG_PRODUCER = 'oat-project-linked';

async function assertFreestyle(project: NamedProject): Promise<void> {
  const state = await readFile(join(project.absolutePath, 'state.md'), 'utf8');
  if (!isFreestyleState(state)) {
    throw new CliError(
      `Project ${project.name} is not a freestyle project; linked projects join two freestyle projects.`,
      1,
    );
  }
}

/**
 * Resolve the parent a link is written to and refuse unless this checkout is
 * its orchestrator: only the parent's orchestrator writes its
 * `linked-projects.md`.
 */
export async function resolveLinkParent(options: {
  repoRoot: string;
  parent?: string;
  action: string;
  git?: GitRunner;
}): Promise<NamedProject> {
  const parent = await resolveProjectOrActive(options.repoRoot, options.parent);
  await assertFreestyle(parent);
  await assertOrchestratorCheckout({
    projectDir: parent.absolutePath,
    projectName: parent.name,
    repoRoot: options.repoRoot,
    action: options.action,
    git: options.git,
  });
  return parent;
}

/** Refuse a link the parent's ledger cannot take, before anything is written. */
export async function assertLinkable(
  parent: NamedProject,
  childName: string,
): Promise<void> {
  if (childName === parent.name) {
    throw new CliError(`Project ${parent.name} cannot link to itself.`, 1);
  }
  const { ledger } = await readLinkedProjects(parent.absolutePath, parent.name);
  if (ledger.open.some((row) => row.name === childName)) {
    throw new CliError(
      `Project ${parent.name} already has an open link to ${childName}.`,
      1,
    );
  }
}

/** Open a row for `child` in the parent's `linked-projects.md`. */
export async function recordLink(options: {
  parent: NamedProject;
  child: { name: string; path: string; scope: LinkedProjectRow['scope'] };
  purpose: string;
  today: string;
}): Promise<{ row: LinkedProjectRow; ledgerPath: string }> {
  await assertLinkable(options.parent, options.child.name);
  const { ledger } = await readLinkedProjects(
    options.parent.absolutePath,
    options.parent.name,
  );
  const row: LinkedProjectRow = {
    name: options.child.name,
    path: options.child.path,
    scope: options.child.scope,
    purpose: validatePurpose(options.purpose),
    linked: options.today,
  };
  ledger.open.push(row);
  await writeLinkedProjects(options.parent.absolutePath, ledger);
  return { row, ledgerPath: ledgerDisplayPath(options.parent) };
}

/** `oat project linked add`: link an existing freestyle project. */
export async function addLinkedProject(options: {
  repoRoot: string;
  parent?: string;
  child: string;
  purpose: string | undefined;
  today: string;
  git?: GitRunner;
}): Promise<{
  parent: NamedProject;
  row: LinkedProjectRow;
  ledgerPath: string;
}> {
  const purpose = validatePurpose(options.purpose);
  const parent = await resolveLinkParent({
    repoRoot: options.repoRoot,
    parent: options.parent,
    action: `link ${options.child}`,
    git: options.git,
  });
  const child = await resolveNamedProject(options.repoRoot, options.child);
  await assertFreestyle(child);
  const recorded = await recordLink({
    parent,
    child: { name: child.name, path: child.projectPath, scope: child.scope },
    purpose,
    today: options.today,
  });
  return { parent, ...recorded };
}

export type LinkedAckLogResult =
  | { status: 'appended' | 'already-appended'; heading: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; message: string };

/**
 * `oat project linked ack`: close the child's open row, then attempt a
 * structural log entry naming the child as source project. The row closes
 * whether the log appends, is disabled (`skipped`) or fails.
 */
export async function ackLinkedProject(options: {
  repoRoot: string;
  home?: string;
  parent?: string;
  child: string;
  today: string;
  git?: GitRunner;
}): Promise<{
  parent: NamedProject;
  row: LinkedProjectRow;
  ledgerPath: string;
  log: LinkedAckLogResult;
}> {
  const childName = basename(options.child.replace(/\/+$/, ''));
  const parent = await resolveLinkParent({
    repoRoot: options.repoRoot,
    parent: options.parent,
    action: `acknowledge ${childName}`,
    git: options.git,
  });
  const { ledger } = await readLinkedProjects(parent.absolutePath, parent.name);
  const index = ledger.open.findIndex((row) => row.name === childName);
  const open = ledger.open[index];
  if (!open) {
    throw new CliError(
      `Project ${parent.name} has no open link to ${childName}.`,
      1,
    );
  }
  const row: LinkedProjectRow = { ...open, acknowledged: options.today };
  ledger.open.splice(index, 1);
  ledger.closed.push(row);
  await writeLinkedProjects(parent.absolutePath, ledger);

  let log: LinkedAckLogResult;
  try {
    const result = await appendProjectLog({
      repoRoot: options.repoRoot,
      home: options.home,
      project: parent.absolutePath,
      structural: true,
      producer: LINKED_LOG_PRODUCER,
      ref: childName,
      time: true,
      sourceProject: childName,
      body: `Acknowledged linked project ${childName} (${row.purpose}); its row in ${LINKED_PROJECTS_FILENAME} is closed.`,
    });
    log =
      result.status === 'skipped'
        ? { status: 'skipped', reason: result.reason }
        : { status: result.status, heading: result.heading };
  } catch (error) {
    log = {
      status: 'failed',
      message: error instanceof Error ? error.message : String(error),
    };
  }
  return {
    parent,
    row,
    ledgerPath: ledgerDisplayPath(parent),
    log,
  };
}
