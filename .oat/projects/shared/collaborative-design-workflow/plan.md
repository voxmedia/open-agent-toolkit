---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-23
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p04'] # final phase only, per user selection 2026-04-23
oat_plan_parallel_groups: [['p01', 'p02']] # p01 design-skill edits and p02 companion-skill/docs/CLI edits have disjoint write sets (confirmed 2026-04-23)
oat_plan_source: spec-driven
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: collaborative-design-workflow

> Execute this plan using `oat-project-implement` — sequential by default, with p01 and p02 declared as a parallel group through `oat_plan_parallel_groups`.

**Goal:** Rework three OAT skills (`oat-project-design`, `oat-project-quick-start`, `oat-project-spec`) and lightly touch a fourth (`oat-project-discover`) so the design phase feels like a collaborative conversation by default — matching the Obra Superpowers `brainstorming` skill's section-by-section validation pattern — with a draft-and-review escape hatch, a non-interactive fallback for unattended agent orchestration, and a single approach-level divergent-thinking moment. Spec authoring folds into design (still produces `spec.md`), and `oat-project-spec` repositions as a standalone utility.

**Architecture:** Prompt/docs-only. No code under `packages/**` changes functionally. Touches four `.agents/skills/*/SKILL.md` files, one `.oat/templates/*.md` file, `AGENTS.md`, one new repo-root `NOTICES.md`, and five `packages/*/package.json` version bumps for the lockstep release rule.

**Tech Stack:** Markdown authoring; oxlint/oxfmt for doc formatting; `pnpm release:validate` for lockstep version enforcement; the new skills themselves (collaborative-design, quick-start with requirements gate) for dogfood validation.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): add mode-choice preamble to oat-project-design`. Use `feat` for new skill behavior, `docs` for prose-only edits, `chore` for package bumps + lockfile.

**Note on task shape:** This is a prompt/docs project. The template's RED/GREEN TDD pattern doesn't apply literally — there are no unit tests for prompt prose. Each task's "verify" step is a combination of (a) grep/visual checks that the edit landed where specified, (b) consistency checks against the cited spec FRs/NFRs and design components, (c) `pnpm lint && pnpm format --check` on touched files. Dogfood tasks in p04 are the live behavioral tests.

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Plan derived from design.md §Implementation Phases
- [x] Every FR and NFR from spec.md covered by at least one task
- [x] Requirement Index in spec.md updated with task mappings
- [x] Evaluated phases for parallelism opportunities after rebasing onto `oat-project-implement` v2
- [x] Set `oat_plan_parallel_groups` in frontmatter

## Parallelism

`oat-project-implement` v2 is the only implementation entry point. The old `oat-project-subagent-implement` skill was removed in PR #58; parallel execution is now declared as plan metadata and validated by `oat project validate-plan`.

**Status: Confirmed (2026-04-23).** `[['p01', 'p02']]` is the selected parallel group. p01 and p02 have disjoint write sets:

- `p01` modifies only `.agents/skills/oat-project-design/SKILL.md`.
- `p02` modifies companion skill/docs/CLI surfaces: `.agents/skills/oat-project-quick-start/SKILL.md`, `.agents/skills/oat-project-spec/SKILL.md`, `.agents/skills/oat-project-discover/SKILL.md`, `.oat/templates/discovery.md`, `AGENTS.md`, `NOTICES.md`, and `packages/cli/src/config/oat-config.ts` + its tests (Component 14 / FR15).

`p03` remains sequential because lockstep package/version updates depend on the final touched-skill set from p01+p02. `p04` remains sequential because dogfood, regression checks, PR creation, and review/merge depend on the completed implementation branch.

**HiLL checkpoints:** `oat_plan_hill_phases: ['p04']` (final phase only, confirmed 2026-04-23). Phases p01-p03 run through without human gates; p04 dogfood/PR work is where the user engages directly.

---

## Phase 1 (p01): `oat-project-design` rework

**Goal:** Transform `oat-project-design/SKILL.md` into the new collaborative-default skill. Touches one skill file end-to-end. No other files changed in this phase.

**Source:** design.md §Component 1, §Component 3, §Component 3.5, §Component 3.75, §Component 4, §Component 6, §Component 7. Spec FRs covered: FR1, FR2, FR3, FR4, FR5, FR6, FR8. NFRs exercised: NFR5 (line count budget).

### Task p01-t01: Add mode-choice preamble (Component 1)

**Files:**

- Modify: `.agents/skills/oat-project-design/SKILL.md`

**Step 1: Locate insertion point**

Add a new "Step 1.5: Resolve Interaction Mode" sub-step immediately after the existing Step 1 (Check Specification Complete) and before Step 2 (Read Specification Document). Reference: design.md §Component 1 Interfaces.

**Step 2: Edit**

Insert pseudocode:

```
DESIGN_MODE="${ARG_MODE:-${OAT_DESIGN_MODE:-}}"
if [ -z "$DESIGN_MODE" ]; then
  if [ "${OAT_NON_INTERACTIVE:-}" = "1" ] || [ ! -t 0 ]; then
    DESIGN_MODE="draft"
    echo "Non-interactive context detected. Falling back to draft-and-review mode."
  else
    # Consult persisted preference (FR15 / Component 14) before prompting
    CONFIG_MODE=$(oat config get workflow.designMode 2>/dev/null || echo "")
    if [ "$CONFIG_MODE" = "collaborative" ] || [ "$CONFIG_MODE" = "draft" ]; then
      DESIGN_MODE="$CONFIG_MODE"
      echo "Using workflow.designMode = ${DESIGN_MODE} from config."
    else
      # AskUserQuestion: "How would you like to work through the design?"
      #   1. Collaborative (recommended) — section-by-section, one approach confirmation before drafting
      #   2. Draft-and-review — full draft up front, you review holistically
      :
    fi
  fi
