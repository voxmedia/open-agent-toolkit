import { execFile as execFileCallback } from 'node:child_process';
import { createHash, randomBytes as nodeRandomBytes } from 'node:crypto';
import {
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

import { validateContract } from './contracts.mjs';

const execFile = promisify(execFileCallback);
const SENTINEL_BODY = 'explainer-kit sentinel\n';
const TRANSIENT_PATTERN =
  /(?:timeout|timed out|connection reset|temporar|throttl|slowdown|service unavailable|\b5\d\d\b)/i;
const AUTH_PATTERN =
  /(?:credential|expired|sso session|access key|invalidclienttokenid|unrecognizedclient|token)/i;
const NOT_FOUND_PATTERN = /(?:\b404\b|not found|nosuchkey)/i;

export function normalizePublishRoots(s3Uri, publicBaseUrl) {
  if (typeof s3Uri !== 'string' || !s3Uri.startsWith('s3://')) {
    throw publishError('E_PUBLISH_ROOTS', 'S3 root must use s3://.');
  }
  const withoutScheme = s3Uri.slice('s3://'.length).replace(/\/+$/, '');
  const slash = withoutScheme.indexOf('/');
  const bucket = slash === -1 ? withoutScheme : withoutScheme.slice(0, slash);
  const keyPrefix =
    slash === -1
      ? ''
      : withoutScheme
          .slice(slash + 1)
          .split('/')
          .filter(Boolean)
          .join('/');
  if (!bucket || /\s/.test(bucket)) {
    throw publishError('E_PUBLISH_ROOTS', 'S3 root has an invalid bucket.');
  }

  let publicUrl;
  try {
    publicUrl = new URL(publicBaseUrl);
  } catch {
    throw publishError('E_PUBLISH_ROOTS', 'Public root must be a valid URL.');
  }
  if (
    publicUrl.protocol !== 'https:' ||
    publicUrl.username ||
    publicUrl.password ||
    publicUrl.search ||
    publicUrl.hash
  ) {
    throw publishError(
      'E_PUBLISH_ROOTS',
      'Public root must be credential-free HTTPS without query or fragment.',
    );
  }
  publicUrl.pathname = publicUrl.pathname.replace(/\/+$/, '');
  const normalizedPublic = publicUrl.toString().replace(/\/$/, '');
  const normalizedS3 = `s3://${bucket}${keyPrefix ? `/${keyPrefix}` : ''}`;
  return {
    bucket,
    keyPrefix,
    s3Uri: normalizedS3,
    publicBaseUrl: normalizedPublic,
  };
}

export function createSentinelRelativePath(
  runId,
  randomBytes = nodeRandomBytes,
) {
  const safeRunId =
    String(runId)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'run';
  const suffix = randomBytes(16).toString('hex');
  if (!/^[a-f0-9]{32}$/.test(suffix)) {
    throw publishError(
      'E_PUBLISH_INPUT',
      'Sentinel randomness must provide 128 bits.',
    );
  }
  return `.explainer-kit-sentinel/${safeRunId}-${suffix}.txt`;
}

export async function publishS3Static(request, dependencies = {}) {
  if (dependencies.approved !== true) {
    throw publishError(
      'E_PUBLISH_APPROVAL',
      'Publishing requires explicit human approval.',
    );
  }

  const requestValidation = validateContract('publish-request', request);
  if (!requestValidation.valid) {
    throw publishError(
      'E_PUBLISH_INPUT',
      `Invalid publish request: ${requestValidation.errors[0].message}`,
    );
  }
  const roots = normalizePublishRoots(request.s3Uri, request.publicBaseUrl);
  const cwd = dependencies.cwd ?? process.cwd();
  const siteRoot = resolve(cwd, request.siteRoot);
  const manifestPath = resolve(cwd, request.manifestPath);
  const manifest = await readJson(manifestPath, 'manifest');
  const manifestValidation = validateContract('manifest', manifest);
  if (!manifestValidation.valid) {
    throw publishError(
      'E_PUBLISH_INPUT',
      `Invalid manifest: ${manifestValidation.errors[0].message}`,
    );
  }
  const artifacts = await collectArtifacts(manifest, siteRoot);
  const command = dependencies.command ?? defaultCommand;
  const httpGet = dependencies.httpGet ?? defaultHttpGet;
  const randomBytes = dependencies.randomBytes ?? nodeRandomBytes;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const sleep = dependencies.sleep ?? defaultSleep;
  const awsOptions = {
    region: request.awsRegion,
    profile: request.awsProfile,
  };
  const sentinelRelativePath = createSentinelRelativePath(
    manifest.runId,
    randomBytes,
  );
  const sentinelTargetPath = targetPath(sentinelRelativePath, roots);
  const sentinelDirectory = await mkdtemp(
    join(tmpdir(), 'explainer-sentinel-'),
  );
  const sentinelBodyPath = join(sentinelDirectory, 'sentinel.txt');
  let sentinelUploaded = false;
  let sentinelDeleted = false;

  try {
    await writeFile(sentinelBodyPath, SENTINEL_BODY, 'utf8');
    await runAws(
      command,
      putObjectArgs({
        roots,
        relativePath: sentinelRelativePath,
        bodyPath: sentinelBodyPath,
        contentType: 'text/plain; charset=utf-8',
        cacheControl: 'no-store',
        hash: fileHash(Buffer.from(SENTINEL_BODY)),
        awsOptions,
      }),
      { sleep },
    );
    sentinelUploaded = true;
    await runAws(
      command,
      headObjectArgs(roots, sentinelRelativePath, awsOptions),
      { sleep },
    );
    const sentinelResponse = await httpGet(sentinelTargetPath.publicUrl);
    if (
      sentinelResponse.status < 200 ||
      sentinelResponse.status > 299 ||
      !responseBytes(sentinelResponse.body).equals(Buffer.from(SENTINEL_BODY))
    ) {
      throw publishError(
        'E_PUBLISH_ROOTS',
        'Public root did not serve the uploaded sentinel.',
      );
    }
    await runAws(
      command,
      deleteObjectArgs(roots, sentinelRelativePath, awsOptions),
      { sleep },
    );
    sentinelDeleted = true;

    const receiptArtifacts = [];
    for (const artifact of artifacts) {
      const target = targetPath(artifact.publishPath, roots);
      const metadata = await readExistingMetadata(
        command,
        headObjectArgs(roots, artifact.publishPath, awsOptions),
        { sleep },
      );
      if (!matchesPublishedArtifact(metadata, artifact)) {
        await runAws(
          command,
          putObjectArgs({
            roots,
            relativePath: artifact.publishPath,
            bodyPath: artifact.filePath,
            contentType: artifact.contentType,
            cacheControl: artifact.cacheControl,
            hash: artifact.hash,
            awsOptions,
          }),
          { sleep },
        );
      }
      const uploadedMetadata = await runAws(
        command,
        headObjectArgs(roots, artifact.publishPath, awsOptions),
        { sleep },
      );
      assertMetadata(uploadedMetadata.stdout, artifact);
      const response = await httpGet(target.publicUrl);
      if (response.status < 200 || response.status > 299) {
        throw publishError(
          'E_PUBLISH_VERIFY',
          `Public verification failed for ${artifact.manifestPath}.`,
        );
      }
      const servedType = headerValue(response.headers, 'content-type');
      if (!contentTypesMatch(servedType, artifact.contentType)) {
        throw publishError(
          'E_PUBLISH_VERIFY',
          `Public content type mismatch for ${artifact.manifestPath}.`,
        );
      }
      if (fileHash(responseBytes(response.body)) !== artifact.hash) {
        throw publishError(
          'E_PUBLISH_VERIFY',
          `Public bytes do not match the manifest for ${artifact.manifestPath}.`,
        );
      }
      receiptArtifacts.push({
        relativePath: artifact.manifestPath,
        hash: artifact.hash,
        s3Uri: target.s3Uri,
        publicUrl: target.publicUrl,
        httpStatus: response.status,
        contentType: artifact.contentType,
      });
    }

    const receipt = {
      schemaVersion: 'explainer-kit.publish-receipt/v1',
      provider: 's3-static',
      publishedAt: now(),
      roots: { s3Uri: roots.s3Uri, publicBaseUrl: roots.publicBaseUrl },
      sentinel: {
        relativePath: sentinelRelativePath,
        uploadVerified: true,
        publicVerified: true,
        deleted: sentinelDeleted,
      },
      artifacts: receiptArtifacts,
    };
    const receiptValidation = validateContract('publish-receipt', receipt, {
      manifest,
    });
    if (!receiptValidation.valid) {
      throw publishError(
        'E_PUBLISH_VERIFY',
        `Invalid publish receipt: ${receiptValidation.errors[0].message}`,
      );
    }
    const receiptPath =
      dependencies.receiptPath ??
      join(dirname(manifestPath), 'publish-receipt.json');
    await writeJsonAtomic(receiptPath, receipt);
    return receipt;
  } finally {
    if (sentinelUploaded && !sentinelDeleted) {
      try {
        await runAws(
          command,
          deleteObjectArgs(roots, sentinelRelativePath, awsOptions),
          { sleep },
        );
      } catch {
        // Preserve the original failure. The missing cleanup remains observable
        // because no successful receipt is emitted.
      }
    }
    await rm(sentinelDirectory, { recursive: true, force: true });
  }
}

async function collectArtifacts(manifest, siteRoot) {
  const canonicalSiteRoot = await realpath(siteRoot);
  const sitePrefix = `${basename(canonicalSiteRoot)}/`;
  const seen = new Set();
  const artifacts = [];
  for (const entry of manifest.artifacts) {
    if (entry.status !== 'built' || typeof entry.renderedPath !== 'string') {
      continue;
    }
    if (!entry.renderedPath.startsWith(sitePrefix)) {
      throw publishError(
        'E_PUBLISH_INPUT',
        `Rendered path is outside the site root: ${entry.renderedPath}`,
      );
    }
    const publishPath = entry.renderedPath.slice(sitePrefix.length);
    if (
      !publishPath ||
      publishPath.startsWith('/') ||
      publishPath.includes('..')
    ) {
      throw publishError(
        'E_PUBLISH_INPUT',
        `Unsafe publish path: ${entry.renderedPath}`,
      );
    }
    if (seen.has(publishPath)) {
      throw publishError(
        'E_PUBLISH_INPUT',
        `Duplicate publish path: ${publishPath}`,
      );
    }
    seen.add(publishPath);
    const filePath = await realpath(join(canonicalSiteRoot, publishPath));
    if (
      filePath !== canonicalSiteRoot &&
      !filePath.startsWith(`${canonicalSiteRoot}${sep}`)
    ) {
      throw publishError(
        'E_PUBLISH_INPUT',
        `Artifact escapes the site root: ${entry.renderedPath}`,
      );
    }
    const bytes = await readFile(filePath);
    const actualHash = fileHash(bytes);
    if (actualHash !== entry.hash) {
      throw publishError(
        'E_PUBLISH_INPUT',
        `Artifact hash mismatch: ${entry.renderedPath}`,
      );
    }
    const contentType = contentTypeFor(publishPath, entry.mediaType);
    artifacts.push({
      manifestPath: entry.renderedPath,
      publishPath,
      filePath,
      hash: actualHash,
      contentType,
      cacheControl: 'public, max-age=300',
    });
  }
  return artifacts;
}

function putObjectArgs({
  roots,
  relativePath,
  bodyPath,
  contentType,
  cacheControl,
  hash,
  awsOptions,
}) {
  return withAwsOptions(
    [
      's3api',
      'put-object',
      '--bucket',
      roots.bucket,
      '--key',
      objectKey(roots, relativePath),
      '--body',
      bodyPath,
      '--content-type',
      contentType,
      '--cache-control',
      cacheControl,
      '--metadata',
      `explainer-sha256=${hash.slice('sha256:'.length)}`,
      '--no-cli-pager',
    ],
    awsOptions,
  );
}

function headObjectArgs(roots, relativePath, awsOptions) {
  return withAwsOptions(
    [
      's3api',
      'head-object',
      '--bucket',
      roots.bucket,
      '--key',
      objectKey(roots, relativePath),
      '--output',
      'json',
      '--no-cli-pager',
    ],
    awsOptions,
  );
}

function deleteObjectArgs(roots, relativePath, awsOptions) {
  return withAwsOptions(
    [
      's3api',
      'delete-object',
      '--bucket',
      roots.bucket,
      '--key',
      objectKey(roots, relativePath),
      '--no-cli-pager',
    ],
    awsOptions,
  );
}

function withAwsOptions(args, { region, profile }) {
  const result = [...args, '--region', region];
  if (profile) {
    result.push('--profile', profile);
  }
  return result;
}

async function runAws(
  command,
  args,
  { sleep = defaultSleep, attempts = 3, allowNotFound = false } = {},
) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await command('aws', args);
    } catch (caught) {
      const diagnostic = `${caught?.message ?? ''}\n${caught?.stderr ?? ''}`;
      if (AUTH_PATTERN.test(diagnostic)) {
        throw publishError(
          'E_PUBLISH_AUTH',
          'AWS authentication failed; refresh the configured credential chain and retry.',
        );
      }
      if (allowNotFound && NOT_FOUND_PATTERN.test(diagnostic)) {
        return null;
      }
      if (!TRANSIENT_PATTERN.test(diagnostic) || attempt === attempts) {
        throw publishError('E_PUBLISH_AWS', 'AWS object operation failed.');
      }
      await sleep(50 * 2 ** (attempt - 1));
    }
  }
}

