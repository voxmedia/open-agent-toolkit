---
name: authoring-docs
version: 1.0.0
description: Use when creating, restructuring, migrating, auditing, or reviewing technical documentation for software projects. Provides evidence-first, provider-portable Markdown authoring standards.
argument-hint: '[docs task or target path]'
disable-model-invocation: false
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
---

# Authoring Docs

Use this skill to produce technical documentation that is grounded in the
repository, useful to humans, and explicit enough for future agents.

The prime directive is simple: do not write plausible docs. Extract truth from
code, configuration, schemas, tests, CI, deployment files, and existing docs;
then organize that truth around reader tasks.

## When to Use

Use when:

- Creating or improving docs for a software repository.
- Migrating existing docs into a clearer Markdown structure.
- Auditing docs for missing, stale, duplicated, or risky content.
- Writing API, CLI, app, service, library, framework, architecture, operations,
  or internal/public docs.
- Reviewing a documentation change for accuracy, usefulness, or safety.

## When NOT to Use

Do not use by itself when:

- The user only asks for copy editing that does not require repository evidence.
- A repository-specific docs framework contract is the main problem; load the
  local skill or instruction set alongside this baseline.
- Generated reference output must be regenerated from a tool; run the generator
  first and use this skill for review and surrounding prose.
- Legal, policy, marketing, or brand copy needs domain-specific approval outside
  the repository.

## Workflow

### Step 1: Resolve Scope and Evidence

Identify the docs target, intended reader, and source of truth before editing.
Inspect local instructions, existing docs, source files, config, schemas, tests,
CI, deployment files, and scripts that support the claims you plan to make.

Never invent commands, environment variables, endpoints, fields, deployment
steps, ownership, escalation paths, compatibility promises, or security
behavior. Mark useful but unverified facts as needing confirmation.

### Step 2: Classify the Project and Reader Task

Classify the project type and docs category: API, CLI, frontend app, backend
service, worker, library, framework, monorepo, architecture, operations, or
mixed. Identify the reader's job: first success, task completion, exact lookup,
system understanding, safe operation, or review. Load
`references/categories.md` when category-specific coverage matters.

### Step 3: Choose the Right Page Type

Use one primary page type per page:

- Tutorial: first successful path.
- How-to guide: complete one task.
- Reference: exact facts and contracts.
- Explanation: mental model, design, and tradeoffs.
- Runbook: operational recovery with checks, mitigation, and verification.

Small supporting sections are fine, but keep the page's primary job clear.

### Step 4: Structure the Docs

Prefer predictable information architecture: landing page, getting started,
how-to guides, reference, concepts, and operations. Preserve useful existing
intent, remove duplication, and avoid creating parallel docs when an existing
page can be improved.

### Step 5: Write Direct, Verifiable Markdown

Use plain language, active voice, specific nouns, exact file paths, exact
commands, code block language identifiers, expected output, and useful links.
Document prerequisites, verification, rollback for risky operations, and
uncertainty.

### Step 6: Verify and Handoff

Run relevant validation commands when available: docs build, link check, tests
for generated examples, formatters, or local preview. In the final handoff,
summarize files changed, sources inspected, verification run, unresolved facts,
and recommended follow-ups.

## Reference Map

Load only the references needed for the current task:

- `references/principles.md`: core documentation principles.
- `references/workflow.md`: evidence gathering and writing workflow.
- `references/information-architecture.md`: docs structure, naming, and links.
- `references/page-types.md`: tutorial, how-to, reference, explanation, and
  runbook guidance.
- `references/categories.md`: API, CLI, app, service, library, framework,
  monorepo, architecture, operations, and audience-specific guidance.
- `references/writing-style.md`: plain technical writing and Markdown rules.
- `references/templates.md`: reusable page and handoff templates.
- `references/review-rubric.md`: readiness checklist and review rubric.

## Examples

Basic usage:

```txt
/authoring-docs docs/
```

Conversational triggers:

```txt
Audit this repo's docs and identify missing pages.
Create a getting-started guide grounded in the package scripts.
Improve the CLI reference without inventing flags or exit codes.
Review this runbook for operational safety.
```

## Success Criteria

- Claims are grounded in repository evidence or marked as uncertain.
- The reader can complete the intended task without tribal knowledge.
- Page type, location, and navigation are clear.
- Commands, examples, paths, options, and references are accurate.
- Risky operations include verification and rollback.
- Internal-only or sensitive information is handled appropriately.