fi
echo "Running in ${DESIGN_MODE} mode."
```

Default collaborative when interactive. Fallback to draft when no TTY or `OAT_NON_INTERACTIVE=1`. Argument precedes env var.

**Step 3: Verify**

- Grep: `grep -n "DESIGN_MODE" .agents/skills/oat-project-design/SKILL.md` returns the new block.
- Consistency: spec.md FR1 acceptance criteria mention "Collaborative" and "Draft-and-review"; skill text matches exactly.
- `pnpm format --check .agents/skills/oat-project-design/SKILL.md`

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-design/SKILL.md
git commit -m "feat(p01-t01): add mode-choice preamble to oat-project-design"
```

### Task p01-t02: Add requirements-confirmation sub-step (Component 3)

**Files:**

- Modify: `.agents/skills/oat-project-design/SKILL.md`

**Step 1: Locate insertion point**

Add a new "Step 2: Requirements Confirmation" sub-step immediately after Step 1.5 (mode resolution) and before the existing section drafting. Renumber subsequent steps.

**Step 2: Edit**

Port the authoring logic from `oat-project-spec/SKILL.md` Steps 6-16 verbatim (duplicate for v1 per design.md §Open Questions recommendation). Adjust only: (a) the iterate-until-confirmed loop (current spec Step 10) runs only in `collaborative` mode; in `draft` mode the requirements are committed as part of the one-pass draft. (b) write to `{PROJECT_PATH}/spec.md` with `oat_status: complete`, `oat_ready_for: oat-project-design`.

Leave a one-line comment at the top of the ported block:

```
# Requirements-confirmation sub-step.
# The authoring logic below duplicates oat-project-spec Steps 6-16.
# When updating the requirements-authoring prose, update BOTH files.
```

**Step 3: Verify**

- Spec.md template (.oat/templates/spec.md) shape is preserved — no structural changes to the template.
- spec.md FR4 acceptance criteria are satisfied in prose (Requirement Index populated, `oat_status: complete`, downstream-readable).
- The "update BOTH files" note is present to address the duplication/drift risk flagged in design.md Open Questions.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-design/SKILL.md
git commit -m "feat(p01-t02): add requirements-confirmation sub-step (folded spec authoring)"
```

### Task p01-t03: Add approach reaffirmation (Component 3.5)

**Files:**

- Modify: `.agents/skills/oat-project-design/SKILL.md`

**Step 1: Locate insertion point**

Add a new "Step 2.5: Approach Reaffirmation" sub-step after requirements confirmation and before section drafting. Reference: design.md §Component 3.5 Interfaces.

**Step 2: Edit**

Insert pseudocode:

```
# Read discovery.md §Solution Space / §Chosen Direction.
# IF Chosen Direction exists:
#   Present: "Based on discovery, we're designing around [Approach N — one-line summary].
#            Confirming this is still the right direction before I draft the design?"
#   AskUserQuestion:
#     1. Yes — proceed with this approach
#     2. Revisit — I want to explore alternatives again
#   If "Revisit": invoke 2-3-approaches block below.
#
# IF no Chosen Direction exists:
#   Invoke 2-3-approaches pattern inline using Superpowers' EXACT prose
#   (attribution lives in NOTICES.md — DO NOT add in-skill attribution):
#
#     > Propose 2-3 different approaches with trade-offs.
#     > Present options conversationally with your recommendation and reasoning.
#     > Lead with your recommended option and explain why.
#
# Record confirmed approach in design.md §Overview before section drafting begins.
```

**Step 3: Verify**

- Grep: `grep -A3 "Propose 2-3 different approaches" .agents/skills/oat-project-design/SKILL.md` returns the borrowed lines.
- No in-skill attribution footer or comment references Superpowers (FR14 contract).
- Spec.md FR3 acceptance criteria: one divergent moment, reaffirmation path + invocation path covered.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-design/SKILL.md
git commit -m "feat(p01-t03): add approach reaffirmation sub-step"
```

### Task p01-t04: Add YAGNI guardrail (Component 3.75)

**Files:**

- Modify: `.agents/skills/oat-project-design/SKILL.md`

**Step 1: Locate insertion point**

Find the existing Mode Assertion / Guardrails block in `oat-project-design/SKILL.md` (under "OAT MODE: Design" or adjacent "ALLOWED Activities" / "BLOCKED Activities" lists). Add YAGNI as a named principle there.

**Step 2: Edit**

Insert this bullet in the Guardrails section (no in-skill attribution):

```
- **YAGNI ruthlessly** — remove unnecessary features from all designs.
  If a section drafts a capability the spec doesn't require, cut it.
  If a component boundary is there "in case we need it later", cut it.
```

**Step 3: Verify**

- Grep: `grep -n "YAGNI ruthlessly" .agents/skills/oat-project-design/SKILL.md` returns exactly the inserted line.
- No attribution to Superpowers appears in the skill file.
- Design.md §Component 3.75 insertion exactly matches.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-design/SKILL.md
git commit -m "feat(p01-t04): add YAGNI guardrail to oat-project-design"
```

### Task p01-t05: Section iterator collaborative branch (Component 4)

**Files:**

- Modify: `.agents/skills/oat-project-design/SKILL.md`

**Step 1: Locate**

Replace the current Steps 5-17 (draft-each-section-offline flow) with a new mode-branched section iterator. This task handles the collaborative branch only; p01-t06 adds the draft branch.

**Step 2: Edit**

Insert pseudocode for the collaborative branch (Superpowers-borrowed prose, no in-skill attribution):

```
IF DESIGN_MODE == "collaborative":
  Read spec.md for requirements context; read knowledge base.
  For SECTION in [Overview + Architecture, Component Design, Data Models,
                  API Design, Security, Performance, Error Handling,
                  Testing Strategy (with Req→Test Mapping), Deployment,
                  Migrations, Implementation Phases, Risks]:
    Draft section content. Scale depth to complexity:
      a few sentences if straightforward, up to 200-300 words if nuanced.
    Not-applicable sections: state as a single sentence, not empty.
    Present:
      "Here's what I have for [section]: [content].
       Does this look right, or should we adjust before continuing?"
    Use AskUserQuestion for the validation prompt.
    Revise inline on feedback. Be ready to go back and clarify if
      something doesn't make sense. Re-present if substantive.
    Mark section approved. Move to next.
