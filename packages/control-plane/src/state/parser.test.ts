import { describe, expect, it } from 'vitest';

import { WORKFLOW_MODES } from '../index';
import { parseStateFrontmatter } from './parser';

describe('parseStateFrontmatter', () => {
  it('parses valid state frontmatter into typed fields', () => {
    const content = `---
oat_current_task: p01-t03
oat_last_commit: abc1234
oat_blockers:
  - waiting on review
oat_hill_checkpoints:
  - implement
oat_hill_completed:
  - discovery
oat_parallel_execution: true
oat_phase: implement
oat_phase_status: in_progress
oat_execution_mode: subagent-driven
oat_lifecycle: paused
oat_pause_timestamp: '2026-04-09T21:00:00Z'
oat_pause_reason: waiting on review
oat_workflow_mode: quick
oat_workflow_origin: native
oat_docs_updated: complete
oat_pr_status: open
oat_pr_url: https://example.com/pr/1
oat_project_created: '2026-04-08T17:16:52.421Z'
oat_project_completed: null
oat_project_state_updated: '2026-04-09T22:07:51Z'
oat_project_explainer:
  decision: generate
  source: kickoff_prompt
  decided_at: '2026-04-09T21:30:00Z'
oat_project_recap:
  decision: skip
  source: interactive
  decided_at: '2026-04-09T21:35:00-04:00'
oat_generated: false
oat_template: false
---
`;

    expect(parseStateFrontmatter(content)).toEqual({
      currentTask: 'p01-t03',
      lastCommit: 'abc1234',
      blockers: ['waiting on review'],
      hillCheckpoints: ['implement'],
      hillCompleted: ['discovery'],
      parallelExecution: true,
      phase: 'implement',
      phaseStatus: 'in_progress',
      executionMode: 'subagent-driven',
      lifecycle: 'paused',
      pauseTimestamp: '2026-04-09T21:00:00Z',
      pauseReason: 'waiting on review',
      workflowMode: 'quick',
      workflowOrigin: 'native',
      docsUpdated: 'complete',
      prStatus: 'open',
      prUrl: 'https://example.com/pr/1',
      projectCreated: '2026-04-08T17:16:52.421Z',
      projectCompleted: null,
      projectStateUpdated: '2026-04-09T22:07:51Z',
      projectExplainer: {
        decision: 'generate',
        source: 'kickoff_prompt',
        decided_at: '2026-04-09T21:30:00Z',
      },
      projectRecap: {
        decision: 'skip',
        source: 'interactive',
        decided_at: '2026-04-09T21:35:00-04:00',
      },
      generated: false,
      template: false,
    });
  });

  it('returns null/defaults for missing optional fields', () => {
    const content = `---
oat_phase: discovery
oat_phase_status: complete
oat_execution_mode: single-thread
oat_workflow_mode: spec-driven
---
`;

    expect(parseStateFrontmatter(content)).toEqual({
      currentTask: null,
      lastCommit: null,
      blockers: [],
      hillCheckpoints: [],
      hillCompleted: [],
      parallelExecution: false,
      phase: 'discovery',
      phaseStatus: 'complete',
      executionMode: 'single-thread',
      lifecycle: null,
      pauseTimestamp: null,
      pauseReason: null,
      workflowMode: 'spec-driven',
      workflowOrigin: null,
      docsUpdated: null,
      prStatus: null,
      prUrl: null,
      projectCreated: null,
      projectCompleted: null,
      projectStateUpdated: null,
      projectExplainer: null,
      projectRecap: null,
      generated: false,
      template: false,
    });
  });

  it('parses blockers and checkpoints from JSON strings', () => {
    const content = `---
oat_blockers: "[\\"blocked on API\\"]"
oat_hill_checkpoints: "[\\"p02\\",\\"p05\\"]"
oat_hill_completed: "[\\"p02\\"]"
oat_phase: plan
oat_phase_status: complete
oat_execution_mode: single-thread
oat_workflow_mode: import
---
`;

    expect(parseStateFrontmatter(content)).toMatchObject({
      blockers: ['blocked on API'],
      hillCheckpoints: ['p02', 'p05'],
      hillCompleted: ['p02'],
      phase: 'plan',
      phaseStatus: 'complete',
      executionMode: 'single-thread',
      workflowMode: 'import',
    });
  });

  it('parses lite workflow mode and rejects unknown workflow modes', () => {
    expect(
      parseStateFrontmatter(`---
oat_workflow_mode: lite
---
`),
    ).toMatchObject({ workflowMode: 'lite' });
    expect(
      parseStateFrontmatter(`---
oat_workflow_mode: bogus
---
`),
    ).toMatchObject({ workflowMode: null });
  });

  it('exports the complete ordered workflow mode list', () => {
    expect(WORKFLOW_MODES).toEqual(['spec-driven', 'quick', 'import', 'lite']);
  });

  it('parses complete lifecycle values when present', () => {
    const content = `---
oat_lifecycle: complete
oat_project_completed: '2026-04-09T23:00:00Z'
oat_phase: implement
oat_phase_status: complete
oat_execution_mode: single-thread
oat_workflow_mode: quick
---
`;

    expect(parseStateFrontmatter(content)).toMatchObject({
      lifecycle: 'complete',
      projectCompleted: '2026-04-09T23:00:00Z',
      phase: 'implement',
      phaseStatus: 'complete',
    });
  });

  it('preserves decomposition phase values for coordination parents', () => {
    const content = `---
oat_phase: decomposition
oat_phase_status: complete
oat_execution_mode: single-thread
oat_workflow_mode: quick
---
`;

    expect(parseStateFrontmatter(content)).toMatchObject({
      phase: 'decomposition',
      phaseStatus: 'complete',
      executionMode: 'single-thread',
      workflowMode: 'quick',
    });
  });

  it('accepts explicit null explainer decisions', () => {
    const content = `---
oat_project_explainer: null
oat_project_recap: null
---
`;

    expect(parseStateFrontmatter(content)).toMatchObject({
      projectExplainer: null,
      projectRecap: null,
    });
  });

  it.each([
    ['oat_project_explainer', 'generate', 'interactive', true],
    ['oat_project_explainer', 'skip', 'interactive', true],
    ['oat_project_explainer', 'generate', 'kickoff_prompt', true],
    ['oat_project_explainer', 'skip', 'kickoff_prompt', false],
    ['oat_project_explainer', 'generate', 'autonomous_policy', false],
    ['oat_project_explainer', 'skip', 'autonomous_policy', false],
    ['oat_project_recap', 'generate', 'interactive', true],
    ['oat_project_recap', 'skip', 'interactive', true],
    ['oat_project_recap', 'generate', 'kickoff_prompt', false],
    ['oat_project_recap', 'skip', 'kickoff_prompt', false],
    ['oat_project_recap', 'generate', 'autonomous_policy', true],
    ['oat_project_recap', 'skip', 'autonomous_policy', false],
  ] as const)(
    'parses only allowed %s %s/%s decisions',
    (key, decision, source, expectedValid) => {
      const parsed = parseStateFrontmatter(`---
${key}:
  decision: ${decision}
  source: ${source}
  decided_at: '2026-04-09T21:30:00Z'
---
`);
      const product =
        key === 'oat_project_explainer'
          ? parsed.projectExplainer
          : parsed.projectRecap;

      expect(product === null).toBe(!expectedValid);
    },
  );

  it.each([
    [
      'unknown key',
      `oat_project_explainer:
  decision: generate
  source: interactive
  decided_at: '2026-04-09T21:30:00Z'
  extra: nope`,
    ],
    [
      'invalid source',
      `oat_project_explainer:
  decision: generate
  source: workflow_preference
  decided_at: '2026-04-09T21:30:00Z'`,
    ],
    [
      'invalid decision',
      `oat_project_explainer:
  decision: ask
  source: interactive
  decided_at: '2026-04-09T21:30:00Z'`,
    ],
    [
      'invalid timestamp',
      `oat_project_explainer:
  decision: generate
  source: interactive
  decided_at: yesterday`,
    ],
  ])('normalizes an %s record to null', (_label, frontmatter) => {
    expect(
      parseStateFrontmatter(`---
${frontmatter}
---
`),
    ).toMatchObject({ projectExplainer: null });
  });

  it('treats template placeholders and malformed YAML as empty/default values', () => {
    const placeholderContent = `---
oat_hill_checkpoints: { OAT_HILL_CHECKPOINTS }
oat_phase: { OAT_PHASE }
oat_workflow_mode: { OAT_WORKFLOW_MODE }
oat_template: true
---
`;

    expect(parseStateFrontmatter(placeholderContent)).toMatchObject({
      hillCheckpoints: [],
      phase: null,
      workflowMode: null,
      template: true,
    });

    const malformedContent = `---
oat_phase: [unterminated
---
`;

    expect(parseStateFrontmatter(malformedContent)).toEqual({
      currentTask: null,
      lastCommit: null,
      blockers: [],
      hillCheckpoints: [],
      hillCompleted: [],
      parallelExecution: false,
      phase: null,
      phaseStatus: null,
      executionMode: 'single-thread',
      lifecycle: null,
      pauseTimestamp: null,
      pauseReason: null,
      workflowMode: null,
      workflowOrigin: null,
      docsUpdated: null,
      prStatus: null,
      prUrl: null,
      projectCreated: null,
      projectCompleted: null,
      projectStateUpdated: null,
      projectExplainer: null,
      projectRecap: null,
      generated: false,
      template: false,
    });
  });
});
