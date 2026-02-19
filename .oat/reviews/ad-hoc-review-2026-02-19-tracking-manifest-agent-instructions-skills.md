---
oat_generated: true
oat_generated_at: 2026-02-19
oat_review_type: code
oat_review_scope: .oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md
oat_review_scope_mode: files
oat_project: null
oat_review_mode: ad_hoc
---

# Code Review: tracking manifest + agent instructions plan

**Reviewed:** 2026-02-19
**Range:** N/A (`--files` review)
**Files reviewed:** 1

## Summary

The plan is directionally strong and aligns with existing backlog intent, but it leaves several execution-critical behaviors ambiguous. Most risk comes from under-specified tracking schema and collision-prone naming, which can cause inconsistent writer behavior and artifact loss in repeated runs. A few workflow details should also be normalized to match existing repo command conventions.

## Findings

### Critical

None.

### Important

1. **Tracking manifest contract is under-specified, which can cause incompatible writers**
   - File refs: `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:96`, `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:97`, `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:199`, `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:204`, `.oat/repo/reference/backlog.md:109`
   - The plan initializes only `{"version": 1}` but later assumes typed operation entries (for example `knowledgeIndex`) without defining required keys and update semantics.
   - **Fix guidance:** Add a concrete schema section in this plan (required fields per operation, allowed mode values, write/merge behavior).

2. **Delta mode has no fallback path when stored commit is invalid**
   - File refs: `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:83`, `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:117`
   - The plan depends on `git diff {hash}..HEAD` but does not define behavior for rebased/pruned/unresolvable hashes.
   - **Fix guidance:** Specify: if diff base cannot be resolved, switch to full mode and rewrite tracking for the current run.

3. **Date-only naming can overwrite analysis artifacts and collide branches**
   - File refs: `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:122`, `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:161`
   - Artifact and branch naming are date-only, so multiple same-day runs can overwrite artifacts or fail branch creation.
   - **Fix guidance:** Add a deterministic suffix strategy (`HHmm`, short SHA, or `-v2` increment).

### Minor

1. **Phase 1 parallelization statement is internally inconsistent**
   - File ref: `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:102`
   - The plan says all Phase 1 tasks can run in parallel, then states `T-03` depends on `T-04`.
   - **Fix guidance:** Reword as “parallelizable subset” plus explicit dependency chain.

2. **Phase 4 sync command format is inconsistent with repo convention**
   - File refs: `.oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md:176`, `AGENTS.md:9`, `AGENTS.md:25`
   - Plan uses `oat sync --scope all --apply`, while repo guidance standardizes `pnpm run cli -- <command>` and specifically `pnpm run cli sync --scope all --apply`.
   - **Fix guidance:** Normalize commands to the documented invocation pattern.

## Verification Commands

```bash
# confirm command references in plan match repo convention
rg -n "oat sync --scope all --apply|pnpm run cli sync --scope all --apply" .oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md AGENTS.md

# confirm schema details are explicit in the plan
rg -n "Schema|version|knowledgeIndex|agentInstructions|docs|fallback|full mode" .oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md

# confirm artifact/branch naming includes collision handling
rg -n "YYYY-MM-DD|HHmm|v2|suffix|short SHA|branch" .oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md
```

## Next Step

- Apply fixes directly in the plan file, then re-run `oat-review-provide --files .oat/repo/reference/external-plans/2026-02-19-tracking-manifest-agent-instructions-skills.md` for a follow-up pass.
