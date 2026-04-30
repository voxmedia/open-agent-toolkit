---
oat_generated: true
oat_generated_at: 2026-04-30
oat_review_scope: p04-tA-tF
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/collaborative-design-workflow
---

# Code Review: p04-tA..tF (Selective Collaborative Mode revision)

**Reviewed:** 2026-04-30
**Scope:** p04-tA through p04-tF — Selective Collaborative Mode revision (FR16 + NFR8)
**Files reviewed:** 23 (commits a8a1a7bb..HEAD)
**Commits:** 16 commits, including six implementation commits (`f98e61df`, `d6e80219`, `49057a05`, `e0d50a11`, `9d0dd232`, `468ca6a1`) plus bookkeeping/docs commits

## Summary

The Selective Collaborative mode landed cleanly in its prose-only essentials: Step 4a contract is present in the design skill, the reference file has all five required headers, `WorkflowDesignMode` accepts `'selective'` end-to-end (config schema, allow-list, tests), AGENTS.md and the new docs page document the three-mode picker, and the public-package lockstep is consistently at `0.0.52`. `pnpm release:validate`, `pnpm --filter @open-agent-toolkit/cli test` (1369 tests), `lint`, and `type-check` all pass.

Two issues warrant attention before this PR merges. (1) **Important — quick-start does not honor the FR15 contract for `selective`:** when a user has `workflow.designMode: selective` persisted, `oat-project-quick-start` Step 2.75a falls through to the picker prompt instead of treating selective as collaborative. This violates an explicit FR15 acceptance criterion and Component 15 Q7 — and was missed because the revision plan only listed quick-start changes implicitly via "Component 14 update" without a dedicated task. (2) **Important — the contract-preservation test omits 4 of the 11 checks the plan committed to** (p04-tD called for 6 skill-body assertions and 5 reference-file headers; the implemented test has 4 + 2). The omitted checks include the explicit `routine` literal, the Section Review Plan pre-drafting reveal, and three of five reference-file headers. The skill body and reference file actually contain all of these — the gap is only in the regex harness — but NFR8 specifically calls out the contract-preservation test as the guardrail against silent skill-body drift, so leaving it half-built undermines the whole reason it exists.

Beyond these, picker copy diverges in minor wording from the canonical Q5 prose (the contract elements are present but the agent has to synthesize parts of the four-state taxonomy and "Why" explainer at runtime), and the `apps/oat-docs` `design-modes.md` file was added without an explicit plan task — the content is accurate and in scope, but it is worth flagging as scope expansion. The artifact-only dogfood notes in `references/selective-review-pass.md` are concrete and useful — they include a full 12-row classification table for this project's own design with Forced/Reasonable annotations, plus an explicit deferred-follow-up list for the three live paths (picker taxonomy, mid-flight elevation, final recap) that still need a real interactive run.

## Findings

### Critical

None.

### Important

- **Quick-start ignores `workflow.designMode: selective` instead of treating it as collaborative** (`.agents/skills/oat-project-quick-start/SKILL.md:287-291`)
  - Issue: The CONFIG_MODE branch is `if [ "$CONFIG_MODE" = "collaborative" ] || [ "$CONFIG_MODE" = "draft" ]; then DESIGN_MODE="$CONFIG_MODE"; ...`. When the persisted preference is `selective`, the test fails and the code falls through to the interactive prompt path. FR15 acceptance criterion explicitly states: "`oat-project-quick-start` Step 2.75a uses the same order but treats `'selective'` as `'collaborative'`." Design Component 15 (`design.md:1120, 1205`) re-states the same parity decision. With this skill unchanged, a user who sets `workflow.designMode: selective` at the user level will get the picker prompt every time they run lightweight design — not the silent `collaborative` fall-through that the spec promises. Worse, `git diff a8a1a7bb..HEAD -- .agents/skills/oat-project-quick-start/SKILL.md` is empty in this revision, confirming the file was never touched.
  - Fix: Update the conditional to `if [ "$CONFIG_MODE" = "collaborative" ] || [ "$CONFIG_MODE" = "draft" ] || [ "$CONFIG_MODE" = "selective" ]; then`, then add a follow-up line that maps `selective` → `collaborative` before the echo (e.g., `if [ "$DESIGN_MODE" = "selective" ]; then DESIGN_MODE="collaborative"; echo "Using workflow.designMode = selective from config (treating as collaborative for lightweight design — selective is only available in full oat-project-design)."; fi`). Also bump the quick-start skill `version:` per the AGENTS.md PR-scoped version-bump rule, and add a regression test in `packages/cli/src/validation/skills.test.ts` (or a new harness) that asserts the quick-start mapping prose contains "treats `'selective'`" or equivalent.
  - Requirement: FR15 (acceptance criterion 4: "`oat-project-quick-start` Step 2.75a uses the same order but treats `'selective'` as `'collaborative'`"); Component 15 / Q7 (`design.md:1120, 1205`).