```

Include a skill-level comment `# Borrowed language from Superpowers brainstorming — see NOTICES.md` ONLY as a single internal comment line, not as visible attribution in the prompt prose. Actually — per FR14, even comment-level attribution in the skill file is off-limits. Omit the comment entirely.

**Step 3: Verify**

- Grep: `grep -n "Scale each section to its complexity" .agents/skills/oat-project-design/SKILL.md` returns the borrowed phrasing (if lifted exactly).
- No attribution to Superpowers anywhere in the skill file.
- spec.md FR2 acceptance criteria are structurally present.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-design/SKILL.md
git commit -m "feat(p01-t05): add section iterator collaborative branch"
```

### Task p01-t06: Draft-and-review branch (Component 4 alt)

**Files:**

- Modify: `.agents/skills/oat-project-design/SKILL.md`

**Step 1: Locate**

Immediately after the collaborative branch from p01-t05, add the draft branch guarded by `IF DESIGN_MODE == "draft"`.

**Step 2: Edit**

Insert pseudocode:

```
IF DESIGN_MODE == "draft":
  Read spec.md for requirements context; read knowledge base.
  Draft all applicable sections in one pass (same section list as
    collaborative mode). Apply same "scale each section to its
    complexity" principle. Do NOT fire per-section prompts.
  Write design.md with all sections.
  Continue to self-review (Component 6) → user-review gate (Component 7).
  The user-review gate is the sole point of user interaction in draft mode.
```

**Step 3: Verify**

- Grep: `grep -n "IF DESIGN_MODE" .agents/skills/oat-project-design/SKILL.md` returns both branches.
- No per-section prompts fire in the draft branch.
- spec.md FR8 acceptance criteria covered.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-design/SKILL.md
git commit -m "feat(p01-t06): add draft-and-review branch"
```

### Task p01-t07: Design self-review (Component 6)

**Files:**

- Modify: `.agents/skills/oat-project-design/SKILL.md`

**Step 1: Locate**

After both mode branches complete and produce `design.md`, before any HiLL/user-review gate, insert a self-review sub-step.

**Step 2: Edit**

Insert (Superpowers-borrowed 4-check template, no in-skill attribution):

```
# Self-review: silent agent-side quality pass. No user prompt fires here.

1. Placeholder scan: search design.md + spec.md for "TBD", "TODO", "FIXME",
   placeholder sections. Fix inline.
2. Internal consistency: does architecture match component descriptions?
   Do API schemas match data models? Does testing cover the requirements?
   Fix inline.
3. Scope check: did the design grow beyond discovery's scope? If genuine
   multi-subsystem scope surfaces, escalate to user — they may want to
   split (follow-up split-escape-hatch project; not this skill's job).
4. Ambiguity check: could any requirement or design statement be
   interpreted two ways? Pick one and make it explicit.

Apply fixes inline. Do not re-run self-review. Continue to user-review gate.
```

**Step 3: Verify**

- Grep: `grep -c "Placeholder scan\|Internal consistency\|Scope check\|Ambiguity check" .agents/skills/oat-project-design/SKILL.md` returns 4.
- Self-review fires before the HiLL/user-review gate (ordering check).
- spec.md FR5 acceptance criteria covered.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-design/SKILL.md
git commit -m "feat(p01-t07): add design self-review (4 checks)"
```

### Task p01-t08: Commit-first user-review gate (Component 7)

**Files:**

- Modify: `.agents/skills/oat-project-design/SKILL.md`

**Step 1: Locate**

Replace the current Step 19 (HiLL Gate) + Step 22 (Commit) ordering with a new sequence: commit FIRST, then user-review gate, then state approval → optional second commit on revise. Reference: design.md §Component 7 Interfaces.

**Step 2: Edit**

Insert pseudocode:

```
# Step 6a: Commit drafted artifacts FIRST (before user-review gate).
# This matches Superpowers' "written and committed" language literally.
git add "$PROJECT_PATH/spec.md" "$PROJECT_PATH/design.md" "$PROJECT_PATH/state.md"
git diff --cached --quiet || git commit -m "docs: draft design for {project-name} (awaiting review)"

# Step 6b: Read state.md frontmatter.
# Step 6c: If no HiLL configured, skip the prompt (artifact is still committed). Skill exits clean.
# Step 6d: If "design" in oat_hill_checkpoints (or "spec" and not already
#          completed via standalone spec skill):

  Prompt (literal):
    > "Design written and committed to {design.md path}.
    >  spec.md (with confirmed requirements) is at {spec.md path}.
    >  Please review them and let me know if you want to make any changes
    >  before we move to planning.
    >
    >  Optional: run `oat-project-review-provide artifact design` for an
    >  independent reviewer pass first."

  On approval: Step 7 (append "design" to oat_hill_completed; if "spec"
    in oat_hill_checkpoints, append "spec" too; commit state.md update).
  On change requests: revise affected section(s) + re-run self-review +
    commit NEW "docs: revise design after user review feedback" + re-prompt.
```

**Step 3: Verify**

- Grep: the commit-first command appears BEFORE the HiLL prompt in the skill prose.
- Spec.md FR6 acceptance criteria (reworded prompt) are met.
- Design-review finding M1 ("written and committed" before commit) is addressed.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-design/SKILL.md
git commit -m "feat(p01-t08): reorder commit + user-review gate (Superpowers-aligned)"
```

