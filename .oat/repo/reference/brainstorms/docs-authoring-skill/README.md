---
title: Vox Technical Documentation Authoring Skill
description: A skill-ready guide for writing consistent technical documentation for humans and AI agents.
---

# Vox Technical Documentation Authoring Skill

This package is a portable documentation authoring guide for humans and AI agents working across software repositories.

Use it when creating, auditing, migrating, or improving documentation for:

- internal apps
- public user-facing apps
- backend services
- frontend applications
- APIs
- CLIs
- libraries
- frameworks
- infrastructure
- operational runbooks
- architecture docs

The guide assumes docs are written in plain Markdown and rendered in Fumadocs or a similar Markdown-first documentation site.

## Files

| File                                 | Purpose                                                              |
| ------------------------------------ | -------------------------------------------------------------------- |
| `SKILL.md`                           | The concise instruction file an agent should load first.             |
| `01-principles.md`                   | Core philosophy and quality bar.                                     |
| `02-agent-workflow.md`               | How agents should inspect repos and write grounded docs.             |
| `03-information-architecture.md`     | Standard docs structure across repos.                                |
| `04-page-types.md`                   | Tutorials, how-to guides, reference, and explanation.                |
| `05-writing-style.md`                | Voice, phrasing, formatting, and consistency rules.                  |
| `06-markdown-fumadocs.md`            | Markdown conventions for Fumadocs-friendly content.                  |
| `07-api-docs.md`                     | REST, GraphQL, event-driven, webhook, and schema docs.               |
| `08-cli-docs.md`                     | CLI documentation patterns and command reference templates.          |
| `09-app-service-docs.md`             | Frontend app, backend service, and system docs.                      |
| `10-library-framework-docs.md`       | Package, SDK, library, and framework documentation.                  |
| `11-architecture-operations-docs.md` | Architecture docs, ADRs, runbooks, observability, and failure modes. |
| `12-internal-vs-public.md`           | Differences between internal and public documentation.               |
| `13-templates.md`                    | Copyable page templates.                                             |
| `14-review-rubric.md`                | Audit checklist, scoring model, and definition of done.              |
| `15-references.md`                   | Reference links to excellent documentation by category.              |
| `16-docs-audit-prompts.md`           | Agent prompts and audit workflows for repository migrations.         |

## Recommended usage

For a repo-level docs migration:

1. Load `SKILL.md` first.
2. Audit the repository using `16-docs-audit-prompts.md`.
3. Pick the standard structure from `03-information-architecture.md`.
4. Write or improve docs using the relevant category file.
5. Review with `14-review-rubric.md` before publishing.

## North star

Good docs should let a capable engineer, operator, consumer, or agent accomplish real work without relying on Slack archaeology, tribal knowledge, or source-code spelunking.
