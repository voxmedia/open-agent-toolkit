---
skill: analyze
schema: analysis
topic: 'Codex max-depth relevance to Cursor subagent verification'
model: gpt-5
generated_at: 2026-07-11
input_type: architecture
context: references/cursor-gpt-5-6-subagent-verification.md
---

# Codex Max-Depth Relevance to Cursor Subagent Verification

## Executive Summary

The active `codex-subagent-max-depth` project is directly relevant to the
Cursor verification problem because it defines a clean provenance boundary:
an exact launcher-selected role and its materialized configuration establish
the configured invocation, while independently observed runtime identity is a
separate fact that may remain unavailable. Missing runtime telemetry must not
be mistaken for launch rejection.

That rule transfers to Cursor conceptually, but not mechanically.
`agents.max_depth` governs Codex native delegation and does not enable Cursor
Task model selection. For Cursor, the equivalent configured-invocation proof
must come from a structured Task tool event containing the exact model argument
and an accepted child launch. A successful child sentinel can prove Task
eligibility for that configured model argument, but it cannot independently
prove the backend model identity if Cursor may silently inherit or fall back.

The current Cursor evidence does not reach even the configured-invocation bar.
Five probes timed out after 10 seconds, while eight returned parent-agent prose
about model availability rather than a structured Task acceptance or
rejection. A second probe pass should therefore use stream-JSON, longer
timeouts, positive and negative controls, request/session IDs, and explicit
separation between Task-model acceptance and runtime-model confirmation.

## Methodology

The analysis read the active OAT project artifacts under
`codex-subagent-max-depth/.oat/projects/shared/codex-subagent-max-depth` and
compared their topology, provenance, fallback, and blocker decisions with this
project's durable Cursor verification evidence and verifier contract. It used
six analysis angles: adversarial, gap, opportunity, structural, consistency,
and audience clarity.

The analysis is limited by the public telemetry exposed by Cursor. Cursor's
documented CLI output includes structured session and request identifiers, but
the public documentation does not establish that every Task child reports its
actual backend model to the caller.

## Findings

## Per-Angle Findings

### Adversarial / Critical

- A sentinel proves that a child completed, but not necessarily that the
  backend honored the requested model if silent fallback is possible.
- Parent-agent prose such as "model unavailable" is not launcher-owned
  evidence. It may summarize an attempted tool call, infer availability, or
  omit a fallback.
- The original 10-second timeout is too short to distinguish an unavailable
  model from normal Task startup or network latency.
- The original pass had no known-good positive control. Without one, thirteen
  inconclusive outcomes could reflect the harness, account configuration, or
  Task availability rather than the candidate set.
- The active Codex project itself remains blocked by native-worker Git and
  filesystem write boundaries. This does not weaken its provenance model, but
  it means the max-depth implementation is not yet shipped evidence.

### Gap Analysis

- The Cursor evidence schema lacks structured Task call start/completion
  records and tool-call correlation IDs.
- It does not retain the parent session ID or request ID needed for Cursor-side
  diagnosis.
- It combines eligibility and runtime identity into one practical question.
  Those need separate evidence fields and conclusions.
- It does not include a known-good Task model control or an intentionally
  invalid slug control.
- The candidate inventory omits `gpt-5.6-sol-high-fast`, which multiple parent
  responses suggested. `gpt-5.6-terra-medium` was suggested too, but is already
  in the recommendation inventory and timed out.

### Opportunity Analysis

- Stream-JSON can turn the probe from prose interpretation into launcher-event
  verification while retaining request/session IDs for support escalation.
- A positive control can establish whether the current account, plan, and CLI
  can launch any explicitly selected Task model before interpreting candidate
  failures.
- A negative control can prove the verifier recognizes an actual model
  rejection rather than classifying every non-sentinel response as
  inconclusive.
- The Dispatch Report V1 provenance split already provides the vocabulary
  needed to represent configured Task selection separately from runtime
  identity.
- The next pass can run immediately; the recorded 2026-07-18 date is merely a
  retry cadence, not an external release milestone.

### Structural / Organizational

The two projects align around a three-layer evidence model:

1. **Policy and resolution:** OAT selected an exact configured target.
2. **Launcher-owned invocation:** the host received or accepted the exact role
   or Task model argument.
3. **Runtime-observed identity:** trusted host telemetry identifies the actual
   producer model.

Codex native delegation can treat exact `agent_type` acceptance plus the
materialized role as configured-invocation evidence. Cursor requires the
analogous structured Task event; a headless parent command alone is not the
launcher boundary.

