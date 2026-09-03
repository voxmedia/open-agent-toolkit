import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

import { parseCanonicalAgentMarkdown } from './parse';

export type CanonicalRoleTier = 'loaded' | 'user' | 'project';
export type CanonicalRoleValidation =
  | 'direct-canonical'
  | 'exact-canonical-symlink';
export type CanonicalRoleCandidateOutcome =
  | 'missing'
  | 'broken-symlink'
  | 'escaping-symlink'
  | 'noncanonical-copy'
  | 'wrong-target'
  | 'invalid-role';

export type RedactedPath = string;

export interface CandidateMiss {
  tier: CanonicalRoleTier;
  candidate: RedactedPath;
  outcome: CanonicalRoleCandidateOutcome;
}

export interface RecoveryAction {
  command: string;
}

export type CanonicalRoleEvidence =
  | {
      status: 'resolved';
      dependency: string;
      canonicalRole: string;
      tier: CanonicalRoleTier;
      validation: CanonicalRoleValidation;
      canonicalPath: RedactedPath;
      selectedPath: RedactedPath;
      roleVersion: string;
      contentDigest: string;
      candidateMisses: readonly CandidateMiss[];
    }
  | {
      status: 'missing';
      dependency: string;
      canonicalRole: string;
      candidateMisses: readonly CandidateMiss[];
      recovery: readonly RecoveryAction[];
    };

export interface ResolveCanonicalRoleInput {
  dependency: string;
  canonicalRole: string;
  skillDir: string;
  userCanonicalRoot: string;
  projectCanonicalRoot: string;
}

interface Candidate {
  tier: CanonicalRoleTier;
  providerRoot: string;
  canonicalRoot: string;
}

interface ResolvedCandidate {
  validation: CanonicalRoleValidation;
  selectedFile: string;
  canonicalFile: string;
}

function redactedCandidate(tier: CanonicalRoleTier, role: string): string {
  return `<${tier}>/agents/${role}.md`;
}

/**
 * Resolve symlinks before comparing roots.
 *
 * `path.resolve` normalizes a path but does not follow symlinks, so the same
 * canonical file was labelled `<loaded>` or `<user>` depending on whether the
 * caller happened to pass a realpath'd `skillDir`. On macOS a tmpdir root
 * realpaths from `/var/...` to `/private/var/...`, which broke the string
 * match; on Linux it did not. A provenance label must not depend on an
 * incidental property of the caller's argument.
 */
function sameRoot(left: string, right: string): boolean {
  const normalize = (value: string): string => {
    try {
      return realpathSync(value);
    } catch {
      return resolve(value);
    }
  };
  return normalize(left) === normalize(right);
}

function canonicalTier(
  candidate: Candidate,
  userCanonicalRoot: string,
  projectCanonicalRoot: string,
): CanonicalRoleTier {
  if (sameRoot(candidate.canonicalRoot, userCanonicalRoot)) {
    return 'user';
  }
  if (sameRoot(candidate.canonicalRoot, projectCanonicalRoot)) {
    return 'project';
  }
  return candidate.tier;
}

function inspectCandidate(
  candidate: Candidate,
  role: string,
): ResolvedCandidate | CandidateMiss {
  const selectedFile = join(candidate.providerRoot, 'agents', `${role}.md`);
  const canonicalFile = join(candidate.canonicalRoot, 'agents', `${role}.md`);
  const miss = (outcome: CanonicalRoleCandidateOutcome): CandidateMiss => ({
    tier: candidate.tier,
    candidate: redactedCandidate(candidate.tier, role),
    outcome,
  });

  let selectedStat;
  try {
    selectedStat = lstatSync(selectedFile);
  } catch {
    return miss('missing');
  }

  if (selectedStat.isSymbolicLink()) {
    let selectedRealpath: string;
    try {
      selectedRealpath = realpathSync(selectedFile);
    } catch {
      return miss('broken-symlink');
    }

    try {
      if (!lstatSync(canonicalFile).isFile()) {
        return miss('escaping-symlink');
      }
      if (
        selectedFile !== canonicalFile &&
        selectedRealpath === realpathSync(canonicalFile)
      ) {
        return {
          validation: 'exact-canonical-symlink',
          selectedFile,
          canonicalFile,
        };
      }
    } catch {
      return miss('escaping-symlink');
    }
    return miss('escaping-symlink');
  }

  if (!selectedStat.isFile()) {
    return miss('wrong-target');
  }
  if (selectedFile !== canonicalFile) {
    return miss('noncanonical-copy');
  }
  return { validation: 'direct-canonical', selectedFile, canonicalFile };
}

