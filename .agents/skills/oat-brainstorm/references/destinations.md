# Destinations Playbook

Per-destination lookup that `oat-brainstorm` consults at destination-identification time. Centralizes trigger phrases, required fields, confirmation patterns, and handoff targets so `SKILL.md` stays focused on flow.

## Matching rules

- **Trigger phrases** below are concrete substring/paraphrase patterns, not regex. The skill matches loosely (case-insensitive, paraphrase-tolerant) and asks before committing when ambiguous.
- **Confirmation pattern** values:
  - `full` — present payload field-by-field with example wording from this stanza; user confirms or revises before write.
  - `minimal` — confirm only the slug / path / which artifact, then write.
  - `none` — write directly (the downstream skill surfaces its own review step).
- **"If user wants to keep brainstorming after this is offered"** rule applies in every stanza: surface the destination, then ask "feel good about wrapping up here, or want to keep brainstorming and add more detail?". If keep going, return to the conversation flow with the destination noted; the skill may proactively probe for required fields not yet covered.

---

### Destination: Inline only

**Pack required:** always available
**Trigger phrases:** "let's just talk it through", "no need to write this down", "this is just a quick chat", "off the record", explicit decline of any artifact destination.
**Required template fields:** none — closing summary is one paragraph.
**Optional template fields:** none.
**Confirmation pattern:** `none`
**Handoff target:** no downstream skill. Skill emits a one-paragraph closing summary capturing chosen direction (or "no direction selected"), key decisions, and any open questions, then ends mode assertion.
**If user wants to keep brainstorming after this is offered:** return to free brainstorming flow; no destination is "noted" since this destination is by definition no-artifact.

---

### Destination: Doc-to-path

**Pack required:** always available
**Trigger phrases:** "write this to a file", "save this as a doc", "put this in `<path>`", "write to my vault", "doc this somewhere", explicit user-supplied path.
**Required template fields:** `title`, `summary`, `approachesConsidered`, `chosenDirection` (or explicit "no direction"), `transcriptSessionNote`. Template: `templates/brainstorm-doc.md` (in this skill).
**Optional template fields:** `motivation`, `vision`, `openQuestions`, `nextSteps`.
**Confirmation pattern:** `minimal` (path only)
**Handoff target:** no downstream skill. Skill validates path (file not dir; parent exists or offer to create — explicit confirmation if outside repo; file already exists → ask overwrite vs different name; unwritable → surface OS error), renders `templates/brainstorm-doc.md` with payload values, writes the file. Reports the absolute path written.
**If user wants to keep brainstorming after this is offered:** return to flow with destination = doc-to-path. Skill notes the user-supplied path and may proactively probe for `motivation`, `vision`, or richer `chosenDirection` if those template sections feel sparse.

---

### Destination: Capture as new idea

