---
name: oat-progress
description: Check project progress and get routed to the appropriate next skill
---

# Progress Router

Check knowledge base status, project progress, and get recommendations for next steps.

## Usage

Run `/oat:progress` at any time to:
- Check if knowledge base exists and is fresh
- See current project status
- Get recommended next skill

## Process

### Step 1: Check Knowledge Base Exists

```bash
EXISTING_MD=$(find .oat/knowledge/repo -name "*.md" -type f 2>/dev/null | head -1)
```

**If `$EXISTING_MD` is empty:**
```
⚠️  No knowledge base found.

Run /oat:index first to generate codebase analysis.
```
**Exit here.**

### Step 2: Check Knowledge Staleness

Extract frontmatter from `.oat/knowledge/repo/project-index.md`:

```bash
SOURCE_MERGE_BASE_SHA=$(grep "^oat_source_main_merge_base_sha:" .oat/knowledge/repo/project-index.md | awk '{print $2}')
GENERATED_AT=$(grep "^oat_generated_at:" .oat/knowledge/repo/project-index.md | awk '{print $2}')
```

**Calculate staleness:**

1. **Age check:**
```bash
# Skip if date is missing or invalid
if [ -n "$GENERATED_AT" ] && echo "$GENERATED_AT" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
  if date -j -f "%Y-%m-%d" "$GENERATED_AT" +%s >/dev/null 2>&1; then
    GENERATED_TS=$(date -j -f "%Y-%m-%d" "$GENERATED_AT" +%s)
  else
    GENERATED_TS=$(date -d "$GENERATED_AT" +%s 2>/dev/null || echo "")
  fi
  if [ -n "$GENERATED_TS" ]; then
    DAYS_OLD=$(( ($(date +%s) - $GENERATED_TS) / 86400 ))
  fi
fi
```

2. **Git diff check:**
```bash
if [ -n "$SOURCE_MERGE_BASE_SHA" ]; then
  FILES_CHANGED=$(git diff --numstat "$SOURCE_MERGE_BASE_SHA..HEAD" 2>/dev/null | wc -l | tr -d ' ')
  CHANGES_SUMMARY=$(git diff --shortstat "$SOURCE_MERGE_BASE_SHA..HEAD" 2>/dev/null)
fi
```

**Staleness thresholds:**
- Age: >7 days old
- Changes: >20 files changed

**If stale:**
```
⚠️  Knowledge base may be stale.

Generated: {GENERATED_AT} ({DAYS_OLD} days ago)
Changes since: {FILES_CHANGED} files changed
{CHANGES_SUMMARY}

Consider running /oat:index to refresh.
```

### Step 3: List Active Projects

```bash
ls -d .agent/projects/*/ 2>/dev/null
```

**If no projects:**
```
No active projects.

Start a new project:
  /oat:discovery - Start requirements gathering for a new feature
```
**Continue to Step 6 (show available skills).**

### Step 4: For Each Project, Show Status

Read `.agent/projects/{project-name}/state.md` frontmatter:
- `oat_phase` - Current phase
- `oat_phase_status` - in_progress or complete
- `oat_blockers` - Any blockers
- `oat_hil_completed` - Completed HiL checkpoints

**Display format:**
```
📁 {project-name}
   Phase: {oat_phase} ({oat_phase_status})
   Progress: {oat_hil_completed as checkmarks}
   Blockers: {oat_blockers or "None"}
   Next: {recommended_skill}
```

### Step 5: Determine Next Skill

Based on project state, recommend next action:

| oat_phase | oat_phase_status | Next Skill |
|-----------|------------------|------------|
| discovery | in_progress | Continue `/oat:discovery` |
| discovery | complete | `/oat:spec` |
| spec | in_progress | Continue `/oat:spec` |
| spec | complete | `/oat:design` |
| design | in_progress | Continue `/oat:design` |
| design | complete | `/oat:plan` |
| plan | in_progress | Continue `/oat:plan` |
| plan | complete | `/oat:implement` |
| implement | in_progress | Continue `/oat:implement` |
| implement | complete | Ready for code review |

**If blockers exist:**
```
⚠️  Blocker: {blocker description}

Address blocker before continuing.
```

### Step 6: Show Available Skills

```
OAT Workflow Skills:

Knowledge:
  /oat:index     - Generate/refresh codebase knowledge base

Workflow:
  /oat:discovery - Start discovery phase (requirements gathering)
  /oat:spec      - Create specification from discovery
  /oat:design    - Create technical design from spec
  /oat:plan      - Create implementation plan from design
  /oat:implement - Execute implementation plan

Status:
  /oat:progress  - Check project progress (this skill)
```

### Step 7: Output Summary

Combine all information:

```
OAT Progress Report
===================

Knowledge Base:
  Status: {✓ Fresh / ⚠️ Stale / ❌ Missing}
  Generated: {date}
  Changes since: {N} files

Active Projects:
{project summaries}

Next Step: {recommendation}
```

## Success Criteria

- Knowledge base status clearly shown
- All active projects listed with status
- Clear next-step recommendations
- Blockers highlighted prominently
