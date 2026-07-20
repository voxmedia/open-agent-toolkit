---
oat_generated: true
oat_generated_at: 2026-07-20T17:09:42Z
oat_review_scope: p-rev5
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/wave-skills-promotion
---

# Code Review: p-rev5

**Reviewed:** 2026-07-20T17:09:42Z
**Scope:** Bounded single-commit review of the recap authoring-ownership docs revision (W6 recap-defects handoff, defect 2)
**Files reviewed:** 2 changed skill files; cross-checked against the handoff reference, the plan's p-rev5 body, and the p-rev4 review chain
**Commits:** 1 (`8b735858`)

## Summary

PASS. Commit `8b735858` is insertion-only (27 lines, zero deletions) and adds one caller-owns-prose-authoring paragraph to each recap-caller section, faithfully encoding the handoff's defect-2 evidence and the wave-promotion ask: authoring ownership parallels critic execution and fact-base synthesis, the W6 raw-dump evidence is cited precisely, the pending upstream seam is named descriptively without a normative API spec, and both compliant paths (author from fact base + recipe outline, or skip with recorded disposition per the optional-step rule) are present in both files. Mechanical contract text, Ownership Boundary sections, versions, and the p-rev4 program-ledger/program-scope semantics are untouched and uncontradicted.

Findings: 0 critical, 0 important, 0 medium, 0 minor

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `plan.md` (Phase p-rev5 body), `references/w6-recap-defects-handoff-2026-07-20.md` (defect 2 + the wave-promotion ask), the `8b735858` diff, both skill files at the commit, and the p-rev4 round-1/round-2 review artifacts for regression cross-check.

### Requirements Coverage

| Requirement                              | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Insertion-only diff, contracts untouched | implemented | `git show 8b735858` contains zero deletion lines. The `explainer-kit.fact-base/v1`, `run-request/v1`, and `manifest/v1` schema ids and required-key lines are byte-unchanged; both Ownership Boundary sections are byte-identical to the parent commit; frontmatter versions remain exactly execute `1.7.1` and program `1.3.1` (no bump required — the PR-scoped bumps already cover both skills per the plan body). |
| Handoff fidelity: authoring ownership    | implemented | Both paragraphs state the caller owns content authoring "exactly as it owns critic execution and fact-base synthesis" and that the kit's pipeline validates structure and fact consistency but nothing owns prose quality — matching defect 2's root-shape analysis (`.agents/skills/oat-wave-execute/SKILL.md:413`, `.agents/skills/oat-wave-program/SKILL.md:138`).                                                 |
| Handoff fidelity: W6 evidence            | implemented | run-19af6e55 is cited with the raw-dump specifics from the handoff: implementation.md pasted verbatim, frontmatter included, tables flattened to run-on prose, every automated gate passing it.                                                                                                                                                                                                                       |
| Upstream seam pending, no API spec       | implemented | The seam is cited as "pending upstream" using the handoff's own descriptors (caller-supplied author callback / `authorModulePath`) parenthetically; no signature, schema, keys, or required behavior is defined — the skill text does not spec the upstream API.                                                                                                                                                      |
| Two compliant paths                      | implemented | Both files require callers to either author the content document from the synthesized fact base plus the recipe outline (LLM-authored from summary/synthesis material, citing the operator-approved W6 rebuild) or NOT run the unattended build with the skip disposition recorded per the optional-step rule.                                                                                                        |
| Placement coherence                      | implemented | In both files the paragraph sits directly after the caller-owned fact-base-synthesis paragraph (judgment/ownership items grouped) and before the mechanical run-request paragraph, which remains uninterrupted. The program skill's variant correctly addresses "wave-close/program-close recap callers," matching its broader per-wave-recap coverage.                                                               |
| No p-rev4 contradiction                  | implemented | The insertion does not touch ledger targets, the program-scope recap default, deferral dispositions, or the program-end checkpoint. The skip path defers to the existing optional-step rule (`recap: not run — {reason}`), consistent with the p-rev4 disposition text in both skills.                                                                                                                                |
| Hygiene                                  | implemented | Single conventional commit matching the plan's declared message (commitlint clean); both changed files pass oxfmt; working tree clean.                                                                                                                                                                                                                                                                                |

### Extra Work (not in declared requirements)

None.

## Verification Commands

```bash
git show --stat 8b735858
git show 8b735858 | rg -c '^-[^-]' # expect 0 (insertion-only)
pnpm exec commitlint --from 8b735858^ --to 8b735858
pnpm exec oxfmt --check .agents/skills/oat-wave-execute/SKILL.md .agents/skills/oat-wave-program/SKILL.md
rg -U -n "prose|authoring" .agents/skills/oat-wave-execute/SKILL.md .agents/skills/oat-wave-program/SKILL.md
```

## Recommended Next Step

Record the p-rev5 review row as `passed` and proceed with phase bookkeeping.
