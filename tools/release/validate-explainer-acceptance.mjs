#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import {
  EXECUTION_SCHEMA_VERSION,
  HASH_PATTERN,
  assertReleaseCandidate,
  hashCanonicalJson,
  releaseCandidateIdentity,
} from './explainer-rc-contract.mjs';

const SENTINEL_SUFFIX_PATTERN = /^[a-f0-9]{32}$/;
const GATES = new Set(['wrapper', 'publish', 'all']);
const FILES = {
  rc: 'rc.json',
  wrapper: 'private-wrapper-result.json',
  publishRequest: 'live-publish-request.json',
  publishExecution: 'live-publish-result.json',
  receipt: 'publish-receipt.json',
};

class AcceptanceError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export async function validateExplainerAcceptance({
  acceptanceDir,
  gate,
  cwd = process.cwd(),
}) {
  if (typeof acceptanceDir !== 'string' || !GATES.has(gate)) {
    usageError();
  }
  const acceptanceRoot = resolve(cwd, acceptanceDir);
  const rc = await readEvidence(join(acceptanceRoot, FILES.rc), FILES.rc);
  validateReleaseCandidate(rc);
  const gates = {};

  if (gate === 'wrapper' || gate === 'all') {
    const wrapper = await readEvidence(
      join(acceptanceRoot, FILES.wrapper),
      FILES.wrapper,
    );
    gates.wrapper = validateWrapperEvidence(wrapper, rc);
  }
  if (gate === 'publish' || gate === 'all') {
    const [request, execution, receipt] = await Promise.all([
      readEvidence(
        join(acceptanceRoot, FILES.publishRequest),
        FILES.publishRequest,
      ),
      readEvidence(
        join(acceptanceRoot, FILES.publishExecution),
        FILES.publishExecution,
      ),
      readEvidence(join(acceptanceRoot, FILES.receipt), FILES.receipt),
    ]);
    gates.publish = await validatePublishEvidence({
      request,
      execution,
      receipt,
      rc,
      cwd,
    });
  }

  return {
    schemaVersion: 'explainer-kit.acceptance-validation/v1',
    status: 'passed',
    gate,
    rcId: rc.rcId,
    gates,
  };
}

function validateReleaseCandidate(rc) {
  assertReleaseCandidate(rc, (message, identityMismatch = false) => {
    if (identityMismatch) {
      throw new AcceptanceError(
        'E_RC_IDENTITY',
        'The frozen release candidate identity does not match its contents.',
      );
    }
    incomplete(FILES.rc, message);
  });
  if (rc.changedCandidates.length > 0) {
    throw new AcceptanceError(
      'E_CHANGED_CANDIDATES',
      'The release candidate contains changed candidate inputs.',
      { changedCandidates: rc.changedCandidates },
    );
  }
}

function validateWrapperEvidence(wrapper, rc) {
  requireObject(wrapper, FILES.wrapper);
  requireExactKeys(
    wrapper,
    [
      'schemaVersion',
      'rcId',
      'candidate',
      'coreRunId',
      'verdict',
      'packagedExecution',
      'command',
      'context',
      'hashes',
      'durability',
      'capabilities',
    ],
    FILES.wrapper,
  );
  if (
    wrapper.schemaVersion !== 'explainer-kit.wrapper-acceptance/v1' ||
    !HASH_PATTERN.test(wrapper.rcId) ||
    !nonEmptyString(wrapper.coreRunId)
  ) {
    incomplete(FILES.wrapper, 'Wrapper identity fields are incomplete.');
  }
  requireRcMatch(wrapper.rcId, rc.rcId, FILES.wrapper);
  if (!isDeepStrictEqual(wrapper.candidate, releaseCandidateIdentity(rc))) {
    throw new AcceptanceError(
      'E_RC_MISMATCH',
      'Wrapper evidence does not contain the exact frozen candidate.',
      { evidence: FILES.wrapper },
    );
  }

  validateWrapperCommand(wrapper.command);
  validateWrapperContext(wrapper.context);
  validateWrapperHashes(wrapper.hashes);
  validateDurability(wrapper.durability);
  validateCapabilities(wrapper.capabilities);
  validatePackagedExecution(
    wrapper.packagedExecution,
    rc,
    'scripts/run.mjs',
    FILES.wrapper,
    'wrapper',
    {
      request: wrapper.hashes.request,
      manifest: wrapper.hashes.manifest,
      receipt: wrapper.hashes.publishReceipt,
      coreRunId: wrapper.coreRunId,
    },
  );
  if (wrapper.verdict !== 'passed') {
    if (wrapper.verdict !== 'failed') {
      incomplete(FILES.wrapper, 'Wrapper verdict must be passed or failed.');
    }
    failedVerdict('wrapper');
  }
  return {
    status: 'passed',
    packagedEntry: wrapper.packagedExecution.entry,
    durability: wrapper.durability.outcome,
  };
}

