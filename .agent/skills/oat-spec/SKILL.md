---
name: oat-spec
description: Create formal specification from discovery insights with structured requirements
---

# Specification Phase

Transform discovery insights into a formal specification with detailed requirements and acceptance criteria.

## Prerequisites

**Required:** Complete discovery document. If missing, run `/oat:discovery` first.

## Process

### Step 1: Check Discovery Complete

```bash
cat .agent/projects/{project-name}/discovery.md | head -10 | grep "oat_status:"
```

**Required frontmatter:**
- `oat_status: complete`
- `oat_ready_for: oat-spec`

**If not complete:** Block and ask user to finish discovery first.

### Step 2: Read Discovery Document

Read `.agent/projects/{project-name}/discovery.md` completely to understand:
- Initial request and context
- All clarifying Q&A
- Options considered and chosen approach
- Key decisions made
- Constraints identified
- Success criteria defined
- Items explicitly out of scope

### Step 3: Read Relevant Knowledge

Read for context:
- `.oat/knowledge/repo/project-index.md`
- `.oat/knowledge/repo/architecture.md`
- `.oat/knowledge/repo/integrations.md` (for dependencies)
- `.oat/knowledge/repo/concerns.md` (for constraints)

### Step 4: Initialize Specification Document

Copy template: `.oat/templates/spec.md` → `.agent/projects/{project-name}/spec.md`

Update frontmatter:
```yaml
---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: {today}
---
```

### Step 5: Draft Problem Statement

Transform from discovery:
- **Initial Request** → Core problem
- **Clarifying Questions** → Context and nuances
- **Key Decisions** → Scope boundaries

Write 2-4 paragraphs clearly describing the problem being solved.

### Step 6: Define Goals

**Primary Goals:** Must-have outcomes (from Key Decisions + Success Criteria)
**Secondary Goals:** Nice-to-have outcomes (from Success Criteria marked as optional)

Use clear, measurable language.

### Step 7: Define Non-Goals

Copy from discovery "Out of Scope" section, adding:
- Explicit boundaries
- Future considerations
- Related work intentionally excluded

### Step 8: Draft Requirements

Transform Key Decisions and Success Criteria into structured requirements.

**Functional Requirements (FR):**
```markdown
**FR1: {Requirement Name}**
- **Description:** {What the system must do}
- **Acceptance Criteria:**
  - {Testable criterion 1}
  - {Testable criterion 2}
- **Priority:** P0 / P1 / P2
```

**Non-Functional Requirements (NFR):**
```markdown
**NFR1: {Requirement Name}**
- **Description:** {Performance, security, usability requirement}
- **Acceptance Criteria:**
  - {Measurable criterion}
- **Priority:** P0 / P1 / P2
```

**Priorities:**
- **P0:** Must have - blocks launch
- **P1:** Should have - important but not blocking
- **P2:** Nice to have - future enhancement

Start with draft requirements, then iterate with user in Step 9.

### Step 9: Refine Requirements with User

**Iterative process:**
1. Present draft requirements
2. Ask: "Are these requirements complete? Any missing or unclear?"
3. Update spec.md with refinements
4. Update frontmatter: `oat_last_updated: {today}`
5. Repeat until user confirms completeness

**Focus areas:**
- Acceptance criteria are testable
- Priorities are clear
- Edge cases covered
- Dependencies identified

### Step 10: Document Constraints

Copy from discovery "Constraints" section, adding:
- Technical constraints (from architecture.md, concerns.md)
- Business constraints
- Timeline constraints
- Resource constraints

### Step 11: Identify Dependencies

From knowledge base and discovery:
- External systems (from integrations.md)
- Existing components (from architecture.md)
- Third-party libraries
- Infrastructure requirements

### Step 12: Draft High-Level Design

Transform "Options Considered" into design proposal:

```markdown
## High-Level Design (Proposed)

{2-3 paragraph overview of chosen approach}

**Key Components:**
- {Component 1} - {Brief description}
- {Component 2} - {Brief description}

**Alternatives Considered:**
- {Alternative 1} - {Why rejected}
- {Alternative 2} - {Why rejected}

**Open Questions:**
- {Question needing resolution}
```

Keep high-level - detailed design comes in next phase.

### Step 13: Define Success Metrics

Transform "Success Criteria" into measurable metrics:
- Performance metrics (response time, throughput)
- Quality metrics (error rate, test coverage)
- User metrics (adoption, satisfaction)
- Business metrics (cost savings, revenue impact)

### Step 14: Mark Specification Complete

Update frontmatter:
```yaml
---
oat_status: complete
oat_ready_for: oat-design
oat_blockers: []
oat_last_updated: {today}
---
```

### Step 15: Update Project State

Update `.agent/projects/{project-name}/state.md`:

```yaml
---
oat_current_task: null
oat_last_commit: {commit_sha_from_step_16}
oat_blockers: []
oat_hil_phases: ["discovery", "spec"]
---
```

Update content:
```markdown
## Current Phase

Specification - Ready for design phase

## Progress

- ✓ Discovery complete
- ✓ Specification complete
- ⧗ Awaiting design phase
```

### Step 16: Commit Specification

**Note:** This shows what users will do when USING oat-spec.
During implementation of OAT itself, use standard commit format.

```bash
git add .agent/projects/{project-name}/
git commit -m "docs: complete specification for {project-name}

Requirements:
- {N} functional requirements (P0: {n}, P1: {n}, P2: {n})
- {N} non-functional requirements (P0: {n}, P1: {n}, P2: {n})

Ready for design phase"
```

### Step 17: Output Summary

```
Specification phase complete for {project-name}.

Created:
- {N} functional requirements
- {N} non-functional requirements
- High-level design approach
- Success metrics

Next: Create detailed design with /oat:design
```

## Success Criteria

- All requirements have clear acceptance criteria
- Priorities assigned to all requirements
- Dependencies identified
- High-level design approach documented
- Success metrics defined and measurable
- User confirmed specification is complete
