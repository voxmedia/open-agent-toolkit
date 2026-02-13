---
oat_generated: false
oat_review_scope: design
oat_review_type: artifact
oat_project: .oat/projects/shared/provider-interop-cli
oat_last_updated: 2026-02-13
---

# Design Review: provider-interop-cli

## Status

Re-review complete. The prior 7 findings are addressed in `design.md`; this is close to approval with two remaining alignment items.

## Findings

### Medium

1. **Spec/design mismatch on Cursor project skill mapping**
   - Design now explicitly syncs Cursor project skills to `.cursor/skills`:
   - `/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/provider-interop-cli/design.md:316`
   - `/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/provider-interop-cli/design.md:323`
   - `/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/provider-interop-cli/design.md:328`
   - Spec FR5 still says no project-level Cursor skill sync (relies on `.claude/skills`):
   - `/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/provider-interop-cli/spec.md:110`
   - **Impact:** acceptance criteria and implementation intent diverge, which can cause test/review disagreement later.
   - **Recommendation:** update FR5 in `spec.md` to reflect the adopted design decision (always sync Cursor skills directly to `.cursor/skills`).

2. **New `oat providers` command is not represented in spec requirement index**
   - Design includes `oat providers list` and `oat providers inspect`:
   - `/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/provider-interop-cli/design.md:625`
   - `/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/provider-interop-cli/design.md:631`
   - `/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/provider-interop-cli/design.md:656`
   - Spec Requirement Index currently tracks FR1–FR11 only:
   - `/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/provider-interop-cli/spec.md:263`
   - **Impact:** reduced traceability from requirements -> tests for the added command surface.
   - **Recommendation:** either add a new FR for provider introspection or explicitly mark `oat providers` as part of FR4/diagnostics scope.

### Low

3. **`oat init` section could explicitly restate non-interactive behavior for consistency**
   - Non-interactive contract is clearly documented globally and under `oat status`, but not explicitly in `oat init` behavior text:
   - `/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/provider-interop-cli/design.md:201`
   - `/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/provider-interop-cli/design.md:575`
   - `/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/provider-interop-cli/design.md:604`
   - **Impact:** minor ambiguity for automation behavior of `oat init`.
   - **Recommendation:** add one line under `oat init` mirroring the non-interactive contract pattern used in `oat status`.

## Recommendation

Approve once the spec alignment in findings 1-2 is handled (or explicitly accepted as intentional scope change).