### Consistency / Coherence

- Both projects correctly reject worker self-report as authoritative model
  evidence.
- Both distinguish an accepted child that later fails from a launch-selection
  rejection.
- The current Cursor verifier is consistent with the fail-closed principle by
  retaining ambiguous outcomes as `unvalidated`.
- The inconsistency is terminological: a future sentinel success should be
  described as configured Task-model acceptance or eligibility, not as
  independently observed runtime model identity.
- `agents.max_depth=2` is correctly scoped to Codex and should not appear in
  Cursor remediation guidance.

### Audience / Clarity

The current term `unvalidated` is safe but underspecified. Operators need to
know whether the uncertainty came from timeout, no Task call, explicit Task
rejection, accepted Task without runtime identity, or missing host telemetry.
The report should preserve the stable availability vocabulary while adding an
evidence breakdown such as:

- `taskSelection: not-observed | accepted | rejected`
- `childCompletion: not-observed | completed | failed | timed-out`
- `runtimeIdentity: not-reported | reported`
- `requestId` and `sessionId`

## Cross-Angle Synthesis

The recurring theme is that configuration, launcher acceptance, and runtime
identity are different authorities. The max-depth project makes this explicit
for Codex; the Cursor probe should adopt the same separation instead of
requiring one sentinel to answer every question.

The present Cursor results are not evidence that all thirteen slugs are bad.
They are evidence that the text-mode, 10-second protocol did not observe an
accepted exact Task launch. A stronger protocol can improve eligibility
evidence immediately. Definitive backend model identity will still require
Cursor-owned child telemetry or support confirmation tied to a request ID.

## Prioritized Recommendations

| Priority | Recommendation                                                                       | Impact | Effort | Angles                           |
| -------- | ------------------------------------------------------------------------------------ | ------ | ------ | -------------------------------- |
| 1        | Capture stream-JSON Task start/completion, tool-call IDs, session ID, and request ID | High   | Medium | Gap, structural, adversarial     |
| 2        | Add a known-good positive control and intentionally invalid negative control         | High   | Low    | Adversarial, gap, opportunity    |
| 3        | Increase the per-probe timeout to 60-120 seconds and record timeout stage            | High   | Low    | Adversarial, clarity             |
| 4        | Separate Task-model acceptance from runtime-model confirmation in evidence           | High   | Medium | Consistency, structural, clarity |
| 5        | Probe the 13 recommended values plus `gpt-5.6-sol-high-fast` once each               | Medium | Medium | Gap, opportunity                 |
| 6        | Escalate successful or ambiguous request IDs to Cursor for backend confirmation      | Medium | Medium | Adversarial, gap                 |

The first four recommendations should be implemented before another full
candidate pass. Start with controls: if a known-good model cannot produce a
structured accepted Task and sentinel, stop and classify the environment or
harness as unavailable rather than consuming the entire candidate inventory.
If controls behave correctly, run one probe per candidate with no within-pass
retry, preserve the raw sanitized stream, and derive outcomes mechanically.

Treat a structured accepted Task plus sentinel as proof that the exact model
argument is Task-eligible for that account and client at that time. Report the
actual runtime model as `not-reported` unless Cursor emits trusted child-model
metadata or confirms it from the captured request ID.

## Sources & References

- Active max-depth project discovery:
  `/Users/tstang/orca/workspaces/open-agent-toolkit/codex-subagent-max-depth/.oat/projects/shared/codex-subagent-max-depth/discovery.md`
- Active max-depth project design:
  `/Users/tstang/orca/workspaces/open-agent-toolkit/codex-subagent-max-depth/.oat/projects/shared/codex-subagent-max-depth/design.md`
- Active max-depth implementation state:
  `/Users/tstang/orca/workspaces/open-agent-toolkit/codex-subagent-max-depth/.oat/projects/shared/codex-subagent-max-depth/implementation.md`
- Current Cursor evidence:
  `references/cursor-gpt-5-6-subagent-verification.md`
- Durable Cursor evidence:
  `.oat/repo/reference/project-summaries/20260711-cursor-gpt-5-6-subagent-verification.md`
- Cursor CLI output format:
  `https://docs.cursor.com/en/cli/reference/output-format`
- Cursor staff discussion of plan-dependent model selection, request-ID
  diagnosis, and fallback behavior:
  `https://forum.cursor.com/t/task-tool-model-parameter-only-accepts-fast-cannot-specify-model-ids-for-subagents/156736`
