---
oat_generated: false
purpose: orchestration-observations
oat_last_updated: 2026-08-26
---

# Orchestration Log: wave-2-execution

Running log of orchestration and subagent observations for this project (see
the Wave 1 log for the full logging contract). Append-only; structural entries
are one-liners referencing artifacts by path; tag skill-relevant entries with
**Skill signal (strengthens/contradicts/gap):**. Run `pnpm exec oxfmt --write`
on this file after writing.

---

## Entries

### 2026-08-26 · structural · oat-wave-execute · preflight

BASE_SHA=1bd5424b48af0f1cd385ce42246952d16ab438f7 (origin/main after W1 close);
`oat project new wave-2-execution --mode quick --no-commit`; `pnpm run
worktree:init` exit=0, `pnpm build` exit=0, `pnpm type-check` exit=0.

### 2026-08-26 · general · friction · worktree:init clobbers activeProject

`scripts/worktree/init.sh` copies `.oat/config.local.json` from the primary
checkout, so running it after `oat project new` reset `activeProject` to null;
restored with `oat config set activeProject`. Rule: run `worktree:init` before
scaffolding (W1 order), or re-set the pointer afterwards.
**Skill signal (gap):** the wave skill's Step 1/3 order should state
"bootstrap before scaffold" explicitly.

---

## End-of-run synthesis (pending — do not skip at project completion)

Write at project completion, BEFORE any archive step: convention verdicts with
evidence, rulings on every Skill-signal entry, adjustments for later waves as
rules, and a graduated-entries ledger; roll up into `summary.md` first.
