import { join } from 'node:path';

export interface DetectedDocs {
  tooling: string;
  root: string;
  config?: string;
}

export interface DetectDocsDependencies {
  fileExists: (path: string) => Promise<boolean>;
  dirExists: (path: string) => Promise<boolean>;
}

interface Probe {
  tooling: string;
  /** Paths to check (relative to repoRoot); first match wins. */
  checks: Array<{
    /** File that must exist to confirm the framework. */
    marker: string;
    /** The docs root directory to store (relative to repoRoot). */
    root: string;
  }>;
}

const PROBES: Probe[] = [
  {
    tooling: 'mkdocs',
    checks: [
      { marker: 'mkdocs.yml', root: '.' },
      { marker: 'mkdocs.yaml', root: '.' },
      { marker: 'docs/mkdocs.yml', root: 'docs' },
      { marker: 'docs/mkdocs.yaml', root: 'docs' },
    ],
  },
  {
    tooling: 'fumadocs',
    checks: [
      { marker: 'source.config.ts', root: '.' },
      { marker: 'apps/docs/source.config.ts', root: 'apps/docs' },
    ],
  },
  {
    tooling: 'docusaurus',
    checks: [
      { marker: 'docusaurus.config.js', root: '.' },
      { marker: 'docusaurus.config.ts', root: '.' },
      { marker: 'docs/docusaurus.config.js', root: 'docs' },
      { marker: 'docs/docusaurus.config.ts', root: 'docs' },
    ],
  },
  {
    tooling: 'vitepress',
    checks: [{ marker: 'docs/.vitepress/config.ts', root: 'docs' }],
  },
  {
    tooling: 'nextra',
    checks: [{ marker: 'theme.config.tsx', root: '.' }],
  },
];

export async function detectExistingDocs(
  repoRoot: string,
  deps: DetectDocsDependencies,
): Promise<DetectedDocs | null> {
  for (const probe of PROBES) {
    for (const check of probe.checks) {
      const markerPath = join(repoRoot, check.marker);
      if (await deps.fileExists(markerPath)) {
        return {
          tooling: probe.tooling,
          root: check.root,
          config: check.marker,
        };
      }
    }
  }

  return null;
}
