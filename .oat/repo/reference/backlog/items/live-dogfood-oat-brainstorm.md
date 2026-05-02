---
id: bl-7d5b
title: 'Live dogfood for `oat-brainstorm` (fold-back commit safety + 9 destination families)'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: M # XS | S | M | L | XL | XXL
labels: ['dogfood', 'brainstorming']
assignee: null
created: '2026-05-02T19:31:25Z'
updated: '2026-05-02T19:31:25Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

The `oat-brainstorm` pack shipped in the `independent-brainstorming` project (`bl-53f0`, closed) carries documented walkthrough plans for all 10 dogfood scenarios in `.agents/skills/oat-brainstorm/references/dogfood-results.md`. None of those scenarios were exercised against live LLM conversations, real `git status` / `git commit`, or live visual-companion sessions during the implementation project.

This backlog item tracks the live-dogfood follow-up: actually run the 10 scenarios against a real LLM session with the pack installed, capture artifacts, and especially exercise the **fold-back commit safety contract** at scenario 9 against a real working tree. The fold-back contract is the only branch in the skill that performs scoped `git add -- <path>` + `git commit` on the user's behalf — it is the highest-risk path in the pack and the one most worth running against a real repo before relying on it in production.

## What's still required

The walkthrough plans embedded below describe what the skill _should_ do for each scenario. Live dogfood needs to assert each of these end-to-end. In particular:

1. **Fold-back commit safety contract (scenario 9)** — exercise the dirty-working-tree pre-flight gate, the three options (commit-first / mixed / abort), the scoped `git add -- <plan-path>` staging, and the handoff prompt's commit-hash report. Verify that no unrelated working-tree changes get swept into the fold-back commit.
2. **Active-project reference file commit (scenario 10)** — exercise the durable-tracked semantics added in `fix(p05-t05)`: scoped staging via `git add -- <reference-path>`, explicit commit with `chore(oat): capture brainstorming reference for <project-name>`, and the post-write confirmation showing the short commit hash.
3. **Visual companion offer (step 3 of SKILL.md)** — exercise the dynamic `${SKILL_DIR}` resolution path added in `fix(p05-t03)` from a fresh user-scope install (i.e., where the bundled scripts live under `~/.agents/skills/oat-brainstorm/`, not the repo).
4. **Pack-detection gating (step 4)** — verify that scenarios 4–8 only surface when their respective packs are installed, by repeating the live runs in a repo that does NOT have the gating pack.
5. **Trigger-phrase activation** — confirm that exploratory phrasing fires the skill and that routine implementation requests do not. Capture any false positives / false negatives for a follow-up tuning task.

After running, append a "Live results" section to `dogfood-results.md` (or fork it into a sibling `dogfood-live-results.md`) that records actual artifacts produced, deviations from the walkthrough plans, and any fold-back-related working-tree issues.

## Acceptance Criteria

- All 10 scenarios run end-to-end against a real LLM session.
- Fold-back commit (scenario 9) verified against a real working tree, with the handoff prompt's commit-hash output matching `git log -1 --format=%h`.
- Active-project reference commit (scenario 10) verified against a real working tree, working tree clean after the skill exits.
- Visual companion (step 3) verified from a fresh user-scope install.
- Live results recorded alongside (or merged into) `dogfood-results.md`.

## Embedded copy of `dogfood-results.md`

> The full text of `.agents/skills/oat-brainstorm/references/dogfood-results.md` is embedded below verbatim so this backlog item is self-contained for live-dogfood execution. If the canonical file changes, update this section to match.

---

# Dogfood Results — `oat-brainstorm`

