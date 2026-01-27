---
name: oat-discovery
description: Start discovery phase - gather requirements and understand the problem through structured dialogue
---

# Discovery Phase

Gather requirements and understand the problem space through natural collaborative dialogue.

## Prerequisites

**Required:** Knowledge base must exist. If missing, run `/oat:index` first.

## Process

### Step 1: Check Knowledge Base Exists

```bash
ls .oat/knowledge/repo/project-index.md 2>/dev/null
```

**If missing:** Block and require `/oat:index` first.

### Step 2: Check Knowledge Staleness

Read frontmatter from `.oat/knowledge/repo/project-index.md`:

```bash
head -20 .oat/knowledge/repo/project-index.md | grep "oat_source_"
```

Get current HEAD and merge base:
```bash
CURRENT_HEAD=$(git rev-parse HEAD)
CURRENT_MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD)
```

**Enhanced staleness check:**
1. Age: Compare `oat_generated_at` vs today (warn if >7 days)
2. Git diff: `git diff --stat {merge_base_sha}..HEAD` (warn if >20 files changed)
3. Line changes: `git diff --shortstat {merge_base_sha}..HEAD` (warn if significant)

**If stale:** Display prominent warning, recommend `/oat:index` to refresh

### Step 3: Create Project Directory

Ask user for project name (slug format, e.g., "user-auth-refactor").

```bash
mkdir -p .agent/projects/{project-name}
```

### Step 4: Initialize State

Copy template: `.oat/templates/state.md` → `.agent/projects/{project-name}/state.md`

Update frontmatter and content with project details.

### Step 5: Initialize Discovery Document

Copy template: `.oat/templates/discovery.md` → `.agent/projects/{project-name}/discovery.md`

Update with user's initial request.

### Step 6: Read Relevant Knowledge

Read for context:
- `.oat/knowledge/repo/project-index.md`
- `.oat/knowledge/repo/architecture.md`
- `.oat/knowledge/repo/conventions.md`
- `.oat/knowledge/repo/concerns.md`

### Step 7: Ask Clarifying Questions

**One question at a time.** After each answer:
1. Add to discovery.md "Clarifying Questions" section
2. Update frontmatter: `oat_last_updated: {today}`

### Step 8: Explore Approaches

Propose 2-3 approaches with pros/cons. Document in discovery.md.

### Step 9: Confirm Key Decisions

Update discovery.md sections: Decisions, Constraints, Success Criteria, Out of Scope

### Step 10: Mark Discovery Complete

Update frontmatter:
```yaml
---
oat_status: complete
oat_ready_for: oat-spec
---
```

### Step 11: Commit Discovery

**Note:** This shows what users will do when USING oat-discovery.
During implementation of OAT itself, use standard commit format.

```bash
git add .agent/projects/{project-name}/
git commit -m "docs: complete discovery for {project-name}

Key decisions:
- {Decision 1}
- {Decision 2}

Ready for specification phase"
```

### Step 12: Output Summary

```
Discovery phase complete for {project-name}.

Next: Create specification with /oat:spec
```
