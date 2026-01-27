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
   # Skip age check if GENERATED_AT is missing or invalid
   if [ -n "$GENERATED_AT" ] && echo "$GENERATED_AT" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
     # macOS: use date -j -f, Linux: use date -d
     if date -j -f "%Y-%m-%d" "$GENERATED_AT" +%s >/dev/null 2>&1; then
       GENERATED_TS=$(date -j -f "%Y-%m-%d" "$GENERATED_AT" +%s)
     else
       GENERATED_TS=$(date -d "$GENERATED_AT" +%s 2>/dev/null || echo "")
     fi

     if [ -n "$GENERATED_TS" ]; then
       DAYS_OLD=$(( ($(date +%s) - $GENERATED_TS) / 86400 ))
     else
       DAYS_OLD="unknown"
     fi
   else
     DAYS_OLD="unknown"
   fi
   ```

2. **Git diff check:** Compare recorded merge base to current HEAD
   ```bash
   # Use --numstat for reliable file count (one line per file)
   if [ -n "$SOURCE_MERGE_BASE_SHA" ]; then
     FILES_CHANGED=$(git diff --numstat "$SOURCE_MERGE_BASE_SHA..HEAD" 2>/dev/null | wc -l | tr -d ' ')
     # Also get summary for display
     CHANGES_SUMMARY=$(git diff --shortstat "$SOURCE_MERGE_BASE_SHA..HEAD" 2>/dev/null)
   else
     FILES_CHANGED="unknown"
     CHANGES_SUMMARY=""
   fi
   ```

**Staleness thresholds:**
- Age: >7 days old
- Changes: >20 files changed

**If stale (age or changes exceed thresholds):**
- Display prominent warning with specifics (days old, files changed)
- Show `$CHANGES_SUMMARY` if available
- Recommend `/oat:index` to refresh
- Ask user: "Continue with stale knowledge or refresh first?"

**If unable to determine staleness (missing SHAs/dates):**
- Warn that staleness could not be verified
- Recommend refreshing knowledge base to ensure accuracy

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

### Step 7: Infer Gray Areas

Based on the initial request and knowledge base context, infer 3-5 "gray areas" - topics that need clarification.

**Examples of gray areas:**
- **Scope:** What features are in/out of scope?
- **Integration:** How does this interact with existing systems?
- **Data:** What data needs to be stored/accessed?
- **Users:** Who will use this and how?
- **Performance:** What are the scale/latency requirements?
- **Security:** What are the auth/privacy requirements?
- **Testing:** What testing approach is needed?

Present as multi-select question using AskUserQuestion tool:
```
Which areas should we explore during discovery?
(Select all that apply)

□ {Gray area 1}
□ {Gray area 2}
□ {Gray area 3}
□ {Gray area 4}
□ {Gray area 5}
```

This focuses the conversation on what matters most to the user.

### Step 8: Ask Clarifying Questions

**For each selected gray area:**
- Ask targeted questions one at a time
- After each answer:
  1. Add to discovery.md "Clarifying Questions" section
  2. Update frontmatter: `oat_last_updated: {today}`

**Question quality:**
- Open-ended where possible
- Domain-aware (reference knowledge base context)
- Focused on decisions, not implementation details

### Step 9: Explore Approaches

Propose 2-3 approaches with pros/cons. Document in discovery.md "Options Considered".

When an approach is selected, add a "Summary" line explaining the choice.

**Handle scope creep:**
- If user suggests additional features during discussion → add to "Deferred Ideas"
- If uncertainty arises → add to "Open Questions"
- Keep discovery focused on the core problem

### Step 10: Document Decisions and Boundaries

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

### Step 11: Mark Discovery Complete

Update frontmatter:
```yaml
---
oat_status: complete
oat_ready_for: oat-spec
---
```

### Step 12: Update Project State

Update `.agent/projects/{project-name}/state.md`:

**Frontmatter updates:**
- `oat_phase: discovery`
- `oat_phase_status: complete`
- Append `"discovery"` to `oat_hil_completed` array (do not overwrite existing entries)

**Content updates:**
- Set **Last Updated:** to today
- Update **Artifacts** section: Discovery status to "complete"
- Update **Progress** section

### Step 13: Commit Discovery

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

### Step 14: Output Summary

```
Discovery phase complete for {project-name}.

Next: Create specification with /oat:spec
```