async function readExistingMetadata(command, args, { sleep }) {
  const result = await runAws(command, args, {
    sleep,
    allowNotFound: true,
  });
  if (result === null) return null;
  try {
    return JSON.parse(result.stdout || '{}');
  } catch {
    throw publishError(
      'E_PUBLISH_VERIFY',
      'AWS returned invalid object metadata.',
    );
  }
}

function matchesPublishedArtifact(metadata, artifact) {
  return (
    metadata?.Metadata?.['explainer-sha256'] ===
      artifact.hash.slice('sha256:'.length) &&
    metadata.ContentType === artifact.contentType &&
    metadata.CacheControl === artifact.cacheControl
  );
}

function assertMetadata(stdout, artifact) {
  let metadata;
  try {
    metadata = JSON.parse(stdout || '{}');
  } catch {
    throw publishError(
      'E_PUBLISH_VERIFY',
      'AWS returned invalid object metadata.',
    );
  }
  if (!matchesPublishedArtifact(metadata, artifact)) {
    throw publishError(
      'E_PUBLISH_VERIFY',
      `Uploaded metadata mismatch for ${artifact.manifestPath}.`,
    );
  }
}

function contentTypeFor(path, declared) {
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase();
  const known = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
  };
  return known[extension] ?? declared ?? 'application/octet-stream';
}

