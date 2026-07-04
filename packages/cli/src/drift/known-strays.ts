import { normalizeToPosixPath } from '@fs/paths';

import type { DriftReport } from './drift.types';

export interface KnownStraySources {
  project?: readonly string[];
  user?: readonly string[];
}

export interface KnownStrayCandidate {
  report: DriftReport;
}

export interface FilterKnownStraysOptions<
  Candidate extends KnownStrayCandidate,
> {
  reports: readonly DriftReport[];
  candidates: readonly Candidate[];
  knownStrays?: KnownStraySources;
}

export interface FilterKnownStraysResult<
  Candidate extends KnownStrayCandidate,
> {
  reports: DriftReport[];
  candidates: Candidate[];
}

function normalizeProviderPath(pathValue: string): string | undefined {
  const trimmed = pathValue.trim();
  if (!trimmed) {
    return undefined;
  }

  const normalized = normalizeToPosixPath(trimmed)
    .replace(/\/+$/, '')
    .replace(/^\.\//, '');

  return normalized && normalized !== '.' ? normalized : undefined;
}

function resolveKnownStrayPaths(
  knownStrays: KnownStraySources | undefined,
): Set<string> {
  const paths = [...(knownStrays?.project ?? []), ...(knownStrays?.user ?? [])];

  return new Set(
    paths
      .map((pathValue) => normalizeProviderPath(pathValue))
      .filter((pathValue): pathValue is string => pathValue !== undefined),
  );
}

function isKnownStrayReport(
  report: DriftReport,
  knownStrayPaths: Set<string>,
): boolean {
  if (report.state.status !== 'stray') {
    return false;
  }

  const providerPath = normalizeProviderPath(report.providerPath);
  return providerPath !== undefined && knownStrayPaths.has(providerPath);
}

export function filterKnownStrays<Candidate extends KnownStrayCandidate>(
  options: FilterKnownStraysOptions<Candidate>,
): FilterKnownStraysResult<Candidate> {
  const knownStrayPaths = resolveKnownStrayPaths(options.knownStrays);
  if (knownStrayPaths.size === 0) {
    return {
      reports: [...options.reports],
      candidates: [...options.candidates],
    };
  }

  return {
    reports: options.reports.filter(
      (report) => !isKnownStrayReport(report, knownStrayPaths),
    ),
    candidates: options.candidates.filter(
      (candidate) => !isKnownStrayReport(candidate.report, knownStrayPaths),
    ),
  };
}
