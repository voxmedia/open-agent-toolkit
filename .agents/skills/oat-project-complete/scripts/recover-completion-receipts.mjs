import { execFile } from 'node:child_process';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PIN_SOURCE_MESSAGE = 'chore(oat): finalize project lifecycle';
const FINAL_ARTIFACT_MESSAGE = 'chore(oat): publish final project links';
const EVIDENCE_MESSAGE = 'chore(oat): attest final project recap';
const LINKS_START = '<!-- oat:project-links:start -->';
const LINKS_END = '<!-- oat:project-links:end -->';
const FULL_SHA = /^[0-9a-f]{40}$/;

function completionReceiptError(message) {
  const error = new Error(message);
  error.code = 'E_COMPLETION_RECEIPTS';
  return error;
}

function requireRelativeGitPath(value, label) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.startsWith('/') ||
    value.startsWith('-') ||
    value.includes('\\') ||
    value.includes(':') ||
    value
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..')
  ) {
    throw completionReceiptError(
      `${label} must be a normalized relative Git path.`,
    );
  }
  return value;
}

async function git(projectPath, args, options = {}) {
  try {
    const result = await execFileAsync('git', args, {
      cwd: projectPath,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return result.stdout.trim();
  } catch (error) {
    if (options.allowFailure) return null;
    const detail = error?.stderr?.trim() || error?.message || String(error);
    throw completionReceiptError(
      `git ${args[0] ?? 'command'} failed while recovering completion receipts: ${detail}`,
    );
  }
}

async function commitSubject(projectPath, commit) {
  return git(projectPath, ['show', '-s', '--format=%s', commit]);
}

async function singleParent(projectPath, commit, label) {
  const line = await git(projectPath, [
    'rev-list',
    '--parents',
    '-n',
    '1',
    commit,
  ]);
  const parts = line.split(/\s+/);
  if (
    parts.length !== 2 ||
    parts[0] !== commit ||
    !FULL_SHA.test(parts[1] ?? '')
  ) {
    throw completionReceiptError(`${label} must have exactly one parent.`);
  }
  return parts[1];
}

async function changedPaths(projectPath, commit) {
  const output = await git(projectPath, [
    'diff-tree',
    '--no-commit-id',
    '--name-only',
    '-r',
    commit,
  ]);
  return output === '' ? [] : output.split('\n').sort();
}

function requireExactPaths(actual, expected, label) {
  const normalizedExpected = [...expected].sort();
  if (
    actual.length !== normalizedExpected.length ||
    actual.some((path, index) => path !== normalizedExpected[index])
  ) {
    throw completionReceiptError(
      `${label} changed ${JSON.stringify(actual)}; expected exactly ${JSON.stringify(normalizedExpected)}.`,
    );
  }
}

async function retainedRemoteCommit(projectPath, remote, retainedRef) {
  const output = await git(projectPath, [
    'ls-remote',
    '--refs',
    remote,
    retainedRef,
  ]);
  const lines = output === '' ? [] : output.split('\n');
  if (lines.length !== 1) {
    throw completionReceiptError(
      `Retained remote ref ${retainedRef} must resolve exactly once on ${remote}.`,
    );
  }
  const [sha, resolvedRef, ...extra] = lines[0].split(/\s+/);
  if (
    !FULL_SHA.test(sha ?? '') ||
    resolvedRef !== retainedRef ||
    extra.length > 0
  ) {
    throw completionReceiptError(
      `Retained remote ref ${retainedRef} returned a malformed receipt.`,
    );
  }
  return sha;
}

function parseGitHubRepository(url) {
  const scp = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url);
  if (scp) return `${scp[1]}/${scp[2]}`;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') return null;
    const parts = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return `${parts[0]}/${parts[1].replace(/\.git$/, '')}`;
  } catch {
    return null;
  }
}

