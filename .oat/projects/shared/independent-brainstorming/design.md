---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-05-01
oat_generated: false
---

# Design: independent-brainstorming

## Overview

This project ships `oat-brainstorm`, a new always-on user-invocable skill that turns OAT into a first-class destination for project-independent brainstorming conversations. The skill activates proactively on exploratory phrasing (matching the `superpowers:brainstorming` cadence), runs a structured Superpowers-style design conversation without committing the user to an idea or project artifact, and ends in a terminal-state picker filtered by which OAT tool packs are installed in the current repo.

The skill ships in a new dedicated `brainstorm` pack — user-eligible with default user scope, default-on in `oat init` guided setup. This keeps `core` minimal (diagnostics + docs) while giving the brainstorming entry point near-universal availability: the always-on description loads at user scope so the proactive trigger fires consistently across directories and machines. Two terminal states are baked into the skill itself and require no other pack — _stay inline_ (no artifact, ephemeral closure) and _write a brainstorming document to a user-specified path_ (in-repo, off-repo, vault, scratchpad, anywhere). Pack-gated terminal states (capture/extend/summarize via `oat-idea-*`, scoped backlog item via `oat-pjm-add-backlog-item`, project promotion or active-project transition via `oat-project-*`) are surfaced only when their corresponding `tools.<pack>` config flag is true, mirroring the canonical detection signal already used by `oat-project-document`.

The skill also bundles a **visual companion** — a local browser-based UI for showing mockups, diagrams, layout comparisons, and other questions where the user genuinely needs to _see_ something to answer. This is a port of the MIT-licensed `superpowers:brainstorming` visual companion: the same Node-based local HTTP+WebSocket server, the same content-fragment authoring model, and the same per-question (not per-session) decision rule for terminal-vs-browser. OAT-side improvements are scoped to: (a) writing session files into OAT-managed prefixes (`.oat/brainstorm/` for repo-scoped, `~/.oat/brainstorm/` for user-scope, the active project directory when a project is feeding the brainstorm), and (b) shipping the bundle as part of the new `brainstorm` pack so install/update/remove is governed by OAT's pack lifecycle. An optional `oat brainstorm visual-server` CLI wrapper is flagged as a plan-time decision rather than a hard requirement.

The architecture deliberately keeps `oat-brainstorm` as a dispatcher: it owns the brainstorming conversation, the always-on trigger language, the visual-companion offer, and the terminal-state picker, but it hands off to existing `oat-idea-*`, `oat-pjm-*`, and `oat-project-*` skills rather than reimplementing their behavior. This preserves existing skill mode-assertions, avoids duplication, and keeps brainstorming-mode-specific changes localized to the new skill plus the new pack's install/update/remove plumbing and the visual-companion script bundle.

## Architecture

### System Context

`oat-brainstorm` slots between OAT's two existing creative-work entry points:

- **`oat-idea-*` skills** (`ideas` pack) — lightweight ideation once the user has decided the thing is "an idea worth tracking." Requires an active idea record.
- **`oat-project-*` skills** (`workflows` pack) — execution-oriented project lifecycle. Requires a project record.

`oat-brainstorm` fills the middle: a conversational entry point that doesn't require either record up front, but knows how to hand off to either family (or to several other terminal states) when the conversation converges. The always-on trigger means it's the first thing that fires when an exploratory message arrives. The destination is determined at the end of the conversation, not the beginning — see "Destination identification" below for the full rule.

**Key Components:**

- **`oat-brainstorm` skill** — the dispatcher. Owns the always-on trigger language, the brainstorming-mode assertion (blocked / allowed activities, self-correction protocol), the conversational flow, the visual-companion offer, the terminal-state picker, and the handoff invocations. Installable via the new `brainstorm` pack.
- **`brainstorm` tool pack** — the new pack. Single skill (`oat-brainstorm`) plus the bundled `visual-companion/` asset directory. User-eligible, default user scope, default-on in `oat init`. Reuses existing pack lifecycle plumbing for install / update / remove / list / config-write paths.
- **Visual-companion bundle** — `scripts/server.cjs`, `scripts/start-server.sh`, `scripts/stop-server.sh`, `scripts/frame-template.html`, `scripts/helper.js`, and `references/visual-companion.md`. Lifted essentially as-is from `superpowers:brainstorming` (MIT). OAT delta: persistence paths point at OAT-managed prefixes; the bundle ships as part of the `brainstorm` pack.
- **Pack-detection contract** — `oat config get tools.<pack>` resolution for `ideas`, `project-management`, `workflows`. Already canonical in this repo (used by `oat-project-document`). The skill consults this signal once at terminal-state-picker time.
- **Destinations playbook** — `references/destinations.md` bundled with the skill. Contains a per-destination stanza covering trigger phrases, required pack, required template fields, confirmation pattern (full/minimal/none), handoff target, and the "keep going" rule. Together these form a small lookup the skill consults when a destination is identified.
- **Terminal-state handoffs** — inline execution of `oat-idea-new`, `oat-idea-ideate`, `oat-idea-summarize`, `oat-pjm-add-backlog-item`, `oat-project-new`, `oat-project-discover` (and an optional pointer-only handoff to `oat-project-quick-start` / `oat-project-design` for project promotion). The dispatcher invokes these by reading the target SKILL.md and following its process; no signature changes to those skills.
- **Doc-to-path output mechanism** — accepts an absolute or relative path, validates writability, optionally creates parent directories (with explicit confirmation if outside the current repo), writes the synthesized brainstorming document. Uses a bundled `brainstorm-doc.md` template under the `brainstorm` pack's assets.
- **Active-project router** — when a project is active, surfaces a 3-way picker (related → fold-back, independent → other terminal states, related-but-supplementary → reference file) before any other destination resolution. See "Active-project routing" below.
- **`NOTICES.md` extension** — extends the existing Superpowers attribution entry to cover the visual-companion script bundle and the visual-companion guide prose.

