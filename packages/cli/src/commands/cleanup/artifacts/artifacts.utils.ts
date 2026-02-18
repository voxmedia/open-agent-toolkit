import type {
  ArtifactCleanupCandidate,
  ArtifactCleanupScanResult,
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