- **Contract-preservation test is incomplete relative to plan p04-tD and spec NFR8** (`packages/cli/src/validation/skills.test.ts:640-671`)
  - Issue: Plan p04-tD specifies six skill-body regex assertions and five reference-file headers; spec NFR8 echoes the same numbers ("six minimum checks" + "five required section headers"). The implemented test covers only:
    - Skill body: header (1), conservative-bias (3), minimum-live-review (4), reference-file pointer (6) — plus the version sentinel `2.1.0`.
    - Reference file: `## Signal Set` + `## Dogfood Notes`.
      Missing:
    - Skill body assertion 2 — "Both `routine` and `needs-eyes` appear within the Step 4a section." The `needs-eyes` literal is implicitly present in the conservative-bias regex, but `routine` is not asserted at all.
    - Skill body assertion 5 — "Section Review Plan|Section review plan" pre-drafting reveal (the actual prose at `SKILL.md:401` reads `## Section Review Plan`, so this would pass — it's just not asserted).
    - Reference-file headers — `## Adequate Grounding`, `## Recommendation Rules`, `## Edge Cases` are all missing from the test even though they exist in the file (`references/selective-review-pass.md:30, 39, 50`).
      These omissions are not "the test asserts something wrong" — the file content is correct — but NFR8 explicitly creates this test as the guardrail against silent skill-body drift, and a half-implemented guardrail will not catch the regressions it was designed to catch.
  - Fix: Add four more `expect(skillContent).toMatch(...)` / `expect(referenceContent).toMatch(...)` lines in the same `it('preserves the selective collaborative review-pass contract', ...)` block:
    ```ts
    expect(skillContent).toMatch(/`routine`/);
    expect(skillContent).toMatch(/Section Review Plan|Section review plan/);
    expect(referenceContent).toMatch(/^## Adequate Grounding$/m);
    expect(referenceContent).toMatch(/^## Recommendation Rules$/m);
    expect(referenceContent).toMatch(/^## Edge Cases$/m);
    ```
    Optionally tighten assertion 2 to require both literals appear within the same Step 4a section (e.g., extract Step 4a substring with a regex slice and run both checks against that substring) — this is the "within Step 4a" qualifier the plan called for.
  - Requirement: NFR8 acceptance criterion ("six minimum checks ... five required section headers"); plan p04-tD.

### Medium

- **Picker copy diverges from canonical `discovery.md` Q5 wording and only partially exposes the four-state taxonomy** (`.agents/skills/oat-project-design/SKILL.md:124-133, 154`)
  - Issue: Plan p04-tB acceptance: "Picker copy matches the canonical wording from `discovery.md` Q5." The current pseudocode (lines 124-129) reads "walks you through sections that need eyes; you'll see which sections will be presented before drafting" vs. canonical Q5 "walks you through high-risk sections live; before drafting, you'll see which sections will be presented and why". Smaller wording deltas elsewhere ("you review holistically" vs "you review the committed file"). The picker pseudocode tells the agent to "Mark exactly one option (recommended for this design)" and "If Selective is recommended, add one sentence explaining the section count and adequate grounding" — that captures the recommended state correctly, but does not show example labels for `Available, not recommended` or `Unavailable` from Q5 (`discovery.md:495-507`). The "Selective recommendation states" paragraph at `SKILL.md:154` describes all four states in prose, but the picker pseudocode and the prose live in different parts of the skill, so the agent has to mentally reconcile them. An agent following the skill literally is more likely to render the recommended state correctly than the not-recommended or unavailable states.
  - Fix: Tighten the picker pseudocode comment block in Step 1.5 to include the canonical Q5 unavailable / not-recommended labels as examples (or move the four-state-taxonomy paragraph from line 154 directly above the prompt comment). Replace "sections that need eyes" with "high-risk sections live" and "you review holistically" with "you review the committed file" to match the canonical wording. The contract test could optionally assert "high-risk sections live" appears in Step 1.5 to lock the canonical wording in.
  - Requirement: FR16 acceptance criterion ("Picker copy in `oat-project-design` Step 1.5 lists three options ... Selective option carries a four-state taxonomy"); plan p04-tB ("Picker copy matches the canonical wording from `discovery.md` Q5").

- **`apps/oat-docs/docs/workflows/projects/design-modes.md` (108 lines) was not in any plan task** (new file)
  - Issue: Plan p04-tE only lists `AGENTS.md` mode-description updates plus the lockstep version bump. The new docs page is not mentioned anywhere in the revision plan, yet it landed in commit `3bbb1b57`. Content review: the page is accurate, in-scope (all claims match spec FR16 / design Component 15), and adds genuine value (it is the only place that explicitly shows the `oat config set workflow.designMode <value> --user|--shared|--local` syntax with all three scopes). However, it is scope expansion relative to the plan, and the lifecycle.md / index.md / configuration.md surfaces were also touched without explicit plan tasks. None of the new claims contradict the spec/design — but a future reviewer checking "is the doc up to date with the spec?" cannot easily verify that without reading both files end-to-end.
  - Fix: Either add a follow-on plan task entry that retroactively covers the docs additions (so the plan reflects what shipped), or note in `implementation.md` under p04-tE that the docs surfaces were expanded beyond the original task scope and why. The content itself is solid and does not need to be removed.
  - Requirement: spec discipline ("if a design detail comes up, record it under Open Questions" — analogous principle for plan adherence). Not a hard FR/NFR violation, but worth flagging.

- **Frontmatter `oat_blockers` cleared in `state.md` while p04-tF live dogfood is still incomplete** (`.oat/projects/shared/collaborative-design-workflow/state.md:4`)
  - Issue: The review brief states "the state.md `oat_blockers` field already captures that p04-tF live dogfood is incomplete." The current state.md frontmatter shows `oat_blockers: []`, and the milestone log says "p04-tF closed as sufficient for PR on 2026-04-30 by user decision." The narrative `## Deferred Follow-up Dogfood` section (lines 65-69) and `implementation.md` lines 314-317 do enumerate the three deferred live paths (picker taxonomy, mid-flight elevation, final recap). So the information is preserved — but a reader scanning `oat_blockers` programmatically (e.g., via `oat state` tooling) won't see any flag at all. This may be intentional (the user explicitly closed the gate) but it does diverge from the review brief's expectation.
  - Fix: If the closure is genuinely "this PR ships, follow-up dogfood happens after merge", then this is fine and the review brief is just out of date. If a programmatic blocker is desirable until the live dogfood lands, restore an entry like `oat_blockers: ['p04-tF live picker/elevation/final-recap dogfood deferred until post-merge']`. No code change required; this is a metadata judgment call.
  - Requirement: Project state hygiene; not a hard FR/NFR violation.

### Minor

- **Plan p04-tD's "negative test" acceptance criterion has no automated coverage** (`packages/cli/src/validation/skills.test.ts:640-671`)
  - Issue: Plan p04-tD acceptance: "Both tests fail with clear messages if any required clause/header is missing (validate by deleting + restoring)." The test as written would fail if the clauses go missing, but there is no negative-path test case (e.g., snapshot a stripped-down skill body that asserts the expectation throws). This was explicitly called out in the review brief ("Negative tests would be ideal but optional in v1") so it is consistent with v1 scope, but worth noting because the per-clause failure messages are not customized — a future maintainer hitting a regression will see a generic "expected match for ..." vitest error rather than "Step 4a is missing the conservative-bias clause".
  - Suggestion: Customize the assertion failure messages, e.g. `expect(skillContent, 'Step 4a must state the conservative-bias rule').toMatch(...)`. This is one-line-per-assertion and pays off the first time the test fails.

- **Reference file `## Examples` header is present but not part of the canonical structural list** (`.agents/skills/oat-project-design/references/selective-review-pass.md:58`)
  - Issue: The reference file adds a `## Examples` section (between `## Edge Cases` and `## Dogfood Notes`) that is not listed in design Component 15's required structural sections (Signal Set / Adequate Grounding / Recommendation Rules / Edge Cases / Dogfood Notes). Adding it is fine — the section provides a routine vs needs-eyes worked example pair — but the contract-preservation test (once expanded) should anchor on the five canonical headers, not coincidentally include `## Examples` in any future regex.
  - Suggestion: No change needed. Just be aware when expanding the test.

- **`packages/cli/assets/public-package-versions.json` does not include `control-plane`** (`packages/cli/assets/public-package-versions.json:1-7`)
  - Issue: This is pre-existing (the same file at `a8a1a7bb` baseline omits control-plane, listing only cli/docs-config/docs-theme/docs-transforms at `0.0.51`). The plan p04-tE acceptance language says "All five public-package versions are at `0.0.52`" and `pnpm release:validate` does pass — so the manifest's coverage of four of the five public packages is by design (validation reads the actual `package.json` files, not this manifest). But the manifest naming "public-package-versions" is misleading if it intentionally excludes a public package. Out of scope for this PR; flagging because the review brief asked me to scrutinize the lockstep set.
  - Suggestion: Separate cleanup ticket — either add `control-plane` to the manifest (matching the file's name) or rename the file to clarify what it actually covers (e.g., `published-asset-versions.json`).

## Requirements/Design Alignment

**Evidence sources used:** `spec.md` (FR15, FR16, NFR3, NFR5, NFR8), `design.md` (Component 14, Component 15), `discovery.md` (Q1–Q10), `plan.md` (p04-tA..tF), `implementation.md`, `state.md`. Spec-driven mode.

### Requirements Coverage

| Requirement                                                      | Status      | Notes                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR15 (designMode config; selective accepted; quick-start parity) | partial     | Type/allow-list/tests for `selective` are correct in `oat-config.ts`, `commands/config/index.ts`, `oat-config.test.ts`, `resolve.test.ts`. Quick-start skill does NOT treat `'selective'` as `'collaborative'` — falls through to prompt (Important finding above).                                                                                    |
| FR16 (selective mode + Step 4a contract + reference file)        | implemented | Step 4a has all six required clauses in prose. Reference file has all five required headers + concrete content (Signal Set, Adequate Grounding, Recommendation Rules, Edge Cases, Dogfood Notes). Mid-flight elevation present. Final-recap line present. Picker has 3-choice with recommendation tag. Picker copy minor divergences (Medium finding). |
| NFR3 (release validate)                                          | implemented | `pnpm release:validate` passes for 5 public packages at `0.0.52`. Confirmed.                                                                                                                                                                                                                                                                           |
| NFR5 (skill ≤ 700 lines)                                         | implemented | `oat-project-design/SKILL.md` is 696 lines, under the 700-line ceiling.                                                                                                                                                                                                                                                                                |
| NFR8 (conservative + inspectable + contract test)                | partial     | The skill prose is conservative + inspectable correctly. The contract-preservation test covers only 4 of 6 skill clauses + 2 of 5 reference headers (Important finding above).                                                                                                                                                                         |

### Extra Work (not in declared requirements)

- `apps/oat-docs/docs/workflows/projects/design-modes.md` (108 lines) — new docs page covering the three modes. Accurate and in-scope; not in plan p04-tE. Medium finding above.
- Updates to `apps/oat-docs/docs/workflows/projects/lifecycle.md`, `apps/oat-docs/docs/workflows/projects/index.md`, `apps/oat-docs/docs/cli-utilities/configuration.md`, and `apps/oat-docs/index.md` — minor copy adds for the new mode. Reasonable companion to AGENTS.md, not in plan task list.

## Verification Commands

Run these to verify the implementation:

```bash
pnpm --filter @open-agent-toolkit/cli test                   # 1369 tests passing
pnpm --filter @open-agent-toolkit/cli type-check             # tsc --noEmit clean
pnpm --filter @open-agent-toolkit/cli lint                   # 0 warnings 0 errors
pnpm release:validate                                        # 5 packages at 0.0.52 — passes

# To inspect the Step 4a contract against the contract-preservation test
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "selective"

# To verify the FR15 quick-start gap (Important finding)
grep -n 'CONFIG_MODE' .agents/skills/oat-project-quick-start/SKILL.md
# Expect to see only collaborative/draft branches; selective should also be present.

# To compare picker copy against canonical Q5
diff <(sed -n '481,493p' .oat/projects/shared/collaborative-design-workflow/discovery.md) \
     <(sed -n '124,133p' .agents/skills/oat-project-design/SKILL.md)
# Expect divergences in "high-risk sections live" / "you review the committed file" wording.
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks. Suggested handling:

- **Important finding 1 (quick-start FR15 gap):** add a new fix task `p04-tG` that updates `oat-project-quick-start/SKILL.md` to treat `selective` as `collaborative` per FR15 acceptance + Component 15 Q7, bumps the quick-start skill `version:`, and adds a regression assertion (e.g., to `skills.test.ts`).
- **Important finding 2 (contract-preservation test gap):** add a fix task `p04-tH` that adds the four missing assertions to `packages/cli/src/validation/skills.test.ts` and optionally tightens the failure messages (Minor finding 1).
- **Medium finding 1 (picker copy):** roll into the same fix task as the contract-test expansion, or split off as `p04-tI` if a dedicated commit is clearer.
- **Medium findings 2-3:** decide whether to add a retroactive plan-coverage entry for the docs additions and whether to restore an `oat_blockers` entry until live dogfood lands. These are bookkeeping calls; either is defensible.

Update `plan.md` Reviews table: change row `| p04 | code | pending | - | - |` to `| p04-tA-tF | code | received | 2026-04-30 | reviews/p04-tA-tF-review-2026-04-30.md |` (or use the project's preferred status convention for "fixes_added" once tasks are scaffolded).
