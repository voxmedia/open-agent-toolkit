# Claude effort dispatch verification

Date: 2026-09-20

Claude Code: `2.1.278` at `/Users/tstang/.local/bin/claude`

Scope: p03 of `claude-effort-levels`

## Containment and provenance

The probes ran from a disposable Git repository under a temporary root. The
commands below use `$LIVE_ROOT` and `$PROJECT_ROOT` in place of that root and
its project directory. `CLAUDE_CONFIG_DIR` pointed at `$LIVE_ROOT/config`.
Authentication used a read-only symlink from that temporary directory to the
existing Claude credential file. The probe did not read or copy credential
contents, install anything, change user or global settings, or write outside
the temporary root and Claude's own transcript directory beneath the temporary
config root.

The installed `claude --help` exposed `--agent`, `--agents`, `--model`, and
`--effort <level>` with `low`, `medium`, `high`, `xhigh`, and `max`. The
isolated `claude auth status` reported first-party subscription authentication;
identity fields are intentionally omitted here.

Provider evidence came from the child JSONL transcripts written by Claude
Code, not from child self-identification. The retained fields are
`attributionAgent`, `message.model`, top-level `effort`,
`message.usage.service_tier`, `requestId`, `sessionId`, and `version`. Prompts,
responses, paths, Git state, timestamps, and unrelated transcript fields were
removed from the parser fixtures.

## Current provider contract