### Component Diagram

```
                            user types exploratory message
                                          |
                                          v
                       +------------------------------------+
                       |    oat-brainstorm (dispatcher)     |
                       |  - always-on trigger language      |
                       |  - mode assertion + self-correct   |
                       |  - conversational flow             |
                       |  - visual-companion offer          |
                       |  - destination signal watcher      |
                       |  - terminal-state picker           |
                       |  - handoff inline-executor         |
                       +-----+--------+----------+----------+
                             |        |          |
                             |        |          v
                             |        |    +-------------+
                             |        |    | visual-     |
                             |        |    | companion   |
                             |        |    | bundle      |
                             |        |    | (Node + HTML|
                             |        |    | served at   |
                             |        |    | localhost)  |
                             |        |    +-------------+
                             |        v
                             |   +---------------------+
                             |   | pack detection:     |
                             |   | oat config get      |
                             |   | tools.<pack>        |
                             |   +----+--------+-------+
                             |        |        |
                             |        |        v
                             |        |   +--------------+
                             |        |   | active-      |
                             |        |   | project      |
                             |        |   | router (only |
                             |        |   | if active    |
                             |        |   | project)     |
                             |        |   +-+----+----+--+
                             |        |     |    |    |
                             v        v     v    v    v
              +--------+ +-------+ +----+ +----+ +----+ +--------+
              | inline | | doc-  | |ide-| | pjm| |wf  | |fold    |
              | only   | | to-   | | as | |    | |    | |back/   |
              | (no    | | path  | |hof | |hof | |hof | |reffile |
              |  art)  | |       | |    | |    | |    | |        |
              +--------+ +-------+ +----+ +----+ +----+ +--------+
                                                          |
                                                          v
                                          +-------------------------------+
                                          | upstream artifact + handoff   |
                                          | prompt to plan-authoring skill|
                                          | (oat-project-plan / oat-      |
                                          | project-quick-start /         |
                                          | oat-project-revise)           |
                                          +-------------------------------+
```

### Data Flow — happy path

1. **Trigger.** Agent receives exploratory user message. Always-on description on `oat-brainstorm` fires; agent invokes the skill.
2. **Mode assertion.** Skill prints phase banner (`OAT ▸ BRAINSTORM`), asserts brainstorming mode (blocked / allowed activities, self-correction protocol).
3. **Visual companion offer** (its own message, no other content). User accepts or declines.
4. **Pack detect + active project detect.** Skill reads `oat config get tools.ideas`, `tools.project-management`, `tools.workflows`. Reads `oat config get activeProject`; if valid, reads its `state.md` for `oat_workflow_mode`, `oat_phase`, `oat_pr_status`.
5. **Free brainstorming.** Skill runs Superpowers cadence: explore context (one question at a time), 2–3 approaches with recommendation, scaled-section design presentation. Visual companion is consulted per-question (not per-session) — visual content goes to browser via HTML fragments in `screen_dir`; text content stays in terminal. Browser interactions land in `state_dir/events`.
6. **Destination identification.** Two paths to convergence:
   - **Trigger phrase fires** during the conversation (e.g., "track this as a backlog item", "let's make this a project"). Skill matches against per-destination trigger phrases in the destinations playbook and surfaces the matched destination immediately.
   - **Convergence cue** (user explicitly says "I'm done", "let's wrap", or the conversation reaches a natural stopping point). Skill presents the pack-filtered terminal-state picker.
