import { describe, expect, it } from 'vitest';

import { evaluateQuickPlanReadiness } from './quick-plan-readiness';

const READY_FRONTMATTER = `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_phase_status: complete
oat_template: false
---
`;

const PHASE_WITH_TASK = `
## Phase 1: Foundation

### Task p01-t01: Add the readiness predicate

**Status:** pending
`;

const PASSED_REVIEW_ROW = `
## Reviews

| Scope | Type     | Status | Date       | Artifact |
| ----- | -------- | ------ | ---------- | -------- |
| plan  | artifact | passed | 2026-09-07 | -        |
`;

const PENDING_REVIEW_ROW = `
## Reviews

| Scope | Type     | Status  | Date | Artifact |
| ----- | -------- | ------- | ---- | -------- |
| plan  | artifact | pending | -    | -        |
`;

function plan(frontmatter: string, ...sections: string[]): string {
  return `${frontmatter}\n# Plan: demo\n${sections.join('')}`;
}

const READY_PLAN = plan(READY_FRONTMATTER, PHASE_WITH_TASK, PASSED_REVIEW_ROW);

describe('evaluateQuickPlanReadiness', () => {
  it('accepts a plan that satisfies every clause', () => {
    expect(evaluateQuickPlanReadiness(READY_PLAN)).toEqual({
      ready: true,
      failure: null,
    });
  });

  it('treats a missing plan as not ready', () => {
    expect(evaluateQuickPlanReadiness(null)).toEqual({
      ready: false,
      failure: 'plan-missing',
    });
  });

  describe('frontmatter clauses', () => {
    it('accepts quoted scalars and an absent oat_template', () => {
      const content = plan(
        `---
oat_status: "complete"
'oat_ready_for': 'oat-project-implement'
---
`,
        PHASE_WITH_TASK,
        PASSED_REVIEW_ROW,
      );

      expect(evaluateQuickPlanReadiness(content).ready).toBe(true);
    });

    it('accepts a null or tilde oat_template', () => {
      for (const value of ['null', '~', 'false']) {
        const content = plan(
          `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_template: ${value}
---
`,
          PHASE_WITH_TASK,
          PASSED_REVIEW_ROW,
        );

        expect(evaluateQuickPlanReadiness(content).ready).toBe(true);
      }
    });

    it('rejects the Step 3 pre-review frontmatter even with substantive tasks', () => {
      const content = plan(
        `---
oat_status: in_progress
oat_ready_for: null
oat_template: false
---
`,
        PHASE_WITH_TASK,
        PASSED_REVIEW_ROW,
      );

      expect(evaluateQuickPlanReadiness(content)).toEqual({
        ready: false,
        failure: 'frontmatter-not-ready',
      });
    });

    it('rejects a template plan', () => {
      const content = plan(
        `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_template: true
---
`,
        PHASE_WITH_TASK,
        PASSED_REVIEW_ROW,
      );

      expect(evaluateQuickPlanReadiness(content).failure).toBe(
        'frontmatter-not-ready',
      );
    });

    it('rejects a duplicated or contradictory key', () => {
      const duplicatedStatus = plan(
        `---
oat_status: complete
oat_status: in_progress
oat_ready_for: oat-project-implement
---
`,
        PHASE_WITH_TASK,
        PASSED_REVIEW_ROW,
      );
      const duplicatedTemplate = plan(
        `---
oat_status: complete
oat_ready_for: oat-project-implement
oat_template: false
oat_template: true
---
`,
        PHASE_WITH_TASK,
        PASSED_REVIEW_ROW,
      );

      expect(evaluateQuickPlanReadiness(duplicatedStatus).failure).toBe(
        'frontmatter-not-ready',
      );
      expect(evaluateQuickPlanReadiness(duplicatedTemplate).failure).toBe(
        'frontmatter-not-ready',
      );
    });

    it('rejects an unterminated frontmatter block', () => {
      const content = `---
oat_status: complete
oat_ready_for: oat-project-implement

# Plan: demo
${PHASE_WITH_TASK}${PASSED_REVIEW_ROW}`;

      expect(evaluateQuickPlanReadiness(content).failure).toBe(
        'frontmatter-not-ready',
      );
    });

    it('rejects an unpaired quote', () => {
      const content = plan(
        `---
oat_status: 'complete
oat_ready_for: oat-project-implement
---
`,
        PHASE_WITH_TASK,
        PASSED_REVIEW_ROW,
      );

      expect(evaluateQuickPlanReadiness(content).failure).toBe(
        'frontmatter-not-ready',
      );
    });
  });

  describe('review disposition clause', () => {
    it('rejects a pending plan row', () => {
      const content = plan(
        READY_FRONTMATTER,
        PHASE_WITH_TASK,
        PENDING_REVIEW_ROW,
      );

      expect(evaluateQuickPlanReadiness(content)).toEqual({
        ready: false,
        failure: 'review-disposition-missing',
      });
    });

    it('rejects a plan with no Reviews section at all', () => {
      const content = plan(READY_FRONTMATTER, PHASE_WITH_TASK);

      expect(evaluateQuickPlanReadiness(content).failure).toBe(
        'review-disposition-missing',
      );
    });

    it('accepts the explicit line-anchored skip disposition', () => {
      const content = plan(
        READY_FRONTMATTER,
        PHASE_WITH_TASK,
        `
## Reviews

Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)
`,
      );

      expect(evaluateQuickPlanReadiness(content).ready).toBe(true);
    });

    it('does not read the skip line quoted inside prose as the record', () => {
      const content = plan(
        READY_FRONTMATTER,
        PHASE_WITH_TASK,
        `
## Reviews

The guard looks for "Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)" on its own line.
`,
      );

      expect(evaluateQuickPlanReadiness(content).failure).toBe(
        'review-disposition-missing',
      );
    });

    it('reads the last plan row when several are recorded', () => {
      const content = plan(
        READY_FRONTMATTER,
        PHASE_WITH_TASK,
        `
## Reviews

| Scope | Type     | Status | Date       | Artifact |
| ----- | -------- | ------ | ---------- | -------- |
| plan  | artifact | passed | 2026-09-06 | -        |
| plan  | artifact | -      | -          | -        |
`,
      );

      expect(evaluateQuickPlanReadiness(content).failure).toBe(
        'review-disposition-missing',
      );
    });

    it('stops reading the Reviews section at the next second-level heading', () => {
      const content = plan(
        READY_FRONTMATTER,
        `
## Reviews

| Scope | Type     | Status  | Date | Artifact |
| ----- | -------- | ------- | ---- | -------- |
| plan  | artifact | pending | -    | -        |

## Notes

| plan | artifact | passed | 2026-09-07 | - |
`,
        PHASE_WITH_TASK,
      );

      expect(evaluateQuickPlanReadiness(content).failure).toBe(
        'review-disposition-missing',
      );
    });

    describe('fenced examples are not the record', () => {
      it('ignores a backtick-fenced sample disposition', () => {
        const content = plan(
          READY_FRONTMATTER,
          PHASE_WITH_TASK,
          `
## Reviews

\`\`\`markdown
| plan | artifact | passed | 2026-09-07 | - |
\`\`\`

| Scope | Type     | Status  | Date | Artifact |
| ----- | -------- | ------- | ---- | -------- |
| plan  | artifact | pending | -    | -        |
`,
        );

        expect(evaluateQuickPlanReadiness(content).failure).toBe(
          'review-disposition-missing',
        );
      });

      it('ignores a tilde-fenced sample disposition', () => {
        const content = plan(
          READY_FRONTMATTER,
          PHASE_WITH_TASK,
          `
## Reviews

~~~markdown
Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)
~~~
`,
        );

        expect(evaluateQuickPlanReadiness(content).failure).toBe(
          'review-disposition-missing',
        );
      });

      it('keeps a nested fence closed until its own longer marker closes it', () => {
        const content = plan(
          READY_FRONTMATTER,
          PHASE_WITH_TASK,
          `
## Reviews

\`\`\`\`markdown
\`\`\`
| plan | artifact | passed | 2026-09-07 | - |
\`\`\`
\`\`\`\`
`,
        );

        expect(evaluateQuickPlanReadiness(content).failure).toBe(
          'review-disposition-missing',
        );
      });

      it('ignores a four-space indented example row', () => {
        const content = plan(
          READY_FRONTMATTER,
          PHASE_WITH_TASK,
          `
## Reviews

    | plan | artifact | passed | 2026-09-07 | - |
`,
        );

        expect(evaluateQuickPlanReadiness(content).failure).toBe(
          'review-disposition-missing',
        );
      });

      // Tab-indented example code is indented code in CommonMark, where one tab
      // advances to the four-column stop. Counting characters instead of
      // columns would let this sample row dispose of a real pending row.
      it('ignores a tab-indented example row', () => {
        const content = plan(
          READY_FRONTMATTER,
          PHASE_WITH_TASK,
          `
## Reviews

\t| plan | artifact | passed | 2026-09-07 | - |
`,
        );

        expect(evaluateQuickPlanReadiness(content).failure).toBe(
          'review-disposition-missing',
        );
      });

      it('ignores a tab-indented fenced example', () => {
        const content = plan(
          READY_FRONTMATTER,
          PHASE_WITH_TASK,
          `
## Reviews

\t\`\`\`markdown
\t| plan | artifact | passed | 2026-09-07 | - |
\t\`\`\`
`,
        );

        expect(evaluateQuickPlanReadiness(content).failure).toBe(
          'review-disposition-missing',
        );
      });
    });
  });

  describe('substantive task clause', () => {
    it('rejects a plan whose only task title is a placeholder', () => {
      const content = plan(
        READY_FRONTMATTER,
        `
## Phase 1: Foundation

### Task p01-t01: {Task title}
`,
        PASSED_REVIEW_ROW,
      );

      expect(evaluateQuickPlanReadiness(content)).toEqual({
        ready: false,
        failure: 'substantive-task-missing',
      });
    });

    it('rejects a task heading that is not under a Phase heading', () => {
      const content = plan(
        READY_FRONTMATTER,
        `
## Appendix

### Task p01-t01: Add the readiness predicate
`,
        PASSED_REVIEW_ROW,
      );

      expect(evaluateQuickPlanReadiness(content).failure).toBe(
        'substantive-task-missing',
      );
    });

    it('rejects a task heading that only appears inside a fenced example', () => {
      const content = plan(
        READY_FRONTMATTER,
        `
## Phase 1: Foundation

\`\`\`markdown
### Task p01-t01: Add the readiness predicate
\`\`\`
`,
        PASSED_REVIEW_ROW,
      );

      expect(evaluateQuickPlanReadiness(content).failure).toBe(
        'substantive-task-missing',
      );
    });

    it('rejects a tab-indented example task heading', () => {
      const content = plan(
        READY_FRONTMATTER,
        `
## Phase 1: Foundation

\t### Task p01-t01: Add the readiness predicate
`,
        PASSED_REVIEW_ROW,
      );

      expect(evaluateQuickPlanReadiness(content).failure).toBe(
        'substantive-task-missing',
      );
    });

    it('accepts a title that keeps text once placeholders are removed', () => {
      const content = plan(
        READY_FRONTMATTER,
        `
## Phase 1: Foundation

### Task p01-t01: {Verb} the recommender predicate
`,
        PASSED_REVIEW_ROW,
      );

      expect(evaluateQuickPlanReadiness(content).ready).toBe(true);
    });
  });
});
