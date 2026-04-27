---
oat_generated: true
oat_generated_at: 2026-04-27
oat_review_scope: final
oat_review_type: code
oat_review_invocation: auto
oat_project: .oat/projects/shared/skill-cli-migration
oat_verdict: pass
---

# Code Review: final (skill-cli-migration)

**Reviewed:** 2026-04-27
**Scope:** Entire branch `feat/skill-cli-migration` vs `main` — Touchpoint B HiLL auto-review at end of final implementation phase.
**Workflow mode:** quick
**Files reviewed:** 22 changed (8 SKILL.md, 1 vitest test, 5 lockstep package.json files, 1 regenerated public-package-versions asset, 7 OAT bookkeeping artifacts)
**Commits:** 18 commits in `main..feat/skill-cli-migration` (4 quick-start/bookkeeping + 14 implementation/bookkeeping)
**Prior phase reviews:** p01 (pass, 1 minor), p02 (pass, 2 minor), p03 (pass, 2 minor), p04 (pass, 2 minor)

## Summary

The skill-cli-migration project ships exactly the migration specified in the plan: 7 in-scope OAT skills (plus the canonical pattern doc in `create-oat-skill`) now resolve project state via `oat --json project status` with an `npx @open-agent-toolkit/cli` fallback, in place of hand-parsing `state.md` frontmatter with `grep | awk`. The canonical preamble — `if command -v oat >/dev/null 2>&1; then ... else ...; fi` plus `STATUS_JSON=...` and `# Extract individual fields...` comment — is byte-equivalent across all eight files (verified at the lines listed below). Read paths only; no writes touched; no greps against `plan.md` / `implementation.md` / `project-index.md` / `summary.md` modified. Lockstep version bump applied correctly: all five public packages at `0.0.51`, every touched SKILL.md `version:` bumped exactly once. `pnpm release:validate` passes (5/5 packages), `pnpm lint` passes, the targeted vitest contract test passes (4/4), and `pnpm test` is fully cached green. The four prior-phase Minor findings remain as documented follow-ups (cross-skill bash-default consistency, indented preamble in `oat-project-reconcile`, plan-text bug for p04-t02 PATH trim, pre-existing tracked-but-gitignored manifest); none warrant elevation. Zero Critical, zero Important findings.

**Verdict: pass.**

## Findings

### Critical

None.

### Important

None.

### Minor (carryover from prior phase reviews — accepted as follow-ups)

These were already recorded against earlier phase reviews and remain in the same state on the branch tip. Listed here only so the final review captures the complete carry-forward state; no action is required for this PR.

- **Cross-skill bash-default inconsistency on `WORKFLOW_MODE`** (`.agents/skills/oat-project-pr-progress/SKILL.md:176`)
  - Status: carried from p02-t02. `oat-project-pr-progress` retains `WORKFLOW_MODE=${WORKFLOW_MODE:-spec-driven}` after the jq extraction; `oat-project-plan`, `oat-project-pr-final` (p03) drop it. Functionally inert in normal operation (jq emits literal `null` so `:-` never fires); cosmetic divergence only. Originally flagged in `reviews/p02-code-review-2026-04-27.md` and again in `reviews/p03-code-review-2026-04-27.md`.
  - Suggestion: pick one rule and sweep in a follow-up. Plan intent reads as "drop it"; that would mean deleting the line in `oat-project-pr-progress` and bumping its version once.

- **Three unused bash extractions in `oat-project-progress` drift-detection block** (`.agents/skills/oat-project-progress/SKILL.md:210-212`)
  - Status: carried from p02-t01. The plan's Step-1 text named PHASE / PHASE_STATUS / WORKFLOW_MODE greps that did not exist in the pre-scope file; the implementer faithfully added the matching jq extractions, but only `LAST_SHA` (line 222) is consumed by this block. Inert at runtime; a YAGNI trim opportunity. The canonical preamble in `create-oat-skill` keeps the same three vars for teaching value, so leaving them mirrored here is defensible.
  - Suggestion: either trim the unused trio to just the consumed `LAST_SHA` or add a one-line comment explaining the parity intent.

- **Indented preamble in `oat-project-reconcile`** (`.agents/skills/oat-project-reconcile/SKILL.md:108-122`)
  - Status: carried from p03-t04. Preamble is nested inside a numbered list item so each line carries 3-space leading indentation. Bash tolerates leading whitespace before commands and the fence prevents Markdown re-interpretation, so it runs correctly. Strictly cosmetic.

