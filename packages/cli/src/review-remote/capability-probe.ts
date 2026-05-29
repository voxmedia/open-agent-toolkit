/**
 * Capability probe for the optional `agent-reviews` posting flow (see design.md
 * → Error Handling → Capability probe).
 *
 * The provide-remote skills prefer `agent-reviews` for tooling symmetry IF it
 * exposes a "post / submit a full PR review" flow. The probe runs a
 * non-mutating `agent-reviews --help` once, parses the help text for such a
 * flag, and caches the result for the run. `gh api` is always the safe
 * fallback — the probe never fails the skill.
 *
 * Empirical current-state finding (probed 2026-05-29, `agent-reviews@1.0.2`):
 * the CLI exposes list/detail/watch commands plus `--reply <id>` for replying
 * to existing comments, but NO command or flag that posts a full PR review. So
 * the probe returns `not-supported` today and the skill posts via `gh api`.
 * The probe is forward-compatible: when `agent-reviews` gains a posting flow,
 * this parser recognizes it without a code change to the skill.
 */

/** Outcome of running the `agent-reviews --help` probe command. */
export interface HelpProbeResult {
  /** Whether the probe command ran to completion (exit 0). */
  ok: boolean;
  /** Captured stdout (the help text), empty when the command errored. */
  stdout: string;
  /** Captured stderr, when the command errored. */
  stderr?: string;
}

/**
 * Injectable invoker that runs `agent-reviews --help` (or equivalent). The
 * skill provides a real `npx agent-reviews --help` runner; tests pass a stub.
 * It MUST resolve (never reject) — a failed invocation is reported via
 * `ok: false` so the probe can map it to `unknown`.
 */
export type HelpProbe = () => Promise<HelpProbeResult>;

export type PostingSupport = 'supported' | 'not-supported' | 'unknown';

export interface CapabilityResult {
  /**
   * Whether `agent-reviews` exposes a review-posting flow:
   * - `supported`: a posting flag was found (`flag` is set).
   * - `not-supported`: the probe ran but no posting flag exists.
   * - `unknown`: the probe could not run; caller falls back to `gh api`.
   */
  posting: PostingSupport;
  /** The discovered posting flag (e.g., `--post-review`), when supported. */
  flag?: string;
}

/**
 * Per-run cache. Pass the same object across calls within a single skill run so
 * the help command is invoked at most once. Omit it to force a fresh probe.
 */
export interface ProbeCache {
  result?: CapabilityResult;
}

/**
 * Candidate flag tokens that, if present in the help text, indicate a
 * full-review posting flow. Reply-to-comment flags (`--reply`) are deliberately
 * excluded — replying to an existing comment is not posting a review.
 */
const POSTING_FLAG_CANDIDATES = [
  '--post-review',
  '--submit-review',
  '--review',
  '--post',
];

/** Extract the first posting flag present in the help text, or `undefined`. */
function findPostingFlag(helpText: string): string | undefined {
  for (const flag of POSTING_FLAG_CANDIDATES) {
    // Word-boundary-ish match: the flag followed by whitespace, `=`, or EOL, so
    // `--post` does not spuriously match `--post-review` (and vice versa) and a
    // substring of an unrelated token never matches.
    const pattern = new RegExp(
      `(?:^|\\s)${escapeRegExp(flag)}(?=$|[\\s=])`,
      'm',
    );
    if (pattern.test(helpText)) {
      return flag;
    }
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Probe whether `agent-reviews` supports posting a full PR review.
 *
 * @param probe injectable `agent-reviews --help` runner.
 * @param cache optional per-run cache; when provided, the probe runs at most
 *   once and subsequent calls return the cached result.
 */
export async function probeAgentReviewsPosting(
  probe: HelpProbe,
  cache?: ProbeCache,
): Promise<CapabilityResult> {
  if (cache?.result !== undefined) {
    return cache.result;
  }

  let outcome: HelpProbeResult;
  try {
    outcome = await probe();
  } catch {
    // A rejecting probe is treated the same as an errored one: unknown.
    outcome = { ok: false, stdout: '' };
  }

  let result: CapabilityResult;
  if (!outcome.ok) {
    result = { posting: 'unknown' };
  } else {
    const flag = findPostingFlag(outcome.stdout);
    result = flag
      ? { posting: 'supported', flag }
      : { posting: 'not-supported' };
  }

  if (cache) {
    cache.result = result;
  }
  return result;
}
