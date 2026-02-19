---
oat_generated: true
oat_generated_at: 2026-02-19
oat_review_type: code
oat_review_scope: tracking-manifest-agent-instructions plan + supporting instruction research/docs
oat_review_scope_mode: files
oat_project: null
oat_review_mode: ad_hoc
---

# Code Review: tracking manifest + agent instructions plan (context-enriched)

**Reviewed:** 2026-02-19
**Range:** N/A (`--files` review)
**Files reviewed:** 8

## Summary

The plan direction is strong and consistent with the repo backlog goals, but several implementation details are still underspecified for reliable execution. The largest risks are schema ambiguity in shared tracking state, incomplete discovery semantics for AGENTS hierarchy/overrides, and loose provider-specific output contracts. Tightening those areas will reduce drift, prevent malformed generated files, and make delta mode dependable.

## Findings

### Critical

None.

### Important

1. **`tracking.json` contract is underspecified for multi-writer updates**
   - File refs: `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:11`, `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:83`, `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:123`, `.agents/docs/reference-architecture.md:326`
   - Analyze/apply/knowledge-index all write the same manifest, but the plan does not define required per-operation fields, merge semantics, or write conflict handling.
   - **Fix guidance:** Add a normative schema and update protocol (per-operation entries, required fields, merge behavior, and fallback when prior commit is invalid).

2. **Discovery semantics do not fully encode AGENTS hierarchy and override behavior**
   - File refs: `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:54`, `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:68`, `.agents/docs/agent-instruction.md:62`, `.agents/docs/agent-instruction.md:127`, `.agents/docs/provider-reference.md:170`, `.oat/repo/reviews/github-copilot-instructions-research-2026-02-19.md:304`
   - The plan states AGENTS is canonical but does not explicitly define nested `AGENTS.md` and `AGENTS.override.md` handling in discovery/evaluation logic.
   - **Fix guidance:** Specify traversal and precedence rules (root-to-leaf, nearest wins for AGENTS scope, explicit override precedence) and include `AGENTS.override.md` in discovery patterns where applicable.

3. **Provider-specific generation contracts are too loose for reliable apply output**
   - File refs: `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:44`, `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:71`, `.agents/docs/cursor-rules-files.md:100`, `.agents/docs/cursor-rules-files.md:102`, `.oat/repo/reviews/github-copilot-instructions-research-2026-02-19.md:107`
   - The plan identifies template targets, but does not define strict per-provider field requirements/validation for generated files.
   - **Fix guidance:** Add provider-specific validation checks in apply (required/recommended frontmatter fields and validity checks before commit/PR).

### Minor

1. **Verification coverage is narrower than the stated multi-format scope**
   - File refs: `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:200`, `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:201`, `.agents/docs/provider-reference.md:287`
   - Verification examples emphasize AGENTS and CLAUDE paths; Cursor/Copilot/Cline coverage checks are implied but not explicit.
   - **Fix guidance:** Add a provider matrix verification table with expected discovered files and acceptance checks by provider.

2. **Delta mode fallback behavior is not explicitly defined**
   - File refs: `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:83`, `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:117`
   - Plan lacks behavior for missing/unresolvable tracked commit hashes.
   - **Fix guidance:** Specify fallback to full mode, include reason in output summary, and rewrite tracking entry after successful run.

## Open Questions

1. Should Copilot behavior in this plan target VS Code semantics, GitHub coding-agent semantics, or both with explicit divergence notes?
2. Is `AGENTS.override.md` in-scope for v1 discovery/evaluation, or intentionally deferred?
3. Do you want optimistic-lock merge semantics in `tracking.json`, or do you want to enforce single-writer sequencing?

## Plan Detail Upgrades

1. Add a formal `tracking.json` schema section with required keys per operation and deterministic write/merge rules.
2. Add an explicit discovery precedence spec for AGENTS + overrides + nested files with concrete glob patterns.
3. Add provider-specific output contracts and validators for generated Cursor/Copilot/Claude artifacts.
4. Expand verification to include provider-by-provider expected discovery and output assertions.
5. Add delta fallback/recovery semantics for invalid tracking commit bases.

## Verification Commands

```bash
rg -n "tracking.json|Delta vs full mode|Update tracking.json|resolve-tracking" .oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md
rg -n "AGENTS.override.md|Shared override|precedence|nearest|nested AGENTS" .agents/docs/agent-instruction.md .agents/docs/provider-reference.md .oat/repo/reviews/github-copilot-instructions-research-2026-02-19.md
rg -n "description|alwaysApply|globs|applyTo|excludeAgent" .agents/docs/cursor-rules-files.md .oat/repo/reviews/github-copilot-instructions-research-2026-02-19.md
```

## Next Step

- Apply these plan-detail upgrades in `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md`, then run a follow-up `oat-review-provide --files` pass.