- **Plan-text bug: literal `env PATH="/usr/bin:/bin"` in p04-t02 cannot produce documented `quick` stdout on nvm hosts** (`plan.md:440-450`)
  - Status: carried from p04. The literal command in the plan trims `npx` along with `oat`, so the `2>/dev/null || echo "{}"` swallow path renders `null`, not `quick`. The implementer's Run-B variant (PATH stripped of only the `oat`-bearing directory) provides true end-to-end fallback evidence in `implementation.md`. The plan-text gap is a backlog candidate, not a phase blocker.

- **Pre-existing: `packages/cli/assets/public-package-versions.json` is gitignored but tracked** (`packages/cli/assets/public-package-versions.json`)
  - Status: carried from p04. Not introduced by this branch; release validation regenerates and confirms the asset matches `package.json` values (4 entries: cli, docs-config, docs-theme, docs-transforms — matching the `packageNames` list in `packages/cli/scripts/bundle-assets.sh` which intentionally omits `control-plane`). Recommend a follow-up to either negate the gitignore rule for the manifest file or treat it as a build artifact and untrack it.

## Requirements / Plan Alignment

**Evidence sources used (quick mode):** `plan.md`, `discovery.md`, `implementation.md`, `.agents/skills/create-oat-skill/SKILL.md` (canonical preamble source), live diff against `main`, live `oat --json project status` probe, prior phase reviews. No `spec.md` / `design.md` (quick mode — not a finding).

### Completeness against plan goal

Goal (per `plan.md`): "Migrate skills that hand-parse `state.md` frontmatter with `grep`/`awk` to query `oat --json project status` instead, with an inline `npx @open-agent-toolkit/cli` fallback." Discovery enumerated 7 in-scope skills.

| In-scope skill (per discovery)   | Migration status | Preamble at                                                                                           |
| -------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| `oat-project-progress`           | implemented      | `.agents/skills/oat-project-progress/SKILL.md:197-212`                                                |
| `oat-project-pr-progress`        | implemented      | `.agents/skills/oat-project-pr-progress/SKILL.md:162-176`                                             |
| `oat-project-pr-final`           | implemented      | `.agents/skills/oat-project-pr-final/SKILL.md:137-150`                                                |
| `oat-project-plan`               | implemented      | `.agents/skills/oat-project-plan/SKILL.md:108-121`                                                    |
| `oat-project-review-provide`     | implemented      | `.agents/skills/oat-project-review-provide/SKILL.md:125-140` and `:263-276` (2 blocks, plan-required) |
| `oat-project-reconcile`          | implemented      | `.agents/skills/oat-project-reconcile/SKILL.md:108-122`                                               |
| `oat-project-complete`           | implemented      | `.agents/skills/oat-project-complete/SKILL.md:186-199`                                                |
| `create-oat-skill` (pattern doc) | implemented      | `.agents/skills/create-oat-skill/SKILL.md:175-204` ("Reading project state" section + Contract Notes) |

Regression check (must return zero matches): `grep -nrE "^[[:space:]]*[A-Z_]+=\\$\\(grep .*state\\.md" .agents/skills/oat-project-*/SKILL.md` → **zero matches**. Broader sweep `grep -nE 'grep[^|]*state\.md' .agents/skills/oat-project-*/SKILL.md` → **zero matches**. Every shell-level `state.md` grep in the seven in-scope skills has been migrated.

### Consistency: canonical preamble byte-equivalence

The 11-line preamble block (`# Resolve oat CLI...` comment + `if/else/fi` resolver + `# Extract individual fields...` comment) is **byte-equivalent** across every migrated skill and the canonical `create-oat-skill` source. Verified by reading lines `175-189` of `create-oat-skill/SKILL.md` and the parallel block in each migrated skill. The only legitimate divergences are:

- **Field selection after the comment block.** Each skill extracts only the fields it consumes (e.g., `oat-project-pr-progress` extracts only `WORKFLOW_MODE`; `oat-project-progress` extracts `PHASE`, `PHASE_STATUS`, `WORKFLOW_MODE`, and `LAST_SHA`). This is by design — the plan specifies "Replace each `grep | awk` assignment with `jq -r '.project.<field>'`."
- **Indentation in `oat-project-reconcile`.** Preamble lives inside a numbered list item, so each line carries 3 leading spaces. Inert at runtime. Captured as Minor #3 above.
- **`WORKFLOW_MODE=${WORKFLOW_MODE:-spec-driven}` post-jq line in `oat-project-pr-progress` only.** Captured as Minor #1 above.

These three divergences are cosmetic / scope-related, not preamble-corruption. The canonical contract is honored.

### Scope discipline: read paths only

Sweep against the migrated skills for write-path collateral:

