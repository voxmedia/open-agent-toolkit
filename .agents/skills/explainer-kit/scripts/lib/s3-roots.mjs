const BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const RESERVED_BUCKET_PREFIXES = ['xn--', 'sthree-', 'amzn_s3_demo_'];
const RESERVED_BUCKET_SUFFIXES = [
  '-s3alias',
  '--ol-s3',
  '.mrap',
  '--x-s3',
  '--table-s3',
];
const ENCODED_DOT_OR_SEPARATOR_PATTERN = /%(?:2e|2f|5c)/i;

export function normalizePublishRoots(s3Uri, publicBaseUrl) {
  const s3 = parseS3Root(s3Uri);
  const publicRoot = parsePublicRoot(publicBaseUrl);
  const keyPrefix = s3.segments.join('/');
  const pathname = publicRoot.segments.join('/');
  return {
    bucket: s3.bucket,
    keyPrefix,
    s3Uri: `s3://${s3.bucket}${keyPrefix ? `/${keyPrefix}` : ''}`,
    publicBaseUrl: `https://${publicRoot.authority}${pathname ? `/${pathname}` : ''}`,
  };
}

export function composePublicationTarget(relativePath, roots) {
  const normalized = normalizePublishRoots(roots?.s3Uri, roots?.publicBaseUrl);
  const segments = parseRelativePath(relativePath);
  const rawSuffix = segments.join('/');
  const publicSuffix = segments
    .map((part) => encodeURIComponent(part))
    .join('/');
  return {
    s3Uri: `${normalized.s3Uri}/${rawSuffix}`,
    publicUrl: `${normalized.publicBaseUrl}/${publicSuffix}`,
  };
}

function parseS3Root(value) {
  if (
    typeof value !== 'string' ||
    /\s|[\\?#]/.test(value) ||
    !value.startsWith('s3://')
  ) {
    throw rootError('S3 root must be a credential-free s3 URI.');
  }
  const match = /^s3:\/\/([^/]+)(?:\/(.*))?$/.exec(value);
  if (!match) {
    throw rootError('S3 root must be a credential-free s3 URI.');
  }
  const [, bucket, rawPath = ''] = match;
  if (!validBucket(bucket)) {
    throw rootError('S3 root has an invalid bucket.');
  }
  return { bucket, segments: parseRootPath(rawPath) };
}

function parsePublicRoot(value) {
  if (
    typeof value !== 'string' ||
    /\s|[?#]/.test(value) ||
    !value.startsWith('https://')
  ) {
    throw rootError('Public root must be credential-free HTTPS.');
  }
  const match = /^https:\/\/([^/]+)(?:\/(.*))?$/.exec(value);
  if (!match || match[1].includes('%') || match[1].includes('@')) {
    throw rootError('Public root must be credential-free HTTPS.');
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw rootError('Public root must be credential-free HTTPS.');
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !parsed.hostname
  ) {
    throw rootError('Public root must be credential-free HTTPS.');
  }
  return {
    authority: parsed.host,
    segments: parseRootPath(match[2] ?? ''),
  };
}

function parseRootPath(rawPath) {
  if (rawPath === '') return [];
  const withoutTrailingSlash = rawPath.endsWith('/')
    ? rawPath.slice(0, -1)
    : rawPath;
  if (withoutTrailingSlash === '' || withoutTrailingSlash.includes('//')) {
    throw rootError('Publication root contains an unsafe path.');
  }
  const segments = withoutTrailingSlash.split('/');
  if (segments.some((segment) => !validRootSegment(segment))) {
    throw rootError('Publication root contains an unsafe path.');
  }
  return segments;
}

function parseRelativePath(value) {
  if (
    typeof value !== 'string' ||
    value === '' ||
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.includes('//') ||
    /[\\?#]/.test(value) ||
    ENCODED_DOT_OR_SEPARATOR_PATTERN.test(value)
  ) {
    throw rootError('Publication target contains an unsafe path.');
  }
  const segments = value.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw rootError('Publication target contains an unsafe path.');
  }
  return segments;
}

function validRootSegment(segment) {
  if (!segment || segment === '.' || segment === '..') return false;
  let decoded;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return false;
  }
  return (
    decoded !== '.' &&
    decoded !== '..' &&
    !decoded.includes('/') &&
    !decoded.includes('\\') &&
    !ENCODED_DOT_OR_SEPARATOR_PATTERN.test(decoded)
  );
}

function validBucket(bucket) {
  return (
    BUCKET_PATTERN.test(bucket) &&
    !bucket.includes('..') &&
    !bucket.includes('.-') &&
    !bucket.includes('-.') &&
    !IPV4_PATTERN.test(bucket) &&
    !RESERVED_BUCKET_PREFIXES.some((prefix) => bucket.startsWith(prefix)) &&
    !RESERVED_BUCKET_SUFFIXES.some((suffix) => bucket.endsWith(suffix))
  );
}

function rootError(message) {
  return Object.assign(new Error(message), { code: 'E_PUBLISH_ROOTS' });
}