The current [model configuration documentation](https://code.claude.com/docs/en/model-config)
lists effort support by model. It reports `low`, `medium`, `high`, `xhigh`, and
`max` for Sonnet 5 and `low`, `medium`, `high`, and `max` for Sonnet 4.6. It
also documents the effective precedence used by these controls: the
`CLAUDE_CODE_EFFORT_LEVEL` environment value overrides `--effort`, session,
and settings; a subagent definition's effort overrides the session default but
not the environment; and `maxEffortLevel` caps the result.

The current [subagent documentation](https://code.claude.com/docs/en/sub-agents)
documents `model` and `effort` in subagent definitions and the `--agents`
JSON surface. The official
[Claude Code changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
lists installed release `2.1.278`; release `2.1.274` added effort telemetry to
tracing and fixed preservation of `--effort` in the agents view. These pages
were checked on 2026-09-20.

## Reproducible command shape

Every one-shot control used this command shape, with the recorded handle,
definition, marker, and optional precedence input substituted exactly:

```bash
cd "$PROJECT_ROOT"
CLAUDE_CONFIG_DIR="$LIVE_ROOT/config" \
  claude -p \
  --session-id "$SESSION_ID" \
  --output-format stream-json \
  --verbose \
  --model sonnet \
  --effort "$PARENT_EFFORT" \
  --agents "$AGENTS_JSON" \
  --tools Agent \
  --permission-mode dontAsk \
  "Use the $AGENT_NAME agent exactly once. Return its result."
```

`AGENTS_JSON` contained one generated definition with the exact role name,
`model: "sonnet"`, the recorded explicit effort (or no effort for the inherit
case), and a prompt to return only the recorded marker. The environment
override prepended `CLAUDE_CODE_EFFORT_LEVEL=medium`. The cap control added
`--settings "$LIVE_ROOT/cap-settings.json"`, whose complete non-secret content
was:

```json
{
  "effortLevel": "high",
  "maxEffortLevel": "medium",
  "permissions": { "defaultMode": "dontAsk" }
}
```

All recorded one-shot commands exited `0` and ended with provider result
subtype `success`.

## Deterministic controls

| Case                      | Session handle                         | Child transcript          | Provider role                                 | Model             | Effort   | Result              |
| ------------------------- | -------------------------------------- | ------------------------- | --------------------------------------------- | ----------------- | -------- | ------------------- |
| Implementer medium        | `11111111-1111-4111-8111-111111111111` | `agent-ac3df394da3087b1c` | `oat-phase-implementer-claude-sonnet-medium`  | `claude-sonnet-5` | `medium` | `CONTROL_MEDIUM_OK` |
| Reviewer high             | `22222222-2222-4222-8222-222222222222` | `agent-a4b70d469b2c0c6b9` | `oat-reviewer-claude-sonnet-high`             | `claude-sonnet-5` | `high`   | `CONTROL_HIGH_OK`   |
| Capped reviewer selection | `44444444-4444-4444-8444-444444444444` | `agent-ace5447dbd57daae7` | `oat-reviewer-claude-sonnet-high`             | `claude-sonnet-5` | `high`   | `CAPPED_REVIEW_OK`  |
| Default/inherit           | `55555555-5555-4555-8555-555555555555` | `agent-a81554b7b1787a958` | `oat-phase-implementer-claude-sonnet-inherit` | `claude-sonnet-5` | `high`   | `INHERIT_OK`        |
| Environment override      | `66666666-6666-4666-8666-666666666667` | `agent-a862b613e5df880c4` | `oat-reviewer-claude-sonnet-high`             | `claude-sonnet-5` | `medium` | `ENV_OVERRIDE_OK`   |
| Settings cap              | `77777777-7777-4777-8777-777777777777` | `agent-a966c57d0797b88b1` | `oat-reviewer-claude-sonnet-high`             | `claude-sonnet-5` | `medium` | `CAP_OVERRIDE_OK`   |

Every child reported service tier `standard` and Claude Code version `2.1.278`.
The environment and cap cases show a deliberate divergence from the generated
role name: both high-pinned roles ran at provider-reported `medium`, which is
the documented precedence behavior that dispatch validation must surface.
The inherit definition omitted effort and inherited the isolated setting
`effortLevel: high`.

The capped reviewer was first selected through the built OAT resolver with a
Balanced policy and a high ceiling. The resolver selected native variant
`oat-reviewer-claude-sonnet-high`, reported model axis `selected:sonnet`,
effort axis `selected:high`, mechanism `pinned-variant`, and emitted:

```text
Dispatch: scope=p03-live-capped-review action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:sonnet effort_axis=selected:high dispatch_policy=balanced dispatch_ceiling=high target=oat-reviewer-claude-sonnet-high
```

## Task-based awareness control

The accepted parent handle was
`33333333-3333-4333-8333-333333333333`. Its initial prompt was:

```text
Use the OAT task-based dispatch contract. Classify each task independently. Clear bounded implementation uses the lowest eligible normal route; ambiguous diagnosis involving causality and state transitions uses the deeper reasoning route. The eligible ladder has two exact native variants: oat-phase-implementer-claude-sonnet-medium and oat-phase-implementer-claude-sonnet-high. Invoke one eligible variant for each task. Do not solve either task yourself and do not infer effort from self-identification. Task A: In ./mechanical.txt replace the single value blue with green, then report the final line. Task B: Read ./state-machine.txt and identify the minimal root cause plus the smallest invariant-preserving fix; do not edit files for Task B. Return the two selected exact variant names and a one-sentence rationale for each after both agents finish.
```

The parent independently selected the medium variant for the single-value edit
and the high variant for the ambiguous retry/completion state machine. The
first accepted children lacked local file tools, and a second Task A attempt
could read but was denied Edit under `dontAsk`. Those failures remain in the
same provider transcript and are not counted as successful task outcomes.

The same parent handle was resumed without changing either selection or
expected result. The parent was given `Read` and `Edit`; the last Task A resume
used `acceptEdits` for the disposable fixture. Successful provider children
were:

| Task | Child transcript          | Provider role                                | Model             | Effort   | Observed outcome                                                                                                          |
| ---- | ------------------------- | -------------------------------------------- | ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| A    | `agent-a4f56feee33ca8cdf` | `oat-phase-implementer-claude-sonnet-medium` | `claude-sonnet-5` | `medium` | Changed the temporary fixture to `color=green`                                                                            |
| B    | `agent-a610e9d02c3cc0826` | `oat-phase-implementer-claude-sonnet-high`   | `claude-sonnet-5` | `high`   | Identified stale completion from attempt 1 as indistinguishable from attempt 2 and prescribed an attempt generation guard |

This verifies task-based selection and successful execution on one accepted
parent handle. The transcript only proves one current CLI/account/runtime
sample; it does not establish behavior for every supported model or service
tier.

## Assurance negative controls

Before the p03-t01 commit, each new guard was temporarily neutralized in the
focused smoke test and then restored:

| Neutralized guard                                             | Command outcome | Failure evidence                                                                |
| ------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------- |
| Same-model effort distinction (`notEqual` changed to `equal`) | exit `1`        | Actual medium and high generated variant names differed                         |
| Missing generated variant rejection (absence check removed)   | exit `1`        | Expected `is absent`; execution instead reached the later missing-model failure |
| Per-call model agreement (comparison removed)                 | exit `1`        | Expected exception was missing                                                  |

The restored focused smoke file passed all four tests. The exact temporary
patches and failure logs were retained only for the implementation run; the
committed test contains the active guards.

## Repository verification

Phase verification ran in the repository Definition of Done order with each
command's process exit captured directly. `origin/main` was fetched immediately
before the version gate. The project tracking files are root-owned and remained
read-only during p03; this artifact records the reproducible p03-t03 outcomes
for the root workflow to mirror into project tracking.

| Order | Command                                            | Exit | Evidence                                                              |
| ----- | -------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| 1     | `pnpm check`                                       | `0`  | 10/10 Turbo tasks; skill validation and root formatting passed        |
| 2     | `pnpm type-check`                                  | `0`  | 10/10 Turbo tasks                                                     |
| 3a    | `pnpm test`                                        | `1`  | Exposed three stale assertions from reviewed p01/p02 contract changes |
| 3b    | focused correction tests                           | `0`  | 135/135 tests passed                                                  |
| 3c    | `pnpm test`                                        | `0`  | 10/10 Turbo tasks; CLI 7,479/7,479 tests                              |
| 4a    | `pnpm build`                                       | `0`  | 5/5 Turbo tasks                                                       |
| 4b    | `pnpm build` after corrections                     | `0`  | 5/5 Turbo tasks; `>>> FULL TURBO`                                     |
| 5     | isolated `HOME` `pnpm exec turbo run test --force` | `0`  | 10/10 tasks, 0 cached, 10 `cache bypass, force executing` markers     |
| 6     | `pnpm test:smoke`                                  | `0`  | 163/163 tests                                                         |
| 7     | `pnpm test:skills`                                 | `0`  | 650/650 tests                                                         |
| 8     | `pnpm test:scripts`                                | `0`  | 1/1 test                                                              |
| 9     | `pnpm oat:validate-skills`                         | `0`  | 65 skills validated                                                   |
| 10    | `pnpm run check:skill-bumps`                       | `0`  | 10 changed skill/role checks                                          |
| 11    | `git fetch origin main`                            | `0`  | `origin/main` refreshed before version comparison                     |
| 12    | `pnpm release:check-versions`                      | `0`  | Version bump check passed                                             |
| 13    | `pnpm release:validate`                            | `0`  | Five public package tarballs validated                                |
| 14    | `pnpm build:docs`                                  | `0`  | 6/6 Turbo tasks; 72 static pages generated                            |
| 15    | `pnpm lint`                                        | `0`  | Package and root oxlint passed                                        |
| 16    | `pnpm format`                                      | `0`  | Package and root oxfmt checks passed                                  |

The initial authoritative test failure was corrected narrowly. The autonomy
contract's three HEAD mappings now point to the prompt-site hashes produced by
the reviewed lifecycle-gate wording. The lifecycle posture test expects the
reviewed phrase `present each configured relevant gate separately`, and the
reviewer contract test expects reviewed agent role version `1.2.9`. The focused
tests and complete `pnpm test` rerun passed after these updates.

The forced run used a fresh disposable home at
`$LIVE_ROOT/forced-test-home`. Every Turbo task printed an execution marker;
none was served from cache. Detailed command logs remained under the temporary
gate-log directory and were not committed.
