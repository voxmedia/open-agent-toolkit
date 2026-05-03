---
oat_generated: true
oat_generated_at: 2026-05-03
oat_review_scope: prev1
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/independent-brainstorming
---

# Code Review: prev1 (revision 1)

**Reviewed:** 2026-05-03
**Scope:** revision phase `p-rev1` (tasks `prev1-t01`, `prev1-t02`, `prev1-t03`)
**Range:** `69fd51f2..HEAD` (3 commits: `72eabe20`, `42a8d2db`, `0b4190ca`)
**Files reviewed:** 15 (10 in revision commit `42a8d2db`; 5 bookkeeping in `72eabe20` / `0b4190ca`)
**Workflow mode:** quick
**Artifacts available:** `discovery.md`, `design.md`, `plan.md`, `implementation.md`, `state.md`, `summary.md`

## Summary

The revision is well-scoped, internally consistent, and faithfully implements the inline user feedback. `oat-brainstorm` now explicitly owns destinationless "let's brainstorm" / "brainstorm this" / "brainstorm <topic>" phrasing; `oat-idea-ideate` is narrowed to existing tracked ideas or explicit scratchpad seeds with a negative routing rule pointing brand-new brainstorms at `oat-brainstorm`. Visual-companion offer is now gated by a topic-classification step (text-likely → silent `deferred`; visual-likely → preflight + offer), the fixed `[3/9]` progress counter is gone, and lockstep public package versions plus skill frontmatter versions are bumped per the AGENTS.md contract.

All build / lint / type-check / release-validate / CLI test gates pass. `oat-brainstorm` and `oat-idea-ideate` validate cleanly under `pnpm oat:validate-skills`; only the documented pre-existing failures (six unrelated skills) remain. No critical or important findings. One minor stylistic note on the BLOCKED list and one minor docs-completeness suggestion on the `workflows/skills/index.md` line for `oat-idea-ideate` — both non-blocking and recommendation only.

## Findings

### Critical

None.

### Important

None.

### Medium

None.

### Minor

- **BLOCKED rule wording could be slightly tighter** (`.agents/skills/oat-brainstorm/SKILL.md:25`)
  - Issue: The line `No skipping the visual-companion offer when the conversation is going to involve visual content.` survives unchanged from the pre-revision version. With the new gating model, the rule it expresses is still correct (don't skip a visual-likely conversation's offer), but a literal reading next to the new line at `:26` (`No immediate visual-companion offer for text-likely brainstorms.`) could read as a near-tautology to a careful agent: "skip when text-likely, don't skip when visual-likely." The pair is consistent but slightly redundant after the revision.
  - Suggestion: Optional phrasing tweak — replace `:25` with something like `No skipping the offer when the topic is visual-likely.` so the two BLOCKED rules read as a clean polarity. This is purely cosmetic; both phrasings are technically correct and match Step 3.
  - Verification: `rg -n "skipping the visual-companion offer|immediate visual-companion offer" .agents/skills/oat-brainstorm/SKILL.md` should show one rule per polarity.

- **`workflows/skills/index.md` "Capture or refine ideas" bullet is unchanged** (`apps/oat-docs/docs/workflows/skills/index.md:32`)
  - Issue: The bullet still lists `oat-idea-ideate` alongside the rest of the idea-\* family without the new "existing tracked idea / explicit scratchpad seed only" framing. The line at `:33` correctly disambiguates `oat-brainstorm`, so the disambiguation isn't completely missing — but a curious reader scanning the catalog might still think of `oat-idea-ideate` as a generic ideation entry point.
  - Suggestion: Optional one-line tightening, e.g. change `oat-idea-ideate` (line 32) to `oat-idea-ideate` (resume an existing idea) or add a parenthetical there. Not required for correctness — the SKILL.md description and the brainstorm bullet at `:33` already carry the routing contract — but it would help users using the docs catalog as their first index.
  - Verification: read `apps/oat-docs/docs/workflows/skills/index.md` lines 32-33 and confirm the routing is unambiguous to a fresh reader.