### Task p01-t09: Cleanup + frontmatter version bump (NFR5 line-count check)

**Files:**

- Modify: `.agents/skills/oat-project-design/SKILL.md`

**Step 1: Remove obsolete content**

Find any references to the pre-rework Steps 5-18 that didn't get rewritten (stale step numbering, old HiLL semantics not folded, old "review design with user" Step 18 that duplicates the new gate). Delete. Ensure Step numbering is continuous across the rewritten skill.

**Step 2: Bump frontmatter version**

Update frontmatter `version:` from `1.2.0` → `2.0.0` (major bump — behavioral change; aligns all four touched project-workflow skills on 2.0.0 per the coordinated-release decision).

**Step 3: Verify**

- `wc -l .agents/skills/oat-project-design/SKILL.md` ≤ 700 (NFR5 budget).
- `grep -n "^version:" .agents/skills/oat-project-design/SKILL.md` shows `2.0.0`.
- No orphaned Step references (e.g., "See Step 14" where Step 14 was removed).
- `pnpm lint && pnpm format --check .agents/skills/oat-project-design/SKILL.md`

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-design/SKILL.md
git commit -m "chore(p01-t09): cleanup oat-project-design and bump version 1.2.0 → 2.0.0"
```

---

## Phase 2 (p02): Companion skill edits + AGENTS + NOTICES

**Goal:** Apply all remaining skill rewrites in coordinated commits: quick-start extension, spec repositioning, discover routing, AGENTS.md triage update, and repo-root NOTICES.md.

**Source:** design.md §Component 8, §Component 9, §Component 10, §Component 11, §Component 12, §Component 13. Spec FRs covered: FR9, FR10, FR11, FR12, FR13, FR14. NFRs exercised: NFR1 (contract preservation).

### Task p02-t01: Quick-start requirements gate — single-turn with non-interactive fallback (Component 8)

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`

**Step 1: Locate**

Add new "Step 2.6: Requirements Gate" between existing Step 2.5 (Decision Point — Design Depth) and Step 3 (Generate Plan Directly). Fires only on straight-to-plan paths (explicit choice or auto-advance).

**Step 2: Edit**

Insert pseudocode per design.md §Component 8 Interfaces:

```
# Non-interactive fallback FIRST (FR9 contract; same signal as design mode choice).
if [ "${OAT_NON_INTERACTIVE:-}" = "1" ] || [ ! -t 0 ]; then
  echo "Requirements gate auto-confirmed in non-interactive mode."
  # proceed to Step 3
fi

# Interactive bypass (power-user opt-out).
if [ "${OAT_NO_REQUIREMENTS_GATE:-}" = "1" ] || [ "$ARG_NO_GATE" = "1" ]; then
  # proceed to Step 3 silently
fi

# Extract requirements from discovery.md Key Decisions / Success Criteria / Constraints.
# Present as one-screen bullet list (SINGLE TURN).
# AskUserQuestion multi-choice:
#   1. Yes — proceed to plan generation
#   2. Add minor requirement that fits scope — capture inline, proceed (no re-present)
#   3. Scope needs redirecting — route to lightweight design OR expand discovery (exit gate cleanly)
# Do NOT loop inside the gate.
```

**Step 3: Verify**

- Grep: `grep -n "OAT_NON_INTERACTIVE" .agents/skills/oat-project-quick-start/SKILL.md` — exists before the interactive bypass.
- No loop construct inside the gate; material-redirect path routes OUT.
- spec.md FR11 acceptance criteria (single-turn + non-interactive) covered.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-quick-start/SKILL.md
git commit -m "feat(p02-t01): add quick-start requirements gate (single-turn + non-interactive)"
```

### Task p02-t02: Quick-start lightweight design mode choice (Component 9 / Step 2.75a)

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`

**Step 1: Locate**

Insert new "Step 2.75a: Lightweight Design Mode Choice" at the top of the existing Step 2.75 block (before current incremental-validation prose).

**Step 2: Edit**

Insert pseudocode (same mechanics as p01-t01 Component 1):

```
DESIGN_MODE="${ARG_MODE:-${OAT_DESIGN_MODE:-}}"
if [ -z "$DESIGN_MODE" ]; then
  if [ "${OAT_NON_INTERACTIVE:-}" = "1" ] || [ ! -t 0 ]; then
    DESIGN_MODE="draft"
  else
    # Consult persisted preference (FR15 / Component 14) before prompting
    CONFIG_MODE=$(oat config get workflow.designMode 2>/dev/null || echo "")
    if [ "$CONFIG_MODE" = "collaborative" ] || [ "$CONFIG_MODE" = "draft" ]; then
      DESIGN_MODE="$CONFIG_MODE"
    else
      # AskUserQuestion (SAME prompt text as Component 1):
      #   "How would you like to work through the lightweight design?"
      #     1. Collaborative (recommended) — section-by-section
      #     2. Draft-and-review — full draft up front
      :
    fi
  fi
fi
```

**Step 3: Verify**

- Grep: both `oat-project-design/SKILL.md` and `oat-project-quick-start/SKILL.md` use identical mode-choice prompt text.
- Non-interactive fallback behaves identically.
- spec.md FR12 acceptance criteria (mode choice) covered.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-quick-start/SKILL.md
git commit -m "feat(p02-t02): add quick-start lightweight design mode choice"
```

### Task p02-t03: Replace Step 2.75 collaborative prose with Superpowers-borrowed canonical version

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`

**Step 1: Locate**

Current lines 244-251 in `oat-project-quick-start/SKILL.md` (OAT-synthesized "Present design incrementally for validation" block). Replace entirely.

**Step 2: Edit**

