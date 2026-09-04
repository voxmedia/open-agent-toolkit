import { mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { createReviewBrief } from '../../scripts/create-review-brief.mjs';
import {
  canonicalJson,
  hashCanonicalJson,
  hashFile,
} from '../../scripts/lib/canonical-json.mjs';
import { approvalFingerprintInput } from '../../scripts/lib/contracts.mjs';
import { reconcileLedger } from '../../scripts/reconcile-ledger.mjs';
import { renderPacket } from '../../scripts/render-packet.mjs';
import {
  quarantineInvalidArtifact,
  validateArtifactFile,
} from '../../scripts/validate-artifact.mjs';
import {
  approveExecution,
  createPacketFixture,
} from '../fixtures/packet-fixture.mjs';

// Failure categories reported to the user. A controller failure is never
// reported as a worker failure.
export const failureCategories = Object.freeze({
  worker: 'worker',
  dispatch: 'provider-dispatch',
  contract: 'contract-validation',
  source: 'source-availability',
});

const failureCategoryByCode = {
  READ_ONLY_AUTHORITY_UNAVAILABLE: failureCategories.source,
  STRICT_AUTHORITY_UNAVAILABLE: failureCategories.dispatch,
  LAUNCHER_CAPABILITY_UNAVAILABLE: failureCategories.dispatch,
  DISPATCH_AXIS_DRIFT: failureCategories.dispatch,
  STRUCTURAL_VALIDATION_FAILED: failureCategories.contract,
};

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

function stopped(directory, status, reason, { launched = false } = {}) {
  return {
    directory,
    status,
    requestedProfile: null,
    achievedProfile: null,
    launched,
    reason,
    failureCategory:
      failureCategoryByCode[reason] ?? failureCategories.contract,
  };
}

async function writeFailure(packetRoot, code, message) {
  const path = join(packetRoot, 'raw', 'failure.json');
  await mkdir(join(packetRoot, 'raw'), { recursive: true });
  await writeJson(path, {
    kind: 'recon.failure',
    schemaVersion: 1,
    code,
    category: failureCategoryByCode[code] ?? failureCategories.contract,
    message,
  });
  return path;
}

export async function runFakeRecon(options = {}) {
  let roots = validateRoots(options.roots);
  await Promise.all(
    requiredRootNames.map((name) => mkdir(roots[name], { recursive: true })),
  );
  roots = Object.fromEntries(
    await Promise.all(
      requiredRootNames.map(async (name) => [
        name,
        await realpath(roots[name]),
      ]),
    ),
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
    failedPassMode: options.workerFailure,
    roots,
  });
  fixture.manifest.sources[0].authority = authorityLevel;

  const role =
    options.workerRoleAvailable === false ? 'generic' : 'recon-worker';
  // The generic-role fallback is fixed before approval: the approved envelope
  // names the role that will actually run.
  const execution = approveExecution({
    ...fixture.manifest.execution,
    role,
    authority: authorityLevel,
  });
  fixture.manifest.execution = execution;

  // Launch-capability preflight. Before any worker launches, the controller
  // confirms the live launch surface can satisfy the approved envelope. When
  // it cannot, the run stays at awaiting-approval with nothing launched.
  if (options.launcherCapabilities) {
    const missing = ['role', 'model', 'effort', 'authority'].filter(
      (axis) => options.launcherCapabilities[axis] === false,
    );
    if (missing.length > 0) {
      fixture.manifest.run.status = 'awaiting-approval';
      fixture.manifest.run.achievedProfile = null;
      await fixture.persist();
      await writeFailure(
        roots.packetRoot,
        'LAUNCHER_CAPABILITY_UNAVAILABLE',
        `The launch surface cannot satisfy the approved ${missing.join(', ')}; no worker was launched.`,
      );
      return stopped(
        roots.packetRoot,
        'awaiting-approval',
        'LAUNCHER_CAPABILITY_UNAVAILABLE',
      );
    }
  }

  // Drift check: the axes actually launched must match the approved
  // fingerprint byte-for-byte; otherwise renewed approval is required.
  const launched = structuredClone(approvalFingerprintInput(execution));
  if (options.dispatchDrift?.effort) {
    launched.effort = options.dispatchDrift.effort;
  }
  if (hashCanonicalJson(launched) !== execution.approval.fingerprint) {
    fixture.manifest.run.status = 'awaiting-approval';
    fixture.manifest.run.achievedProfile = null;
    await fixture.persist();
    await writeFailure(
      roots.packetRoot,
      'DISPATCH_AXIS_DRIFT',
      'The launched dispatch axes differ from the approved envelope.',
    );
    return stopped(
      roots.packetRoot,
      'awaiting-approval',
      'DISPATCH_AXIS_DRIFT',
    );
  }

  if (requestedProfile !== 'quick' && !degraded) {
    const priorPath = join(roots.packetRoot, 'raw', 'drafts', 'claims-v1.json');
    const priorLedger = JSON.parse(await readFile(priorPath, 'utf8'));
    const priorReference = fixture.manifest.artifacts.find(
      (item) => item.path === 'raw/drafts/claims-v1.json',
    );
    const resultSpecs = [
      ['semantic', 'verify', 'affirmed'],
      ['adversarial', 'adversary', 'unchallenged'],
      ['coverage', 'coverage', 'covered'],
      ...(requestedProfile === 'thorough'
        ? [
            ['redundant-verification', 'verify', 'affirmed'],
            ['contradiction-resolution', 'adversary', 'unresolved'],
          ]
        : []),
    ];
    const results = [];
    for (const [reviewKind, mode, disposition] of resultSpecs) {
      const briefName =
        reviewKind === 'redundant-verification'
          ? 'redundant-verify'
          : reviewKind === 'contradiction-resolution'
            ? 'contradiction-resolution'
            : mode;
      const claimId =
        reviewKind === 'contradiction-resolution' ? 'claim-2' : 'claim-1';
      const brief = createReviewBrief({
        id: `brief-${briefName}`,
        mode,
        createdAt: '2026-08-31T00:03:00.000Z',
        manifest: fixture.manifest,
        ledger: priorLedger,
        claimIds: [claimId],
      });
      const briefRelative = `reviews/briefs/${briefName}.json`;
      const briefPath = join(roots.packetRoot, briefRelative);
      await writeJson(briefPath, brief);
      const briefReference = {
        path: briefRelative,
        digest: await hashFile(briefPath),
      };
      const manifestBriefReference = fixture.manifest.artifacts.find(
        (item) => item.path === briefRelative,
      );
      Object.assign(manifestBriefReference, briefReference);
      const id = `review-${reviewKind}`;
      const result = {
        kind: 'recon.review-result',
        schemaVersion: 1,
        id,
        runId: fixture.manifest.run.id,
        reviewKind,
        reviewerLane: `lane-${reviewKind}`,
        status: 'complete',
        brief: briefReference,
        permittedInputs: [briefReference],
        excludedInputs: ['prior_reasoning'],
        dispositions: [{ claimId, disposition }],
        newEvidence: [],
        coverageFindings: [],
        unresolvedIssues: [],
        ...(reviewKind === 'contradiction-resolution'
          ? {
              contradictionDispositions: [
                {
                  contradictionId: 'challenge-1',
                  claimIds: ['claim-2'],
                  disposition: 'unresolved',
                },
              ],
            }
          : {}),
      };
      const resultRelative = `reviews/${reviewKind}.json`;
      const resultPath = join(roots.packetRoot, resultRelative);
      await writeJson(resultPath, result);
      const resultReference = {
        path: resultRelative,
        digest: await hashFile(resultPath),
      };
      Object.assign(
        fixture.manifest.artifacts.find((item) => item.path === resultRelative),
        resultReference,
      );
      results.push({ ...result, artifactReference: resultReference });
    }
    const reconciled = reconcileLedger({
      priorLedger,
      reviewResults: results,
      priorReference,
      runId: fixture.manifest.run.id,
    });
    Object.keys(fixture.ledger).forEach((key) => delete fixture.ledger[key]);
    Object.assign(fixture.ledger, reconciled.ledger);
    const reconciliationPath = join(
      roots.packetRoot,
      'reviews',
      'reconciliation.json',
    );
    await writeJson(reconciliationPath, reconciled.reconciliation);
    const reconciliationReference = fixture.manifest.artifacts.find(
      (item) => item.path === 'reviews/reconciliation.json',
    );
    reconciliationReference.digest = await hashFile(reconciliationPath);
  }
  if (requestedProfile !== 'quick' && !degraded) {
    for (const relativePath of [
      'reviews/briefs/verify.json',
      'reviews/briefs/adversary.json',
      'reviews/semantic.json',
      'reviews/adversarial.json',
      'reviews/coverage.json',
      'reviews/reconciliation.json',
      ...(requestedProfile === 'thorough'
        ? [
            'reviews/briefs/redundant-verify.json',
            'reviews/briefs/contradiction-resolution.json',
            'reviews/redundant-verification.json',
            'reviews/contradiction-resolution.json',
          ]
        : []),
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
      message: `${options.workerFailure} lane ${options.laneOutcome ?? 'failed'} after accepted launch; no replacement was dispatched.`,
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
        { launched: true },
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
        { launched: true },
      );
    }
    throw error;
  }
  const failures = [];
  if (options.workerFailure) {
    failures.push({
      category: failureCategories.worker,
      pass: options.workerFailure,
      laneOutcome: options.laneOutcome ?? 'failed',
    });
  }
  if (options.invalidOutput) {
    failures.push({
      category: failureCategories.contract,
      pass: 'compile',
      laneOutcome: 'completed',
    });
    return {
      ...result,
      launched: true,
      failures,
      quarantinedPath,
      ledgerPreserved,
    };
  }
  return { ...result, launched: true, failures };
}
