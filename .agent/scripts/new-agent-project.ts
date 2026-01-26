#!/usr/bin/env tsx

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cwd, stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

interface CreateProjectOptions {
  projectName: string;
  withReviews: boolean;
  withHandoffs: boolean;
  withPrDescription: boolean;
}

interface ParsedArgs {
  projectName: string | undefined;
  withReviews: boolean | undefined;
  withHandoffs: boolean | undefined;
  withPrDescription: boolean | undefined;
}

function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    projectName: undefined,
    withReviews: undefined,
    withHandoffs: undefined,
    withPrDescription: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--with-reviews') {
      result.withReviews = true;
    } else if (arg === '--no-reviews') {
      result.withReviews = false;
    } else if (arg === '--with-handoffs') {
      result.withHandoffs = true;
    } else if (arg === '--no-handoffs') {
      result.withHandoffs = false;
    } else if (arg === '--with-pr-description') {
      result.withPrDescription = true;
    } else if (arg === '--no-pr-description') {
      result.withPrDescription = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-') && !result.projectName) {
      result.projectName = arg;
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
Usage: tsx new-agent-project.ts <project-name> [options]

Creates a new agent project directory with scaffolded documentation files.

Arguments:
  project-name         Name of the project (kebab-case recommended)

Options:
  --with-reviews       Create a reviews/ directory for review documents
  --no-reviews         Skip creating the reviews/ directory
  --with-handoffs      Create a handoffs/ directory for context handoff documents
  --no-handoffs        Skip creating the handoffs/ directory
  --with-pr-description Create a pr-description.md file
  --no-pr-description  Skip creating the pr-description.md file
  -h, --help           Show this help message

If options are not provided, you will be prompted interactively.

Examples:
  tsx new-agent-project.ts user-auth-refactor
  tsx new-agent-project.ts api-rate-limiting --with-reviews --with-handoffs
  tsx new-agent-project.ts quick-fix --no-reviews --no-handoffs --with-pr-description
`);
}

async function promptYesNo(
  rl: ReturnType<typeof createInterface>,
  question: string,
  defaultValue: boolean,
): Promise<boolean> {
  const defaultHint = defaultValue ? '[Y/n]' : '[y/N]';
  const answer = await rl.question(`${question} ${defaultHint}: `);
  const trimmed = answer.trim().toLowerCase();

  if (trimmed === '') {
    return defaultValue;
  }
  return trimmed === 'y' || trimmed === 'yes';
}

async function gatherOptions(
  parsedArgs: ParsedArgs,
): Promise<CreateProjectOptions> {
  let projectName = parsedArgs.projectName;

  // Determine which options need prompting
  const needsPrompt =
    !projectName ||
    parsedArgs.withReviews === undefined ||
    parsedArgs.withHandoffs === undefined ||
    parsedArgs.withPrDescription === undefined;

  let rl: ReturnType<typeof createInterface> | undefined;

  if (needsPrompt) {
    rl = createInterface({ input: stdin, output: stdout });
  }

  try {
    // Get project name if not provided
    if (!projectName && rl) {
      projectName = await rl.question(
        'Project name (kebab-case, e.g., user-auth-refactor): ',
      );
    }

    if (!projectName) {
      console.error('Error: Project name is required');
      console.log('Usage: tsx new-agent-project.ts <project-name>');
      process.exit(1);
    }

    // Validate project name
    if (!/^[a-z0-9-_]+$/i.test(projectName)) {
      console.error(
        'Error: Project name should only contain letters, numbers, hyphens, and underscores',
      );
      process.exit(1);
    }

    console.log(
      '\nCore files (discovery.md, planning.md, implementation.md) will be created automatically.\n',
    );

    // Get optional directory preferences
    let withReviews = parsedArgs.withReviews;
    let withHandoffs = parsedArgs.withHandoffs;
    let withPrDescription = parsedArgs.withPrDescription;

    if (rl) {
      if (withReviews === undefined) {
        withReviews = await promptYesNo(
          rl,
          'Create reviews/ directory for review documents?',
          true,
        );
      }

      if (withHandoffs === undefined) {
        withHandoffs = await promptYesNo(
          rl,
          'Create handoffs/ directory for context handoff documents?',
          true,
        );
      }

      if (withPrDescription === undefined) {
        withPrDescription = await promptYesNo(
          rl,
          'Create pr-description.md file?',
          true,
        );
      }
    }

    return {
      projectName,
      withReviews: withReviews ?? true,
      withHandoffs: withHandoffs ?? true,
      withPrDescription: withPrDescription ?? true,
    };
  } finally {
    rl?.close();
  }
}

/**
 * Creates a new agent project directory with scaffolded documentation files.
 */
async function createProject(options: CreateProjectOptions): Promise<void> {
  const { projectName, withReviews, withHandoffs, withPrDescription } = options;

  const projectsDir = join(cwd(), '.agent', 'projects');
  const projectDir = join(projectsDir, projectName);

  try {
    // Create project directory
    await mkdir(projectDir, { recursive: true });
    console.log(
      `\n✓ Created project directory: .agent/projects/${projectName}/`,
    );

    // Create discovery.md
    const discoveryContent = `# ${projectName} - Discovery

## Project Overview

<!-- Brief description of what this project aims to accomplish -->

## Requirements Gathering

### Functional Requirements

<!-- What should this project do? -->

### Non-Functional Requirements

<!-- Performance, security, scalability, maintainability considerations -->

### Constraints

<!-- Technical constraints, dependencies, limitations -->

## Questions and Clarifications

<!-- Open questions that need answers before planning -->

## Alignment Check

<!-- Confirm understanding with stakeholders/team -->

---

**Status**: 🔍 Discovery in progress
**Next Step**: Complete discovery, then move to planning phase
`;

    await writeFile(join(projectDir, 'discovery.md'), discoveryContent);
    console.log(`✓ Created discovery.md`);

    // Create planning.md
    const planningContent = `# ${projectName} - Planning

## Approach

<!-- High-level approach to implementing this project -->

## Architecture Decisions

### Decision 1

**Context**: <!-- What is the issue we're addressing? -->

**Decision**: <!-- What did we decide? -->

**Rationale**: <!-- Why did we make this decision? -->

**Alternatives Considered**: <!-- What other options did we consider? -->

## Implementation Plan

### Phase 1: <!-- Phase name -->

- [ ] Task 1
- [ ] Task 2

### Phase 2: <!-- Phase name -->

- [ ] Task 1
- [ ] Task 2

## Risks and Mitigations

<!-- Potential risks and how we'll address them -->

## Testing Strategy

<!-- How will we verify this works correctly? -->

## Deployment Considerations

<!-- Any special deployment requirements or considerations -->

---

**Status**: 📋 Planning in progress
**Next Step**: Finalize plan, then move to implementation phase
`;

    await writeFile(join(projectDir, 'planning.md'), planningContent);
    console.log(`✓ Created planning.md`);

    // Create implementation.md
    const implementationContent = `# ${projectName} - Implementation

## Implementation Log

<!-- Track progress and decisions made during development -->

### Session 1 - [Date]

**Goals**:
-

**Completed**:
-

**Decisions Made**:
-

**Challenges**:
-

**Next Steps**:
-

---

## Code Changes

### Files Modified

<!-- List of files changed with brief descriptions -->

### Key Implementation Details

<!-- Important implementation notes and rationale -->

## Deviations from Plan

<!-- Any changes from the original plan and why -->

## Testing Notes

<!-- Testing performed and results -->

## Documentation Updates Needed

<!-- What documentation should be created/updated -->

---

**Status**: 🚧 Implementation in progress
**Next Step**: Complete implementation, then create PR description
`;

    await writeFile(
      join(projectDir, 'implementation.md'),
      implementationContent,
    );
    console.log(`✓ Created implementation.md`);

    // Create optional reviews/ directory
    if (withReviews) {
      const reviewsDir = join(projectDir, 'reviews');
      await mkdir(reviewsDir, { recursive: true });

      const reviewsKeepContent = `# Reviews Directory

This directory contains review documents generated during the project lifecycle.

## Purpose

When an agent reviews planning, implementation, or other aspects of the project,
the review output is stored here for reference and tracking.

## Typical Files

- \`planning-review.md\` - Review of the planning document
- \`implementation-review.md\` - Review of the implementation
- \`phase-N-review.md\` - Review of specific implementation phases
- \`code-review.md\` - Code review notes and feedback

## Usage

Ask an agent to review any aspect of your project, and it will generate
a review document in this directory with findings, suggestions, and action items.
`;

      await writeFile(join(reviewsDir, 'README.md'), reviewsKeepContent);
      console.log(`✓ Created reviews/ directory`);
    }

    // Create optional handoffs/ directory
    if (withHandoffs) {
      const handoffsDir = join(projectDir, 'handoffs');
      await mkdir(handoffsDir, { recursive: true });

      const handoffsKeepContent = `# Handoffs Directory

This directory contains handoff documents for transitioning between agent sessions or phases.

## Purpose

Handoff documents provide context for agents picking up work from previous sessions.
They capture information that may not be fully documented in the planning or
implementation files, ensuring smooth transitions and continuity.

## When to Create Handoffs

- At the end of a work session when more work remains
- When transitioning between project phases
- When handing off to a different agent or parallel agent
- When context is complex and needs explicit summarization

## Typical Files

- \`session-N-handoff.md\` - End-of-session context handoff
- \`phase-N-handoff.md\` - Phase transition handoff
- \`parallel-task-handoff.md\` - Context for parallel agent work

## Handoff Document Structure

A good handoff document includes:
- Current state summary
- Work completed
- Work remaining
- Key decisions and their rationale
- Open questions or blockers
- Recommended next steps
- Relevant file paths and documentation references
- Any context not captured in other docs
`;

      await writeFile(join(handoffsDir, 'README.md'), handoffsKeepContent);
      console.log(`✓ Created handoffs/ directory`);
    }

    // Create optional pr-description.md
    if (withPrDescription) {
      const prDescriptionContent = `# ${projectName} - PR Description

<!--
This file serves as a working draft for your pull request description.

TIP: Use the /create-pr-description skill to generate a comprehensive PR description
based on git changes and project context. The skill will analyze your changes and help
create a properly formatted description.
-->

## Summary

<!-- 1-3 bullet points summarizing the changes -->

-

## Context

<!-- Why is this change needed? Link to issues, discussions, or requirements -->

## Changes

<!-- Detailed list of changes made -->

### Added

-

### Changed

-

### Removed

-

## Testing

<!-- How were these changes tested? -->

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

### Test Plan

<!-- Step-by-step instructions for reviewers to test -->

1.

## Screenshots

<!-- If applicable, add screenshots or recordings -->

## Deployment Notes

<!-- Any special deployment considerations -->

## Checklist

- [ ] Code follows project conventions
- [ ] Tests pass locally
- [ ] Documentation updated (if needed)
- [ ] No sensitive data exposed

---

**Status**: 📝 Draft
**Ready for PR**: No
`;

      await writeFile(
        join(projectDir, 'pr-description.md'),
        prDescriptionContent,
      );
      console.log(`✓ Created pr-description.md`);
    }

    console.log('\n✨ Project scaffolding complete!');
    console.log(`\nProject structure:`);
    console.log(`  .agent/projects/${projectName}/`);
    console.log(`  ├── discovery.md`);
    console.log(`  ├── planning.md`);
    console.log(`  ├── implementation.md`);
    if (withPrDescription) {
      console.log(`  ├── pr-description.md`);
    }
    if (withReviews) {
      console.log(`  ├── reviews/`);
      console.log(`  │   └── README.md`);
    }
    if (withHandoffs) {
      console.log(`  └── handoffs/`);
      console.log(`      └── README.md`);
    }
    console.log(`\nNext steps:`);
    console.log(`1. Open .agent/projects/${projectName}/discovery.md`);
    console.log(`2. Start gathering requirements and asking questions`);
    console.log(`3. Once discovery is complete, move to planning.md`);
    console.log(
      `4. After planning is finalized, track implementation in implementation.md`,
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error creating project:', error.message);
    } else {
      console.error('Error creating project:', error);
    }
    process.exit(1);
  }
}

// Main execution
const parsedArgs = parseArgs(process.argv.slice(2));
gatherOptions(parsedArgs).then(createProject);
