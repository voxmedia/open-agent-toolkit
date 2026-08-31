import { describe, expect, it } from 'vitest';

import { resolveLocalProjection } from './local-projection';

const observedAt = '2026-08-31T12:00:00.000Z';

describe('resolveLocalProjection', () => {
  it('projects only backlog title, priority, and the explicit Description section', () => {
    const result = resolveLocalProjection({
      target: {
        kind: 'backlog',
        path: '.oat/repo/pjm/backlog/remote-sync.md',
        content: `---
id: remote-sync
title: Safe remote sync
priority: high
status: ready
---

# Safe remote sync

## Description

Publish this bounded summary.

### Acceptance details

Keep this subsection with the description.

## Implementation Notes

Never publish this section.
`,
      },
      observedAt,
    });

    expect(result).toMatchObject({
      title: 'Safe remote sync',
      description:
        'Publish this bounded summary.\n\n### Acceptance details\n\nKeep this subsection with the description.',
      priority: 'high',
      source: 'backlog-description',
      observedAt,
      evidence: {
        targetKind: 'backlog',
        sourcePath: '.oat/repo/pjm/backlog/remote-sync.md',
        selectedFields: [
          'frontmatter.title',
          'frontmatter.priority',
          'Description',
        ],
      },
    });
    expect(result.description).not.toContain('Implementation Notes');
    expect(result.sourceRevision).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('requires unambiguous backlog frontmatter and Description ownership', () => {
    expect(() =>
      resolveLocalProjection({
        target: {
          kind: 'backlog',
          path: 'bad.md',
          content: '## Description\n\nNo frontmatter.',
        },
        observedAt,
      }),
    ).toThrow(/frontmatter/i);
    expect(() =>
      resolveLocalProjection({
        target: {
          kind: 'backlog',
          path: 'duplicate.md',
          content:
            '---\ntitle: Duplicate\n---\n\n## Description\n\nOne\n\n## Description\n\nTwo\n',
        },
        observedAt,
      }),
    ).toThrow(/exactly one.*Description/i);
  });

  it('uses only an explicit project publication projection', () => {
    const result = resolveLocalProjection({
      target: {
        kind: 'project',
        path: '.oat/projects/shared/remote-project-management',
        publication: {
          title: 'Remote project management',
          description: 'A deliberately published project summary.',
          priority: 'medium',
        },
        artifacts: {
          discovery: 'PRIVATE DISCOVERY',
          spec: 'PRIVATE SPEC',
          design: 'PRIVATE DESIGN',
          plan: 'PRIVATE PLAN',
          implementation: 'PRIVATE IMPLEMENTATION',
          reviews: ['PRIVATE REVIEW'],
        },
      },
      observedAt,
    } as Parameters<typeof resolveLocalProjection>[0]);

    expect(result).toMatchObject({
      title: 'Remote project management',
      description: 'A deliberately published project summary.',
      priority: 'medium',
      source: 'explicit-project-publication',
      evidence: {
        targetKind: 'project',
        selectedFields: [
          'publication.title',
          'publication.description',
          'publication.priority',
        ],
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /PRIVATE (DISCOVERY|SPEC|DESIGN|PLAN|IMPLEMENTATION|REVIEW)/,
    );
  });

  it('makes source revisions deterministic and sensitive only to selected inputs', () => {
    const base = {
      target: {
        kind: 'project' as const,
        path: '.oat/projects/shared/example',
        publication: {
          title: 'Example',
          description: 'Summary',
          priority: null,
        },
      },
      observedAt,
    };
    const first = resolveLocalProjection(base);
    const second = resolveLocalProjection({
      ...base,
      observedAt: '2026-08-31T13:00:00.000Z',
    });
    const changed = resolveLocalProjection({
      ...base,
      target: {
        ...base.target,
        publication: { ...base.target.publication, description: 'Changed' },
      },
    });

    expect(second.sourceRevision).toBe(first.sourceRevision);
    expect(changed.sourceRevision).not.toBe(first.sourceRevision);
  });
});
