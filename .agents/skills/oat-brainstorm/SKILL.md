---
name: oat-brainstorm
version: 1.0.4
description: Use when the user explicitly invokes the `brainstorm` verb, including `/oat-brainstorm`, "let's brainstorm", "brainstorm this", "can we brainstorm X", or "help me brainstorm X". For ambiguous exploratory phrasing ("I've been thinking", "what if", "help me think through"), do NOT auto-enter; respond conversationally and offer mode only after ≥2 sustained exploratory turns. Do NOT use for review, debug, PR, status, implementation, or active-workflow questions.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Brainstorm

Project-independent brainstorming dispatcher. Owns the explicit activation gate (see `## Activation Contract`), the Superpowers-style conversational cadence, the visual-need assessment and conditional visual-companion offer, the destination identification, and the per-destination handoff to existing OAT skills.

## Activation Contract

Brainstorm-quality response (options, tradeoffs, open questions, no premature implementation, no destination guess) is the **default** for any exploratory phrasing without a named destination. Mode assertion + banner is **reserved** for explicit hard-activation triggers or user confirmation. The banner is a workflow commitment marker, not a quality marker.

Evaluate this contract before printing the `OAT ▸ BRAINSTORM` banner, asserting brainstorm mode, running pack detection, or offering the visual companion. The contract has three tiers:

### Hard Activation

Enter OAT brainstorm mode immediately when the user invokes `/oat-brainstorm` or uses an explicit `brainstorm` verb with a topic/request. Examples:

- `/oat-brainstorm`
- "let's brainstorm X"
- "brainstorm this"
- "can we brainstorm X?"
- "help me brainstorm X"

Hard Activation runs the full Process flow below: print the mode banner (Step 2), assess visual need (Step 3), detect packs and active project (Step 4), and proceed.

### Declared Multi-Project Mode

If the opening request explicitly says the scope is multiple projects, several sub-projects, an umbrella project, or otherwise declares decomposition intent, still enter brainstorm mode through Hard Activation, but switch the conversation shape immediately to umbrella framing. This is a first-class split path, not an ordinary destination guess.

Do not treat ambiguous exploratory phrasing as declared mode. Put another way: do not treat ambiguous exploratory phrasing as declared mode. Messages like "help me think through a broad thing", "what if this has multiple parts", or "this might get big" remain on the Soft Exploratory Path unless the user explicitly declares that the desired outcome is multiple projects.

In declared mode, ask this boundary question before ordinary free brainstorming:

> "Do you already know the child projects, or should we decompose the scope together?"

- If the user already knows the children, capture light parent-level context: shared context, child list, dependencies, sequencing, and integration risks.
- If the children are unknown, brainstorm the boundaries first until a child list is clear.

Once the child list is clear, invoke `oat-project-split` with a `SplitPayload` using `origin: "declared"`, `interactive: true`, `declaredChildren`, and the parent/umbrella slug when known. The brainstorm hook only frames and hands off; `oat-project-split` owns normalization, parent writing, child scaffolding, and activation.

### Soft Exploratory Path

Do **not** print the banner, assert mode, run pack detection, or offer the visual companion on the first response. Answer normally with brainstorm-quality structure (options, tradeoffs, open questions, no premature implementation, no destination guess). Examples:

- "help me think through..."
- "I've been thinking about..."
- "what if we..."
- "I'm trying to figure out..."
- "I'm not sure how to approach..."

Track an exploratory-turn counter for the thread. After **≥2 consecutive exploratory turns** with no concrete action requested by the user, append once to your response:

> "If you want, I can switch into structured brainstorm mode for this."

Offer once per thread. If the user accepts (or types `/oat-brainstorm`, "let's brainstorm", etc.), transition to Hard Activation. If the user declines, ignores, or pivots to a non-exploratory request, stay on the Soft Exploratory Path silently.

### No Activation

Do **not** activate or offer brainstorm mode for advisory, review, debug, PR, status, implementation, or active-workflow questions unless the user explicitly asks to brainstorm. Brainstorm-quality reasoning is still allowed for these — just no banner, no mode assertion, no offer. Examples:

- "thoughts?"
- "what's your take?"
- "does this seem right?"
- "please review..."
- "why is this failing?"
- "what's the PR status?"
- "what about X?" during an active artifact / PR / implementation workflow
- "I noticed an issue..."
- "how would you fix this?"

These messages get a direct response, not a workflow takeover. If the model has discovered this skill on a No Activation message, the discrimination check failed and the skill should not have been chosen — exit without the banner.

## Mode Assertion

**OAT MODE: Brainstorm**

**Purpose:** Run a structured exploratory conversation after the **Activation Contract** resolves to Hard Activation or the user accepts the soft offer. This skill owns explicit destinationless brainstorm entry points; ambiguous advisory phrasing stays conversational on the Soft Exploratory Path until the user opts in. Identify the destination at the end (or opportunistically on a clear trigger phrase) and hand off to the right downstream skill — or stay inline / write a doc when no other artifact is wanted.

**BLOCKED Activities:**

