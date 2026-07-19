export interface InitializeRepoReferenceOptions {
  repoRoot: string;
  assetsRoot: string;
  templatesRoot?: string;
}
export interface RepoReferenceInitResult {
  repoRoot: string;
  created: string[];
  skipped: string[];
}
export declare const INSTRUCTIONS_SYNC_HINT: string;
export declare const CANONICAL_REPO_REFERENCE_PATHS: readonly [
  ...(
    | 'AGENTS.md'
    | 'pjm/AGENTS.md'
    | 'pjm/current-state.md'
    | 'pjm/roadmap.md'
    | 'reference/AGENTS.md'
    | 'README.md'
    | 'pjm/handoffs/README.md'
  )[],
  'pjm/backlog/index.md',
  'pjm/backlog/completed.md',
  'pjm/backlog/items/.gitkeep',
  'pjm/backlog/archived/.gitkeep',
  'reference/decisions/index.md',
];
export declare function initializeRepoReference(
  options: InitializeRepoReferenceOptions,
): Promise<RepoReferenceInitResult>;
//# sourceMappingURL=init.d.ts.map