Replace with the same section-by-section pseudocode from p01-t05 (Component 4 collaborative branch), scoped to the quick-start reduced section set:

```
IF DESIGN_MODE == "collaborative":
  For SECTION in [Overview, Architecture, Component Design, Testing Strategy
                  (required); Data Models, API Design, Error Handling
                  (optional when relevant); SKIP Security, Performance,
                  Deployment, Migration]:
    Draft section content. Scale depth to complexity (a few sentences if
      straightforward, up to 200-300 words if nuanced — Superpowers prose).
    Present: "Here's what I have for [section]: [content].
              Does this look right, or should we adjust before continuing?"
    Revise inline on feedback. Be ready to go back and clarify if something
      doesn't make sense.
    Mark section approved. Move on.
```

**Step 3: Verify**

- The current OAT-synthesized prose at lines 244-251 is gone (grep for "Present design incrementally for validation" returns nothing).
- The new prose matches the design skill's collaborative branch prose word-for-word (aside from the reduced section set).
- spec.md FR12 acceptance criteria (same Superpowers-aligned prose) covered.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-quick-start/SKILL.md
git commit -m "feat(p02-t03): replace Step 2.75 prose with Superpowers-borrowed canonical version"
```

### Task p02-t04: Quick-start draft-and-review branch for lightweight design

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`

**Step 1: Locate**

Immediately after the collaborative branch from p02-t03, add the draft branch.

**Step 2: Edit**

Insert pseudocode:

```
IF DESIGN_MODE == "draft":
  Draft all required sections + applicable optional sections in one pass
    (same reduced section set; no security/performance/deployment/migration).
  Scale depth to complexity.
  Run Component 6's FULL 4-check self-review (placeholder + consistency +
    scope + ambiguity). No scaled-down variant — same behavior as full design.
  Present Component 7's user-review gate wording (adapted for quick-start:
    no HiLL gate by default; still commits-first).
  Produce design.md only — NO spec.md.
```

**Step 3: Verify**

- Full 4-check self-review (not scaled-down) applied.
- No `spec.md` is produced by lightweight design.
- spec.md FR12 acceptance criteria (draft branch, full self-review, no spec.md) covered.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-quick-start/SKILL.md
git commit -m "feat(p02-t04): add quick-start lightweight design draft-and-review branch"
```

### Task p02-t05: Quick-start frontmatter version bump

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`

**Step 1: Bump**

Update frontmatter `version:` from `1.3.6` → `2.0.0` (major bump — behavioral change; aligns all four touched project-workflow skills on 2.0.0 per the coordinated-release decision).

**Step 2: Verify**

- `grep -n "^version:" .agents/skills/oat-project-quick-start/SKILL.md` shows `2.0.0`.
- Total skill length: `wc -l .agents/skills/oat-project-quick-start/SKILL.md` ≤ `current + 100` lines (per constraint in spec).
- `pnpm lint && pnpm format --check .agents/skills/oat-project-quick-start/SKILL.md`

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-quick-start/SKILL.md
git commit -m "chore(p02-t05): bump oat-project-quick-start version 1.3.6 → 2.0.0"
```

### Task p02-t06: Reposition `oat-project-spec` (Component 10)

**Files:**

- Modify: `.agents/skills/oat-project-spec/SKILL.md`

**Step 1: Update frontmatter description**

Replace the current `description:` field with (per design.md §Component 10):

```yaml
description: Optional standalone skill for formalizing requirements into a structured spec.md when discovery is complete but you're not ready to design yet. Independent of the design workflow — oat-project-design confirms requirements automatically and does not require this skill to be run first.
```

**Step 2: Update closing-output prose (existing Step 21)**

Replace the "Next: Create detailed design with the oat-project-design skill" wording with the standalone-utility version from design.md §Component 10. Explicit language: "This skill is optional in the default workflow. `oat-project-design` will confirm requirements automatically when run after discovery. If you want to proceed to design now, run `oat-project-design`. If you're parking the project here, the spec.md is committed and ready to pick up later."

**Step 3: Bump frontmatter version**

`version:` from `1.2.0` → `2.0.0` (major bump — behavioral change; aligns all four touched project-workflow skills on 2.0.0 per the coordinated-release decision).

**Step 4: Verify**

- Skill mechanics (Steps 0-21) are unchanged — spot-check no logic edits happened.
- spec.md FR10 acceptance criteria (description update, closing-output reposition) covered.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-spec/SKILL.md
git commit -m "feat(p02-t06): reposition oat-project-spec as standalone utility"
```

### Task p02-t07: `oat-project-discover` routing edits (Component 11)

**Files:**

- Modify: `.agents/skills/oat-project-discover/SKILL.md`
- Modify: `.oat/templates/discovery.md`

**Step 1: Edit discover skill — three surgical changes**

- Step 11 HiLL prompt: replace `unlock oat-project-spec` with `unlock oat-project-design`.
- Step 12 frontmatter: `oat_ready_for: oat-project-spec` → `oat_ready_for: oat-project-design`.
- Step 15 closing-output: the next-command line becomes `oat-project-design` with `oat-project-spec` mentioned only as an optional alternative for "formalize requirements without designing yet" users.

**Step 2: Edit template**

`.oat/templates/discovery.md` §Next Steps: replace the current "Spec-driven mode: continue to `oat-project-spec`" bullet with the new routing (per design.md §Component 11 updated Next Steps template).

**Step 3: Bump frontmatter version**

`.agents/skills/oat-project-discover/SKILL.md` `version:` from `1.3.0` → `2.0.0` (major bump — behavioral change; aligns all four touched project-workflow skills on 2.0.0 per the coordinated-release decision).

**Step 4: Verify**