- `git diff main..feat/skill-cli-migration -- .agents/skills/oat-project-pr-final/SKILL.md` shows the only frontmatter-write hunks (`oat_pr_status`, `oat_pr_url` updates around line 377) are unchanged.
- `oat-project-complete` retains `oat_docs_updated` write prose at `:214`-`:219` and is not modified.
- `oat-project-plan` write paths (phase advance, plan-source metadata) untouched.
- `grep -lr "plan\.md\|implementation\.md\|project-index\.md\|summary\.md"` against the diff shows only **read-only** prose mentions; no greps against those files were modified or added.

Read-path-only contract honored.

### Release readiness

| Check                                                          | Result | Evidence                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm release:validate` exits 0                                | pass   | "release validation passed for 5 public packages" (cli, control-plane, docs-config, docs-theme, docs-transforms all at 0.0.51)                                                                                                                                                                                                        |
| All five lockstep packages at 0.0.51                           | pass   | `grep '"version"' packages/*/package.json` → all five report `0.0.51` (was `0.0.50` on main)                                                                                                                                                                                                                                          |
| `packages/cli/assets/public-package-versions.json` regenerated | pass   | All 4 manifest entries (cli, docs-config, docs-theme, docs-transforms) at 0.0.51; matches `bundle-assets.sh` `packageNames` list (control-plane intentionally omitted from this asset).                                                                                                                                               |
| No other packages bumped                                       | pass   | `git diff --name-only main..feat/skill-cli-migration -- 'packages/*/package.json'` returns exactly the five lockstep files                                                                                                                                                                                                            |
| Each touched SKILL.md `version:` bumped exactly once vs main   | pass   | `create-oat-skill` 1.2.0→1.2.1; `oat-project-progress` 1.2.2→1.2.3; `oat-project-pr-progress` 1.2.0→1.2.1; `oat-project-plan` 1.3.1→1.3.2; `oat-project-pr-final` 1.3.3→1.3.4; `oat-project-review-provide` 1.3.1→1.3.2; `oat-project-reconcile` 1.0.0→1.0.1; `oat-project-complete` 1.4.3→1.4.4. Eight files, eight bumps, one each. |
| `pnpm lint` clean                                              | pass   | "Found 0 warnings and 0 errors" across 10 lint tasks (full turbo cache)                                                                                                                                                                                                                                                               |
| `pnpm test` clean                                              | pass   | 10/10 tasks cached pass; targeted re-run of `status.test.ts` → 4/4 pass live                                                                                                                                                                                                                                                          |

### Test contract integrity

`MIGRATED_FIELDS` in `packages/cli/src/commands/project/status.test.ts:16-26` lists nine paths: `project.{name,path,phase,phaseStatus,workflowMode,docsUpdated,lastCommit,prStatus,prUrl}`.

Cross-reference against every `jq -r '.project.<field>'` extraction landed on this branch:

| jq path consumed by skills | In `MIGRATED_FIELDS`? | Consumed by                                                                                                                                                      |
| -------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.project.workflowMode`    | yes                   | `create-oat-skill` (canonical), `oat-project-progress`, `oat-project-pr-progress`, `oat-project-plan`, `oat-project-pr-final`, `oat-project-review-provide` (×2) |
| `.project.phase`           | yes                   | `create-oat-skill` (canonical), `oat-project-progress`, `oat-project-review-provide`, `oat-project-reconcile`                                                    |
| `.project.phaseStatus`     | yes                   | `create-oat-skill` (canonical), `oat-project-progress`, `oat-project-review-provide`, `oat-project-reconcile`                                                    |
| `.project.docsUpdated`     | yes                   | `oat-project-complete`                                                                                                                                           |
| `.project.lastCommit`      | yes                   | `oat-project-progress`                                                                                                                                           |
| `.project.name`            | n/a (none in skills)  | covered defensively in test, not consumed by any migrated skill                                                                                                  |
| `.project.path`            | n/a (none in skills)  | covered defensively in test, not consumed by any migrated skill                                                                                                  |
| `.project.prStatus`        | n/a (none in skills)  | covered defensively in test, anticipated for pr-final/pr-progress writes                                                                                         |
| `.project.prUrl`           | n/a (none in skills)  | covered defensively in test, anticipated for pr-final/pr-progress writes                                                                                         |

Every field actually consumed by a migrated skill is covered. The four extras (`name`, `path`, `prStatus`, `prUrl`) are protective coverage and do not represent test/skill drift. The contract test uses a `hasPath` walker (correctly distinguishes "key absent" from "value is null"), so a future CLI key removal would surface as a real test failure rather than a silent toMatchObject pass. **Contract integrity confirmed.**

### Behavioral parity (null-sentinel)

Live probe in this worktree (where `state.md` has `oat_docs_updated: null` and `oat_last_commit` populated):

```bash
$ oat --json project status | jq -r '.project.docsUpdated'
null
$ grep "^oat_docs_updated:" .oat/projects/shared/skill-cli-migration/state.md | awk '{print $2}'
null
```

Both paths emit the literal string `null`. The plan's "single sentinel `null` across success and error paths" contract is preserved. The only behavioral divergence is the `null`-vs-empty case in degenerate CLI-failure / missing-field paths, which the plan explicitly documents and the prior reviews evaluated as an accepted contract change. The `[[ "$DOCS_UPDATED" == "null" ]]` guard in `oat-project-complete:204` correctly handles the literal sentinel.

`implementation.md` p04-t01 records field-by-field parity for every migrated skill (workflowMode/phase/phaseStatus/docsUpdated/lastCommit), and p04-t02 documents the npx fallback exercise (Run B end-to-end produced `quick`, exit 0). The smoke-test evidence is convincing.

### Carryover concern triage

Each prior-phase Minor finding has been reassessed against the branch tip:

| Source review | Finding                                                                                         | Final disposition                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| p01           | `STATUS_JSON` could fall through silently if CLI emits non-JSON to stdout                       | accepted; p01-t02 contract test is the safety net. Out of scope for this PR.                             |
| p02-t01       | Three unused bash extractions in `oat-project-progress` drift-detection block                   | accepted as follow-up; matches canonical preamble for teaching value. Inert.                             |
| p02-t02       | Dead `:-spec-driven` default after `jq -r '.project.workflowMode'` in `oat-project-pr-progress` | accepted as follow-up; cross-skill consistency sweep recommended.                                        |
| p03           | Inconsistent treatment of post-jq bash default (kept in pr-progress, dropped in plan/pr-final)  | same finding as p02-t02 from a different angle; accepted as follow-up.                                   |
| p03           | Indented preamble in `oat-project-reconcile`                                                    | accepted; cosmetic only, runtime-safe.                                                                   |
| p04           | Plan-text bug: literal `env PATH="/usr/bin:/bin"` in p04-t02 doesn't produce documented `quick` | accepted; Run-B in implementation.md is the canonical evidence; plan-text update is a backlog candidate. |
| p04           | `packages/cli/assets/public-package-versions.json` tracked-but-gitignored                       | accepted; pre-existing repo quirk, regenerated cleanly by release-validate.                              |

**No carryover finding warrants elevation to Important or Critical.** All seven are either documentation/cleanup paper-cuts or pre-existing repo quirks; none change runtime behavior or block the PR. The cross-skill consistency sweep (Minor #1 above) is the most actionable follow-up and is naturally a single-commit fix in a future PR.

### Extra Work (not in declared requirements)

None. The diff is minimal and surgical:

- 8 SKILL.md edits (the 7 in-scope skills + canonical pattern doc).
- 1 vitest contract test addition.
- 5 lockstep package.json version bumps.
- 1 regenerated public-package-versions asset.
- 7 OAT bookkeeping artifacts (state.md updates, review records, implementation log).

`git diff --name-only main..feat/skill-cli-migration` shows exactly these files. No drive-by edits, no scope creep.

### Commit subject conformance

| Commit     | Subject                                                                                     | Plan task |
| ---------- | ------------------------------------------------------------------------------------------- | --------- |
| `19b0bd35` | `docs(p01-t01): document oat --json project status preamble pattern`                        | p01-t01   |
| `92e6b53c` | `test(p01-t02): lock JSON contract for skill migration`                                     | p01-t02   |
| `e80f1a58` | `refactor(p02-t01): oat-project-progress reads state via oat --json`                        | p02-t01   |
| `742092f7` | `refactor(p02-t02): oat-project-pr-progress reads state via oat --json`                     | p02-t02   |
| `362e2605` | `refactor(p03-t01): oat-project-plan reads state via oat --json (read path only)`           | p03-t01   |
| `87b1ac90` | `refactor(p03-t02): oat-project-pr-final reads state via oat --json (read path only)`       | p03-t02   |
| `e13c6a4c` | `refactor(p03-t03): oat-project-review-provide reads state via oat --json (read path only)` | p03-t03   |
| `2d86cbc9` | `refactor(p03-t04): oat-project-reconcile reads state via oat --json (read path only)`      | p03-t04   |
| `d613c425` | `refactor(p03-t05): oat-project-complete reads state via oat --json (read path only)`       | p03-t05   |
| `d94874f1` | `chore(p04-t01): verify migrated skill preambles against live project`                      | p04-t01   |
| `a6096b93` | `chore(p04-t02): verify npx fallback branch for oat --json`                                 | p04-t02   |
| `e07c871e` | `chore(p04-t03): lockstep version bump for skill-cli-migration`                             | p04-t03   |

Plus six bookkeeping/quick-start commits (`fbceaf89`, `419d1109`, `8971a099`, `9fb71ba8`, `e2b234bb`, `0b01b0c9`, `d5e3f1d8`, `333cce60`, `cddbe6f6`) — all `chore(oat):`-scoped and consistent with the project's commit convention. Subjects line up 1:1 with plan tasks.

## Verification Commands

Run from the repo root to re-verify the implementation:

```bash
# 1. No remaining state.md greps in the migrated skills (must return zero matches)
grep -nrE "^[[:space:]]*[A-Z_]+=\\\$\\(grep .*state\\.md" .agents/skills/oat-project-*/SKILL.md
grep -nE 'grep[^|]*state\.md' .agents/skills/oat-project-*/SKILL.md