async function validatePublishEvidence({
  request,
  execution,
  receipt,
  rc,
  cwd,
}) {
  const roots = validatePublishRequest(request);
  const manifestPath = resolve(cwd, request.manifestPath);
  const manifestEvidence = `manifestPath:${request.manifestPath}`;
  const manifest = await readEvidence(manifestPath, manifestEvidence);
  const manifestArtifacts = validatePublishManifest(
    manifest,
    request,
    manifestEvidence,
  );
  const artifactCount = validatePublishReceipt(
    receipt,
    request,
    roots,
    manifest,
    manifestArtifacts,
  );
  validatePackagedExecution(
    execution,
    rc,
    'scripts/publish.mjs',
    FILES.publishExecution,
    'publish',
    {
      request: hashCanonicalJson(request),
      manifest: hashCanonicalJson(manifest),
      receipt: hashCanonicalJson(receipt),
      coreRunId: manifest.runId,
    },
  );
  return {
    status: 'passed',
    packagedEntry: execution.entry,
    artifactCount,
    sentinel: {
      uploadVerified: true,
      publicVerified: true,
      deleted: true,
    },
    safety: {
      undeclaredOverwrites: 0,
      undeclaredDeletes: 0,
    },
  };
}

function validatePackagedExecution(
  execution,
  rc,
  entry,
  evidence,
  gate,
  expected,
) {
  requireObject(execution, evidence);
  requireExactKeys(
    execution,
    [
      'schemaVersion',
      'rcId',
      'entry',
      'package',
      'verifiedTarballs',
      'request',
      'outputs',
      'coreRunId',
      'exit',
    ],
    evidence,
  );
  if (
    execution.schemaVersion !== EXECUTION_SCHEMA_VERSION ||
    !HASH_PATTERN.test(execution.rcId)
  ) {
    incomplete(evidence, 'Packaged execution identity is incomplete.');
  }
  requireRcMatch(execution.rcId, rc.rcId, evidence);
  if (execution.entry !== entry) {
    throw new AcceptanceError(
      'E_PACKAGED_EXECUTION',
      `Packaged execution did not run ${entry}.`,
      { evidence },
    );
  }
  const cliPackage = rc.packages.find(
    ({ name }) => name === '@open-agent-toolkit/cli',
  );
  if (!isDeepStrictEqual(execution.package, cliPackage)) {
    throw new AcceptanceError(
      'E_RC_MISMATCH',
      'Packaged execution metadata does not match the frozen CLI artifact.',
      { evidence },
    );
  }
  const expectedTarballs = rc.packages.map(({ name, artifact, sha256 }) => ({
    name,
    artifact,
    sha256,
  }));
  if (!isDeepStrictEqual(execution.verifiedTarballs, expectedTarballs)) {
    throw new AcceptanceError(
      'E_RC_MISMATCH',
      'Verified tarball evidence does not match the frozen candidate.',
      { evidence },
    );
  }
  validateExecutionBindings(execution, expected, evidence);
  requireObject(execution.exit, evidence);
  requireExactKeys(execution.exit, ['code', 'signal'], evidence);
  if (execution.exit.code !== 0 || execution.exit.signal !== null) {
    failedVerdict(gate);
  }
}

