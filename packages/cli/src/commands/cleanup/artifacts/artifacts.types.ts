export interface ArtifactCleanupCandidate {
  target: string;
  referenced: boolean;
}

export interface ArtifactCleanupScanResult {
  scanned: number;
  candidates: ArtifactCleanupCandidate[];
}