function requireSingleLinksBlock(
  content,
  retainedRef,
  pinSourceCommit,
  expectedSlug,
  expectedRepository,
) {
  const starts = content.split(LINKS_START).length - 1;
  const ends = content.split(LINKS_END).length - 1;
  const start = content.indexOf(LINKS_START);
  const end = content.indexOf(LINKS_END);
  if (starts !== 1 || ends !== 1 || start < 0 || end <= start) {
    throw completionReceiptError(
      'Final PR artifact must contain exactly one well-ordered project links block.',
    );
  }
  const block = content.slice(start, end + LINKS_END.length);
  const headerMarkers = block.split('**OAT project**').length - 1;
  const header = block
    .split('\n')
    .find((line) => line.includes('**OAT project**'));
  const headerMatch =
    /^\*\*OAT project\*\* `([A-Za-z0-9._-]+)` \(synced\) — pinned to `([^`]+)` @ `([0-9a-f]{7})` \(([^)\r\n]+)\)$/.exec(
      header ?? '',
    );
  if (headerMarkers !== 1 || !headerMatch) {
    throw completionReceiptError(
      'Final PR artifact must contain exactly one canonical project links header.',
    );
  }
  if (headerMatch[1] !== expectedSlug) {
    throw completionReceiptError(
      `Final PR artifact links header must name project ${expectedSlug}.`,
    );
  }
  if (headerMatch[2] !== retainedRef) {
    throw completionReceiptError(
      `Final PR artifact links header must name retained ref ${retainedRef}.`,
    );
  }
  if (headerMatch[3] !== pinSourceCommit.slice(0, 7)) {
    throw completionReceiptError(
      `Final PR artifact links block must be pinned to ${pinSourceCommit}.`,
    );
  }

  const blobMarkers = block.split('/blob/').length - 1;
  const blobLinks = [
    ...block.matchAll(
      /https:\/\/github\.com\/([^/\s)]+)\/([^/\s)]+)\/blob\/([^/\s)]+)\//g,
    ),
  ];
  const blobPins = blobLinks.map((match) => match[3]);
  if (blobPins.length !== blobMarkers) {
    throw completionReceiptError(
      'Final PR artifact links block contains a malformed blob URL.',
    );
  }
  if (
    blobPins.some(
      (commit) => !FULL_SHA.test(commit ?? '') || commit !== pinSourceCommit,
    )
  ) {
    throw completionReceiptError(
      `Final PR artifact blob links must use pin-source commit ${pinSourceCommit}.`,
    );
  }
  if (blobLinks.length > 0) {
    if (expectedRepository === null) {
      throw completionReceiptError(
        'Final PR artifact must not contain GitHub blob links for a non-GitHub project remote.',
      );
    }
    if (
      blobLinks.some(
        (match) => `${match[1]}/${match[2]}` !== expectedRepository,
      )
    ) {
      throw completionReceiptError(
        `Final PR artifact blob links must name repository ${expectedRepository}.`,
      );
    }
  }
}

export function resolveCompletionArchiveDecision({
  configuredPreference,
  interactiveAnswer,
}) {
  if (typeof configuredPreference === 'boolean') {
    return { shouldArchive: configuredPreference, source: 'configured' };
  }
  if (configuredPreference !== undefined && configuredPreference !== null) {
    throw completionReceiptError(
      'Configured archive preference must be true, false, or unset.',
    );
  }
  if (typeof interactiveAnswer === 'boolean') {
    return { shouldArchive: interactiveAnswer, source: 'interactive' };
  }
  throw completionReceiptError(
    'An unset archive preference requires an explicit interactive answer.',
  );
}

export async function detectCompletionReceiptCandidate({
  projectPath,
  retainedRef,
}) {
  if (typeof projectPath !== 'string' || projectPath.length === 0) {
    throw completionReceiptError('Project path is required.');
  }
  if (
    typeof retainedRef !== 'string' ||
    !/^refs\/oat\/projects\/[A-Za-z0-9._-]+$/.test(retainedRef)
  ) {
    throw completionReceiptError(
      'Retained ref must be a canonical OAT project ref.',
    );
  }
  const receiptSubjects = new Set([FINAL_ARTIFACT_MESSAGE, EVIDENCE_MESSAGE]);
  const head = await git(projectPath, ['rev-parse', 'HEAD']);
  const retained = await git(
    projectPath,
    ['rev-parse', '--verify', retainedRef],
    { allowFailure: true },
  );
  const headSubject = await commitSubject(projectPath, head);
  const retainedSubject = FULL_SHA.test(retained ?? '')
    ? await commitSubject(projectPath, retained)
    : null;
  const candidate =
    receiptSubjects.has(headSubject) ||
    (retainedSubject !== null && receiptSubjects.has(retainedSubject));
  if (candidate) {
    const status = await git(projectPath, [
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
    ]);
    if (status !== '') {
      throw completionReceiptError(
        'Recognized completion receipt candidate requires a clean synced checkout.',
      );
    }
  }
  return { status: candidate ? 'candidate' : 'none', candidate };
}

export async function recoverCompletionReceipts({
  projectPath,
  retainedRef,
  prArtifactPath,
  evidencePaths = [],
  remote = 'origin',
}) {
  if (typeof projectPath !== 'string' || projectPath.length === 0) {
    throw completionReceiptError('Project path is required.');
  }
  if (
    typeof retainedRef !== 'string' ||
    !/^refs\/oat\/projects\/[A-Za-z0-9._-]+$/.test(retainedRef)
  ) {
    throw completionReceiptError(
      'Retained ref must be a canonical OAT project ref.',
    );
  }
  const finalArtifactPath = requireRelativeGitPath(
    prArtifactPath,
    'PR artifact path',
  );
  const expectedSlug = retainedRef.slice('refs/oat/projects/'.length);
  if (basename(projectPath) !== expectedSlug) {
    throw completionReceiptError(
      `Project checkout basename must match retained project ${expectedSlug}.`,
    );
  }
  const exactEvidencePaths = evidencePaths.map((path, index) =>
    requireRelativeGitPath(path, `Evidence path ${index + 1}`),
  );
  if (new Set(exactEvidencePaths).size !== exactEvidencePaths.length) {
    throw completionReceiptError('Evidence paths must be unique.');
  }

  const status = await git(projectPath, [
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
  ]);
  if (status !== '') {
    throw completionReceiptError(
      'Synced project checkout must be clean before receipt recovery.',
    );
  }
  const localCommit = await git(projectPath, ['rev-parse', 'HEAD']);
  const localRetainedRefCommit = await git(
    projectPath,
    ['rev-parse', '--verify', retainedRef],
    { allowFailure: true },
  );
  if (!FULL_SHA.test(localRetainedRefCommit ?? '')) {
    throw completionReceiptError(
      `Synced project checkout must retain the local ref ${retainedRef}.`,
    );
  }

  const remoteCommit = await retainedRemoteCommit(
    projectPath,
    remote,
    retainedRef,
  );
  const remoteUrl = await git(projectPath, [
    'config',
    '--get',
    `remote.${remote}.url`,
  ]);
  const expectedRepository = parseGitHubRepository(remoteUrl);
  const localSubject = await commitSubject(projectPath, localCommit);

  let finalArtifactCommit;
  let evidenceCommit = null;
  let evidencePushRequired = false;

  if (localSubject === FINAL_ARTIFACT_MESSAGE) {
    if (
      localCommit !== remoteCommit ||
      localRetainedRefCommit !== localCommit
    ) {
      throw completionReceiptError(
        'Final-artifact receipt recovery requires equal checkout, local retained ref, and remote retained ref commits.',
      );
    }
    finalArtifactCommit = localCommit;
  } else if (localSubject === EVIDENCE_MESSAGE) {
    if (exactEvidencePaths.length === 0) {
      throw completionReceiptError(
        'Recap-evidence receipt recovery requires exact evidence paths.',
      );
    }
    evidenceCommit = localCommit;
    requireExactPaths(
      await changedPaths(projectPath, evidenceCommit),
      exactEvidencePaths,
      'Recap evidence commit',
    );
    finalArtifactCommit = await singleParent(
      projectPath,
      evidenceCommit,
      'Recap evidence commit',
    );
    if (remoteCommit === finalArtifactCommit) {
      if (localRetainedRefCommit !== finalArtifactCommit) {
        throw completionReceiptError(
          'Unpublished recap evidence requires the local retained ref to remain at the final-artifact parent.',
        );
      }
      evidencePushRequired = true;
    } else if (remoteCommit === evidenceCommit) {
      if (localRetainedRefCommit !== evidenceCommit) {
        throw completionReceiptError(
          'Published recap evidence requires equal local and remote retained refs.',
        );
      }
    } else {
      throw completionReceiptError(
        'Recap-evidence recovery requires the remote retained ref to equal either the evidence commit or its final-artifact parent.',
      );
    }
  } else {
    throw completionReceiptError(
      `HEAD subject ${JSON.stringify(localSubject)} is not an exact completion receipt.`,
    );
  }

  if (
    (await commitSubject(projectPath, finalArtifactCommit)) !==
    FINAL_ARTIFACT_MESSAGE
  ) {
    throw completionReceiptError(
      'Recovered final-artifact receipt has an unexpected commit subject.',
    );
  }
  requireExactPaths(
    await changedPaths(projectPath, finalArtifactCommit),
    [finalArtifactPath],
    'Final-artifact commit',
  );
  const projectLinksPinCommit = await singleParent(
    projectPath,
    finalArtifactCommit,
    'Final-artifact commit',
  );
  if (
    (await commitSubject(projectPath, projectLinksPinCommit)) !==
    PIN_SOURCE_MESSAGE
  ) {
    throw completionReceiptError(
      'Recovered pin-source receipt has an unexpected commit subject.',
    );
  }
  const finalArtifact = await git(projectPath, [
    'show',
    `${finalArtifactCommit}:${finalArtifactPath}`,
  ]);
  requireSingleLinksBlock(
    finalArtifact,
    retainedRef,
    projectLinksPinCommit,
    expectedSlug,
    expectedRepository,
  );

  return {
    status: 'recovered',
    retainedRef,
    localCommit,
    remoteCommit,
    projectLinksPinCommit,
    projectRefCommit: finalArtifactCommit,
    evidenceCommit,
    evidencePushRequired,
  };
}

function parseBoolean(value, label) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw completionReceiptError(`${label} must be true or false.`);
}

function parseArguments(argv) {
  const result = { evidencePaths: [] };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined) {
      throw completionReceiptError(`Missing value for ${flag ?? 'argument'}.`);
    }
    if (flag === '--project-path') result.projectPath = value;
    else if (flag === '--retained-ref') result.retainedRef = value;
    else if (flag === '--pr-artifact') result.prArtifactPath = value;
    else if (flag === '--evidence-path') result.evidencePaths.push(value);
    else if (flag === '--remote') result.remote = value;
    else if (flag === '--detect-candidate') {
      result.detectCandidate = parseBoolean(value, flag);
    } else if (flag === '--archive-preference') {
      result.configuredPreference = parseBoolean(value, flag);
    } else if (flag === '--interactive-archive') {
      result.interactiveAnswer = parseBoolean(value, flag);
    } else {
      throw completionReceiptError(`Unsupported argument: ${flag}.`);
    }
  }
  return result;
}

async function main(argv) {
  const options = parseArguments(argv);
  if (
    options.configuredPreference !== undefined ||
    options.interactiveAnswer !== undefined
  ) {
    return resolveCompletionArchiveDecision(options);
  }
  if (options.detectCandidate === true) {
    return detectCompletionReceiptCandidate(options);
  }
  return recoverCompletionReceipts(options);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    })
    .catch((error) => {
      process.stderr.write(
        `${JSON.stringify({ ok: false, code: error.code, message: error.message })}\n`,
      );
      process.exitCode = 1;
    });
}