function validateExecutionBindings(execution, expected, evidence) {
  requireObject(execution.request, evidence);
  requireExactKeys(execution.request, ['schemaVersion', 'sha256'], evidence);
  const expectedRequestSchema =
    execution.entry === 'scripts/publish.mjs'
      ? 'explainer-kit.publish-request/v1'
      : 'explainer-kit.run-request/v1';
  if (
    execution.request.schemaVersion !== expectedRequestSchema ||
    execution.request.sha256 !== expected.request
  ) {
    executionBindingError(evidence);
  }

  requireObject(execution.outputs, evidence);
  requireExactKeys(execution.outputs, ['manifest', 'receipt'], evidence);
  validateExecutionOutput(
    execution.outputs.manifest,
    'explainer-kit.manifest/v1',
    expected.manifest,
    evidence,
  );
  validateExecutionOutput(
    execution.outputs.receipt,
    'explainer-kit.publish-receipt/v1',
    expected.receipt,
    evidence,
  );
  if (
    execution.coreRunId !== expected.coreRunId ||
    !nonEmptyString(execution.coreRunId)
  ) {
    executionBindingError(evidence);
  }
}

function validateExecutionOutput(output, schemaVersion, sha256, evidence) {
  requireObject(output, evidence);
  requireExactKeys(output, ['schemaVersion', 'sha256'], evidence);
  if (output.schemaVersion !== schemaVersion || output.sha256 !== sha256) {
    executionBindingError(evidence);
  }
}

function executionBindingError(evidence) {
  throw new AcceptanceError(
    'E_EXECUTION_BINDING',
    'Packaged execution is not bound to the accepted request and outputs.',
    { evidence },
  );
}

function validatePublishRequest(request) {
  requireObject(request, FILES.publishRequest);
  const keys = [
    'schemaVersion',
    'provider',
    's3Uri',
    'publicBaseUrl',
    'awsRegion',
    'siteRoot',
    'manifestPath',
  ];
  if ('awsProfile' in request) keys.push('awsProfile');
  requireExactKeys(request, keys, FILES.publishRequest);
  if (
    request.schemaVersion !== 'explainer-kit.publish-request/v1' ||
    request.provider !== 's3-static' ||
    !nonEmptyString(request.awsRegion) ||
    !nonEmptyString(request.siteRoot) ||
    !nonEmptyString(request.manifestPath) ||
    ('awsProfile' in request && !nonEmptyString(request.awsProfile))
  ) {
    incomplete(FILES.publishRequest, 'Publish request fields are incomplete.');
  }
  return normalizeRoots(
    request.s3Uri,
    request.publicBaseUrl,
    FILES.publishRequest,
  );
}

function validatePublishManifest(manifest, request, evidence) {
  requireObject(manifest, evidence);
  if (
    manifest.schemaVersion !== 'explainer-kit.manifest/v1' ||
    !nonEmptyString(manifest.runId) ||
    !Array.isArray(manifest.artifacts)
  ) {
    incomplete(evidence, 'The publish manifest is incomplete.');
  }
  const sitePrefix = `${basename(resolve(request.siteRoot))}/`;
  const artifacts = new Map();
  for (const artifact of manifest.artifacts) {
    if (artifact?.status !== 'built') continue;
    if (
      !nonEmptyString(artifact.renderedPath) ||
      !artifact.renderedPath.startsWith(sitePrefix) ||
      !safeRelativePath(artifact.renderedPath) ||
      !HASH_PATTERN.test(artifact.hash)
    ) {
      incomplete(evidence, 'A built manifest artifact is incomplete.');
    }
    if (artifacts.has(artifact.renderedPath)) {
      incomplete(evidence, 'Manifest artifact paths must be unique.');
    }
    artifacts.set(artifact.renderedPath, artifact.hash);
  }
  if (artifacts.size === 0) {
    incomplete(evidence, 'The publish manifest has no built artifacts.');
  }
  return artifacts;
}