> **Walkthrough plans only — not live runs.** This file documents
> walkthrough plans for the 10 dogfood scenarios from `design.md` Testing
> Strategy. None of the scenarios were exercised against live LLM
> conversations, real `git status` / `git commit`, or live visual-companion
> sessions while writing this document. The fold-back commit safety contract
> in particular has **not** been exercised against real working-tree state.
> The follow-up live-dogfood task is tracked as a backlog item — see
> `.oat/repo/reference/backlog/items/live-dogfood-oat-brainstorm.md`
> ("Live dogfood for `oat-brainstorm` — fold-back commit safety + 9
> destination families"). Treat the contents below as a contract spec for
> what live dogfood will assert, not as a record of completed runs.

This document records walkthrough plans for the 10 dogfood scenarios from
`design.md` Testing Strategy. Each scenario captures: setup (preconditions),
the brainstorming flow that would be taken, the artifact(s) produced, the
verifiable skill content for that path, and any issues / follow-ups.

**Note on dogfood interpretation.** Dogfood here means _exercising the skill
as a documented flow_, not running a live brainstorm conversation through an
LLM in interactive context. The skill ships as markdown content that an
invoking agent reads and executes; verification at this stage is whether the
flow is unambiguous and self-contained for each terminal state. Live
brainstorm conversations will surface tuning opportunities (trigger-phrase
sensitivity, conversation cadence) that this walkthrough cannot anticipate;
those are tracked in the live-dogfood backlog item, not gating issues for
this project.

**Repo state used for the walkthroughs.** This repo
(`open-agent-toolkit`) has the following packs installed:

- `core` (`tools.core: true`)
- `ideas` (`tools.ideas: true`)
- `workflows` (`tools.workflows: true`)
- `utility` (`tools.utility: true`)
- `project-management` (`tools.project-management: true`)
- `research` (`tools.research: true`)
- `docs` (`tools.docs: true`)
- `brainstorm` (newly added in this project)

So all pack-gated terminal states are reachable. Active-project state varies
per scenario (some assume an active OAT project, some assume none).

**Skill files referenced throughout.**

- `.agents/skills/oat-brainstorm/SKILL.md` — the dispatcher
- `.agents/skills/oat-brainstorm/references/destinations.md` — playbook
- `.agents/skills/oat-brainstorm/templates/brainstorm-doc.md` — doc-to-path
- Downstream: `.agents/skills/oat-idea-new/SKILL.md`,
  `.agents/skills/oat-idea-ideate/SKILL.md`,
  `.agents/skills/oat-idea-summarize/SKILL.md`,
  `.agents/skills/oat-pjm-add-backlog-item/SKILL.md`,
  `.agents/skills/oat-project-new/SKILL.md`

---

## Scenario 1: Inline only

**Setup**

- Any directory; no active project required.
- User opens a chat with an exploratory message such as:
  > "I've been thinking about how our PR review tooling feels heavy. Just
  > want to talk through whether we should change anything — no need to
  > write this down."

**Flow**

1. Always-on description on `oat-brainstorm` fires on "I've been thinking
   about" + "talk through" + "no need to write this down" — exploratory
   phrasing with explicit no-artifact signal.
2. Skill prints OAT MODE: Brainstorm banner, asserts mode.
3. Visual companion offer (own message). User declines (text-only topic).
4. Pack and active-project detection runs once. No active project. All packs
   installed.
5. Free brainstorming. Skill explores: what specifically feels heavy? Which
   step? What would lighter look like? Skill proposes 2-3 distinct approaches
   (e.g., reduce required reviewers, async-first review, rotation policy).
6. Trigger phrase from Step 1 ("no need to write this down") matched against
   destinations playbook → matches "Inline only" stanza trigger phrases.
   Skill surfaces immediately: "Sounds like inline-only — close out with a
   summary, no artifact?"
7. Satisfaction check: user confirms wrap up.
8. Synthesis: skill builds the in-memory `SynthesizedPayload` for closure.
   Inline-only requires no template fields (just the summary).
9. Handoff: `Inline only` branch in SKILL.md Process step 9 — emits a
   one-paragraph closing summary capturing the chosen direction (or "no
   direction selected"), key decisions, open questions. Ends mode assertion.

**Artifact produced**

- None. Closing summary is in-conversation text only.

**Verifiable from skill content**

- `destinations.md` "Inline only" stanza: `Pack required: always available`,
  trigger phrases include "no need to write this down", confirmation pattern
  `none`, `Handoff target: no downstream skill`.
- SKILL.md Process step 9 "Inline only" branch: emits closing summary, ends
  mode assertion.

**Issues / follow-ups**

- None observed in skill content. Live testing may reveal tuning needs in
  the trigger-phrase boundary against routine "talk it through" questions
  that aren't actually exploratory.

---

## Scenario 2: Doc-to-path (in-repo)

**Setup**

- Inside an OAT-initialized repo (e.g., this repo).
- User: > "I want to map out where our config layering gets confusing.
  > Write this to `docs/scratchpad/config-layering.md` when we're done."

**Flow**

1. Trigger fires on "I want to map out" + explicit user-supplied path.
2. Mode banner; mode assertion.
3. Visual-companion offer. User likely declines (textual mapping).
4. Pack/active-project detection.
5. Free brainstorming about config layers (`shared/`, `local`, user, env
   overrides). Skill proposes 2-3 ways to structure the document
   (layer-by-layer, by use-case, by symptom).
6. Destination identification: explicit user-supplied path → direct match on
   "Doc-to-path" stanza. Skill notes the destination and continues exploring.
7. Satisfaction check (when convergence happens or when user signals).
8. Synthesis: build payload with `title`, `summary`, `approachesConsidered`,
   `chosenDirection`, `transcriptSessionNote` (required), plus `motivation`,
   `vision`, `openQuestions`, `nextSteps` (optional, populated from
   conversation).
9. Doc-to-path handoff (Process step 9):
   - Path validation: `docs/scratchpad/config-layering.md` is in-repo, parent
     `docs/scratchpad/` exists in this repo. No off-repo confirmation needed.
   - Render `templates/brainstorm-doc.md` with payload values.
   - Write the file. Report absolute path to the user.

**Artifact produced**

- `docs/scratchpad/config-layering.md` rendered from
  `.agents/skills/oat-brainstorm/templates/brainstorm-doc.md` with title,
  overview, approaches considered, chosen direction, open questions, next
  steps, and a transcript session note appendix.

**Verifiable from skill content**

- `destinations.md` "Doc-to-path" stanza: confirmation `minimal` (path only);
  in-repo and off-repo path handling described.
- SKILL.md Process step 9 doc-to-path branch: parent existence check, file
  collision check, unwritable error handling per design Error Handling.
- `templates/brainstorm-doc.md`: section structure matches the
  `SynthesizedPayload` interface from design Data Models.

**Issues / follow-ups**

- None.

---

## Scenario 3: Doc-to-path (off-repo)

**Setup**

- Inside this repo.
- User: > "Write up where I landed on the personal-vault note structure into
  > `~/vault/notes/vault-structure-2026-05.md`."

**Flow**

Same as Scenario 2 through Step 8.

9. Doc-to-path handoff:
   - Path expansion: `~` resolves to `$HOME`.
   - Path is outside the current repo. Skill MUST require explicit
     confirmation per design Error Handling: "About to write outside the
     current repo to `<absolute-path>` — confirm?"
   - User confirms.
   - Parent directory `~/vault/notes/` may exist or not; if missing, offer
     to create with the off-repo confirmation.
   - Render and write.

**Artifact produced**

- `~/vault/notes/vault-structure-2026-05.md` rendered from
  `templates/brainstorm-doc.md`.

**Verifiable from skill content**

- SKILL.md Process step 9 doc-to-path branch explicitly handles the
  out-of-repo case with confirmation.
- `destinations.md` "Doc-to-path" stanza covers explicit user-supplied path
  trigger including paths outside the repo.

**Issues / follow-ups**

- None observed in skill content. The off-repo confirmation wording is
  written by the agent at runtime; consistent phrasing across runs is a
  potential live-tuning area.

---

## Scenario 4: Capture as new idea

**Setup**

- This repo (has `tools.ideas: true`).
- User: > "I've been thinking about a way to make `oat-doctor` self-heal
  > common config drift. Capture this as an idea so I don't forget."

**Flow**

1. Trigger fires on "I've been thinking about" + "capture this as an idea".
2. Mode banner; mode assertion.
3. Visual-companion offer (declined for prose-heavy idea).
4. Pack detection: `tools.ideas: true`. Idea-pack destinations enabled.
5. Free brainstorming about what self-healing would mean, which drift cases
   are common, what's safe vs unsafe to auto-fix.
6. "Capture this as an idea" → matches `destinations.md` "Capture as new
   idea" stanza. Skill surfaces destination.
7. Satisfaction check: user confirms wrap up.
8. Synthesis: build payload with `title` (slug-friendly), `summary`,
   `motivation` (Why Is It Interesting?), `vision` (What Would It Look
   Like?), `transcriptSessionNote`, plus optionals.
9. Handoff (Process step 9 capture-as-new-idea branch):
   - Read `.agents/skills/oat-idea-new/SKILL.md`.
   - Run its Steps 3-7 inline: initialize `.oat/ideas/` dir, scaffold
     `<slug>/discovery.md`, update backlog, check scratchpad, set active-idea
     pointer.
   - Seed scaffolded `discovery.md` first session with payload contents
     (What's the Idea?, Why Is It Interesting?, What Would It Look Like?,
     first session note in Notes & Discussion).
   - Offer to chain into `oat-idea-ideate` Step 4 or stop.

**Artifact produced**

- `.oat/ideas/<slug>/discovery.md` — populated with payload, idea-pack
  scaffolding present.
- Backlog index updated to reference the new idea.
- Active-idea pointer set.

**Verifiable from skill content**

- `destinations.md` "Capture as new idea" stanza: pack required `ideas`,
  confirmation `minimal` (slug only), handoff target `oat-idea-new` Steps 3-7
  with seeding instructions.
- SKILL.md Process step 9 capture-as-new-idea branch references the same
  steps and seeding behavior.
- `.agents/skills/oat-idea-new/SKILL.md` exists at the canonical path.

**Issues / follow-ups**

- None.

---

## Scenario 5: Extend existing idea

**Setup**

- This repo with at least one existing idea under `.oat/ideas/<slug>/`.
- User: > "Add another session to the `oat-doctor-self-heal` idea — I had
  > some new thoughts on which drift cases to prioritize."

**Flow**

1. Trigger fires on "add another session" + slug reference.
2. Mode banner; mode assertion.
3. Visual-companion offer; declined.
4. Pack detection: `tools.ideas: true`.
5. Free brainstorming about prioritization criteria.
6. "Add to the `<idea-slug>` idea" → matches `destinations.md` "Extend
   existing idea" stanza. Skill confirms which idea: minimal confirmation.
7. Satisfaction check.
8. Synthesis: build payload — `transcriptSessionNote` (the new session
   body), optionally `chosenDirection`, `openQuestions`, `nextSteps`.
9. Handoff (Process step 9 extend-existing-idea branch):
   - Read `.agents/skills/oat-idea-ideate/SKILL.md`.
   - Run its Step 4 (Start New Session) with the resolved idea path.
   - Append `transcriptSessionNote` from the brainstorming payload as the
     new session's body.

**Artifact produced**

- `.oat/ideas/oat-doctor-self-heal/discovery.md` — new session appended
  under "Notes & Discussion".

**Verifiable from skill content**

- `destinations.md` "Extend existing idea" stanza: `oat-idea-ideate` Step 4
  handoff, append-new-session semantics.
- `.agents/skills/oat-idea-ideate/SKILL.md` exists at the canonical path.

**Issues / follow-ups**

- None observed. Live runs may surface ambiguity when a slug is
  paraphrased — the playbook says skill "asks before committing when
  ambiguous", which addresses this.

---

## Scenario 6: Summarize idea directly

**Setup**

- This repo.
- User: > "I've been turning over an idea about a `oat-stale-pr` skill that
  > nudges abandoned PRs. Summarize this idea so I have a clean writeup."

**Flow**

1. Trigger fires on "I've been turning over" + "summarize this idea".
2. Mode banner; mode assertion.
3. Visual-companion offer; declined.
4. Pack detection: `tools.ideas: true`.
5. Free brainstorming about what "stale" means, what nudge channel, how to
   avoid noise.
6. "Summarize this idea" → matches `destinations.md` "Summarize idea
   directly" stanza.
7. Satisfaction check.
8. Synthesis: build payload (same field set as capture-as-new-idea — the
   capture path runs first silently).
9. Handoff (Process step 9 summarize-idea-directly branch):
   - Capture-as-new-idea path runs silently (read
     `.agents/skills/oat-idea-new/SKILL.md`, run Steps 3-7, seed discovery).
   - Then read `.agents/skills/oat-idea-summarize/SKILL.md` and run it
     end-to-end. The `oat-idea-summarize` skill's own accept/refine review
     serves as the user gate.

**Artifact produced**

- `.oat/ideas/<slug>/discovery.md` — populated.
- `.oat/ideas/<slug>/summary.md` — produced by `oat-idea-summarize`.

**Verifiable from skill content**

- `destinations.md` "Summarize idea directly" stanza: confirmation `none` at
  this layer; downstream skill owns the review gate.
- SKILL.md Process step 9 summarize-idea-directly branch references both
  downstream skill paths.
- Both `oat-idea-new` and `oat-idea-summarize` SKILL.md files exist at
  canonical paths.

**Issues / follow-ups**

- None.

---

## Scenario 7: Scoped backlog item

**Setup**

- This repo (has `tools.project-management: true`).
- User: > "We keep hitting this annoying drift in provider-view sync after
  > rebases. Track this as a backlog item — I think it's a real bug."

**Flow**

1. Trigger fires on "we keep hitting" + "track this as a backlog item".
2. Mode banner; mode assertion.
3. Visual-companion offer; declined.
4. Pack detection: `tools.project-management: true`. Backlog destination
   enabled.
5. Free brainstorming about: which rebase scenarios trigger it, what the
   symptom is, what an acceptable fix would look like, scope estimate.
6. "Track this as a backlog item" → matches `destinations.md` "Scoped
   backlog item" stanza.
7. Satisfaction check.
8. Synthesis (with **full** confirmation pattern per the stanza):

   ```
   I have what I need to track this as a backlog item. Here is the proposed payload:

     Title:      Provider-view sync drift after rebase
     Description:
       After a worktree rebases against main, provider views can desync from
       the canonical asset map. The next sync corrects state but the gap is
       confusing during reviews.
     Acceptance Criteria:
       - Reproducible repro for the desync state under post-rebase conditions
       - Drift surfaced by a check command (likely `oat sync --check` or
         `oat-doctor`) so users notice before the next sync
       - Fix preserves manifest hash semantics
     Scope:      m
     Priority:   p2

   Confirm to write this to a new bl-XXXX file, or tell me what to change.
   ```

   User confirms or revises field-by-field.

9. Handoff (Process step 9 scoped-backlog-item branch):
   - Read `.agents/skills/oat-pjm-add-backlog-item/SKILL.md`.
   - Run its process from Step 1 with the confirmed payload pre-filling the
     early prompts (title, description, AC, scope, priority).
   - Downstream skill owns ID generation, file writing, and backlog-index
     regeneration.

**Artifact produced**

- `.oat/repo/reference/backlog/items/<slug>.md` (e.g.,
  `bl-XXXX-provider-view-sync-drift.md`) with full payload.
- Backlog index regenerated.

**Verifiable from skill content**

- `destinations.md` "Scoped backlog item" stanza: confirmation pattern
  `full` with the worked example wording above (matches design's canonical
  example).
- SKILL.md Process step 9 scoped-backlog-item branch references
  `oat-pjm-add-backlog-item` and pre-fill semantics.
- `.agents/skills/oat-pjm-add-backlog-item/SKILL.md` exists at the canonical
  path.

**Issues / follow-ups**

- None observed in skill content. The full-confirmation example wording
  matches the design's canonical wording exactly, including the field
  layout.

---

## Scenario 8: Promote to new OAT project

**Setup**

- This repo (has `tools.workflows: true`).
- No active project.
- User: > "I keep coming back to this idea of an `oat-archive-explore` skill
  > for searching archived projects. Let's promote this to a project."

**Flow**

1. Trigger fires on "let's promote this to a project".
2. Mode banner; mode assertion.
3. Visual-companion offer; declined.
4. Pack detection: `tools.workflows: true`. Project promotion enabled. No
   active project, so no 3-way router.
5. Free brainstorming about: search shape (full-text vs metadata), output
   format (terminal table vs JSON), scope reduction options.
6. "Promote this to a project" → matches `destinations.md` "Promote to new
   OAT project" stanza.
7. Satisfaction check.
8. Synthesis: build payload. Decide mode (`quick` vs `spec-driven`) based on
   `chosen_direction` and scope signals — likely `quick` since search has
   bounded scope and clear requirements emerged from the conversation.
   Confirm slug + mode (minimal confirmation).
9. Handoff (Process step 9 promote-to-new-OAT-project branch):
   - Run `oat project new <slug> --mode quick` to scaffold.
   - Write field-filled `discovery.md` only (Initial Request, Solution Space
     with approaches, Chosen Direction, Key Decisions, Open Questions). NEVER
     write `design.md` (per design — half-populated design constrains the
     design phase).
   - Mark `oat_status: complete` in discovery; `oat_ready_for:
oat-project-quick-start`.
   - Update project `state.md` (phase=discovery, status=complete).
   - Print pointer to `oat-project-quick-start` (for quick mode) or
     `oat-project-design` (for spec-driven mode).
   - **Stop.** Do NOT inline-execute the next phase.

**Artifact produced**

- `.oat/projects/shared/<slug>/discovery.md` — fully populated.
- `.oat/projects/shared/<slug>/state.md` — phase=discovery, status=complete.
- No `design.md` written.

**Verifiable from skill content**

- `destinations.md` "Promote to new OAT project" stanza: confirmation
  `minimal` (slug + mode), handoff stops after discovery is seeded.
- SKILL.md Process step 9 promote-to-new-OAT-project branch: discovery-only
  rule explicitly stated; explicit "do NOT inline-execute the next phase".

**Issues / follow-ups**

- The mode-decision heuristic (quick vs spec-driven) is articulated as
  "based on chosen_direction and scope signals" but the exact thresholds are
  inherently judgment-based. Live runs will calibrate this.

---

## Scenario 9: Active project — fold-back

**Setup**

- This repo with an active OAT project (e.g., this very project,
  `independent-brainstorming`, while it's still in progress on a feature
  branch).
- User: > "About this brainstorm-skill project — I've been thinking about
  > whether the destinations playbook should also support a 'send to
  > bookmark' state. Want to fold this in."

**Flow**

1. Trigger fires on "I've been thinking about" + "fold this in" + active
   project context.
2. Mode banner; mode assertion.
3. Visual-companion offer; declined.
4. Pack detection: `tools.workflows: true`. Active project detected via
   `oat config get activeProject`. Reads `state.md` for `oat_workflow_mode`,
   `oat_phase`, `oat_pr_status`.
5. Free brainstorming about: what "send to bookmark" means, where it
   conflicts with existing destinations, scope of change.
6. "Fold this in" + active project → 3-way router triggered.
   - Router asks: "Is this brainstorm related to the active project?"
   - User: "Related — fold-back."
   - 3-way router → fold-back rule (uniform across spec-driven and quick
     modes).
7. Satisfaction check.
8. Synthesis: build payload — `chosenDirection`, key decisions,
   `transcriptSessionNote`.
9. Fold-back handoff (Process step 9 active-project fold-back branch):
   1. **Pick upstream artifact.** `design.md` exists for this project →
      use it. (For a quick-mode project without `design.md`, use
      `discovery.md`.)
   2. **Preflight `git status` check.**
      ```bash
      git status --porcelain -- .oat/projects/shared/independent-brainstorming/design.md
      ```
   3. **Clean → append + scoped commit.** Append `## Brainstorming Update:
2026-05-01 — bookmark destination` section with chosen-direction,
      key-decisions, transcript appendix. Then:
      `bash
      git add -- .oat/projects/shared/independent-brainstorming/design.md
      git commit -m "chore(oat): integrate brainstorm into design.md for independent-brainstorming"
      `
      (Explicit `--` form. NEVER `-A`, NEVER globs.)
   4. **Dirty → user picker** (3 options): commit current first, mix with
      fold-back, or abort and switch to brainstorming reference file.
   5. **Handoff prompt printed only after scoped commit succeeds.** This
      project is `quick` mode + no PR open → prompt addresses
      `oat-project-quick-start`:

      ```
      Run `oat-project-quick-start` with this context:

      "A brainstorming session surfaced changes that needed to be folded
      into design.md. I've committed the update (commit <hash>:
      chore(oat): integrate brainstorm into design.md for
      independent-brainstorming). Integrate the new content into the
      existing plan as new tasks (or a new phase if substantial). Don't
      refresh the existing plan — preserve review tables and any
      in-progress task state."
      ```

   6. **If `git commit` fails** (pre-commit hooks reject, signing fails, …):
      surface the error, do NOT print handoff prompt.

**Artifact produced**

- Append to `<active-project>/design.md` (or `discovery.md` if no design).
- A scoped commit with hash referenced by the handoff prompt.

**Verifiable from skill content**

- SKILL.md Process step 9 active-project fold-back branch matches the
  design's "Fold-back commit safety contract" word-for-word: preflight,
  scoped staging discipline, three-option dirty-tree picker, conditional
  handoff print, mode-and-PR-status routing table.
- `destinations.md` "Active project: fold-back" stanza references the
  contract.

**Issues / follow-ups**

- The handoff-prompt commit hash interpolation is at runtime (skill text
  uses `<hash>` placeholder). The hash MUST be the real hash from the
  scoped commit; this is verifiable in live runs by inspecting the prompt
  vs `git log`.
- This is the most safety-critical destination. The contract is exercised
  end-to-end here as a walkthrough; live testing will be the first time
  the actual `git status --porcelain --` and `git commit` commands run in
  context.

---

## Scenario 10: Active project — brainstorming reference file

**Setup**

- This repo with an active OAT project (any project).
- User: > "Quick brainstorm related to the active project but not really
  > design-grade — just a side thought about UX wording. Capture as a
  > reference, not in the design doc."

**Flow**

1. Trigger fires on exploratory phrasing + active project context +
   "capture as a reference, not in the design doc".
2. Mode banner; mode assertion.
3. Visual-companion offer; declined.
4. Pack detection: `tools.workflows: true`. Active project detected.
5. Free brainstorming about UX wording options.
6. Active project + "related but supplementary" → 3-way router:
   - "Is this brainstorm related to the active project?"
   - User: "Related but supplementary — reference file."
   - Router routes to brainstorming reference file destination.
7. Satisfaction check.
8. Synthesis: build payload — `title` (topic slug), `summary`,
   `transcriptSessionNote`, optional `chosenDirection`, `openQuestions`,
   `nextSteps`.
9. Handoff (Process step 9 active-project reference-file branch):
   - Resolve `<project>/brainstorming/` directory; create if missing.
   - Filename: `YYYY-MM-DD-<topic>.md`. Minimal confirmation on filename.
   - Render synthesized payload using `templates/brainstorm-doc.md` (or a
     simpler reference template if defined; the design says
     `<project>/brainstorming/YYYY-MM-DD-<topic>.md` is "always available
     regardless of project phase").
   - Write the file. No upstream-artifact mutation. No commit (the file is
     itself the artifact, separate from any plan/design changes).

**Artifact produced**

- `<active-project>/brainstorming/YYYY-MM-DD-<topic>.md` written with
  payload contents.

**Verifiable from skill content**

- SKILL.md Process step 9 active-project router: "Related but supplementary
  → brainstorming reference file at `<project>/brainstorming/YYYY-MM-DD-<topic>.md`
  (always available regardless of project phase; minimal confirmation on
  filename)".
- `destinations.md` "Active project: brainstorming reference file" stanza
  references the same path convention.

**Issues / follow-ups**

- The reference-file path convention parallels `pr/` and `reviews/` per
  design — naturally discoverable, no collision risk.

---

## Aggregate observations

**Stay-in-mode discipline.** All 10 walkthroughs stay within the skill's
declared blocked / allowed activities. None of them trigger any of the six
self-correction protocol entries (no implementation code, no auto-routing
before convergence, no skipping the visual-companion offer, no fold-back on
dirty tree without preflight, no `-A` staging, no premature handoff prompt).

**Coverage.** All 9 destination families exercised; doc-to-path is split
into in-repo (Scenario 2) and off-repo (Scenario 3) per the design's
testing-strategy refinement.

**Skill-content completeness.**

- All 9 stanzas present in `destinations.md`.
- All 9 handoff branches present in SKILL.md Process step 9.
- Doc-to-path template present at `templates/brainstorm-doc.md`.
- Visual-companion bundle present at `scripts/`.
- Visual-companion guide present at `references/visual-companion.md`.

**Open follow-ups (not gating ship).**

- Live-run trigger-phrase calibration. Initial set is conservative; first
  ~10 real brainstorms in this repo will surface any over-fire or
  under-fire patterns. Tracked as a follow-up per design Open Questions.
- Mode-decision heuristic for promote-to-new-OAT-project (quick vs
  spec-driven) is judgment-based; live runs will calibrate.
- Off-repo confirmation wording for doc-to-path is agent-rendered; consistent
  phrasing across runs is a potential live-tuning area but not a
  correctness issue.
- Fold-back commit safety contract (Scenario 9) has not been exercised
  against real `git status --porcelain --` / `git commit` invocations yet.
  First live use will be the integration test.
- The optional `oat brainstorm visual-server` CLI wrapper is deferred per
  design — bundle ships with raw bash scripts.