- **`workflows/ideas/index.md` doesn't explicitly say `oat-idea-ideate` requires an existing target** (`apps/oat-docs/docs/workflows/ideas/index.md:14`)
  - Issue: The "Not Sure If It's an Idea Yet?" section was correctly updated with the new "destinationless exploratory phrasing" wording for `oat-brainstorm`, but the surrounding ideas-workflow prose still describes ideas as a place "to think, sketch, or explore" without mentioning that `oat-idea-ideate` itself now requires an existing tracked idea or scratchpad seed. A reader who skims the page could still conclude "I want to think about something, so I'll run `oat-idea-ideate`."
  - Suggestion: Optional — add one sentence to the ideas-index page noting that direct entry to `oat-idea-ideate` requires an existing idea or scratchpad entry, and that brand-new brainstorms should go through `oat-brainstorm` first. Non-blocking; the SKILL.md frontmatter is the authoritative contract.
  - Verification: `rg -n "oat-idea-ideate|oat-brainstorm" apps/oat-docs/docs/workflows/ideas/index.md`.

## Spec / Design Alignment (Treating Inline Feedback As Requirements)

**Evidence sources used:**

- `.agents/skills/oat-brainstorm/SKILL.md` (canonical, version `1.0.1`)
- `.agents/skills/oat-idea-ideate/SKILL.md` (canonical, version `1.2.1`)
- Bundled assets at `packages/cli/assets/skills/oat-{brainstorm,idea-ideate}/SKILL.md` (gitignored, regenerated by build — verified in sync via `diff -q`)
- `apps/oat-docs/docs/cli-utilities/tool-packs.md`, `apps/oat-docs/docs/workflows/ideas/index.md`, `apps/oat-docs/docs/workflows/skills/index.md`
- `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`
- `.oat/projects/shared/independent-brainstorming/{plan.md,implementation.md,state.md,summary.md}`
- `.oat/state.md`
- Commit `42a8d2db` diff (the actual revision)

### Requirements Coverage

