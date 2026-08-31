import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  canonicalJson,
  hashCanonicalJson,
  hashFile,
} from '../../scripts/lib/canonical-json.mjs';
import { renderPacket } from '../../scripts/render-packet.mjs';
import {
  quarantineInvalidArtifact,
  validateArtifactFile,
} from '../../scripts/validate-artifact.mjs';
import { createPacketFixture } from '../fixtures/packet-fixture.mjs';

const requiredRootNames = [
  'sourceRoot',
  'packetRoot',
  'assetsRoot',
  'userRoot',
];

async function writeJson(path, value) {
  await writeFile(path, `${canonicalJson(value)}\n`, 'utf8');
}

function validateRoots(roots) {
  for (const name of requiredRootNames) {
    if (typeof roots?.[name] !== 'string' || roots[name].length === 0) {
      throw new Error(`Fake recon requires an injected ${name}`);
    }
  }
  return Object.fromEntries(
    requiredRootNames.map((name) => [name, resolve(roots[name])]),
  );
}

function stopped(directory, status, reason) {
  return {
    directory,
    status,
    requestedProfile: null,
    achievedProfile: null,
    launched: false,
    reason,
  };
}

async function writeFailure(packetRoot, code, message) {
  const path = join(packetRoot, 'raw', 'failure.json');
  await mkdir(join(packetRoot, 'raw'), { recursive: true });
  await writeJson(path, {
    kind: 'recon.failure',
    schemaVersion: 1,
    code,
    message,
  });
  return path;
}

