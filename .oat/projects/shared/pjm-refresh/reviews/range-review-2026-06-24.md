---
oat_generated: true
oat_generated_at: 2026-06-24
oat_review_scope: 619b9234593c83493f8b3ac6e3779831217994c4..HEAD
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/pjm-refresh
---

# Code Review: fixes since last independent final review

**Reviewed:** 2026-06-24
**Scope:** Fix-range review for `619b9234593c83493f8b3ac6e3779831217994c4..HEAD`
**Files reviewed:** 41 changed files in range, plus required project artifacts and cited review artifacts
**Commits:** 30 commits
**Verdict:** Pass

## Summary

The prior final-review Important finding is resolved: the bundled PJM migration prompt now uses the CLI's singular decision-index marker pair and five-column `Legacy` header, and the regression test derives the expected contract from the live decision-index renderer. The p-rev1, p-rev2, and p-rev3 fixes are materially correct: command rename, key-decision promotion guidance, uppercase `DR-`/`BL-` IDs, 30-character slug behavior, real-world decision parsing, dogfood migration safety checks, content-idempotent index regeneration, template-frontmatter stripping, absent-legacy no-op, README allowance, and prompt sequence updates are covered by source and tests. One minor stale `bl-XXXX` placeholder remains in brainstorm handoff wording; it does not block the range because the downstream backlog skill and CLI still generate the correct `BL-YYMMDD-slug` record.

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

- **Brainstorm backlog handoff still says `bl-XXXX`** (`.agents/skills/oat-brainstorm/SKILL.md:369`)
  - Issue: The live brainstorm skill still tells the user, "Confirm to write this to a new bl-XXXX file," and the same stale phrase remains in `.agents/skills/oat-brainstorm/references/destinations.md:105`, the dogfood transcript at `.agents/skills/oat-brainstorm/references/dogfood-results.md:390`, and bundled mirrors under `packages/cli/assets/skills/oat-brainstorm/`. This is lower impact than the p-rev2 Important that was fixed in the PJM backlog/decision skills, because this wording only frames the brainstorm confirmation and then hands off to `oat-pjm-add-backlog-item`, whose CLI-driven ID generation is correct. It is still stale shipped guidance after the `BL-YYMMDD-slug` convention.
  - Suggestion: Replace the placeholder wording with `BL-YYMMDD-slug` (or "new backlog item file" if a literal generated ID is not known yet) in the brainstorm skill, destinations reference, dogfood transcript, and bundled mirrors by running the bundle script.

## Requirements/Design Alignment

**Evidence sources used:** `.oat/projects/shared/pjm-refresh/discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`, `summary.md`, prior review `.oat/projects/shared/pjm-refresh/reviews/archived/final-review-2026-06-23-v2.md`, archived p-rev2/p-rev3 reviews, and changed files in `619b9234593c83493f8b3ac6e3779831217994c4..HEAD`.

### Requirements Coverage