**Pack required:** `ideas` (i.e., `oat config get tools.ideas` returns `true`)
**Trigger phrases:** "capture as an idea", "this is an idea worth keeping", "let's track this as an idea", "save this as an idea", "make a new idea for this".
**Required template fields:** `title` (slug-friendly), `summary`, `motivation` (Why Is It Interesting?), `vision` (What Would It Look Like?), `transcriptSessionNote`. Template: `.oat/templates/ideas/idea-discovery.md` (consumed via `oat-idea-new`).
**Optional template fields:** `approachesConsidered`, `chosenDirection`, `openQuestions`, `nextSteps`.
**Confirmation pattern:** `minimal` (slug only)
**Handoff target:** `oat-idea-new` Steps 3-7 (initialize ideas dir, scaffold discovery, update backlog, check scratchpad, set active-idea pointer). Seed the scaffolded `discovery.md` first session with payload contents (What's the Idea?, Why Is It Interesting?, What Would It Look Like?, first session in Notes & Discussion). After scaffold, offer to chain into `oat-idea-ideate` Step 4 or stop.
**If user wants to keep brainstorming after this is offered:** return to flow with destination = capture-as-new-idea. Skill probes for `motivation` and `vision` if shallow.

---

### Destination: Extend existing idea

**Pack required:** `ideas`
**Trigger phrases:** "add to the `<idea-slug>` idea", "this builds on idea X", "fold this into existing idea", "another session for `<idea-slug>`".
**Required template fields:** which idea (slug or path), `transcriptSessionNote`. Existing idea's `discovery.md` is appended-to via `oat-idea-ideate` Step 4 (Start New Session).
**Optional template fields:** `chosenDirection`, `openQuestions`, `nextSteps` — surfaced if user wants the new session entry to record decisions.
**Confirmation pattern:** `minimal` (which idea)
**Handoff target:** `oat-idea-ideate` Step 4 (Start New Session) on the chosen idea path. Append `transcriptSessionNote` from the brainstorming payload as the new session's body.
**If user wants to keep brainstorming after this is offered:** return to flow with destination = extend-existing-idea. Skill may probe for whether the conversation should land a chosen direction or stay exploratory.

---

### Destination: Summarize idea directly

**Pack required:** `ideas`
**Trigger phrases:** "summarize this idea", "give me the summary", "what's the headline of this idea?", "wrap this idea into a summary doc".
**Required template fields:** same set as "Capture as new idea" (capture-as-new-idea path runs silently first), then summary input is whatever was synthesized. Template: `.oat/templates/ideas/idea-summary.md` (consumed via `oat-idea-summarize`).
**Optional template fields:** none — the summary is rendered from the synthesized payload.
**Confirmation pattern:** `none` at this layer (the downstream `oat-idea-summarize` surfaces the summary for accept/refine review).
**Handoff target:** capture-as-new-idea path silently (skill reads `.agents/skills/oat-idea-new/SKILL.md` and runs Steps 3-7), then immediately reads `.agents/skills/oat-idea-summarize/SKILL.md` and runs it end-to-end. The `oat-idea-summarize` skill's own accept/refine review serves as the user gate.
**If user wants to keep brainstorming after this is offered:** return to flow with destination = summarize-idea-directly. Skill may probe for chosen direction since the summary will read better with one.

---

### Destination: Scoped backlog item

**Pack required:** `project-management` (i.e., `oat config get tools.project-management` returns `true`)
**Trigger phrases:** "track this as a backlog item", "make a ticket", "log this", "open a backlog entry", "add this to the backlog", "create a bl-XXXX for this".
**Required template fields:** `title` (1-line summary), `description` (problem + proposed approach), `acceptance criteria` (bullet list), `scope` (xs / s / m / l / xl), `priority` (p0 / p1 / p2 / p3). Template: `.oat/templates/backlog-item.md` (consumed via `oat-pjm-add-backlog-item`).
**Optional template fields:** related items, target release, owner.
**Confirmation pattern:** `full`
Example wording (rendered field-by-field):

```
I have what I need to track this as a backlog item. Here is the proposed payload:

  Title:      <title>
  Description:
    <description, 2-3 sentences>
  Acceptance Criteria:
    - <criterion 1>
    - <criterion 2>
  Scope:      <xs|s|m|l|xl>
  Priority:   <p0|p1|p2|p3>

Confirm to write this to a new bl-XXXX file, or tell me what to change.
```

**Handoff target:** `oat-pjm-add-backlog-item` from its Step 1, with the confirmed payload pre-filling the early prompts. The downstream skill owns ID generation, file writing, and backlog-index regeneration.
**If user wants to keep brainstorming after this is offered:** return to flow with destination = scoped-backlog-item. Skill probes for missing acceptance criteria, scope sizing, or priority signal — these are the most common gaps when a brainstorm pivots to ticket creation.

---

### Destination: Promote to new OAT project

**Pack required:** `workflows` (i.e., `oat config get tools.workflows` returns `true`)
**Trigger phrases:** "let's make this a project", "promote this to a project", "scaffold a project for this", "this is project-sized — let's start one".
**Required template fields:** `title`, `summary` (Initial Request), `approachesConsidered` (Solution Space), `chosenDirection` (Chosen Direction), key decisions, `openQuestions`. Template: `.oat/templates/discovery.md` (consumed via `oat project new`).
**Optional template fields:** `motivation`, `vision`, `nextSteps`.
**Confirmation pattern:** `minimal` (slug + workflow mode)
Skill proposes `quick` vs `spec-driven` mode based on `chosenDirection` and scope signals from the conversation. User picks; skill confirms slug.
**Handoff target:** Run `oat project new <slug> --mode <mode>` to scaffold. Write field-filled `discovery.md` only (Initial Request, Solution Space with approaches, Chosen Direction, Key Decisions, Open Questions). Mark `oat_status: complete`, `oat_ready_for: oat-project-quick-start` (for quick mode) or `oat-project-design` (for spec-driven). Update project `state.md` (phase=discovery, status=complete). Print pointer to next skill. **Stop — do NOT inline-execute the next phase.** Project promotion writes `discovery.md` only, never `design.md`.
**If user wants to keep brainstorming after this is offered:** return to flow with destination = promote-to-new-project. Skill probes for missing chosen direction, key decisions, and explicit open questions — these become artifact fields that read poorly when shallow.

---

### Destination: Active project — fold-back to upstream artifact

**Pack required:** `workflows` AND an active project pointer is set (`oat config get activeProject`) AND its `state.md` is readable.
**Trigger phrases:** "fold this into the active project", "this is feedback for the active project", "integrate this into design", "add this to discovery", explicit "for the active project" mention. Also offered as the first option when the active-project 3-way router fires after convergence (related → fold-back).
**Required template fields:** which artifact (`design.md` if exists, else `discovery.md`; user signal can override), the synthesized payload's `chosenDirection`, key decisions, `transcriptSessionNote` (transcript appendix). Template: appended in-place using `## Brainstorming Update: YYYY-MM-DD — <topic>` heading.
**Optional template fields:** `openQuestions`, `nextSteps` — appended if surfaced during convergence.
**Confirmation pattern:** `minimal` (which artifact + dirty-tree handling)

The fold-back commit safety contract is non-negotiable:

1. Preflight `git status --porcelain -- "$ARTIFACT_PATH"` _before_ any artifact mutation.
2. If clean: append the synthesis section, then `git add -- "$ARTIFACT_PATH"` (explicit `--` form, never `-A`, never globs) followed by `git commit -m "chore(oat): integrate brainstorm into <artifact> for <project-name>"`.
3. If dirty: present the user with three options before any mutation — (a) commit current artifact changes first then fold-back as new scoped commit, (b) include current changes in the fold-back commit (warn that prior edits are mixed in; user explicitly accepts), or (c) abort fold-back and switch destination to "active project: brainstorming reference file" instead.
4. Handoff prompt prints only after the scoped commit succeeds. If `git commit` fails (pre-commit hooks reject, signing fails, etc.), surface the error and do NOT print the handoff prompt.

**Handoff target:** Append synthesis to the chosen upstream artifact, commit immediately (per safety contract above), then print the handoff prompt template:

```
Run `<skill-name>` with this context:

"A brainstorming session surfaced changes that needed to be folded
into <artifact>. I've committed the update (commit <hash>: <subject>).
Integrate the new content into the existing plan as new tasks (or a
new phase if substantial). Don't refresh the existing plan — preserve
review tables and any in-progress task state."
```

Skill name resolved per workflow mode + PR status (read from `state.md` frontmatter):

| Mode        | PR status                    | Handoff target            |
| ----------- | ---------------------------- | ------------------------- |
| spec-driven | none / closed                | `oat-project-plan`        |
| quick       | none / closed                | `oat-project-quick-start` |
| either      | open (`oat_pr_status: open`) | `oat-project-revise`      |

After printing the prompt, the skill stops. The user runs the plan-authoring skill at their own pace. The brainstorming skill never auto-chains into plan authoring — the deliberate transition is the point.

**If user wants to keep brainstorming after this is offered:** return to flow with destination = fold-back. Skill probes for richer chosen direction or key decisions, since these become the appended section and read poorly when shallow. Re-run preflight `git status` when convergence resumes — the working tree may have changed mid-conversation.

---

### Destination: Active project — brainstorming reference file

**Pack required:** `workflows` AND an active project pointer is set.
**Trigger phrases:** "this is supplementary for the active project", "save this with the project but don't change the design", "park this as a reference for the project", "stash this in the project's brainstorming folder". Also offered as the third option when the active-project 3-way router fires (related but supplementary → reference file).
**Required template fields:** `title` (slug-friendly), filename (defaults to `YYYY-MM-DD-<topic>.md`), the synthesized payload (rendered using the same shape as `templates/brainstorm-doc.md`).
**Optional template fields:** `motivation`, `vision`, `openQuestions`, `nextSteps` — same as doc-to-path destination.
**Confirmation pattern:** `minimal` (filename + commit hash). After the file is written, the skill commits it on the active branch and reports the short commit hash alongside the absolute path (for example: "Wrote `<absolute-path>` and committed as `<hash>`.").
**Handoff target:** no downstream skill invocation. Write the synthesized payload to `<active-project>/brainstorming/YYYY-MM-DD-<topic>.md` using the doc-to-path template shape. The `brainstorming/` subdirectory is created if it doesn't exist (parallel to `pr/` and `reviews/`). The reference file is a **durable tracked artifact**: after writing, the skill stages only the new file via `git add -- <reference-path>` and commits it with `chore(oat): capture brainstorming reference for <project-name>` — mirroring the scoped-staging discipline of the fold-back commit safety contract so the working tree is clean when the skill exits.
**If user wants to keep brainstorming after this is offered:** return to flow with destination = active-project-reference-file. Available regardless of active project's phase or PR status; no special probing.