# 2. Canonical preamble lands in every migrated skill
for f in .agents/skills/create-oat-skill/SKILL.md \
         .agents/skills/oat-project-progress/SKILL.md \
         .agents/skills/oat-project-pr-progress/SKILL.md \
         .agents/skills/oat-project-plan/SKILL.md \
         .agents/skills/oat-project-pr-final/SKILL.md \
         .agents/skills/oat-project-review-provide/SKILL.md \
         .agents/skills/oat-project-reconcile/SKILL.md \
         .agents/skills/oat-project-complete/SKILL.md; do
  echo "=== $f ==="
  grep -c 'command -v oat' "$f"
done
# Expected: every file >= 1 (review-provide has 2 preambles, others 1).

# 3. Lockstep version bump
grep -H '"version"' packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json
# Expected: all five report 0.0.51.

# 4. Skill version bumps
for f in .agents/skills/create-oat-skill/SKILL.md \
         .agents/skills/oat-project-progress/SKILL.md \
         .agents/skills/oat-project-pr-progress/SKILL.md \
         .agents/skills/oat-project-plan/SKILL.md \
         .agents/skills/oat-project-pr-final/SKILL.md \
         .agents/skills/oat-project-review-provide/SKILL.md \
         .agents/skills/oat-project-reconcile/SKILL.md \
         .agents/skills/oat-project-complete/SKILL.md; do
  printf "%-60s " "$f"
  grep -E '^version:' "$f"
done

# 5. Release validation, lint, type-check, contract test
pnpm release:validate
pnpm lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts

# 6. Behavioral parity probe (jq vs grep+awk) for every migrated field
STATE=.oat/projects/shared/skill-cli-migration/state.md
JSON=$(oat --json project status)
for pair in 'workflowMode|oat_workflow_mode' 'phase|oat_phase' 'phaseStatus|oat_phase_status' 'docsUpdated|oat_docs_updated' 'lastCommit|oat_last_commit'; do
  jq_field="${pair%|*}"; grep_field="${pair#*|}"
  jq_val=$(echo "$JSON" | jq -r ".project.${jq_field}")
  grep_val=$(grep "^${grep_field}:" "$STATE" | head -1 | awk '{print $2}')
  printf "%-15s jq=%-12s grep=%s\n" "$jq_field" "$jq_val" "$grep_val"
done

# 7. Npx fallback end-to-end (Run B variant — true end-to-end, retains node tooling)
OAT_DIR="$(dirname "$(command -v oat)")"
env PATH="$(echo "$PATH" | tr ':' '\n' | grep -v "^$OAT_DIR$" | paste -sd: -)" bash -lc '
  if command -v oat >/dev/null 2>&1; then
    echo "Unexpected: oat resolved" >&2; exit 1
  fi
  STATUS_JSON=$(npx @open-agent-toolkit/cli --json project status 2>/dev/null || echo "{}")
  echo "$STATUS_JSON" | jq -r ".project.workflowMode"
'
# Expected stdout: quick   Exit: 0
```

## Recommended Next Step

**Verdict: pass** (zero Critical, zero Important findings). The branch is ready for `oat-project-pr-final` and merge.

All five carried-over Minor findings (cross-skill bash-default consistency, indented preamble, dead bash default, plan-text bug for p04-t02 PATH trim, pre-existing tracked-but-gitignored manifest) are accepted as follow-up backlog candidates. No `oat-project-review-receive` plan-task injection is required — there are no actionable Medium/Important findings to convert.
