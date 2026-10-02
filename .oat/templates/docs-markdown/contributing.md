---
title: Contributing to documentation
description: Authoring conventions, context, and Markdown navigation rules.
---

# Contributing to documentation

Maintain documentation for **{{REPO_NAME}}** as authored Markdown pages. Start
from the [documentation index](index.md) to understand the intended audience and
where each topic belongs.

## Structure and context

- Give every Markdown-bearing directory an authored `index.md` with useful
  context: purpose, audience, ownership, and how its pages relate.
- Maintain a populated `## Contents` map. Link sibling pages as `page.md` and
  immediate child directories as `section/index.md`. Link only existing files.
- Asset-only directories do not need an index.
- Add `title` and `description` metadata to authored pages. Use relative `.md`
  links so navigation works when reading the repository directly.
- Preserve existing local instructions and repository-specific guidance.

## Review and verification

Use `oat-docs-analyze` to identify content, metadata, and navigation gaps, then
`oat-docs-apply` for approved repairs. Adoption establishes entrypoints and
configuration; review the existing tree before treating it as complete.

Check relative links, Contents maps, metadata, and context after edits. Selected
existing tools: lint `{{LINT_MODE}}`, format `{{FORMAT_MODE}}`. Use repository
checks when available; this setup does not install tools or require a site build.

The authored index is not a generated manifest. If an optional inventory is
needed, run `oat docs generate-index` with an explicit output outside the
configured content tree and keep the authored entrypoint unchanged.