| Requirement / fix contract                                        | Status      | Notes                                                                                                                                                                            |
| ----------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---- | ------ | ----- | ------ | ------------------------------------------------------------------ |
| Prior final I1 / p04-t04 migration prompt decision-index contract | implemented | Prompt now teaches `<!-- OAT DECISION-INDEX -->` / `<!-- END OAT DECISION-INDEX -->` and `                                                                                       | ID  | Date | Status | Title | Legacy | `; bundle-consistency test imports the live markers/header source. |
| prev1-t01 decision verb rename                                    | implemented | `oat decision regenerate-index` is the registered subcommand; docs, skill, prompt, help snapshot, and command guidance use the new verb.                                         |
| prev1-t02 summary key-decision promotion                          | implemented | `oat-project-summary` now gates on PJM install, initializes decisions, and dedups by exact slug after stripping the fixed `DR-<6 digits>-` prefix.                               |
| prev2-t01 uppercase IDs and 30-char slug                          | implemented | Shared slug helper truncates at a word boundary, trims trailing stop words, and ID helpers emit `DR-` / `BL-` prefixes.                                                          |
| prev2-t02 propagation of uppercase ID guidance                    | partial     | Core prompt, PJM skills, roadmap template, docs, and bundled assets are corrected. Minor stale `bl-XXXX` brainstorm handoff wording remains.                                     |
| prev2-t03 real ADR/DR parser shape                                | implemented | Decision migration parses `### ADR/DR-NNN` headings with bold `Date`/`Status` fields and preserves body plus `legacy_id`.                                                        |
| prev2-t04 `pjm migrate --apply` dogfood atomicity                 | implemented | Decision parse/delete preflight runs before mechanical mutation; abort-path test proves the dogfood zero-section failure leaves the tree byte-identical.                         |
| prev2-t05 doctor template-frontmatter scan                        | implemented | Doctor scans canonical files plus migrated backlog items, archived items, and decision records.                                                                                  |
| prev2-t06 content-idempotent regenerate-index                     | implemented | Shared managed-index helper preserves formatter-padded but content-equal managed blocks for both backlog and decisions; genuine content changes rewrite.                         |
| prev3-t01 strip template frontmatter during migration             | implemented | PJM backlog migration deletes template marker keys before rendering migrated records and doctor passes on the migrated tree.                                                     |
| prev3-t02 exclude trailing decision boilerplate                   | implemented | Decision parser bounds sections at the next level-2 heading as well as the next ADR/DR heading.                                                                                  |
| prev3-t03 absent legacy decision no-op                            | implemented | Standalone `decision migrate` and `--dry-run` return a clean no-op when `decision-record.md` is absent while preserving present-but-unparseable delete safety.                   |
| prev3-t04 top-level README allowance                              | implemented | Doctor allows top-level `README.md` and still warns on genuinely unknown files.                                                                                                  |
| prev3-t05 migration prompt sequence                               | implemented | Prompt now says `pjm migrate --apply` is one-shot end-to-end, adds version-gate guidance, documents README handling, and avoids stale follow-on `decision migrate` instructions. |

### Extra Work (not in declared requirements)

None requiring action. Range bookkeeping and archived review movement are project tracking changes.

## Verification Commands

```bash
git diff --check 619b9234593c83493f8b3ac6e3779831217994c4..HEAD
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared src/commands/decision src/commands/backlog src/commands/pjm src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/help-snapshots.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
pnpm release:validate
pnpm build:docs
rg -n "OAT DECISIONS-INDEX|END OAT DECISIONS-INDEX|\\| ID \\| Date \\| Status \\| Decision \\||oat decision regenerate($|[^-])" packages/cli/assets/migration/pjm-restructure.md packages/cli/src/commands/decision packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts apps/oat-docs/docs .agents/skills/oat-pjm-decision/SKILL.md
rg -n "bl-XXXX|bl-YYMMDD|dr-YYMMDD" .agents/skills/oat-brainstorm .agents/skills/oat-pjm-add-backlog-item .agents/skills/oat-pjm-decision .agents/skills/oat-pjm-update-repo-reference .agents/skills/oat-project-summary .oat/templates apps/oat-docs/docs packages/cli/assets/migration/pjm-restructure.md
```

Results:

- `git diff --check`: passed.
- Focused Vitest: 28 files, 253 tests passed.
- CLI type-check: passed.
- `pnpm release:validate`: passed for 5 public packages at `0.1.31`.
- `pnpm build:docs`: passed (6/6 turbo tasks; Next build produced 53 static pages).
- Decision prompt-contract sweep: no stale shipped prompt or command references; remaining `| Decision |` matches are legacy-input test fixtures and negative test assertions.
- ID-guidance sweep: only stale actionable matches are the brainstorm `bl-XXXX` placeholders noted above.

## Recommended Next Step

Run the `oat-project-review-receive` skill if you want to convert the Minor finding into a follow-up task; no blocking fix is required for this range.
