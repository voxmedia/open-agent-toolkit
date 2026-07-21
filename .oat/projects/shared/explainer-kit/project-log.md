---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-07-20
---

# Project Log: explainer-kit

This append-only log serves two audiences: the project team learning from this project's execution, and maintainers improving the general OAT workflow and tooling.

## Logging contract

Append when something breaks, surprises you, requires a workaround, or works notably well enough to preserve as do-not-regress evidence. Record evidence, not a running narrative. Prior entries are never edited or struck through; append corrections as a new judgment entry that references the original entry and explains the correction. Add a version note to tool-related observations. Create entries only with `oat project log append`; run `oat project log append --help` for the complete entry contract. Reference supporting artifacts by path instead of inlining them. Never record secret values such as tokens, keys, signed URLs, or credentials because this log rolls up into tracked surfaces; reference secrets by name or source, never by value.

Judgment entries default to 1–3 sentences covering what happened, the impact or workaround, and any follow-up. High-value entries may instead use this structured body:

```text
Observation: What happened and the supporting evidence.
Impact: Why it mattered or what workaround was required.
Recommendation: What should change or be preserved.
```

Shared tracked surfaces must be written only from the root checkout, never from parallel worktrees.

## Entry format

Judgment entries:

```text
### 2026-07-20 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-07-20 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-07-20 · structural · oat-project-implement · p-rev1

Phase implementer completed prev1-t01 through prev1-t03 and stopped before acceptance; see implementation.md Run 2 for the W6 archive and author-module boundary.

### 2026-07-21 · structural · oat-project-implement · prev1-t04

Generated Codex config formatting passed in commit 0895a8c0; Revision 1 now waits only on the W6 acceptance inputs recorded in implementation.md.

### 2026-07-21 · structural · oat-project-implement · prev1-t05

Expanded prev1-t05 to include packages/cli/src/validation/skills.test.ts after the mandated skill-version bump exposed its literal version pin; this is the load-bearing regression assertion for the planned bump.

### 2026-07-21 · structural · oat-project-implement · prev1-t05

Expanded prev1-t05 after the real W6 package exposed two acceptance-contract gaps: smoke harnesses must supply the required unattended author, and archive validation must keep canonical fact-base/theme hashes distinct from immutable file-byte hashes while still enforcing complete path coverage.

### 2026-07-21 · structural · oat-project-implement · 5f7206bd

Revision 1 implementation completed 43/43 tasks; packaged W6 acceptance and archive export passed. Fresh-context final review is next.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
