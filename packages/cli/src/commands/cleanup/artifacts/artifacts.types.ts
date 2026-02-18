export interface ArtifactCleanupCandidate {
  target: string;
  referenced: boolean;
}

export interface ArtifactDuplicateEntry {
  target: string;
  version: number;
}

export interface ArtifactDuplicateChain {
  chainKey: string;
  entries: ArtifactDuplicateEntry[];
}
