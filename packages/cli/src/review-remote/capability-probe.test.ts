import { describe, expect, it, vi } from 'vitest';

import { type HelpProbe, probeAgentReviewsPosting } from './capability-probe';

/**
 * Empirically captured `npx agent-reviews --help` output, version 1.0.2
 * (probed during p02-t01 on 2026-05-29). This is the real current-state
 * surface: list/detail/watch + `--reply <id>` for replying to existing
 * comments — there is NO command or flag that posts/submits a full PR review.
 * The probe therefore returns `not-supported` today; `gh api` is the posting
 * path. This fixture is the regression anchor for the forward-compat probe.
 */
const REAL_HELP_NO_POSTING = `agent-reviews — Manage PR review comments from the CLI

Designed for both human use and as a tool for AI coding agents (Claude Code, etc.).

Usage:
  agent-reviews                        List all review comments
  agent-reviews --unresolved           List unresolved comments only
  agent-reviews --unanswered           List comments without replies
  agent-reviews --reply <id> "msg"     Reply to a specific comment
  agent-reviews --reply <id> "msg" --resolve  Reply and resolve thread
  agent-reviews --detail <id>          Show full detail for a comment
  agent-reviews --expanded             Show full detail for each comment
  agent-reviews --watch                Watch for new comments (poll mode)
  agent-reviews --json                 Output as JSON for scripting

Options:
  -u, --unresolved   Show only unresolved/pending comments
  -a, --unanswered   Show only comments without any replies
  -r, --reply        Reply to a comment (requires ID and message)
  -d, --detail       Show full detail for a specific comment
  -p, --pr           Target specific PR number (auto-detects from branch)
  -j, --json         Output as JSON instead of formatted text
  -h, --help         Show this help
  -v, --version      Show version
`;

/**
 * Hypothetical future help text that DOES expose a posting flow. Used to prove
 * the probe is forward-compatible: when `agent-reviews` gains a review-posting
 * command, the probe should recognize it and report `supported` with the flag.
 */
const HYPOTHETICAL_HELP_WITH_POSTING = `agent-reviews — Manage PR review comments from the CLI

Usage:
  agent-reviews --post-review --pr <N>   Post a full PR review

Options:
  --post-review      Submit a full PR review (event + body + comments)
  -p, --pr           Target specific PR number
  -h, --help         Show this help
`;

describe('probeAgentReviewsPosting', () => {
  it('returns not-supported for the real current-state agent-reviews help', async () => {
    const probe: HelpProbe = vi.fn(async () => ({
      ok: true,
      stdout: REAL_HELP_NO_POSTING,
    }));
    const result = await probeAgentReviewsPosting(probe);
    expect(result.posting).toBe('not-supported');
    expect(result.flag).toBeUndefined();
  });

  it('returns supported with the flag when help exposes a posting flow', async () => {
    const probe: HelpProbe = vi.fn(async () => ({
      ok: true,
      stdout: HYPOTHETICAL_HELP_WITH_POSTING,
    }));
    const result = await probeAgentReviewsPosting(probe);
    expect(result.posting).toBe('supported');
    expect(result.flag).toBe('--post-review');
  });

  it('returns unknown when the probe invocation errors (caller falls back to gh api)', async () => {
    const probe: HelpProbe = vi.fn(async () => ({
      ok: false,
      stdout: '',
      stderr: 'command not found: agent-reviews',
    }));
    const result = await probeAgentReviewsPosting(probe);
    expect(result.posting).toBe('unknown');
    expect(result.flag).toBeUndefined();
  });

  it('caches the probe result so repeated calls within a run do not re-probe', async () => {
    const probe: HelpProbe = vi.fn(async () => ({
      ok: true,
      stdout: REAL_HELP_NO_POSTING,
    }));
    const cache = {};
    const first = await probeAgentReviewsPosting(probe, cache);
    const second = await probeAgentReviewsPosting(probe, cache);
    expect(first).toEqual(second);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('re-probes when no cache is provided', async () => {
    const probe: HelpProbe = vi.fn(async () => ({
      ok: true,
      stdout: REAL_HELP_NO_POSTING,
    }));
    await probeAgentReviewsPosting(probe);
    await probeAgentReviewsPosting(probe);
    expect(probe).toHaveBeenCalledTimes(2);
  });
});
