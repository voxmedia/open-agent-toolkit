import type { DispatchNotice } from '@providers/identity/dispatch-report';

type TerminalReviewerNoticeSource =
  | 'bundled-recommendation'
  | 'effective-configuration'
  | 'runtime';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function candidateTarget(candidate: unknown): string | null {
  if (typeof candidate === 'string') {
    return candidate;
  }
  if (!isRecord(candidate)) {
    return null;
  }

  if (Array.isArray(candidate.route)) {
    return candidateTarget(candidate.route.at(-1));
  }
  return typeof candidate.model === 'string' ? candidate.model : null;
}

function terminalTarget(providerValue: unknown): string | null {
  if (!isRecord(providerValue)) {
    return null;
  }

  const frontier = providerValue.frontier;
  if (typeof frontier === 'string' || Array.isArray(frontier)) {
    return candidateTarget(
      Array.isArray(frontier) ? frontier.at(-1) : frontier,
    );
  }
  if (!isRecord(frontier)) {
    return null;
  }

  const candidates = frontier.candidates;
  if (Array.isArray(candidates)) {
    return candidateTarget(candidates.at(-1));
  }
  return candidateTarget(frontier);
}

function isFableTarget(target: string): boolean {
  return /(^|[-_.])fable($|[-_.])/i.test(target);
}

export function terminalReviewerNoticeForTarget(
  target: string | null | undefined,
  source: TerminalReviewerNoticeSource = 'runtime',
): DispatchNotice | null {
  if (!target || !isFableTarget(target)) {
    return null;
  }

  const context =
    source === 'bundled-recommendation'
      ? 'bundled recommendation'
      : source === 'effective-configuration'
        ? 'effective post-adoption configuration'
        : 'effective runtime resolution';
  return {
    code: 'terminal-reviewer-eligibility',
    level: 'advisory',
    message: `Terminal reviewer target ${target} in the ${context} may require model access; the organization is responsible for confirming that its applicable retention policy permits use. OAT does not determine model access or organizational retention eligibility.`,
  };
}

export function terminalReviewerNoticesForMatrix(
  providers: Record<string, unknown> | null | undefined,
  source: Exclude<
    TerminalReviewerNoticeSource,
    'runtime'
  > = 'effective-configuration',
): DispatchNotice[] {
  const notices: DispatchNotice[] = [];
  for (const providerValue of Object.values(providers ?? {})) {
    const notice = terminalReviewerNoticeForTarget(
      terminalTarget(providerValue),
      source,
    );
    if (notice) {
      notices.push(notice);
    }
  }
  return notices;
}

export function formatDispatchNotices(notices: DispatchNotice[]): string {
  return notices
    .map((notice) => `[${notice.level}] ${notice.code}: ${notice.message}`)
    .join('\n');
}