- No banner, mode assertion, pack detection, or visual-companion offer for the Soft Exploratory Path or No Activation Path until the user explicitly accepts the soft offer or invokes `/oat-brainstorm`.
- No implementation code, no scaffolding, no actual feature changes.
- No formal requirements / specs / architectural designs (the design phase belongs to `oat-project-design`, not here).
- No auto-routing to a destination before convergence — the destination is identified at the end of the conversation, not the beginning. Opportunistic surfacing on a clear trigger phrase is allowed; pre-emptively forcing a destination is not.
- Visual-companion offer must run only when the topic is visual-likely OR the user has explicitly asked for it. Never offer when the topic is text-likely; never skip when the topic is visual-likely.
- No fold-back commit on a dirty working tree without running the preflight `git status` check first (see Process step 9 active-project branches).
- No `git add -A` and no directory globs for the fold-back commit. Staging is always scoped: `git add -- "$ARTIFACT_PATH"`.
- No printing the fold-back handoff prompt before `git commit` actually succeeds. The prompt references a hash; a missing commit makes the prompt misleading.

**ALLOWED Activities:**

- Free-form exploratory conversation, one question at a time, multiple-choice when possible, 2-3 distinct approaches with a recommendation.
- Per-question visual-companion routing (browser for visual content, terminal for text).
- Pack and active-project detection at convergence time (`oat config get tools.<pack>` / `oat config get activeProject`).
- Reading downstream skill files (`oat-idea-*`, `oat-pjm-add-backlog-item`, `oat-project-*`) and following their process inline using the synthesized payload as pre-filled answers.
- Rendering the doc-to-path artifact from `templates/brainstorm-doc.md`.
- Active-project fold-back: appending synthesis to the chosen upstream artifact and committing — only after the safety contract (preflight, scoped staging, conditional handoff print) is satisfied.

**Self-Correction Protocol:**
If you catch yourself:

- Printing the brainstorm banner after a Soft Exploratory Path message ("help me think through...", "I've been thinking about...", "what if we...") or No Activation Path message ("thoughts?", "what's your take?", "does this seem right?", review/debug/PR/status/active-workflow questions) → STOP. Drop back to a conversational response. For Soft Exploratory Path, offer brainstorm mode only after ≥2 sustained exploratory turns; for No Activation Path, never offer.
- Writing implementation code or running build/test commands → STOP. Brainstorming does not produce code; that's the destination skills' job.
- Forcing a destination before convergence → STOP. Return to free brainstorming and let convergence happen via trigger phrase or natural soft cue.
- Skipping the visual-companion offer when visual content is coming → STOP. Print the offer as its own message before continuing.
- Offering the visual companion before a text-likely brainstorm has any visual need → STOP. Set `VISUAL_COMPANION = "deferred"` and continue text-only.
- Running the fold-back commit on a dirty working tree without preflight → STOP. Re-route through the dirty-tree handler (three-option picker) before any artifact mutation.
- Staging with `-A` or a directory glob during fold-back → STOP. The fold-back commit must be `git add -- "$ARTIFACT_PATH"` only.
- Printing the fold-back handoff prompt before the commit succeeds → STOP. Surface the commit error and let the user resolve it before the prompt is emitted.

**Recovery:**

1. Acknowledge the deviation in one line.
2. Return to the missed step in the Process flow.
3. Re-run the missed step correctly (e.g., defer or re-issue the visual-companion offer based on visual need; re-run the preflight `git status` check).
4. Continue.

## Progress Indicators (User-Facing)

These indicators apply only on Hard Activation (see `## Activation Contract`). On the Soft Exploratory Path or No Activation Path, no banner, no labels, no progress markers — the conversation looks like an ordinary advisory exchange.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ BRAINSTORM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print compact phase labels when they help the user track progress, e.g.:
  - `Activating brainstorm mode…`
  - `Asserting mode (blocked / allowed)…`
  - `Assessing visual need…`
  - `Detecting installed packs and active project…`
  - `Free brainstorming (Superpowers cadence)…`
  - `Watching for destination signals…`
  - `Satisfaction check…`
  - `Synthesizing payload + confirmation…`
  - `Handoff to destination…`

Do not use fixed `[N/9]` counters. The visual-companion offer is conditional, so the visible progress model must not imply that an offer always happens.

## Process

### Step 1: Activate

Apply the **Activation Contract**. The full Process flow (Steps 2-9) only runs on **Hard Activation**:

- `/oat-brainstorm` invoked.
- Explicit `brainstorm` verb with a topic/request: "let's brainstorm X", "brainstorm this", "can we brainstorm X?", "help me brainstorm X".
- The user accepted the soft offer ("If you want, I can switch into structured brainstorm mode for this.") emitted on a Soft Exploratory Path message after ≥2 consecutive exploratory turns.

When Hard Activation triggers, the user has not already named a destination skill or artifact type. Do not route those blank-slate brainstorms to `oat-idea-ideate` merely because they may later become an idea, backlog item, project, or document.

There are no preconditions to check at activation — pack detection and active-project detection happen at step 4, after visual-need assessment, so this skill works in any repo regardless of which OAT packs are installed.

**Soft Exploratory Path** (per Activation Contract): respond conversationally with brainstorm-quality structure (options, tradeoffs, open questions, no premature implementation, no destination guess). Do not print the banner, assert mode, run pack detection, or offer the visual companion. Track an exploratory-turn counter for the thread; on the 2nd+ consecutive exploratory turn with no concrete action requested, append the soft offer once: "If you want, I can switch into structured brainstorm mode for this." If the user accepts, transition to Hard Activation and re-enter Step 2.