export async function runFakeRecon(options = {}) {
  const roots = validateRoots(options.roots);
  await Promise.all(
    requiredRootNames.map((name) => mkdir(roots[name], { recursive: true })),
  );

  if (options.mutationCapableSource) {
    await writeFailure(
      roots.packetRoot,
      'READ_ONLY_AUTHORITY_UNAVAILABLE',
      'The fixture source exposes mutation without a read-only boundary.',
    );
    return stopped(
      roots.packetRoot,
      'failed',
      'READ_ONLY_AUTHORITY_UNAVAILABLE',
    );
  }
  const authorityLevel = options.authorityLevel ?? 'provider-enforced';
  if (options.strict && authorityLevel !== 'provider-enforced') {
    await writeFailure(
      roots.packetRoot,
      'STRICT_AUTHORITY_UNAVAILABLE',
      'Strict mode requires provider-enforced authority.',
    );
    return stopped(roots.packetRoot, 'failed', 'STRICT_AUTHORITY_UNAVAILABLE');
  }

  const requestedProfile = options.profile ?? 'standard';
  const degraded = Boolean(options.workerFailure || options.invalidOutput);
  const achievedProfile = degraded ? 'quick' : requestedProfile;
  const status = degraded ? 'partial' : 'complete';
  const fixture = await createPacketFixture({
    profile: requestedProfile,
    requestedProfile,
    achievedProfile,
    status,
    roots,
  });
  fixture.manifest.sources[0].authority = authorityLevel;

  const role =
    options.workerRoleAvailable === false ? 'generic' : 'recon-worker';
  const approvalEnvelope = {
    provider: 'fixture-provider',
    model: 'fixture-economical-model',
    effort: 'high',
    route: 'fake-dispatch',
    role,
    serviceTier: 'fixture',
    authority: authorityLevel,
    deadlineSeconds: 60,
    retryLimit: 0,
    concurrency: requestedProfile === 'thorough' ? 4 : 2,
    laneCap:
      requestedProfile === 'quick'
        ? 4
        : requestedProfile === 'thorough'
          ? 20
          : 10,
  };
  const dispatchRoot = join(roots.packetRoot, 'raw', 'dispatch');
  await mkdir(dispatchRoot, { recursive: true });
  const prepared = {
    kind: 'recon.dispatch-receipt',
    schemaVersion: 1,
    id: 'dispatch-prepared',
    state: 'prepared',
    selection: {
      provider: approvalEnvelope.provider,
      model: approvalEnvelope.model,
      effort: approvalEnvelope.effort,
      route: approvalEnvelope.route,
      role: approvalEnvelope.role,
      serviceTier: approvalEnvelope.serviceTier,
    },
    approvalEnvelope,
    fingerprint: hashCanonicalJson(approvalEnvelope),
  };
  const preparedPath = join(dispatchRoot, 'prepared.json');
  await writeJson(preparedPath, prepared);
  const approved = {
    ...prepared,
    id: 'dispatch-approved',
    state: 'approved',
  };
  const approvedPath = join(dispatchRoot, 'approved.json');
  await writeJson(approvedPath, approved);

  const acceptedEnvelope = {
    ...approvalEnvelope,
    ...(options.dispatchDrift ?? {}),
  };
  if (hashCanonicalJson(acceptedEnvelope) !== prepared.fingerprint) {
    fixture.manifest.run.status = 'awaiting-approval';
    fixture.manifest.run.achievedProfile = null;
    fixture.manifest.stages = [];
    fixture.manifest.execution = {
      approvalEnvelope,
      approvalFingerprint: prepared.fingerprint,
    };
    await fixture.persist();
    await writeFailure(
      roots.packetRoot,
      'DISPATCH_AXIS_DRIFT',
      'The accepted fake dispatch axes differ from the approved envelope.',
    );
    return stopped(
      roots.packetRoot,
      'awaiting-approval',
      'DISPATCH_AXIS_DRIFT',
    );
  }

  const accepted = {
    ...approved,
    id: 'dispatch-accepted',
    state: 'accepted',
    acceptedEnvelope,
  };
  const acceptedPath = join(dispatchRoot, 'accepted.json');
  await writeJson(acceptedPath, accepted);

  fixture.manifest.execution = {
    approvalEnvelope,
    approvalFingerprint: prepared.fingerprint,
  };
  for (const [path, file] of [
    ['raw/dispatch/prepared.json', preparedPath],
    ['raw/dispatch/approved.json', approvedPath],
    ['raw/dispatch/accepted.json', acceptedPath],
  ]) {
    const validation = await validateArtifactFile(file);
    if (!validation.valid)
      throw new Error(`Invalid fake dispatch receipt: ${path}`);
    fixture.manifest.artifacts.push({ path, digest: await hashFile(file) });
  }

  if (requestedProfile !== 'quick' && !degraded) {
    for (const relativePath of [
      'reviews/briefs/verify.json',
      'reviews/briefs/adversary.json',
      'reviews/semantic.json',
      'reviews/adversarial.json',
      'reviews/coverage.json',
      'reviews/reconciliation.json',
    ]) {
      const validation = await validateArtifactFile(
        join(roots.packetRoot, relativePath),
      );
      if (!validation.valid) {
        throw new Error(`Invalid fake review artifact: ${relativePath}`);
      }
    }
  }

  if (options.workerFailure) {
    fixture.manifest.gaps.push({
      id: 'gap-worker-failure',
      code: 'PASS_FAILED',
      message: `${options.workerFailure} failed after accepted launch; no replacement was dispatched.`,
      material: true,
    });
  }

  let quarantinedPath;
  let ledgerPreserved;
  if (options.invalidOutput) {
    const canonicalBefore = await hashFile(fixture.claimsPath);
    const candidatePath = join(
      roots.packetRoot,
      'raw',
      'drafts',
      'claims-candidate.json',
    );
    await mkdir(join(roots.packetRoot, 'raw', 'drafts'), { recursive: true });
    await writeJson(candidatePath, {
      kind: 'recon.claim-ledger',
      schemaVersion: 99,
      runId: fixture.manifest.run.id,
    });
    const validation = await validateArtifactFile(candidatePath);
    quarantinedPath = await quarantineInvalidArtifact(
      candidatePath,
      roots.packetRoot,
      validation,
    );
    ledgerPreserved = canonicalBefore === (await hashFile(fixture.claimsPath));
    fixture.manifest.gaps.push({
      id: 'gap-invalid-output',
      code: 'PASS_FAILED',
      message:
        'Invalid compiler output was quarantined; the last valid ledger was preserved.',
      material: true,
    });
  }

  if (options.structuralFailure) {
    fixture.manifest.schemaVersion = 99;
    await fixture.persist();
    try {
      await renderPacket(roots.packetRoot);
    } catch {
      await writeFailure(
        roots.packetRoot,
        'STRUCTURAL_VALIDATION_FAILED',
        'The final packet failed deterministic structural validation.',
      );
      return stopped(
        roots.packetRoot,
        'failed',
        'STRUCTURAL_VALIDATION_FAILED',
      );
    }
    throw new Error('Structural failure fixture unexpectedly rendered');
  }

  await fixture.persist();
  if (options.missingReviewResult) {
    await rm(
      join(roots.packetRoot, 'reviews', `${options.missingReviewResult}.json`),
    );
  }
  if (options.tamperReviewResult) {
    const path = join(
      roots.packetRoot,
      'reviews',
      `${options.tamperReviewResult}.json`,
    );
    const value = JSON.parse(await readFile(path, 'utf8'));
    value.unresolvedIssues.push('tampered after manifest digest');
    await writeJson(path, value);
  }
  let result;
  try {
    result = await renderPacket(roots.packetRoot);
  } catch (error) {
    if (options.missingReviewResult || options.tamperReviewResult) {
      await writeFailure(
        roots.packetRoot,
        'STRUCTURAL_VALIDATION_FAILED',
        'The review result set failed integrity validation.',
      );
      return stopped(
        roots.packetRoot,
        'failed',
        'STRUCTURAL_VALIDATION_FAILED',
      );
    }
    throw error;
  }
  if (options.invalidOutput) {
    return { ...result, quarantinedPath, ledgerPreserved };
  }
  return result;
}