| Requirement                                                                                                                   | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1: `oat-brainstorm` owns destinationless "let's brainstorm" / "brainstorm this" / "brainstorm <topic>"                       | implemented | Frontmatter description (`.agents/skills/oat-brainstorm/SKILL.md:4`) explicitly enumerates the three literal phrases. Step 1 (`:83`) reinforces with a negative routing rule pointing those phrases away from `oat-idea-ideate`. Mode-assertion Purpose (`:18`) restates ownership. Success criterion (`:525`) confirms the phrasing.                                                                                                                                                                                                                                                                                                                                             |
| R2: `oat-brainstorm` warns against inferring a destination before convergence                                                 | implemented | Frontmatter (`:4`): "If no destination skill or artifact type is named, do NOT infer one up front; defer destination selection until convergence." BLOCKED list (`:24`): "No auto-routing to a destination before convergence." Self-Correction (`:44`): "Forcing a destination before convergence → STOP."                                                                                                                                                                                                                                                                                                                                                                       |
| R3: `oat-idea-ideate` narrowed to existing tracked ideas / explicit scratchpad seeds                                          | implemented | Frontmatter description (`.agents/skills/oat-idea-ideate/SKILL.md:4`) rewritten. Body subtitle (`:13`) and Mode Assertion Purpose (`:19`) restate the narrower scope. Step 1 (`:95`) adds an explicit early bail-out: "If the user has only asked to brainstorm and has not named an existing idea, an active idea, or a scratchpad seed, stop and route to `oat-brainstorm`."                                                                                                                                                                                                                                                                                                    |
| R4: `oat-idea-ideate` routes brand-new destinationless brainstorms back to `oat-brainstorm`                                   | implemented | Frontmatter (`:4`): "Do NOT use to start a brand-new, destinationless brainstorm; use oat-brainstorm for that." BLOCKED list adds explicit no-activation rule (`:28`). Self-Correction adds the scratchpad-mode guard (`:45`).                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| R5: Visual-companion offer gated by visual-need assessment; text-likely defers silently                                       | implemented | Step 3 renamed to "Assess Visual Need and Optional Visual Companion Offer" (`:99`). Visual-likely / text-likely classification spelled out (`:103`–`:107`). Text-likely path: "skip the visual-companion offer silently and proceed to step 4 with `VISUAL_COMPANION = "deferred"`. Do not mention the visual companion merely because it exists." (`:107`).                                                                                                                                                                                                                                                                                                                      |
| R6: Resurface rule when conversation turns visual                                                                             | implemented | Step 3 (`:110`): "If `VISUAL_COMPANION = "deferred"` and the conversation later becomes visual-likely, pause before the visual-specific question and offer the visual companion as its own message at that point." Step 5 (`:185`): "If it is `deferred`, continue in the terminal until the resurface rule from step 3 applies." Step 7 (`:230`): "Only resurface the visual-companion offer if it was deferred and the conversation has become visual-likely."                                                                                                                                                                                                                  |
| R7: No fixed `[3/9] Offering visual companion…` progress indicator                                                            | implemented | Progress Indicators (`:58`) replaced with phase-label list (no slot count). Closing line (`:77`): "Do not use fixed `[N/9]` counters. The visual-companion offer is conditional, so the visible progress model must not imply that an offer always happens." `rg "[3/9] Offering" .agents/skills/oat-brainstorm/SKILL.md` returns no matches.                                                                                                                                                                                                                                                                                                                                     |
| R8: BLOCKED Activities consistent with new offer-gating rules                                                                 | implemented | Two complementary rules now present: don't skip when visual-likely (`:25`), don't offer when text-likely (`:26`). Self-Correction adds the matching pair (`:45`–`:46`). See Minor finding above for an optional phrasing-polish note.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| R9: Both changed skill frontmatter `version:` bumped per PR-scoped rule                                                       | implemented | `oat-brainstorm` `1.0.0 → 1.0.1` (`:3`); `oat-idea-ideate` `1.2.0 → 1.2.1` (`:3`). Each skill changed in this PR has exactly one bump.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| R10: Lockstep public packages all bumped                                                                                      | implemented | All five at `0.0.60`: `cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms`. Verified via `head -5 packages/*/package.json`. `packages/cli/assets/public-package-versions.json` regenerated to match (4-package map; `control-plane` is intentionally excluded by the `bundle-assets.sh` generator — confirmed by reading the script and noting this matches the long-standing shape rather than a new omission).                                                                                                                                                                                                                                                |
| R11: `pnpm release:validate` passes                                                                                           | implemented | Output: `release validation passed for 5 public packages`. All five tarballs validated at `0.0.60`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| R12: Documentation reflects the new disambiguation                                                                            | partial     | `cli-utilities/tool-packs.md` (Brainstorm pack section): activation prose updated to include "destinationless exploratory phrasing" with literal phrases (`:178`–`:182`); visual-companion description rewritten to capture "offered only when topic is visual-likely" + resurface rule (`:209`–`:213`). `workflows/ideas/index.md` "Not Sure If It's an Idea Yet?" updated. `workflows/skills/index.md` `oat-brainstorm` line updated. See two Minor findings above on `oat-idea-ideate` mentions in the docs that don't yet reflect the narrowed scope (non-blocking).                                                                                                          |
| R13: `oat-brainstorm` and `oat-idea-ideate` validate cleanly                                                                  | implemented | `pnpm oat:validate-skills` reports only the six pre-existing unrelated failures (`oat-pjm-add-backlog-item`, `oat-pjm-update-repo-reference`, `oat-project-document`, `oat-project-pr-final`, `oat-project-spec`, `oat-project-summary`); neither brainstorm nor idea-ideate appears.                                                                                                                                                                                                                                                                                                                                                                                             |
| R14: Bookkeeping coherent (`plan.md` reviews row, `implementation.md` revision sections, `state.md` body matches frontmatter) | implemented | `plan.md` Phase `p-rev1` block (`:1494`) is `complete` with commit `42a8d2db`. `implementation.md` has both `Revision Received: Inline Feedback` and `Revision Completed: Inline Feedback` blocks, with accurate task list, outcome bullets, and verification log. `state.md` frontmatter `oat_pr_status: open`, `oat_phase_status: pr_open` matches body "Status: Revision complete; PR open" and the `⧗ Awaiting focused re-review / PR update` progress line. `summary.md` updated with the revision design-delta. The `Reviews` table in `plan.md` does not yet have a `p-rev1` row — that is expected; it gets populated by the receive flow after this artifact is written. |

### Extra Work (not in declared requirements)

None. All file changes map cleanly to one of `prev1-t01`, `prev1-t02`, or `prev1-t03`. The revision commit is narrowly scoped to:

- Two canonical SKILL.md edits (`oat-brainstorm`, `oat-idea-ideate`)
- Three doc edits (the two-line and one-paragraph changes documented above)
- Five `package.json` version bumps (lockstep)

No incidental code changes, no test churn, no refactors swept in.

