import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  assertValidProjectStateFilesystemContent,
  assertValidProjectStateContent,
  validateProjectState,
} from './project-state';

function stateContent(frontmatter: Record<string, unknown>): string {
  return [
    '---',
    ...Object.entries(frontmatter).map(([key, value]) =>
      Array.isArray(value)
        ? `${key}: [${value.join(', ')}]`
        : `${key}: ${String(value)}`,
    ),
    '---',
    '',
    '# State',
    '',
  ].join('\n');
}

describe('validateProjectState - coordination additions', () => {
  it('accepts oat_kind: coordination on a project state', () => {
    expect(
      validateProjectState({
        frontmatter: {
          oat_kind: 'coordination',
          oat_phase: 'discovery',
          oat_phase_status: 'in_progress',
        },
      }),
    ).toMatchObject({ ok: true });
  });

  it('accepts oat_phase: decomposition only when oat_kind == coordination', () => {
    expect(
      validateProjectState({
        frontmatter: {
          oat_kind: 'coordination',
          oat_phase: 'decomposition',
          oat_phase_status: 'complete',
        },
      }),
    ).toMatchObject({ ok: true });
  });

  it('rejects oat_phase: decomposition on an implementation project', () => {
    const result = validateProjectState({
      frontmatter: {
        oat_kind: 'implementation',
        oat_phase: 'decomposition',
        oat_phase_status: 'complete',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'decomposition-requires-coordination',
      }),
    ]);
  });

  it('defaults oat_kind to implementation when absent', () => {
    const result = validateProjectState({
      frontmatter: {
        oat_phase: 'discovery',
        oat_phase_status: 'in_progress',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      state: {
        oat_kind: 'implementation',
      },
    });
  });

  it('throws a readable error when state.md content violates coordination rules', () => {
    const content = [
      '---',
      'oat_phase: decomposition',
      'oat_phase_status: complete',
      '---',
      '',
      '# State',
    ].join('\n');

    expect(() =>
      assertValidProjectStateContent(content, { filePath: 'state.md' }),
    ).toThrow(/oat_phase: decomposition requires oat_kind: coordination/);
  });
});

describe('child linkage validation', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('rejects oat_parent pointing to a non-coordination project', () => {
    const result = validateProjectState({
      slug: 'child-a',
      frontmatter: {
        oat_parent: 'parent',
        oat_siblings: ['child-b'],
        oat_depends_on: [],
      },
      relatedProjects: [
        {
          slug: 'parent',
          frontmatter: {
            oat_kind: 'implementation',
            oat_phase: 'discovery',
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'parent-not-coordination' }),
    ]);
  });

  it('rejects oat_parent that is absent from supplied related projects', () => {
    const result = validateProjectState({
      slug: 'child-a',
      frontmatter: {
        oat_parent: 'missing-parent',
        oat_siblings: [],
        oat_depends_on: [],
      },
      relatedProjects: [],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'parent-missing' }),
    ]);
  });

  it('rejects oat_depends_on slugs not in oat_siblings', () => {
    const result = validateProjectState({
      slug: 'child-a',
      frontmatter: {
        oat_parent: 'parent',
        oat_siblings: ['child-b'],
        oat_depends_on: ['missing-child'],
      },
      relatedProjects: [
        { slug: 'parent', frontmatter: { oat_kind: 'coordination' } },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'depends-on-non-sibling' }),
    ]);
  });

  it('rejects cycles across siblings depends_on', () => {
    const result = validateProjectState({
      slug: 'child-a',
      frontmatter: {
        oat_parent: 'parent',
        oat_siblings: ['child-b'],
        oat_depends_on: ['child-b'],
      },
      relatedProjects: [
        { slug: 'parent', frontmatter: { oat_kind: 'coordination' } },
        {
          slug: 'child-b',
          frontmatter: {
            oat_parent: 'parent',
            oat_siblings: ['child-a'],
            oat_depends_on: ['child-a'],
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'sibling-dependency-cycle' }),
    ]);
  });

  it('rejects child discovery oat_status: complete while oat_inherited_context_revalidated is false', () => {
    const result = validateProjectState({
      frontmatter: {
        oat_parent: 'parent',
        oat_status: 'complete',
        oat_inherited_context_revalidated: false,
      },
      relatedProjects: [
        { slug: 'parent', frontmatter: { oat_kind: 'coordination' } },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'inherited-context-revalidation-required',
      }),
    ]);
  });

  it('does NOT enforce the revalidated flag when oat_parent is absent (ordinary discovery untouched)', () => {
    const result = validateProjectState({
      frontmatter: {
        oat_status: 'complete',
        oat_inherited_context_revalidated: false,
      },
    });

    expect(result).toMatchObject({ ok: true });
  });

  it('filesystem validation rejects a missing parent project directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-state-validation-'));
    tempDirs.push(root);
    const projectsRoot = join(root, '.oat', 'projects', 'shared');
    const childPath = join(projectsRoot, 'child');
    await mkdir(childPath, { recursive: true });

    await expect(
      assertValidProjectStateFilesystemContent(
        stateContent({
          oat_parent: 'missing-parent',
        }),
        {
          filePath: join(childPath, 'discovery.md'),
          projectPath: childPath,
        },
      ),
    ).rejects.toThrow(/must reference an existing project/);
  });

  it('filesystem validation rejects a parent that is not coordination kind', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-state-validation-'));
    tempDirs.push(root);
    const projectsRoot = join(root, '.oat', 'projects', 'shared');
    const childPath = join(projectsRoot, 'child');
    const parentPath = join(projectsRoot, 'parent');
    await mkdir(childPath, { recursive: true });
    await mkdir(parentPath, { recursive: true });
    await writeFile(
      join(parentPath, 'state.md'),
      stateContent({ oat_kind: 'implementation' }),
      'utf8',
    );

    await expect(
      assertValidProjectStateFilesystemContent(
        stateContent({
          oat_parent: 'parent',
        }),
        {
          filePath: join(childPath, 'discovery.md'),
          projectPath: childPath,
        },
      ),
    ).rejects.toThrow(/must reference a coordination project/);
  });
});
