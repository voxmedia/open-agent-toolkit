export const SOURCE_BACKLINK_CONTRACT_VERSION =
  'explainer-kit.source-backlinks/v1';

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const REVISION_PATTERN = /^[a-f0-9]{40}$/;
const LINE_FRAGMENT_PATTERN = /^L([1-9][0-9]*)(?:-L([1-9][0-9]*))?$/;

export function canonicalGithubBlobBacklink(tuple) {
  const normalized = normalizeBacklinkTuple(tuple);
  const encodedPath = normalized.path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const fragment =
    normalized.lineRange.start === normalized.lineRange.end
      ? `L${normalized.lineRange.start}`
      : `L${normalized.lineRange.start}-L${normalized.lineRange.end}`;
  return `https://github.com/${normalized.repository}/blob/${normalized.revision}/${encodedPath}#${fragment}`;
}

export function validateCanonicalGithubBlobTuple(tuple) {
  try {
    const normalized = normalizeBacklinkTuple(tuple);
    if (
      typeof tuple?.url !== 'string' ||
      tuple.url !== canonicalGithubBlobBacklink(normalized)
    ) {
      return false;
    }
    return sameTuple(parseCanonicalGithubBlobUrl(tuple.url), {
      ...normalized,
      url: tuple.url,
    });
  } catch {
    return false;
  }
}

export function parseCanonicalGithubBlobUrl(value) {
  if (typeof value !== 'string') {
    throw backlinkError('GitHub backlink URL must be a string.');
  }
  if (
    !value.startsWith('https://github.com/') ||
    value.includes('?') ||
    value.includes('\\')
  ) {
    throw backlinkError(
      'GitHub backlink must use canonical credential-free HTTPS without query.',
    );
  }
  const hashIndex = value.indexOf('#');
  if (hashIndex < 0 || value.indexOf('#', hashIndex + 1) >= 0) {
    throw backlinkError(
      'GitHub backlink requires one canonical line fragment.',
    );
  }
  const rawPath = value.slice('https://github.com/'.length, hashIndex);
  const fragment = value.slice(hashIndex + 1);
  const rawSegments = rawPath.split('/');
  if (
    rawSegments.length < 5 ||
    rawSegments.some((segment) => segment.length === 0)
  ) {
    throw backlinkError('GitHub backlink path contains an empty segment.');
  }
  const [owner, repositoryName, blob, revision, ...rawFileSegments] =
    rawSegments;
  if (
    blob !== 'blob' ||
    !REPOSITORY_PATTERN.test(`${owner}/${repositoryName}`) ||
    !REVISION_PATTERN.test(revision)
  ) {
    throw backlinkError(
      'GitHub backlink requires a canonical repository and full commit SHA.',
    );
  }
  const fileSegments = rawFileSegments.map(decodeCanonicalSegment);
  const lineMatch = fragment.match(LINE_FRAGMENT_PATTERN);
  if (!lineMatch) {
    throw backlinkError('GitHub backlink requires a canonical line range.');
  }
  const start = Number(lineMatch[1]);
  const end = Number(lineMatch[2] ?? lineMatch[1]);
  if (end < start) {
    throw backlinkError('GitHub backlink line range is reversed.');
  }
  const tuple = {
    repository: `${owner}/${repositoryName}`,
    revision,
    path: fileSegments.join('/'),
    lineRange: { start, end },
  };
  const canonical = canonicalGithubBlobBacklink(tuple);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw backlinkError('GitHub backlink URL is malformed.');
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== 'github.com' ||
    parsed.port ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.href !== canonical ||
    value !== canonical
  ) {
    throw backlinkError('GitHub backlink URL is not canonical.');
  }
  return { ...tuple, url: canonical };
}

function normalizeBacklinkTuple(tuple) {
  if (
    !tuple ||
    typeof tuple !== 'object' ||
    !REPOSITORY_PATTERN.test(tuple.repository ?? '') ||
    !REVISION_PATTERN.test(tuple.revision ?? '')
  ) {
    throw backlinkError(
      'GitHub backlink tuple requires a canonical repository and full commit SHA.',
    );
  }
  const path = normalizeRepositoryPath(tuple.path);
  const lineRange = normalizeLineRange(tuple.lineRange);
  return {
    repository: tuple.repository,
    revision: tuple.revision,
    path,
    lineRange,
  };
}

function normalizeRepositoryPath(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.startsWith('/') ||
    value.includes('\\')
  ) {
    throw backlinkError(
      'GitHub backlink tuple requires a repository-relative path.',
    );
  }
  const segments = value.split('/');
  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === '.' ||
        segment === '..' ||
        segment.includes('/') ||
        segment.includes('\\') ||
        segment.includes('\0'),
    )
  ) {
    throw backlinkError('GitHub backlink path contains an unsafe segment.');
  }
  return segments.join('/');
}

function normalizeLineRange(value) {
  if (
    !value ||
    !Number.isInteger(value.start) ||
    !Number.isInteger(value.end) ||
    value.start < 1 ||
    value.end < value.start
  ) {
    throw backlinkError(
      'GitHub backlink tuple requires a valid inclusive line range.',
    );
  }
  return { start: value.start, end: value.end };
}

function decodeCanonicalSegment(rawSegment) {
  let decoded;
  try {
    decoded = decodeURIComponent(rawSegment);
  } catch {
    throw backlinkError('GitHub backlink path has malformed encoding.');
  }
  if (
    decoded.length === 0 ||
    decoded === '.' ||
    decoded === '..' ||
    decoded.includes('/') ||
    decoded.includes('\\') ||
    decoded.includes('\0') ||
    encodeURIComponent(decoded) !== rawSegment
  ) {
    throw backlinkError(
      'GitHub backlink path has an unsafe or noncanonical encoded segment.',
    );
  }
  return decoded;
}

function sameTuple(left, right) {
  return (
    left.repository === right.repository &&
    left.revision === right.revision &&
    left.path === right.path &&
    left.lineRange.start === right.lineRange.start &&
    left.lineRange.end === right.lineRange.end &&
    left.url === right.url
  );
}

function backlinkError(message) {
  const error = new TypeError(message);
  error.code = 'E_SOURCE_BACKLINK';
  return error;
}
