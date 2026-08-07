# Retro Evidence and Reconnaissance

## Required Reading Order

Inventory and read available evidence in this order:

1. `project-log.md` — always check first; use its append-only entries as
   workflow evidence.
2. `oat-execution-learnings.md` — when present, extract observations, impact,
   and recommendations without treating them as already proven.
3. Lifecycle artifacts — at minimum `implementation.md`, `state.md`, and
   `plan.md`; also read load-bearing `discovery.md`, `design.md`, `spec.md`,
   reviews, references, and evidence ledgers when present.
4. Session/run evidence — use the environment-appropriate route below.

Implementation outcomes and committed evidence outrank planned behavior.
Record each source as `used` or `unavailable` in retro frontmatter.
When an evidence family is partial, split it into truthful source entries, for
example `archived-review-markdown: unavailable` and `gate-receipts: used`
instead of `review-artifacts: unavailable`. Do not add a `partial` evidence
status. Derivative current-run reconnaissance transcripts are not original
project-run evidence.

Return and preserve stable evidence anchors for load-bearing claims: prefer
project-log event IDs, artifact headings, review paths, decision IDs, and
commit IDs over line numbers. Anchors supplement but never replace explanation;
the rendered incident narrative must remain understandable without opening the
referenced source.

## Environment Detection

### Cloud tooling available

Use the host's cloud run-info, events, and transcript/detail tooling. Fetch
relevant first-class child runs when their identifiers matter. Prefer bounded
reconnaissance over loading a giant transcript into root context.

### Local transcript access

Use the current host's local agent session transcript/history. Keep the search
bound to the current project/run and avoid quoting secrets or irrelevant user
history.

### No session access

State that session evidence is unavailable and continue from durable
artifacts. Do not infer tool output, operator corrections, or chronology that
exists only in a missing transcript.

## Transcript Caveat

Cloud or local transcript exports may omit terminal tool-result bodies. When
they do, committed ledgers, reviews, implementation notes, and project-log
entries are authoritative for runtime detail. A command mention is not proof
of its result. Mark an unresolved mechanism as inconclusive.

## Reconnaissance Lanes

Recon lanes are optional and read-only. Scale them to evidence volume:

- **Small project:** root reads evidence directly; no dispatch required.
- **Medium project:** two or three lanes, usually durable artifacts,
  transcript chronology, and dual-feedback classification.
- **Large or long-running project:** add focused lanes for implementation
  decisions, orchestration/liveness, failure taxonomy, and durable-guidance
  gaps.

Every lane returns compact conclusions with stable evidence anchors, uncertainty
labels, repo-improvement candidates, and OAT-upstream candidates. Lanes do not
write the retro or apply changes. Root synthesis verifies each load-bearing
anchor against committed artifacts before preserving it in the retro.

Minimum conceptual coverage, whether dispatched or performed directly:

1. durable project outcomes and decisions;
2. session chronology and operator corrections when available; and
3. explicit classification into repo feedback versus OAT upstream feedback.

## Evidence Labels

Use these labels consistently in synthesis:

- **Confirmed:** directly supported by durable evidence or matching independent
  sources.
- **Hypothesis:** plausible mechanism with incomplete proof; name what would
  confirm it.
- **Inconclusive:** evidence rules out some explanations but cannot establish
  the mechanism.

Prefer classification over blame. Do not convert a later successful run into
proof of an earlier failure's cause.