function resolveRoleIdentity(
  resolved: ResolvedCandidate,
  candidate: Candidate,
  input: ResolveCanonicalRoleInput,
  candidateMisses: readonly CandidateMiss[],
): CanonicalRoleEvidence | CandidateMiss {
  try {
    const content = readFileSync(resolved.canonicalFile, 'utf8');
    const document = parseCanonicalAgentMarkdown(content, '<canonical-role>');
    const version = document.frontmatter.version;
    if (
      document.name !== input.canonicalRole ||
      typeof version !== 'string' ||
      version.trim() === ''
    ) {
      throw new Error('Canonical role identity is invalid');
    }
    const canonicalPath = redactedCandidate(
      canonicalTier(
        candidate,
        input.userCanonicalRoot,
        input.projectCanonicalRoot,
      ),
      input.canonicalRole,
    );
    return {
      status: 'resolved',
      dependency: input.dependency,
      canonicalRole: input.canonicalRole,
      tier: candidate.tier,
      validation: resolved.validation,
      canonicalPath,
      selectedPath: redactedCandidate(candidate.tier, input.canonicalRole),
      roleVersion: version.trim(),
      contentDigest: `sha256:${createHash('sha256').update(content).digest('hex')}`,
      candidateMisses,
    };
  } catch {
    return {
      tier: candidate.tier,
      candidate: redactedCandidate(candidate.tier, input.canonicalRole),
      outcome: 'invalid-role',
    };
  }
}

/**
 * Deliberately a library for skill-side callers: dispatch protocols resolve
 * role identity before the native launch and hand the resulting evidence to
 * `oat project dispatch record`, which validates it. There is intentionally no
 * production call site inside the CLI.
 */
export function resolveCanonicalRole(
  input: ResolveCanonicalRoleInput,
): CanonicalRoleEvidence {
  const loadedRoot = resolve(input.skillDir, '..', '..');
  const loadedCanonicalRoot =
    basename(loadedRoot) === '.agents'
      ? loadedRoot
      : join(dirname(loadedRoot), '.agents');
  const candidates: readonly Candidate[] = [
    {
      tier: 'loaded',
      providerRoot: loadedRoot,
      canonicalRoot: loadedCanonicalRoot,
    },
    {
      tier: 'user',
      providerRoot: input.userCanonicalRoot,
      canonicalRoot: input.userCanonicalRoot,
    },
    {
      tier: 'project',
      providerRoot: input.projectCanonicalRoot,
      canonicalRoot: input.projectCanonicalRoot,
    },
  ];
  const candidateMisses: CandidateMiss[] = [];

  for (const candidate of candidates) {
    const inspected = inspectCandidate(candidate, input.canonicalRole);
    if ('outcome' in inspected) {
      candidateMisses.push(inspected);
      continue;
    }
    const evidence = resolveRoleIdentity(
      inspected,
      candidate,
      input,
      candidateMisses,
    );
    if ('outcome' in evidence) {
      candidateMisses.push(evidence);
      continue;
    }
    return evidence;
  }

  return {
    status: 'missing',
    dependency: input.dependency,
    canonicalRole: input.canonicalRole,
    candidateMisses,
    recovery: [
      {
        command: `oat tools install ${input.dependency} --scope <user|project>`,
      },
      {
        command: `oat tools update --pack ${input.dependency} --scope <user|project>`,
      },
    ],
  };
}
