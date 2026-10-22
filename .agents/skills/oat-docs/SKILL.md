---
name: oat-docs
description: Use when a user asks questions about OAT workflows, CLI commands, skill authoring, configuration, or project lifecycle. Answers questions by reading locally-bundled OAT documentation.
argument-hint: '[question]'
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Glob, Grep, AskUserQuestion
metadata:
  version: 1.0.7
---

# OAT Docs

Interactive Q&A skill backed by locally-bundled OAT documentation at `~/.oat/docs/`. Answers questions about OAT workflows, CLI commands, skill authoring, configuration, and project lifecycle by reading the actual docs.

## Prerequisites

- OAT documentation bundled at `~/.oat/docs/` (installed via `oat init tools` with the core pack).

## Mode Assertion

**OAT MODE: Docs Q&A (Read-Only)**

**Purpose:** Answer user questions about OAT by reading and synthesizing local documentation. Offer to demonstrate or invoke related skills when appropriate.

**BLOCKED Activities:**

- No editing documentation files.
- No creating or modifying any files.
- No running CLI commands that modify state.
- No falling back to repository paths, general knowledge, or web searches for OAT docs content.

**ALLOWED Activities:**

- Reading documentation files under `~/.oat/docs/` to answer questions.
- Searching documentation with Glob and Grep within `~/.oat/docs/`.
- Offering to invoke related skills or run demonstration commands (with user confirmation).
- Asking clarifying questions to refine the user's query.

**Self-Correction Protocol:**
If you catch yourself:

- Editing docs content → STOP and return to read-only Q&A mode.
- Running mutating commands → STOP and offer the command as a suggestion instead.
- Reading docs from a repo path instead of `~/.oat/docs/` → STOP and use the bundled location only.

**Recovery:**

1. Return to read-only documentation lookup at `~/.oat/docs/`.
2. Present information and suggestions, not direct modifications.

## Progress Indicators (User-Facing)

Print a phase banner once at start:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ DOCS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step indicators:

- `[1/4] Resolving docs location…`
- `[2/4] Understanding your question…`
- `[3/4] Searching documentation…`
- `[4/4] Synthesizing answer…`

## Process

### Step 1: Resolve Docs Location

Set `DOCS_ROOT` to `~/.oat/docs/`.

Verify the directory exists and contains markdown files. If it does not exist, inform the user:

```
OAT documentation not found at ~/.oat/docs/.

To install the bundled docs, run:
  oat init tools

Select the "core" pack when prompted (or use: oat init tools core).
```

Stop here if docs are not found. Do NOT fall back to repository paths or other locations.

### Step 2: Understand the Question

Read the user's question from `$ARGUMENTS`. If no question was provided or the question is unclear, ask:

> "What would you like to know about OAT? I can help with workflows, CLI commands, skill authoring, configuration, project lifecycle, and more."

Read `DOCS_ROOT/index.md` and its `## Contents` section. Derive a temporary topic map from the installed labels, summaries, and link targets; do not assume OAT's repository layout or a fixed set of topic paths. Choose the entries that match the question and descend through their authored `index.md` Contents maps when needed. Resolve each link relative to its containing file and verify it exists before reading it.

If the installed index has no usable Contents or a linked target is missing, report that specific stale or incomplete installation. Search within `DOCS_ROOT` for the requested terms to find existing evidence, and recommend updating the installed docs when appropriate. Never invent a replacement path or fall back to the repository.

### Step 3: Search and Read Documentation

Based on the topic classification:

1. **Read the most relevant docs file(s)** — start with the primary match from the topic map derived in Step 2. All paths are relative to `DOCS_ROOT` (`~/.oat/docs/`).
2. **Search for specific terms** — if the question mentions specific concepts, commands, or features, use Grep to find mentions across `~/.oat/docs/`.
3. **Follow cross-references** — if the primary doc references other pages, read those for complete context.
4. **Check the index** — read the `index.md` of relevant directories to discover additional relevant pages.

Limit reads to the minimum needed to answer the question thoroughly. Prefer depth (reading a full relevant page) over breadth (skimming many pages).

