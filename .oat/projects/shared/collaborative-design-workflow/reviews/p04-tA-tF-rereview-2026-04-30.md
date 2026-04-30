---
oat_generated: true
oat_generated_at: 2026-04-30
oat_review_scope: p04-tA-tF
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/collaborative-design-workflow
---

# Code Re-Review: p04-tA..tF (Selective Collaborative Mode revision — fix verification)

**Reviewed:** 2026-04-30
**Scope:** p04-tA-tF re-review (narrowed to fix-task commits `d6977310..HEAD`)
**Files reviewed:** 6 (skills × 2, project artifacts × 3, contract test × 1)
**Commits:** 6 commits (`d42783b2`, `89717549`, `0a1cff5a`, `605efa84`, `3335eb45`, `7708553e`)

## Summary

All four fix tasks (p04-t12 through p04-t15) genuinely close the prior review's findings — both Important findings and all three Medium findings are resolved with no new Important+ regressions introduced. The contract-preservation test now asserts 14 checks (9 skill-body + 5 reference-file) against the plan-promised minimum of 11; the quick-start `selective` config mapping fires before the prompt fallback (FR15 acceptance criterion 4 satisfied) and is locked in by a new validation test; canonical Q5 picker copy ("high-risk sections live", "you review the committed file") landed verbatim in Step 1.5 with explicit picker-copy strings for all four taxonomy states; docs-surface expansion is now traceable through plan p04-tE (acceptance criteria + dependencies updated) and implementation.md; `state.md` keeps `oat_blockers: []` but now explicitly documents that the empty list is intentional and that the deferred dogfood items are post-merge follow-up. CLI tests grew 1369 → 1370 (one new `it(...)` block for the selective config fallback). `pnpm --filter @open-agent-toolkit/cli` test/lint/type-check are all clean.

One small new Minor surfaced: the picker-copy expansion pushed `oat-project-design/SKILL.md` from 696 to 701 lines, which is one over NFR5's 700-line ceiling. Easy to fix by collapsing the four-state taxonomy block, or to accept by relaxing NFR5's number.

