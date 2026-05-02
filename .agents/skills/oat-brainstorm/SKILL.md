---
name: oat-brainstorm
version: 1.0.0
description: Use when starting any project-independent brainstorming or exploratory conversation — phrasing like "I've been thinking about", "what if we did", "how should we approach", or thinking-out-loud about an idea / feature / change without a chosen destination. Do NOT use for routine implementation requests or work where the user has already named a destination skill (idea, backlog, project, doc). Routes to inline / doc / idea / backlog / project / active-project handoffs by installed pack.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Brainstorm

Project-independent brainstorming dispatcher. Owns the always-on activation, the Superpowers-style conversational cadence, the visual-companion offer, the destination identification, and the per-destination handoff to existing OAT skills.

## Mode Assertion

**OAT MODE: Brainstorm**

**Purpose:** Run a structured exploratory conversation that does not commit the user to an idea, backlog item, or project artifact up front. Identify the destination at the end (or opportunistically on a clear trigger phrase) and hand off to the right downstream skill — or stay inline / write a doc when no other artifact is wanted.

**BLOCKED Activities:**

- No implementation code, no scaffolding, no actual feature changes.
- No formal requirements / specs / architectural designs (the design phase belongs to `oat-project-design`, not here).
- No auto-routing to a destination before convergence — the destination is identified at the end of the conversation, not the beginning. Opportunistic surfacing on a clear trigger phrase is allowed; pre-emptively forcing a destination is not.
- No skipping the visual-companion offer when the conversation is going to involve visual content.
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

- Writing implementation code or running build/test commands → STOP. Brainstorming does not produce code; that's the destination skills' job.
- Forcing a destination before convergence → STOP. Return to free brainstorming and let convergence happen via trigger phrase or natural soft cue.
- Skipping the visual-companion offer when visual content is coming → STOP. Print the offer as its own message before continuing.
- Running the fold-back commit on a dirty working tree without preflight → STOP. Re-route through the dirty-tree handler (three-option picker) before any artifact mutation.
- Staging with `-A` or a directory glob during fold-back → STOP. The fold-back commit must be `git add -- "$ARTIFACT_PATH"` only.
- Printing the fold-back handoff prompt before the commit succeeds → STOP. Surface the commit error and let the user resolve it before the prompt is emitted.

**Recovery:**

1. Acknowledge the deviation in one line.
2. Return to the missed step in the Process flow.
3. Re-run the missed step correctly (e.g., re-issue the visual-companion offer as its own message; re-run the preflight `git status` check).
4. Continue.

## Progress Indicators (User-Facing)

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ BRAINSTORM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print step indicators, e.g.:
  - `[1/9] Activating brainstorm mode…`
  - `[2/9] Asserting mode (blocked / allowed)…`
  - `[3/9] Offering the visual companion…`
  - `[4/9] Detecting installed packs and active project…`
  - `[5/9] Free brainstorming (Superpowers cadence)…`
  - `[6/9] Watching for destination signals…`
  - `[7/9] Satisfaction check…`
  - `[8/9] Synthesizing payload + confirmation…`
  - `[9/9] Handoff to destination…`

The 9-step counter mirrors the Process section below. Subsequent passes through step 5 after a "keep going" answer at step 7 do not re-print the counter.

## Process

_Filled in p03-t02 through p03-t06._

## Success Criteria

_Filled in p03-t07._