- No occurrence of `oat-project-spec` remains in the default-routing lines of the discover skill (spec only appears in the optional-alternative sentence).
- spec.md FR13 acceptance criteria (Step 11/12/15 + template routed to design) covered.
- Templates still valid: `test -f .oat/templates/discovery.md && head -10 .oat/templates/discovery.md`.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-discover/SKILL.md .oat/templates/discovery.md
git commit -m "feat(p02-t07): route discover to oat-project-design; spec standalone"
```

### Task p02-t08: AGENTS.md workflow triage update + External Attributions reference (Component 12)

**Files:**

- Modify: `AGENTS.md`

**Step 1: Update workflow-triage prose**

Replace the "Full spec-driven workflow — Discovery → Spec → Design → Plan → Implement" description with: "Full spec-driven workflow — Discovery → Design (with confirmed requirements & spec.md) → Plan → Implement. Design produces both spec.md and design.md as part of one collaborative conversation."

**Step 2: Add External Attributions subsection**

Add one new subsection near the end of AGENTS.md (or near the skills-system/principles section — whichever fits best):

```markdown
## External Attributions

Prose adapted from external projects is tracked in the repo-root `NOTICES.md`.
When borrowing from an external source, add an entry there.
```

**Step 3: Verify**

- Workflow triage text matches the new shape (no "Spec" as a discrete listed phase).
- AGENTS.md references `NOTICES.md` exactly once.
- spec.md FR10 / FR13 / FR14 acceptance criteria that require AGENTS.md prose are met.

**Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs(p02-t08): update AGENTS.md workflow triage + NOTICES.md reference"
```

### Task p02-t09: Create repo-root `NOTICES.md` (Component 13 / FR14)

**Files:**

- Create: `NOTICES.md` (repo root)

**Step 1: Create NOTICES.md**

Create the file at repo root with the content specified in design.md §Component 13 Interfaces. Structure: one consolidated entry for Obra Superpowers `brainstorming` with MIT license, v5.0.7, list of passages borrowed with one-line descriptors, and list of consumer OAT skills (`oat-project-design`, `oat-project-quick-start`).

**Step 2: Verify**

- `test -f NOTICES.md` exists.
- File contains the Obra Superpowers section with all five listed passages (Exploring approaches → Component 3.5; Presenting the design → Component 4; Design for isolation and clarity → Component 4 principle; self-review 4-check template → Component 6; user-review gate phrasing → Component 7).
- Consumer skills list contains both `oat-project-design` and `oat-project-quick-start`.
- No in-skill attribution remains in any `.agents/skills/*/SKILL.md` file: `grep -rn "Obra Superpowers\|from Superpowers" .agents/skills/` returns nothing.
- spec.md FR14 acceptance criteria all met.

**Step 3: Commit**

```bash
git add NOTICES.md
git commit -m "docs(p02-t09): add repo-root NOTICES.md for Superpowers attribution"
```

### Task p02-t10: Extend `OatWorkflowConfig` with `designMode` (Component 14 / FR15)

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.test.ts` (verify effective-config merge for the new field)
- Update: CLI config describe surface (grep for `hillCheckpointDefault` in describe/list code paths and mirror).

**Step 1: Add the type and interface field**

In `packages/cli/src/config/oat-config.ts`, add alongside `WorkflowHillCheckpointDefault`:

```ts
export type WorkflowDesignMode = 'collaborative' | 'draft';
```

Add `designMode?: WorkflowDesignMode;` to the `OatWorkflowConfig` interface (currently at `oat-config.ts:38-46`).

**Step 2: Add validation to `normalizeWorkflowConfig`**

Mirror the `hillCheckpointDefault` validation block (`oat-config.ts:67-75`):

```ts
const VALID_DESIGN_MODES: readonly WorkflowDesignMode[] = [
  'collaborative',
  'draft',
];

// In normalizeWorkflowConfig, alongside the other validators:
if (
  typeof parsed.designMode === 'string' &&
  (VALID_DESIGN_MODES as readonly string[]).includes(parsed.designMode)
) {
  next.designMode = parsed.designMode as WorkflowDesignMode;
}
```

**Step 3: Update the `oat config describe` surface**

Grep for where `hillCheckpointDefault` is surfaced in describe/list output (likely in `packages/cli/src/commands/config/`). Add a parallel entry for `workflow.designMode` with valid values `collaborative` / `draft` and a short description matching FR15.

**Step 4: Tests**

Extend `oat-config.test.ts` to mirror the `hillCheckpointDefault` coverage:

- Valid value (`"collaborative"`) accepted.
- Valid value (`"draft"`) accepted.
- Invalid value (`"xyz"`) silently dropped.
- Missing field leaves the field `undefined` in the normalized config.
- User config is overridden by repo config when both set the field (merge precedence).

Extend `resolve.test.ts` if needed to confirm `resolveEffectiveConfig` surfaces `workflow.designMode` correctly (should fall out of existing merge logic).

**Step 5: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli test
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli lint
# Smoke test CLI surface:
pnpm run cli -- config set workflow.designMode draft
pnpm run cli -- config get workflow.designMode        # → draft
pnpm run cli -- config describe workflow.designMode   # → includes valid values
# Reset:
pnpm run cli -- config unset workflow.designMode 2>/dev/null || \
  node -e "const fs=require('fs'); const p='.oat/config.json'; const c=JSON.parse(fs.readFileSync(p,'utf8')); delete c.workflow.designMode; fs.writeFileSync(p, JSON.stringify(c,null,2));"
```

(The `config unset` command may not exist yet; see `bl-af93`. If not, fall back to the node snippet.)

**Step 6: Commit**

```bash
git add packages/cli/src/config/oat-config.ts \
        packages/cli/src/config/oat-config.test.ts \
        packages/cli/src/config/resolve.test.ts \
        packages/cli/src/commands/config/
git commit -m "feat(p02-t10): extend OatWorkflowConfig with designMode (FR15)"
```

**Acceptance:**

