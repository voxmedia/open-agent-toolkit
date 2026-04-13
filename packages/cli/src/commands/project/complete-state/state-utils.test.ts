import { describe, expect, it } from 'vitest';

import { renderCompletedProjectState } from './state-utils';

function buildStateInput(
  overrides: {
    frontmatter?: string[];
    progress?: string[];
  } = {},
): string {
  const frontmatter = overrides.frontmatter ?? [
    'oat_current_task: p01-t01',
    'oat_phase: implement',
    'oat_phase_status: in_progress',
    'oat_project_completed: null',
    'oat_project_state_updated: "2026-04-13T18:17:21.000Z"',
    'oat_generated: false',
  ];
  const progress = overrides.progress ?? [
    '- ✓ Discovery completed',
    '- ✓ Quick-mode plan generated',
    '- ⧗ Executing `p01-t01`',
  ];

  return [
    '---',
    ...frontmatter,
    '---',
    '',
    '# Project State: project-complete-cli',
    '',
    '**Status:** In Progress',
    '**Started:** 2026-04-13',
    '**Last Updated:** 2026-04-13',
    '',
    '## Current Phase',
    '',
    'Implementation in progress.',
    '',
    '## Artifacts',
    '',
    '- **Discovery:** `discovery.md` (complete)',
    '- **Plan:** `plan.md` (complete)',
    '- **Implementation:** `implementation.md` (in progress)',
    '',
    '## Progress',
    '',
    ...progress,
    '',
    '## Blockers',
    '',
    'None',
    '',
    '## Next Milestone',
    '',
    'Complete `p01-t01`: codify the canonical completed `state.md` contract in tests.',
    '',
  ].join('\n');
}

describe('renderCompletedProjectState', () => {
  it('renders the canonical completed state.md contract', () => {
    const output = renderCompletedProjectState(buildStateInput(), {
      archived: false,
      nowUtc: '2026-04-13T21:55:00Z',
      today: '2026-04-13',
    });

    expect(output).toContain('oat_lifecycle: complete');
    expect(output).toContain('oat_project_completed: "2026-04-13T21:55:00Z"');
    expect(output).toContain(
      'oat_project_state_updated: "2026-04-13T21:55:00Z"',
    );
    expect(output).toContain('**Status:** Complete');
    expect(output).toContain('**Last Updated:** 2026-04-13');
    expect(output).toContain('## Current Phase\n\nLifecycle complete\n');
    expect(output).toContain('## Next Milestone\n\nNone. Project complete.\n');
    expect(output).toContain('- ✓ Discovery completed');
    expect(output).toContain('- ✓ Quick-mode plan generated');
    expect(output).toContain('- ✓ Project lifecycle complete');
    expect(output).not.toContain('- ⧗ Executing `p01-t01`');
  });

  it('updates an existing oat_lifecycle field instead of duplicating it', () => {
    const output = renderCompletedProjectState(
      buildStateInput({
        frontmatter: [
          'oat_current_task: p01-t01',
          'oat_phase: implement',
          'oat_phase_status: in_progress',
          'oat_lifecycle: active',
          'oat_project_completed: null',
          'oat_project_state_updated: "2026-04-13T18:17:21.000Z"',
          'oat_generated: false',
        ],
      }),
      {
        archived: false,
        nowUtc: '2026-04-13T21:55:00Z',
        today: '2026-04-13',
      },
    );

    expect(output.match(/^oat_lifecycle: complete$/gm)).toHaveLength(1);
    expect(output).not.toContain('oat_lifecycle: active');
  });

  it('adds the lifecycle progress bullet once when no completed progress exists', () => {
    const output = renderCompletedProjectState(
      buildStateInput({
        progress: ['- ⧗ Executing `p01-t01`'],
      }),
      {
        archived: false,
        nowUtc: '2026-04-13T21:55:00Z',
        today: '2026-04-13',
      },
    );

    expect(output).toContain('## Progress\n\n- ✓ Project lifecycle complete\n');
    expect(output.match(/- ✓ Project lifecycle complete/g)).toHaveLength(1);
  });

  it('renders archived completion text when the project was archived locally', () => {
    const output = renderCompletedProjectState(buildStateInput(), {
      archived: true,
      nowUtc: '2026-04-13T21:55:00Z',
      today: '2026-04-13',
    });

    expect(output).toContain(
      '## Current Phase\n\nLifecycle complete; archived locally\n',
    );
  });
});
