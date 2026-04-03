---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-03
oat_generated: false
---

# Discovery: docs-readability-reorg

## Phase Guardrails (Discovery)

Discovery captured the rationale and constraints for a documentation reorganization. The goal is to preserve and clarify existing information, not to reduce scope by deleting coverage.

## Initial Request

The user asked for an evaluation of the OAT docs site with a newcomer-readability lens. The core concern was not content quality, but that the docs felt overwhelming for new users because multiple distinct product surfaces were grouped together too early.

The work later expanded to include a concrete reorganization plan, README strategy, updating the worktree to the latest `origin/main`, importing the plan into OAT project artifacts, and backfilling `discovery.md`.

## Clarifying Questions

### Question 1: Homepage versus Start Here

**Q:** Should `/` become the canonical Start Here page, or should `/` stay as the overview while `/quickstart` becomes the actual decision page?
**A:** Keep `/` as the overview page and keep `/quickstart` as the canonical Start Here page.
**Decision:** Separate overview from routing. `/` explains what OAT is and why it exists. `/quickstart` is the only page that performs path selection.

### Question 2: Imported project target

**Q:** Should this work be imported into an existing OAT project or a new one?
**A:** Use a new import-mode project.
**Decision:** Create a fresh project so the docs reorganization work stays isolated from unrelated project state.

### Question 3: Imported project name and provider

**Q:** What project name and provider metadata should be used?
**A:** Project name `docs-readability-reorg`, provider `codex`.
**Decision:** Use those values for import metadata and active project state.

## Solution Space

Three structural options were considered for the docs entrypoint and user-facing information architecture.

### Approach 1: Put Start Here directly on `/`

**Description:** Turn the homepage into the primary newcomer routing surface with path cards and minimal overview content.
**When this is the right choice:** Best when the primary problem is entrypoint friction and most visitors arrive already ready to self-sort.
**Tradeoffs:** Reduces friction early, but makes the homepage less useful as a calm explanation of what OAT is and why it exists.

### Approach 2: Keep `/` as overview and `/quickstart` as Start Here _(Recommended)_

**Description:** Use `/` to explain the toolkit at a high level and use `/quickstart` as the canonical path-selection page.
**When this is the right choice:** Best when newcomers need a short mental model before choosing an adoption lane.
**Tradeoffs:** Keeps one extra click before path selection, so the separation must be disciplined to avoid duplicate routing logic.

### Approach 3: Let `/` and `/quickstart` both route users

**Description:** Keep meaningful audience/path routing on both pages.
**When this is the right choice:** Rarely; only viable if the two pages have intentionally different and tightly enforced roles.
**Tradeoffs:** High risk of duplication, drift, and renewed overwhelm.

### Chosen Direction

**Approach:** Keep `/` as overview and `/quickstart` as Start Here.
**Rationale:** The user wanted space to explain what OAT is and why it exists before asking users to choose a path. This keeps the homepage calm while still solving the deeper IA overload.
**User validated:** Yes

## Options Considered

### Option A: Keep `User Guide` and reorganize within it

**Description:** Preserve the current top-level `User Guide` concept and split its pages into clearer subgroups.

**Pros:**

- Smaller visible nav change
- Less route churn

**Cons:**

- Keeps unlike product surfaces inside the same user bucket
- Does not solve the main “too much too early” problem

**Chosen:** Neither

**Summary:** The `User Guide` label itself was part of the problem because it grouped provider sync, workflows, docs tooling, ideas, skills, and CLI material into one catch-all lane.

### Option B: Replace `User Guide` with adoption-lane sections

**Description:** Reorganize around the real product surfaces: Provider Sync, Agentic Workflows, Docs Tooling, and CLI Utilities.

**Pros:**

- Matches how OAT is actually adopted
- Gives new users clearer “this is for me / this is not for me” separation

**Cons:**

- Requires route and nav changes
- Requires careful cross-link cleanup

**Chosen:** B

**Summary:** This directly addresses the structural cause of overwhelm and aligns the docs with the product model.

## Key Decisions

1. **Entry model:** `/` stays overview-only; `/quickstart` becomes the only true path-selection page.
2. **Top-level IA:** Replace the broad `User Guide` with adoption-lane sections: `Provider Sync`, `Agentic Workflows`, `Docs Tooling`, `CLI Utilities`, plus `Reference` and `Contributing`.
3. **Content preservation:** Reorganization must preserve information. Wholesale removals or heavily revised content require explicit user approval.
4. **README philosophy:** Dense docs belong on the docs site. The root README and package READMEs should become concise orientation/quick-start documents with links outward.
5. **Execution baseline:** Rebase/update against the latest `origin/main` before starting docs changes so the work includes the upstream link fix.
6. **Project tracking:** Import the plan into a new OAT import-mode project and backfill `discovery.md` so the rationale is preserved as project context.

## Constraints

- Do not remove or materially narrow documentation coverage without explicit user approval.
- Keep dense technical detail available; use reorganization and progressive disclosure instead of deletion.
- Preserve `Contributing` and `Reference` as distinct concepts.
- Keep `/` and `/quickstart` from duplicating the same routing logic.
- Work from the latest `origin/main` because a separate PR contains the link fix that should be part of the baseline.

## Success Criteria

- New users can understand OAT from `/` and choose an adoption path from `/quickstart`.
- Provider sync, workflows, docs tooling, and CLI utilities are no longer presented as one undifferentiated user bucket.
- Dense pages have approachable framing before deep detail.
- CLI Reference becomes a shallow map instead of a mixed tutorial/reference document.
- Root and package READMEs become concise and link outward to full docs.
- No documentation is removed or substantially rewritten without explicit approval.

## Out of Scope

- Changing OAT runtime behavior or CLI semantics
- Reducing docs scope by deleting large content areas
- Rewriting technical content for style alone when a move or framing change is sufficient
- Solving every historical external inbound-link compatibility concern unless required by the docs framework or user direction

## Deferred Ideas

- Additional landing-page polish beyond the structural IA pass - deferred until after route and content reorganization
- Potential future consolidation of repeated deep reference material - deferred because this reorg should prioritize preservation over reduction
- Broader docs design/visual changes - deferred because the current effort is primarily IA and readability

## Open Questions

- Whether any old guide routes should retain thin compatibility pages after the canonical routes are moved
- Whether any especially dense lifecycle content should later be split into additional child pages after the first readability pass
- Whether package READMEs beyond the currently obvious surfaces need deeper package-specific docs links

## Assumptions

- The docs site is the canonical home for dense documentation.
- Users benefit more from a brief overview plus a decision page than from a single blended homepage.
- The existing documentation is broadly valuable and should be preserved.
- Progressive disclosure can improve readability without sacrificing technical completeness.

## Risks

- **Route churn confusion:** Route and nav changes could temporarily make links or mental models harder to follow.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Update nav first, move content systematically, then run a full cross-link audit.

- **Accidental scope reduction:** A docs cleanup pass could drift into deleting or narrowing material in the name of readability.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Record the preservation guardrail in discovery, plan, and implementation notes, and require explicit approval for removals or major rewrites.

- **Entrypoint duplication:** `/` and `/quickstart` could end up duplicating each other if implementation is not disciplined.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep `/` overview-only and reserve path-selection logic for `/quickstart`.

## Next Steps

Use this discovery artifact to drive implementation of the imported plan:

- execute the docs IA and README reorganization from the latest `origin/main`
- preserve content while improving routing and progressive disclosure
- stop and ask for approval before any proposed removal or substantial revision of coverage