### Step 4: Synthesize and Answer

Compose an answer that:

1. **Directly answers the question** — lead with the answer, not background context.
2. **Cites specific docs** — reference the doc file(s) where the user can read more, using relative paths from `~/.oat/docs/`.
3. **Includes practical examples** — show commands, config snippets, or SKILL.md excerpts when relevant.
4. **Stays grounded in docs** — only include information found in the actual documentation. Do not speculate or fill gaps with general knowledge.

### Step 5: Offer Next Actions (When Appropriate)

After answering, consider whether to offer related actions:

- **"Want me to show you?"** — if the question was about a workflow, offer to demonstrate the first step.
- **"Want me to set that up?"** — if the question was about configuration, offer to run the relevant `oat config set` command.
- **"Want me to create one?"** — if the question was about projects or ideas, offer to invoke the relevant creation skill.
- **"Want me to check your setup?"** — if the question reveals potential issues, offer to run `/oat-doctor`.

Frame these as suggestions, not automatic actions. Let the user decide.

**Example:**

```
Based on the docs, here's how OAT project workflows work: [answer]

Cite the installed workflow page discovered through Contents.

Would you like me to:
- Start a new project? (I'd invoke oat-project-lite for single-sitting work, oat-project-brief for one delivery planned as a Project Brief, oat-project-goal for an outcome delivered over several milestones, or oat-project-quick-start for a larger quick workflow)
- Check your current project status? (I'd read your active project's state.md)
```

## Examples

### Basic Q&A

**User:** `/oat-docs how do I create a new project?`

**Response:**

```
To create a new OAT project, you have three main approaches:

1. **Lite mode** (recommended for single-sitting changes):
   oat-project-lite <project-name> "project description"

2. **Quick mode** (recommended for larger bounded work):
   oat-project-quick-start <project-name> "project description"

3. **Spec-driven mode** (for complex features):
   oat-project-new <project-name>

Brief mode is a fourth option for one delivery whose design you can agree in
conversation:
   oat-project-brief <project-name> "project description"

Goal mode is a fifth option for an outcome delivered over several milestones:
   oat-project-goal <project-name> "project description"

Lite combines the interview and requirements contract in one plan for a
single sitting. Brief writes one reviewed Project Brief whose phases carry
intent and exit evidence instead of tasks; goal groups those phases into
milestones that are delivered and re-aligned in turn. Quick mode goes straight from
discovery to plan. Spec-driven mode adds formal spec and design phases. If you invoke quick mode with only a
project name, it should ask you for the missing project description
before discovery starts.

Both create a project directory under your projects root
(default: .oat/projects/shared/<project-name>/) with standard artifacts:
state.md, plan.md, and implementation.md; quick and spec-driven modes also use
discovery.md.

See: the actual installed workflow and getting-started pages found through Contents.

Would you like me to create a project for you?
```

### Exploratory Question

**User:** `/oat-docs what are tool packs?`

**Response:**

```
Tool packs are bundles of related OAT skills that you install together.
Describe the packs listed by the installed tool-pack documentation, for example:

- **core** — Diagnostics and docs skills (oat-doctor, oat-docs).
  Read the installed docs for scope and current membership.
- **workflows** — Project lifecycle skills (discover, plan, implement,
  review, PR).
- **ideas** — Brainstorming and idea capture skills.
- **utility** — Cross-cutting tools (docs analysis, code review,
  skill creation). 9 skills.

Install with: oat init tools
Manage with: oat tools list, oat tools update, oat tools outdated

See: the installed tool-pack page discovered through Contents.

Would you like me to check which packs you have installed? (I'd run /oat-doctor --summary)
```

## Success Criteria

- ✅ Questions are answered using actual documentation content from `~/.oat/docs/`, not general knowledge.
- ✅ Answers cite specific docs files for further reading.
- ✅ Practical examples (commands, config) are included when relevant.
- ✅ Next actions are offered when appropriate, but never executed without user confirmation.
- ✅ No files are modified — purely read-only Q&A.
- ✅ Graceful error when docs are not found at `~/.oat/docs/`, with instructions to install the core pack.
