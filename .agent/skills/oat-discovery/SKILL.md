---
name: oat-discovery
description: Start discovery phase - gather requirements and understand the problem through structured dialogue
---

# Discovery Phase

Gather requirements and understand the problem space through natural collaborative dialogue.

## Prerequisites

**Required:** Knowledge base must exist. If missing, run `/oat:index` first.

## Mode Assertion

**OAT MODE: Discovery**

**Purpose:** Gather requirements and understand the problem space through structured dialogue.

**BLOCKED Activities:**
- ❌ No code writing
- ❌ No design documents
- ❌ No implementation plans
- ❌ No technical specifications

**ALLOWED Activities:**
- ✅ Asking clarifying questions
- ✅ Exploring approaches and trade-offs
- ✅ Documenting decisions and constraints
- ✅ Reading knowledge base for context

**Self-Correction Protocol:**
If you catch yourself:
- Writing code or implementation details → STOP
- Drafting technical designs → STOP
- Creating detailed plans → STOP

**Recovery:**
1. Acknowledge the deviation
2. Return to asking questions about requirements
3. Document the insight in discovery.md without implementation details

## Process

### Step 1: Check Knowledge Base Exists

```bash
ls .oat/knowledge/repo/project-index.md 2>/dev/null
```

**If missing:** Block and require `/oat:index` first.

### Step 2: Check Knowledge Staleness

Extract frontmatter values from `.oat/knowledge/repo/project-index.md`:

```bash
# Extract SHAs and generation date from frontmatter
SOURCE_HEAD_SHA=$(grep "^oat_source_head_sha:" .oat/knowledge/repo/project-index.md | awk '{print $2}')
SOURCE_MERGE_BASE_SHA=$(grep "^oat_source_main_merge_base_sha:" .oat/knowledge/repo/project-index.md | awk '{print $2}')
GENERATED_AT=$(grep "^oat_generated_at:" .oat/knowledge/repo/project-index.md | awk '{print $2}')

# Get current state
CURRENT_HEAD=$(git rev-parse HEAD)
CURRENT_MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD)
```

**Enhanced staleness check:**

1. **Age check:** Compare `$GENERATED_AT` vs today (warn if >7 days)
   ```bash
   # Calculate days since generation
   DAYS_OLD=$(( ($(date +%s) - $(date -j -f "%Y-%m-%d" "$GENERATED_AT" +%s 2>/dev/null || echo 0)) / 86400 ))
   ```

2. **Git diff check:** Compare recorded merge base to current HEAD
   ```bash
   # Check files changed since knowledge was generated
   FILES_CHANGED=$(git diff --stat $SOURCE_MERGE_BASE_SHA..HEAD | tail -1 | awk '{print $1}')
   LINES_CHANGED=$(git diff --shortstat $SOURCE_MERGE_BASE_SHA..HEAD)
   ```

**If stale (>7 days OR >20 files changed OR significant line changes):**
- Display prominent warning with specifics
- Recommend `/oat:index` to refresh
- Ask user: "Continue with stale knowledge or refresh first?"

### Step 3: Create Project Directory

Ask user for project name (slug format, e.g., "user-auth-refactor").

Check if project already exists:
```bash
ls -la .agent/projects/{project-name} 2>/dev/null
```

**If project exists:**
- Read `.agent/projects/{project-name}/state.md` to show current status
- Ask user: "Project exists. Resume, View, or Overwrite?"
  - **Resume:** Continue with existing discovery (if status is in_progress)
  - **View:** Show current discovery.md and exit
  - **Overwrite:** Delete and start fresh (warn about data loss)

**If project doesn't exist:**
```bash
mkdir -p .agent/projects/{project-name}
```

### Step 4: Initialize State

Copy template: `.oat/templates/state.md` → `.agent/projects/{project-name}/state.md`

Update frontmatter:
```yaml
---
oat_phase: discovery
oat_phase_status: in_progress
---
```

Update content:
- Replace `{Project Name}` with actual project name
- Set **Started:** to today's date
- Update **Artifacts** section with actual project path

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

Propose 2-3 approaches with pros/cons. Document in discovery.md "Options Considered".

When an approach is selected, add a "Summary" line explaining the choice.

**Handle scope creep:**
- If user suggests additional features during discussion → add to "Deferred Ideas"
- If uncertainty arises → add to "Open Questions"
- Keep discovery focused on the core problem

### Step 9: Document Decisions and Boundaries

Update discovery.md sections:

**Required:**
- **Key Decisions:** What was decided and why
- **Constraints:** Technical, business, timeline limits
- **Success Criteria:** How we'll know it's done
- **Out of Scope:** What we're explicitly not doing

**Capture during conversation:**
- **Deferred Ideas:** Features/improvements for later (prevents scope creep)
- **Open Questions:** Unresolved questions (flag for spec phase)
- **Assumptions:** What we're assuming is true (needs validation)
- **Risks:** Potential problems identified (helps planning)

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