7. **Satisfaction check.** Whichever path triggered convergence, the skill asks: "Feel good about where we landed, or want to keep brainstorming and add more detail?" If keep going, return to step 5 with the destination noted (skill may proactively probe for required fields the destination needs that aren't covered yet). If wrap up, continue.
8. **Synthesis with confirmation.** Skill synthesizes the conversation against the destination's template field map. For destinations with discrete fields (currently only scoped-backlog-item), the skill presents the proposed payload field-by-field for user confirmation before writing. For prose-container destinations (idea discovery, project discovery, design notes, doc-to-path, reference file), no per-field confirmation — minimal confirmation only (slug, path, or which artifact).
9. **Handoff.** Read target `SKILL.md` and execute its process inline using the confirmed payload as answers to early prompts. For active-project fold-back, append to upstream artifact, commit immediately, print handoff prompt for the user to paste when invoking the appropriate plan-authoring skill.
10. **Cleanup.** Visual-companion server, if started, is stopped via `scripts/stop-server.sh`. Persisted session content under the OAT-managed prefix is preserved; `/tmp` sessions are cleaned up by the script.

### Destination identification — full rule

Brainstorming uses **ask-at-end** with **opportunistic destination surfacing** during the conversation. Rationale: a user with a known destination would typically invoke the destination skill directly; the brainstorming skill exists to serve cases where the destination is unclear. Asking up front partially defeats the purpose. The opportunistic-surfacing addition is so the skill doesn't ignore explicit signals when they arrive mid-conversation.

**Trigger phrases** are catalogued in the destinations playbook and matched against user messages during step 5. Examples:

- "track this as a backlog item" / "make a ticket" / "log this" → scoped backlog item
- "capture as an idea" / "this is an idea worth keeping" → ideas pack capture
- "let's make this a project" / "promote to a project" → workflows project promotion
- "for the active project" (when active project exists) / "fold this into [project]" → active-project routing

The skill matches loosely (substring + paraphrase tolerance, not regex). When ambiguous, the skill asks before committing to a destination ("sounds like you want to track this as a backlog item — confirm?").

If no trigger phrase fires and the user doesn't explicitly converge, the skill watches for soft convergence cues: prolonged absence of new questions, user asking "so what now?", user repeating points already made. On soft convergence, the skill prompts: "I think we've covered the ground here — want to wrap up, or keep going?"

### Active-project routing — 3-way picker

When a project is active, the **first** destination question (after step 6 surfaces convergence) is "is this brainstorm related to the active project?". This dictates the entire routing tree.

- **Related → fold back to upstream artifact + handoff prompt.** Uniform rule across spec-driven and quick modes. See the "Fold-back rule" subsection below.
- **Independent → all other terminal states** (new project, backlog item, idea, doc-to-path, inline). The active project is acknowledged but does not constrain the picker.
- **Related but supplementary → brainstorming reference file** at `<project>/brainstorming/YYYY-MM-DD-<topic>.md`. Always available regardless of project phase. The new `brainstorming/` subdirectory is parallel to existing `pr/` and `reviews/` subdirectories — explicit purpose, doesn't collide with anything else, naturally discoverable.

The 3-way picker fires before the pack-filtered terminal-state picker would normally appear. If the user picks "related → fold back," the skill bypasses the terminal-state picker entirely and follows the fold-back rule.

### Fold-back rule (active project, related brainstorm)

Uniform across spec-driven and quick modes. Differs only in which plan-authoring skill the handoff prompt addresses.

1. **Pick upstream artifact.** Prefer most-specific existing one: `design.md` if it exists (any mode — quick lightweight design counts), otherwise `discovery.md`. The user's signal during the conversation ("this is foundational" vs "this is a design refinement") can override toward `discovery.md` even when `design.md` exists.
2. **Append synthesis to that artifact** as a clearly-marked section: `## Brainstorming Update: YYYY-MM-DD — <topic>` containing the chosen direction, key decisions, and a transcript appendix.
3. **Commit immediately.** The commit is non-optional; the hash is referenced by step 4. Commit message format: `chore(oat): integrate brainstorm into <artifact> for <project-name>`.
4. **Print handoff prompt** for the user to paste when invoking the appropriate plan-authoring skill. The handoff target depends on workflow mode and PR status:

   | Mode        | PR status                    | Handoff target            |
   | ----------- | ---------------------------- | ------------------------- |
   | spec-driven | none / closed                | `oat-project-plan`        |
   | quick       | none / closed                | `oat-project-quick-start` |
   | either      | open (`oat_pr_status: open`) | `oat-project-revise`      |

   Handoff prompt template:

   ```
   Run `<skill-name>` with this context:

   "A brainstorming session surfaced changes that needed to be folded
   into <artifact>. I've committed the update (commit <hash>: <subject>).
   Integrate the new content into the existing plan as new tasks (or a
   new phase if substantial). Don't refresh the existing plan — preserve
   review tables and any in-progress task state."
   ```

5. **Stop.** Skill ends mode assertion. The user runs the plan-authoring skill at their own pace. The brainstorming skill never auto-chains into plan authoring — the deliberate transition is the point.

### Per-destination handoff matrix

| Destination                                  | Pack required      | Confirmation                                                                    | Handoff target / behavior                                                                                                                                                       |
| -------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inline only                                  | none               | n/a                                                                             | One-paragraph closing summary; no artifact written                                                                                                                              |
| Doc-to-path                                  | none               | minimal (path)                                                                  | Render synthesized payload into `brainstorm-doc.md` template, write to user-specified path                                                                                      |
| Capture as new idea                          | ideas              | minimal (slug)                                                                  | Inline-execute `oat-idea-new` Steps 3-7; write field-filled `discovery.md`; offer to chain into `oat-idea-ideate` Step 4                                                        |
| Extend existing idea                         | ideas              | minimal (which idea)                                                            | Inline-execute `oat-idea-ideate` Step 4 (Start New Session) on chosen idea path                                                                                                 |
| Summarize idea directly                      | ideas              | none at this layer                                                              | Capture-as-new-idea path silently, then inline-execute `oat-idea-summarize` end-to-end (which itself shows summary for accept/refine review)                                    |
| Scoped backlog item                          | project-management | **full pattern** (title / description / acceptance criteria / scope / priority) | Inline-execute `oat-pjm-add-backlog-item` from Step 1 with pre-filled inputs                                                                                                    |
| Promote to new OAT project                   | workflows          | minimal (slug + mode)                                                           | Run `oat project new <slug> --mode <mode>`; write field-filled `discovery.md` only (never `design.md`); print pointer to `oat-project-quick-start` / `oat-project-design`; stop |
| Active project: fold-back                    | workflows          | minimal (which artifact)                                                        | See "Fold-back rule" above                                                                                                                                                      |
| Active project: brainstorming reference file | workflows          | minimal (filename)                                                              | Write synthesized payload to `<project>/brainstorming/YYYY-MM-DD-<topic>.md`; no downstream skill invocation                                                                    |

### Project promotion — discovery only

Project promotion writes `discovery.md` only, never `design.md`. Rationale: a half-populated `design.md` is often worse than no design.md — it constrains the design phase to a shape the user hasn't deliberately chosen, and the design phase's collaborative cadence (section iterator, YAGNI guardrail, approach reaffirmation) gets short-circuited by content that arrived from a different mode. Architectural intent surfaced during brainstorming lands in discovery's `Solution Space` / `Chosen Direction` / `Key Decisions` sections — exactly where the design phase will read it during approach reaffirmation. So decisions are preserved, just in the right artifact.

The user is told "discovery is seeded — run `oat-project-quick-start` (or `oat-project-design`) to continue." If the brainstorm produced design-grade detail, the design phase consumes it from discovery rather than from a partial design artifact.

## Component Design

### Component A: `oat-brainstorm` skill (the dispatcher)

**Purpose:** Dispatcher for project-independent brainstorming conversations. Owns activation, mode assertion, conversational flow, visual-companion offer, destination identification, synthesis, and handoff.

**Responsibilities:**

- Carry the always-on description that fires on exploratory phrasing.
- Assert brainstorming mode (blocked / allowed activities, self-correction protocol).
- Run the Superpowers-style conversation cadence: explore → 2-3 approaches with recommendation → scaled-section design presentation.
- Offer the visual companion (own message, no other content) at activation; consult per-question for browser-vs-terminal routing.
- Watch for destination-trigger phrases during the conversation and surface them when matched.
- Read pack-detection signals (`oat config get tools.<pack>`) and active-project state at convergence time.
- Run the active-project 3-way router when a project is active.
- Synthesize the conversation into the canonical payload (see Data Models).
- For each destination, follow the per-destination handoff per the destinations playbook (Component D).
- For doc-to-path, render the payload into the bundled `brainstorm-doc.md` template and write to the user-specified path.
- For active-project fold-back, append synthesis to upstream artifact, commit immediately, print handoff prompt.
- For inline-only, emit a one-paragraph closing summary.

**Inputs / Outputs:**

- **Inputs:** user terminal text + visual-companion `state_dir/events`; `oat config` entries for `tools.*` and `activeProject`; existing artifact state for active project (`state.md`, `discovery.md`, `design.md`); downstream skill files (read-only).
- **Outputs:** depending on terminal state — appended idea session, scaffolded idea, summarized idea, scoped backlog item, scaffolded project with seeded `discovery.md`, appended fold-back to upstream artifact + commit + handoff prompt, brainstorming-doc artifact at user-specified path, or no artifact (inline only).

**Frontmatter contract:**

```yaml
---
name: oat-brainstorm
version: 1.0.0
description: <always-on description tuned for exploratory-intent triggers>
disable-model-invocation: false # always-on
user-invocable: true # also reachable via /oat-brainstorm
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---
```

The exact description string is plan-time work — it must be tight enough to avoid over-fire on routine implementation requests. Reference: `superpowers:brainstorming` description as a starting point, adapted for OAT's vocabulary.

**Skill-file structure (sections, following OAT conventions):**

1. Mode Assertion (purpose, blocked/allowed activities, self-correction protocol, recovery)
2. Progress Indicators (banner + step counters)
3. Process (numbered steps mapping to Architecture's Data Flow)
4. Success Criteria

**Internal sub-mechanisms (folded into the skill, not separate components):**

- **Pack-detection bash:** three `oat config get tools.<pack>` calls during step 4 of the process.
- **Active-project router:** state.md read + 3-way picker during step 6.
- **Synthesis logic:** payload assembly during step 8.
- **Doc-to-path mechanism:** path validation + parent-dir creation + write during step 9 when destination is doc-to-path.
- **Fold-back commit + handoff-prompt emission:** during step 9 when destination is active-project fold-back.

**Dependencies:**

- Visual-companion bundle (Component C) — sibling assets in the same skill directory.
- Destinations playbook (Component D) — `references/destinations.md` in the same skill directory.
- `oat config` CLI for pack and active-project signal reads.
- Read access to downstream skill files (`.agents/skills/oat-idea-*/SKILL.md`, `.agents/skills/oat-pjm-add-backlog-item/SKILL.md`, `.agents/skills/oat-project-*/SKILL.md`).
- Templates: `.oat/templates/idea-discovery.md`, `.oat/templates/backlog-item.md`, `.oat/templates/discovery.md` (consumed indirectly via the destinations playbook).

**Design decisions:**

- **Always-on activation, not user-invocable-only.** Required by bl-53f0; matches `superpowers:brainstorming` discipline.
- **Ask-at-end with opportunistic destination surfacing**, not ask-up-front. Validated in design conversation.
- **Inline-execute downstream skills**, not auto-invoke. Downstream `disable-model-invocation: true` is irrelevant — we read their files and follow their steps, exactly as `oat-idea-new` already chains into `oat-idea-ideate`.
- **Synthesis with full confirmation only for discrete-field destinations.** Other destinations get minimal confirmation (slug, path, which artifact). See per-destination handoff matrix in Architecture.
- **Project promotion writes `discovery.md` only**, never partial `design.md`.
- **Fold-back commits before printing the handoff prompt.** The commit hash is referenced in the prompt; the commit must exist before the user copies the prompt.

### Component B: `brainstorm` tool pack

**Purpose:** New OAT pack that bundles the `oat-brainstorm` skill and its visual-companion assets. Participates in standard pack-lifecycle commands.

**Responsibilities:**

- Be installable via `oat tools install brainstorm` and the unified `oat tools install` interactive picker (default-checked).
- Be updatable via `oat tools update --pack brainstorm` and `oat tools update --all`.
- Be removable via `oat tools remove --pack brainstorm` and `oat tools remove --all`.
- Write `tools.brainstorm: true` to shared repo config on install; rebuild that flag during update/remove map reconciliation.
- Default scope: user. User-eligible (allows project scope and migration paths consistent with `ideas` / `docs` / `utility` / `research`).

**Manifest entries (concrete deliverables):**

- `BRAINSTORM_SKILLS = ['oat-brainstorm'] as const` exported from `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` (parallels `CORE_SKILLS`, `IDEAS_SKILLS`, etc.).
- Pack name `'brainstorm'` added to install/update/remove command pack-name unions in `packages/cli/src/commands/init/tools/index.ts`, `packages/cli/src/commands/tools/update/update-tools.ts`, and the corresponding remove paths.
- Pack description added to interactive-picker descriptions: e.g., "Always-on brainstorming entry point with visual companion."
- `oat init tools` default-on set updated to include `brainstorm`.
- Bundle-consistency tests updated to recognize `BRAINSTORM_SKILLS` alongside the existing manifest constants.

**Inputs / Outputs:**

- **Inputs:** pack name (`'brainstorm'`) routed through standard pack-lifecycle commands; install scope (user / project).
- **Outputs:** canonical asset placement at user scope (`~/.agents/skills/oat-brainstorm/`) or project scope (`.agents/skills/oat-brainstorm/`); `tools.brainstorm` config flag; provider-view sync after install/update/remove.

**Dependencies:**

- Existing pack-lifecycle plumbing. No new infrastructure. Reuses install-state machinery, sync logic, config-write paths, dry-run behavior.

**Design decisions:**

- **Single-skill pack rather than expanding `core`.** Keeps `core` focused on diagnostics + docs; `brainstorm` has its own purpose.
- **Default user scope, user-eligible.** Mirrors `ideas` / `docs` / `utility` / `research`. Default-on in `oat init` ensures most users get the trigger universally; `--scope project` and removal remain opt-out paths.

### Component C: Visual-companion bundle

**Purpose:** Local browser-based UI for visual brainstorming questions. Direct port of MIT-licensed `superpowers:brainstorming` companion.

**Responsibilities:**

- Local HTTP + WebSocket server that watches a directory for HTML files and serves the newest one to the browser.
- Helper script (`helper.js`) injected into served pages for client-side interactivity (option selection, event reporting via `state_dir/events`).
- Frame template (`frame-template.html`) wrapping content fragments in a styled page (CSS theme, header, selection indicator).
- Bash launchers (`start-server.sh`, `stop-server.sh`) with platform-specific behavior already validated upstream (macOS / Linux / Codex / Windows / Gemini).
- Reference guide (`visual-companion.md`) describing usage patterns for the agent.

**File set (under `.agents/skills/oat-brainstorm/`):**

```
oat-brainstorm/
  SKILL.md
  scripts/
    server.cjs              # MIT port, no source changes
    start-server.sh         # MIT port, persistence-path defaults patched
    stop-server.sh          # MIT port, no source changes
    frame-template.html     # MIT port, no source changes
    helper.js               # MIT port, no source changes
  references/
    visual-companion.md     # MIT port, OAT-side path edits
    destinations.md         # OAT-original (Component D)
```

**OAT-side modifications (vs Superpowers source):**

- `start-server.sh`: default persistence-path resolution updated from `.superpowers/brainstorm/` to OAT-managed prefixes. Resolution order: if `--project-dir` passed, use `<project-dir>/.oat/brainstorm/`; else if invoked inside an OAT-initialized repo, use `<repo-root>/.oat/brainstorm/`; else use `~/.oat/brainstorm/`.
- `visual-companion.md`: prose updated to reference OAT path conventions (`.oat/brainstorm/` not `.superpowers/brainstorm/`); example invocations updated to reflect the bundled location relative to the skill directory.
- No changes to `server.cjs`, `frame-template.html`, `helper.js`, or `stop-server.sh`. These are lifted verbatim.

**Inputs / Outputs:**

- **Inputs:** HTML content fragments (or full HTML documents) written to `screen_dir`; user clicks in the served browser page.
- **Outputs:** newest HTML served at `http://localhost:<port>`; browser interaction events appended to `state_dir/events` (JSONL); session metadata at `state_dir/server-info`.

**Dependencies:**

- Node.js on PATH for `server.cjs`. Pre-flight check at activation; if missing, the visual-companion offer is suppressed and the skill notes this in a `oat-doctor`-discoverable form.
- `bash` for launchers (already a hard dependency for OAT).

**Design decisions:**

- **Lift as-is rather than reimplement.** Superpowers is MIT, the implementation is solid, and OAT's needs match closely.
- **Persistence path alignment** is the only meaningful OAT delta. Aligns with OAT's `.oat/` prefix convention so existing `.gitignore` rules cover the new directory in OAT-initialized repos.
- **`oat brainstorm visual-server` CLI wrapper deferred** to a follow-up. Bundle ships with raw bash scripts first; wrapper is additive.

**Attribution:**

`NOTICES.md` Superpowers entry extended with a new subsection:

```markdown
### `brainstorming` skill — visual companion

Source files: `skills/brainstorming/scripts/{server.cjs, start-server.sh,
  stop-server.sh, frame-template.html, helper.js}` and
`skills/brainstorming/visual-companion.md`.

Files lifted into OAT (under `.agents/skills/oat-brainstorm/`):

- `scripts/server.cjs`, `scripts/stop-server.sh`, `scripts/frame-template.html`,
  `scripts/helper.js` — verbatim from upstream.
- `scripts/start-server.sh` — verbatim except for default persistence-path
  defaults (`.superpowers/brainstorm/` → OAT-managed prefixes).
- `references/visual-companion.md` — adapted prose: persistence paths and
  example invocations updated to OAT conventions.

Consumer OAT skills: `oat-brainstorm`.
```

### Component D: Destinations playbook (`references/destinations.md`)

**Purpose:** Per-destination lookup that the `oat-brainstorm` skill consults at destination-identification time. Centralizes trigger phrases, required fields, confirmation patterns, and handoff targets so the main `SKILL.md` stays focused on flow.

**Responsibilities:**

- Provide one stanza per terminal state. In a fully-installed repo: 8 destinations covering inline, doc-to-path, capture-as-idea, extend-idea, summarize-idea, backlog-item, project-promotion, plus the active-project 3-way (fold-back / independent-routing-marker / reference-file).
- Be readable both by the skill (during execution — the skill reads this file as part of its process) and by maintainers (during updates).
- Include the trigger-phrase set used for opportunistic destination surfacing during the conversation.

**Stanza structure (per destination):**

```markdown
### Destination: <name>

**Pack required:** <pack name> | always available
**Trigger phrases:** "<phrase 1>", "<phrase 2>", … (paraphrase-tolerant)
**Required template fields:** <field 1>, <field 2>, … (linked to source template)
**Optional template fields:** <field 1>, <field 2>, …
**Confirmation pattern:** full | minimal | none
(when full, includes example wording showing the field-by-field display)
**Handoff target:** <skill name + entry step> | "no downstream skill"
**If user wants to keep brainstorming after this is offered:**
<return-to-flow rule, plus any field-probing the skill should do>
```

A fully-worked example for the scoped-backlog-item destination already appears earlier in this design conversation; the playbook expands each row of the per-destination handoff matrix into a full stanza.

**Inputs / Outputs:**

- **Inputs:** read by `oat-brainstorm` as part of its destination-identification process.
- **Outputs:** none directly. The playbook is reference content; behavior is executed by the skill.

**Dependencies:**

- Implicit dependencies on the templates the destinations target (`.oat/templates/idea-discovery.md`, `.oat/templates/backlog-item.md`, `.oat/templates/discovery.md`, `.oat/templates/design.md`). The playbook does not duplicate these templates; it points at them.

**Design decisions:**

- **Reference file rather than skill-embedded.** Keeps `SKILL.md` lean and focused on flow. The playbook can grow without bloating the main skill.
- **Trigger phrases live with the destinations**, not with the conversational flow. Co-locating them with the stanza makes maintenance straightforward — adding a destination automatically adds its trigger set.
- **Loose phrase matching, not regex.** The skill uses substring + paraphrase tolerance and asks before committing to a destination when ambiguous. Regex would be brittle and over-specify language.

## Data Models

### Synthesized payload

The skill builds an in-memory payload during synthesis. Fields:

```typescript
interface SynthesizedPayload {
  title: string; // slug-friendly topic name
  summary: string; // 2-3 sentence overview
  motivation: string; // why this matters
  vision: string; // what it would look like if shipped
  approachesConsidered: Array<{
    name: string;
    description: string;
    tradeoffs: string;
    recommended: boolean;
  }>;
  chosenDirection: {
    approachName: string; // matches one of approachesConsidered[].name
    rationale: string;
  } | null; // null when no direction was chosen
  openQuestions: string[];
  nextSteps: string[];
  transcriptSessionNote: string; // chronological session log for Notes & Discussion sections
}
```

The payload is staged in memory during the conversation and written into destination-specific shapes at handoff time. It is not persisted between conversation turns — if the conversation ends abruptly, the only record is whatever was written via the destination handoff.

### Config keys

- `tools.brainstorm: boolean` — written by `oat tools install brainstorm` and the unified `tools` map rebuilders. Read by the skill (defensively, for self-detection) and by `oat-doctor` for installed-pack reporting.

No new config keys are introduced beyond the standard `tools.<pack>` entry that every pack adds. Workflow.designMode and other existing keys are unaffected.

## API Design

### CLI surface — extends existing `oat tools` commands

The new `brainstorm` pack participates in existing pack-lifecycle subcommands. No new top-level CLI commands; the pack name is added to existing pack lists.

- `oat tools install brainstorm` — installs the pack at the user's chosen scope (default user). Same flow as other user-eligible packs.
- `oat tools install` interactive — `brainstorm` appears in the pack picker, default-checked.
- `oat tools update --pack brainstorm` — updates installed `oat-brainstorm` and bundled visual-companion assets to bundled versions.
- `oat tools update --all` — includes `brainstorm` in the reconciliation.
- `oat tools remove --pack brainstorm` — removes the skill and visual-companion bundle.
- `oat tools list` — displays `brainstorm` pack alongside others.
- `oat tools info oat-brainstorm` — displays installed version, scope, status.

### Optional: `oat brainstorm visual-server` CLI wrapper

**Status:** plan-time decision, not a hard requirement.

If included, this would be a thin wrapper over the bundled bash scripts:

- `oat brainstorm visual-server start [--project-dir <path>] [--host <bind-host>] [--url-host <display-host>]`
- `oat brainstorm visual-server stop [<session-dir>]`
- `oat brainstorm visual-server status` — list active sessions

The wrapper provides nicer ergonomics than raw `start-server.sh` invocations and gives `oat-doctor` a clean way to reason about session liveness. Defer until after the bundle ships if scope pressure rises.

### Pack-detection contract

Read pattern (consumed by `oat-brainstorm` at runtime):

```bash
IDEAS_INSTALLED=$(oat config get tools.ideas 2>/dev/null || echo "false")
PJM_INSTALLED=$(oat config get tools.project-management 2>/dev/null || echo "false")
WORKFLOWS_INSTALLED=$(oat config get tools.workflows 2>/dev/null || echo "false")
```

Mirrors the convention used by `oat-project-document`. No filesystem heuristics; no fallback path.

## Error Handling

### Visual-companion server fails to start

Surface failure clearly and degrade to terminal-only mode. Common failures:

- Port allocation failure (rare; the script picks random high port) → log the error from `start-server.sh` stdout, tell the user "visual companion unavailable, continuing in terminal."
- Node.js missing → check before offering visual companion; if `node` is not on PATH, skip the offer entirely and log a `oat-doctor`-discoverable note.
- Persistence path unwritable → fall back to `/tmp` session and warn the user that mockups won't persist.

### Downstream skill missing

If a pack-gated terminal state was offered (because `tools.<pack>` was true) but the skill file isn't actually present at the expected canonical path, the skill prints a clear error pointing at `oat tools update --pack <pack>` and falls back to doc-to-path or inline. This is a "tools.\* drift" state that should be rare — `oat-doctor` covers detection of the broader case.

### Path validation failures (doc-to-path)

- Path is a directory → ask user to provide a filename.
- Parent directory missing → offer to create it; if outside repo, require explicit confirmation.
- File already exists → ask whether to overwrite or pick a different filename.
- Path is unwritable → surface the OS error and ask for an alternative.

### Active project resolution conflicts

If `activeProject` config points to a path that doesn't exist or has an unreadable `state.md`, the skill treats the active-project router as inactive and proceeds without the 3-way picker. The user gets the standard pack-filtered terminal-state picker. A warning is printed but the brainstorm is not blocked.

## Testing Strategy

### Unit tests

- **Pack-detection helpers** — verify `tools.<pack>` resolution returns expected values for each pack name; missing key returns false-equivalent.
- **Trigger-phrase matcher** — test loose matching against destination playbook trigger phrases. Cases: exact phrase, paraphrase, ambiguous (multiple matches), no match.
- **Synthesis payload assembly** — given a fixture conversation, verify the payload shape and field population.
- **Destination filter** — given install-state combinations (no packs, ideas only, all packs, etc.), verify the picker surfaces the right options and suppresses pack-gated ones.
- **Path validation** — doc-to-path mechanism: relative/absolute, existing/missing parent, writable/unwritable, in-repo/out-of-repo confirmation.

### Integration tests

- **Pack lifecycle** — `oat tools install brainstorm`, `oat tools update --pack brainstorm`, `oat tools remove --pack brainstorm`. Verify config-write of `tools.brainstorm`, asset placement at user scope, idempotency on re-install.
- **`oat init tools` default-on** — verify `brainstorm` appears in the default-on set in guided setup.
- **Tools-list output** — `oat tools list` includes `brainstorm` after install with correct version and status.
- **Skill validation** — bundled skill validation suite must pass on `oat-brainstorm` (frontmatter, mode assertion structure, allowed-tools list, etc.).

### Visual-companion smoke tests

- **Server starts and stops cleanly** under a `/tmp` session directory.
- **Frame-template wraps content fragments** correctly (HTML rendering smoke test).
- **Persistence path** — when invoked with `--project-dir`, files land under `.oat/brainstorm/<session>/`, not `.superpowers/brainstorm/`.
- **30-minute idle timeout** behaves as advertised (long-running test or mocked-clock variant).

### Dogfood scenarios (one per terminal state)

Per bl-53f0 acceptance criteria: at least one dogfood scenario per terminal state available in this repo. This repo has all packs installed, so all eight terminal states are covered:

1. **Inline only** — exploratory conversation that resolves with a one-paragraph summary, no artifact.
2. **Doc-to-path (in-repo)** — write brainstorm to `docs/scratchpad/<topic>.md`.
3. **Doc-to-path (off-repo)** — write to `~/vault/notes/<topic>.md` with explicit out-of-repo confirmation.
4. **Capture as new idea** — produce a fresh idea with seeded `discovery.md` first session.
5. **Extend existing idea** — append a session to an existing idea's `discovery.md`.
6. **Summarize idea directly** — fast path: capture + summarize in one go.
7. **Scoped backlog item** — produce a `bl-XXXX.md` file with full confirmation pattern.
8. **Promote to new OAT project** — scaffold a project with seeded `discovery.md` (no `design.md`) and pointer to next skill.
9. **Active project: fold-back** — append synthesis to upstream artifact, commit, print handoff prompt; verify the prompt's referenced commit hash is correct.
10. **Active project: brainstorming reference file** — write to `<project>/brainstorming/<topic>.md`, no lifecycle artifact mutation.

### Out of scope for testing

- Live visual-companion browser interaction (browser automation is heavy for the value; manual smoke is acceptable).
- Cross-platform shell-script differences (Superpowers already validated macOS/Linux/Windows variants; we inherit those).
- Stress / performance testing of the visual companion (single-user local tool).

## Open Questions

- **Optional `oat brainstorm visual-server` CLI wrapper** — include in this project, or defer to a follow-up? Lean: defer, ship the bash scripts as-is first.
- **Trigger-phrase tuning** — initial phrase set is conservative. May need expansion based on dogfood. Plan-time task: include a follow-up to revise based on first ~10 brainstorm sessions in this repo.
- **Pack-default-on plumbing** — existing `oat init tools` guided setup already supports a default-on set. Verify whether adding `brainstorm` to the default-on set requires code changes or just an entry in the install-state default array. Plan-time validation task.
- **Visual-companion persistence path during active project** — when a project is active and visual companion is started, should session files land under `<project>/brainstorming/<session>/` or always under `.oat/brainstorm/<session>/`? Lean: always under `.oat/brainstorm/<session>/`; the active-project reference-file destination handles per-project capture explicitly. Confirm during plan.

## References

- Backlog item: `.oat/repo/reference/backlog/items/project-independent-brainstorming-mode.md` (bl-53f0)
- Related backlog: `.oat/repo/reference/backlog/items/idea-promotion-auto-discovery.md` (bl-b3f7)
- Existing idea skills: `.agents/skills/oat-idea-new/SKILL.md`, `.agents/skills/oat-idea-ideate/SKILL.md`, `.agents/skills/oat-idea-summarize/SKILL.md`, `.agents/skills/oat-idea-scratchpad/SKILL.md`
- PJM skill: `.agents/skills/oat-pjm-add-backlog-item/SKILL.md`
- Project lifecycle skills: `.agents/skills/oat-project-new/SKILL.md`, `.agents/skills/oat-project-discover/SKILL.md`, `.agents/skills/oat-project-design/SKILL.md`, `.agents/skills/oat-project-plan/SKILL.md`, `.agents/skills/oat-project-quick-start/SKILL.md`, `.agents/skills/oat-project-revise/SKILL.md`
- Tool packs: `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- Pack-detection precedent: `.agents/skills/oat-project-document/SKILL.md` (uses `oat config get tools.project-management`)
- Superpowers brainstorming source: `~/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/brainstorming/`
- Existing Superpowers attribution: `NOTICES.md`
