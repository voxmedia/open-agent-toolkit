---
name: oat-docs-bootstrap
version: 1.0.0
description: Use when bootstrapping a new OAT docs app in a repo. Guides the user through preflight detection, richer input gathering than the raw CLI, `oat docs init` invocation with labeled post-patches for open CLI gaps, build verification, post-scaffold config inspection, and an educational walkthrough. Supports Fumadocs (full path) and MkDocs (lean path with defined minimum contract).
argument-hint: '<optional-target-dir>'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

# Docs Bootstrap

Bootstrap a docs app in this repo and guide the user through understanding how it works. Wraps `oat docs init` with preflight detection, richer input gathering, labeled post-patches for open CLI gaps (FP-11 Turbopack root, FP-12 site-title coherence, FP-13 template content, FP-15 docs-app AGENTS.md), build verification, post-scaffold config inspection, and an educational walkthrough covering the `index.md` + `## Contents` navigation contract, scaffolded agent-instruction surfaces, and the OAT docs ecosystem (`oat-project-document`, `oat docs analyze`, `oat docs apply`).

## Prerequisites

- A repository initialized for OAT (`.oat/config.json` readable, `.agents/` present).
- The OAT CLI is runnable (either as a workspace binary via `pnpm run cli --` or an installed `oat` binary on PATH).
- A feature request or intent: "add docs to this repo" or equivalent.

## Mode Assertion

**OAT MODE: Docs Bootstrap**

**Purpose:** Turn `oat docs init` scaffolding into a support-rich onboarding experience — preflight, inputs, CLI invocation with labeled post-patches, build verification, config inspection, educational walkthrough, and optional content kickoff. Two framework paths: Fumadocs (full) and MkDocs (lean with defined minimum contract).

**BLOCKED Activities:**

- No reimplementing CLI scaffold logic (the CLI remains the source of truth for template rendering, version resolution, and configuration writes)
- No fabricating files the CLI does not create, with one documented exception: the FP-15 bridge AGENTS.md, which is written only when the CLI has not scaffolded one and whose content is migrated upstream when the CLI fix lands
- No expanding scope into content authoring (that's `oat docs analyze` / `oat docs apply` / `oat-project-document`)
- No silent failures — every error has a surfaced remediation

**ALLOWED Activities:**

- Inspecting repo state read-only before any mutation
- Prompting the user for richer inputs than the CLI asks for (notably a site name separate from the package/app name)
- Invoking `oat docs init` non-interactively with collected flags
- Applying labeled, idempotent post-patches for open CLI gaps (FP-11/FP-12/FP-13/FP-15) only when capability detection shows the CLI has not addressed them
- Running install + build and classifying failures against known patterns
- Reading `.oat/config.json` back to verify paths and prompting for `requireForProjectCompletion`
- Narrating the scaffolded output as a chunked educational walkthrough
- Delegating optional initial content population to `oat-docs-analyze` + `oat-docs-apply`

**Self-Correction Protocol:**
If you catch yourself:

- Writing scaffold-template content directly instead of calling the CLI → STOP (the CLI owns templates; you own the surrounding experience)
- Narrating AGENTS.md content word-for-word in the Walkthrough → STOP (the Walkthrough points at AGENTS.md; it does not read it aloud)
- Expanding into full content generation → STOP (delegate to analyze/apply)
- Applying a post-patch without running capability detection first → STOP (patches must be gated on deterministic probes and file-shape checks)

**Recovery:**

1. Acknowledge the deviation
2. Return to the current Step
3. Document any deviation in the final Walkthrough summary so the user knows what happened

## Progress Indicators (User-Facing)

Provide lightweight progress feedback so the user can tell what's happening at each boundary.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ DOCS BOOTSTRAP
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before each major component, print a compact step indicator:
  - `[1/7] Preflight…`
  - `[2/7] Gathering inputs…`
  - `[3/7] Scaffolding…`
  - `[4/7] Verifying build…`
  - `[5/7] Inspecting config…`
  - `[6/7] Walkthrough…`
  - `[7/7] Optional content kickoff…`

- For long-running operations (install, build, analyze/apply delegation), print a start line and a completion line; optional duration.
- Keep it concise; don't print a line for every shell command.

## Process

### Step 0: Resolve Active Project and Environment

(Body authored in p02-t01.)

### Step 1: Preflight Detector

(Body authored in p02-t01.)

### Step 2: Input Gatherer

(Body authored in p02-t02; Conflict Resolution Contract authored in p02-t03.)

### Step 3: Scaffold Runner

(Body authored in p03-t01; Capability Detection in p03-t02; site-identity patches in p03-t03; scaffold-integrity patches in p03-t04.)

### Step 4: Build Verifier

(Body authored in p04-t01.)

### Step 5: Post-Scaffold Inspector

(Body authored in p04-t02.)

### Step 6: Educational Walkthrough

(Body authored in p05-t01 (Sections A–D) and p05-t02 (Sections E–G).)

### Step 7: Optional Content Kickoff

(Body authored in p05-t03; Exit summary in the same task.)

## Success Criteria

(Expanded in p06-t01.)
