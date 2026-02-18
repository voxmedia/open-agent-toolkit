import type {
  ArtifactCleanupCandidate,
  ArtifactCleanupScanResult,
  ArtifactDuplicateChain,
  ArtifactDuplicateEntry,
} from './artifacts.types';

export function createArtifactCleanupScanResult(
  scanned: number,
  candidates: ArtifactCleanupCandidate[],
): ArtifactCleanupScanResult {
  return {
    scanned,
    candidates,
  };
}

interface ParsedArtifactVersion {
  chainKey: string;
  version: number;
}

const VERSIONED_ARTIFACT_PATTERN = /^(.*)-v([0-9]+)(\.[^./]+)$/;

export function parseArtifactVersion(target: string): ParsedArtifactVersion {
  const pathParts = target.split('/');
  const fileName = pathParts[pathParts.length - 1] ?? target;
  const match = fileName.match(VERSIONED_ARTIFACT_PATTERN);
  if (!match) {
    return { chainKey: target, version: 1 };
  }

  const stem = match[1] ?? '';
  const extension = match[3] ?? '';
  const chainFileName = `${stem}${extension}`;
  const chainPath = [...pathParts.slice(0, -1), chainFileName].join('/');
  return {
    chainKey: chainPath,
    version: Number.parseInt(match[2] ?? '1', 10),
  };
}

export function findDuplicateChains(
  targets: string[],
): ArtifactDuplicateChain[] {
  const buckets = new Map<string, ArtifactDuplicateEntry[]>();

  for (const target of targets) {
    const parsed = parseArtifactVersion(target);
    const bucket = buckets.get(parsed.chainKey) ?? [];
    bucket.push({ target, version: parsed.version });
    buckets.set(parsed.chainKey, bucket);
  }

  return [...buckets.entries()]
    .map(([chainKey, entries]) => ({
      chainKey,
      entries: [...entries].sort(
        (left, right) =>
          right.version - left.version ||
          right.target.localeCompare(left.target),
      ),
    }))
    .filter((chain) => chain.entries.length > 1)
    .sort((left, right) => left.chainKey.localeCompare(right.chainKey));
}

export function selectLatestFromChain(chain: ArtifactDuplicateChain): string {
  return chain.entries[0]?.target ?? '';
}

export function filterArtifactCandidates(
  candidates: string[],
  excludedTargets: Set<string>,
): string[] {
  return candidates.filter((candidate) => !excludedTargets.has(candidate));
}

export function findReferenceHits(
  candidates: string[],
  referenceContents: string[],
): Set<string> {
  const hits = new Set<string>();

  for (const candidate of candidates) {
    for (const content of referenceContents) {
      if (content.includes(candidate)) {
        hits.add(candidate);
        break;
      }
    }
  }

  return hits;
}