function contentTypesMatch(served, expected) {
  if (!served) {
    return false;
  }
  return (
    served.toLowerCase().split(';')[0].trim() ===
    expected.toLowerCase().split(';')[0].trim()
  );
}

function objectKey(roots, relativePath) {
  return roots.keyPrefix ? `${roots.keyPrefix}/${relativePath}` : relativePath;
}

function targetPath(relativePath, roots) {
  const suffix = relativePath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return {
    s3Uri: `${roots.s3Uri}/${relativePath}`,
    publicUrl: `${roots.publicBaseUrl}/${suffix}`,
  };
}

function fileHash(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function headerValue(headers, name) {
  if (typeof headers?.get === 'function') {
    return headers.get(name);
  }
  return headers?.[name] ?? headers?.[name.toLowerCase()];
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw publishError('E_PUBLISH_INPUT', `Could not read ${label} JSON.`);
  }
}

async function writeJsonAtomic(path, value) {
  const temporary = `${path}.tmp-${process.pid}-${nodeRandomBytes(6).toString('hex')}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    flag: 'wx',
  });
  await rename(temporary, path);
}

async function defaultCommand(file, args) {
  return execFile(file, args, { maxBuffer: 1024 * 1024 });
}

async function defaultHttpGet(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });
  return {
    status: response.status,
    headers: response.headers,
    body: Buffer.from(await response.arrayBuffer()),
  };
}

function responseBytes(body) {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) {
    return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  }
  if (typeof body === 'string') return Buffer.from(body);
  throw publishError(
    'E_PUBLISH_VERIFY',
    'Public verification returned an unreadable response body.',
  );
}

function defaultSleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

function publishError(code, message) {
  return Object.assign(new Error(message), { code });
}
