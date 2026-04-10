---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-10
oat_generated: false
oat_template: false
---

# Design: docs-bootstrap-skill

## Overview

The docs-bootstrap skill is a **guided wrapper** around `oat docs init` that turns raw CLI scaffolding into an educational, support-rich onboarding experience. The skill performs three tightly sequenced jobs in one flow: (1) it **prepares** the repo by detecting shape (monorepo vs single-package), validating preconditions, and gathering richer inputs than the CLI prompts for; (2) it **executes** scaffolding by invoking `oat docs init` non-interactively with the collected flags, running dependency install, and verifying a clean build; and (3) it **educates** the user on the docs model — the `index.md` + `## Contents` navigation contract, the scaffolded agent instructions, and how to populate real content via `oat-project-document`, `oat docs analyze`, and `oat docs apply`.

The skill deliberately calls the CLI rather than reimplementing its scaffold logic. This keeps the skill thin and lets the CLI remain the source of truth for template rendering, version resolution, and configuration writes. The skill's value is in everything that sits **around** the CLI call: asking better questions before the call, auto-fixing or guiding through problems after the call, and sequencing educational content at teachable moments. Where the CLI has gaps (e.g., FP-11: no separate site-name input), the skill either passes a flag if/when the CLI supports it or applies a small, documented post-patch as a fallback.

Two framework paths are supported: **Fumadocs** (primary) receives the full treatment — preflight, guided scaffold, build verification, and deep educational walkthrough. **MkDocs** receives a lean path — same preflight and scaffold, basic verification, and the shared educational concepts (index.md contract, analyze/apply), but no framework-specific deep dive. MkDocs is explicitly labeled in the skill as "needs elaboration" so future work can fill in the gap without rewriting the shared scaffolding.

## Architecture

### System Context

The skill is a Claude Code skill (Markdown + frontmatter under `.claude/skills/oat-docs-bootstrap/` or equivalent canonical location) that orchestrates CLI invocations, file reads/edits, and user conversation. It does not ship as a CLI command and does not replace `oat docs init` — it sits on top of it.

**Key Components:**

- **Preflight Detector:** Inspects the working tree to determine repo shape, detect existing docs setup, and surface conflicts before any mutation.
- **Input Gatherer:** Conducts a guided conversation to collect the richer set of inputs the skill needs (package name, site name, description, framework, lint/format, target directory), explaining what each value affects.
- **Scaffold Runner:** Invokes `oat docs init` non-interactively with collected flags, then handles the FP-11 site-name gap via fallback patching if needed.
- **Build Verifier:** Runs install + build for the scaffolded app, classifies failures, and either auto-fixes known issues or surfaces a focused remediation prompt.
- **Educational Walkthrough:** A scripted, chunked conversation covering the docs model. Content branches on framework (Fumadocs deep, MkDocs lean) but shares the index.md, agent instructions, and analyze/apply sections.
- **Optional Content Kickoff:** Offers to run `oat docs analyze` and `oat docs apply` as a final step to populate initial project-specific documentation.

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     docs-bootstrap skill                        │
│                                                                 │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│   │  Preflight   │──▶│    Input     │──▶│    Scaffold      │    │
│   │  Detector    │   │   Gatherer   │   │    Runner        │    │
│   └──────────────┘   └──────────────┘   └────────┬─────────┘    │
│                                                  │              │
│                                                  ▼              │
│   ┌──────────────────┐   ┌──────────────┐   ┌──────────────┐    │
│   │ Optional Content │◀──│ Educational  │◀──│    Build     │    │
│   │     Kickoff      │   │  Walkthrough │   │   Verifier   │    │
│   └──────────────────┘   └──────────────┘   └──────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
           │                     │                     │
           ▼                     ▼                     ▼
    ┌───────────────┐    ┌───────────────┐     ┌──────────────┐
    │  Repo state   │    │  oat docs     │     │  pnpm        │
    │  (git, fs)    │    │  init (CLI)   │     │  (install/   │
    │               │    │               │     │   build)     │
    └───────────────┘    └───────────────┘     └──────────────┘
```

### Data Flow

Single-pass, mostly linear. Each component reads from the previous component's output (captured in skill memory, not persisted to disk) and writes repo state or skill state forward.

```
1. Preflight
   ├─ Read: pnpm-workspace.yaml, package.json, apps/, packages/, .oat/config.json, AGENTS.md
   ├─ Output: { repoShape, existingDocsConfig?, existingDocsAppPath?, conflicts[] }
   └─ On conflict → surface options (replace / second app / abort) before proceeding

2. Input Gathering
   ├─ Read: preflight output, repo name
   ├─ Asks (with defaults):
   │   - Framework (Fumadocs / MkDocs)
   │   - Site name (product/project name — defaults to humanized repo name)
   │   - Package/app name (defaults to "docs" or "{repo}-docs")
   │   - Target directory (defaults per shape)
   │   - Site description
   │   - Lint/format preferences
   └─ Output: { framework, siteName, appName, targetDir, siteDescription, lint, format }

3. Scaffold Run
   ├─ Invoke: oat docs init --yes --framework X --name Y --target-dir Z --description "..." --lint ... --format ...
   │          (and --site-name / --title when CLI supports it; else post-patch)
   ├─ Post-patch fallback: edit next.config.js + app/layout.tsx to set real site name
   ├─ Output: { appRoot, createdFiles[], scaffoldSucceeded }
   └─ On scaffold failure → surface CLI error + remediation

4. Build Verification
   ├─ Run: pnpm install (root or appRoot depending on shape)
   ├─ Run: pnpm --filter <appName> build  (monorepo) or pnpm build in appRoot (single-package)
   ├─ Classify failures against known patterns from discovery (FP-1..FP-11)
   ├─ Auto-fix when safe; otherwise surface focused remediation
   └─ Output: { buildSucceeded, failureCategory? }

5. Educational Walkthrough (chunked conversation)
   ├─ Section A (both frameworks): What got scaffolded + why
   ├─ Section B (both): index.md as content map, the ## Contents contract
   ├─ Section C (both): Agent instructions scaffolded in the docs app (AGENTS.md section, contributing.md)
   ├─ Section D (Fumadocs only): Fumadocs-specific deep dive (layout, search, source.config, docs-theme)
   ├─ Section E (MkDocs only): lean summary + "needs elaboration" marker
   └─ Section F (both): oat-project-document auto-populates docs during OAT workflows;
                        oat docs analyze + oat docs apply to bootstrap content

6. Optional Content Kickoff
   ├─ Ask: "Want to populate initial documentation now via oat docs analyze + oat docs apply?"
   ├─ If yes → delegate to oat-docs-analyze skill, then oat-docs-apply skill
   └─ If no → hand off with explicit next-step commands

7. Exit
   └─ Summary: what was created, where, what the user can do next
```
