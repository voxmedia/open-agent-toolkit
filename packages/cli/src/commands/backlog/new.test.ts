import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { initializeBacklog } from './init';
import { createBacklogItem } from './new';
import { regenerateBacklogIndex } from './regenerate-index';

const REPO_ROOT = resolve(process.cwd(), '..', '..');
const REPO_TEMPLATES_ROOT = join(REPO_ROOT, '.oat', 'templates');
const BUNDLED_ASSETS_ROOT = join(REPO_ROOT, 'packages', 'cli', 'assets');
const CREATED_AT = '2026-07-14T01:23:45.678Z';

function parseFrontmatter(content: string): Record<string, unknown> {
  const block = getFrontmatterBlock(content);
  expect(block).not.toBeNull();
  return YAML.parse(block!) as Record<string, unknown>;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('createBacklogItem', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function createTempRoot(): Promise<{
    root: string;
    backlogRoot: string;
  }> {
    const root = await mkdtemp(join(tmpdir(), 'oat-backlog-new-'));
    tempDirs.push(root);
    return {
      root,
      backlogRoot: join(root, '.oat', 'repo', 'pjm', 'backlog'),
    };
  }

  it('uses the real repo template, initializes the scaffold, and writes canonical defaults', async () => {
    const { backlogRoot } = await createTempRoot();

    const result = await createBacklogItem({
      backlogRoot,
      assetsRoot: BUNDLED_ASSETS_ROOT,
      templatesRoot: REPO_TEMPLATES_ROOT,
      title: 'Streaming Cache Layer',
      createdAt: CREATED_AT,
    });

    expect(result).toMatchObject({
      id: 'BL-260714-streaming-cache-layer',
      backlogRoot,
      filePath: join(
        backlogRoot,
        'items',
        'BL-260714-streaming-cache-layer.md',
      ),
      templatePath: join(REPO_TEMPLATES_ROOT, 'backlog-item.md'),
      index: { itemCount: 1, warnings: [] },
    });

    const content = await readFile(result.filePath, 'utf8');
    const frontmatter = parseFrontmatter(content);
    expect(frontmatter).toEqual({
      id: 'BL-260714-streaming-cache-layer',
      title: 'Streaming Cache Layer',
      status: 'open',
      priority: 'medium',
      scope: 'task',
      scope_estimate: null,
      labels: [],
      assignee: null,
      created: CREATED_AT,
      updated: CREATED_AT,
      associated_issues: [],
      external_plans: [],
    });
    expect(content).not.toContain('oat_template:');
    expect(content).not.toContain('oat_template_name:');
    expect(content).toContain(
      '{Describe the problem, request, or capability tracked by this backlog item.}',
    );
    expect(content).toContain('- {Outcome 1}\n- {Outcome 2}');

    const indexPath = join(backlogRoot, 'index.md');
    const firstIndex = await readFile(indexPath, 'utf8');
    const curated = firstIndex.match(
      /## Curated Overview[\s\S]*?(?=<!-- OAT BACKLOG-INDEX -->)/,
    )?.[0];
    expect(curated).toContain(
      '- Add brief narrative summaries here as backlog items are created and reprioritized.',
    );
    expect(firstIndex).toContain(
      '| BL-260714-streaming-cache-layer | Streaming Cache Layer | open | medium | task |  |',
    );

    await regenerateBacklogIndex(backlogRoot);
    await expect(readFile(indexPath, 'utf8')).resolves.toBe(firstIndex);
  });

  it('falls back to the actual bundled template when the repo template is absent', async () => {
    const { root, backlogRoot } = await createTempRoot();
    const missingTemplatesRoot = join(root, 'missing-templates');

    const result = await createBacklogItem({
      backlogRoot,
      assetsRoot: BUNDLED_ASSETS_ROOT,
      templatesRoot: missingTemplatesRoot,
      title: 'Bundled Fallback',
      createdAt: CREATED_AT,
    });

    expect(result.templatePath).toBe(
      join(BUNDLED_ASSETS_ROOT, 'templates', 'backlog-item.md'),
    );
    const content = await readFile(result.filePath, 'utf8');
    expect(content).toContain('## Acceptance Criteria');
    expect(content).not.toContain('oat_template');
  });

  it('round-trips YAML-significant values and preserves literal body content', async () => {
    const { backlogRoot } = await createTempRoot();
    const title = "Parser's edge: #ready";
    const description = 'Keep `#literal: value`, $&, and {body} exactly.';

    const result = await createBacklogItem({
      backlogRoot,
      assetsRoot: BUNDLED_ASSETS_ROOT,
      templatesRoot: REPO_TEMPLATES_ROOT,
      title,
      priority: 'high',
      scope: 'feature',
      scopeEstimate: 'L',
      labels: ["owner's", 'api:edge', '#ready'],
      description,
      createdAt: CREATED_AT,
    });

    const content = await readFile(result.filePath, 'utf8');
    expect(parseFrontmatter(content)).toMatchObject({
      title,
      priority: 'high',
      scope: 'feature',
      scope_estimate: 'L',
      labels: ["owner's", 'api:edge', '#ready'],
    });
    expect(content).toContain(`## Description\n\n${description}`);
    expect(content).toContain('- {Outcome 1}\n- {Outcome 2}');
  });

  it.each([
    ['blank title', { title: '   ' }],
    ['invalid timestamp', { title: 'Demo', createdAt: 'not-a-date' }],
    ['invalid priority', { title: 'Demo', priority: 'critical' }],
    ['invalid scope', { title: 'Demo', scope: 'epic' }],
    ['invalid estimate', { title: 'Demo', scopeEstimate: 'Huge' }],
    ['empty label', { title: 'Demo', labels: ['api', ''] }],
    ['blank description', { title: 'Demo', description: '   ' }],
  ])(
    'rejects %s before mutating an absent scaffold',
    async (_name, overrides) => {
      const { backlogRoot } = await createTempRoot();

      await expect(
        createBacklogItem({
          backlogRoot,
          assetsRoot: BUNDLED_ASSETS_ROOT,
          templatesRoot: REPO_TEMPLATES_ROOT,
          createdAt: CREATED_AT,
          ...overrides,
        }),
      ).rejects.toThrow();

      await expect(pathExists(backlogRoot)).resolves.toBe(false);
    },
  );

  it('preserves an existing scaffold byte-for-byte for invalid input', async () => {
    const { backlogRoot } = await createTempRoot();
    await initializeBacklog(backlogRoot);
    const indexPath = join(backlogRoot, 'index.md');
    const existingPath = join(backlogRoot, 'items', 'existing.md');
    await writeFile(existingPath, 'existing bytes\n', 'utf8');
    const beforeIndex = await readFile(indexPath, 'utf8');

    await expect(
      createBacklogItem({
        backlogRoot,
        assetsRoot: BUNDLED_ASSETS_ROOT,
        templatesRoot: REPO_TEMPLATES_ROOT,
        title: 'Invalid Existing',
        priority: 'critical',
        createdAt: CREATED_AT,
      }),
    ).rejects.toThrow(/priority/i);

    await expect(readFile(existingPath, 'utf8')).resolves.toBe(
      'existing bytes\n',
    );
    await expect(readFile(indexPath, 'utf8')).resolves.toBe(beforeIndex);
  });

  it('rejects active collisions without changing existing item or index bytes', async () => {
    const { backlogRoot } = await createTempRoot();
    await initializeBacklog(backlogRoot);
    const itemPath = join(backlogRoot, 'items', 'BL-260714-collision.md');
    const indexPath = join(backlogRoot, 'index.md');
    await writeFile(itemPath, 'existing item bytes\n', 'utf8');
    const beforeIndex = await readFile(indexPath, 'utf8');

    await expect(
      createBacklogItem({
        backlogRoot,
        assetsRoot: BUNDLED_ASSETS_ROOT,
        templatesRoot: REPO_TEMPLATES_ROOT,
        title: 'Collision',
        createdAt: CREATED_AT,
      }),
    ).rejects.toThrow(/already exists/);

    await expect(readFile(itemPath, 'utf8')).resolves.toBe(
      'existing item bytes\n',
    );
    await expect(readFile(indexPath, 'utf8')).resolves.toBe(beforeIndex);
  });

  it('rejects archived collisions without creating an active item', async () => {
    const { backlogRoot } = await createTempRoot();
    await initializeBacklog(backlogRoot);
    const archivedPath = join(
      backlogRoot,
      'archived',
      'BL-260714-collision.md',
    );
    await writeFile(archivedPath, 'archived bytes\n', 'utf8');

    await expect(
      createBacklogItem({
        backlogRoot,
        assetsRoot: BUNDLED_ASSETS_ROOT,
        templatesRoot: REPO_TEMPLATES_ROOT,
        title: 'Collision',
        createdAt: CREATED_AT,
      }),
    ).rejects.toThrow(/already exists/);

    await expect(
      pathExists(join(backlogRoot, 'items', 'BL-260714-collision.md')),
    ).resolves.toBe(false);
    await expect(readFile(archivedPath, 'utf8')).resolves.toBe(
      'archived bytes\n',
    );
  });

  it('rolls back only the new item and restores exact index bytes on regeneration failure', async () => {
    const { backlogRoot } = await createTempRoot();
    await initializeBacklog(backlogRoot);
    const indexPath = join(backlogRoot, 'index.md');
    const existingPath = join(backlogRoot, 'items', 'existing.md');
    await writeFile(existingPath, 'existing bytes\n', 'utf8');
    await writeFile(
      indexPath,
      (await readFile(indexPath, 'utf8')).replace(
        '- Add brief narrative summaries here as backlog items are created and reprioritized.',
        '- Preserve this curated overview byte-for-byte.',
      ),
      'utf8',
    );
    const beforeIndex = await readFile(indexPath, 'utf8');

    await expect(
      createBacklogItem(
        {
          backlogRoot,
          assetsRoot: BUNDLED_ASSETS_ROOT,
          templatesRoot: REPO_TEMPLATES_ROOT,
          title: 'Rollback',
          createdAt: CREATED_AT,
        },
        {
          regenerateBacklogIndex: async () => {
            await writeFile(indexPath, 'partially changed\n', 'utf8');
            throw new Error('forced index failure');
          },
        },
      ),
    ).rejects.toThrow('forced index failure');

    await expect(
      pathExists(join(backlogRoot, 'items', 'BL-260714-rollback.md')),
    ).resolves.toBe(false);
    await expect(readFile(existingPath, 'utf8')).resolves.toBe(
      'existing bytes\n',
    );
    await expect(readFile(indexPath, 'utf8')).resolves.toBe(beforeIndex);
  });
});