function validatePublishReceipt(
  receipt,
  request,
  roots,
  manifest,
  manifestArtifacts,
) {
  requireObject(receipt, FILES.receipt);
  requireExactKeys(
    receipt,
    [
      'schemaVersion',
      'provider',
      'publishedAt',
      'roots',
      'sentinel',
      'artifacts',
    ],
    FILES.receipt,
  );
  if (
    receipt.schemaVersion !== 'explainer-kit.publish-receipt/v1' ||
    receipt.provider !== 's3-static' ||
    !validDateTime(receipt.publishedAt)
  ) {
    incomplete(FILES.receipt, 'Publish receipt fields are incomplete.');
  }
  requireObject(receipt.roots, FILES.receipt);
  requireExactKeys(receipt.roots, ['s3Uri', 'publicBaseUrl'], FILES.receipt);
  if (
    receipt.roots.s3Uri !== roots.s3Uri ||
    receipt.roots.publicBaseUrl !== roots.publicBaseUrl
  ) {
    throw new AcceptanceError(
      'E_RECEIPT_MISMATCH',
      'Publish receipt roots do not match the live request.',
      { evidence: FILES.receipt },
    );
  }
  validateSentinel(receipt.sentinel, manifest.runId);
  if (!Array.isArray(receipt.artifacts) || receipt.artifacts.length === 0) {
    incomplete(FILES.receipt, 'Publish receipt must contain artifacts.');
  }
  if (receipt.artifacts.length !== manifestArtifacts.size) {
    throw new AcceptanceError(
      'E_RECEIPT_MISMATCH',
      'Publish receipt does not contain exactly the declared manifest artifacts.',
      { evidence: FILES.receipt },
    );
  }

  const seen = new Set();
  const sitePrefix = `${basename(resolve(request.siteRoot))}/`;
  for (const artifact of receipt.artifacts) {
    validateReceiptArtifact(artifact);
    if (!safeRelativePath(artifact.relativePath)) {
      throw new AcceptanceError(
        'E_PUBLISH_SAFETY',
        'Receipt artifact path escapes its declared site root.',
        { evidence: FILES.receipt },
      );
    }
    if (
      seen.has(artifact.relativePath) ||
      artifact.relativePath.startsWith('.explainer-kit-sentinel/')
    ) {
      throw new AcceptanceError(
        'E_PUBLISH_SAFETY',
        'Receipt contains duplicate or sentinel artifact scope.',
        { evidence: FILES.receipt },
      );
    }
    seen.add(artifact.relativePath);
    const declaredHash = manifestArtifacts.get(artifact.relativePath);
    if (declaredHash === undefined || declaredHash !== artifact.hash) {
      throw new AcceptanceError(
        'E_RECEIPT_MISMATCH',
        'Receipt artifact hashes do not match the declared manifest.',
        { evidence: FILES.receipt },
      );
    }
    const publishedPath = artifact.relativePath.slice(sitePrefix.length);
    const expectedS3Uri = `${roots.s3Uri}/${publishedPath}`;
    const expectedPublicUrl = `${roots.publicBaseUrl}/${encodePath(publishedPath)}`;
    if (
      !publishedPath ||
      artifact.s3Uri !== expectedS3Uri ||
      artifact.publicUrl !== expectedPublicUrl
    ) {
      throw new AcceptanceError(
        'E_RECEIPT_MISMATCH',
        'Receipt artifact destinations do not match the corresponding roots.',
        { evidence: FILES.receipt },
      );
    }
  }
  return receipt.artifacts.length;
}