- FR15 acceptance criteria met: schema accepts `collaborative`/`draft`, rejects others; `oat config get/set/describe` surfaces the key; existing configs without the key continue to load.
- Pseudocode in p01-t01 and p02-t02 can now call `oat config get workflow.designMode` at runtime.

---

## Phase 3 (p03): Lockstep version bumps + release validation

**Goal:** Satisfy AGENTS.md release rules. Public package versions bump together; `pnpm release:validate` exits 0.

**Source:** spec.md NFR3; AGENTS.md publishable-package lockstep rule.

### Task p03-t01: Bump lockstep public package versions

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Identify current version**

Read current version from `packages/cli/package.json` (source of truth for the other four — they're in lockstep).

**Step 2: Bump all five to the same next version**

Bump all five packages to the next minor version (e.g., `0.0.32` → `0.0.33` if that's the current convention — check with `grep version packages/cli/package.json` and bump by the repo's standard increment).

**Step 3: Update lockfile**

```bash
pnpm install
```

This rewrites `pnpm-lock.yaml` to reflect the new internal versions.

**Step 4: Verify**

- All five `packages/*/package.json` files show the same new version.
- `pnpm-lock.yaml` is updated and consistent.
- `pnpm list --depth 0 | head -30` shows the new versions for workspace packages.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json \
        packages/docs-config/package.json packages/docs-theme/package.json \
        packages/docs-transforms/package.json pnpm-lock.yaml
git commit -m "chore(p03-t01): bump lockstep public package versions"
```

### Task p03-t02: Run `pnpm release:validate`

**Files:** None (validation-only task).

**Step 1: Run**

```bash
pnpm release:validate
```

**Step 2: Verify**

- Exit code 0.
- Output reports all five public packages at the same new version; no orphan bumps.
- If validation fails, fix the specific issue raised, amend the relevant p03-t01 file(s), re-run pnpm install, re-run validate, and commit the fix as a new task (not by amending).

**Step 3: Commit** (nothing to commit if validate passed on first try; only if an amendment was needed)

```bash
git add {amended files}
git commit -m "chore(p03-t02): fix release:validate issue"
```

---

## Phase 4 (p04): Dogfood + regressions + PR

**Goal:** Behavioral validation of the new flow on a real OAT change, plus NFR1/NFR2 regression tests, plus PR submission with migration-note framing.

**Source:** design.md §Testing Strategy §End-to-End Tests. Spec FRs exercised: FR1-FR14 (behavioral). NFRs: NFR1 (contract preservation), NFR2 (HiLL semantics), NFR4 (wall-clock).

**Execution note for dogfood tasks (p04-t02 through p04-t07):** These tasks are interactive user runs — the human operator invokes each flow live, observes the section-by-section prose and prompt behavior, and reports the pass/fail outcome back to the implementer. The agent should not attempt to auto-execute these behind the user's back; instead, each task should present a clear "what to run" / "what to watch for" recipe, then pause for the user to run it and report back before moving on. Regression tasks (p04-t08, p04-t09) can be run non-interactively if the user prefers.

### Task p04-t01: Scaffold dogfood follow-up project

**Files:** None in the collaborative-design-workflow project; creates a new follow-up OAT project.

**Step 1: Pick target**

Identify a small OAT enhancement not in this PR's scope (e.g., "add `--verbose` flag to `oat-project-open`").

**Step 2: Scaffold**

```bash
pnpm run cli -- project new dogfood-collab-design-verify --mode spec-driven
```

**Step 3: Run discovery**

Invoke `oat-project-discover` against the new project. Produce a realistic `discovery.md` so subsequent dogfood runs have real input.

**Step 4: Commit**

```bash
git add .oat/projects/shared/dogfood-collab-design-verify/
git commit -m "chore(p04-t01): scaffold dogfood follow-up project"
```

### Task p04-t02: Dogfood — full design collaborative mode (FR1, FR2, FR3, FR4, FR5, FR6 + NFR4)

**Step 1: Run**

Invoke the new `oat-project-design` against the dogfood project. Select Collaborative mode at the prompt.

**Step 2: Observe / Verify**

- Mode-choice prompt fires (FR1).
- Requirements-confirmation sub-step runs and produces `spec.md` (FR4).
- Approach reaffirmation fires once (FR3) — read discovery's Solution Space, confirm.
- Section iterator presents sections one at a time with validation prompts (FR2).
- Section depth scales to complexity — N/A sections are one-liners (FR2 + NFR4).
- Self-review runs silently after drafting (FR5).
- User-review gate wording is the new Superpowers-aligned phrasing; artifact is already committed at the time of the prompt (FR6 + design-review-M1 fix).
- Elapsed time and prompt count are noted for NFR4 comparison.

**Step 3: Record**

Note results in a dogfood log (not committed — or committed to the dogfood project's own implementation.md).

### Task p04-t03: Dogfood — full design draft mode (FR8)

**Step 1: Run**

Re-run `oat-project-design` against a second dogfood project (fresh scaffold) with `--mode draft`.

**Step 2: Verify**

- No per-section prompts fire.
- Full `spec.md` + `design.md` produced in one pass.
- Self-review still fires.
- User-review gate fires once at end, on a committed artifact.
- spec.md FR8 acceptance criteria all met.

### Task p04-t04: Dogfood — unattended orchestrator (FR9)

**Step 1: Run**

Invoke `oat-project-design` with `OAT_NON_INTERACTIVE=1` set (or via stdin redirected from `/dev/null`).

**Step 2: Verify**

- Mode auto-falls-back to draft; banner emitted.
- No prompt blocks.
- spec.md and design.md produced and committed.
- spec.md FR9 acceptance criteria met.

### Task p04-t05: Dogfood — quick-start requirements gate (FR11)

**Step 1: Run**

`oat-project-quick-start` with a well-understood request (e.g., "add `--verbose` flag to `oat-project-open`"). Let the auto-advance path hit.

**Step 2: Verify**

- Step 2.6 gate fires before plan generation (even on auto-advance path).
- Gate is single-turn.
- Redirect option exits the gate to lightweight design / discovery — does not loop.
- `OAT_NO_REQUIREMENTS_GATE=1` bypass works (second run).
- `OAT_NON_INTERACTIVE=1` auto-confirm works (third run).
- spec.md FR11 acceptance criteria met.

### Task p04-t06: Dogfood — quick-start lightweight design mode choice (FR12)

**Step 1: Run**

`oat-project-quick-start` with an exploratory request. Choose "Lightweight design first" at Step 2.5. Run once in Collaborative, once in Draft-and-review mode (two separate projects).

**Step 2: Verify**

- Mode-choice prompt fires at top of Step 2.75.
- Collaborative mode uses the Superpowers-borrowed prose (identical to full design collaborative mode).
- Draft-and-review mode runs the full 4-check self-review (not scaled-down).
- Reduced section set preserved in both modes (no security/performance/deployment/migration).
- NO `spec.md` is produced by lightweight design.
- spec.md FR12 acceptance criteria met.

### Task p04-t07: Dogfood — spec standalone (FR10)

**Step 1: Run**

Run `oat-project-spec` against a project with completed discovery, without chaining to design.

**Step 2: Verify**

- Skill produces `spec.md` as before (mechanics unchanged).
- Closing output mentions `oat-project-design` as the OPTIONAL next step, not required.
- Skill description (frontmatter) reflects standalone status.
- AGENTS.md workflow-triage text does not imply spec is a pipeline step.
- spec.md FR10 acceptance criteria met.

### Task p04-t08: Regression — existing-project compatibility (NFR1)

**Step 1: Pick existing project**

Choose an existing project in `.oat/projects/shared/*` that has completed `spec.md` + `design.md` in the pre-rework format (e.g., `docs-bootstrap-skill` or `docs-readability-reorg`).

**Step 2: Run**

Invoke `oat-project-plan` against the existing project using the new (post-rework) OAT skill pack.

**Step 3: Verify**

- Plan skill reads the existing spec.md + design.md without errors.
- plan.md is produced in the expected format.
- No manual migration required.
- spec.md NFR1 acceptance criteria met.

### Task p04-t09: Regression — HiLL semantics with both spec + design checkpoints (NFR2)

**Step 1: Construct synthetic state**

Create a test project with `state.md` frontmatter `oat_hill_checkpoints: ["spec", "design"]`.

**Step 2: Run**

Run the new `oat-project-design` end-to-end against this project.

**Step 3: Verify**

- On HiLL approval, `oat_hill_completed` contains BOTH `"spec"` and `"design"`.
- No state-migration errors surface.
- spec.md NFR2 acceptance criteria met.

### Task p04-t10: Open PR with migration note

**Step 1: Push branch**

```bash
git push origin HEAD:collaborative-design
```

**Step 2: Open PR**

Title: `feat(skills): collaborative design workflow — rework design/quick-start/spec/discover to Superpowers-aligned pattern`.

Body must call out the behavioral migration:

- Spec is no longer a required pipeline step; runs standalone.
- Discovery now routes to `oat-project-design`.
- Design produces both spec.md and design.md in one conversation.
- New env vars: `OAT_DESIGN_MODE`, `OAT_NO_REQUIREMENTS_GATE`, `OAT_NON_INTERACTIVE`.
- Attribution for Superpowers-borrowed prose in new `NOTICES.md`.

Reference this project's spec.md, design.md, and NOTICES.md.

**Step 3: Verify**

- PR opens cleanly; CI kicks off.
- Migration note visible in PR description.

### Task p04-t11: Run `oat-project-review-provide artifact code` on PR changes + merge

**Step 1: Review**

Invoke `oat-project-review-provide` scoped to the PR's code/doc changes. Independent review pass.

**Step 2: Receive review**

`oat-project-review-receive` processes the output. Convert any Critical/Important/Medium findings to fix tasks (new `(review)`-tagged tasks in a `p-rev1` phase per the receive skill's convention).

**Step 3: Iterate fixes (if any)**

Execute any fix tasks; re-review; iterate within the review-receive workflow's bounded loop.

**Step 4: Merge**

When review is `passed`, merge PR. Standard release pipeline picks up the version-bumped public packages.

**Step 5: Verify**

- CI green.
- PR merged to `main`.
- Release pipeline publishes new lockstep versions.

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date       | Artifact                                              |
| ------ | -------- | ------- | ---------- | ----------------------------------------------------- |
| p01    | code     | pending | -          | -                                                     |
| p02    | code     | pending | -          | -                                                     |
| p03    | code     | pending | -          | -                                                     |
| p04    | code     | pending | -          | -                                                     |
| final  | code     | pending | -          | -                                                     |
| spec   | artifact | pending | -          | -                                                     |
| design | artifact | passed  | 2026-04-17 | reviews/archived/artifact-design-review-2026-04-17.md |
| plan   | artifact | passed  | 2026-04-17 | reviews/archived/artifact-plan-review-2026-04-17.md   |
| stale  | artifact | passed  | 2026-04-23 | reviews/staleness-review-2026-04-23.md                |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1 (p01): 9 tasks — `oat-project-design` rework
- Phase 2 (p02): 10 tasks — companion skill edits + AGENTS.md + NOTICES.md + CLI config extension (FR15)
- Phase 3 (p03): 2 tasks — lockstep version bumps + release validation
- Phase 4 (p04): 11 tasks — dogfood + regressions + PR

**Total: 32 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Comparative analysis: `reference/comparative-analysis.md`
- Superpowers source files: `reference/superpowers-*.md`
- Knowledge Base: `.oat/repo/knowledge/`