**No Activation Path** (per Activation Contract): the discrimination check failed if the model entered this skill for an advisory / review / debug / PR / status / implementation / active-workflow question. Do not print the banner. Respond directly with brainstorm-quality reasoning if it helps, but no banner, no mode assertion, no offer.

### Step 2: Mode Banner

Print the phase banner exactly once:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ BRAINSTORM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Then assert brainstorm mode per the **Mode Assertion** section above. The agent should hold itself to the BLOCKED list for the remainder of the conversation and follow the Self-Correction Protocol if it slips.

### Step 3: Assess Visual Need and Optional Visual Companion Offer

Classify the opening brainstorm topic before running the Node preflight or printing any visual-companion offer. Node availability is necessary only if an offer will be made; it is not by itself a reason to interrupt the conversation.

**Visual-likely topics:** UI layout, mockup, wireframe, visual flow, flow chart, architecture diagram, spatial comparison, side-by-side option comparison, or any user request to draw, show, sketch, or compare something visually.

**Text-likely topics:** naming, scope, tradeoffs, requirements, process, policy, strategy, conceptual architecture without a diagram request, or general exploratory discussion.

- If the topic is **text-likely**: skip the visual-companion offer silently and proceed to step 4 with `VISUAL_COMPANION = "deferred"`. Do not mention the visual companion merely because it exists.
- If the topic is **visual-likely**: the offer step is **its own message**. Do **not** combine it with the mode banner, with a clarifying question, with a context summary, or with anything else. The message contains only the offer wording below and waits for the user's response before continuing.

**Resurface rule:** If `VISUAL_COMPANION = "deferred"` and the conversation later becomes visual-likely, pause before the visual-specific question and offer the visual companion as its own message at that point. Then follow the same preflight / accept / decline flow below.

**Pre-flight check:** confirm `node` is on PATH:

```bash
command -v node >/dev/null 2>&1 && echo "available" || echo "missing"
```

- If `node` is **missing**: skip the offer entirely. Do not print the offer message. Log a one-line note in the conversation that the visual companion is unavailable in this environment (a state `oat-doctor` can pick up later: "visual companion suppressed — node not on PATH"). Proceed with `VISUAL_COMPANION = "unavailable"`.
- If `node` is **available**: print the offer as its own message. Suggested wording (adapt freely; the constraint is "own message, no other content"):

  > "Some of what we're working on might be easier to explain if I can show it in a local web browser — mockups, diagrams, side-by-side comparisons. The visual companion is bundled with this skill (a small Node-based local server). Want me to start it? (Requires opening a `localhost` URL.)"

Wait for the user's response.

- **Accept** → start the visual companion via `${SKILL_DIR}/scripts/start-server.sh` and read `${SKILL_DIR}/references/visual-companion.md` for the detailed usage guide before serving any content. Set `VISUAL_COMPANION = "active"`. Persistence paths follow the bundled `start-server.sh` resolution (repo-scope `.oat/brainstorm/<session>/`, user-scope `~/.oat/brainstorm/<session>/`, or `--project-dir <path>` override).

  **Resolving `${SKILL_DIR}`:** the brainstorm pack defaults to user scope, so a fresh install puts the bundled scripts under `~/.agents/skills/oat-brainstorm/`, not the current repo. Resolve the loaded skill directory before invoking any script. In order:
  1. If your provider exposes the loaded skill's resolved path (for example via a `${SKILL_DIR}` environment variable, `Skill` invocation context, or equivalent), use it directly.
  2. Otherwise, try the user-scope path first: `${HOME}/.agents/skills/oat-brainstorm/` (matches the pack default).
  3. Fall back to the project-scope path: `<repo-root>/.agents/skills/oat-brainstorm/` (set when the pack is explicitly installed at project scope).

  Probe each candidate for the presence of `scripts/start-server.sh` before invoking it. Treat the first match as `${SKILL_DIR}`.

- **Decline** → set `VISUAL_COMPANION = "declined"`. Continue text-only.

The `active`, `declined`, and `unavailable` decisions apply for the rest of the session. The `deferred` state is temporary and may resurface once if the conversation later becomes visual-likely. **Per-question routing** still happens at step 5 — even when accepted, each individual question chooses browser-vs-terminal on its own merits.

### Step 4: Pack and Active-Project Detection

Run pack-detection and active-project resolution **once** per session, before the conversation starts. Mirrors the convention used by `oat-project-document`.

```bash
IDEAS_INSTALLED=$(oat config get tools.ideas 2>/dev/null || echo "false")
PJM_INSTALLED=$(oat config get tools.project-management 2>/dev/null || echo "false")
WORKFLOWS_INSTALLED=$(oat config get tools.workflows 2>/dev/null || echo "false")
ACTIVE_PROJECT=$(oat config get activeProject 2>/dev/null || echo "")

ACTIVE_PROJECT_VALID="false"
ACTIVE_PROJECT_MODE=""
ACTIVE_PROJECT_PHASE=""
ACTIVE_PROJECT_PR_STATUS=""

if [ -n "$ACTIVE_PROJECT" ] && [ -f "$ACTIVE_PROJECT/state.md" ]; then
  ACTIVE_PROJECT_VALID="true"
  # Read state.md frontmatter — extract:
  #   oat_workflow_mode → ACTIVE_PROJECT_MODE        (e.g., "spec-driven", "quick")
  #   oat_phase         → ACTIVE_PROJECT_PHASE       (e.g., "discovery", "design", "plan", "implement")
  #   oat_pr_status     → ACTIVE_PROJECT_PR_STATUS   (e.g., "none", "open", "closed")
fi
```