function validateSentinel(sentinel, runId) {
  requireObject(sentinel, FILES.receipt);
  requireExactKeys(
    sentinel,
    ['relativePath', 'uploadVerified', 'publicVerified', 'deleted'],
    FILES.receipt,
  );
  const prefix = `.explainer-kit-sentinel/${safeRunId(runId)}-`;
  const suffix = nonEmptyString(sentinel.relativePath)
    ? sentinel.relativePath.slice(prefix.length, -'.txt'.length)
    : '';
  if (
    !sentinel.relativePath?.startsWith(prefix) ||
    !sentinel.relativePath.endsWith('.txt') ||
    !SENTINEL_SUFFIX_PATTERN.test(suffix) ||
    sentinel.uploadVerified !== true ||
    sentinel.publicVerified !== true ||
    sentinel.deleted !== true
  ) {
    incomplete(
      FILES.receipt,
      'Sentinel upload, public verification, uniqueness, and deletion are required.',
    );
  }
}

function validateReceiptArtifact(artifact) {
  requireObject(artifact, FILES.receipt);
  requireExactKeys(
    artifact,
    ['relativePath', 'hash', 's3Uri', 'publicUrl', 'httpStatus', 'contentType'],
    FILES.receipt,
  );
  if (
    !nonEmptyString(artifact.relativePath) ||
    !HASH_PATTERN.test(artifact.hash) ||
    !nonEmptyString(artifact.s3Uri) ||
    !nonEmptyString(artifact.publicUrl) ||
    !Number.isInteger(artifact.httpStatus) ||
    artifact.httpStatus < 200 ||
    artifact.httpStatus > 299 ||
    !nonEmptyString(artifact.contentType)
  ) {
    incomplete(FILES.receipt, 'A publish receipt artifact is incomplete.');
  }
}

function validateWrapperCommand(command) {
  requireObject(command, FILES.wrapper);
  requireExactKeys(command, ['sanitized', 'argv'], FILES.wrapper);
  if (
    command.sanitized !== true ||
    !Array.isArray(command.argv) ||
    command.argv.length === 0 ||
    !command.argv.every(nonEmptyString)
  ) {
    incomplete(
      FILES.wrapper,
      'Sanitized wrapper command evidence is required.',
    );
  }
}

function validateWrapperContext(context) {
  requireObject(context, FILES.wrapper);
  requireExactKeys(
    context,
    ['privateRequestExternal', 'credentialsPersisted'],
    FILES.wrapper,
  );
  if (
    context.privateRequestExternal !== true ||
    context.credentialsPersisted !== false
  ) {
    incomplete(FILES.wrapper, 'Safe wrapper context evidence is required.');
  }
}

function validateWrapperHashes(hashes) {
  requireObject(hashes, FILES.wrapper);
  requireExactKeys(
    hashes,
    ['request', 'manifest', 'publishReceipt'],
    FILES.wrapper,
  );
  if (
    !HASH_PATTERN.test(hashes.request) ||
    !HASH_PATTERN.test(hashes.manifest) ||
    !HASH_PATTERN.test(hashes.publishReceipt)
  ) {
    incomplete(
      FILES.wrapper,
      'Wrapper manifest and receipt hashes are required.',
    );
  }
}

function validateDurability(durability) {
  requireObject(durability, FILES.wrapper);
  requireExactKeys(durability, ['outcome', 'verified'], FILES.wrapper);
  if (durability.outcome !== 'built-durable' || durability.verified !== true) {
    incomplete(
      FILES.wrapper,
      'Passing verified durability evidence is required.',
    );
  }
}

function validateCapabilities(capabilities) {
  requireObject(capabilities, FILES.wrapper);
  const keys = [
    'presetResolution',
    'vaultStoaOutput',
    'googleDocsSync',
    'personalDestinationLinks',
    'manifestConsumption',
    'rollbackReady',
  ];
  requireExactKeys(capabilities, keys, FILES.wrapper);
  if (!keys.every((key) => capabilities[key] === true)) {
    incomplete(FILES.wrapper, 'Every wrapper capability must pass.');
  }
}

