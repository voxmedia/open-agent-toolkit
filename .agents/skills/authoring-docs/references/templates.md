---
title: Documentation Templates
description: Rules for using reusable documentation templates without keeping empty boilerplate.
---

# Documentation Templates

Use templates as starting points, not as forms to fill mechanically. Delete
sections that do not apply, merge sections when the repo is small, and add
sections when the evidence requires them.

## Template Rules

- Keep placeholders only while drafting; replace or remove them before
  publishing.
- Do not keep empty headings for symmetry.
- Preserve accurate existing content before introducing a new shape.
- Add frontmatter only when the target docs system uses it.
- Use exact commands, paths, versions, configuration keys, and source links.
- Mark missing ownership, deployment, or operations facts explicitly.
- Include verification for task pages.
- Include rollback or cleanup for risky operations.

## Common Template Families

Use page-type references for the shape of:

- landing pages
- getting-started tutorials
- how-to guides
- configuration reference
- API reference
- CLI command reference
- architecture pages
- runbooks
- architecture decision records
- documentation audit summaries
- documentation handoff summaries

When the repository has an established local template, use the local template
and apply this skill's evidence, clarity, and safety standards to it.
