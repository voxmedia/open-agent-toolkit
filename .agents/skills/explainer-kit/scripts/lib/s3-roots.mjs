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
  // The two roots were previously parsed in isolation and never related, so a
  // `publicBaseUrl` pointing somewhere that was never uploaded to was accepted.
  // In `public` mode that self-detects as an `E_PUBLISH_VERIFY` 404, but in
  // `protected` mode the fetch is skipped entirely while the unverified host is
  // still stamped into the catalog and every receipt entry's `publicUrl`.
  //
  // Hosts are deliberately allowed to differ — a bucket is normally fronted by a
  // separate CDN domain — but the path must correspond, which it does in every
  // legitimate configuration: the adapter derives both roots by appending the
  // same `/projects/<slug>` suffix to a shared base.
  if (keyPrefix !== pathname) {
    throw rootError(
      'Publication roots must address the same path: the public root path must equal the S3 key prefix.',
    );
  }
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
    hasUnsafeRootChar(value) ||
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
    hasUnsafeRootChar(value) ||
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
  if (isPrivatePublicHost(parsed.hostname) && !privatePublicRootAllowed()) {
    throw rootError(
      'Public root must not address a loopback, link-local, or private network.',
    );
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

// `\s` matches only space, tab, newline, CR, FF and VT, leaving the rest of the
// C0 range and DEL free to reach S3 object keys, composed public URLs, the
// catalog, receipts and terminal output. NUL additionally crashed `execFile`
// with an uncoded `ERR_INVALID_ARG_VALUE` rather than a clean `E_PUBLISH_ROOTS`.
// Backslash is screened here so both parsers stay symmetric: `parseS3Root`
// already rejected it, but `parsePublicRoot` silently dropped the segment.
// Expressed as a codepoint scan rather than a regex so the source carries no
// literal control bytes.
function hasUnsafeRootChar(value) {
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code <= 0x1f || code === 0x7f || char === '\\') return true;
  }
  return false;
}

/**
 * Operators publishing to a genuinely internal mirror may opt back in. The
 * default is deny: public verification issues an outbound GET against whatever
 * this root names, so an unconstrained root is an attacker-influenced request
 * primitive aimed at internal addresses (including the `169.254.169.254` IMDS
 * endpoint), and pass/fail timing discloses internal reachability.
 */
export const PRIVATE_PUBLIC_ROOT_ENV =
  'EXPLAINER_KIT_ALLOW_PRIVATE_PUBLIC_ROOT';

export function privatePublicRootAllowed(env = process.env) {
  return ['on', 'true', '1'].includes(
    String(env[PRIVATE_PUBLIC_ROOT_ENV] ?? '').toLowerCase(),
  );
}

/**
 * Literal-address policy only. Resolving names would be both TOCTOU-prone and
 * dependent on the resolver of whoever runs the publish, so a name that happens
 * to resolve inward is deliberately out of scope here.
 */
export function isPrivatePublicHost(hostname) {
  const host = String(hostname).toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;

  if (host.startsWith('[') && host.endsWith(']')) {
    return isPrivateIpv6(host.slice(1, -1));
  }
  if (host.includes(':')) return isPrivateIpv6(host);
  if (IPV4_PATTERN.test(host)) return isPrivateIpv4(host);
  return false;
}

function isPrivateIpv4(host) {
  const octets = host.split('.').map(Number);
  if (octets.some((octet) => !Number.isInteger(octet) || octet > 255)) {
    // Not a valid dotted quad; leave it to the surrounding host checks.
    return false;
  }
  const [a, b] = octets;
  return (
    a === 0 || // 0.0.0.0/8 "this network"
    a === 127 || // loopback
    a === 10 || // RFC 1918
    (a === 172 && b >= 16 && b <= 31) || // RFC 1918
    (a === 192 && b === 168) || // RFC 1918
    (a === 169 && b === 254) // link-local, incl. the IMDS address
  );
}

function isPrivateIpv6(address) {
  const groups = expandIpv6(address.split('%')[0].toLowerCase());
  if (!groups) return false;

  // IPv4-mapped (`::ffff:a.b.c.d`) must not launder a private v4 address. The
  // WHATWG URL parser rewrites the dotted form to hex, so `[::ffff:127.0.0.1]`
  // arrives here as `::ffff:7f00:1` and has to be recognised in that shape.
  if (groups.slice(0, 5).every((group) => group === 0)) {
    if (groups[5] === 0xffff || groups[5] === 0) {
      const [, , , , , , seven, eight] = groups;
      const asV4 = [seven >> 8, seven & 0xff, eight >> 8, eight & 0xff].join(
        '.',
      );
      if (groups[5] === 0xffff) return isPrivateIpv4(asV4);
      // `::` unspecified and `::1` loopback.
      if (seven === 0 && (eight === 0 || eight === 1)) return true;
    }
  }

  return (
    (groups[0] >= 0xfe80 && groups[0] <= 0xfebf) || // fe80::/10 link-local
    (groups[0] >= 0xfc00 && groups[0] <= 0xfdff) // fc00::/7 unique-local
  );
}

/** Expand an IPv6 literal to exactly eight numeric groups, or null. */
function expandIpv6(address) {
  if (!address.includes(':')) return null;
  const halves = address.split('::');
  if (halves.length > 2) return null;

  const parse = (part) =>
    part === ''
      ? []
      : part.split(':').map((group) => Number.parseInt(group, 16));

  // A trailing dotted quad (`::ffff:1.2.3.4`) contributes two groups.
  const dotted = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address);
  let tail = [];
  let working = address;
  if (dotted) {
    const octets = dotted[1].split('.').map(Number);
    if (octets.some((octet) => !Number.isInteger(octet) || octet > 255)) {
      return null;
    }
    tail = [(octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]];
    working = address.slice(0, address.length - dotted[1].length);
  }

  const [left, right] = working.split('::');
  const head = parse(left.replace(/:$/, ''));
  const rest =
    right === undefined ? [] : parse(right.replace(/:$/, '').replace(/^:/, ''));
  const explicit = [...head, ...rest, ...tail];
  if (explicit.some((group) => Number.isNaN(group) || group > 0xffff)) {
    return null;
  }

  if (right === undefined) return explicit.length === 8 ? explicit : null;
  if (explicit.length > 8) return null;
  return [
    ...head,
    ...Array.from({ length: 8 - explicit.length }, () => 0),
    ...rest,
    ...tail,
  ];
}

function rootError(message) {
  return Object.assign(new Error(message), { code: 'E_PUBLISH_ROOTS' });
}
