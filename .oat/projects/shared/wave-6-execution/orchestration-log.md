---
oat_generated: false
purpose: orchestration-observations
oat_last_updated: 2026-09-08
---

# Orchestration Log: wave-6-execution

Running log of orchestration and subagent observations for this project. Two
audiences: (1) evaluating this wave's execution specifically, and (2) collecting
general feedback on OAT orchestration/tooling and on the `oat-wave-execute` skill
itself — bugs, friction, and things that worked well.

**Logging contract (for the orchestrator and any lifecycle skill touching this
project):** append an entry whenever something breaks, surprises, requires a
workaround, or works notably well. Structural entries (dispatch stamps, gate
results, STOP/park events, bootstrap statuses, disposition maps) are appended as
one-liners referencing artifacts by path; judgment entries are agent-authored.
Never delete entries; strike through with a correction note if one turns out
wrong. Version-stamp tool-related observations. Keep entries short and factual.
Run `pnpm format:fix` on this file after writing. Tag entries that bear on the
wave-skill's design with a **Skill signal (strengthens/contradicts/gap):** line.

---

### 2026-09-07 · structural · oat-wave-execute · preflight

Branch `wave-6-execution` cut from `origin/main` `1bef28fa1fb95e1473872ff9a511a6b42fa37889` (after the wave-5
close PR #276); `worktree:init`, `build`, `type-check` green. Recon (Explore,
opus) classified 1 PASS / 4 MINOR-DRIFT / 0 STOP and found three false plan
premises (p03 caller count, p04 pins and decisions) plus the `oat-*` filter gap
in the structural validator; refreshes applied to the five plans as dated
entries (`ceeac1149`) per `DR-260907-pre-dispatch-refreshes-live`. The previous
session's scratchpad was wiped by a session restart; the wave tooling was
recovered from the transcript. **Skill signal (strengthens):** premise probes
at recon (executing each plan's current-state claims on the built CLI) caught
three false premises before dispatch — the wave-5 p09 lesson applied.

---

### 2026-09-08 · structural · oat-wave-execute · p03 STOP → refresh → resume

p03 stopped before committing: the plan's prescribed `getNodeValue` path
regressed accepted nesting depth (`RangeError` above ≈2111 levels where
`parse` accepted ≈4792) and a null-prototype value broke a consumer's
`String()` coercion (`oat-config.ts:1252`) — both reproduced by the lane's
Codex round and confirmed by the lane. The STOP's own remedy (a normalization
layer) was applied as a dated post-STOP refresh to the plan (`03e1aa576`):
iterative materialization into plain objects with own-key `defineProperty`.
The lane resumed on its staged work. **Skill signal (strengthens):** the
"reproduce, report, never improvise" rule produced a precise design change
instead of a silent workaround; a STOP whose remedy is inside the plan's own
file scope can be closed with a dated refresh rather than a park. **Skill
signal (gap):** prototype-method greps do not find implicit-coercion hazards
(`String(x)`, template literals) — consumer audits for object-shape changes
should grep coercion sites too.

---

### 2026-09-08 · structural · oat-wave-execute · group 2 fan-in and closeout

Group 2 merged p04 first (`88a8d75df`) so p05's projected-copy reader could
adopt p04's exported resolver: the p05 worktree was rebased onto the merged
tip, its deferred Important landed as a third commit, and the original
reviewer verified it in a third round before the merge (`386a32b11`).
Lockstep retained at 0.2.64; the eight gates plus smoke, skills, and the root
test ran sequentially with exit codes (CLI 6242, 0 cached). Closeout: the five
backlog items archived with outcome summaries, five follow-ups filed (seven
across the wave), Deviations / Deferred Findings / Final Summary written, then
the root final review and the configured exit gate. **Skill signal
(strengthens):** merging the upstream lane of a sibling dependency first and
rebasing the dependent lane before its last fix let the dependent lane consume
the real shared contract instead of a fan-in reconciliation patch; the
reviewer running the suggested repair (rather than reasoning about it) settled
a brief-versus-implementation disagreement on evidence. **Skill signal
(gap):** a fix round that introduced a Critical (p02's `git check-ignore`
acceptance) shows fix-round briefs should restate the weaker-anywhere rule
explicitly, not only the findings to close.

---

### 2026-09-08 · structural · oat-wave-execute · root final review and Phase 06 fix round

The root final review (reconnaissance attempted: four consequential
safety-surface lanes, two Done-criteria lanes) passed with follow-ups —
0C/1I/5M/14m — after verifying the whole review chain by patch-id and
ledger head. The product findings became Phase 06, five tasks in two
parallel worktrees, merged in order and gated (thirteen gates, CLI 6287,
0 cached); the same reviewer verified every disposition at source in round 2
(PASS, 0C/0I/2M/7m). **Skill signal (strengthens):** a reviewer's suggested
fix is a hypothesis, not an instruction — lane B's Codex round showed the
sentinel substitution round 1 recommended for escaped pipes would have opened
three new holes (a header pipe hiding a whole table, a merged cell laundering a
rejected artifact into a `-` placeholder, a `0x01` byte aliasing a filename),
and the fail-closed stop that replaced it is strictly stronger; the review's
literal `! -e` was likewise insufficient (`! -L` is load-bearing for a dangling
symlink), proven by neutralization. **Skill signal (gap):** a redaction
rewrite needs an A/B against the function it replaces, not only new-case
tests — lane A's new terminators forwarded a path tail that the base function
redacted, caught only by Codex; the 17-case A/B table then became the
control. **Skill signal (gap):** the receive mirrored the artifact's declared
`Findings:` count (13) while the artifact listed 14 Minors, so one finding was
dropped silently until round 2 — the receive should count the bullets, not
trust the header. **Skill signal (strengthens):** the 82-skill `--json` sweep
and the 94-ledger differential are cheap invariants that make "byte-identical
except where a finding demands otherwise" checkable in seconds.

---