Recommendation: this scope is effectively `passed`. The known-incomplete live picker/elevation/final-recap dogfood remains an explicit deferred follow-up (per state.md and the user's project bookkeeping); the prior review's three Minors were not in scope for fix tasks and remain unaddressed by design.

## Findings

### Critical

None.

### Important

None. Both prior Important findings are resolved.

### Medium

None. All three prior Medium findings are resolved.

### Minor

- **NFR5 line ceiling: `oat-project-design/SKILL.md` is 701 lines, ceiling is 700** (`.agents/skills/oat-project-design/SKILL.md`)
  - Issue: Spec NFR5 acceptance criterion: "The reworked `oat-project-design/SKILL.md` should not exceed 700 lines." Baseline at `d6977310` was 696 lines (verified via `git show`). The picker-copy expansion in p04-t13 added the explicit four-state taxonomy block (lines 130-138, ~5 net new lines), bringing the total to **701 lines** (verified via `wc -l`). The overrun is one line.
  - Fix options:
    - **Lightweight:** collapse the four-state taxonomy block at `SKILL.md:132-138` into a denser format. For example, merge labels with values onto single comment lines:
      ```
      #    - Recommended: "Selective collaborative (recommended for this design)"
      #    - Available: "Selective collaborative (available)"
      #    - Available-not-recommended: "Selective collaborative (available, not recommended)"
      #    - Unavailable: "Selective collaborative (unavailable — insufficient grounding context)"
      ```
      is already in this form; alternative is to drop the standalone introductory line at 132 ("Use the four-state taxonomy explicitly:") since it is redundant with the bullet list immediately following.
    - **Accept-and-relax:** update NFR5's ceiling number in `spec.md:287-291` to 720 (or similar) and document the decision in `implementation.md` p04-t13 entry.
  - Suggestion: Either is fine. The lightweight collapse takes one commit and no version-bump churn. The relax-the-ceiling path is also defensible — explicit picker copy for all four states is genuinely more useful than rounding the file at 700 lines. **Why Minor not Important:** the test harness doesn't enforce NFR5; the overrun is one line (~0.14%); and NFR5 is a P2 priority in spec.md (`spec.md:288`).

## Per-Fix-Task Verification

### p04-t12 — Quick-start `selective` config mapping (Important #1 resolved)

**Commit:** `d42783b2` (+ bookkeeping `89717549`)
**File:** `.agents/skills/oat-project-quick-start/SKILL.md:287-295`

The CONFIG_MODE branch now reads:

```
CONFIG_MODE=$(oat config get workflow.designMode 2>/dev/null || echo "")
if [ "$CONFIG_MODE" = "collaborative" ] || [ "$CONFIG_MODE" = "selective" ] || [ "$CONFIG_MODE" = "draft" ]; then
  DESIGN_MODE="$CONFIG_MODE"
  if [ "$DESIGN_MODE" = "selective" ]; then
    DESIGN_MODE="collaborative"
    echo "Using workflow.designMode = selective from config (treating as collaborative for lightweight design; Selective Collaborative is only available in full oat-project-design)."
  ...
```

Verified:

- `selective` is accepted as a valid CONFIG_MODE value (was previously falling through to the prompt path).
- The selective→collaborative re-map fires inside the config branch, BEFORE the `else` prompt path — so a user with `workflow.designMode: selective` persisted at any scope (user/shared/local) gets silent collaborative lightweight design rather than a 2-choice prompt every time.
- An informative echo explains why the mapping happened and points users to the full `oat-project-design` skill if they actually want Selective Collaborative.
- Single read site: `grep workflow.designMode .agents/skills/oat-project-quick-start/SKILL.md` returns one match (line 287). No other code paths in this skill read `workflow.designMode`, so the fix covers all entry points the prior review flagged.

**Test coverage added:** A new `it('documents quick-start selective config fallback to collaborative', ...)` block (`packages/cli/src/validation/skills.test.ts:640-665`) asserts:

- The `"$CONFIG_MODE" = "selective"` literal.
- The "treating as collaborative for lightweight design" prose.
- The "Selective Collaborative is only available in full oat-project-design" prose.

This locks the mapping against silent regressions. Total CLI tests: 1369 → 1370 (one new test).

**FR15 acceptance criterion 4 ("`oat-project-quick-start` Step 2.75a uses the same order but treats `'selective'` as `'collaborative'`"): satisfied.** Component 15 / Q7 parity decision: satisfied.

### p04-t13 — Contract test + picker copy (Important #2 + Medium #3 resolved)

**Commit:** `0a1cff5a` (+ bookkeeping `605efa84`)
**Files:** `packages/cli/src/validation/skills.test.ts:667-731`, `.agents/skills/oat-project-design/SKILL.md:118-138`

#### Contract-preservation test now covers 14 of the 11 promised assertions

Plan p04-tD called for 6 skill-body checks + 5 reference-file headers (= 11 minimum). The expanded test now asserts:

**Skill-body checks (9 — exceeds the 6 minimum):**

1. Version sentinel `2.1.0` (line 690).
2. Step header `### Step 4a: Selective Review Pass` (line 694).
3. `routine` literal (line 695). _NEW — was missing in prior review._
4. `needs-eyes` literal (line 698).
5. Conservative-bias rule (line 702).
6. Minimum-live-review rule (line 706).
7. Section Review Plan pre-drafting reveal (line 710). _NEW — was missing in prior review._
8. Reference-file pointer (line 714).
9. Picker canonical wording — `high-risk sections live` + `you review the committed file` (lines 718, 722). _NEW — covers Medium #3._

**Reference-file checks (5 — meets the 5 minimum):**

1. `## Signal Set` (line 726).
2. `## Adequate Grounding` (line 727). _NEW — was missing in prior review._
3. `## Recommendation Rules` (line 728). _NEW — was missing in prior review._
4. `## Edge Cases` (line 729). _NEW — was missing in prior review._
5. `## Dogfood Notes` (line 730).

All four prior gaps (the `routine` literal, the Section Review Plan pre-drafting reveal, the three reference-file headers) are now asserted. Failure messages were also customized per assertion (incidentally addresses prior Minor #1 — `expect(skillContent, 'Step 4a must preserve the conservative-bias rule')` etc.). NFR8 ("six minimum checks ... five required section headers") is satisfied with margin.

#### Picker copy now matches canonical Q5 wording exactly

`SKILL.md:124-129` (the picker prompt comment block):

```
Question: "How would you like to work through the design?
   1. Collaborative — section-by-section, every section confirmed
   2. Selective collaborative — agent drafts routine sections silently
      and walks you through high-risk sections live; before drafting,
      you'll see which sections will be presented and why
   3. Draft-and-review — full draft up front, you review the committed file"
```

Verified against canonical `discovery.md` Q5 (lines 481-493):

- "high-risk sections live" — matches (was "sections that need eyes" in prior review).
- "you review the committed file" — matches (was "you review holistically" in prior review).
- "before drafting, you'll see which sections will be presented and why" — matches.

Both regression assertions for these phrases (`/high-risk sections live/` and `/you review the committed file/`) are now in the contract test.

#### Four-state taxonomy now expressed as explicit picker copy

`SKILL.md:130-138` directly above the prompt instructions:

```
Mark exactly one option "(recommended for this design)". Hide or
label Selective unavailable when grounding is broadly absent. Use
the four-state taxonomy explicitly:
- Recommended: "Selective collaborative (recommended for this design)"
- Available: "Selective collaborative (available)"
- Available-not-recommended: "Selective collaborative (available, not recommended)"
- Unavailable: "Selective collaborative (unavailable — insufficient grounding context)"
```

This addresses the prior Medium-#3 sub-finding that `Available, not recommended` and `Unavailable` lacked picker copy and were only described in paragraph form at line 154 (now line 159). The four labels now sit adjacent to the prompt instructions, so an agent following the skill literally renders all four states with the same fidelity. The canonical paragraph at line 159 (lightly edited) remains as backup descriptive prose.

One residual prose use of the phrase "sections that need eyes" exists at `SKILL.md:88` (the descriptive header sentence introducing Step 1.5 — "Selective Collaborative (section-by-section only for sections that need eyes)"). This is internal descriptive copy, not picker prompt copy, and reads naturally in context — not flagging as a new finding.

**FR16 picker-copy acceptance + plan p04-tB ("Picker copy matches the canonical wording from `discovery.md` Q5"): satisfied.**

### p04-t14 — Docs expansion bookkeeping (Medium #4 resolved)

**Commit:** `3335eb45`
**Files:** `plan.md:1296-1308`, `implementation.md:333, 343`

Plan p04-tE now lists the docs surfaces explicitly under "Files to update":

> Documentation closeout also expanded the docs app surfaces after `$oat-project-document`: `apps/oat-docs/docs/workflows/projects/design-modes.md`, `apps/oat-docs/docs/workflows/projects/lifecycle.md`, `apps/oat-docs/docs/workflows/projects/index.md`, `apps/oat-docs/docs/cli-utilities/configuration.md`, and `apps/oat-docs/index.md`. This is intentional docs coverage for the shipped mode picker/config behavior, not a separate feature scope.

Acceptance criteria expanded to:

> Docs app surfaces document the same three-mode taxonomy and config behavior without contradicting FR16 / Component 15.

Implementation.md p04-tE entry was updated in the same commit to mirror the same docs-surface enumeration. The 108-line `design-modes.md` page is now traceable to a plan task; a future reviewer asking "is the doc up to date with the spec?" can follow plan p04-tE → implementation.md → the file list. This is substantive bookkeeping (not a one-line rubber-stamp), and it preserves the shipped content without removing or rewriting the docs.

**Acceptable resolution.** Plan p04-tE's stated coverage now matches what shipped.

### p04-t15 — Deferred dogfood blocker disposition (Medium #5 resolved)

**Commit:** `7708553e`
**Files:** `state.md:65-71`, `implementation.md` (existing context preserved)

`state.md` keeps `oat_blockers: []` but now explicitly explains the empty list:

> `oat_blockers` is intentionally empty: on 2026-04-30 the user closed dogfood as sufficient for PR. The items above are post-merge follow-up dogfood, not blockers for PR #68.

The `## Deferred Follow-up Dogfood` section continues to enumerate the three live paths (picker taxonomy, mid-flight elevation, final recap). A reader scanning state.md cold can now tell — by reading the explanatory line beside the empty array — whether p04-tF is "genuinely done" (yes for PR) or "still has open work" (yes for post-merge follow-up). The metadata-judgment-call resolution is now documented inline rather than left as an unstated decision.

**Acceptable resolution.** This was explicitly called out as either-fix-acceptable in the prior review; the chosen resolution (keep `[]`, explain why) is defensible and well-documented.

## Carry-Over from Prior Review

The prior review's three Minors were auto-deferred (no fix tasks) and remain so:

- **Minor 1 (custom failure messages on `expect.toMatch`):** Incidentally resolved in p04-t13. The new contract test uses `expect(skillContent, 'Step 4a must …').toMatch(...)` for nine of the nine skill-body assertions — failure messages now read e.g. "Step 4a must name routine classifications" rather than a generic "expected match for /\`routine\`/". Reference-file assertions still use the bare form, which is consistent with their pattern-only nature. Net improvement.
- **Minor 2 (`## Examples` extra header in reference file):** Not addressed; prior review noted no change was needed and the test would not anchor on it. The expanded test indeed only anchors on the five canonical headers.
- **Minor 3 (`public-package-versions.json` missing `control-plane`):** Not addressed; pre-existing state, accepted as out-of-scope per implementation.md line 345. `pnpm release:validate` still passes regardless.

No new Important+ regressions surfaced from the fix-task commits themselves. The one new Minor (NFR5 1-line overrun) is a side effect of the picker-copy expansion in p04-t13 and is documented above.

## Verification Commands Run

```bash
# All clean
pnpm --filter @open-agent-toolkit/cli test          # 1370 tests passed (159 files); was 1369
pnpm --filter @open-agent-toolkit/cli type-check    # tsc --noEmit clean
pnpm --filter @open-agent-toolkit/cli lint          # 0 warnings, 0 errors
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts  # 28 tests (was 27)

# Line-count check
wc -l .agents/skills/oat-project-design/SKILL.md    # 701 (baseline at d6977310 was 696)
```

## Requirements/Design Alignment

**Evidence sources used:** prior review artifact (`reviews/archived/p04-tA-tF-review-2026-04-30.md`), `discovery.md` Q5 + Q7, `spec.md` (FR15, FR16, NFR5, NFR8), `design.md` (Component 15), `plan.md` p04-tD/tE + p04-t12-t15, `implementation.md`, `state.md`. Spec-driven mode.

### Requirements Coverage Updates (relative to prior review)

| Requirement                                                             | Prior status                       | Status now                      | Notes                                                                                                           |
| ----------------------------------------------------------------------- | ---------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| FR15 (designMode config; selective accepted; quick-start parity)        | partial                            | implemented                     | Quick-start now treats `selective` as `collaborative` before the prompt path; locked by new validation test.    |
| FR16 (selective mode + Step 4a contract + reference file + picker copy) | implemented (with picker-copy gap) | implemented                     | Canonical Q5 wording + four-state explicit picker copy now in Step 1.5; both phrases asserted by contract test. |
| NFR8 (conservative + inspectable + contract test)                       | partial                            | implemented                     | Contract test now asserts 9 skill-body + 5 reference-file checks (vs. plan minimum 6 + 5).                      |
| NFR3 (release validate)                                                 | implemented                        | implemented (unchanged)         | Public-package versions untouched in fix-task scope; no regression risk.                                        |
| NFR5 (skill ≤ 700 lines)                                                | implemented (696 lines)            | regressed by 1 line (701 lines) | Picker copy expansion added 5 lines net; over by 1. New Minor finding above.                                    |

## Verification Commands

To re-verify this re-review's conclusions:

```bash
# Contract test count (expect 14 expect() calls inside the selective contract block)
sed -n '687,730p' packages/cli/src/validation/skills.test.ts | grep -c '^    expect\|^      expect'

# Quick-start mapping fires inside the config branch (expect both lines present)
grep -n 'CONFIG_MODE" = "selective"\|treating as collaborative' .agents/skills/oat-project-quick-start/SKILL.md

# Picker canonical wording is in place (expect both phrases)
grep -n 'high-risk sections live\|you review the committed file' .agents/skills/oat-project-design/SKILL.md

# All four picker-copy states present (expect 4 matches)
grep -c '"Selective collaborative (' .agents/skills/oat-project-design/SKILL.md

# state.md explanatory line for empty oat_blockers
grep -n 'is intentionally empty' .oat/projects/shared/collaborative-design-workflow/state.md

# NFR5 line-count check (expect 701 — 1 over the 700 ceiling)
wc -l .agents/skills/oat-project-design/SKILL.md

# Test/lint/type-check
pnpm --filter @open-agent-toolkit/cli test          # 1370 passed
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli lint
```

## Recommended Next Step

This re-review's verdict is **passed-with-one-Minor**. Both prior Important findings and all three prior Medium findings are genuinely resolved. One new Minor surfaced (NFR5 1-line overrun); it's a trivial one-line removal if the project wants strict NFR5 compliance, or a deliberate accept-and-bump-the-ceiling decision.

Suggested handling:

- **If keeping NFR5 strict:** add a tiny fix task `p04-t16` to drop the redundant introductory line at `SKILL.md:132` ("Use the four-state taxonomy explicitly:") since the bullet list immediately following speaks for itself. This brings the file back to 700 lines exactly. No version bump needed (it's a pure prose tightening), no public-package bump needed (no shipped behavior change). One commit.
- **If relaxing NFR5:** update spec NFR5's ceiling number in `spec.md:288, 291, 436` to 720 (or "≤ 1.05× of last shipped baseline") and document the decision in `implementation.md` p04-t13 entry.

Either path closes this scope. After that, the row in `plan.md` Reviews can move from `fixes_completed` → `passed`.

## Update to plan.md Reviews table

Added the re-review row per the brief:

```
| p04-tA-tF | code | received | 2026-04-30 | reviews/p04-tA-tF-rereview-2026-04-30.md |
```

(The previous row showing `fixes_completed` for the original review remains. `oat-project-review-receive` will resolve them later.)

Run `oat-project-review-receive` to convert the one new Minor finding into a fix task (or to explicitly defer it).