## Code Quality Notes

- **Self-correction discipline.** The Self-Correction Protocol section in `oat-brainstorm` adds a paired rule for the new gating model (`:45`–`:46`) — both the "don't skip when visual" and "don't offer when text-likely" violations are explicit. This matches the discipline the rest of the SKILL applies to fold-back commit safety. Good.

- **State variable consistency.** The `VISUAL_COMPANION` enum is now `active | declined | unavailable | deferred`. All four are referenced consistently across Step 3, Step 5 (per-question routing), and Step 7 (keep-going branch). No orphan states. The `deferred` state has documented temporality (`:136`: "may resurface once if the conversation later becomes visual-likely") which prevents the offer from being deferred indefinitely.

- **Progress indicators.** The new phase-label list (`:67`–`:75`) is a strict superset of the old `[1/9]…[9/9]` counter content with `Assessing visual need` substituted for `[3/9] Offering the visual companion`. No information was lost in the conversion. The closing rationale (`:77`) is a strong invariant: "the visible progress model must not imply that an offer always happens."

- **Negative routing rule placement.** `oat-idea-ideate` Step 1 (`:95`) puts the early-bail rule before the `activeIdea` config read. This is the right ordering — the routing decision should fire before any work happens, so a generic brainstorm request never even attempts ideas-directory scanning.

- **Docs commit hygiene.** The three doc-file edits in `tool-packs.md` / `ideas/index.md` / `skills/index.md` are tight (a few lines each) and avoid touching unrelated paragraphs. No drift.

- **Bundled-asset sync.** Bundled `packages/cli/assets/skills/oat-{brainstorm,idea-ideate}/SKILL.md` matches the canonical sources (verified by `diff -q`). Bundled assets are gitignored and regenerated by the prebuild step; the regeneration is exercised on every `pnpm build` / `pnpm lint` / `pnpm type-check` invocation, so the in-tree assets are always fresh after a successful gate.

## Verification Commands

Run these to verify the implementation:

```bash
# Skill content checks
rg -n "let's brainstorm|brainstorm this|brainstorm <topic>" .agents/skills/oat-brainstorm/SKILL.md
rg -n "Do NOT use to start a brand-new, destinationless brainstorm" .agents/skills/oat-idea-ideate/SKILL.md
rg -n "VISUAL_COMPANION = \"deferred\"|Resurface rule" .agents/skills/oat-brainstorm/SKILL.md
rg -n "\[3/9\] Offering" .agents/skills/oat-brainstorm/SKILL.md   # expected: no matches

# Versions
head -5 packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
head -5 .agents/skills/oat-brainstorm/SKILL.md
head -5 .agents/skills/oat-idea-ideate/SKILL.md

# Build and validation gates (all confirmed pass during this review)
pnpm format
pnpm lint
pnpm type-check
pnpm --filter @open-agent-toolkit/cli test     # 163 files, 1462 tests, includes 5 visual-companion smoke cases
pnpm release:validate
pnpm oat:validate-skills                       # only pre-existing 6 unrelated failures should remain
```

Verification results during review:

- `pnpm lint`: pass (cache hit)
- `pnpm format`: pass (`All matched files use the correct format` on 525 files)
- `pnpm type-check`: pass (cache hit)
- `pnpm --filter @open-agent-toolkit/cli test`: pass (163 files, 1462 tests, 13.62s; visual-companion smoke 5/5 pass — start, server-info JSON, --project-dir, repo-root resolution, $HOME fallback)
- `pnpm release:validate`: pass for all 5 public packages at `0.0.60`
- `pnpm oat:validate-skills`: only the documented six pre-existing failures (`oat-pjm-add-backlog-item`, `oat-pjm-update-repo-reference`, `oat-project-document`, `oat-project-pr-final`, `oat-project-spec`, `oat-project-summary`); neither `oat-brainstorm` nor `oat-idea-ideate` appears.

## Recommended Next Step

This revision passes the acceptance bar with no critical / important / medium findings. Three minor stylistic suggestions are recorded above; all are optional and non-blocking.

Run the `oat-project-review-receive` skill to record this review against the `p-rev1` row in `plan.md` (`Reviews` table) and decide whether to absorb the three Minor suggestions inline or defer. Then proceed with the PR update flow (`oat-project-pr-progress` or merge / `oat-project-complete` per the user's stated path).