Capture the resolved values; the skill consults them at step 9 (destination handoff). Do not surface the active-project router yet — it fires at convergence (step 6/9), after the user has actually been heard out, not at activation.

If `ACTIVE_PROJECT` is set but `state.md` is missing or unreadable, treat the active-project router as inactive (per design's Error Handling: "Active project resolution conflicts"). Print a single warning line and continue with the standard pack-filtered terminal-state picker. The brainstorm is not blocked.

### Step 5: Free Brainstorming (Superpowers Cadence)

Run the conversation in the Superpowers cadence. The hard rules:

- **One question at a time.** Never bundle multiple questions in a single message. If a topic needs more exploration, break it across multiple turns.
- **Prefer multiple-choice over open-ended** when possible — easier to answer, faster to converge. Open-ended is fine when the question genuinely needs free-form thought (motivation, vision, "what does X mean to you here").
- **Propose 2-3 distinct approaches with a recommendation** when an architectural / design choice surfaces. Lead with your recommended option and explain the why; the alternatives exist so the user can push back deliberately.
- **YAGNI ruthlessly.** When the user adds scope, ask whether it earns its place; do not pad the conversation with hypothetical features.
- **Be flexible.** If the user contradicts an earlier answer or pivots, follow them — the goal is the destination payload, not consistency for its own sake.

Build the synthesized payload in memory as the conversation progresses. The payload schema (see Synthesis at step 8) covers `title`, `summary`, `motivation`, `vision`, `approachesConsidered[]`, `chosenDirection`, `openQuestions[]`, `nextSteps[]`, and `transcriptSessionNote`. Update fields as user answers land; don't ask for fields that have already been covered.

**Per-question visual-companion routing.** Even when the visual companion is `active`, decide _per question_ whether to use the browser or the terminal. The test: would the user understand this better by seeing it than reading it?

- **Browser** for content that IS visual: mockups, wireframes, layout comparisons, architecture diagrams, side-by-side visual designs. Push an HTML fragment to `screen_dir` (per `references/visual-companion.md`); read interactions back from `state_dir/events` on the next turn.
- **Terminal** for content that is text: requirements questions, conceptual choices, tradeoff lists, A/B/C/D text options, scope decisions.

A question about a UI topic is not automatically a visual question. "What does 'personality' mean for this widget?" is conceptual — terminal. "Which of these two layouts works better?" is visual — browser.

If the visual companion is `declined` or `unavailable`, route everything to the terminal. If it is `deferred`, continue in the terminal until the resurface rule from step 3 applies. The conversation does not stall on missing visuals — describe in prose, sketch in ASCII if it helps, move on.

Stay in this step until either a destination trigger phrase fires (step 6) or a soft convergence cue appears (also step 6).

### Step 6: Destination Identification

Two convergence paths land here. Watch for both during step 5; the conversation does not need to fully exhaust before convergence — opportunistic surfacing is the whole point.

**Path A — trigger phrase fires.** During step 5, on every user message, match the message text against the trigger phrases catalogued in `references/destinations.md`. The matching rules:

- **Loose substring + paraphrase tolerance.** Case-insensitive. "let's track this as a backlog item", "track it", "make a ticket out of this", and "log this as a bl-item" all hit the scoped-backlog-item destination, even though the literal phrasing differs from the playbook examples.
- **Not regex.** Don't try to over-fit; the playbook phrases are concrete signals, not patterns to compile.
- **Multiple matches → ask before committing.** If a user message could plausibly map to two destinations (e.g., "save this somewhere" — doc-to-path or active-project reference file?), surface the ambiguity in a single confirmation question: "Sounds like you want to write this to a file — to a path you specify, or as a brainstorming reference under the active project?". Pick whichever the user names; do not silently choose.
- **Single confident match → surface immediately.** "Sounds like you want to track this as a backlog item — confirm?" Then go to step 7 (satisfaction check) without forcing the user to commit yet.

**Path B — soft convergence cue.** No trigger phrase fired, but the conversation has hit a natural stopping point. Cues to watch for:

- User explicitly says "I'm done", "let's wrap", "I think that covers it", "OK that's enough".
- Sustained absence of new questions from the user — they're answering, but not adding new directions.
- User repeats points already made.
- User asks "so what now?" or "where does this go from here?".

On a soft convergence cue, prompt:

> "I think we've covered the ground here — want to wrap up, or keep going?"

If "keep going", return to step 5. If "wrap up", surface the **pack-filtered terminal-state picker**:

1. Load `references/destinations.md` and assemble the candidate destinations.
2. Filter by pack:
   - Always-available: `Inline only`, `Doc-to-path`.
   - Gated by `IDEAS_INSTALLED == "true"`: `Capture as new idea`, `Extend existing idea`, `Summarize idea directly`.
   - Gated by `PJM_INSTALLED == "true"`: `Scoped backlog item`.
   - Gated by `WORKFLOWS_INSTALLED == "true"` AND `ACTIVE_PROJECT_VALID != "true"`: `Promote to new OAT project`.
   - Gated by `WORKFLOWS_INSTALLED == "true"` AND `ACTIVE_PROJECT_VALID == "true"`: `Active project: fold-back` and `Active project: brainstorming reference file`. When this branch fires, present the **3-way active-project router first** (see step 9 active-project branches) — its outcome controls whether the rest of the picker is even surfaced.
3. Evaluate whether the accumulated brainstorm scope is large enough to offer a split destination. Track the same four split signals used by discovery and evaluate them through the installed CLI:

   ```bash
   oat project split evaluate-signals --fired "<comma-list>"
   ```

   Use the local-development fallback only when the installed `oat` command is unavailable:

   ```bash
   pnpm run cli -- project split evaluate-signals --fired "<comma-list>"
   ```

   If the JSON result has `triggered: true`, add `Promote to N projects` to the picker. Below 2 split signals, do not show this option.

4. Present the filtered list to the user. Wait for selection.

Once a destination is identified (either path), proceed to step 7.

### Step 7: Satisfaction Check

Whichever path triggered convergence, ask the user one question — no exceptions:

> "Feel good about where we landed, or want to keep brainstorming and add more detail?"

- **Keep going** → return to step 5 with the destination noted in working memory. While back in step 5, the skill may **proactively probe for required template fields** the destination needs but the conversation hasn't yet covered (per `references/destinations.md` per-destination "If user wants to keep brainstorming after this is offered" rules — e.g., probe for `motivation` and `vision` if a "capture as new idea" destination has been surfaced but the conversation has been thin on those). Do not re-run pack detection. Only resurface the visual-companion offer if it was deferred and the conversation has become visual-likely.
- **Wrap up** → continue to step 8 (synthesis).

This step is the user's brake: convergence does not commit them to anything until they explicitly say "wrap up". A trigger phrase is not a contract; it's an opportunistic signal.

### Step 8: Synthesis with Confirmation

Build the canonical synthesized payload from the conversation. Schema (per design Data Models — `SynthesizedPayload`):

```ts
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

The payload is staged in memory only — it is not persisted between conversation turns. If the conversation ends abruptly, the only record is whatever the destination handoff writes (see step 9).

**Confirmation pattern.** Consult `references/destinations.md` for the destination's confirmation pattern:

- **`full`** (currently only `Scoped backlog item`): present the proposed payload **field-by-field** using the example wording from the destination stanza in the playbook. The user confirms or revises each field before any write happens. The exact wording for the scoped-backlog-item case is:

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

  If the user requests changes, apply them to the in-memory payload and re-display the affected fields before continuing.

- **`minimal`** (most destinations): confirm only the slug / path / which artifact / which idea / filename, depending on the destination. Examples:
  - Capture as new idea → confirm slug.
  - Extend existing idea → confirm which idea (slug or path).
  - Doc-to-path → confirm path.
  - Promote to new project → confirm slug + workflow mode (`quick` vs `spec-driven`, with skill proposing a default based on the chosen direction and scope signals).
  - Active-project fold-back → confirm which artifact (`design.md` if exists, else `discovery.md`; user signal can override toward `discovery.md` for foundational changes).
  - Active-project reference file → confirm filename (default `YYYY-MM-DD-<topic>.md`).

- **`none`** (currently `Inline only` and `Summarize idea directly`): no per-field confirmation at this layer. For `Inline only`, write the closing summary directly. For `Summarize idea directly`, hand off — the downstream `oat-idea-summarize` surfaces its own summary for accept/refine review.

After confirmation succeeds, proceed to step 9 (handoff).

### Step 9: Handoff

Branch on the destination. Each branch executes its handoff inline using the confirmed payload. The non-fold-back destinations are listed first; the active-project router and fold-back commit safety contract are detailed at the end of this step.

#### 9a — Inline only

Print a one-paragraph closing summary capturing chosen direction (or "no direction selected"), key decisions, and any open questions. End mode assertion. No artifact is written.

#### 9b — Doc-to-path

The user-supplied path was confirmed at step 8. Validate it before any write (per design Error Handling: "Path validation failures (doc-to-path)"):

1. **Path is a directory** → ask the user for a filename, do not write.
2. **Parent directory missing** → offer to create it. **If outside the current repo, require explicit confirmation** before creating any directory tree (e.g., "That path is outside the current repo at `<resolved-path>`. Create the parent directories there? (y/n)").
3. **File already exists** → ask whether to overwrite or pick a different filename. Do not silently overwrite.
4. **Path is unwritable** (permission denied, read-only filesystem, etc.) → surface the OS error verbatim and ask for an alternative path.

When validation passes, render `${SKILL_DIR}/templates/brainstorm-doc.md` (resolve `${SKILL_DIR}` per the rule in step 3) with the synthesized payload values (title, summary, motivation, vision, approachesConsidered, chosenDirection, openQuestions, nextSteps, transcriptSessionNote) and write the file. Report the absolute path written. End mode assertion.

#### 9c — Capture as new idea

Read `.agents/skills/oat-idea-new/SKILL.md` and execute its **Steps 3 through 7** inline using the confirmed slug as the idea name:

- Step 3: initialize ideas directory (`mkdir -p` for the idea root, copy `ideas-backlog.md` and `ideas-scratchpad.md` from templates if missing).
- Step 4: scaffold `discovery.md` from the `idea-discovery.md` template.
- Step 5: update `{IDEAS_ROOT}/backlog.md` with the new entry under **Active Brainstorming**.
- Step 6: check the scratchpad for a matching unchecked entry; check it off and append `→ started (...)` if found.
- Step 7: set `oat config set activeIdea "{IDEAS_ROOT}/{idea-name}"`.

Then **seed the scaffolded `discovery.md`** with the synthesized payload — fill the canonical idea-discovery sections from the payload:

- "What's the Idea?" → `summary`
- "Why Is It Interesting?" → `motivation`
- "What Would It Look Like?" → `vision`
- "Notes & Discussion" → first session entry containing `transcriptSessionNote` (and `chosenDirection` / `openQuestions` if surfaced)

After the seed write, offer the user two options:

- **Chain into ideation** → read `.agents/skills/oat-idea-ideate/SKILL.md` and continue from its Step 4 (Start New Session).
- **Stop here** → end mode assertion; report the idea path.

Do not invoke `oat-idea-ideate` automatically. The handoff is offered, not forced.

#### 9d — Extend existing idea

The "which idea" was confirmed at step 8. Read `.agents/skills/oat-idea-ideate/SKILL.md` and **jump directly to its Step 4 (Start New Session)** with the resolved idea path. Append `transcriptSessionNote` from the payload as the new session's body. Include `chosenDirection`, `openQuestions`, and `nextSteps` in the session entry if they surfaced during convergence (they often do when the user wants the new session to record decisions, not just notes).

End mode assertion when ideation hands control back.

#### 9e — Summarize idea directly

Two-step inline execution, run silently from the user's point of view:

1. **Capture as new idea silently** — execute branch 9c above (Steps 3-7 of `oat-idea-new` plus seed). Do not surface progress detail; this is plumbing for the summary that's coming next.
2. **Summarize end-to-end** — read `.agents/skills/oat-idea-summarize/SKILL.md` and run its full process. The downstream skill surfaces its own summary for accept/refine review — that is the user's gate.

End mode assertion when `oat-idea-summarize` hands control back.

#### 9f — Scoped backlog item

Read `.agents/skills/oat-pjm-add-backlog-item/SKILL.md` and execute its process **from Step 1**. Pre-fill its early-prompt answers from the confirmed payload:

- `Title` → payload field-by-field title (already user-confirmed at step 8).
- `Description / context` → user-confirmed description.
- `Acceptance criteria` → user-confirmed bullet list.
- `Scope` → user-confirmed sizing (xs / s / m / l / xl).
- `Priority` → user-confirmed priority (p0 / p1 / p2 / p3).
- Optional fields (related items, target release, owner) → only if surfaced during synthesis.

The downstream `oat-pjm-add-backlog-item` owns ID generation, file writing under `.oat/repo/reference/backlog/items/`, and backlog-index regeneration. Do not duplicate that logic here.

End mode assertion when the backlog-add hands control back.

#### 9g — Promote to new OAT project

The slug and workflow mode (`quick` vs `spec-driven`) were confirmed at step 8. Run:

```bash
oat project new <slug> --mode <mode>
```

This scaffolds the project directory under `.oat/projects/<scope>/<slug>/` with the standard core files (state.md, discovery.md, etc.).

Then **write a field-filled `discovery.md`** at `<project>/discovery.md` using the synthesized payload:

- Initial Request → payload `summary` (and `motivation` if it adds context).
- Solution Space → render `approachesConsidered[]` (each approach as a sub-section with description + tradeoffs; flag the recommended one).
- Chosen Direction → payload `chosenDirection.approachName` + `chosenDirection.rationale`. If `chosenDirection` is null, write "No direction selected during brainstorming — discovery phase will choose during approach reaffirmation."
- Key Decisions → extract from `transcriptSessionNote` and any explicit decisions surfaced in the conversation.
- Open Questions → payload `openQuestions[]`.

**Do NOT write `design.md`.** Project promotion is `discovery.md`-only. Rationale: a half-populated `design.md` constrains the design phase to a shape the user hasn't deliberately chosen and short-circuits `oat-project-design`'s collaborative cadence. Architectural intent surfaced during brainstorming lands in discovery's `Solution Space` / `Chosen Direction` / `Key Decisions` — exactly where the design phase will read it.

Mark the discovery frontmatter:

- `oat_status: complete`
- `oat_ready_for: oat-project-quick-start` (when mode is `quick`) or `oat-project-design` (when mode is `spec-driven`)

Update the project's `state.md` (phase=discovery, status=complete) so the project is recognized as ready for the next phase.

Print a pointer to the next skill, e.g.:

> "Project `<slug>` scaffolded with seeded discovery. Run `<oat-project-quick-start | oat-project-design>` when you're ready to continue."

**Stop here. Do NOT inline-execute the next phase.** The deliberate transition is the point — the user runs the next skill at their own pace.

End mode assertion.

#### 9h — Active-project router (3-way picker)

This branch fires **only when** `WORKFLOWS_INSTALLED == "true"` AND `ACTIVE_PROJECT_VALID == "true"` (both resolved at step 4). It runs **before** the standard pack-filtered terminal-state picker — its outcome controls whether that picker even surfaces.

Ask one question:

> "Is this brainstorm related to the active project at `<ACTIVE_PROJECT>`?"

Three answers, three branches:

1. **Related** → fold-back. Proceed to branch 9i below.
2. **Independent** → the active project is acknowledged but ignored from this point. Route through the **standard pack-filtered terminal-state picker** as if no active project existed. The picker still includes `Promote to new OAT project` even though there is an active project — independence means the active project doesn't constrain the destination.
3. **Related but supplementary** → brainstorming reference file. Proceed to branch 9j below.

The 3-way router fires once per session. After convergence resumes (e.g., the user answered "keep going" at step 7 and another convergence later fires), re-evaluate — the user's understanding of the relationship may have shifted.

#### 9i — Active project: fold-back to upstream artifact

Uniform across spec-driven and quick modes. Differs only in which plan-authoring skill the handoff prompt addresses (resolved by `ACTIVE_PROJECT_MODE` and `ACTIVE_PROJECT_PR_STATUS`).

**Step 1 — Pick upstream artifact.** Prefer the most-specific existing one:

- `<ACTIVE_PROJECT>/design.md` if it exists (any mode — quick lightweight design counts).
- Otherwise `<ACTIVE_PROJECT>/discovery.md`.
- The user's signal during the conversation can override toward `discovery.md` even when `design.md` exists ("this is foundational" → discovery; "this is a design refinement" → design).

Confirm the chosen artifact with the user (minimal confirmation per `references/destinations.md`). Set `ARTIFACT_PATH` to the absolute path.

**Step 2 — Preflight `git status` check.** Run **before** any artifact mutation, scoped to the chosen artifact only:

```bash
git status --porcelain -- "$ARTIFACT_PATH"
```

The check happens before any append, so the skill can route around the dirty case without having half-written the synthesis.

**Step 3 — If the artifact is clean** (no entry in the porcelain output): this is the happy path.

1. Append the synthesis as a clearly-marked section to `ARTIFACT_PATH`:

   ```
   ## Brainstorming Update: YYYY-MM-DD — <topic>
   ```

   Section body contains: `chosenDirection` (with rationale), key decisions (extracted from the conversation), and a transcript appendix (`transcriptSessionNote`). Optionally include `openQuestions` and `nextSteps` if surfaced.

2. Stage **only** the artifact:

   ```bash
   git add -- "$ARTIFACT_PATH"
   ```

   Use the explicit `--` filename form. **Never `git add -A`. Never directory globs.** Other working-tree paths are not touched by this commit.

3. Commit with the canonical message:

   ```bash
   git commit -m "chore(oat): integrate brainstorm into <artifact-basename> for <project-name>"
   ```

   `<artifact-basename>` is `design.md` or `discovery.md` depending on which was chosen. `<project-name>` is the active project's slug.

4. If `git commit` succeeded → proceed to step 5 (handoff prompt).

**Step 4 — If the artifact is dirty** (any entry in the porcelain output): pause the fold-back, present the user with three options before any artifact mutation occurs:

- **Option A — Commit current artifact changes first** (recommended when prior changes are unrelated to the brainstorm). Skill commits the existing artifact state with a separate, user-described commit message (ask the user for a one-line subject), then proceeds with fold-back as a new scoped commit on top.
- **Option B — Include current changes in the fold-back commit.** Skill warns explicitly: "The fold-back commit will mix prior unrelated edits with the brainstorm synthesis. The handoff prompt's commit hash will reference both. Confirm?" If user accepts, append synthesis, then `git add -- "$ARTIFACT_PATH"`, then commit with an adjusted message acknowledging the mix (e.g., `chore(oat): integrate brainstorm + prior edits into <artifact> for <project-name>`).
- **Option C — Abort fold-back; capture as reference file instead.** Switch the destination to **branch 9j** (active-project brainstorming reference file). Upstream artifact is left untouched.

After the user picks A or B and the resulting commit succeeds, proceed to step 5. After option C, jump to branch 9j.

**Step 5 — Handoff prompt.** Print **only after the scoped commit succeeds.** If `git commit` failed (pre-commit hooks rejected, signing failed, anything else), surface the error verbatim and **do NOT print the handoff prompt** — the prompt references a commit hash, and a missing commit makes the prompt actively misleading. The user resolves the failure (or re-routes via option C above) before fold-back can complete.

Resolve the handoff target by `ACTIVE_PROJECT_MODE` and `ACTIVE_PROJECT_PR_STATUS`:

| Mode        | PR status                    | Handoff target            |
| ----------- | ---------------------------- | ------------------------- |
| spec-driven | none / closed                | `oat-project-plan`        |
| quick       | none / closed                | `oat-project-quick-start` |
| either      | open (`oat_pr_status: open`) | `oat-project-revise`      |

Print the handoff prompt template, substituting `<skill-name>`, `<artifact>`, `<hash>`, and `<subject>` from the actual commit:

```
Run `<skill-name>` with this context:

"A brainstorming session surfaced changes that needed to be folded
into <artifact>. I've committed the update (commit <hash>: <subject>).
Integrate the new content into the existing plan as new tasks (or a
new phase if substantial). Don't refresh the existing plan — preserve
review tables and any in-progress task state."
```

After printing the prompt, **stop**. End mode assertion. The user runs the plan-authoring skill at their own pace. The brainstorming skill never auto-chains into plan authoring — the deliberate transition is the point.

#### 9j — Active project: brainstorming reference file

Available regardless of project phase or PR status. The reference file is a **durable tracked artifact** — after writing it, the skill commits it on the active branch so the working tree is clean when the skill exits and the reference travels with the project.

The filename was confirmed at step 8 (default `YYYY-MM-DD-<topic>.md`). Resolve the target path:

```
<ACTIVE_PROJECT>/brainstorming/YYYY-MM-DD-<topic>.md
```

If `<ACTIVE_PROJECT>/brainstorming/` does not exist, create it (`mkdir -p`). The `brainstorming/` subdirectory is parallel to existing `pr/` and `reviews/` subdirectories — explicit purpose, naturally discoverable.

Render `${SKILL_DIR}/templates/brainstorm-doc.md` (resolve `${SKILL_DIR}` per the rule in step 3) with the synthesized payload (same shape as the doc-to-path destination) and write to the resolved path.

After writing, commit the file with scoped staging (mirror the discipline of the active-project fold-back commit safety contract):

```bash
git add -- "<active-project-relative-path>"
git commit -m "chore(oat): capture brainstorming reference for <project-name>"
```

Use only `git add -- <path>` so unrelated working-tree changes are not swept into the commit. After the commit succeeds, capture the short hash via `git rev-parse --short HEAD` and report it alongside the absolute path written (for example: "Wrote `<absolute-path>` and committed as `<hash>`."). End mode assertion.

#### 9k — Promote to N projects

This branch is available only when the step 6 picker added `Promote to N projects` after `oat project split evaluate-signals` returned `triggered: true`.

Confirm the parent/umbrella slug and the inferred child list at step 8 using the minimal confirmation pattern. If the child list is still unclear, ask one boundary question and return briefly to step 5 to decompose the scope.

When confirmed, invoke `oat-project-split` with a `SplitPayload` using `origin: "brainstorm-picker"`, `interactive: true`, `inferredChildren`, the parent/umbrella slug when known, and the brainstorm session note as inherited parent context. The brainstorm hook does not create project directories itself; `oat-project-split` owns normalization, `SplitPlanDocument` validation, coordination-parent writing, child seeding, activation, and dashboard refresh.

End mode assertion when the split handoff completes or reports its own blocker.

## Success Criteria

- ✅ Activation Contract is honored: Hard Activation fires only on explicit brainstorm-verb phrasing or `/oat-brainstorm`; Soft Exploratory Path messages ("help me think through", "I've been thinking about", "what if we") respond conversationally without the banner and offer mode only after ≥2 sustained exploratory turns; No Activation Path messages (advisory / review / debug / PR / status / implementation / active-workflow) get a direct response with no banner and no offer.
- ✅ Phase banner `OAT ▸ BRAINSTORM` is printed exactly once at activation; mode assertion follows immediately.
- ✅ Visual-companion offer is conditional on visual need, not Node availability alone. Text-likely brainstorms set `VISUAL_COMPANION = "deferred"` and continue without mentioning the companion.
- ✅ When a visual-companion offer is made, it is its own message with no other content. The offer is suppressed entirely (no message printed) when `node` is not on PATH.
- ✅ Pack and active-project detection (`oat config get tools.<pack>` and `oat config get activeProject`) runs once per session at step 4, before the conversation starts.
- ✅ Conversation cadence holds the Superpowers contract: one question at a time, multiple-choice preferred, 2-3 distinct approaches with a recommendation, per-question visual-companion routing.
- ✅ Destination is identified via either trigger-phrase opportunistic surfacing (loose substring + paraphrase tolerance, not regex; ambiguity → ask) or convergence cue (pack-filtered terminal-state picker).
- ✅ The terminal-state picker conditionally includes `Promote to N projects` only when `oat project split evaluate-signals` reports `triggered: true`; small-scope convergence keeps the option hidden.
- ✅ Synthesis payload is built per the design Data Models `SynthesizedPayload` schema: `title`, `summary`, `motivation`, `vision`, `approachesConsidered[]`, `chosenDirection`, `openQuestions[]`, `nextSteps[]`, `transcriptSessionNote`.
- ✅ Confirmation pattern matches `references/destinations.md`: `full` for scoped backlog item (field-by-field with example wording), `minimal` for slug/path/artifact destinations, `none` for inline-only and summarize-idea-directly.
- ✅ Each handoff branch (9a-9k) reads the correct downstream `SKILL.md` path and enters at the documented step. Project promotion writes `discovery.md` only — never `design.md` — and does not auto-chain into the next phase.
- ✅ Doc-to-path validation handles all four cases: path-is-directory, parent-missing (with explicit out-of-repo confirmation), file-already-exists (overwrite or rename), unwritable (surface OS error).
- ✅ Fold-back commit safety contract honored: preflight `git status --porcelain -- "$ARTIFACT_PATH"` runs before any artifact mutation; clean → append + `git add -- "$ARTIFACT_PATH"` (explicit `--`, never `-A`, never globs) + scoped commit; dirty → three-option picker (commit-prior-first / mix / abort-to-reference-file); handoff prompt prints only after `git commit` succeeds.
- ✅ Handoff target for fold-back resolves correctly per `oat_workflow_mode` + `oat_pr_status`: `oat-project-plan` (spec-driven, no/closed PR) / `oat-project-quick-start` (quick, no/closed PR) / `oat-project-revise` (either mode, open PR).
- ✅ Active-project 3-way router (related / independent / supplementary) fires before the standard pack-filtered picker when both `WORKFLOWS_INSTALLED == "true"` and `ACTIVE_PROJECT_VALID == "true"`.
- ✅ Skill validates cleanly under `pnpm oat:validate-skills` (frontmatter contract, allowed-tools, mode-assertion structure).
