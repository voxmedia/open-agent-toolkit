import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateSyncedArchiveTerminalReport } from './finalize-synced-archive.mjs';

function refuse(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function run(cwd, executable, args) {
  try {
    return execFileSync(executable, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    refuse(
      'E_COMPLETION_PREPARE',
      `${executable} ${args[0]} failed: ${error.stderr || error.message}`,
    );
  }
}

function git(cwd, ...args) {
  return run(cwd, 'git', args);
}

function optionalGit(cwd, ...args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

function gitSucceeds(cwd, ...args) {
  try {
    execFileSync('git', args, { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function jsonCommand(cwd, executable, args) {
  const output = run(cwd, executable, args);
  try {
    return JSON.parse(output);
  } catch {
    refuse(
      'E_PR_OBSERVATION',
      `${executable} returned invalid JSON; no completion writes are permitted.`,
    );
  }
}

function assertClean(root) {
  if (git(root, 'status', '--porcelain', '--untracked-files=all')) {
    refuse(
      'E_DIRTY_COMPLETION',
      'Preserve the staged, unstaged and untracked work before preparing the completion branch; nothing was switched or discarded.',
    );
  }
}

/** Read-only live observation. Stored status is deliberately not an input. */
export function observeCompletionPr({ cwd, prUrl }) {
  // `oat project status --shell` represents an absent field as literal null.
  if (!prUrl || prUrl === 'null')
    return {
      originalPrUrl: '',
      observedStatus: '',
      observedAt: '',
      wasOpen: false,
    };
  const pr = jsonCommand(cwd, 'gh', [
    'pr',
    'view',
    prUrl,
    '--json',
    'url,number,state,baseRefName,headRefName,headRefOid',
  ]);
  if (
    pr.url !== prUrl ||
    !Number.isInteger(pr.number) ||
    !['OPEN', 'MERGED', 'CLOSED'].includes(pr.state) ||
    !pr.baseRefName
  ) {
    refuse(
      'E_PR_OBSERVATION',
      'Tracked PR identity/status/base could not be observed; stop before completion writes.',
    );
  }
  git(cwd, 'check-ref-format', `refs/heads/${pr.baseRefName}`);
  return {
    originalPrUrl: pr.url,
    observedStatus: pr.state.toLowerCase(),
    observedAt: new Date().toISOString(),
    wasOpen: pr.state === 'OPEN',
    baseBranch: pr.baseRefName,
    number: pr.number,
    originalHead: pr.headRefOid,
  };
}

/** Validate the archived producer's result on base without requiring merge ancestry. */
function archivedBookkeepingDelivered(
  root,
  projectRelative,
  fetchedBase,
  options,
) {
  const name = projectRelative.split('/').at(-1);
  const receipt = validateSyncedArchiveTerminalReport(
    JSON.parse(options.archiveReceipt),
    name,
  );
  const record = `${projectRelative}.json`;
  const exports = [
    receipt.summaryExportFile,
    receipt.projectRecapExport?.exportRoot,
  ]
    .filter(Boolean)
    .map((path) => {
      const child = relative(root, resolve(root, path)).split(sep).join('/');
      if (
        !child ||
        child === '..' ||
        child.startsWith('../') ||
        isAbsolute(child)
      )
        refuse(
          'E_COMPLETION_RESUME',
          'Archive export is outside this repository; preserve the receipt and recover explicitly.',
        );
      return child;
    });
  const paths = [record, ...exports];
  if (
    gitSucceeds(
      root,
      'cat-file',
      '-e',
      `${receipt.lifecycleCommit}:${record}`,
    ) ||
    exports.some(
      (path) =>
        !gitSucceeds(
          root,
          'cat-file',
          '-e',
          `${receipt.lifecycleCommit}:${path}`,
        ),
    )
  )
    refuse(
      'E_COMPLETION_RESUME',
      'Archive lifecycle commit does not match its retired record and exports; preserve the receipt and recover explicitly.',
    );
  const pendingPaths = git(
    root,
    'diff',
    '--name-only',
    '-z',
    receipt.lifecycleCommit,
    fetchedBase,
    '--',
    ...paths.map((path) => `:(literal)${path}`),
  )
    .split('\0')
    .filter(Boolean);
  if (pendingPaths.length)
    refuse(
      'E_COMPLETION_BOOKKEEPING_PENDING',
      `Archive bookkeeping ${receipt.lifecycleCommit} is not delivered on origin/${options.baseBranch}; pending paths: ${pendingPaths.join(', ')}. Retain the active pointer, archive receipt and current branch; recover delivery explicitly before retrying completion. Do not push the merged original or replay archive.`,
    );
  const current = git(root, 'rev-parse', 'HEAD');
  if (
    current !== receipt.lifecycleCommit &&
    !gitSucceeds(root, 'merge-base', '--is-ancestor', current, fetchedBase)
  )
    refuse(
      'E_DIVERGENT_COMPLETION',
      'Current branch has work beyond the archived lifecycle receipt and updated base; preserve/reconcile it before resuming completion.',
    );
}

/**
 * Only prepares a parent branch. Lifecycle/archive writes, commits, pushes and
 * PR publication retain their existing owners. The local branch config binds
 * retries to this original PR, project, scope and fetched base commit.
 */
export function prepareCompletionBranch(options) {
  const root = git(
    options.cwd ?? process.cwd(),
    'rev-parse',
    '--show-toplevel',
  );
  const observation = observeCompletionPr({ cwd: root, prUrl: options.prUrl });
  const normal = {
    ...observation,
    followup: false,
    archiveDelivered: false,
    branch: '',
    baseHead: '',
    followupPrUrl: '',
    followupPrStatus: '',
  };
  if (observation.observedStatus !== 'merged' || options.action === 'observe')
    return normal;
  // Local artifacts are ignored: no parent-branch bookkeeping can be delivered.
  if (options.scope === 'local') return normal;
  if (options.action !== 'resume' && !options.authority?.trim()) {
    refuse(
      'E_FOLLOWUP_AUTHORITY',
      'A merged PR needs separate bookkeeping delivery authority. Reuse existing explicit authority; PR_ON_COMPLETE alone does not authorize a goal bookkeeping PR.',
    );
  }
  if (!['shared', 'synced', 'local'].includes(options.scope))
    refuse(
      'E_COMPLETION_SCOPE',
      'Resolve project scope before preparing completion.',
    );
  const projectPath = resolve(root, options.projectPath);
  const projectRelative = relative(root, projectPath).split(sep).join('/');
  if (
    !projectRelative ||
    projectRelative.startsWith('../') ||
    isAbsolute(projectRelative)
  )
    refuse(
      'E_COMPLETION_INPUTS',
      'Project must remain in this repository or its retained project checkout.',
    );
  if (options.action !== 'resume')
    readFileSync(resolve(projectPath, 'state.md'));
  assertClean(root);

  // Confirm gh's repository context matches the tracked URL before fetching.
  const repo = jsonCommand(root, 'gh', [
    'repo',
    'view',
    '--json',
    'nameWithOwner',
  ]);
  const url = new URL(observation.originalPrUrl);
  if (url.pathname !== `/${repo.nameWithOwner}/pull/${observation.number}`)
    refuse(
      'E_PR_OBSERVATION',
      'Tracked PR belongs to a different repository; no branch was prepared.',
    );
  const baseBranch = observation.baseBranch;
  git(
    root,
    'fetch',
    'origin',
    `+refs/heads/${baseBranch}:refs/remotes/origin/${baseBranch}`,
  );
  const fetchedBase = git(
    root,
    'rev-parse',
    `refs/remotes/origin/${baseBranch}^{commit}`,
  );
  const identity = {
    originalPrUrl: observation.originalPrUrl,
    projectRelative,
    scope: options.scope,
    baseBranch,
  };
  const suffix = createHash('sha256')
    .update(JSON.stringify(identity))
    .digest('hex')
    .slice(0, 12);
  const branch = `oat/complete-pr-${observation.number}-${suffix}`;
  const configKey = `branch.${branch}.oat-completion`;
  const existing = optionalGit(
    root,
    'show-ref',
    '--verify',
    '--hash',
    `refs/heads/${branch}`,
  );
  let baseHead = fetchedBase;
  if (existing) {
    let receipt;
    try {
      receipt = JSON.parse(git(root, 'config', '--local', '--get', configKey));
    } catch {
      refuse(
        'E_COMPLETION_RESUME',
        `Existing ${branch} lacks a valid preparation binding; preserve it and recover explicitly.`,
      );
    }
    if (
      Object.entries(identity).some(([key, value]) => receipt[key] !== value) ||
      !/^[a-f0-9]{40}$/.test(receipt.baseHead ?? '')
    )
      refuse(
        'E_COMPLETION_RESUME',
        'Existing follow-up binding differs from the original PR/project/scope/base.',
      );
    baseHead = receipt.baseHead;
    git(root, 'merge-base', '--is-ancestor', baseHead, fetchedBase);
    git(root, 'merge-base', '--is-ancestor', baseHead, existing);
    // A resume never moves off another branch carrying unmerged commits.
    const current = git(root, 'rev-parse', 'HEAD');
    if (
      git(root, 'branch', '--show-current') !== branch &&
      !gitSucceeds(root, 'merge-base', '--is-ancestor', current, fetchedBase) &&
      current !== observation.originalHead
    ) {
      refuse(
        'E_DIVERGENT_COMPLETION',
        'Current branch has unmerged work; preserve it before resuming the completion branch.',
      );
    }
  } else {
    if (options.action === 'resume') {
      // A terminal archive completed while OPEN can predate follow-up preparation.
      // An existing binding (even with its branch lost) or a prepared-branch
      // checkout still belongs to the prepared follow-up recovery path.
      if (
        options.scope === 'synced' &&
        options.archivePrStatus === 'open' &&
        options.archiveReceipt &&
        !gitSucceeds(root, 'config', '--local', '--get', configKey) &&
        !git(root, 'branch', '--show-current').startsWith('oat/complete-pr-')
      ) {
        archivedBookkeepingDelivered(root, projectRelative, fetchedBase, {
          ...options,
          baseBranch,
        });
        return { ...normal, archiveDelivered: true, baseHead: fetchedBase };
      }
      refuse(
        'E_COMPLETION_RESUME',
        'No prepared follow-up exists; do not replay archive mutations to create one.',
      );
    }
    const current = git(root, 'rev-parse', 'HEAD');
    // A squash-merged feature head is safe even when it is not an ancestor.
    // Other commits must already be on base; never carry unmerged work across.
    if (
      current !== observation.originalHead &&
      !gitSucceeds(root, 'merge-base', '--is-ancestor', current, fetchedBase)
    )
      refuse(
        'E_DIVERGENT_COMPLETION',
        'Current branch has commits beyond the merged PR and updated base; preserve/reconcile them before completion.',
      );
  }

  // Shared inputs must exist on base. Synced/local inputs stay with their
  // retained owner; switching the parent must not silently replace that owner.
  if (options.action === 'resume') {
    if (git(root, 'branch', '--show-current') !== branch)
      refuse(
        'E_COMPLETION_RESUME',
        'Archive resume must retain its prepared parent branch; recover explicitly before continuing.',
      );
  } else if (options.scope === 'shared') {
    if (
      !gitSucceeds(
        root,
        'cat-file',
        '-e',
        `${fetchedBase}:${projectRelative}/state.md`,
      )
    )
      refuse(
        'E_COMPLETION_INPUTS',
        'Updated base lacks the shared project state; recover project inputs before switching.',
      );
    if (
      !existing &&
      git(
        root,
        'diff',
        '--name-only',
        fetchedBase,
        'HEAD',
        '--',
        projectRelative,
      )
    )
      refuse(
        'E_COMPLETION_INPUTS',
        'Shared project inputs differ from updated base; preserve/reconcile them before switching.',
      );
  } else {
    if (git(root, 'ls-files', '--', projectRelative))
      refuse(
        'E_COMPLETION_INPUTS',
        'Local/synced artifacts unexpectedly belong to the parent index; resolve their owner before switching.',
      );
    if (options.scope === 'synced') {
      const record = `${projectRelative}.json`;
      if (
        !gitSucceeds(root, 'cat-file', '-e', `${fetchedBase}:${record}`) ||
        (!existing &&
          git(root, 'diff', '--name-only', fetchedBase, 'HEAD', '--', record))
      )
        refuse(
          'E_COMPLETION_INPUTS',
          'Synced discovery record is missing or differs on updated base; reconcile it before switching.',
        );
      if (
        realpathSync(git(projectPath, 'rev-parse', '--show-toplevel')) !==
        realpathSync(projectPath)
      )
        refuse(
          'E_COMPLETION_INPUTS',
          'Synced artifacts must have their own retained checkout.',
        );
      assertClean(projectPath);
      const name = projectRelative.split('/').at(-1);
      if (
        git(projectPath, 'rev-parse', 'HEAD') !==
        git(root, 'rev-parse', `refs/oat/projects/${name}^{commit}`)
      )
        refuse(
          'E_COMPLETION_INPUTS',
          'Synced checkout differs from its retained authority; reconcile before switching.',
        );
    }
  }
  // Lookup precedes branch mutation. A failed lookup must not be treated as no PR.
  const prs = jsonCommand(root, 'gh', [
    'pr',
    'list',
    '--head',
    branch,
    '--base',
    baseBranch,
    '--state',
    'all',
    '--json',
    'url,state,headRefName,baseRefName',
  ]);
  if (
    !Array.isArray(prs) ||
    prs.length > 1 ||
    prs.some(
      (pr) =>
        pr.headRefName !== branch ||
        pr.baseRefName !== baseBranch ||
        pr.state !== 'OPEN' ||
        !pr.url,
    )
  )
    refuse(
      'E_COMPLETION_RESUME',
      'Follow-up lookup is ambiguous or already closed/merged; recover without duplicating delivery.',
    );
  if (prs.length && !existing)
    refuse(
      'E_COMPLETION_RESUME',
      'Remote follow-up exists without its local prepared branch; recover that branch instead of starting a second delivery.',
    );
  if (existing) git(root, 'switch', branch);
  else {
    git(root, 'switch', '-c', branch, '--no-track', fetchedBase);
    git(
      root,
      'config',
      '--local',
      configKey,
      JSON.stringify({ ...identity, baseHead }),
    );
  }
  return {
    ...observation,
    followup: true,
    branch,
    baseHead,
    followupPrUrl: prs[0]?.url ?? '',
    followupPrStatus: prs[0] ? 'open' : '',
  };
}

function shellFields(result) {
  const fields = {
    ORIGINAL_PR_URL: result.originalPrUrl,
    OBSERVED_PR_STATUS: result.observedStatus,
    PR_STATUS_OBSERVED_AT: result.observedAt,
    WAS_PR_OPEN_AT_START: String(result.wasOpen),
    COMPLETION_FOLLOWUP: String(result.followup),
    COMPLETION_ARCHIVE_DELIVERED: String(result.archiveDelivered ?? false),
    COMPLETION_BRANCH: result.branch,
    COMPLETION_BASE_HEAD: result.baseHead,
    BASE_BRANCH: result.baseBranch ?? '',
    FOLLOWUP_PR_URL: result.followupPrUrl,
    FOLLOWUP_PR_STATUS: result.followupPrStatus,
  };
  return Object.entries(fields)
    .map(([key, value]) => `${key}='${value.replaceAll("'", "'\\''")}'`)
    .join('\n');
}

function main(argv) {
  const options = { action: 'observe' };
  const names = {
    '--action': 'action',
    '--project-path': 'projectPath',
    '--scope': 'scope',
    '--pr-url': 'prUrl',
    '--authority': 'authority',
    '--archive-receipt': 'archiveReceipt',
    '--archive-pr-status': 'archivePrStatus',
    '--format': 'format',
  };
  for (let i = 0; i < argv.length; i += 2) {
    if (!names[argv[i]] || argv[i + 1] === undefined)
      refuse('E_COMPLETION_ARGUMENT', `Invalid argument ${argv[i]}`);
    options[names[argv[i]]] = argv[i + 1];
  }
  if (
    !['observe', 'prepare', 'resume'].includes(options.action) ||
    !['shell', undefined].includes(options.format)
  )
    refuse(
      'E_COMPLETION_ARGUMENT',
      'Expected observe/prepare/resume action and optional shell format.',
    );
  const result = prepareCompletionBranch(options);
  process.stdout.write(
    `${options.format === 'shell' ? shellFields(result) : JSON.stringify(result)}\n`,
  );
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ code: error.code ?? 'E_COMPLETION_PREPARE', message: error.message })}\n`,
    );
    process.exitCode = 1;
  }
}