async function readEvidence(path, evidence) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new AcceptanceError(
        'E_EVIDENCE_MISSING',
        `Required acceptance evidence is missing: ${evidence}.`,
        { evidence },
      );
    }
    throw new AcceptanceError(
      'E_EVIDENCE_MALFORMED',
      `Acceptance evidence could not be read: ${evidence}.`,
      { evidence },
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AcceptanceError(
      'E_EVIDENCE_MALFORMED',
      `Acceptance evidence is not valid JSON: ${evidence}.`,
      { evidence },
    );
  }
}

function normalizeRoots(s3Uri, publicBaseUrl, evidence) {
  if (!nonEmptyString(s3Uri) || !s3Uri.startsWith('s3://')) {
    incomplete(evidence, 'Publish request S3 root is invalid.');
  }
  const s3UriNormalized = s3Uri.replace(/\/+$/, '');
  if (!/^s3:\/\/[^/\s]+(?:\/[^\s]+)?$/.test(s3UriNormalized)) {
    incomplete(evidence, 'Publish request S3 root is invalid.');
  }
  let publicUrl;
  try {
    publicUrl = new URL(publicBaseUrl);
  } catch {
    incomplete(evidence, 'Publish request public root is invalid.');
  }
  if (
    publicUrl.protocol !== 'https:' ||
    publicUrl.username ||
    publicUrl.password ||
    publicUrl.search ||
    publicUrl.hash
  ) {
    incomplete(
      evidence,
      'Publish request public root must be credential-free HTTPS without query or fragment.',
    );
  }
  publicUrl.pathname = publicUrl.pathname.replace(/\/+$/, '');
  return {
    s3Uri: s3UriNormalized,
    publicBaseUrl: publicUrl.toString().replace(/\/$/, ''),
  };
}

function requireRcMatch(actual, expected, evidence) {
  if (actual !== expected) {
    throw new AcceptanceError(
      'E_RC_MISMATCH',
      'Acceptance evidence references a different release candidate.',
      { evidence },
    );
  }
}

function requireObject(value, evidence) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    incomplete(evidence, 'Acceptance evidence must be a JSON object.');
  }
}

function requireExactKeys(value, keys, evidence) {
  if (!isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort())) {
    incomplete(
      evidence,
      'Acceptance evidence does not match its closed schema.',
    );
  }
}

function safeRelativePath(value) {
  return (
    nonEmptyString(value) &&
    !isAbsolute(value) &&
    !value.includes('\\') &&
    value
      .split('/')
      .every((part) => part !== '' && part !== '.' && part !== '..')
  );
}

function safeRunId(runId) {
  return (
    String(runId)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'run'
  );
}

function encodePath(path) {
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function validDateTime(value) {
  return nonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function failedVerdict(gate) {
  throw new AcceptanceError(
    'E_FAILED_VERDICT',
    `The ${gate} acceptance gate did not pass.`,
    { gate },
  );
}

function incomplete(evidence, message) {
  throw new AcceptanceError('E_EVIDENCE_INCOMPLETE', message, { evidence });
}

function usageError() {
  throw new AcceptanceError(
    'E_USAGE',
    'Usage: validate-explainer-acceptance.mjs <acceptance-dir> --gate wrapper|publish|all',
  );
}

function parseArguments(argv) {
  if (
    argv.length !== 3 ||
    !nonEmptyString(argv[0]) ||
    argv[0].startsWith('--') ||
    argv[1] !== '--gate' ||
    !GATES.has(argv[2])
  ) {
    usageError();
  }
  return { acceptanceDir: argv[0], gate: argv[2] };
}

function publicFailure(error) {
  if (!(error instanceof AcceptanceError)) {
    return {
      code: 'E_ACCEPTANCE_VALIDATION',
      message: 'Explainer acceptance validation failed closed.',
    };
  }
  return {
    code: error.code,
    message: error.message,
    ...(error.details ?? {}),
  };
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = await validateExplainerAcceptance(options);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify(publicFailure(error))}\n`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
