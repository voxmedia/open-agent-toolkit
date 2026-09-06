import { execFile } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import {
  getPackMemberNames,
  PACK_MANIFEST,
} from '@commands/tools/shared/pack-manifest';
import { afterEach, describe, expect, it } from 'vitest';

import { validateChangedSkillVersionBumps, validateOatSkills } from './skills';

const execFileAsync = promisify(execFile);

async function createSkillFile(
  root: string,
  dirName: string,
  content: string,
): Promise<string> {
  const skillDir = join(root, '.agents', 'skills', dirName);
  await mkdir(skillDir, { recursive: true });
  const skillPath = join(skillDir, 'SKILL.md');
  await writeFile(skillPath, content, 'utf8');
  return skillPath;
}

function validSkillContent(skillName: string): string {
  return [
    '---',
    `name: ${skillName}`,
    'description: Use when validating oat skill structure. Provides a valid fixture for validator tests.',
    'disable-model-invocation: true',
    'user-invocable: true',
    'allowed-tools: Read, Write',
    '---',
    '',
    '# Demo',
    '',
    '## Progress Indicators (User-Facing)',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ' OAT ▸ DEMO',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
}

function validGateableSkillContent(skillName: string): string {
  return [
    '---',
    `name: ${skillName}`,
    'description: Use when validating oat skill structure. Provides a valid fixture for validator tests.',
    'disable-model-invocation: true',
    'user-invocable: true',
    'allowed-tools: Read, Write',
    'oat_gateable: true',
    '---',
    '',
    '# Demo',
    '',
    '## Progress Indicators (User-Facing)',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ' OAT ▸ DEMO',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
}

async function createSyncedBookkeepingInventory(
  root: string,
  entries: Array<{
    file: string;
    anchor: string;
    guard?: string;
    kind: string;
  }>,
): Promise<string> {
  const inventoryPath = join(
    root,
    'packages',
    'cli',
    'src',
    'validation',
    'synced-bookkeeping-sites.json',
  );
  await mkdir(join(inventoryPath, '..'), { recursive: true });
  await writeFile(
    inventoryPath,
    `${JSON.stringify(entries, null, 2)}\n`,
    'utf8',
  );
  return inventoryPath;
}

function currentSkillContent(
  skillName: string,
  version: string,
  body: string,
): string {
  return [
    '---',
    `name: ${skillName}`,
    `version: ${version}`,
    'description: Use when validating oat skill structure. Provides a valid fixture for validator tests.',
    'disable-model-invocation: true',
    'user-invocable: true',
    'allowed-tools: Read, Write',
    '---',
    '',
    '# Demo',
    '',
    '## Progress Indicators (User-Facing)',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ' OAT ▸ DEMO',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    body,
  ].join('\n');
}

const implementSkillPath = '.agents/skills/oat-project-implement/SKILL.md';

function sliceFromLastGateExecutionHeading(
  content: string,
  skillName: string,
): string {
  const headings = [...content.matchAll(/^###[^\n]*Gate Execution[^\n]*$/gm)];
  const heading = headings.at(-1);
  expect(heading, `${skillName} gate execution heading`).toBeDefined();
  return content.slice(heading!.index);
}
const implementReferencePaths = [
  'dispatch-and-dry-run.md',
  'plan-and-resume.md',
  'phase-execution.md',
  'completion-and-closeout.md',
] as const;

async function readRawRepoFile(relativePath: string): Promise<string> {
  return readFile(join(process.cwd(), '..', '..', relativePath), 'utf8');
}

async function readRepoFile(relativePath: string): Promise<string> {
  const content = await readRawRepoFile(relativePath);
  if (relativePath !== implementSkillPath) {
    return content;
  }
  const successIndex = content.indexOf('## Success Criteria');
  const references = await Promise.all(
    implementReferencePaths.map((path) =>
      readRawRepoFile(
        `.agents/skills/oat-project-implement/references/${path}`,
      ),
    ),
  );
  return [
    content.slice(0, successIndex),
    ...references,
    content.slice(successIndex),
  ].join('\n\n');
}

function getFrontmatterForTest(content: string): string {
  return content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
}

const artifactHygieneContract =
  "Artifact hygiene contract: Before finishing or committing, format every file you created or edited. Use the concrete write/fix formatting command supplied by the governing plan, task, or brief. If none is usable, discover the repository's documented write/fix command from applicable `AGENTS.md`/`CLAUDE.md` instructions and relevant package manifests; do not infer or hardcode a formatter. Prefer a file-scoped invocation when supported, and avoid rewriting unrelated files. If no command is discoverable, warn once with `no format command discovered in repo instructions; skipping`, then continue.";

function extractArtifactHygieneContract(content: string): string {
  const start = content.indexOf('Artifact hygiene contract:');
  const end = content.indexOf('\n\n', start);
  return content
    .slice(start, end === -1 ? undefined : end)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fenced code blocks, in order. Contract snippets are executed one block at a
 * time, so a safety preamble only protects the block it appears in.
 */
function fencedBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  let current: string[] | null = null;
  let fenceChar = '';
  let fenceLength = 0;

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    const marker = /^(`{3,}|~{3,})(.*)$/.exec(trimmed);
    if (current === null) {
      if (marker) {
        fenceChar = marker[1]![0]!;
        fenceLength = marker[1]!.length;
        current = [];
      }
      continue;
    }
    // CommonMark: a closer is a line of only fence characters, of the same kind
    // and at least as long as the opener. Requiring an exact length would let a
    // longer closer merge a guarded block into an unguarded one.
    const closes =
      marker !== null &&
      marker[1]![0] === fenceChar &&
      marker[1]!.length >= fenceLength &&
      marker[2]!.trim() === '';
    if (closes) {
      blocks.push(current.join('\n'));
      current = null;
      continue;
    }
    current.push(line);
  }

  // An unterminated block still carries instructions a runtime would execute.
  if (current !== null) blocks.push(current.join('\n'));

  return blocks;
}

describe('validateOatSkills', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
    tempDirs.length = 0;
  });

  it('reports missing SKILL.md', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills', 'oat-missing'), {
      recursive: true,
    });

    const result = await validateOatSkills(root);
    expect(result.validatedSkillCount).toBe(1);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: join(root, '.agents', 'skills', 'oat-missing', 'SKILL.md'),
        message: 'Missing SKILL.md',
      }),
    ]);
  });

  it('reports missing frontmatter block', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-no-frontmatter',
      '# demo\n\nbody',
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message: 'Missing frontmatter block (--- ... ---)',
      }),
    ]);
  });

  it('reports missing required frontmatter keys', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-missing-keys',
      [
        '---',
        'name: oat-missing-keys',
        'description: Use when validating missing frontmatter keys. Provides fixture content for required-key checks.',
        'disable-model-invocation: true',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message: 'Missing frontmatter key: user-invocable',
      }),
      expect.objectContaining({
        file: skillPath,
        message: 'Missing frontmatter key: allowed-tools',
      }),
    ]);
  });

  it('reports missing Progress Indicators heading', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-no-progress-heading',
      [
        '---',
        'name: oat-no-progress-heading',
        'description: Use when validating missing progress heading behavior. Provides fixture content for heading checks.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message:
          'Missing section heading: ## Progress Indicators (User-Facing)',
      }),
    ]);
  });

  it('reports missing banner snippet when heading exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-no-banner',
      [
        '---',
        'name: oat-no-banner',
        'description: Use when validating banner requirements. Provides fixture content for banner checks.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        'No banner here',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message:
          'Progress Indicators section missing banner snippet (separator lines + "OAT ▸ ...")',
      }),
    ]);
  });

  it('passes for valid oat-* skills and ignores non-oat directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-valid-one',
      validSkillContent('oat-valid-one'),
    );
    await createSkillFile(
      root,
      'oat-valid-two',
      validSkillContent('oat-valid-two'),
    );
    await createSkillFile(root, 'non-oat-dir', '# ignored');

    const result = await validateOatSkills(root);
    expect(result.validatedSkillCount).toBe(2);
    expect(result.findings).toEqual([]);
  });

  it('rejects staging a path under the synced project tree', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-synced-stage',
      `${validSkillContent('oat-synced-stage')}\n\n\`\`\`bash\ngit add -- .oat/projects/synced/demo/state.md\n\`\`\`\n`,
    );

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: skillPath,
      message: expect.stringMatching(
        /^Line \d+: Never stage a path under \.oat\/projects\/synced\//,
      ),
    });
  });

  it('rejects jq parsing and json mode for project scope in skill references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-scope-json',
      validSkillContent('oat-scope-json'),
    );
    const referenceDir = join(
      root,
      '.agents',
      'skills',
      'oat-scope-json',
      'references',
    );
    await mkdir(referenceDir, { recursive: true });
    const referencePath = join(referenceDir, 'unsafe.md');
    await writeFile(
      referencePath,
      [
        '```bash',
        'PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --json | jq -r .scope)',
        '```',
      ].join('\n'),
      'utf8',
    );

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: referencePath,
      message: expect.stringMatching(
        /^Line \d+: Resolve project scope with --format value; do not parse --json or pipe into jq$/,
      ),
    });
  });

  it('accepts a project-artifact commit guarded in the same fenced block', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-project-guarded',
      `${validSkillContent('oat-project-guarded')}\n\n\`\`\`bash\nPROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1\nif [[ "$PROJECT_SCOPE" == "synced" ]]; then\n  oat project push "$PROJECT_PATH" --message "chore(oat): persist artifacts" || exit 1\nelse\n  git add "$PROJECT_PATH/state.md"\n  git commit -m "chore(oat): persist artifacts"\nfi\n\`\`\`\n`,
    );

    const result = await validateOatSkills(root);

    expect(result.findings).toEqual([]);
  });

  it('rejects a status-blind synced push JSON receipt', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-status-blind-push',
      `${validSkillContent('oat-project-status-blind-push')}\n\n\`\`\`bash\nPROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1\nif [[ "$PROJECT_SCOPE" == "synced" ]]; then\n  PUSH_OUTPUT=$(oat project push "$PROJECT_PATH" --message "chore(oat): persist artifacts" --json) || exit 1\n  PUSH_SHA=$(printf '%s\\n' "$PUSH_OUTPUT" | jq -r .sha)\nfi\n\`\`\`\n`,
    );

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: skillPath,
      message: expect.stringMatching(
        /^Line \d+: Synced push JSON receipt must validate status as pushed or up-to-date and require a full SHA before use$/,
      ),
    });
  });

  it('rejects SHA extraction before synced push receipt validation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-prevalidated-sha',
      `${validSkillContent('oat-project-prevalidated-sha')}\n\n\`\`\`bash\nPROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1\nif [[ "$PROJECT_SCOPE" == "synced" ]]; then\n  PUSH_OUTPUT=$(oat project push "$PROJECT_PATH" --message "chore(oat): persist artifacts" --json) || exit 1\n  PUSH_SHA=$(printf '%s\\n' "$PUSH_OUTPUT" | jq -r .sha)\n  PUSH_SHA=$(parse_synced_push_receipt "$PUSH_OUTPUT") || exit 1\nfi\n\`\`\`\n`,
    );

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: skillPath,
      message: expect.stringMatching(
        /^Line \d+: Synced push JSON receipt must not extract or use \.sha before parse_synced_push_receipt validation$/,
      ),
    });
  });

  it('accepts SHA use after synced push receipt validation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-project-validated-sha',
      `${validSkillContent('oat-project-validated-sha')}\n\n\`\`\`bash\nPROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1\nif [[ "$PROJECT_SCOPE" == "synced" ]]; then\n  PUSH_OUTPUT=$(oat project push "$PROJECT_PATH" --message "chore(oat): persist artifacts" --json) || exit 1\n  PUSH_SHA=$(parse_synced_push_receipt "$PUSH_OUTPUT") || exit 1\n  printf '%s\\n' "$PUSH_SHA"\nfi\n\`\`\`\n`,
    );

    const result = await validateOatSkills(root);

    expect(result.findings).toEqual([]);
  });

  it('rejects a project push without explicit nonzero handling', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-unhandled-push',
      `${validSkillContent('oat-project-unhandled-push')}\n\n\`\`\`bash\nPROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1\nif [[ "$PROJECT_SCOPE" == "synced" ]]; then\n  oat project push "$PROJECT_PATH" --message "chore(oat): persist artifacts"\nfi\n\`\`\`\n`,
    );

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: skillPath,
      message: expect.stringMatching(
        /^Line \d+: Project push must handle a nonzero exit explicitly and stop bookkeeping$/,
      ),
    });
  });

  it('rejects an unguarded project-artifact commit in a lifecycle skill', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-unguarded',
      `${validSkillContent('oat-project-unguarded')}\n\n\`\`\`bash\ngit add "$PROJECT_PATH/plan.md" "$PROJECT_PATH/implementation.md"\ngit commit -m "chore(oat): record review findings"\n\`\`\`\n`,
    );

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: skillPath,
      message: expect.stringMatching(
        /^Line \d+: Project-artifact git writes require an oat project scope --format value guard earlier in the same fenced block$/,
      ),
    });
  });

  it('rejects a shared fallback that hides project-scope resolution failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-fallback',
      `${validSkillContent('oat-project-fallback')}\n\n\`\`\`bash\nPROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value 2>/dev/null || echo shared)\n\`\`\`\n`,
    );

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: skillPath,
      message: expect.stringMatching(
        /^Line \d+: Project scope resolution must fail closed; do not fall back to shared$/,
      ),
    });
  });

  it('reports a stale synced-bookkeeping inventory anchor', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-inventory',
      validSkillContent('oat-project-inventory'),
    );
    const inventoryPath = await createSyncedBookkeepingInventory(root, [
      {
        file: '.agents/skills/oat-project-inventory/SKILL.md',
        anchor: 'oat project push "$PROJECT_PATH" --message "missing"',
        guard: 'project-scope',
        kind: 'write',
      },
    ]);

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: inventoryPath,
      message: `Stale synced-bookkeeping inventory anchor in ${skillPath}: oat project push "$PROJECT_PATH" --message "missing"`,
    });
  });

  it('reports lifecycle project-artifact writers missing from the inventory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-uninventoried',
      `${validSkillContent('oat-project-uninventoried')}\n\n\`\`\`bash\nPROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1\nif [[ "$PROJECT_SCOPE" == "synced" ]]; then\n  oat project push "$PROJECT_PATH" --message "chore(oat): persist artifacts"\nelse\n  git add "$PROJECT_PATH/state.md"\nfi\n\`\`\`\n`,
    );
    const inventoryPath = await createSyncedBookkeepingInventory(root, []);

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: inventoryPath,
      message: `Lifecycle project-artifact writer is missing from synced-bookkeeping inventory: ${skillPath}`,
    });
  });

  it('joins continued commands when inventorying project writers', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-continued-writer',
      `${validSkillContent('oat-project-continued-writer')}\n\n\`\`\`bash\nPROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1\nif [[ "$PROJECT_SCOPE" == "synced" ]]; then\n  oat project push \\\n    "$PROJECT_PATH" --message "chore(oat): persist artifacts"\nfi\n\`\`\`\n`,
    );
    const inventoryPath = await createSyncedBookkeepingInventory(root, []);

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: inventoryPath,
      message: `Lifecycle project-artifact writer is missing from synced-bookkeeping inventory: ${skillPath}`,
    });
  });

  it('recognizes array pathspecs as guarded project-artifact writes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-array-writer',
      `${validSkillContent('oat-project-array-writer')}\n\n\`\`\`bash\nPROJECT_OUTPUT_PATHS=("$PROJECT_PATH/state.md")\ngit add -- "\${PROJECT_OUTPUT_PATHS[@]}"\n\`\`\`\n`,
    );
    await createSyncedBookkeepingInventory(root, []);

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: skillPath,
      message: expect.stringMatching(
        /^Line \d+: Project-artifact git writes require an oat project scope --format value guard earlier in the same fenced block$/,
      ),
    });
  });

  it('recognizes nonstandard array pathspec names as project-artifact writes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-generic-array-writer',
      `${validSkillContent('oat-project-generic-array-writer')}\n\n\`\`\`bash\nARTIFACTS_TO_COMMIT=("$PROJECT_PATH/state.md")\ncommand git add -- "\${ARTIFACTS_TO_COMMIT[@]}"\n\`\`\`\n`,
    );
    await createSyncedBookkeepingInventory(root, []);

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: skillPath,
      message: expect.stringMatching(
        /^Line \d+: Project-artifact git writes require an oat project scope --format value guard earlier in the same fenced block$/,
      ),
    });
  });

  it('validates project push commands behind shell guards', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-compound-push',
      `${validSkillContent('oat-project-compound-push')}\n\n\`\`\`bash\nPROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1\n[[ "$PROJECT_SCOPE" == "synced" ]] && oat project push "$PROJECT_PATH" --message "persist"\n\`\`\`\n`,
    );
    await createSyncedBookkeepingInventory(root, []);

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: skillPath,
      message: expect.stringMatching(
        /^Line \d+: Project push must handle a nonzero exit explicitly and stop bookkeeping$/,
      ),
    });
  });

  it.each([
    ['git add -A', 'broad git add -A is forbidden'],
    ['if command git add -A; then :; fi', 'broad git add -A is forbidden'],
    ['git add -- "$PROJECT_PATH"', 'not the project directory or a glob'],
    ['git add -- "$PROJECT_PATH/**"', 'not the project directory or a glob'],
  ])('rejects broad project staging: %s', async (writer, message) => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-broad-writer',
      `${validSkillContent('oat-project-broad-writer')}\n\n\`\`\`bash\nPROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1\n${writer}\n\`\`\`\n`,
    );
    await createSyncedBookkeepingInventory(root, []);

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: skillPath,
      message: expect.stringMatching(new RegExp(`^Line \\d+: .*${message}`)),
    });
  });

  it('reports an inventoried writer whose companion guard is outside its fenced block', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const writer =
      'oat project push "$PROJECT_PATH" --message "chore(oat): persist artifacts"';
    const guard =
      'PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1';
    const skillPath = await createSkillFile(
      root,
      'oat-project-separated-guard',
      `${validSkillContent('oat-project-separated-guard')}\n\n\`\`\`bash\n${guard}\n\`\`\`\n\n\`\`\`bash\n${writer}\n\`\`\`\n`,
    );
    const inventoryPath = await createSyncedBookkeepingInventory(root, [
      {
        file: '.agents/skills/oat-project-separated-guard/SKILL.md',
        anchor: writer,
        guard: 'project-scope',
        kind: 'write',
      },
    ]);

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: inventoryPath,
      message: `Synced-bookkeeping write site lacks its companion guard in the same function or fenced block: ${skillPath}: ${writer}`,
    });
  });

  it('reports a second writer site in an already inventoried lifecycle file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const guard =
      'PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1';
    const firstWriter =
      'oat project push "$PROJECT_PATH" --message "chore(oat): persist first"';
    const secondWriter =
      'oat project push "$PROJECT_PATH" --message "chore(oat): persist second"';
    const skillPath = await createSkillFile(
      root,
      'oat-project-second-writer',
      `${validSkillContent('oat-project-second-writer')}\n\n\`\`\`bash\n${guard}\n${firstWriter}\n\`\`\`\n\n\`\`\`bash\n${guard}\n${secondWriter}\n\`\`\`\n`,
    );
    const inventoryPath = await createSyncedBookkeepingInventory(root, [
      {
        file: '.agents/skills/oat-project-second-writer/SKILL.md',
        anchor: firstWriter,
        guard: 'project-scope',
        kind: 'write',
      },
    ]);

    const result = await validateOatSkills(root);

    expect(result.findings).toContainEqual({
      file: inventoryPath,
      message: `Lifecycle project-artifact writer site is missing from synced-bookkeeping inventory: ${skillPath}: ${secondWriter}`,
    });
  });

  it('anchors wave gate bookkeeping to an executable guarded push', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const skillPath = join(
      repoRoot,
      '.agents',
      'skills',
      'oat-wave-execute',
      'SKILL.md',
    );
    const inventoryPath = join(
      repoRoot,
      'packages',
      'cli',
      'src',
      'validation',
      'synced-bookkeeping-sites.json',
    );
    const skill = await readFile(skillPath, 'utf8');
    const inventory = JSON.parse(
      await readFile(inventoryPath, 'utf8'),
    ) as Array<{
      file: string;
      anchor: string;
      guard: string;
      kind: string;
    }>;
    const sites = inventory.filter(
      (entry) => entry.file === '.agents/skills/oat-wave-execute/SKILL.md',
    );

    expect(sites).toEqual([
      {
        file: '.agents/skills/oat-wave-execute/SKILL.md',
        anchor:
          'PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)',
        kind: 'resolve',
        guard: 'canonical-resolution',
      },
      {
        file: '.agents/skills/oat-wave-execute/SKILL.md',
        anchor:
          'oat project push "$PROJECT_PATH" --message "chore(oat): record wave plan gate"',
        kind: 'write',
        guard: 'project-scope',
      },
    ]);
    expect(skill).toMatch(
      /```bash\nPROJECT_PATH=\$\(oat config get activeProject[\s\S]*?PROJECT_SCOPE=\$\(oat project scope "\$PROJECT_PATH" --format value\)[\s\S]*?if \[ "\$PROJECT_SCOPE" = "synced" \]; then\n  oat project push "\$PROJECT_PATH" --message "chore\(oat\): record wave plan gate"[\s\S]*?else\n  PROJECT_OUTPUT_PATHS=\(\)[\s\S]*?git add -- "\$\{PROJECT_OUTPUT_PATHS\[@\]\}"[\s\S]*?git commit --only -m "chore\(oat\): record wave plan gate" -- "\$\{PROJECT_OUTPUT_PATHS\[@\]\}"\nfi\n```/,
    );
  });

  it('does not warn when a configured gate targets a gateable skill', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-gateable',
      validGateableSkillContent('oat-gateable'),
    );

    const result = await validateOatSkills(root, {
      gateSkillNames: ['oat-gateable'],
    });

    expect(result.validatedSkillCount).toBe(1);
    expect(result.findings).toEqual([]);
  });

  it('warns when a configured gate targets a skill without oat_gateable true', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-not-gateable',
      validSkillContent('oat-not-gateable'),
    );

    const result = await validateOatSkills(root, {
      gateSkillNames: ['oat-not-gateable'],
    });

    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message: 'Configured gate targets skill without oat_gateable: true',
        severity: 'warning',
      }),
    ]);
  });

  it('warns when a configured gate targets an unknown skill', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await mkdir(join(root, '.agents', 'skills'), { recursive: true });

    const result = await validateOatSkills(root, {
      gateSkillNames: ['oat-unknown'],
    });

    expect(result.validatedSkillCount).toBe(0);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: join(root, '.agents', 'skills', 'oat-unknown', 'SKILL.md'),
        message: 'Configured gate targets unknown skill: oat-unknown',
        severity: 'warning',
      }),
    ]);
  });

  it('reports frontmatter name mismatch with directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-name-mismatch',
      [
        '---',
        'name: oat-other-name',
        'description: Use when validating name matching behavior. Provides fixture content for name checks.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message:
          'Frontmatter name must match directory name (expected: oat-name-mismatch, found: oat-other-name)',
      }),
    ]);
  });

  it('reports description that does not start with an allowed trigger stem', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-bad-description-prefix',
      [
        '---',
        'name: oat-bad-description-prefix',
        'description: This description does not use the required prefix.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message:
          'Frontmatter description must start with one of: "Use when", "Run when", "Trigger when"',
      }),
    ]);
  });

  it('accepts description that starts with Run when', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-run-when-valid',
      [
        '---',
        'name: oat-run-when-valid',
        'description: Run when validating alternate trigger stems for frontmatter descriptions. Confirms validator flexibility.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([]);
  });

  it('accepts description that starts with Trigger when', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-trigger-when-valid',
      [
        '---',
        'name: oat-trigger-when-valid',
        'description: Trigger when validating alternate trigger stems for frontmatter descriptions. Confirms validator flexibility.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([]);
  });

  it('accepts description that starts with Use when', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-use-when-valid',
      [
        '---',
        'name: oat-use-when-valid',
        'description: Use when validating the default trigger stem for frontmatter descriptions. Confirms validator baseline.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([]);
  });

  it('rejects lowercase trigger stem even if wording matches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-lowercase-trigger',
      [
        '---',
        'name: oat-lowercase-trigger',
        'description: use when validating case-sensitive trigger stems. This should fail current validation.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message:
          'Frontmatter description must start with one of: "Use when", "Run when", "Trigger when"',
      }),
    ]);
  });

  it('reports description longer than 500 characters', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const longDescription = `Use when validating description length enforcement. ${'x'.repeat(460)}`;
    const skillPath = await createSkillFile(
      root,
      'oat-description-too-long',
      [
        '---',
        'name: oat-description-too-long',
        `description: ${longDescription}`,
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message: expect.stringContaining(
          'Frontmatter description exceeds 500 characters',
        ),
      }),
    ]);
  });

  it('accepts valid semver version frontmatter when present', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-semver-valid',
      [
        '---',
        'name: oat-semver-valid',
        'version: 1.2.3',
        'description: Use when validating optional semver version metadata in frontmatter.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([]);
  });

  it('reports invalid semver version frontmatter', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-semver-invalid',
      [
        '---',
        'name: oat-semver-invalid',
        'version: 1.2',
        'description: Use when validating invalid semver version metadata in frontmatter.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Demo',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ DEMO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message: 'Frontmatter version must be valid semver (e.g., 1.0.0)',
      }),
    ]);
  });

  it('requires bundled oat skill files to include valid semver versions', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const bundleInventoryPath = join(
      repoRoot,
      'packages',
      'cli',
      'scripts',
      'bundle-inputs.mjs',
    );
    const { stdout } = await execFileAsync(
      process.execPath,
      [bundleInventoryPath, '--json'],
      { encoding: 'utf8' },
    );
    const inventory = JSON.parse(stdout) as { skills: string[] };
    const bundledSkills = inventory.skills.filter((name) =>
      name.startsWith('oat-'),
    );

    expect(bundledSkills.length).toBeGreaterThan(0);

    for (const skillName of bundledSkills) {
      const skillPath = join(
        repoRoot,
        '.agents',
        'skills',
        skillName,
        'SKILL.md',
      );
      const content = await readFile(skillPath, 'utf8');
      const match = content.match(/^version:\s*(.+)$/m);
      expect(match?.[1]?.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('requires all repo skill files to include valid semver versions', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const skillsRoot = join(repoRoot, '.agents', 'skills');
    const entries = await readdir(skillsRoot, { withFileTypes: true });
    const skillDirs = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort();

    expect(skillDirs.length).toBeGreaterThan(0);

    const invalidVersions: string[] = [];
    for (const skillName of skillDirs) {
      const skillPath = join(skillsRoot, skillName, 'SKILL.md');
      const content = await readFile(skillPath, 'utf8');
      const version = content.match(/^version:\s*(.+)$/m)?.[1]?.trim();
      if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
        invalidVersions.push(`${skillName}: ${version ?? '<missing>'}`);
      }
    }

    expect(invalidVersions).toEqual([]);
  });

  it('tracks the current explainer skill family versions', async () => {
    for (const [skillName, expectedVersion] of [
      ['explainer-kit', '2.1.0'],
      ['oat-explainer-kit', '1.0.6'],
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim(), skillName).toBe(
        expectedVersion,
      );
    }
  });

  it('keeps the explainer skill family on the trusted browser-session contract', async () => {
    const [coreContract, adapterSkill] = await Promise.all([
      readRepoFile(
        '.agents/skills/explainer-kit/scripts/lib/package-coverage.mjs',
      ),
      readRepoFile('.agents/skills/oat-explainer-kit/SKILL.md'),
    ]);

    expect(coreContract).toContain('explainer-kit.package-coverage/v2');
    expect(coreContract).toContain(
      'export async function validateImmutablePackageEvidence',
    );
    expect(adapterSkill).toContain('`browserSession`');
    expect(adapterSkill).toContain('`browserSessionModulePath`');
    expect(adapterSkill).toMatch(
      /Bare browser callbacks and caller-authored runtime metadata\s+are rejected/,
    );
  });

  it('keeps agent-instructions delta analysis aligned with numbered steps', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-agent-instructions-analyze/SKILL.md',
    );

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.12.0');
    expect(content).toMatch(
      /coverage gap assessment \(Step 4\)[^\n]*affected directories/,
    );
    expect(content).toMatch(
      /drift detection \(Step 6\)[^\n]*affected directories/,
    );
    expect(content).toContain(
      'Quality evaluation (Step 3) always runs on ALL instruction files regardless of mode.',
    );
    expect(content).toMatch(
      /^### Step 7: Cross-Format Consistency \(Multi-Provider Only\)$/m,
    );
  });

  it('documents gate review provenance in review-provide and keeps model invocation gated', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );

    expect(content).toMatch(/^disable-model-invocation:\s*false$/m);
    expect(content).toMatch(/## Model Invocation Gate/);
    expect(content).toMatch(/explicit review asks/i);
    expect(content).toMatch(
      /confirms? a previously offered project-review step/i,
    );
    expect(content).toMatch(
      /oat_review_invocation:\s*\{\s*manual\|auto\|gate\s*\}/,
    );
    expect(content).toMatch(/`gate`/);
    expect(content).toMatch(/normal stateful review-provide behavior/i);
  });

  it('allows review-provide to run the full stateful review workflow', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    const allowedTools = content.match(/^allowed-tools:\s*(.+)$/m)?.[1] ?? '';

    for (const requiredTool of [
      'Read',
      'Glob',
      'Grep',
      'Write',
      'Edit',
      'Bash(git:*)',
      'Bash(oat:*)',
      'Bash(pnpm:*)',
    ]) {
      expect(allowedTools).toContain(requiredTool);
    }
  });

  it('documents gate invocation as autonomous receive disposition', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-review-receive/SKILL.md',
    );

    expect(content).toMatch(/oat_review_invocation/);
    expect(content).toMatch(/gate/);
    // A blocking gate is received autonomously (auto-disposition); a passing
    // gate runs the non-pausing judgment sweep. Neither is "standard/manual".
    expect(content).toMatch(/auto-disposition mode/i);
    expect(content).toMatch(/judgment-sweep mode/i);
  });

  it('requires reviewer artifacts to expose gate-parseable findings counts or sections', async () => {
    const content = await readRepoFile('.agents/agents/oat-reviewer.md');

    expect(content).toMatch(
      /oat_review_invocation:\s*\{\s*manual\|auto\|gate\s*\}/,
    );
    expect(content).toMatch(
      /Findings:\s*\{N\} critical,\s*\{N\} important,\s*\{N\} medium,\s*\{N\} minor/,
    );
    expect(content).toMatch(/standard `## Findings` sections/i);
    expect(content).toMatch(/`oat gate review`/);
  });

  it('keeps reviewer-local reconnaissance bounded and advisory', async () => {
    const content = await readRepoFile('.agents/agents/oat-reviewer.md');
    const tools = content.match(/^tools:\s*(.+)$/m)?.[1] ?? '';

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.2.1');
    expect(tools).toContain('Task');
    for (const broadReview of [
      'final code reviews',
      'broad phase/range reviews',
      'docs sweeps',
      'provider-view audits',
    ]) {
      expect(content, broadReview).toContain(broadReview);
    }
    expect(content).toMatch(
      /narrow[\s\S]{0,120}(?:stay|keep)[\s\S]{0,80}inline/i,
    );
    expect(content).toMatch(
      /one bounded[\s\S]{0,120}read-only[\s\S]{0,120}non-recursive[\s\S]{0,160}disjoint/i,
    );
    for (const laneField of [
      'coverage',
      'checks performed',
      'exact `file:line` evidence',
      'gaps',
      'explicit uncertainty',
    ]) {
      expect(content, `lane report ${laneField}`).toContain(laneField);
    }

    expect(content).toContain(
      '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md',
    );
    expect(content).toContain(
      '${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/model-selection-principles.md',
    );
    expect(content).toMatch(
      /read exactly one[\s\S]{0,220}selection reference[\s\S]{0,220}one matching mechanics reference[\s\S]{0,220}oat-dispatch-subagents\/references/i,
    );
    expect(content).toMatch(/shared `recon` role class/i);
    expect(content).toMatch(
      /capability[\s\S]{0,180}catalog[\s\S]{0,180}model[\s\S]{0,180}effort[\s\S]{0,180}route[\s\S]{0,180}authorization[\s\S]{0,180}launch evidence/i,
    );
    expect(content).toMatch(
      /cheaper\/faster[\s\S]{0,180}only when the host reliably exposes/i,
    );
    expect(content).toMatch(
      /never silently inherit[\s\S]{0,120}primary reviewer's model/i,
    );
    expect(content).toMatch(
      /must not (?:read|load)[\s\S]{0,160}`oat-project-dispatch-subagents`[\s\S]{0,200}project lifecycle phase\/task policy/i,
    );

    expect(content).toMatch(
      /authoritative scope[\s\S]{0,160}before considering delegation/i,
    );
    expect(content).toMatch(
      /directly re-verify[\s\S]{0,180}positive and negative/i,
    );
    for (const primaryOnly of [
      'source validation',
      'reconciliation',
      'synthesis',
      'severity',
      'validation decisions',
      'artifact writing',
      '`StructuredFindings`',
    ]) {
      expect(content, `primary-only ${primaryOnly}`).toContain(primaryOnly);
    }
    expect(content).toMatch(
      /workers[\s\S]{0,200}(?:must not|never)[\s\S]{0,220}mutate files[\s\S]{0,220}(?:final findings|assign severity)/i,
    );
    expect(content).toMatch(
      /unsupported[\s\S]{0,120}unauthorized[\s\S]{0,120}failed[\s\S]{0,120}empty[\s\S]{0,120}malformed[\s\S]{0,220}inline/i,
    );
    expect(content).toMatch(
      /without (?:weakening|downgrading)[\s\S]{0,140}(?:checklist|review coverage)[\s\S]{0,140}output contract/i,
    );
  });

  it('classifies reviewer reconnaissance independently from worker authority', async () => {
    const reviewer = await readRepoFile('.agents/agents/oat-reviewer.md');
    const engine = await readRepoFile(
      '.agents/skills/oat-dispatch-subagents/SKILL.md',
    );
    const schema = await readRepoFile(
      '.agents/skills/oat-dispatch-subagents/references/record-schema.md',
    );
    const cursor = await readRepoFile(
      '.agents/skills/oat-dispatch-subagents/references/provider-cursor.md',
    );
    const providerGuidance = [
      await readRepoFile(
        '.agents/skills/subagent-orchestration/references/provider-cursor.md',
      ),
      await readRepoFile(
        '.agents/skills/subagent-orchestration/references/provider-claude.md',
      ),
      await readRepoFile(
        '.agents/skills/subagent-orchestration/references/provider-codex.md',
      ),
    ].join('\n');

    expect(reviewer).toMatch(
      /authoritative (?:commit )?range[\s\S]{0,240}(?:discovery|spec|design|plan|implementation)[\s\S]{0,240}before (?:decomposition|decomposing)/i,
    );
    expect(reviewer).toMatch(
      /role\.class:\s*`?recon`?[\s\S]{0,180}independent[\s\S]{0,180}`task_class`/i,
    );
    for (const field of [
      'task_class',
      'classification_source',
      'classification_reason',
    ]) {
      expect(reviewer, `reviewer-required ${field}`).toContain(field);
      expect(engine, `generic-optional ${field}`).toContain(field);
    }
    expect(engine).toMatch(
      /task-class metadata[\s\S]{0,180}optional[\s\S]{0,180}existing|existing[\s\S]{0,180}optional[\s\S]{0,180}task-class metadata/i,
    );

    for (const taskClass of [
      'mechanical-recon',
      'intelligent-recon',
      'default-implementation',
      'hard-reasoning',
      'consequential',
    ]) {
      expect(reviewer, taskClass).toContain(taskClass);
      expect(engine, taskClass).toContain(taskClass);
    }
    expect(`${reviewer}\n${engine}`).toMatch(
      /deterministic[\s\S]{0,220}(?:silent-miss|silent miss)[\s\S]{0,260}dispersed context[\s\S]{0,220}ambiguity[\s\S]{0,220}consequence/i,
    );
    expect(`${reviewer}\n${engine}`).toMatch(
      /file count alone[\s\S]{0,100}(?:never|not)[\s\S]{0,100}escalat/i,
    );
    for (const mechanicalExample of [
      'inventories',
      'parity checks',
      'test/lint/format/build',
    ]) {
      expect(`${reviewer}\n${engine}`, mechanicalExample).toContain(
        mechanicalExample,
      );
    }
    expect(`${reviewer}\n${engine}`).toMatch(
      /interpretation[\s\S]{0,180}policy judgment[\s\S]{0,220}(?:stronger|root)/i,
    );

    for (const recordField of [
      'task_class',
      'model_class_floor',
      'classification_source',
      'classification_reason',
      'floor_satisfaction',
    ]) {
      expect(schema, `dispatch record ${recordField}`).toContain(recordField);
    }
    const homogeneousWave =
      engine.match(/^## Homogeneous Recon Waves\n([\s\S]*?)(?=^## )/m)?.[1] ??
      '';
    const reconWaveSchema =
      schema.match(/^## Recon Wave\n([\s\S]*?)(?=^## )/m)?.[1] ?? '';
    for (const waveAxis of [
      'reasoning_mode_selector',
      'service_tier_selector',
      'guidance_reference',
      'guidance_version',
      'guidance_verified_at',
      'guidance_status',
    ]) {
      expect(homogeneousWave, `homogeneous wave ${waveAxis}`).toContain(
        waveAxis,
      );
      expect(reconWaveSchema, `recon-wave schema ${waveAxis}`).toContain(
        waveAxis,
      );
    }
    expect(homogeneousWave).toMatch(
      /identically\s+present\s+or\s+absent[\s\S]{0,200}identical\s+values/i,
    );
    expect(reconWaveSchema).toMatch(
      /identically\s+present\s+or\s+absent[\s\S]{0,200}identical\s+values/i,
    );
    expect(`${engine}\n${schema}`).toMatch(
      /homogeneous[\s\S]{0,240}task_class[\s\S]{0,160}model_class_floor[\s\S]{0,180}(?:identical|match)/i,
    );
    expect(`${engine}\n${schema}`).toMatch(
      /caller-inline[\s\S]{0,180}allow_below_task_class_floor:\s*false/i,
    );
    expect(`${engine}\n${schema}`).toMatch(
      /explicit-downgrade[\s\S]{0,240}(?:without|omit|absent|unconstrained)[\s\S]{0,160}(?:task class|class floor|task-class)/i,
    );

    expect(cursor).toContain('providers.cursor.dispatchArgs.variant');
    expect(cursor).toMatch(
      /outer lifecycle[\s\S]{0,220}exact[\s\S]{0,180}resolver/i,
    );
    expect(cursor).toMatch(
      /reviewer-local[\s\S]{0,240}`generalPurpose`[\s\S]{0,240}exact-native-model-choice/i,
    );
    expect(cursor).toMatch(
      /does not[\s\S]{0,160}(?:reconstruct|parse)[\s\S]{0,160}lifecycle variant/i,
    );
    expect(providerGuidance).toMatch(
      /(?:active|current) (?:user and repository|user\/repository) instructions[\s\S]{0,200}(?:override|precedence|first)/i,
    );

    for (const rootOnly of [
      'verification',
      'reconciliation',
      'severity',
      'validation decisions',
      'output',
    ]) {
      expect(reviewer, `root-only ${rootOnly}`).toContain(rootOnly);
    }
  });

  it('keeps recon economy subordinate to explicit model-class floors', async () => {
    const engine = await readRepoFile(
      '.agents/skills/oat-dispatch-subagents/SKILL.md',
    );
    const schema = await readRepoFile(
      '.agents/skills/oat-dispatch-subagents/references/record-schema.md',
    );
    const cursor = await readRepoFile(
      '.agents/skills/oat-dispatch-subagents/references/provider-cursor.md',
    );
    const reconRow =
      engine.match(/^\|\s*`recon`\s*\|(.+)\|$/m)?.[1]?.trim() ?? '';

    expect(reconRow).toMatch(/read-only[\s\S]*bounded/i);
    expect(reconRow).toMatch(
      /(?:task_class|model_class_floor)[\s\S]*(?:at or above|meet|satisf)/i,
    );
    expect(reconRow).toMatch(
      /economical[\s\S]*(?:only|when)[\s\S]*(?:no|without|absent|unconstrained)[\s\S]*(?:task_class|class floor|task-class)/i,
    );
    expect(reconRow).not.toMatch(
      /(?:all|every|universal)[\s\S]*economical|economical[\s\S]*(?:all|every|universal)/i,
    );

    expect(engine).toMatch(
      /class-constrained recon[\s\S]{0,260}(?:at or above|meet|satisf)[\s\S]{0,220}`model_class_floor`/i,
    );
    expect(`${engine}\n${schema}`).toMatch(
      /floor_satisfaction:\s*unsatisfied[\s\S]{0,240}caller-inline/i,
    );
    expect(engine).toMatch(
      /unconstrained legacy recon[\s\S]{0,120}no `task_class` supplied/i,
    );
    expect(engine).toMatch(
      /unconstrained legacy recon[\s\S]{0,180}economical target/i,
    );

    expect(cursor).toMatch(
      /exact model choice[\s\S]{0,40}advertised by the current nested dispatcher/i,
    );
    expect(cursor).toContain(
      'model_selector_granularity: exact-native-model-choice',
    );
    expect(schema).toContain(
      'model_selector_granularity: exact-native-model-choice',
    );
    expect(`${cursor}\n${schema}`).not.toMatch(
      /model_selector_granularity:\s*exact-native-enum/i,
    );
  });

  it('keeps review orchestration evidence artifact-owned and root-logged', async () => {
    const reviewer = await readRepoFile('.agents/agents/oat-reviewer.md');
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const phaseExecution = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/phase-execution.md',
    );
    const reviewProvide = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    const artifactConfirmation =
      reviewer.match(
        /### Step 9: Return Confirmation[\s\S]*?(?=## Structured-Output Mode)/,
      )?.[0] ?? '';
    const reviewProvideHandoff =
      reviewProvide.match(
        /### Step 8\.5: Validate Review Orchestration and Append Root Log[\s\S]*?(?=### Step 9:)/,
      )?.[0] ?? '';
    const implementationSummary =
      implement.match(
        /## Project Log Append Points[\s\S]*?(?=## Autonomy Policy)/,
      )?.[0] ?? '';
    const implementationHandoff =
      phaseExecution.match(
        /### Per-Phase Review[\s\S]*?(?=#### Bounded Fix and Re-Review Loop)/,
      )?.[0] ?? '';

    expect(reviewer).toMatch(
      /delegated reconnaissance[\s\S]{0,180}(?:attempted|attempt)[\s\S]{0,220}`?## Review Orchestration`?/i,
    );
    expect(
      artifactConfirmation.match(
        /^\*\*Reconnaissance:\*\* \{attempted \| not-attempted\}$/gm,
      ),
    ).toHaveLength(1);
    expect(artifactConfirmation).toMatch(
      /exactly one[\s\S]{0,180}(?:attempted|not-attempted)/i,
    );
    for (const field of [
      'waves',
      'task classes',
      'classification rationale',
      'selected targets',
      'acceptance',
      'outcomes',
      'floor satisfaction',
      'fallback',
      'primary reconciliation',
    ]) {
      expect(reviewer, `review orchestration ${field}`).toMatch(
        new RegExp(field.replaceAll(' ', '\\s+'), 'i'),
      );
    }
    expect(reviewer).toMatch(
      /(?:reviewer|primary reviewer)[\s\S]{0,220}workers[\s\S]{0,220}(?:never|must not)[\s\S]{0,160}(?:write|modify)[\s\S]{0,120}`?project-log\.md`?/i,
    );
    expect(reviewer).toMatch(
      /structured-output mode[\s\S]{0,300}orchestration[\s\S]{0,180}`summary`/i,
    );

    for (const [name, rootWorkflow, orchestrationHandoff] of [
      ['project implement summary', implement, implementationSummary],
      [
        'project implement',
        `${implement}\n${phaseExecution}`,
        implementationHandoff,
      ],
      ['project review provide', reviewProvide, reviewProvideHandoff],
    ] as const) {
      expect(
        orchestrationHandoff.match(/^- `\*\*Reconnaissance:\*\* attempted`$/gm),
        `${name} attempted signal cardinality`,
      ).toHaveLength(1);
      expect(
        orchestrationHandoff.match(
          /^- `\*\*Reconnaissance:\*\* not-attempted`$/gm,
        ),
        `${name} not-attempted signal cardinality`,
      ).toHaveLength(1);
      for (const rejectedSignal of ['missing', 'duplicate', 'invalid']) {
        expect(
          orchestrationHandoff,
          `${name} ${rejectedSignal} signal fails closed`,
        ).toMatch(
          new RegExp(
            `${rejectedSignal}[\\s\\S]{0,180}(?:incomplete-artifact error|stop|fail closed)`,
            'i',
          ),
        );
      }
      expect(
        orchestrationHandoff,
        `${name} consumes signal before validation or bookkeeping`,
      ).toMatch(
        /Before validating[\s\S]{0,180}(?:review artifact|artifact scope)[\s\S]{0,180}(?:updating|project bookkeeping)[\s\S]{0,120}consume[\s\S]{0,120}brief artifact-mode confirmation/i,
      );
      expect(orchestrationHandoff, `${name} attempted branch`).toMatch(
        /`attempted`[\s\S]{0,320}complete[\s\S]{0,180}`## Review Orchestration`[\s\S]{0,360}append[\s\S]{0,100}exactly once/i,
      );
      expect(orchestrationHandoff, `${name} not-attempted branch`).toMatch(
        /`not-attempted`[\s\S]{0,280}(?:must not|no)[\s\S]{0,180}`## Review Orchestration`[\s\S]{0,320}(?:must not|do not|no)[\s\S]{0,140}(?:log entry|`oat project log append`)/i,
      );
      expect(rootWorkflow, `${name} artifact validation`).toMatch(
        /validat(?:e|es|ing)[\s\S]{0,180}review artifact[\s\S]{0,240}orchestration/i,
      );
      expect(rootWorkflow, `${name} root log append`).toMatch(
        /oat project log append[\s\S]{0,260}(?:review artifact|artifact path)|(?:review artifact|artifact path)[\s\S]{0,260}oat project log append/i,
      );
      expect(rootWorkflow, `${name} one structural entry`).toMatch(
        /one (?:concise )?structural (?:project-log )?entry/i,
      );
    }
  });

  it('pins deferred reviewer reconnaissance safety assertions', async () => {
    const content = await readRepoFile('.agents/agents/oat-reviewer.md');

    expect(content).toMatch(
      /(?:never|must not) hard-code provider model names/i,
    );
    expect(
      content.match(/Capability-check reviewer-local delegation once\./g),
    ).toHaveLength(1);
    expect(content).toMatch(
      /workers[\s\S]{0,180}must not[\s\S]{0,300}review artifacts[\s\S]{0,160}`StructuredFindings`[\s\S]{0,180}either output sink/i,
    );
  });

  it('requires gate review guidance to copy configured invocation metadata without inference', async () => {
    for (const path of [
      '.agents/agents/oat-reviewer.md',
      '.agents/skills/oat-project-review-provide/SKILL.md',
    ]) {
      const content = await readRepoFile(path);
      for (const field of [
        'oat_gate_run_id',
        'oat_gate_target',
        'oat_gate_runtime',
        'oat_invocation_model',
        'oat_invocation_reasoning_effort',
        'oat_invocation_source',
      ]) {
        expect(content, `${path} gate field ${field}`).toContain(field);
      }
      expect(content, `${path} exact-copy contract`).toMatch(
        /copy.*(?:exact|verbatim)/i,
      );
      expect(content, `${path} no command inference`).toMatch(
        /do not (?:parse|derive)[\s\S]{0,180}(?:command|baseCommand)/i,
      );
      expect(content, `${path} self-report separation`).toMatch(
        /self-report(?:ed)?[\s\S]{0,120}non-authoritative/i,
      );
    }
  });

  it('marks quick-start and import-plan as gateable lifecycle skills', async () => {
    for (const skillName of [
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      const frontmatter = getFrontmatterForTest(content);

      expect(frontmatter, `${skillName} frontmatter`).toMatch(
        /^oat_gateable:\s*true$/m,
      );
    }
  });

  it('adds Gate Execution steps to quick-start and import-plan', async () => {
    for (const skillName of [
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );

      expect(content, `${skillName} gate section`).toMatch(
        /^### Gate Execution$/m,
      );
      expect(content, `${skillName} gate command`).toMatch(/oat gate /);
    }
  });

  it('runs lifecycle exit gates before their completion boundaries', async () => {
    for (const {
      skillName,
      version,
      finalizedHeading,
      gateHeading,
      completionHeading,
      noGateNextStep,
    } of [
      {
        skillName: 'oat-project-discover',
        version: '2.2.3',
        finalizedHeading:
          '### Step 11: Human-in-the-Loop Lifecycle (HiLL) Gate (If Configured)',
        gateHeading: '### Step 12: Gate Execution',
        completionHeading: '### Step 13: Mark Discovery Complete',
        noGateNextStep: 'Step 13',
      },
      {
        skillName: 'oat-project-design',
        version: '2.3.2',
        finalizedHeading:
          '### Step 6: User-Review Gate (commit-first ordering)',
        gateHeading: '### Step 7: Gate Execution',
        completionHeading:
          '### Step 8: Approval — Mark Design Complete and Update HiLL State',
        noGateNextStep: 'Step 8',
      },
      {
        skillName: 'oat-project-plan',
        version: '1.4.7',
        finalizedHeading: '### Step 12.5: Run Plan Artifact Review Loop',
        gateHeading: '### Gate Execution',
        completionHeading: '### Step 13: Mark Plan Complete',
        noGateNextStep: 'Step 13',
      },
      {
        skillName: 'oat-project-quick-start',
        version: '2.3.8',
        finalizedHeading: '### Step 3.6: Run Plan Artifact Review Loop',
        gateHeading: '### Gate Execution',
        completionHeading:
          '### Step 3.7: Record Review Disposition and Mark Plan Complete',
        noGateNextStep: 'Step 3.7',
      },
      {
        skillName: 'oat-project-implement',
        version: '2.3.2',
        finalizedHeading: '### Step 13: Trigger Final Review',
        gateHeading: '### Step 14: Gate Execution',
        completionHeading: '### Step 16: Mark Implementation Complete',
        noGateNextStep: 'Step 15',
      },
    ] as const) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      const finalizedIndex = content.indexOf(finalizedHeading);
      const gateIndex = content.indexOf(gateHeading);
      const completionIndex = content.indexOf(completionHeading);

      expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim(), skillName).toBe(
        version,
      );
      expect(
        gateIndex,
        `${skillName} gate follows artifact finalization`,
      ).toBeGreaterThan(finalizedIndex);
      expect(
        completionIndex,
        `${skillName} completion follows the configured gate`,
      ).toBeGreaterThan(gateIndex);
      expect(
        content.slice(completionIndex),
        `${skillName} completion requires a resolved gate`,
      ).toMatch(/only after the configured gate passes or resolves/i);
      expect(
        content.slice(gateIndex, completionIndex),
        `${skillName} blocked gates preserve resumable in-progress state`,
      ).toMatch(
        /ends in `block` after attempts are exhausted[\s\S]*unresolved\s+`prompt` boundary[\s\S]*completion steps below MUST NOT run[\s\S]*stays `in_progress` and resumable/,
      );
      expect(
        content.slice(gateIndex, completionIndex),
        `${skillName} no-gate path continues into completion`,
      ).toMatch(
        new RegExp(
          `no gate\\s+is configured; proceed directly\\s+to the completion steps in ${noGateNextStep.replace('.', '\\.')} below`,
        ),
      );
      expect(
        content.slice(gateIndex, completionIndex),
        `${skillName} gate section must not short-circuit completion`,
      ).not.toContain('the skill is complete');
    }

    const discover = await readRepoFile(
      '.agents/skills/oat-project-discover/SKILL.md',
    );
    expect(discover).toMatch(
      /Unresolved Critical review findings always stop\s+autonomous discovery progression,[\s\S]*record the blocker and leave the project resumable\./,
    );

    const plan = await readRepoFile('.agents/skills/oat-project-plan/SKILL.md');
    const parallelIndex = plan.indexOf(
      '### Step 12.1: Propose Parallel Groups (Optional)',
    );
    const artifactReviewIndex = plan.indexOf(
      '### Step 12.5: Run Plan Artifact Review Loop',
    );
    const gateIndex = plan.indexOf('### Gate Execution');
    expect(
      parallelIndex,
      'plan topology is finalized before review',
    ).toBeLessThan(artifactReviewIndex);
    expect(
      artifactReviewIndex,
      'plan artifact review precedes exit gate',
    ).toBeLessThan(gateIndex);
    expect(plan).not.toContain('### Step 14.5: Propose Parallel Groups');
  });

  it('declares the implementation exit gate as a required top-level closeout capability', async () => {
    const implement = await readRawRepoFile(implementSkillPath);
    const composedImplement = await readRepoFile(implementSkillPath);
    const allowedTools = implement.match(/^allowed-tools:\s*(.+)$/m)?.[1] ?? '';
    const successCriteria = composedImplement.slice(
      composedImplement.indexOf('## Success Criteria'),
    );

    expect(allowedTools).toContain('Bash(oat:*)');
    expect(allowedTools).not.toContain('Bash(oat gate:*)');
    expect(successCriteria).toMatch(
      /configured implementation exit gate[\s\S]{0,240}allowed[\s\S]{0,120}fresh/i,
    );
    expect(successCriteria).toMatch(
      /before[\s\S]{0,180}approval-aware[\s\S]{0,180}completion[\s\S]{0,180}success output/i,
    );
  });

  it('routes lifecycle gate handoff only for receive-eligible corroborated results', async () => {
    for (const skillName of [
      'oat-project-plan',
      'oat-project-implement',
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      const gateSection = sliceFromLastGateExecutionHeading(content, skillName);

      expect(gateSection, `${skillName} positive statuses`).toMatch(
        /status.*`ok`.*`blocked`/is,
      );
      expect(gateSection, `${skillName} corroborated handoff`).toMatch(
        /non-null `handoff`.*corroborat/is,
      );
      expect(gateSection, `${skillName} explicit eligibility`).toContain(
        '`receiveEligible: true`',
      );
      expect(gateSection, `${skillName} conjunctive eligibility`).toMatch(
        /all three conditions hold:.*status.*`ok`.*`blocked`.*`receiveEligible: true`.*non-null `handoff`/is,
      );
      expect(gateSection, `${skillName} hard stop`).toContain(
        '`receiveEligible: false`',
      );
      expect(gateSection, `${skillName} targeting failure`).toContain(
        '`targeting_correlation_failed`',
      );
      expect(gateSection, `${skillName} validation failure`).toMatch(
        /`artifact_validation_failed`.*correct.*revalidat/is,
      );
      expect(gateSection, `${skillName} no artifact-path shortcut`).toMatch(
        /artifact path.*never\s+authorizes|never\s+authorize.*artifact path/is,
      );
      expect(
        gateSection,
        `${skillName} no unsafe unconditional handoff`,
      ).not.toContain(
        'regardless of whether the gate ultimately exits zero or nonzero',
      );
      expect(content, `${skillName} durable gate examples`).not.toMatch(
        /dist\/index\.js|node\s+.*\/dist\//,
      );
    }

    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const phaseGateSection = implement.slice(
      implement.indexOf('### Optional External Phase Review Gate'),
      implement.indexOf('### Parallel Group Execution'),
    );
    expect(phaseGateSection).toMatch(
      /all three receive-eligibility\s+conditions must hold:.*status.*`ok`.*`blocked`.*`receiveEligible: true`.*`handoff` is non-null/is,
    );
  });

  it('documents the complete gate result union and receive-eligibility contract', async () => {
    const workflowGates = await readRepoFile(
      'apps/oat-docs/docs/cli-utilities/workflow-gates.md',
    );
    const cliReference = await readRepoFile(
      'apps/oat-docs/docs/reference/cli-reference.md',
    );
    const projectReviews = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/reviews.md',
    );

    for (const [name, content] of [
      ['workflow gates', workflowGates],
      ['CLI reference', cliReference],
    ] as const) {
      for (const status of [
        'ok',
        'blocked',
        'review_failed',
        'artifact_missing',
        'artifact_validation_failed',
        'targeting_correlation_failed',
      ]) {
        expect(content, `${name} ${status}`).toContain(status);
      }
      expect(content, `${name} positive eligibility`).toMatch(
        /receiveEligible(?:: true|` is `true)|receive-eligible/is,
      );
      expect(content, `${name} conjunctive eligibility`).toMatch(
        /all three conditions hold:.*status.*`ok`.*`blocked`.*`receiveEligible` is `true`.*`handoff` is\s+non-null/is,
      );
      expect(content, `${name} targeting hard stop`).toMatch(
        /targeting_correlation_failed[\s\S]{0,600}(?:do not|must not).*review-receive/i,
      );
      expect(content, `${name} validation revalidation`).toMatch(
        /artifact_validation_failed[\s\S]{0,800}(?:correct|fix)[\s\S]{0,300}revalidat/i,
      );
    }

    expect(workflowGates, 'artifact-missing recovery contract').toMatch(
      /`artifact_missing`[\s\S]{0,300}`receiveEligible: false`[\s\S]{0,500}synchronously awaited child[\s\S]{0,100}start\s+a new gate run[\s\S]{0,150}(?:do not|without).*review-receive/i,
    );
    expect(cliReference, 'artifact-missing recovery guidance').toMatch(
      /`artifact_missing`[\s\S]{0,300}fix synchronous review\/artifact completion and start a new run, without review-receive or same-run remediation/i,
    );

    expect(projectReviews, 'phase gate conjunctive eligibility').toMatch(
      /all three eligibility conditions:.*status.*`ok`.*`blocked`.*`receiveEligible` is `true`.*`handoff` is\s+non-null/is,
    );
  });

  it('requires lifecycle review gates to declare the exported project and remain target-neutral', async () => {
    for (const skillName of [
      'oat-project-plan',
      'oat-project-implement',
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      const gateSection = sliceFromLastGateExecutionHeading(content, skillName);

      expect(gateSection, `${skillName} exports PROJECT_PATH`).toContain(
        'export PROJECT_PATH',
      );
      expect(gateSection, `${skillName} declares the review project`).toContain(
        '--project "$PROJECT_PATH"',
      );
      expect(
        gateSection,
        `${skillName} validates stored review commands`,
      ).toMatch(
        /configured review\s+command[\s\S]{0,300}must\s+(?:already\s+)?(?:contain|include)[\s\S]{0,120}--project/i,
      );
      expect(
        gateSection,
        `${skillName} executes the stored command unchanged`,
      ).toMatch(/execute[\s\S]{0,160}exactly as configured/i);
      expect(gateSection, `${skillName} forbids reusable target pins`).toMatch(
        /must not (?:contain|include|add)[\s\S]{0,100}--target/i,
      );
    }
  });

  it('requires every gate-aware lifecycle skill to use canonical structured review commands', async () => {
    for (const skillName of [
      'oat-project-discover',
      'oat-project-design',
      'oat-project-plan',
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      const gateSection = sliceFromLastGateExecutionHeading(content, skillName);

      expect(gateSection, `${skillName} canonical review command`).toContain(
        'oat --json gate review --project "$PROJECT_PATH" ...',
      );
      expect(gateSection, `${skillName} global JSON placement`).toMatch(
        /global `--json`[\s\S]{0,100}before `gate review`/i,
      );
      expect(gateSection, `${skillName} rejects legacy placement`).toMatch(
        /reject[\s\S]{0,100}`oat gate review \.\.\.`/i,
      );
      expect(gateSection, `${skillName} forbids argv injection`).toMatch(
        /never inject or append execution-time argv/i,
      );
      expect(gateSection, `${skillName} forbids reusable target pins`).toMatch(
        /must not (?:contain|include|add)[\s\S]{0,100}--target/i,
      );
    }
  });

  it('bridges dynamic planning producer identity only into review gates', async () => {
    for (const skillName of [
      'oat-project-plan',
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      const gateSection = content.slice(
        content.lastIndexOf('### Gate Execution'),
      );

      expect(gateSection, `${skillName} dynamic producer variable`).toContain(
        'OAT_GATE_PRODUCER_IDENTITY',
      );
      expect(gateSection, `${skillName} current parent identity`).toMatch(
        /current planning parent[\s\S]{0,220}(?:model|identity)/i,
      );
      expect(gateSection, `${skillName} non-empty identity guard`).toMatch(
        /non-empty[\s\S]{0,180}<model>:declared/i,
      );
      expect(
        gateSection,
        `${skillName} resolved configured command boundary`,
      ).toContain('resolved configured command invokes');
      expect(gateSection, `${skillName} review-only boundary`).toContain(
        '`oat gate review`',
      );
      expect(gateSection, `${skillName} unchanged command execution`).toMatch(
        /execute[\s\S]{0,180}(?:command )?(?:exactly |unchanged)/i,
      );
      expect(gateSection, `${skillName} non-review declaration absent`).toMatch(
        /non-review[\s\S]{0,220}(?:unset|absent|remove)/i,
      );
      expect(gateSection, `${skillName} no static producer flag`).not.toContain(
        '--producer-identity',
      );
    }

    const workflowGates = await readRepoFile(
      'apps/oat-docs/docs/cli-utilities/workflow-gates.md',
    );
    expect(workflowGates).toContain('OAT_GATE_PRODUCER_IDENTITY');
    expect(workflowGates).toMatch(
      /explicit `--producer-identity`[\s\S]{0,260}(?:dispatch stamp|stamped)[\s\S]{0,260}environment[\s\S]{0,260}unknown/i,
    );
    expect(workflowGates).toMatch(
      /review-command-only[\s\S]{0,220}(?:non-review|other gate)/i,
    );
    expect(workflowGates).toMatch(
      /producer-neutral[\s\S]{0,220}(?:shared|user)[\s\S]{0,220}config/i,
    );
  });

  it('requires the implementation review gate to use global JSON mode', async () => {
    const content = await readRepoFile(implementSkillPath);
    const gateSection = content.slice(
      content.indexOf('### Step 14: Gate Execution'),
      content.indexOf('### Step 15: Final HiLL Closeout Sequence'),
    );

    expect(gateSection).toContain(
      '`oat --json gate review --project "$PROJECT_PATH" ...`',
    );
    expect(gateSection).toMatch(
      /reject[\s\S]{0,100}`oat gate review \.\.\.`[\s\S]{0,140}global `--json`[\s\S]{0,140}before launch/i,
    );
    expect(gateSection).toMatch(
      /migrate[\s\S]{0,180}(?:stored|resolved) declaration[\s\S]{0,180}before execution/i,
    );
    expect(gateSection).not.toMatch(
      /valid reusable shape is\s+`oat gate review --project/i,
    );
  });

  it('documents lifecycle review-project migration without provider target pins', async () => {
    const workflowGates = await readRepoFile(
      'apps/oat-docs/docs/cli-utilities/workflow-gates.md',
    );
    const contributingSkills = await readRepoFile(
      'apps/oat-docs/docs/contributing/skills.md',
    );

    for (const [path, content] of [
      ['workflow-gates.md', workflowGates],
      ['contributing/skills.md', contributingSkills],
    ] as const) {
      expect(content, `${path} project declaration`).toContain(
        '--project "$PROJECT_PATH"',
      );
      expect(content, `${path} exported project path`).toContain(
        'export PROJECT_PATH',
      );
      expect(content, `${path} target neutrality`).toMatch(
        /(?:omit|must not (?:contain|include|add))[\s\S]{0,120}--target/i,
      );
    }

    expect(workflowGates).toMatch(
      /migrat[\s\S]{0,500}current project[\s\S]{0,500}--project "\$PROJECT_PATH"/i,
    );
    const reusableReviewCommands = [
      ...workflowGates.matchAll(
        /--command '([^']*oat (?:--json )?gate review[^']*)'/g,
      ),
    ].map((match) => match[1] ?? '');
    expect(reusableReviewCommands.length).toBeGreaterThan(0);
    for (const command of reusableReviewCommands) {
      expect(command).toContain('--project "$PROJECT_PATH"');
      expect(command).not.toContain('--target');
    }
    expect(workflowGates).toContain('projectResolutionSource: declared');
    expect(workflowGates).toContain('active-project');
    expect(workflowGates).toContain('single-candidate');
    expect(workflowGates).toMatch(/targeting_correlation_failed/);
    expect(workflowGates).toMatch(/receiveEligible:\s*false/);
  });

  it('tracks the p02 oat-project-implement contract version', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('2.3.2');
  });

  it('requires classified resolver calls and effective terminal reviewer notices before launch', async () => {
    const skill = await readRawRepoFile(implementSkillPath);
    const dispatch = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md',
    );
    const phase = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/phase-execution.md',
    );
    const workflowDocs = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md',
    );
    const configurationDocs = await readRepoFile(
      'apps/oat-docs/docs/cli-utilities/configuration.md',
    );

    expect(skill).toMatch(
      /structured\s+(?:resolver\s+)?notices[\s\S]{0,220}before[\s\S]{0,120}(?:implementation|reviewer) launch/i,
    );
    expect(dispatch).toMatch(
      /--provider codex[\s\S]{0,500}--candidate-model[\s\S]{0,300}--task-class[\s\S]{0,220}--task-effort/i,
    );
    expect(dispatch).toMatch(
      /--provider claude[\s\S]{0,500}--candidate-model[\s\S]{0,300}--task-class/i,
    );
    expect(dispatch).toMatch(
      /--provider cursor[\s\S]{0,500}--candidate-model[\s\S]{0,300}--task-class/i,
    );
    expect(dispatch).toMatch(
      /dispatchReport\.notices[\s\S]{0,260}(?:display|render|surface)[\s\S]{0,180}before[\s\S]{0,120}launch/i,
    );

    expect(phase).toMatch(
      /Phase Scope:[\s\S]{0,2200}task_class:[\s\S]{0,300}classification_source:[\s\S]{0,300}classification_rationale:/i,
    );
    expect(phase).toMatch(
      /effective\s+(?:resolved\s+)?target[\s\S]{0,260}recommendationVersion|recommendationVersion[\s\S]{0,260}effective\s+(?:resolved\s+)?target/i,
    );
    const reviewResolver = phase.slice(
      phase.indexOf('### Per-Phase Review'),
      phase.indexOf('#### Bounded Fix and Re-Review Loop'),
    );
    expect(reviewResolver).not.toContain('--task-class');
    expect(reviewResolver).not.toContain('--task-effort');

    for (const [name, content] of [
      ['workflow', workflowDocs],
      ['configuration', configurationDocs],
    ] as const) {
      expect(content, `${name} Fable access boundary`).toMatch(
        /Fable[\s\S]{0,260}model access/i,
      );
      expect(content, `${name} retention responsibility`).toMatch(
        /organization[\s\S]{0,260}(?:applicable )?retention policy/i,
      );
      expect(content, `${name} no inferred eligibility`).toMatch(
        /OAT (?:does not|cannot) determine[\s\S]{0,180}(?:access|eligibility)/i,
      );
    }
    expect(configurationDocs).toMatch(
      /14 Cursor candidates[\s\S]{0,180}18 (?:flat IDs|catalogued|catalogue)/i,
    );
    expect(configurationDocs).not.toMatch(/Cursor covers 16 candidates/i);
    expect(workflowDocs).toMatch(
      /structured notices[\s\S]{0,260}effective target/i,
    );
  });

  it('preserves provenance across implementation-owned Reviews ledger writes', async () => {
    const phaseExecution = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/phase-execution.md',
    );
    const contract = phaseExecution.slice(
      phaseExecution.indexOf('#### Reviews Ledger Mutation Contract'),
      phaseExecution.indexOf('### Parallel Group Execution'),
    );
    const normalizedContract = contract.replace(/\s+/g, ' ');

    expect(normalizedContract).toContain(
      'directly dispositions a `## Reviews` event or re-points its artifact',
    );
    expect(normalizedContract).toContain(
      'every checkpoint, final-review, gate-receive, and closeout path',
    );
    expect(normalizedContract).toContain(
      'resolve `Scope`, `Type`, `Status`, `Date`, `Artifact`, `Reviewed Head`, `Invocation`, and `Gate Target` by header name',
    );
    expect(normalizedContract).toMatch(
      /legacy five-column table.*append the provenance columns \(`Reviewed Head`, `Invocation`, and `Gate Target`\).*pad every existing row with `-`/,
    );
    expect(normalizedContract).toContain(
      'Preserve every unknown column in its original position',
    );
    expect(normalizedContract).toContain(
      'preserve every existing known value unless the current operation explicitly advances that cell',
    );
    expect(normalizedContract).toContain(
      'Never truncate a row to five, eight, or any other assumed width.',
    );
    expect(normalizedContract).toContain(
      'accept `oat_review_head_sha` only as a full 40-character hexadecimal commit SHA',
    );
    expect(normalizedContract).toContain('preserve `oat_review_invocation`');
    expect(normalizedContract).toContain(
      'preserve `oat_gate_target` only for a gate invocation',
    );
    expect(normalizedContract).toMatch(
      /archive re-point.*preserve existing provenance and unknown cells/,
    );
  });

  it('routes implementation phases through bounded progressive disclosure', async () => {
    const entry = await readRawRepoFile(implementSkillPath);

    // Raised from 225 for the project-log write-timing invariant, which
    // governs every append point listed in the entry and so cannot move to a
    // reference. Raised again from 232 for the direct-implementation record
    // rule, which governs the case where the root does not dispatch and so
    // never loads the dispatch reference. Raised again from 234 for the
    // synced-arrival materialization guard. The structural assertions below
    // still enforce that step bodies stay out of the entry.
    expect(entry.split('\n').length).toBeLessThanOrEqual(245);
    for (const path of implementReferencePaths) {
      expect(entry).toContain(`references/${path}`);
    }
    expect(entry).toContain('Never preload a later route');
    expect(entry).toContain(
      'Reviewers receive only the bounded review scope, commit range, allowed files',
    );
    expect(entry).not.toContain('### Step 5: Per-Phase Execution');
    expect(entry).not.toContain('### Step 13: Trigger Final Review');
  });

  it('detects smoke bootstrap mode from the resolved base before worktree creation', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-worktree-bootstrap-auto/SKILL.md',
    );
    const detectionIndex = content.indexOf(
      'git -C "$REPO_ROOT" ls-tree "$RESOLVED_BASE_SHA" -- ".oat/smoke-bootstrap.json"',
    );
    const creationIndex = content.indexOf(
      '### Step 2: Create or Reuse Worktree',
    );

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.6.1');
    expect(detectionIndex).toBeGreaterThanOrEqual(0);
    expect(creationIndex).toBeGreaterThan(detectionIndex);
    expect(content).toContain('BOOTSTRAP_MODE=normal');
    expect(content).toContain('BOOTSTRAP_MODE=smoke');
    expect(content).toContain('bootstrap_mode: normal | smoke');
  });

  it('keeps smoke bootstrap creation hook-scoped and delegates containment to safe init', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-worktree-bootstrap-auto/SKILL.md',
    );
    const creation = content.slice(
      content.indexOf('### Step 2: Create or Reuse Worktree'),
      content.indexOf(
        '### Step 2.5: Propagate Local-Only Config + Local Paths',
      ),
    );

    expect(creation).toContain(
      'git -c core.hooksPath=/dev/null -C "$REPO_ROOT" worktree add',
    );
    expect(creation).toMatch(/invocation-scoped/i);
    expect(creation).not.toMatch(/^\s*git config .*core\.hooksPath/m);
    expect(creation).toContain(
      'git -C "$TARGET_PATH" ls-files --error-unmatch -- ".oat/smoke-bootstrap.json"',
    );
    expect(creation).toContain(
      'node "$TARGET_PATH/tools/smoke/runner/journal.mjs" register',
    );
    expect(creation.indexOf('journal.mjs" register')).toBeLessThan(
      creation.indexOf('On failure: return structured error'),
    );
    expect(content).toContain(
      'Prefer an explicit worktree bootstrap command when the repository declares',
    );
    expect(content).toContain('If no command exists, derive the minimum safe');
    expect(content).toContain('Never assume Node.js, pnpm, a dependency store');
    expect(content).toContain(
      'Source smoke preflight already owns dependency, build, and repository-wide test',
    );
    expect(content).toContain('`bash scripts/worktree/init.sh`, not');
    expect(content).toContain('`pnpm run worktree:init`');
    expect(content).toContain(
      '(cd "$TARGET_PATH" && bash scripts/worktree/init.sh)',
    );
    expect(content).toMatch(
      /invoking\s+the child script by absolute path while the shell remains in the outer/u,
    );
    expect(content).not.toContain('source-commit-bound dependency');
  });

  it('keeps smoke bootstrap closed to local and provider sync side effects', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-worktree-bootstrap-auto/SKILL.md',
    );
    const propagation = content.slice(
      content.indexOf(
        '### Step 2.5: Propagate Local-Only Config + Local Paths',
      ),
      content.indexOf('### Step 2.7: Verify Resolved Base in Worktree HEAD'),
    );
    const smokePropagation = propagation.slice(
      0,
      propagation.indexOf('**Normal mode:**'),
    );
    const baseline = content.slice(
      content.indexOf('### Step 3: Run Baseline Checks'),
      content.indexOf('Check behavior per baseline policy:'),
    );
    const smokeBaseline = baseline.slice(baseline.indexOf('**Smoke mode:**'));
    const providerSync = content.slice(
      content.indexOf('### Step 4: Create Provider Directories and Sync'),
      content.indexOf('### Step 5: Return Structured Status'),
    );
    const smokeProviderSync = providerSync.slice(
      0,
      providerSync.indexOf('**Normal mode:**'),
    );

    expect(propagation).toMatch(
      /smoke mode[\s\S]{0,260}skip[\s\S]{0,160}config propagation[\s\S]{0,160}`oat local sync`/i,
    );
    expect(smokePropagation).not.toMatch(/^\s*(?:cp|oat local sync)\s/m);
    expect(providerSync).toMatch(
      /smoke mode[\s\S]{0,320}skip[\s\S]{0,240}provider[- ]director[\s\S]{0,240}all-scope sync[\s\S]{0,240}staging[\s\S]{0,160}sync commit/i,
    );
    expect(smokeProviderSync).not.toMatch(
      /^\s*(?:mkdir|oat sync|git add|git commit)\s/m,
    );
    expect(smokeBaseline).not.toMatch(/^\s*oat\s/m);
    expect(smokeBaseline).not.toMatch(
      /^\s*(?:pnpm|npm|yarn|bun)\s+(?:install|run build|test)\b/m,
    );
    expect(content).toMatch(/never run\s+PATH-resolved `oat` in smoke mode/i);
    expect(content).toMatch(
      /missing,\s*unsafe,\s*or malformed smoke marker[\s\S]{0,320}(?:always )?fatal/i,
    );
    expect(content).toMatch(
      /safe-init failure[\s\S]{0,320}fatal[\s\S]{0,240}(?:both policies|`allow-failing`)/i,
    );
    for (const skippedOperation of [
      'local_config_propagation',
      'local_paths_sync',
      'provider_directory_creation',
      'provider_sync',
      'sync_staging',
      'sync_commit',
    ]) {
      expect(content, `structured smoke skip ${skippedOperation}`).toContain(
        `${skippedOperation}: true | false`,
      );
    }
  });

  it('makes smoke readiness failures run-fatal without replacement', async () => {
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const bootstrap = await readRepoFile(
      '.agents/skills/oat-worktree-bootstrap-auto/SKILL.md',
    );

    expect(implement).toContain('known-invalid run abort');
    expect(implement).toMatch(
      /terminates\s+every accepted\s+handle[\s\S]{0,220}never authorizes[\s\S]{0,120}replacement[\s\S]{0,80}sequential degradation/i,
    );
    expect(implement).toMatch(/sequential\s+degradation is forbidden/i);
    expect(implement).toMatch(
      /never\s+authorizes fallback,\s+replacement,\s+or sequential degradation/i,
    );
    expect(bootstrap).toContain('reason: smoke-readiness-failed');
    expect(bootstrap).toMatch(
      /must not install dependencies, build the repository, run\s+repository-wide tests/i,
    );
  });

  it('keeps manual worktree setup repository-defined', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-worktree-bootstrap/SKILL.md',
    );

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.3.1');
    expect(content).toContain(
      'Prefer an explicit worktree bootstrap command when the repository declares',
    );
    expect(content).toContain('If no command exists, derive the minimum safe');
    expect(content).toContain('do not assume Node.js, pnpm');
    expect(content).not.toMatch(/^\s*pnpm\s/m);
  });

  it('makes native Codex dispatch and launcher-owned provenance authoritative', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const dispatchReference = await readRepoFile(
      '.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md',
    );
    const combined = `${content}\n${dispatchReference}`;

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('2.3.2');
    expect(dispatchReference).toContain(
      '${IMPLEMENTER_AGENT_PROVIDER_ROOT}/agents/oat-phase-implementer.md',
    );
    expect(dispatchReference).toContain(
      '${REVIEWER_AGENT_PROVIDER_ROOT}/agents/oat-reviewer.md',
    );

    expect(combined).toMatch(
      /resolver-returned Codex variant[\s\S]{0,240}first[\s\S]{0,160}native[\s\S]{0,80}`agent_type`/i,
    );
    expect(combined).toMatch(
      /spawn acceptance[\s\S]{0,180}launcher payload[\s\S]{0,180}configured invocation evidence/i,
    );
    expect(combined).toMatch(
      /For every phase-implementer, optional nested, fix, and review launch,[\s\S]{0,120}record\s+`target`,[\s\S]{0,100}`model_axis`, and `effort_axis` from resolver output and the actual launcher\s+payload after payload construction/i,
    );
    expect(combined).toMatch(
      /missing (?:runtime )?telemetry[\s\S]{0,160}(?:missing )?(?:agent )?self-report[\s\S]{0,200}not[\s\S]{0,100}(?:role )?unavailability/i,
    );
    expect(combined).toMatch(
      /self-report[\s\S]{0,180}(?:cannot|must not)[\s\S]{0,180}(?:populate|overwrite)[\s\S]{0,260}launcher-owned/i,
    );
    expect(combined).toMatch(
      /native role-selection rejection[\s\S]{0,500}explicit[\s\S]{0,220}`agent_type`[\s\S]{0,220}before[\s\S]{0,120}(?:child|agent)[\s\S]{0,80}start/i,
    );
    expect(combined).toMatch(
      /fresh\s+(?:pinned\s+)?(?:Codex\s+)?child[\s\S]{0,260}only after[\s\S]{0,240}native role-selection\s+rejection/i,
    );
    expect(combined).toMatch(
      /accepted child[\s\S]{0,220}`BLOCKED`[\s\S]{0,260}(?:cannot|must not)[\s\S]{0,180}(?:fallback|fresh child)/i,
    );
    expect(combined).toMatch(/launcher-selected\/config-declared/i);
  });

  it('records native dispatch lineage around the host-owned launch boundary', async () => {
    const paths = [
      '.agents/skills/oat-dispatch-subagents/SKILL.md',
      '.agents/skills/oat-project-dispatch-subagents/SKILL.md',
      '.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md',
      '.agents/skills/oat-project-review-provide/SKILL.md',
      '.agents/skills/oat-project-review-provide-remote/SKILL.md',
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    ];
    const contracts = await Promise.all(paths.map(readRepoFile));
    const central = `${contracts[0]}\n${contracts[1]}`;

    expect(central).toContain('oat project dispatch record');
    expect(central).toContain('--event-file -');
    expect(central).toMatch(
      /construct[^]{0,180}redact[^]{0,220}before[^]{0,100}native (?:host )?(?:call|launch)/i,
    );
    expect(central).toMatch(
      /immediately after[^]{0,180}(?:accepted|blocked-before-start)[^]{0,220}generic dispatch record/i,
    );
    expect(central).toMatch(
      /exact target[^]{0,160}model[^]{0,120}effort[^]{0,120}route[^]{0,140}authority/i,
    );
    expect(central).toMatch(
      /one[^]{0,100}fallback[^]{0,240}provesNoChildStarted: *true/i,
    );
    expect(central).toMatch(
      /timeout[^]{0,100}`BLOCKED`[^]{0,100}refusal[^]{0,120}runtime mismatch[^]{0,160}(?:never|do not)[^]{0,100}(?:fallback|replacement)/i,
    );
    for (const [index, contract] of contracts.entries()) {
      expect(contract, paths[index]).toMatch(/native dispatch lineage/i);
    }
  });

  it('forbids replacement launches after reviewer acceptance', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('2.3.2');
    expect(content).toMatch(
      /accepted native reviewer[\s\S]{0,260}(?:poll|nudge|continue)[\s\S]{0,180}existing handle/i,
    );
    expect(content).toMatch(
      /terminal timeout[\s\S]{0,180}(?:stop|escalate)[\s\S]{0,180}without another launch/i,
    );
    expect(content).toContain('A new launch is eligible only when');
    expect(content).toMatch(/explicit pre-start rejection/i);
    expect(content).not.toMatch(
      /accepted native reviewer[\s\S]{0,220}retry the same already-selected native `agent_type` route/i,
    );
  });

  it('keeps project review dispatch native-first and launcher-owned', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.5.3');
    expect(content).toMatch(
      /resolver-returned Codex variant[\s\S]{0,260}first[\s\S]{0,180}native[\s\S]{0,100}`agent_type`/i,
    );
    expect(content).toMatch(
      /native role-selection rejection[\s\S]{0,520}explicit[\s\S]{0,220}`agent_type`[\s\S]{0,220}before[\s\S]{0,120}(?:child|reviewer)[\s\S]{0,100}start/i,
    );
    expect(content).toMatch(
      /launcher-owned\s+`target`, `model_axis`, and `effort_axis`[\s\S]{0,320}(?:immutable|must not)[\s\S]{0,240}self-report/i,
    );
    expect(content).toMatch(/launcher-selected\/config-declared/i);
    expect(content).toMatch(
      /accepted reviewer[\s\S]{0,140}`BLOCKED`[\s\S]{0,220}(?:blocks|blocking)[\s\S]{0,140}review/i,
    );
    expect(content).toMatch(
      /`BLOCKED`[\s\S]{0,260}(?:does not|cannot|must not)[\s\S]{0,120}(?:invoke|trigger)[\s\S]{0,100}fallback/i,
    );
    expect(content).toMatch(
      /(?:absent|no) findings[\s\S]{0,220}(?:cannot|must not)[\s\S]{0,180}(?:parse|interpret|treat)[\s\S]{0,120}pass|(?:cannot|must not)[\s\S]{0,180}(?:parse|interpret|treat)[\s\S]{0,120}pass[\s\S]{0,220}(?:absent|no) findings/i,
    );
  });

  it('blocks accepted reviewer BLOCKED terminals without invoking fallback', async () => {
    const phaseAgent = await readRepoFile(
      '.agents/agents/oat-phase-implementer.md',
    );
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const phaseReview = implement.slice(
      implement.indexOf('### Per-Phase Review'),
      implement.indexOf('### Optional External Phase Review Gate'),
    );
    const finalReview = implement.slice(
      implement.indexOf('### Step 13: Trigger Final Review'),
      implement.indexOf('### Step 14: Gate Execution'),
    );

    expect(phaseAgent).toMatch(
      /Accepted terminal\s+results[\s\S]{0,160}`BLOCKED`[\s\S]{0,180}never trigger fallback/i,
    );
    expect(phaseReview).toMatch(
      /interruption, `BLOCKED`, or contract refusal is the review outcome/i,
    );
    expect(phaseReview).toMatch(
      /never a\s+reason to replace an accepted reviewer/i,
    );
    for (const [name, content] of [['final reviewer', finalReview]] as const) {
      expect(content, `${name} BLOCKED gate`).toMatch(
        /accepted reviewer[\s\S]{0,100}`BLOCKED`[\s\S]{0,180}(?:blocks|must block)[\s\S]{0,120}review/i,
      );
      expect(content, `${name} no fallback`).toMatch(
        /`BLOCKED`[\s\S]{0,240}(?:does not|cannot|must not)[\s\S]{0,100}(?:invoke|trigger)[\s\S]{0,80}fallback/i,
      );
      expect(content, `${name} no absent-findings pass`).toMatch(
        /(?:absent|no) findings[\s\S]{0,200}(?:cannot|must not)[\s\S]{0,160}(?:parse|interpret|treat)[\s\S]{0,100}pass|(?:cannot|must not)[\s\S]{0,160}(?:parse|interpret|treat)[\s\S]{0,100}pass[\s\S]{0,200}(?:absent|no) findings/i,
      );
    }
  });

  it('documents accepted reviewer BLOCKED outcomes as fail-closed', async () => {
    const reviews = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/reviews.md',
    );

    expect(reviews).toMatch(
      /accepted reviewer[\s\S]{0,100}`BLOCKED`[\s\S]{0,140}blocks the relevant review/i,
    );
    expect(reviews).toMatch(
      /`BLOCKED`[\s\S]{0,180}(?:cannot|must not)[\s\S]{0,100}(?:trigger|invoke)[\s\S]{0,80}(?:pinned )?fallback/i,
    );
    expect(reviews).toMatch(
      /absent findings[\s\S]{0,160}(?:cannot|must not)[\s\S]{0,100}(?:interpret|treat|parse)[\s\S]{0,80}pass/i,
    );
    expect(reviews).toMatch(
      /generic fallback[\s\S]{0,120}(?:does not|cannot|must not)[\s\S]{0,100}override[\s\S]{0,120}managed exact-target\s+rules/i,
    );
    expect(reviews).toMatch(
      /managed reviewer[\s\S]{0,140}cannot be launched exactly[\s\S]{0,100}blocks the review/i,
    );
  });

  it('defines one fail-closed managed dispatch contract for every plan writer', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );

    expect(shared.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.2.21');
    expect(shared).toContain(
      '${WORKFLOWS_AGENT_PROVIDER_ROOT}/agents/oat-reviewer.md',
    );
    expect(shared).toMatch(
      /\$\{SKILL_DIR\}\/\.\.\/\.\.[\s\S]{0,160}\$\{HOME\}\/\.agents[\s\S]{0,160}<repo-root>\/\.agents/,
    );
    expect(shared).toMatch(/Managed Dispatch Readiness and Review Contract/);
    expect(shared).toMatch(/active-provider[\s\S]*unresolved/i);
    expect(shared).toMatch(/re-run the[\s\S]{0,40}resolver/i);
    expect(shared).toMatch(
      /complete\s+(?:recommended\s+defaults|bundled\s+recommendation)/i,
    );
    expect(shared).toContain('exact registered');
    expect(shared).toContain('native `agent_type`');
    expect(shared).toMatch(/fresh Codex child/i);
    expect(shared).toMatch(
      /explicit\s+model.*reasoning\s+effort.*canonical\s+role\s+instructions/is,
    );
    expect(shared).toMatch(/must not require.*restart.*hot reload/i);
    expect(shared).toMatch(/never.*managed base role/i);

    for (const skillName of [
      'oat-project-plan',
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content, `${skillName} shared contract`).toMatch(
        /Managed\s+Dispatch\s+Readiness\s+and\s+Review\s+Contract/,
      );
      expect(content, `${skillName} reviewer resolver`).toMatch(
        /--role reviewer.*--preflight.*--json/,
      );
      expect(content, `${skillName} rerun`).toMatch(/re-run the resolver/i);
    }
  });

  it('resolves artifact formatting once during plan authoring', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );

    expect(shared.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.2.21');
    expect(shared).toMatch(/Planning-Time Artifact Formatting Contract/);
    expect(shared).toMatch(
      /applicable[\s\S]{0,120}`AGENTS\.md`[\s\S]{0,40}`CLAUDE\.md`[\s\S]{0,160}relevant package\s+manifests/i,
    );
    expect(shared).toMatch(
      /distinguish write\/fix commands from check-only commands/i,
    );
    expect(shared).toMatch(
      /file-scoped invocation[\s\S]{0,140}only[\s\S]{0,100}(?:create|edit)/i,
    );
    expect(shared).toMatch(
      /bake the concrete repository command[\s\S]{0,140}`Format`[\s\S]{0,180}every task[\s\S]{0,120}(?:creates|edits) artifacts/i,
    );
    expect(shared).toMatch(
      /runtime discovery is fallback-only[\s\S]{0,120}(?:absent|unusable)/i,
    );
    expect(shared).toContain(
      'no format command discovered in repo instructions; skipping',
    );
    expect(shared).toMatch(
      /warn once[\s\S]{0,120}no format command discovered in repo instructions; skipping[\s\S]{0,120}continue without formatting/i,
    );
    expect(shared).toMatch(/never infer or hardcode a formatter executable/i);
  });

  it('keeps the complete artifact hygiene block equivalent at every runtime boundary', async () => {
    const runtimeSurfaces = [
      ['.agents/agents/oat-phase-implementer.md', '1.1.2'],
      ['.agents/agents/oat-reviewer.md', '1.2.1'],
      ['.agents/skills/oat-project-review-provide/SKILL.md', '1.5.3'],
      ['.agents/skills/oat-project-review-receive/SKILL.md', '1.6.2'],
      ['.agents/skills/oat-project-summary/SKILL.md', '1.5.1'],
      ['.agents/skills/oat-project-document/SKILL.md', '1.8.1'],
      ['.agents/skills/oat-project-pr-final/SKILL.md', '1.6.1'],
      ['.agents/skills/oat-project-quick-start/SKILL.md', '2.3.8'],
    ] as const;

    for (const [path, expectedVersion] of runtimeSurfaces) {
      const content = await readRepoFile(path);
      expect(content, `${path} diagnostic lead-in`).toContain(
        'Artifact hygiene contract:',
      );
      expect(
        extractArtifactHygieneContract(content),
        `${path} complete hygiene block`,
      ).toBe(artifactHygieneContract);
      expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim(), path).toBe(
        expectedVersion,
      );
    }

    const phaseImplementer = await readRepoFile(
      '.agents/agents/oat-phase-implementer.md',
    );
    expect(phaseImplementer).toMatch(
      /applicable gate set[\s\S]{0,120}produced\s+diff[\s\S]{0,120}including artifact writes/i,
    );

    for (const surfacePath of runtimeSurfaces
      .slice(1)
      .map(([entryPath]) => entryPath)) {
      const content = await readRepoFile(surfacePath);
      expect(content, `${surfacePath} relevant changed-file checks`).toMatch(
        /only repository checks relevant to the files\s+changed/i,
      );
      expect(content, `${surfacePath} no unrelated full suites`).toMatch(
        /does not imply unrelated full\s+test suites/i,
      );
    }
  });

  it('requires complete dispatch-ladder adoption in an explicit ownership scope', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );

    expect(shared).toMatch(/Complete Dispatch Ladder Adoption Contract/);
    expect(shared).toContain('ladderCompleteness.complete');
    expect(shared).toContain('ladderCompleteness.missingCells');
    expect(shared).toMatch(/unresolvedReason` is `ladder` or `both`/);
    expect(shared).toMatch(
      /Codex[\s\S]{0,500}Luna\/low[\s\S]{0,120}Luna\/medium[\s\S]{0,120}Luna\/high[\s\S]{0,500}Terra\/xhigh[\s\S]{0,500}Sol\/max/i,
    );
    expect(shared).toMatch(
      /Claude[\s\S]{0,300}haiku[\s\S]{0,120}sonnet[\s\S]{0,120}opus[\s\S]{0,120}fable/i,
    );
    for (const cursorTarget of [
      'gpt-5.6-luna-low',
      'gpt-5.6-terra-medium',
      'gpt-5.6-sol-high',
      'gpt-5.6-sol-max',
    ]) {
      expect(
        shared,
        `complete Cursor recommendation ${cursorTarget}`,
      ).toContain(cursorTarget);
    }
    for (const scopeFlag of ['--shared', '--local', '--user']) {
      expect(shared, `explicit ownership scope ${scopeFlag}`).toContain(
        `oat config adopt dispatch-matrix ${scopeFlag}`,
      );
    }
    expect(shared).toMatch(
      /ask[\s\S]{0,240}(?:owning|ownership) scope[\s\S]{0,320}before[\s\S]{0,120}(?:write|adopt)/i,
    );
    expect(shared).toMatch(
      /adoption preserves explicit[\s\S]{0,260}re-run[\s\S]{0,260}(?:incomplete|missing)[\s\S]{0,180}(?:block|not implementation-ready)/i,
    );
    expect(shared).toMatch(
      /non-interactive[\s\S]{0,300}(?:incomplete|missing) (?:ladder|effective cells)[\s\S]{0,220}(?:block|not implementation-ready)/i,
    );
    expect(shared).toMatch(
      /project-specific[\s\S]{0,120}(?:active )?(?:policy|ceiling)[\s\S]{0,220}(?:must not|do not|never)[\s\S]{0,120}(?:user|~\/\.oat)/i,
    );
  });

  it('uses the merged effective config before offering dispatch-ladder adoption', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    const adoptionContract = shared.slice(
      shared.indexOf('### Complete Dispatch Ladder Adoption Contract'),
      shared.indexOf('### Reviewer Ceiling Contract'),
    );

    expect(shared).toMatch(
      /dispatch-ceiling resolve --provider "\$ACTIVE_PROVIDER" --role reviewer --preflight --json/,
    );
    expect(adoptionContract).toMatch(
      /reviewer resolver\s+envelope[\s\S]{0,180}effective configuration[\s\S]{0,120}resolution boundary/i,
    );
    expect(adoptionContract).toMatch(
      /do not inspect or merge raw\s+config surfaces/i,
    );
    expect(adoptionContract).toMatch(
      /`unresolvedReason` is `policy`[\s\S]{0,180}ladder adoption separate/i,
    );
    expect(adoptionContract).toMatch(
      /`ladderCompleteness\.complete` is `true`[\s\S]{0,120}skip adoption/i,
    );
    expect(adoptionContract).toMatch(
      /when adoption is required[\s\S]{0,200}bundled recommendation/i,
    );
    expect(shared.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.2.21');
  });

  it('auto-selects an existing dispatch-ladder scope only under explicit autonomy', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    const autonomous = await readRepoFile(
      '.agents/skills/oat-project-autonomous/SKILL.md',
    );
    const gateInventory = await readRepoFile(
      '.agents/skills/oat-project-autonomous/references/gate-inventory.md',
    );

    expect(shared).not.toContain('oat config list --json');
    expect(shared).toMatch(
      /fixed order: user config\s+`~\/\.oat\/config\.json`, repo-local config `\.oat\/config\.local\.json`, then shared\s+config/i,
    );
    expect(shared).toMatch(
      /do not ask which scope to use[\s\S]{0,100}do\s+not reorder candidates/i,
    );
    expect(shared).toMatch(
      /OAT_AUTONOMOUS=1[\s\S]{0,1000}user config[\s\S]{0,180}repo-local[\s\S]{0,500}shared/i,
    );
    expect(shared).toMatch(
      /adoption-compatible[\s\S]{0,400}provider-level scalar[\s\S]{0,240}higher precedence[\s\S]{0,500}before any write/i,
    );
    expect(shared).toMatch(
      /explicit matrix cells remain[\s\S]{0,180}provenance does not choose the persistence scope/i,
    );
    expect(shared).toMatch(
      /run exactly one matching adoption command[\s\S]{0,320}re-run the reviewer\s+preflight resolver/i,
    );
    expect(shared).toMatch(
      /non-interactive mode without `OAT_AUTONOMOUS=1`[\s\S]{0,180}blocks?/i,
    );
    expect(autonomous).toMatch(
      /fixed order[\s\S]{0,100}user config[\s\S]{0,100}repo-local config[\s\S]{0,100}authorized shared config[\s\S]{0,220}do not prompt[\s\S]{0,180}matrix-cell provenance/i,
    );
    expect(autonomous).toMatch(
      /before\s+writing[\s\S]{0,400}provider[\s-]+scalar[\s\S]{0,320}higher precedence[\s\S]{0,320}block without\s+mutation/i,
    );
    expect(autonomous).toMatch(
      /run exactly one\s+matching\s+`oat config adopt dispatch-matrix` command[\s\S]{0,120}re-run the reviewer\s+preflight/i,
    );
    for (const gateId of ['QS-08', 'PLAN-05', 'IMPORT-05']) {
      const row = gateInventory
        .split('\n')
        .find((line) => line.includes(`| ${gateId}`));
      expect(row, `${gateId} autonomous scope row`).toBeDefined();
      expect(row).toContain('Check existing user, local');
      expect(row).toContain('without prompting');
      expect(row).toContain('provenance-based reordering');
      expect(row).toContain('scalar-blocked');
      expect(row).toContain('stop before writing');
      expect(row).toContain('`auto-resolve`');
    }
  });

  it('adopts ladders and records named maximum ceilings in every planning path', async () => {
    const paths = [
      [
        'spec-driven',
        await readRepoFile('.agents/skills/oat-project-plan/SKILL.md'),
      ],
      [
        'quick-start',
        await readRepoFile('.agents/skills/oat-project-quick-start/SKILL.md'),
      ],
      [
        'import-plan',
        await readRepoFile('.agents/skills/oat-project-import-plan/SKILL.md'),
      ],
    ] as const;

    for (const [name, content] of paths) {
      expect(content, `${name} shared adoption contract`).toMatch(
        /Complete Dispatch Ladder Adoption Contract/,
      );
      expect(content, `${name} explicit scope adoption`).toMatch(
        /oat config adopt dispatch-matrix[\s\S]{0,160}(?:--shared|--local|--user)/,
      );
      expect(content, `${name} named maximum`).toMatch(
        /named (?:tier|ceiling)[\s\S]{0,220}(?:maximum|max)[\s\S]{0,220}(?:lower|beneath|at or below)/i,
      );
      expect(content, `${name} project-state persistence`).toMatch(
        /oat_dispatch_policy:[\s\S]{0,140}mode:\s*managed[\s\S]{0,140}policy:\s*(?:economy|balanced|high|frontier)/i,
      );
      expect(
        content,
        `${name} no exact provider pin in project policy`,
      ).not.toMatch(/oat_dispatch_policy:[\s\S]{0,220}providers:/i);
      expect(content, `${name} no user policy leakage`).toMatch(
        /(?:project-specific|active project)[\s\S]{0,160}(?:policy|ceiling)[\s\S]{0,220}(?:must not|do not|never)[\s\S]{0,120}(?:user|~\/\.oat)/i,
      );
      expect(content, `${name} incomplete ladder blocks readiness`).toMatch(
        /(?:incomplete|missing) ladder[\s\S]{0,260}(?:block|not .*ready|do not .*ready)/i,
      );
    }

    expect(paths[2][1]).toMatch(
      /provider-plan-via-import[\s\S]{0,600}(?:same|inherits)[\s\S]{0,220}(?:adoption|ceiling)/i,
    );
  });

  it('treats project and phase tiers as candidate maxima rather than exact family preferences', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    const dispatchProfile = shared.slice(
      shared.indexOf('### Dispatch Profile Overrides'),
      shared.indexOf('### Stable Task IDs'),
    );

    expect(dispatchProfile).toContain('| Phase | Named ceiling');
    expect(dispatchProfile).toContain(
      'economy\\|balanced\\|high\\|frontier\\|auto',
    );
    expect(dispatchProfile).toMatch(
      /maximum[\s\S]{0,220}(?:not|never)[\s\S]{0,180}(?:exact model|model-family|effort)/i,
    );
    expect(dispatchProfile).toMatch(
      /High[\s\S]{0,240}(?:Economy|economy)[\s\S]{0,120}(?:Balanced|balanced)[\s\S]{0,120}(?:High|high)[\s\S]{0,160}(?:available|eligible)/,
    );
    expect(dispatchProfile).not.toContain('Claude model');
    expect(dispatchProfile).not.toContain('Codex effort');
  });

  it('keeps reviewers at their configured ceiling and lifecycle gates target-neutral', async () => {
    const planWriting = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    const reviewProvide = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    const artifactReview = planWriting.slice(
      planWriting.indexOf('## Managed Dispatch Readiness and Review Contract'),
      planWriting.indexOf('## Shared Phase-Review Setup Contract'),
    );
    const projectReview = reviewProvide.slice(
      reviewProvide.indexOf(
        '**Step 6.0: Resolve the managed reviewer target**',
      ),
      reviewProvide.indexOf('**Step 6a: Probe Subagent Availability**'),
    );

    for (const [name, content] of [
      ['artifact review', artifactReview],
      ['project review', projectReview],
    ] as const) {
      expect(content, `${name} reviewer ceiling`).toMatch(
        /reviewer[\s\S]{0,260}(?:final candidate|configured review ceiling|ceiling candidate)/i,
      );
      expect(content, `${name} reviewed lowering exception`).toMatch(
        /lower candidate[\s\S]{0,260}(?:separate|separately)[\s\S]{0,180}reviewed contract/i,
      );
      expect(content, `${name} no ephemeral candidate flags`).not.toMatch(
        /--candidate-(?:model|effort)/,
      );
      expect(content, `${name} Claude payload`).toContain(
        'providers.claude.dispatchArgs.model',
      );
      expect(content, `${name} Cursor payload`).toContain(
        'providers.cursor.dispatchArgs.variant',
      );
      expect(content, `${name} accepted-handle continuation`).toMatch(
        /(?:After acceptance|accepted reviewer)[\s\S]{0,220}(?:existing|same) (?:reviewer |child )?handle/i,
      );
      expect(content, `${name} terminal no replacement`).toMatch(
        /terminal timeout[\s\S]{0,180}(?:block|escalate)[\s\S]{0,180}(?:without another launch|cannot launch a replacement)/i,
      );
    }

    for (const skillName of [
      'oat-project-plan',
      'oat-project-quick-start',
      'oat-project-import-plan',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      const gateSection = sliceFromLastGateExecutionHeading(content, skillName);
      expect(gateSection, `${skillName} lifecycle target neutrality`).toMatch(
        /must not (?:contain|include|add)[\s\S]{0,100}--target/i,
      );
    }
  });

  it('restores one direct phase implementer with optional nested dispatch', async () => {
    const agent = await readRepoFile('.agents/agents/oat-phase-implementer.md');
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );

    expect(agent.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.1.2');
    expect(agent.match(/^description:\s*(.+)$/m)?.[1]).toMatch(
      /implements one plan phase end-to-end/i,
    );
    expect(agent.match(/^tools:\s*(.+)$/m)?.[1]).toContain('Task');
    expect(implement.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('2.3.2');
    expect(agent).toMatch(
      /directly execute(?:s)? every task in dependency order/i,
    );
    expect(agent).toMatch(/one\s+verified\s+commit per task/i);
    expect(agent).toContain('between-task transition check');
    expect(agent).toMatch(
      /HEAD exactly equals\s+`phase_base_head`[\s\S]{0,300}Never\s+use ancestry from `expected_base_sha` as a substitute/i,
    );
    expect(agent).toContain('git -c core.hooksPath=/dev/null commit');
    expect(agent).toContain('`--no-verify`');
    expect(agent).toContain('Phase-Wide Self-Review');
    expect(agent).toMatch(/Ordinary phase tasks are implemented directly/i);
    expect(agent).toMatch(/Nested dispatch is optional/i);
    expect(agent).toContain(
      '${PROJECT_DISPATCH_SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md',
    );
    expect(agent).toContain(
      '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md',
    );
    expect(agent).toMatch(
      /root[\s\S]{0,180}dispatches the independent phase reviewer/i,
    );
    expect(agent).toContain('`continuation_events`');
    expect(agent).toMatch(/do not invent a new\s+schema/i);

    const perPhase = implement.slice(
      implement.indexOf('### Step 5: Per-Phase Execution'),
      implement.indexOf('### Per-Phase Review'),
    );
    expect(perPhase).toContain('--ceiling-tier');
    expect(perPhase).toMatch(/one exact phase implementer target/i);
    expect(perPhase).toMatch(/Phase Scope:[\s\S]{0,800}phase_base_head:/i);
    expect(perPhase).toMatch(/Ordinary tasks do not require per-task workers/i);
    expect(perPhase).toMatch(/optional bounded child/i);
    expect(perPhase).toMatch(/exactly one append-only commit in plan\s+order/i);
  });

  it('requires tiered task prevention before every planned commit', async () => {
    const agent = await readRepoFile('.agents/agents/oat-phase-implementer.md');
    const taskExecution = agent.slice(
      agent.indexOf('### 2. Execute Tasks in Plan Order'),
      agent.indexOf('### 3. Phase-Wide Self-Review'),
    );

    expect(taskExecution).toMatch(
      /format[\s\S]{0,220}declared task verification[\s\S]{0,260}discoverable[\s\S]{0,120}proportionate[\s\S]{0,220}before commit/i,
    );
    expect(taskExecution).toMatch(
      /emitted output[\s\S]{0,160}build\/test configuration[\s\S]{0,220}scoped (?:build|test)[\s\S]{0,180}before commit/i,
    );
    expect(taskExecution).toMatch(
      /broad repository (?:tests|builds)[\s\S]{0,220}phase[\s\S]{0,180}disproportionate/i,
    );
    expect(taskExecution).toMatch(
      /prevention[\s\S]{0,160}(?:does not consume|without consuming)[\s\S]{0,160}recovery attempt/i,
    );
  });

  it('defines dedicated bounded phase recovery and zero-limit behavior', async () => {
    const implement = await readRawRepoFile(implementSkillPath);
    const phase = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/phase-execution.md',
    );
    const state = await readRepoFile('.oat/templates/state.md');
    const lifecycle = `${implement}\n${phase}`;

    for (const content of [state, lifecycle]) {
      expect(content).toContain('oat_phase_recovery_policy');
      expect(content).toMatch(/default_attempt_limit:\s*10/);
      expect(content).toMatch(/phase_attempt_limits:/);
    }
    expect(lifecycle).toMatch(
      /default[\s\S]{0,100}10[\s\S]{0,180}phase-specific[\s\S]{0,180}0[\s\S]{0,40}20/i,
    );
    expect(lifecycle).toMatch(
      /project default[\s\S]{0,120}(?:limit|value)[\s\S]{0,80}`?0`?[\s\S]{0,240}stop[\s\S]{0,160}without edit[\s\S]{0,80}commit[\s\S]{0,100}consum[\s\S]{0,180}fallback/i,
    );
    expect(lifecycle).toMatch(
      /phase-specific[\s\S]{0,120}(?:limit|override)[\s\S]{0,80}`?0`?[\s\S]{0,240}stop[\s\S]{0,160}without edit[\s\S]{0,80}commit[\s\S]{0,100}consum[\s\S]{0,180}fallback/i,
    );
    expect(phase).toMatch(
      /Phase Scope:[\s\S]{0,2600}phase_recovery_limit:[\s\S]{0,160}phase_recovery_attempts_used:[\s\S]{0,500}original_request_id:[\s\S]{0,400}dispatch_target:/i,
    );
  });

  it('authorizes only mechanically bounded same-target append-only recovery', async () => {
    const agent = await readRepoFile('.agents/agents/oat-phase-implementer.md');
    const phase = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/phase-execution.md',
    );
    const contract = `${agent}\n${phase}`;

    for (const defectClass of [
      'lint',
      'type',
      'test',
      'build',
      'composition',
    ]) {
      expect(contract, `${defectClass} automatic recovery`).toMatch(
        new RegExp(
          `${defectClass}[\\s\\S]{0,320}(?:automatic|eligible|recover|continu)`,
          'i',
        ),
      );
    }
    expect(contract).toMatch(
      /accepted task commit[\s\S]{0,220}immutable[\s\S]{0,220}same history position/i,
    );
    expect(contract).toMatch(
      /one append-only recovery commit[\s\S]{0,180}(?:per|for each)\s+successful\s+attempt/i,
    );
    expect(contract).toMatch(
      /mechanically related failures[\s\S]{0,220}same\s+verification\s+command[\s\S]{0,220}one\s+atomic[\s\S]{0,160}attempt[\s\S]{0,120}commit/i,
    );
    expect(contract).toMatch(
      /independent failures[\s\S]{0,180}separate attempts[\s\S]{0,120}commits/i,
    );
    expect(contract).toMatch(
      /attempt[\s\S]{0,120}consumed[\s\S]{0,180}before edit|before editing[\s\S]{0,180}consume(?:s|d)? one attempt/i,
    );
    expect(contract).toMatch(
      /failed edit[\s\S]{0,100}commit[\s\S]{0,120}re-verification[\s\S]{0,180}consume[\s\S]{0,160}no successful recovery commit/i,
    );
    expect(contract).toMatch(
      /three (?:recovery )?events[\s\S]{0,180}(?:elevated|warning)[\s\S]{0,180}continue/i,
    );
  });

  it('pins flake handling, provenance, recovery events, and fail-closed stops', async () => {
    const agent = await readRepoFile('.agents/agents/oat-phase-implementer.md');
    const phase = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/phase-execution.md',
    );
    const dispatch = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md',
    );
    const contract = `${agent}\n${phase}\n${dispatch}`;

    expect(contract).toMatch(
      /one no-edit rerun[\s\S]{0,180}(?:without|does not)[\s\S]{0,160}(?:attempt consumption|consume an attempt)/i,
    );
    expect(contract).toMatch(
      /repeated unexplained failure[\s\S]{0,220}ambiguous[\s\S]{0,160}stop[\s\S]{0,120}without edit/i,
    );
    expect(contract).toMatch(
      /fresh same-target[\s\S]{0,220}original request[\s\S]{0,220}`continuation_events`/i,
    );
    expect(contract).toMatch(
      /exact target[\s\S]{0,180}(?:lost|cannot continue)[\s\S]{0,180}stop/i,
    );
    expect(contract).toMatch(
      /original request[\s\S]{0,160}original commit[\s\S]{0,160}defect class[\s\S]{0,160}discovered by[\s\S]{0,160}disposition[\s\S]{0,160}authorization[\s\S]{0,160}attempt[\s\S]{0,160}dispatch target[\s\S]{0,160}recovery commit[\s\S]{0,160}verification[\s\S]{0,160}reason/i,
    );
    expect(contract).toMatch(
      /exactly one (?:canonical )?recovery event[\s\S]{0,240}recovered[\s\S]{0,120}direction-required[\s\S]{0,120}failed-attempt/i,
    );
    expect(contract).toMatch(
      /defect count[\s\S]{0,120}prompt count[\s\S]{0,160}successful repair count[\s\S]{0,180}independent/i,
    );

    for (const stop of [
      'ambiguous',
      'architecture',
      'security',
      'product',
      'requirements',
      'non-mechanical',
      'destructive',
      'retry exhaustion',
      'dirty worktree',
      'cannot establish correctness',
      'missing original-request',
      'missing exact-target',
      'unverifiable commit range',
      'malformed recovery event',
      'governance cap',
    ]) {
      expect(contract, `${stop} stop boundary`).toMatch(
        new RegExp(`${stop}[\\s\\S]{0,260}(?:stop|block|direction)`, 'i'),
      );
    }
    expect(contract).toMatch(
      /implementation recovery[\s\S]{0,260}(?:must not|does not|never)[\s\S]{0,180}route escalation/i,
    );
  });

  it('preserves attempt usage, immutable history, and unchanged governance loops', async () => {
    const phase = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/phase-execution.md',
    );
    const dispatch = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md',
    );
    const contract = `${phase}\n${dispatch}`;

    expect(contract).toMatch(
      /Add N attempts[\s\S]{0,180}used_attempts \+ N[\s\S]{0,160}phase_attempt_limits[\s\S]{0,140}20[\s\S]{0,200}(?:do not|never)[\s\S]{0,80}reset/i,
    );
    expect(contract).toMatch(
      /extension[\s\S]{0,180}preserve[\s\S]{0,120}exact implementation target/i,
    );
    expect(contract).toMatch(
      /amend[\s\S]{0,80}reset[\s\S]{0,80}rebase[\s\S]{0,80}squash[\s\S]{0,180}invalid/i,
    );
    expect(contract).toMatch(
      /dirty worktree[\s\S]{0,180}unverifiable\s+commit\s+range[\s\S]{0,180}missing\s+provenance[\s\S]{0,180}malformed\s+recovery\s+event[\s\S]{0,260}block/i,
    );
    expect(contract).toMatch(
      /review-fix[\s\S]{0,120}gate[\s\S]{0,180}`oat_orchestration_retry_limit`[\s\S]{0,220}unchanged/i,
    );
    expect(contract).toMatch(
      /three-cycle review[\s\S]{0,180}(?:cap|governance)[\s\S]{0,180}unchanged/i,
    );

    const baseCapture = 'PHASE_BASE_HEAD=$(git rev-parse HEAD)';
    const baseIndex = phase.indexOf(baseCapture);
    const scopeIndex = phase.indexOf('Send one self-contained Phase Scope');
    expect(baseIndex).toBeGreaterThan(-1);
    expect(scopeIndex).toBeGreaterThan(baseIndex);
    expect(phase.slice(baseIndex, scopeIndex)).not.toMatch(
      /dispatch|launch|spawn/i,
    );
  });

  it('defines an isolated fresh same-target recovery continuation mode', async () => {
    const agent = await readRawRepoFile(
      '.agents/agents/oat-phase-implementer.md',
    );
    const recover = agent.slice(agent.indexOf('## Mode: Recover'));

    expect(agent).toMatch(
      /mode[\s\S]{0,160}`implement`[\s\S]{0,80}`fix`[\s\S]{0,80}`recover`/i,
    );
    expect(recover).toMatch(
      /continuation\s+of\s+a\s+post-commit\s+recovery\s+attempt/i,
    );
    for (const field of [
      'original_request_id',
      'continuation_event',
      'recovery_base_head',
      'original_task_id',
      'original_commit',
      'defect_class',
      'discovered_by',
      'bounded_correction_scope',
      'bounded_files',
      'phase_recovery_limit',
      'phase_recovery_attempts_used',
      'pending_attempt',
      'focused_verification',
      'phase_verification',
      'dispatch_target',
      'dispatch_axes',
      'dispatch_stamp',
    ]) {
      expect(recover, `recover input ${field}`).toContain(field);
    }
    expect(recover).toMatch(
      /must\s+not\s+replay[\s\S]{0,180}planned\s+tasks[\s\S]{0,180}(?:must\s+not|does\s+not)[\s\S]{0,180}review\s+artifact/i,
    );
    expect(recover).toMatch(
      /HEAD\s+exactly\s+equals[\s\S]{0,160}`recovery_base_head`[\s\S]{0,260}(?:original commit|`original_commit`)[\s\S]{0,220}same\s+history\s+position/i,
    );
    expect(recover).toMatch(
      /exact launcher-owned target[\s\S]{0,220}(?:must|equals|matches)[\s\S]{0,180}original target/i,
    );
    expect(recover).toMatch(/Phase Recovery Continuation Report/);
    expect(recover).toMatch(
      /Original request ID:[\s\S]{0,120}Continuation event:[\s\S]{0,120}Original task\/commit:[\s\S]{0,160}Attempt:[\s\S]{0,160}Dispatch target:[\s\S]{0,160}Dispatch stamp:[\s\S]{0,160}Recovery commit:[\s\S]{0,120}Verification:/i,
    );
  });

  it('makes handle continuity alternatives compatible with exact-target recovery', async () => {
    const contracts = [
      [
        'phase agent',
        await readRawRepoFile('.agents/agents/oat-phase-implementer.md'),
      ],
      [
        'phase root',
        await readRawRepoFile(
          '.agents/skills/oat-project-implement/references/phase-execution.md',
        ),
      ],
    ] as const;

    for (const [name, contract] of contracts) {
      expect(contract, `${name} exact-target invariant`).toMatch(
        /exact target[\s\S]{0,220}(?:must remain|remains)[\s\S]{0,160}unchanged[\s\S]{0,80}bindable[\s\S]{0,180}regardless of handle/i,
      );
      expect(contract, `${name} same-handle branch`).toMatch(
        /handle[\s\S]{0,120}(?:available|resumable)[\s\S]{0,220}same-handle\s+continuation/i,
      );
      expect(contract, `${name} fresh-recover branch`).toMatch(
        /handle[\s\S]{0,160}(?:unavailable|unresumable|cannot be resumed)[\s\S]{0,260}unchanged[\s\S]{0,120}bindable\s+exact\s+target[\s\S]{0,260}lifecycle-authorized\s+recover\s+scope[\s\S]{0,220}reconciled\s+pending\s+attempt[\s\S]{0,220}continuation\s+linkage[\s\S]{0,260}(?:fresh\s+)?`?mode:\s*recover`?/i,
      );
      expect(contract, `${name} target-loss branch`).toMatch(
        /(?:lost|unbindable)\s+exact\s+target[\s\S]{0,220}direction-required[\s\S]{0,220}no\s+fallback/i,
      );
      expect(contract, `${name} handle-only eligibility`).toMatch(
        /handle\s+unavailability\s+alone[\s\S]{0,220}(?:does not|must not)[\s\S]{0,160}(?:ineligible|block|stop)/i,
      );
      expect(contract, `${name} contradictory conjunction`).not.toMatch(
        /accepted implementation handle and exact (?:launcher-owned dispatch )?target[\s\S]{0,80}remain (?:available|intact)/i,
      );
    }
  });

  it('prescribes verified capture-and-restore before a fresh child continues on a dirty tree', async () => {
    const agent = await readRawRepoFile(
      '.agents/agents/oat-phase-implementer.md',
    );
    const phase = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/phase-execution.md',
    );

    expect(phase).toMatch(
      /a\s+fresh\s+child\s+never\s+starts\s+on\s+a\s+dirty\s+tree/i,
    );
    expect(phase).toMatch(
      /dirty worktree[\s\S]{0,120}blocks continuation[\s\S]{0,240}`recovered_patch`[\s\S]{0,240}unverified[\s\S]{0,160}still blocks/i,
    );

    let cursor = -1;
    for (const step of [
      'capture-dirty-tree.mjs',
      'capture-script-unavailable',
      'cannot still be writing',
      'node "$CAPTURE_SCRIPT"',
      '--bounded-file',
      '`round-trip-failed`',
      'restore --staged',
      '`recovered_patch`',
      '--verify',
      '--expected-head',
      'git apply --index',
      'commits it as its first',
      'continuation event',
    ]) {
      const next = phase.indexOf(step, cursor + 1);
      expect(next, `ordered capture chain step ${step}`).toBeGreaterThan(
        cursor,
      );
      cursor = next;
    }

    const contracts = [
      ['phase root', phase],
      ['phase agent', agent],
    ] as const;

    for (const [name, contract] of contracts) {
      // Resolved through installed scope, never a repository-relative literal:
      // a user-scope install has no `.agents/skills/...` under the process cwd,
      // and a MODULE_NOT_FOUND there is not one of the named stop reasons the
      // same prose requires the operator to report verbatim.
      expect(contract, `${name} capture script`).toContain(
        'scripts/capture-dirty-tree.mjs',
      );
      expect(contract, `${name} capture script resolution roots`).toMatch(
        /(?:\$\{SKILL_DIR:-\}|\$\{HOME:-\}\/\.agents\/skills)[\s\S]{0,400}scripts\/capture-dirty-tree\.mjs/,
      );
      // Per invoking block, not per file. `node ""` reads its program from
      // stdin and exits zero at EOF, so a block that runs the script without
      // resolving and guarding it in the same block reports an unverified
      // artifact as verified — shell variables do not survive across separate
      // tool invocations, and a guard in some other block does not protect it.
      const invokingBlocks = fencedBlocks(contract).filter((block) =>
        block.includes('node "$CAPTURE_SCRIPT"'),
      );
      expect(
        invokingBlocks.length,
        `${name} blocks invoking the capture script`,
      ).toBeGreaterThan(0);
      for (const [index, block] of invokingBlocks.entries()) {
        const label = `${name} capture invocation block ${index + 1}`;
        // Before the invocation, not merely somewhere in the block.
        expect(block, `${label} runs under set -eu`).toMatch(/^\s*set -eu$/m);
        expect(
          block.search(/^\s*set -eu$/m),
          `${label} sets -eu before it runs`,
        ).toBeLessThan(block.indexOf('node "$CAPTURE_SCRIPT"'));
        expect(block, `${label} binds the probed root`).toContain(
          'CAPTURE_SCRIPT="$CAPTURE_ROOT/scripts/capture-dirty-tree.mjs"',
        );
        expect(block, `${label} terminates on a miss`).toMatch(
          /\[ -n "\$CAPTURE_SCRIPT" \] \|\| \{[\s\S]{0,160}capture-script-unavailable[\s\S]{0,80}exit 1/,
        );
        expect(
          block.indexOf('capture-script-unavailable'),
          `${label} guards before it runs`,
        ).toBeLessThan(block.indexOf('node "$CAPTURE_SCRIPT"'));
        // A bare `<placeholder>` after a flag is shell input redirection, not a
        // placeholder, so a block carrying one is not runnable verbatim.
        expect(block, `${label} has no unquoted placeholder`).not.toMatch(
          /--[a-z-]+ <[a-z_]+>/,
        );
      }
      expect(
        contract,
        `${name} no repo-relative capture invocation`,
      ).not.toMatch(
        /node\s+"?\.agents\/skills\/oat-project-implement\/scripts\/capture-dirty-tree\.mjs/,
      );
      for (const reason of [
        'active-writer',
        'unsupported-dirt',
        'round-trip-failed',
        'artifact-verification-failed',
      ]) {
        // Presence is not enough: each reason has to sit inside a clause that
        // still calls it a stop, so a prose rewrite cannot quietly turn one
        // into a best-effort path.
        expect(contract, `${name} ${reason} stop clause`).toMatch(
          new RegExp(`${reason}[\\s\\S]{0,320}\\bstop`, 'i'),
        );
      }
      expect(contract, `${name} recovered_patch brief field`).toMatch(
        /recovered_patch:\s*\{\s*artifact,\s*manifest_digest,\s*size,\s*stat,\s*components\s*\}/,
      );
      expect(contract, `${name} artifact lives outside the worktree`).toMatch(
        /`artifact`\s+is\s+a\s+readable\s+path\s+outside\s+the\s+worktree,\s+never\s+a\s+mutable\s+worktree\s+path/i,
      );
      expect(contract, `${name} verifies before applying`).toMatch(
        /--verify[\s\S]{0,300}--manifest-digest[\s\S]{0,120}--size[\s\S]{0,160}--expected-head[\s\S]{0,1600}git apply --index/i,
      );
      expect(contract, `${name} reconciles the artifact base`).toMatch(
        /integrity is not base agreement/i,
      );
      expect(contract, `${name} refuses a best-effort restore`).toMatch(
        /(?:never|no)[\s\S]{0,120}best-effort restore/i,
      );
    }
  });

  it('uses one monotonic durable per-phase attempt ledger across resumes', async () => {
    const agent = await readRawRepoFile(
      '.agents/agents/oat-phase-implementer.md',
    );
    const phase = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/phase-execution.md',
    );
    const state = await readRepoFile('.oat/templates/state.md');
    const contract = `${phase}\n${agent}`;

    expect(state).toMatch(
      /phase_attempt_usage:[\s\S]{0,260}pNN:[\s\S]{0,160}used_attempts:\s*0[\s\S]{0,160}pending_attempt:/i,
    );
    expect(contract).toMatch(
      /authoritative[\s\S]{0,180}`?phase_attempt_usage`?[\s\S]{0,220}state\.md/i,
    );
    expect(contract).toMatch(
      /atomic[\s\S]{0,180}increment[\s\S]{0,180}used_attempts[\s\S]{0,220}pending_attempt[\s\S]{0,220}before edit/i,
    );
    expect(contract).toMatch(
      /nonzero[\s\S]{0,160}used_attempts[\s\S]{0,220}(?:resume|continu)/i,
    );
    expect(contract).toMatch(
      /pending attempt[\s\S]{0,260}reconcile[\s\S]{0,220}(?:same attempt|must not consume another)/i,
    );
    expect(contract).toMatch(
      /unreconciled[\s\S]{0,220}(?:reject|block|stop)[\s\S]{0,180}resume/i,
    );
    expect(contract).toMatch(
      /used_attempts[\s\S]{0,160}(?:equal to|>=|at least)[\s\S]{0,120}phase_recovery_limit[\s\S]{0,220}exhaust/i,
    );
    expect(contract).toMatch(
      /interruption[\s\S]{0,260}(?:preserve|survive)[\s\S]{0,220}(?:consumed|usage|attempt)/i,
    );
  });

  it('defines an ordered recovery ledger handoff transition matrix', async () => {
    const agent = await readRawRepoFile(
      '.agents/agents/oat-phase-implementer.md',
    );
    const phase = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/phase-execution.md',
    );
    const normalizedAgent = agent.replaceAll('`', '').replaceAll(/\s+/g, ' ');
    const verifier = phase.slice(
      phase.indexOf('#### Verify the Phase Report'),
      phase.indexOf('### Per-Phase Review'),
    );
    const normalizedVerifier = verifier.replaceAll(/\s+/g, ' ');

    const agentReservation = normalizedAgent.indexOf(
      'Before the first code edit for a new recovery attempt',
    );
    const agentTerminalMark = normalizedAgent.indexOf(
      'pre-commit pass atomically marks the pending entry completed',
      agentReservation,
    );
    const agentAuthoritativeRerun = normalizedAgent.indexOf(
      'Immediately rerun both checks against committed HEAD',
      agentTerminalMark,
    );
    const agentCommittedHandoff = normalizedAgent.indexOf(
      'committed pre-bookkeeping terminal handoff',
      agentAuthoritativeRerun,
    );
    const agentRootClear = normalizedAgent.indexOf(
      'Root clears an attempted-recovery marker',
      agentCommittedHandoff,
    );
    expect(
      [
        agentReservation,
        agentTerminalMark,
        agentAuthoritativeRerun,
        agentCommittedHandoff,
        agentRootClear,
      ],
      'phase-agent reservation → candidate marker → authoritative rerun → committed handoff → root clear order',
    ).toEqual(
      [
        ...new Set([
          agentReservation,
          agentTerminalMark,
          agentAuthoritativeRerun,
          agentCommittedHandoff,
          agentRootClear,
        ]),
      ].sort((left, right) => left - right),
    );
    expect(agentReservation).toBeGreaterThan(-1);

    const matrixStart = normalizedVerifier.indexOf(
      'Pre-bookkeeping terminal handoff matrix',
    );
    const directionRequiredValidation = normalizedVerifier.indexOf(
      '| `direction-required` before any attempt |',
      matrixStart,
    );
    const recoveredValidation = normalizedVerifier.indexOf(
      '| Recovery reported as `recovered` |',
      directionRequiredValidation,
    );
    const failedValidation = normalizedVerifier.indexOf(
      '| Recovery reported as `failed-attempt` |',
      recoveredValidation,
    );
    const rejectionRows = normalizedVerifier.indexOf(
      '| Attempt reported with `pending_attempt: null` |',
      failedValidation,
    );
    const validatedClear = normalizedVerifier.indexOf(
      'Only after a selected `recovered` or `failed-attempt` row validates completely may root bookkeeping clear `pending_attempt`',
      rejectionRows,
    );
    const settledState = normalizedVerifier.indexOf(
      'The post-bookkeeping result is the only settled state for an attempted recovery',
      validatedClear,
    );
    expect(
      [
        matrixStart,
        directionRequiredValidation,
        recoveredValidation,
        failedValidation,
        rejectionRows,
        validatedClear,
        settledState,
      ],
      'root pre-bookkeeping matrix → validation → clear → settled order',
    ).toEqual(
      [
        ...new Set([
          matrixStart,
          directionRequiredValidation,
          recoveredValidation,
          failedValidation,
          rejectionRows,
          validatedClear,
          settledState,
        ]),
      ].sort((left, right) => left - right),
    );
    expect(matrixStart).toBeGreaterThan(-1);

    expect(verifier).toMatch(
      /\|\s*No recovery attempt reported\s*\|\s*`pending_attempt: null`[\s\S]{0,360}success may continue/i,
    );
    expect(verifier).toMatch(
      /\|\s*`direction-required` before any attempt\s*\|\s*`pending_attempt: null`[\s\S]{0,520}canonical `direction-required` event[\s\S]{0,360}unchanged usage[\s\S]{0,360}no reservation, edit, or recovery commit[\s\S]{0,360}record the event[\s\S]{0,180}stop/i,
    );
    expect(verifier).toMatch(
      /\|\s*Recovery reported as `recovered`\s*\|\s*Matching committed `completed` marker[\s\S]{0,520}immutable original history[\s\S]{0,360}recovery commit[\s\S]{0,360}exact target and axes[\s\S]{0,360}canonical `recovered` event[\s\S]{0,360}attempt count[\s\S]{0,360}verification/i,
    );
    expect(verifier).toMatch(
      /\|\s*Recovery reported as `failed-attempt`\s*\|\s*Matching committed `failed` marker[\s\S]{0,520}terminal-stop report[\s\S]{0,360}event[\s\S]{0,360}immutable history[\s\S]{0,360}accounting[\s\S]{0,360}stop disposition/i,
    );
    for (const invalid of [
      'Attempt reported with `pending_attempt: null`',
      'Terminal status or identity mismatch',
      'Marker status `active`',
      'Any other unreconciled or contradictory state',
    ]) {
      expect(verifier, invalid).toMatch(
        new RegExp(
          `\\|\\s*${invalid.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|[\\s\\S]{0,520}fail closed[\\s\\S]{0,240}no bookkeeping`,
          'i',
        ),
      );
    }
    expect(normalizedVerifier).toContain(
      'Only after a selected `recovered` or `failed-attempt` row validates completely may root bookkeeping clear `pending_attempt`, append the validated canonical event, and preserve monotonic `used_attempts`.',
    );
    expect(normalizedVerifier).toContain(
      'For `failed-attempt`, clearing must also preserve the terminal-stop disposition and then stop.',
    );
    expect(normalizedVerifier).toContain(
      'only for a Phase Implementation Report, verify each planned task commit is exactly one append-only commit in plan order',
    );
    expect(normalizedVerifier).toContain(
      'never require a Phase Recovery Continuation Report to replay or restate all planned task outcomes',
    );
    expect(normalizedVerifier).toContain(
      'for each reported attempted recovery (`recovered` or `failed-attempt`)',
    );
    expect(normalizedVerifier).toContain(
      'for a pre-attempt `direction-required` event',
    );
  });

  it('makes committed-tree verification authoritative for recovery outcomes', async () => {
    const agent = await readRawRepoFile(
      '.agents/agents/oat-phase-implementer.md',
    );
    const recover = agent.slice(
      agent.indexOf('## Mode: Recover'),
      agent.indexOf('## Mode: Fix'),
    );
    const normalizedRecover = recover.replaceAll(/\s+/g, ' ');

    expect(normalizedRecover).toMatch(
      /run `focused_verification` and `phase_verification` before creating a candidate commit/i,
    );
    expect(normalizedRecover).toMatch(
      /mark the pending entry `completed`[\s\S]{0,240}append-only candidate recovery commit/i,
    );
    expect(normalizedRecover).toMatch(
      /rerun `focused_verification` and `phase_verification` against the committed HEAD[\s\S]{0,180}authoritative/i,
    );
    expect(normalizedRecover).toMatch(
      /failure[\s\S]{0,180}replace `completed` with `failed`[\s\S]{0,220}ledger-only transition/i,
    );
    expect(normalizedRecover).toMatch(/claim no successful recovery commit/i);
  });

  it('distinguishes a reserved final attempt from a new exhausted attempt', async () => {
    const contracts = [
      [
        'phase root',
        await readRawRepoFile(
          '.agents/skills/oat-project-implement/references/phase-execution.md',
        ),
      ],
      [
        'phase agent',
        await readRawRepoFile('.agents/agents/oat-phase-implementer.md'),
      ],
    ] as const;

    for (const [name, contract] of contracts) {
      expect(
        contract,
        `${name} completes a reconciled final reservation`,
      ).toMatch(
        /limit\s*=\s*1[\s\S]{0,120}used\s*=\s*1[\s\S]{0,220}(?:fully|complete)[\s-]*reconcil(?:ed|iation)[\s\S]{0,180}matching\s+`?pending_attempt`?[\s\S]{0,260}continue[\s\S]{0,180}finish[\s\S]{0,160}same\s+(?:reserved\s+)?attempt[\s\S]{0,220}(?:without|must not)[\s\S]{0,100}(?:increment|consume)/i,
      );
      expect(contract, `${name} refuses a new exhausted reservation`).toMatch(
        /limit\s*=\s*1[\s\S]{0,120}used\s*=\s*1[\s\S]{0,220}no\s+`?pending_attempt`?[\s\S]{0,260}direction-required[\s\S]{0,180}before\s+edit[\s\S]{0,220}no\s+(?:new\s+)?reservation[\s\S]{0,180}no\s+fallback/i,
      );
    }
  });

  it('gives the isolated phase agent the exact canonical recovery event schema', async () => {
    const agent = await readRawRepoFile(
      '.agents/agents/oat-phase-implementer.md',
    );
    const heading = '### Recovery Event {event-id}';
    const labels = [
      '- Phase/task:',
      '- Original request:',
      '- Original commit:',
      '- Defect class:',
      '- Discovered by:',
      '- Disposition:',
      '- Authorization:',
      '- Attempt:',
      '- Dispatch target:',
      '- Recovery commit:',
      '- Verification:',
      '- Reason:',
    ];

    let previous = agent.indexOf(heading);
    expect(previous).toBeGreaterThan(-1);
    for (const label of labels) {
      const index = agent.indexOf(label, previous + 1);
      expect(index, `${label} ordering`).toBeGreaterThan(previous);
      previous = index;
    }
    expect(agent).toContain(
      'Defect class: lint | type | test | build | composition | other',
    );
    expect(agent).toContain(
      'Disposition: recovered | direction-required | failed-attempt',
    );
    expect(agent).toContain(
      'Authorization: phase-standing | operator-extension | operator-scope',
    );
  });

  it('validates accepted phase reports through an explicit status matrix', async () => {
    const phase = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/phase-execution.md',
    );
    const verifier = phase.slice(
      phase.indexOf('#### Verify the Phase Report'),
      phase.indexOf('### Per-Phase Review'),
    );

    expect(verifier).toMatch(/status matrix/i);
    expect(verifier).toMatch(
      /\|\s*`DONE`\s*\|[\s\S]{0,160}accepted success[\s\S]{0,160}continue/i,
    );
    expect(verifier).toMatch(
      /\|\s*`DONE_WITH_CONCERNS`\s*\|[\s\S]{0,260}accepted success[\s\S]{0,260}accepted terminal stop/i,
    );
    expect(verifier).toMatch(
      /\|\s*`BLOCKED`\s*\|[\s\S]{0,180}accepted terminal stop/i,
    );
    expect(verifier).toMatch(
      /accepted terminal-stop branch[\s\S]{0,280}provenance[\s\S]{0,180}attempt accounting[\s\S]{0,180}immutable history[\s\S]{0,180}(?:event shape|canonical recovery event)/i,
    );
    expect(verifier).toMatch(
      /`BLOCKED`[\s\S]{0,260}stop[\s\S]{0,180}(?:without|never)[\s\S]{0,160}continuation[\s\S]{0,160}fallback/i,
    );
  });

  it('documents adaptive named ceilings and exact task-worker dispatch', async () => {
    const configuration = await readRepoFile(
      'apps/oat-docs/docs/cli-utilities/configuration.md',
    );
    const dispatch = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md',
    );
    const providers = await readRepoFile(
      'apps/oat-docs/docs/provider-sync/providers.md',
    );
    const execution = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/implementation-execution.md',
    );

    for (const [name, content] of [
      ['configuration', configuration],
      ['dispatch policy', dispatch],
      ['provider sync', providers],
      ['implementation execution', execution],
    ] as const) {
      expect(content, `${name} named maximum`).toMatch(
        /named (?:tier|ceiling|maximum)[\s\S]{0,220}maximum/i,
      );
      expect(content, `${name} ordered candidates`).toMatch(
        /ordered (?:provider )?candidate|candidate ladder/i,
      );
    }

    for (const scope of ['--shared', '--local', '--user']) {
      expect(configuration, `configuration adoption ${scope}`).toContain(
        `oat config adopt dispatch-matrix ${scope}`,
      );
    }
    expect(configuration).toMatch(
      /project-specific[\s\S]{0,160}(?:policy|ceiling)[\s\S]{0,220}(?:must not|do not|never)[\s\S]{0,120}(?:user|~\/\.oat)/i,
    );
    expect(configuration).toContain('--ceiling-tier');
    expect(configuration).toContain('source: invocation');
    expect(configuration).toContain('cellSource');

    expect(dispatch).toMatch(
      /High[\s\S]{0,260}Economy[\s\S]{0,140}Balanced[\s\S]{0,140}High[\s\S]{0,180}(?:eligible|available)/,
    );
    expect(dispatch).toContain('candidates');
    expect(dispatch).toContain('--ceiling-tier');
    expect(dispatch).toContain('--candidate-model');
    expect(dispatch).toContain('--candidate-effort');
    expect(dispatch).not.toMatch(
      /oat_dispatch_policy:[\s\S]{0,220}providers:/i,
    );

    expect(providers).toMatch(
      /project-config[\s\S]{0,260}(?:tracked|version-controlled)[\s\S]{0,260}user-config[\s\S]{0,180}~\/\.codex/i,
    );
    expect(providers).toMatch(
      /phase implementer[\s\S]{0,300}directly executes/i,
    );
    expect(providers).toMatch(/optional nested/i);
    expect(providers).toContain('providers.claude.dispatchArgs.model');
    expect(providers).toContain('providers.cursor.dispatchArgs.variant');
    expect(providers).toMatch(
      /Cursor[\s\S]{0,300}(?:materialized|native)[\s\S]{0,240}variant/i,
    );

    expect(execution).toMatch(/root[\s\S]{0,160}phase implementer/i);
    expect(execution).toMatch(/one exact\s+phase implementer target/i);
    expect(execution).toMatch(/Phase Scope[\s\S]{0,600}phase_id:/i);
    expect(execution).toMatch(
      /serial(?:ly)?[\s\S]{0,220}(?:same|one) worktree/i,
    );
    expect(execution).toMatch(
      /directly (?:implements|executes)[\s\S]{0,220}(?:planned|phase) tasks?/i,
    );
    expect(execution).toContain('--ceiling-tier');
    expect(execution).toContain('providers.codex.dispatchArgs.variant');
    expect(execution).toContain('providers.claude.dispatchArgs.model');
    expect(execution).toContain('providers.cursor.dispatchArgs.variant');

    for (const [name, content] of [
      ['dispatch policy', dispatch],
      ['implementation execution', execution],
    ] as const) {
      expect(content, `${name} no exact-family policy mapping`).not.toContain(
        'min(preferred, cap)',
      );
      expect(content, `${name} root-owned phase execution`).toMatch(
        /phase implementer[\s\S]{0,300}(?:executes|implements)[\s\S]{0,200}tasks?/i,
      );
    }
  });

  it('documents Cursor materialization, ownership, and evidence boundaries', async () => {
    const providers = await readRepoFile(
      'apps/oat-docs/docs/provider-sync/providers.md',
    );
    const dispatch = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md',
    );
    const execution = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/implementation-execution.md',
    );
    const lifecycle = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/lifecycle.md',
    );
    const artifacts = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/artifacts.md',
    );
    const configuration = await readRepoFile(
      'apps/oat-docs/docs/cli-utilities/configuration.md',
    );

    for (const [name, content] of [
      ['providers', providers],
      ['dispatch', dispatch],
      ['execution', execution],
      ['lifecycle', lifecycle],
      ['artifacts', artifacts],
      ['configuration', configuration],
    ] as const) {
      expect(content, `${name} Cursor native variant`).toContain(
        'providers.cursor.dispatchArgs.variant',
      );
      expect(content, `${name} no stale Cursor model argument`).not.toContain(
        'providers.cursor.dispatchArgs.model',
      );
    }

    for (const [name, content] of [
      ['providers', providers],
      ['dispatch', dispatch],
      ['configuration', configuration],
    ] as const) {
      expect(content, `${name} flat ladder ID`).toMatch(/flat(?: ladder)? ID/i);
      expect(content, `${name} bracket frontmatter mapping`).toMatch(
        /bracket-form[\s\S]{0,160}(?:frontmatter|model)/i,
      );
      expect(content, `${name} supported ownership`).toContain(
        'supported-catalogue',
      );
      expect(content, `${name} project ownership`).toContain('project-config');
      expect(content, `${name} user ownership`).toContain('user-config');
      expect(content, `${name} silent fallback risk`).toMatch(
        /silent(?:ly)? fallback/i,
      );
      expect(content, `${name} doctor availability`).toMatch(
        /oat doctor[\s\S]{0,180}(?:catalogue|catalog|availability)/i,
      );
      expect(content, `${name} configured provenance`).toMatch(
        /configured[\s\S]{0,220}(?:not-reported|runtime identity)/i,
      );
    }
  });

  it('requires Cursor implementer dispatch to select a classified candidate', async () => {
    const dispatch = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md',
    );
    // Guard both markers before slicing: a missing one yields -1, which would
    // silently widen the slice to most of the file and let the assertions below
    // pass against text outside the Cursor rules.
    const cursorStart = dispatch.indexOf('Cursor rules:');
    const cursorEnd = dispatch.indexOf('Payload-first invariant');
    expect(cursorStart).toBeGreaterThanOrEqual(0);
    expect(cursorEnd).toBeGreaterThan(cursorStart);
    const cursorRules = dispatch.slice(cursorStart, cursorEnd);

    // Selection defers to the canonical mechanics contract instead of
    // restating it from the provider guidance table. Merging the two is what
    // produced a rule keyed on a taxonomy the Cursor table is not indexed by.
    expect(cursorRules).toMatch(
      /Task-Class Resolution contract in\s+`oat-dispatch-subagents\/references\/provider-cursor\.md`/,
    );
    expect(cursorRules).toMatch(/do not restate it here/i);

    // A phase classified below the ceiling must have somewhere to land.
    expect(cursorRules).toMatch(
      /lowest tier through the project's named maximum/,
    );

    // Omitting the flag resolves cleanly and returns the cap, so the contract
    // has to name both the requirement and the signature it leaves behind.
    expect(cursorRules).toMatch(/`--candidate-model` is required/);
    expect(cursorRules).toMatch(
      /`selectionMode=capped` with the selected model equal to the cap/,
    );
    expect(cursorRules).toMatch(/ceiling is a maximum, not a target/);
  });

  it('logs a provider-neutral task class alongside the selected candidate', async () => {
    const dispatch = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md',
    );

    expect(dispatch).toContain(
      'Classified task class: {mechanical-recon | intelligent-recon | default-implementation | hard-reasoning | consequential | not-classified}',
    );
    // The log must reuse the generic record vocabulary rather than defining a
    // second one.
    expect(dispatch).toMatch(
      /`task_class` field in\s+`oat-dispatch-subagents\/references\/record-schema\.md`/,
    );
    expect(dispatch).toMatch(/Do not introduce a second vocabulary here/i);
    expect(dispatch).toMatch(
      /`not-classified`[\s\S]{0,300}`Selection mode: capped`/,
    );
  });

  it('mirrors every resolver selection mode in the structured dispatch log', async () => {
    const dispatch = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md',
    );
    const resolver = await readRawRepoFile(
      'packages/cli/src/commands/project/dispatch-ceiling/index.ts',
    );

    const union = /type DispatchSelectionMode =\s*([\s\S]*?);/.exec(
      resolver,
    )?.[1];
    expect(union).toBeDefined();
    const resolverModes = [...(union ?? '').matchAll(/'([a-z-]+)'/g)].map(
      (match) => match[1] ?? '',
    );
    expect(resolverModes).toContain('candidate');

    const logged = /^Selection mode: \{([^}]+)\}$/m.exec(dispatch)?.[1];
    expect(logged).toBeDefined();
    const loggedModes = (logged ?? '').split('|').map((value) => value.trim());

    // A mode the resolver can return but the log cannot express forces a
    // correct dispatch to record a value that means something else. The
    // exact-candidate branch returns `candidate`, so omitting it pushes a
    // properly classified selection onto `capped`, the skipped-selection
    // signature.
    expect(loggedModes.toSorted()).toEqual(resolverModes.toSorted());
  });

  it('keeps preferred and exact-candidate resolver selection mutually exclusive', async () => {
    const dispatch = await readRawRepoFile(
      '.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md',
    );

    expect(dispatch).toMatch(/two mutually exclusive selection paths/i);
    expect(dispatch).toMatch(
      /preferred-selection branch[\s\S]{0,500}`--preferred[\s\S]{0,400}exact-candidate branch/i,
    );
    expect(dispatch).toMatch(
      /exact-candidate branch[\s\S]{0,500}`--candidate-model`[\s\S]{0,300}must not include `--preferred`/i,
    );

    const exactCandidateCommands = [
      ...dispatch.matchAll(
        /`(oat project dispatch-ceiling resolve[^`\n]*--candidate-(?:model|effort)[^`\n]*)`/g,
      ),
    ].map((match) => match[1] ?? '');
    expect(exactCandidateCommands.length).toBeGreaterThan(0);
    for (const command of exactCandidateCommands) {
      expect(command).not.toContain('--preferred');
    }

    for (const line of dispatch
      .split('\n')
      .filter((candidate) => candidate.includes('--preferred'))) {
      expect(line).toMatch(/preferred/i);
      expect(line).not.toMatch(/candidate-(?:model|effort)/);
    }
  });

  it('defines the canonical shared Phase gate review setup after stable phase IDs', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );

    expect(shared).toMatch(/Shared Phase Gate Review Setup Contract/);
    expect(shared).toMatch(
      /after[\s\S]{0,160}stable phase IDs[\s\S]{0,240}before[\s\S]{0,160}plan artifact review/i,
    );
    expect(shared).toMatch(/explicit[\s\S]{0,80}`oat_phase_review_gate`/i);
    expect(shared).toMatch(
      /preserve the complete value[\s\S]{0,100}unchanged/i,
    );
    expect(shared).toMatch(
      /do not probe targets, prompt, or mutate the setting/i,
    );
    expect(shared).toContain('oat gate target list --json');
    expect(shared).toMatch(
      /explicitlyConfigured[\s\S]{0,160}enabled[\s\S]{0,160}available/,
    );
    expect(shared).toMatch(
      /explicitlyConfigured\s*===?\s*true[\s\S]{0,200}enabled\s*===?\s*true[\s\S]{0,200}available\s*===?\s*true/,
    );
  });

  it('defines append-ordered monotonic review events across lifecycle skills', async () => {
    const expectedVersions = [
      ['oat-project-plan-writing', '1.2.21'],
      ['oat-project-review-provide', '1.5.3'],
      ['oat-project-review-receive', '1.6.2'],
      ['oat-project-review-receive-remote', '1.5.1'],
      ['oat-project-implement', '2.3.2'],
      ['oat-project-pr-final', '1.6.1'],
      ['oat-project-pr-progress', '1.3.0'],
      ['oat-project-complete', '1.7.7'],
      ['oat-project-next', '1.0.13'],
    ] as const;

    for (const [skillName, expectedVersion] of expectedVersions) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim(), skillName).toBe(
        expectedVersion,
      );
    }

    const planWriting = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    expect(planWriting).toMatch(/append-ordered review events/i);
    expect(planWriting).toMatch(/Scope.*Type.*Artifact.*event identity/is);
    expect(planWriting).toMatch(/unbound `pending` placeholder/i);
    expect(planWriting).toMatch(/must never move backward/i);

    const reviewProvide = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    expect(reviewProvide).toMatch(
      /claim[\s\S]{0,120}unbound `pending`[\s\S]{0,120}placeholder[\s\S]{0,300}append/i,
    );

    for (const skillName of [
      'oat-project-review-receive',
      'oat-project-review-receive-remote',
      'oat-project-implement',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content, `${skillName} artifact identity`).toMatch(
        /artifact filename|artifact path/i,
      );
      expect(content, `${skillName} monotonic status`).toMatch(
        /(?:never|must not|do not) (?:move|regress|replace)[\s\S]{0,100}(?:backward|earlier|lower)/i,
      );
    }

    for (const skillName of [
      'oat-project-pr-final',
      'oat-project-complete',
      'oat-project-next',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content, `${skillName} latest final event`).toMatch(
        /latest appended[\s\S]{0,120}Scope.*final.*Type.*code/is,
      );
    }

    const progressPr = await readRepoFile(
      '.agents/skills/oat-project-pr-progress/SKILL.md',
    );
    const statusCheck = progressPr.slice(
      progressPr.indexOf('### Step 3: Check Review Status'),
      progressPr.indexOf('### Step 4: Collect Scope Data'),
    );
    expect(statusCheck).toMatch(
      /latest appended[\s\S]{0,160}Scope.*pNN.*Type.*code/is,
    );
  });

  it('resolves active project reviews before considering historical results', async () => {
    const receive = await readRepoFile(
      '.agents/skills/oat-project-review-receive/SKILL.md',
    );
    const resolver = receive.slice(
      receive.indexOf('### Step 1: Locate Latest Review Artifact'),
      receive.indexOf('### Step 2: Parse Findings into Buckets'),
    );

    expect(receive.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.6.2');
    expect(resolver).toContain(
      'oat review latest --project "$PROJECT_PATH" --actionable-project --json',
    );
    expect(resolver).toMatch(
      /active\/actionable project review[\s\S]{0,300}historical/i,
    );
    expect(resolver).toContain('oat review latest --json');
    expect(resolver).toMatch(/kind: "adhoc"[\s\S]{0,200}oat-review-receive/i);
  });

  it('confines final review status reads to the Reviews ledger', async () => {
    const fixture = [
      '# Plan',
      '',
      '## Reviews',
      '',
      '| Scope | Type | Status | Date | Artifact |',
      '| --- | --- | --- | --- | --- |',
      '| final | code | received | 2026-07-14 | reviews/first.md |',
      '| final | code | passed | 2026-07-15 | reviews/latest.md |',
      '',
      '## References',
      '',
      '| final | code | fixes_added | 2026-07-16 | example.md |',
    ].join('\n');
    const reviewsStart = fixture.indexOf('## Reviews');
    const reviewsEnd = fixture.indexOf('\n## ', reviewsStart + 1);
    const reviewsSection = fixture.slice(reviewsStart, reviewsEnd);
    const finalRows = reviewsSection
      .split('\n')
      .filter((line) => /^\|\s*final\s*\|\s*code\s*\|/.test(line));

    expect(finalRows.at(-1)).toContain('| passed |');
    expect(fixture.trimEnd().split('\n').at(-1)).toContain('| fixes_added |');

    for (const [name, path] of [
      ['completion', '.agents/skills/oat-project-complete/SKILL.md'],
      ['final PR', '.agents/skills/oat-project-pr-final/SKILL.md'],
      ['implementation closeout', implementSkillPath],
      ['next-step routing', '.agents/skills/oat-project-next/SKILL.md'],
    ] as const) {
      const content = await readRepoFile(path);
      expect(content, `${name} Reviews start`).toContain(
        '/^## Reviews[[:space:]]*$/',
      );
      expect(content, `${name} next level-two stop`).toContain(
        'in_reviews && /^##[[:space:]]/ { exit }',
      );
      expect(content, `${name} latest ledger event`).toMatch(
        /reviews_section[\s\S]{0,500}final[\s\S]{0,100}code[\s\S]{0,180}tail -1/i,
      );
    }

    const progressPr = await readRepoFile(
      '.agents/skills/oat-project-pr-progress/SKILL.md',
    );
    expect(progressPr, 'progress PR Reviews start').toContain(
      '/^## Reviews[[:space:]]*$/',
    );
    expect(progressPr, 'progress PR next level-two stop').toContain(
      'in_reviews && /^##[[:space:]]/ { exit }',
    );
    expect(progressPr, 'progress PR latest ledger event').toMatch(
      /reviews_section[\s\S]{0,500}phase[\s\S]{0,100}code[\s\S]{0,180}tail -1/i,
    );
  });

  it('resolves collision-free archive identity before receive mutations', async () => {
    const receive = await readRepoFile(
      '.agents/skills/oat-project-review-receive/SKILL.md',
    );
    const marker = 'SOURCE_REVIEW_FILENAME=$(basename "$REVIEW_PATH")';
    const markerIndex = receive.indexOf(marker);
    if (markerIndex === -1) {
      throw new Error('archive identity setup marker is missing');
    }
    const scriptStart =
      receive.lastIndexOf('```bash', markerIndex) + '```bash\n'.length;
    const scriptEnd = receive.indexOf('\n```', markerIndex);
    const archiveSetup = receive.slice(scriptStart, scriptEnd);

    const root = await mkdtemp(join(tmpdir(), 'oat-review-archive-'));
    tempDirs.push(root);
    const projectPath = join(root, '.oat', 'projects', 'shared', 'demo');
    const reviewPath = join(projectPath, 'reviews', 'final-review.md');
    const occupiedPath = join(
      projectPath,
      'reviews',
      'archived',
      'final-review.md',
    );
    await mkdir(join(projectPath, 'reviews', 'archived'), { recursive: true });
    await writeFile(reviewPath, '# active review\n', 'utf8');
    await writeFile(occupiedPath, '# occupied archive\n', 'utf8');

    const { stdout } = await execFileAsync(
      '/bin/bash',
      [
        '-c',
        `${archiveSetup}\nprintf '%s\\n%s\\n' "$REVIEW_FILENAME" "$ARCHIVED_REVIEW_PATH"`,
      ],
      {
        env: {
          ...process.env,
          PROJECT_PATH: projectPath,
          REVIEW_PATH: reviewPath,
        },
      },
    );
    const [finalBasename, finalPath] = stdout.trim().split('\n');

    expect(finalBasename).not.toBe('final-review.md');
    expect(finalPath).toBe(
      join(projectPath, 'reviews', 'archived', finalBasename ?? ''),
    );

    const codePath = receive.slice(
      receive.indexOf('### Step 6: Update Plan.md'),
      receive.indexOf('### Step 8: Check Review Cycle Count'),
    );
    const artifactPath = receive.slice(
      receive.indexOf(
        '### Step 10A: Route to Next Action for Artifact Reviews',
      ),
      receive.indexOf('### Step 11: Output Summary'),
    );
    const summary = receive.slice(
      receive.indexOf('### Step 11: Output Summary'),
      receive.indexOf('## Re-Review Scoping'),
    );

    for (const [name, section] of [
      ['code review', codePath],
      ['artifact review', artifactPath],
    ] as const) {
      expect(section, `${name} final basename`).toContain('REVIEW_FILENAME');
      expect(section, `${name} resolved destination`).toContain(
        'ARCHIVED_REVIEW_PATH',
      );
      expect(section, `${name} no late rename`).not.toMatch(
        /append a timestamp suffix before moving/i,
      );
    }
    expect(summary).toContain('REVIEW_FILENAME');
  });

  it('records clean remote receives as atomic event-distinct artifacts', async () => {
    const remoteReceive = await readRepoFile(
      '.agents/skills/oat-project-review-receive-remote/SKILL.md',
    );
    const cleanPath = remoteReceive.slice(
      remoteReceive.indexOf('If no unresolved comments:'),
      remoteReceive.indexOf('### Step 3:'),
    );

    expect(cleanPath).toMatch(/remote-pr-<N>-review-YYYY-MM-DDTHHMMSSZ\.md/i);
    expect(cleanPath).toMatch(
      /event identity[\s\S]{0,100}`Scope`[\s\S]{0,60}`Type`[\s\S]{0,60}artifact filename/i,
    );
    expect(cleanPath).toMatch(/unbound `pending` placeholder/i);
    expect(cleanPath).toMatch(/otherwise append/i);
    expect(cleanPath).toMatch(
      /commit[\s\S]{0,240}(?:artifact|review event)[\s\S]{0,240}atomically/i,
    );
    expect(cleanPath).not.toMatch(
      /update `plan\.md` review row for scoped entry/i,
    );
    expect(cleanPath).toMatch(/reviews\/archived/);
    expect(cleanPath).toMatch(/consumed/i);

    const artifactPath = remoteReceive.slice(
      remoteReceive.indexOf('### Step 6: Update Project Artifacts'),
      remoteReceive.indexOf('### Step 7: Enforce Review Cycle Limit'),
    );
    expect(artifactPath).toMatch(/reviews\/archived/);
    expect(artifactPath).toMatch(/passed.*fixes_added|fixes_added.*passed/is);
  });

  it('defines canonical Phase gate review choices and stable phase serialization', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );

    expect(shared).toMatch(/all phases/i);
    expect(shared).toMatch(/selected phases/i);
    expect(shared).toMatch(/disabled/i);
    expect(shared).toMatch(
      /oat_phase_review_gate:[\s\S]{0,180}enabled:\s*true[\s\S]{0,180}phases:\s*\[\][\s\S]{0,180}review_type:\s*code[\s\S]{0,180}exit_nonzero_on:\s*important/,
    );
    expect(shared).toMatch(
      /selected phase IDs[\s\S]{0,220}(?:actual|known|stable) phase IDs[\s\S]{0,220}plan order/i,
    );
    expect(shared).toMatch(/independent[\s\S]{0,180}HiLL checkpoints/i);
    expect(shared).toMatch(
      /never[\s\S]{0,160}(?:provider|model)[\s\S]{0,160}--target|must not[\s\S]{0,160}--target/i,
    );
  });

  it('requires unambiguous cross-runtime phase gate review prompts', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    const sharedChoice = shared.slice(
      shared.indexOf('### 3. Offer the canonical choice'),
      shared.indexOf('### 4. Handle non-interactive planning'),
    );

    expect(sharedChoice).toMatch(/cross-runtime phase gate review/i);
    expect(sharedChoice).toMatch(
      /built-in per-phase root reviews[\s\S]{0,180}final review[\s\S]{0,180}run regardless/i,
    );
    expect(sharedChoice).not.toMatch(/^\d+\..*\(Recommended\)/im);

    for (const [skillName, nextHeading] of [
      ['oat-project-plan', '### Step 12.5:'],
      ['oat-project-quick-start', '### Step 3.6:'],
    ] as const) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      const promptContract = content.slice(
        content.indexOf('Phase Gate Review Setup'),
        content.indexOf(nextHeading),
      );
      expect(promptContract, `${skillName} mechanism name`).toMatch(
        /cross-runtime phase gate review/i,
      );
      expect(promptContract, `${skillName} invariant reviews`).toMatch(
        /built-in per-phase root reviews[\s\S]{0,180}final review[\s\S]{0,180}run regardless/i,
      );
      expect(promptContract, `${skillName} no bare recommendation`).not.toMatch(
        /^\d+\..*\(Recommended\)/im,
      );
    }
  });

  it('keeps Phase gate review disabled when setup cannot make an interactive choice', async () => {
    const shared = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );

    expect(shared).toMatch(
      /probe fail[\s\S]{0,260}Phase gate review remains disabled/i,
    );
    expect(shared).toMatch(
      /no qualifying target[\s\S]{0,260}Phase gate review remains disabled/i,
    );
    expect(shared).toMatch(
      /non-interactive[\s\S]{0,320}Phase gate review remains disabled/i,
    );
    expect(shared).toMatch(
      /(?:declines|chooses disabled)[\s\S]{0,260}Phase gate review remains disabled/i,
    );
    expect(shared).toMatch(/Warning: Phase gate review target probe failed/);
    expect(shared).toMatch(/Phase gate review: disabled/);
    expect(shared).toMatch(/do not invent enablement/i);
  });

  it('routes every workflow review through exact roles or pinned fresh children', async () => {
    for (const skillName of [
      'oat-project-implement',
      'oat-project-review-provide',
    ]) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content, `${skillName} exact role`).toMatch(
        /exact registered.*(?:role|variant)/i,
      );
      expect(content, `${skillName} fresh child`).toMatch(/fresh Codex child/i);
      expect(content, `${skillName} explicit controls`).toMatch(
        /explicit\s+model.*reasoning\s+effort.*canonical\s+role\s+instructions/is,
      );
      expect(content, `${skillName} no managed base fallback`).toMatch(
        /never.*managed base role|managed base role.*forbidden/i,
      );
      expect(content, `${skillName} no reload dependency`).toMatch(
        /must not require[\s\S]*restart.*hot reload/i,
      );
    }
  });

  it('rejects unpinned managed Codex availability and timeout fallbacks', async () => {
    const planWriting = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const reviewProvide = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );

    for (const [skillName, content] of [
      ['oat-project-plan-writing', planWriting],
      ['oat-project-implement', implement],
      ['oat-project-review-provide', reviewProvide],
    ] as const) {
      expect(content, `${skillName} concrete Codex target`).toMatch(
        /concrete managed Codex target/i,
      );
      expect(content, `${skillName} target-first precedence`).toMatch(
        /(?:before|takes precedence)[\s\S]{0,220}(?:tier|availability)/i,
      );
      expect(content, `${skillName} unavailable-role route`).toMatch(
        /(?:unavailable|cannot select|native role-selection rejection)[\s\S]{0,500}fresh Codex child[\s\S]{0,500}(?:block|fail closed)/i,
      );
      expect(content, `${skillName} inline control guard`).toMatch(
        /inline[\s\S]{0,300}verified equivalent current-host[\s\S]{0,300}(?:model|controls)/i,
      );
    }

    expect(planWriting).not.toMatch(
      /Tier 1 is unavailable or declined,\s*run the same reviewer prompt inline/i,
    );
    expect(planWriting).not.toMatch(/lowest available tier\/model\/effort/i);

    expect(implement).not.toMatch(
      /If Tier 2 is selected,[\s\S]{0,240}Execute that process yourself/i,
    );
    expect(implement).not.toMatch(
      /reviewer still does not conclude,[\s\S]{0,180}perform the review inline/i,
    );
    expect(implement).not.toMatch(
      /degrade the (?:entire|whole) group to sequential inline execution/i,
    );

    expect(reviewProvide).not.toMatch(
      /If subagent dispatch is unavailable,\s*run the review inline/i,
    );
    expect(reviewProvide).not.toMatch(/If explicit role pinning is desired/i);
    expect(reviewProvide).not.toMatch(/optionally pin `agent_type`/i);
    expect(reviewProvide).not.toMatch(
      /REVIEW_INVOCATION=gate[\s\S]{0,220}use \*\*Tier 3\*\* inline/i,
    );
    expect(reviewProvide).not.toMatch(
      /REVIEW_INVOCATION=gate[\s\S]{0,220}run Tier 3 inline instead/i,
    );
  });

  it('keeps planning artifact reviews inherited and accepted launches terminal', async () => {
    const callers = [
      [
        'spec-driven plan',
        await readRepoFile('.agents/skills/oat-project-plan/SKILL.md'),
      ],
      [
        'quick-start plan',
        await readRepoFile('.agents/skills/oat-project-quick-start/SKILL.md'),
      ],
      [
        'import-plan',
        await readRepoFile('.agents/skills/oat-project-import-plan/SKILL.md'),
      ],
    ] as const;

    for (const [name, content] of callers) {
      expect(content, `${name} inherits by default`).toMatch(
        /planning parent[\s\S]{0,120}deliberate inheritance[\s\S]{0,80}default/i,
      );
      expect(content, `${name} bounds managed exception`).toMatch(
        /unknown or below[\s\S]{0,120}reviewer ceiling/i,
      );
      expect(content, `${name} tries exact native Codex first`).toMatch(
        /Codex[\s\S]{0,180}exact native `agent_type`/i,
      );
      expect(content, `${name} gates another Codex route`).toContain(
        'recorded actual pre-start',
      );
      expect(content, `${name} permits pinned child after rejection`).toMatch(
        /rejection permits a fresh[\s\S]{0,40}child pinned/i,
      );
      expect(content, `${name} accepted terminality`).toContain(
        'After acceptance',
      );
      expect(content, `${name} continues accepted handle`).toContain(
        'existing reviewer',
      );
      expect(content, `${name} blocks terminal timeout`).toMatch(
        /terminal timeout[\s\S]{0,120}(?:blocks|escalates)[\s\S]{0,120}without another launch/i,
      );
      expect(content, `${name} limits replacement`).toMatch(
        /Replacement eligibility[\s\S]{0,120}pre-start rejection/i,
      );
      expect(content, `${name} no unconditional tier fallback`).not.toMatch(
        /Tier 2 inline fallback otherwise/i,
      );
      expect(content, `${name} no accepted timeout retry`).not.toMatch(
        /timeout[\s\S]{0,240}retry the same exact role or pinned child/i,
      );
    }
  });

  it('binds concrete managed reviewer controls across provider invocations', async () => {
    const planWriting = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    const reviewProvide = await readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const artifactReview = planWriting.slice(
      planWriting.indexOf('## Managed Dispatch Readiness and Review Contract'),
      planWriting.indexOf('## Shared Phase-Review Setup Contract'),
    );
    const projectReview = reviewProvide.slice(
      reviewProvide.indexOf(
        '**Step 6.0: Resolve the managed reviewer target**',
      ),
      reviewProvide.indexOf('### Step 7: Determine Review Artifact Path'),
    );
    const phaseReview = implement.slice(
      implement.indexOf('### Per-Phase Review'),
      implement.indexOf('### Optional External Phase Review Gate'),
    );
    const finalReview = implement.slice(
      implement.indexOf('**Workflow preference check (before prompting):**'),
      implement.indexOf('**Fresh-session guidance block'),
    );

    for (const [name, content] of [
      ['artifact review', artifactReview],
      ['project review', projectReview],
      ['phase review', phaseReview],
      ['final review', finalReview],
    ] as const) {
      expect(content, `${name} Claude payload`).toContain(
        'providers.claude.dispatchArgs.model',
      );
      expect(content, `${name} Cursor payload`).toContain(
        'providers.cursor.dispatchArgs.variant',
      );
      expect(content, `${name} actual dispatch control`).toMatch(
        /actual\s+(?:(?:provider|host)\s+)?invocation[\s\S]{0,320}(?:model|variant|dispatchArgs\.(?:model|variant))/i,
      );
      if (name === 'phase review') {
        expect(content, `${name} accepted handle`).toMatch(
          /after acceptance[\s\S]{0,180}accepted reviewer\s+handle/i,
        );
        expect(content, `${name} no replacement`).toMatch(
          /never a\s+reason to replace an accepted reviewer/i,
        );
      } else {
        expect(content, `${name} target-preserving retry`).toMatch(
          /(?:timeout|retry|re-dispatch)[\s\S]{0,500}(?:same|exact)[\s\S]{0,300}(?:model|payload|dispatch argument)/i,
        );
      }
      expect(content, `${name} unsupported model binding`).toMatch(
        /(?:cannot|unable to) (?:apply|pass|bind)[\s\S]{0,280}(?:fail closed|block)/i,
      );
    }

    const configuration = await readRepoFile(
      'apps/oat-docs/docs/cli-utilities/configuration.md',
    );
    for (const model of [
      'gpt-5.6-luna-high',
      'gpt-5.6-terra-xhigh',
      'gpt-5.6-sol-high',
      'gpt-5.6-sol-max',
    ]) {
      expect(planWriting, `artifact contract preserves ${model}`).toContain(
        model,
      );
      expect(configuration, `configuration preserves ${model}`).toContain(
        model,
      );
    }

    const lifecycle = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/lifecycle.md',
    );
    const artifacts = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/artifacts.md',
    );
    for (const [name, content] of [
      ['lifecycle', lifecycle],
      ['artifacts', artifacts],
      ['configuration', configuration],
    ] as const) {
      expect(content, `${name} target-preserving Tier 2`).toMatch(
        /Tier 2[\s\S]{0,600}target-preserving/i,
      );
      expect(content, `${name} guarded inline`).toMatch(
        /inline[\s\S]{0,360}verified equivalent[\s\S]{0,260}(?:inherit|managed-uncapped|base-role)/i,
      );
    }
  });

  it('covers spec, quick, import, and provider-plan-via-import planning paths', async () => {
    const plan = await readRepoFile('.agents/skills/oat-project-plan/SKILL.md');
    const quick = await readRepoFile(
      '.agents/skills/oat-project-quick-start/SKILL.md',
    );
    const imported = await readRepoFile(
      '.agents/skills/oat-project-import-plan/SKILL.md',
    );

    expect(plan).toMatch(/spec-driven/i);
    expect(quick).toMatch(/quick/i);
    expect(imported).toMatch(/provider-plan-via-import/i);
    expect(imported).toMatch(/provider plan[\s\S]*inherits.*import/i);
  });

  it('invokes shared Phase gate review setup before artifact review in every plan path', async () => {
    const paths = [
      {
        name: 'spec-driven',
        content: await readRepoFile('.agents/skills/oat-project-plan/SKILL.md'),
        stableMarker: '### Step 10.1: Keep Reviews Table Rows',
        reviewMarker: '### Step 12.5: Run Plan Artifact Review Loop',
      },
      {
        name: 'quick-start',
        content: await readRepoFile(
          '.agents/skills/oat-project-quick-start/SKILL.md',
        ),
        stableMarker: '### Step 3: Generate Plan Directly',
        reviewMarker: '### Step 3.6: Run Plan Artifact Review Loop',
      },
      {
        name: 'import-plan',
        content: await readRepoFile(
          '.agents/skills/oat-project-import-plan/SKILL.md',
        ),
        stableMarker: '### Step 3: Normalize Into Canonical OAT plan.md',
        reviewMarker:
          '### Step 4.5: Run Import-Aware Plan Artifact Review Loop',
      },
    ];

    for (const { name, content, stableMarker, reviewMarker } of paths) {
      const stableIndex = content.indexOf(stableMarker);
      const setupOffset = content
        .slice(stableIndex)
        .search(/Shared Phase Gate Review\s+Setup\s+Contract/);
      const setupIndex =
        setupOffset < 0 || stableIndex < 0 ? -1 : stableIndex + setupOffset;
      const reviewIndex = content.indexOf(reviewMarker);

      expect(stableIndex, `${name} stable phase IDs`).toBeGreaterThanOrEqual(0);
      expect(setupIndex, `${name} setup invocation`).toBeGreaterThan(
        stableIndex,
      );
      expect(reviewIndex, `${name} artifact review`).toBeGreaterThan(
        setupIndex,
      );
      expect(content, `${name} explicit preservation`).toMatch(
        /explicit `oat_phase_review_gate`[\s\S]{0,260}(?:without|do not)[\s\S]{0,160}(?:probe|prompt|mutat)/i,
      );
      expect(content, `${name} disabled fallback`).toMatch(
        /(?:probe fails|no target qualifies|user declines)[\s\S]{0,320}(?:disabled|do not add)/i,
      );
      expect(content, `${name} HiLL independence`).toMatch(
        /Phase gate review setup[\s\S]{0,320}independent[\s\S]{0,160}HiLL/i,
      );
      expect(content, `${name} target neutrality`).toMatch(
        /Phase gate review setup[\s\S]{0,480}(?:must not|do not)[\s\S]{0,100}--target/i,
      );
    }
  });

  it('preserves complete explicit Phase gate review settings across every plan rewrite', async () => {
    const paths = [
      {
        name: 'spec-driven overwrite',
        content: await readRepoFile('.agents/skills/oat-project-plan/SKILL.md'),
        snapshotMarker:
          '### Step 4.9: Snapshot Explicit Phase-Review Setting Before Plan Overwrite',
        rewriteMarker:
          '**Overwrite**: replace with a fresh copy of the template',
        setupMarker: '### Step 12.25: Configure Optional Phase Gate Review',
      },
      {
        name: 'quick-start',
        content: await readRepoFile(
          '.agents/skills/oat-project-quick-start/SKILL.md',
        ),
        snapshotMarker:
          '### Step 2.9: Snapshot Explicit Phase-Review Setting Before Plan Rewrite',
        rewriteMarker:
          'Create/update `"$PROJECT_PATH/plan.md"` from `.oat/templates/plan.md`.',
        setupMarker: '### Step 3.55: Configure Optional Phase Gate Review',
      },
      {
        name: 'import-plan',
        content: await readRepoFile(
          '.agents/skills/oat-project-import-plan/SKILL.md',
        ),
        snapshotMarker:
          '### Step 2.5: Snapshot Explicit Phase-Review Setting Before Plan Normalization',
        rewriteMarker:
          'Create/update `"$PROJECT_PATH/plan.md"` using `.oat/templates/plan.md`',
        setupMarker: '### Step 4.25: Configure Optional Phase Gate Review',
      },
    ];

    for (const {
      name,
      content,
      snapshotMarker,
      rewriteMarker,
      setupMarker,
    } of paths) {
      const snapshotIndex = content.indexOf(snapshotMarker);
      const rewriteIndex = content.indexOf(rewriteMarker);
      const setupIndex = content.indexOf(setupMarker);
      const restoreIndex = content.indexOf(
        'Restore the exact snapshot into the resulting `plan.md` frontmatter',
      );

      expect(
        snapshotIndex,
        `${name} snapshot instruction`,
      ).toBeGreaterThanOrEqual(0);
      expect(rewriteIndex, `${name} rewrite boundary`).toBeGreaterThan(
        snapshotIndex,
      );
      expect(restoreIndex, `${name} restore after rewrite`).toBeGreaterThan(
        rewriteIndex,
      );
      expect(setupIndex, `${name} restore before setup`).toBeGreaterThan(
        restoreIndex,
      );

      const preservationContract = content.slice(snapshotIndex, setupIndex);
      expect(preservationContract, `${name} key-presence snapshot`).toMatch(
        /key presence/i,
      );
      expect(preservationContract, `${name} complete-value snapshot`).toMatch(
        /complete explicit value/i,
      );
      expect(
        preservationContract,
        `${name} presence is not truthiness`,
      ).toMatch(
        /presence[\s\S]{0,120}(?:not truthiness|regardless of validity)/i,
      );
      expect(preservationContract, `${name} complete value cases`).toMatch(
        /enabled[\s\S]{0,80}disabled[\s\S]{0,80}selected-phase[\s\S]{0,80}`null`[\s\S]{0,80}malformed/i,
      );
      expect(preservationContract, `${name} no explicit re-probe`).toMatch(
        /explicit presence[\s\S]{0,180}(?:must not|do not)[\s\S]{0,100}(?:probe|re-prompt)/i,
      );
      expect(preservationContract, `${name} absent key stays absent`).toMatch(
        /key was absent[\s\S]{0,300}do not\s+invent/i,
      );
    }

    expect(paths[0].content).toMatch(/overwrite[\s\S]{0,220}exact snapshot/i);
    expect(paths[1].content).toMatch(/resumed explicit value/i);
    expect(paths[2].content).toMatch(
      /resumed[\s\S]{0,120}imported[\s\S]{0,180}complete explicit value/i,
    );
  });

  it('makes provider native plan mode inherit phase-review setup from import', async () => {
    const imported = await readRepoFile(
      '.agents/skills/oat-project-import-plan/SKILL.md',
    );

    expect(imported).toMatch(
      /provider-plan-via-import[\s\S]{0,500}Shared Phase Gate Review\s+Setup\s+Contract/i,
    );
    expect(imported).toMatch(
      /provider native plan mode[\s\S]{0,300}(?:inherits|uses)[\s\S]{0,220}(?:same|import)/i,
    );
    expect(imported).toMatch(
      /resumed\s+or\s+imported\s+explicit[\s\S]{0,220}(?:without|do not)[\s\S]{0,120}(?:re-prompt|prompt)/i,
    );
  });

  it('keeps quick and imported plans non-ready until review disposition is durable', async () => {
    const quick = await readRepoFile(
      '.agents/skills/oat-project-quick-start/SKILL.md',
    );
    const imported = await readRepoFile(
      '.agents/skills/oat-project-import-plan/SKILL.md',
    );
    const next = await readRepoFile('.agents/skills/oat-project-next/SKILL.md');

    const paths = [
      {
        name: 'quick-start',
        content: quick,
        draftStart: '### Step 3: Generate Plan Directly',
        reviewStart: '### Step 3.6: Run Plan Artifact Review Loop',
        completionEnd: '### Step 4: Sync Project State',
      },
      {
        name: 'import-plan',
        content: imported,
        draftStart: '### Step 4: Update Plan Metadata',
        reviewStart: '### Step 4.5: Run Import-Aware Plan Artifact Review Loop',
        completionEnd: '### Step 5: Update Project State',
      },
    ] as const;

    for (const {
      name,
      content,
      draftStart,
      reviewStart,
      completionEnd,
    } of paths) {
      const draftStartIndex = content.indexOf(draftStart);
      const reviewStartIndex = content.indexOf(reviewStart);
      const completionEndIndex = content.indexOf(
        completionEnd,
        reviewStartIndex,
      );
      const draft = content.slice(draftStartIndex, reviewStartIndex);
      const completion = content.slice(reviewStartIndex, completionEndIndex);

      expect(draftStartIndex, `${name} draft boundary`).toBeGreaterThanOrEqual(
        0,
      );
      expect(reviewStartIndex, `${name} review boundary`).toBeGreaterThan(
        draftStartIndex,
      );
      expect(completionEndIndex, `${name} completion boundary`).toBeGreaterThan(
        reviewStartIndex,
      );
      expect(draft, `${name} draft status`).toContain(
        '`oat_status: in_progress`',
      );
      expect(draft, `${name} draft readiness`).toContain(
        '`oat_ready_for: null`',
      );
      expect(draft, `${name} current-phase marker`).toContain(
        '`oat_template: true`',
      );
      expect(draft, `${name} interrupted routing`).toMatch(
        /oat-project-next[\s\S]{0,260}(?:current|same)[\s\S]{0,120}(?:plan|planning)[\s\S]{0,180}(?:must not|cannot)[\s\S]{0,120}(?:implement|advance)/i,
      );

      const outcomeIndex = completion.search(
        /durably record[\s\S]{0,160}(?:review (?:outcome|disposition)|explicit skip)/i,
      );
      const readyIndex = completion.indexOf(
        '`oat_ready_for: oat-project-implement`',
        outcomeIndex,
      );
      const completeIndex = completion.indexOf(
        '`oat_status: complete`',
        outcomeIndex,
      );
      const nonTemplateIndex = completion.indexOf(
        '`oat_template: false`',
        outcomeIndex,
      );

      expect(
        outcomeIndex,
        `${name} durable review disposition`,
      ).toBeGreaterThanOrEqual(0);
      expect(readyIndex, `${name} final readiness`).toBeGreaterThan(
        outcomeIndex,
      );
      expect(completeIndex, `${name} final status`).toBeGreaterThan(
        outcomeIndex,
      );
      expect(nonTemplateIndex, `${name} final template marker`).toBeGreaterThan(
        outcomeIndex,
      );
      expect(completion, `${name} no output-only disposition`).toMatch(
        /(?:review row|Reviews section)[\s\S]{0,260}plan\.md/i,
      );
    }

    expect(next).toMatch(
      /oat_template\s*==\s*true[\s\S]{0,220}(?:CURRENT|current) phase/i,
    );
    expect(imported).toMatch(
      /provider-plan-via-import[\s\S]{0,520}inherits[\s\S]{0,220}(?:readiness|completion)[\s\S]{0,220}(?:review|disposition)/i,
    );
  });

  it('routes interrupted tier-3 plans to their mode-specific planning workflow', async () => {
    const next = await readRepoFile('.agents/skills/oat-project-next/SKILL.md');
    const specTable = next.slice(
      next.indexOf('**Spec-Driven Mode**'),
      next.indexOf('**Quick Mode:**'),
    );
    const quickTable = next.slice(
      next.indexOf('**Quick Mode:**'),
      next.indexOf('**Import Mode:**'),
    );
    const importTable = next.slice(
      next.indexOf('**Import Mode:**'),
      next.indexOf('### Step 4:'),
    );
    const planTier3Row = (table: string): string | undefined =>
      table
        .split('\n')
        .find(
          (line) =>
            line.includes('| plan') &&
            line.includes('| in_progress') &&
            line.includes('| tier 3'),
        );

    expect(next).toMatch(
      /\*\*Tier 3 \(Template\/Empty\):\*\*[\s\S]{0,220}`oat_template == true`/,
    );
    expect(planTier3Row(quickTable)).toContain('`oat-project-quick-start`');
    expect(planTier3Row(specTable)).toContain('`oat-project-plan`');
    expect(planTier3Row(importTable)).toContain('`oat-project-import-plan`');
    expect(next.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.0.13');
  });

  it('supports project completion before or after PR merge in every mode', async () => {
    const progress = await readRepoFile(
      '.agents/skills/oat-project-progress/SKILL.md',
    );
    expect(progress.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.3.0');

    const modeSections = [
      [
        'spec-driven',
        progress.slice(
          progress.indexOf('**Spec-Driven mode'),
          progress.indexOf('**Quick mode'),
        ),
      ],
      [
        'quick',
        progress.slice(
          progress.indexOf('**Quick mode'),
          progress.indexOf('**Import mode'),
        ),
      ],
      ['import', progress.slice(progress.indexOf('**Import mode'))],
    ] as const;

    for (const [mode, section] of modeSections) {
      expect(section, `${mode} pr_open route`).toMatch(
        /\|\s*implement\s*\|\s*pr_open\s*\|\s*`oat-project-complete`/i,
      );
    }

    for (const skillName of ['oat-project-pr-final', 'oat-project-complete']) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content, `${skillName} completion-before-merge`).toMatch(
        /complete before merge/i,
      );
      expect(content, `${skillName} merge-before-completion`).toMatch(
        /merge before complet/i,
      );
      expect(content, `${skillName} open PR permissive`).toMatch(
        /open PR is not a blocker/i,
      );
      expect(content, `${skillName} no ordering config`).not.toContain(
        'completeBeforeMerge',
      );
    }

    const complete = await readRepoFile(
      '.agents/skills/oat-project-complete/SKILL.md',
    );
    expect(complete).toMatch(/sync[\s\S]{0,120}open PR body/i);
  });

  it('documents phase-review setup across project workflow references', async () => {
    const artifacts = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/artifacts.md',
    );
    const reviews = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/reviews.md',
    );
    const lifecycle = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/lifecycle.md',
    );

    for (const [name, content] of [
      ['artifacts', artifacts],
      ['reviews', reviews],
      ['lifecycle', lifecycle],
    ] as const) {
      expect(content, `${name} setup timing`).toMatch(
        /stable\s+phase\s+IDs[\s\S]{0,300}before[\s\S]{0,180}plan\s+artifact\s+review/i,
      );
      expect(content, `${name} target eligibility`).toMatch(
        /explicitly\s+configured[\s\S]{0,160}enabled[\s\S]{0,160}available/i,
      );
      expect(content, `${name} choices`).toMatch(
        /all\s+phases[\s\S]{0,200}selected\s+phases[\s\S]{0,200}disabled/i,
      );
      expect(content, `${name} preservation`).toMatch(
        /explicit[\s\S]{0,120}`oat_phase_review_gate`[\s\S]{0,240}(?:preserv|unchanged)[\s\S]{0,180}(?:without|no)[\s\S]{0,100}(?:prompt|re-prompt)/i,
      );
    }

    expect(lifecycle).toMatch(/provider native plan mode[\s\S]*import/i);
  });

  it('aligns dispatch readiness, cursor enforcement, and codex output ownership', async () => {
    const lifecycle = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/lifecycle.md',
    );
    const dispatchPolicy = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md',
    );
    const execution = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/implementation-execution.md',
    );
    const scope = await readRepoFile(
      'apps/oat-docs/docs/provider-sync/scope-and-surface.md',
    );
    const providers = await readRepoFile(
      'apps/oat-docs/docs/provider-sync/providers.md',
    );
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );

    expect(lifecycle).toMatch(
      /non-interactive planning[\s\S]{0,220}not implementation-ready[\s\S]{0,220}(?:block|resolver succeeds)/i,
    );
    expect(lifecycle).not.toMatch(
      /non-interactive planning leaves it unresolved[\s\S]{0,160}implementation preflight/i,
    );
    expect(dispatchPolicy).toMatch(
      /Codex[\s\S]{0,240}Luna[\s\S]{0,80}`low`[\s\S]{0,80}`medium`[\s\S]{0,80}`high`[\s\S]{0,80}`xhigh`[\s\S]{0,240}Sol[\s\S]{0,140}`max`/i,
    );

    expect(
      implement,
      'canonical implement skill cursor native variant',
    ).toMatch(
      /Cursor[\s\S]{0,360}dispatchArgs\.variant[\s\S]{0,260}(?:native|agent type)/i,
    );
    expect(
      execution,
      'implementation execution docs use Cursor native variants',
    ).toMatch(
      /Cursor[\s\S]{0,360}dispatchArgs\.variant[\s\S]{0,260}(?:native|agent type)/i,
    );

    for (const [name, content] of [
      ['canonical implement skill', implement],
      ['implementation execution docs', execution],
    ] as const) {
      expect(
        content,
        `${name} no stale cursor unsupported example`,
      ).not.toMatch(/cursor, unsupported — no adapter; informational/i);
    }

    expect(scope).toMatch(
      /\.codex\/config\.toml[\s\S]{0,320}(?:every|all) generated project[\s\S]{0,240}(?:repository-owned|version-controlled)[\s\S]{0,240}no automatic ignore/i,
    );
    expect(scope).toMatch(/user[\s\S]{0,180}~\/\.codex/i);
    expect(scope).not.toMatch(/user-scope role generation remains.*deferred/i);

    expect(providers).toMatch(
      /Project sync (?:writes|maintains)[\s\S]{0,120}version-controlled[\s\S]{0,320}26 pinned variants/i,
    );
    expect(providers).not.toMatch(
      /Project sync commits the supported catalogue/i,
    );
    expect(providers).toMatch(
      /project-generated[\s\S]{0,180}(?:repository-owned|version-controlled)[\s\S]{0,200}(?:never|no)[\s\S]{0,80}(?:auto-ignore|automatic ignore)/i,
    );
  });

  it('documents shipped user Codex materialization ownership in the review guide', async () => {
    const reviews = await readRepoFile(
      'apps/oat-docs/docs/workflows/projects/reviews.md',
    );

    expect(reviews).toMatch(
      /user-config[^\n]{0,100}(?:roles? )?materialize[^\n]{0,100}`~\/\.codex`/i,
    );
    expect(reviews).toMatch(
      /project-config[^\n]{0,100}supported-catalogue[^\n]{0,180}project-scoped[^\n]{0,100}version-controlled/i,
    );
    expect(reviews).not.toMatch(
      /user-scope Codex role generation[^\n]{0,120}(?:deferred|not (?:implemented|available))/i,
    );
  });

  it('tracks the p04 planning skill contract versions', async () => {
    const expectedVersions = [
      ['oat-project-plan-writing', '1.2.21'],
      ['oat-project-plan', '1.4.7'],
      ['oat-project-quick-start', '2.3.8'],
      ['oat-project-import-plan', '1.4.12'],
      ['oat-project-review-provide', '1.5.3'],
    ] as const;

    for (const [skillName, expectedVersion] of expectedVersions) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim(), skillName).toBe(
        expectedVersion,
      );
    }
  });

  it('tracks Dispatch Report V1 workflow contract versions and provenance boundaries', async () => {
    const expectedVersions = [
      ['oat-project-implement', '2.3.2'],
      ['oat-project-review-provide', '1.5.3'],
      ['oat-project-review-provide-remote', '1.1.2'],
    ] as const;

    for (const [skillName, expectedVersion] of expectedVersions) {
      const content = await readRepoFile(
        `.agents/skills/${skillName}/SKILL.md`,
      );
      expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim(), skillName).toBe(
        expectedVersion,
      );
      const invocations = [
        ...content
          .replace(/\\\r?\n\s*/g, ' ')
          .matchAll(
            /(?:pnpm run cli -- project|oat project) dispatch-ceiling resolve[^`\n]*/g,
          ),
      ]
        .map(([command]) => command.trim())
        .filter((command) => command.includes('--provider'));
      expect(
        invocations.length,
        `${skillName} actionable resolver invocations`,
      ).toBeGreaterThan(0);
      for (const invocation of invocations) {
        expect(invocation, `${skillName} report scope`).toMatch(
          /--report-scope\s+\S+/,
        );
        expect(invocation, `${skillName} literal report action`).toMatch(
          /--report-action\s+(implementation|fix|review)(?:\s|$)/,
        );
      }
      expect(content, `${skillName} versioned report`).toContain(
        'dispatchReport.schemaVersion: 1',
      );
      expect(content, `${skillName} report renderer`).toContain(
        'formatDispatchReport(dispatchReport)',
      );
      expect(content, `${skillName} report-derived stamp`).toContain(
        'formatDispatchStamp(dispatchReport)',
      );
      expect(content, `${skillName} target retention`).toMatch(
        /providers\.<provider>\.dispatchArgs[\s\S]{0,220}providers\.<provider>\.selection\.target/,
      );
      expect(content, `${skillName} configured provenance`).toMatch(
        /configured/i,
      );
      expect(content, `${skillName} producer provenance`).toMatch(
        /(?:diversity|producer)/i,
      );
      expect(content, `${skillName} runtime provenance`).toMatch(
        /runtime(?:Identity|\s+identity)/i,
      );
    }
  });

  it('loads project dispatch through the provider-neutral engine', async () => {
    const adapterPath =
      '.agents/skills/oat-project-dispatch-subagents/SKILL.md';
    const enginePath = '.agents/skills/oat-dispatch-subagents/SKILL.md';
    const portableAdapterPath =
      '`${SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md`';
    const portableEnginePath =
      '`${SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md`';
    const independentAdapterPath =
      '`${PROJECT_DISPATCH_SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md`';
    const independentEnginePath =
      '`${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md`';
    const adapter = await readRepoFile(adapterPath);
    const engine = await readRepoFile(enginePath);
    const consumers = [
      '.agents/skills/oat-project-implement/SKILL.md',
      '.agents/skills/oat-project-plan-writing/SKILL.md',
      '.agents/agents/oat-phase-implementer.md',
    ];

    expect(engine).toMatch(/^name:\s*oat-dispatch-subagents$/m);
    expect(engine).toMatch(/^version:\s*1\.2\.6$/m);
    expect(engine).toMatch(/^user-invocable:\s*false$/m);
    expect(adapter).toMatch(/^name:\s*oat-project-dispatch-subagents$/m);
    expect(adapter).toMatch(/^version:\s*1\.1\.4$/m);
    expect(adapter).toContain('oat-dispatch-subagents');
    expect(engine).toMatch(/resolved dispatch policy or named ceiling/i);
    expect(engine).toMatch(
      /intersect configured candidates[\s\S]{0,120}(?:catalog|selectors)/i,
    );
    expect(engine).toMatch(/catalog snapshot[\s\S]{0,160}dispatch context/i);
    expect(adapter).toMatch(
      /Phase implementer[\s\S]{0,240}complete phase[\s\S]{0,180}per-task commits/i,
    );
    expect(engine).toMatch(
      /select one[\s\S]{0,180}provider-CLI[\s\S]{0,180}before launch/i,
    );
    expect(engine).toMatch(
      /record route, selection source, selection reason, candidates/i,
    );
    expect(engine).toMatch(
      /accepted launch[\s\S]{0,180}(?:terminal|no replacement)/i,
    );
    expect(engine).toMatch(
      /choose foreground or background deliberately[\s\S]{0,240}expected duration/i,
    );
    expect(engine).toMatch(
      /transcript filesystem metadata[\s\S]{0,240}never authorizes replacement/i,
    );
    expect(adapter).toMatch(
      /planning (?:self-)?review[\s\S]{0,180}inherit[\s\S]{0,280}implementation phase review[\s\S]{0,240}(?:named )?ceiling/i,
    );
    expect(adapter).toMatch(
      /root owns implementation phase-review selection[\s\S]{0,320}pre-start CLI reviewer route/i,
    );
    expect(adapter).toMatch(/Gate independence is project policy/i);
    expect(adapter).toMatch(/configured cross-family gates/i);
    expect(engine).toMatch(/invalid-run-abort[\s\S]{0,220}never authorizes/i);
    expect(adapter).toMatch(
      /tracked smoke marker[\s\S]{0,320}invalid-run-abort/i,
    );

    for (const path of consumers) {
      const content = await readRepoFile(path);
      if (path === '.agents/agents/oat-phase-implementer.md') {
        // The materialized agent binds installed roots like every other
        // consumer; there is no bare-path exemption to inherit.
        expect(content, path).toContain(independentAdapterPath);
        expect(content, path).toContain(independentEnginePath);
        expect(content, path).not.toContain(portableAdapterPath);
        expect(content, path).not.toContain(portableEnginePath);
        expect(content, path).not.toContain(adapterPath);
        expect(content, path).not.toContain(enginePath);
      } else if (path === '.agents/skills/oat-project-implement/SKILL.md') {
        expect(content, path).toContain(independentAdapterPath);
        expect(content, path).toContain(independentEnginePath);
        expect(content, path).not.toContain(portableAdapterPath);
        expect(content, path).not.toContain(portableEnginePath);
        expect(content, path).not.toContain(adapterPath);
        expect(content, path).not.toContain(enginePath);
      } else {
        expect(content, path).toContain(portableAdapterPath);
        expect(content, path).toContain(portableEnginePath);
        expect(content, path).not.toContain(adapterPath);
        expect(content, path).not.toContain(enginePath);
      }
    }
  });

  it('pins portable user-default agents to installed-root sibling reads', async () => {
    const agents = [
      ['.agents/agents/oat-phase-implementer.md', '1.1.2'],
      ['.agents/agents/oat-reviewer.md', '1.2.1'],
      ['.agents/agents/oat-codebase-mapper.md', '1.0.1'],
    ] as const;

    for (const [path, expectedVersion] of agents) {
      const content = await readRepoFile(path);

      expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim(), path).toBe(
        expectedVersion,
      );
      // Materialized agents have no portable loaded-agent root, so the order is
      // user scope then project scope with no invented loaded candidate.
      expect(content, `${path} candidate order`).toMatch(
        /\$\{HOME\}\/\.agents\/skills`[\s\S]{0,160}<repo-root>\/\.agents\/skills`/,
      );
      expect(content, `${path} invents no loaded-agent root`).not.toMatch(
        /\$\{(?:SKILL_DIR|AGENT_DIR)\}/,
      );
      expect(content, `${path} forbids ambient discovery`).toContain(
        'never ambient discovery',
      );
      expect(content, `${path} has no bare cross-skill read`).not.toMatch(
        /(?:\.\.?\/)?\.agents\/skills\/[a-zA-Z0-9_-]+\/(?:SKILL\.md|references)/,
      );
      expect(content, `${path} has no parent-relative sibling hop`).not.toMatch(
        /(?<![/a-zA-Z0-9_.-])\.\.\/[a-zA-Z0-9_-]+\/(?:SKILL\.md|references)/,
      );
    }

    const reviewer = await readRepoFile('.agents/agents/oat-reviewer.md');
    expect(reviewer).toContain(
      '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md',
    );
    expect(reviewer).toContain(
      '${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/model-selection-principles.md',
    );
    // The reviewer stays out of the project lifecycle adapter.
    expect(reviewer).not.toContain(
      '${PROJECT_DISPATCH_SKILLS_ROOT}/oat-project-dispatch-subagents/SKILL.md',
    );

    const mapper = await readRepoFile('.agents/agents/oat-codebase-mapper.md');
    expect(mapper).toContain(
      '${KNOWLEDGE_INDEX_SKILLS_ROOT}/oat-repo-knowledge-index/references/templates/',
    );
    expect(mapper).toContain(
      'oat tools install workflows --scope <user|project>',
    );
  });

  it('pins portable research-pack callers to installed-root schema reads', async () => {
    const callers = [
      ['.agents/skills/analyze/SKILL.md', '0.2.0'],
      ['.agents/skills/compare/SKILL.md', '0.1.1'],
    ] as const;

    for (const [path, expectedVersion] of callers) {
      const content = await readRepoFile(path);

      expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim(), path).toBe(
        expectedVersion,
      );
      // Loaded-skill candidate order: loaded scope, then user, then project.
      expect(content, `${path} candidate order`).toMatch(
        /\$\{SKILL_DIR\}\/\.\.`[\s\S]{0,160}\$\{HOME\}\/\.agents\/skills`[\s\S]{0,160}<repo-root>\/\.agents\/skills`/,
      );
      expect(content, `${path} forbids ambient discovery`).toContain(
        'never ambient discovery',
      );
      expect(content, `${path} names owning-pack recovery`).toContain(
        'oat tools install research --scope <user|project>',
      );
      expect(content, `${path} names owning-pack update recovery`).toContain(
        'oat tools update --pack research --scope <user|project>',
      );
      expect(
        content,
        `${path} has no repo-relative cross-skill read`,
      ).not.toMatch(
        /(?:\.\.?\/)?\.agents\/skills\/[a-zA-Z0-9_-]+\/(?:SKILL\.md|references)/,
      );
      expect(content, `${path} has no parent-relative sibling hop`).not.toMatch(
        /(?<![/a-zA-Z0-9_.-])\.\.\/[a-zA-Z0-9_-]+\/(?:SKILL\.md|references)/,
      );
      expect(content, `${path} binds the research root`).toContain(
        '${RESEARCH_SKILLS_ROOT}/deep-research/references/',
      );
    }
  });

  it('pins portable utility-pack callers to installed-root sibling reads', async () => {
    const callers = [
      ['.agents/skills/oat-dispatch-subagents/SKILL.md', '1.2.6'],
      ['.agents/skills/oat-repo-improve/SKILL.md', '2.1.2'],
      ['.agents/skills/oat-review-provide-remote/SKILL.md', '1.1.1'],
    ] as const;

    for (const [path, expectedVersion] of callers) {
      const content = await readRepoFile(path);

      expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim(), path).toBe(
        expectedVersion,
      );
      // Loaded-skill candidate order: loaded scope, then user, then project.
      expect(content, `${path} candidate order`).toMatch(
        /\$\{SKILL_DIR\}\/\.\.`[\s\S]{0,160}\$\{HOME\}\/\.agents\/skills`[\s\S]{0,160}<repo-root>\/\.agents\/skills`/,
      );
      expect(content, `${path} forbids ambient discovery`).toContain(
        'never ambient discovery',
      );
      expect(content, `${path} names owning-pack recovery`).toContain(
        'oat tools install utility --scope <user|project>',
      );
      expect(content, `${path} names owning-pack update recovery`).toContain(
        'oat tools update --pack utility --scope <user|project>',
      );
      expect(
        content,
        `${path} has no repo-relative cross-skill read`,
      ).not.toMatch(
        /(?:\.\.?\/)?\.agents\/skills\/[a-zA-Z0-9_-]+\/(?:SKILL\.md|references)/,
      );
      expect(content, `${path} has no parent-relative sibling hop`).not.toMatch(
        /(?<![/a-zA-Z0-9_.-])\.\.\/[a-zA-Z0-9_-]+\/(?:SKILL\.md|references)/,
      );
    }

    const remote = await readRepoFile(
      '.agents/skills/oat-review-provide-remote/SKILL.md',
    );
    expect(remote).toContain(
      '${REVIEW_PROVIDE_SKILLS_ROOT}/oat-review-provide/references/review-artifact-template.md',
    );

    const repoImprove = await readRepoFile(
      '.agents/skills/oat-repo-improve/SKILL.md',
    );
    // Independent roots keep mixed-scope installs resolvable.
    expect(repoImprove).toContain(
      '${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md',
    );
    expect(repoImprove).toContain(
      '${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/model-selection-principles.md',
    );
  });

  it('separates accepted-launch fallback from caller-authorized recovery', async () => {
    const engine = await readRepoFile(
      '.agents/skills/oat-dispatch-subagents/SKILL.md',
    );
    const recovery = engine.slice(engine.indexOf('## Acceptance and Recovery'));

    expect(recovery).toMatch(
      /accepted launch[\s\S]{0,180}terminal for automatic replacement eligibility/i,
    );
    expect(recovery).toMatch(
      /route[\s\S]{0,80}model[\s\S]{0,80}provider[\s\S]{0,160}replacement[\s\S]{0,160}forbidden fallback/i,
    );
    expect(recovery).toMatch(
      /same-target[\s\S]{0,180}bounded recovery[\s\S]{0,220}continuation/i,
    );
    expect(recovery).toMatch(
      /caller-specific lifecycle contract[\s\S]{0,280}scope[\s\S]{0,120}exact target[\s\S]{0,120}numeric budget[\s\S]{0,120}(?:canonical )?record[\s\S]{0,120}stop conditions/i,
    );
    expect(recovery).toMatch(
      /scope-expanding[\s\S]{0,160}consequential[\s\S]{0,200}(?:operator|user) direction/i,
    );
    expect(recovery).toMatch(
      /default-deny[\s\S]{0,220}oat-project-implement[\s\S]{0,400}wave[\s\S]{0,80}execution[\s\S]{0,160}autonomous projects[\s\S]{0,160}cloud-project[\s\S]{0,80}orchestration[\s\S]{0,160}reviewers/i,
    );
    expect(recovery).toMatch(
      /no post-acceptance outcome[\s\S]{0,180}(?:another|replacement) route eligible/i,
    );
  });

  it('loads generic guidance and exactly one active-provider mechanics reference', async () => {
    const selectionRoot = '.agents/skills/subagent-orchestration';
    const mechanicsRoot = '.agents/skills/oat-dispatch-subagents';
    const contract = await readRepoFile(`${mechanicsRoot}/SKILL.md`);
    const principles = await readRepoFile(
      `${selectionRoot}/references/model-selection-principles.md`,
    );
    const cursor = await readRepoFile(
      `${mechanicsRoot}/references/provider-cursor.md`,
    );
    const codex = await readRepoFile(
      `${mechanicsRoot}/references/provider-codex.md`,
    );
    const claude = await readRepoFile(
      `${mechanicsRoot}/references/provider-claude.md`,
    );
    const consumerSpecs = [
      {
        path: '.agents/skills/oat-project-implement/SKILL.md',
        heading: '## Shared Subagent Dispatch Contract',
      },
      {
        path: '.agents/skills/oat-project-plan-writing/SKILL.md',
        heading: '## Shared Subagent Dispatch Contract',
      },
      {
        path: '.agents/skills/oat-project-dispatch-subagents/SKILL.md',
        heading: '## Required Loading',
      },
      {
        path: '.agents/skills/oat-cursor-cloud-projects/SKILL.md',
        heading: '### Step 4: Load Cursor Dispatch Context When Needed',
        provider: 'cursor',
      },
      {
        path: '.agents/skills/oat-repo-improve/SKILL.md',
        heading: '### Step 2: Select Orchestration Tier',
      },
      {
        path: '.agents/agents/oat-reviewer.md',
        heading: '## Bounded Reviewer Reconnaissance',
      },
      {
        path: '.agents/agents/oat-phase-implementer.md',
        heading: '## Shared Dispatch Contract',
      },
    ] as const;

    expect(principles).toMatch(/Five Task Classes/);
    for (const provider of ['cursor', 'codex', 'claude']) {
      await expect(
        readRepoFile(`${selectionRoot}/references/provider-${provider}.md`),
      ).resolves.toMatch(/Model Selection/);
      expect(contract).toContain(
        `subagent-orchestration/references/provider-${provider}.md`,
      );
      expect(contract).toContain(`references/provider-${provider}.md`);
    }
    for (const spec of consumerSpecs) {
      const content = await readRepoFile(spec.path);
      const start = content.indexOf(spec.heading);
      const headingPrefix = spec.heading.startsWith('### ')
        ? '\n### '
        : '\n## ';
      const end = content.indexOf(headingPrefix, start + spec.heading.length);
      const loadingBlock = content.slice(start, end === -1 ? undefined : end);
      const engineIndex = loadingBlock.indexOf('oat-dispatch-subagents');
      const principlesIndex = loadingBlock.indexOf(
        'subagent-orchestration/references/model-selection-principles.md',
      );
      const selectionInstruction = spec.provider
        ? loadingBlock.match(
            new RegExp(
              `subagent-orchestration/references/provider-${spec.provider}\\.md`,
              'i',
            ),
          )
        : loadingBlock.match(
            /read\s+exactly\s+one\s+(?:active-provider\s+|matching\s+)?selection\s+reference/i,
          );
      const mechanicsInstruction = spec.provider
        ? loadingBlock.match(
            new RegExp(
              `oat-dispatch-subagents/references/provider-${spec.provider}\\.md`,
              'i',
            ),
          )
        : loadingBlock.match(/matching\s+mechanics\s+reference/i);
      const selectionProviders = [
        ...loadingBlock.matchAll(
          /subagent-orchestration\/references\/provider-(claude|codex|cursor)\.md/gi,
        ),
      ].map((match) => match[1]?.toLowerCase());
      const mechanicsProviders = [
        ...loadingBlock.matchAll(
          /oat-dispatch-subagents\/references\/provider-(claude|codex|cursor)\.md/gi,
        ),
      ].map((match) => match[1]?.toLowerCase());

      expect(start, `${spec.path} loading block`).toBeGreaterThanOrEqual(0);
      expect(
        engineIndex,
        `${spec.path} dispatch engine`,
      ).toBeGreaterThanOrEqual(0);
      expect(principlesIndex, `${spec.path} principles`).toBeGreaterThan(
        engineIndex,
      );
      expect(
        selectionInstruction?.index,
        `${spec.path} one provider selection`,
      ).toBeGreaterThan(principlesIndex);
      expect(
        mechanicsInstruction?.index,
        `${spec.path} matching provider mechanics`,
      ).toBeGreaterThan(selectionInstruction?.index ?? Number.MAX_SAFE_INTEGER);
      expect(
        loadingBlock.match(
          /read\s+exactly\s+one\s+(?:active-provider\s+|matching\s+)?selection\s+reference/gi,
        )?.length ?? 0,
        `${spec.path} selection cardinality`,
      ).toBe(spec.provider ? 0 : 1);
      expect(
        selectionProviders.length,
        `${spec.path} concrete selection references`,
      ).toBeLessThanOrEqual(1);
      expect(
        mechanicsProviders.length,
        `${spec.path} concrete mechanics references`,
      ).toBeLessThanOrEqual(1);
      if (selectionProviders.length > 0 || mechanicsProviders.length > 0) {
        expect(selectionProviders, `${spec.path} provider pairing`).toEqual(
          mechanicsProviders,
        );
      }
    }

    expect(cursor).toMatch(
      /dispatchArgs\.variant[\s\S]{0,420}(?:native agent type|native role)/i,
    );
    expect(cursor).toMatch(/omit(?:ted)? variant[\s\S]{0,120}inherit/i);
    expect(cursor).toMatch(
      /root and nested catalogs[\s\S]{0,180}(?:volatile|independent|snapshot)/i,
    );
    expect(cursor).toMatch(
      /pre-start CLI or SDK routes[\s\S]{0,360}native mismatch[\s\S]{0,260}recorded before launch/i,
    );
    expect(cursor).toMatch(
      /catalog-mismatch advisory[\s\S]{0,320}nearby native\s+candidates[\s\S]{0,240}do not\s+remove/i,
    );
    expect(codex).toMatch(/materialized role/i);
    expect(codex).toMatch(/maximum nesting depth/i);
    expect(codex).toMatch(/scoped writable roots/i);
    expect(codex).toMatch(/configured-invocation evidence/i);
    expect(claude).toMatch(/native agent tool/i);
    expect(claude).toContain('`claude -p`');
  });

  it('pins all task classes and ordered guidance freshness metadata', async () => {
    const selectionRoot = '.agents/skills/subagent-orchestration/references';
    const taskClasses = [
      'mechanical-recon',
      'intelligent-recon',
      'default-implementation',
      'hard-reasoning',
      'consequential',
    ] as const;
    const principles = await readRepoFile(
      `${selectionRoot}/model-selection-principles.md`,
    );
    const providers = await Promise.all(
      ['claude', 'codex', 'cursor'].map(async (provider) => [
        provider,
        await readRepoFile(`${selectionRoot}/provider-${provider}.md`),
      ]),
    );
    const taskClassSection = principles.slice(
      principles.indexOf('## Five Task Classes'),
      principles.indexOf('## Default, Economy, and Escalation'),
    );
    const taskClassRows = [
      ...taskClassSection.matchAll(/^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|$/gm),
    ].map((match) => ({
      taskClass: match[1] ?? '',
      qualification: match[2] ?? '',
    }));
    const qualificationMarkers = {
      'mechanical-recon':
        /deterministic[\s\S]*(?:misses are visible|cheaply verified)/i,
      'intelligent-recon':
        /interpretation[\s\S]*(?:plausible miss|survive mechanical validation)/i,
      'default-implementation':
        /bounded[\s\S]*retain[\s\S]*reconcile dispersed context/i,
      'hard-reasoning':
        /ambiguity[\s\S]*(?:novelty|architecture|diagnosis|competing interpretations)/i,
      consequential:
        /security[\s\S]*(?:release safety|irreversible)[\s\S]*(?:adversarial|foundational|expensive failure)/i,
    } as const;

    expect(taskClassRows.map(({ taskClass }) => taskClass)).toEqual(
      taskClasses,
    );
    for (const { taskClass, qualification } of taskClassRows) {
      expect(qualification, `${taskClass} qualification`).toMatch(
        qualificationMarkers[taskClass as keyof typeof qualificationMarkers],
      );
    }
    expect(taskClassSection).toMatch(
      /Classify in this order:\s*deterministic verifiability,\s*silent-miss risk,\s*dispersed-context reconciliation,\s*ambiguity or novelty,\s*then consequence/i,
    );
    expect(taskClassSection).toMatch(/When uncertain, use the stronger class/i);

    const escalationSection = principles.slice(
      principles.indexOf('## Escalation Boundaries'),
      principles.indexOf('## Long Context'),
    );
    for (const [boundary, marker] of [
      [
        'mechanical to intelligent recon',
        /Mechanical to intelligent recon[\s\S]{0,160}(?:judgment|required to identify|miss would be silent)/i,
      ],
      [
        'recon to default implementation',
        /Recon to default implementation[\s\S]{0,180}retain[\s\S]{0,100}reconcil(?:e|ing) dispersed context/i,
      ],
      [
        'default implementation to hard reasoning',
        /Default implementation to hard reasoning[\s\S]{0,160}(?:ambiguity|novelty|reasoning difficulty)/i,
      ],
      [
        'any class to consequential',
        /Any class to consequential[\s\S]{0,180}(?:security|production impact|irreversibility)[\s\S]{0,120}(?:adversarial|expensive failure)/i,
      ],
    ] as const) {
      expect(escalationSection, boundary).toMatch(marker);
    }

    for (const [provider, content] of providers) {
      const frontmatter = getFrontmatterForTest(content);
      const metadata = Object.fromEntries(
        ['guidance_version', 'last_verified', 'review_after'].map((field) => [
          field,
          frontmatter.match(
            new RegExp(`^${field}:\\s*(\\d{4}-\\d{2}-\\d{2})$`, 'm'),
          )?.[1] ?? '',
        ]),
      );
      const timestamps = Object.values(metadata).map((value) =>
        Date.parse(`${value}T00:00:00Z`),
      );
      const matrixClasses = [
        ...content.matchAll(
          /^\|\s*`(mechanical-recon|intelligent-recon|default-implementation|hard-reasoning|consequential)`\s*\|/gm,
        ),
      ].map((match) => match[1]);

      expect(metadata, `${provider} freshness metadata`).toEqual({
        guidance_version: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        last_verified: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        review_after: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
      expect(
        timestamps.every(Number.isFinite),
        `${provider} parseable freshness dates`,
      ).toBe(true);
      expect(
        timestamps[0],
        `${provider} guidance version is not newer than verification`,
      ).toBeLessThanOrEqual(timestamps[1]!);
      expect(
        timestamps[1],
        `${provider} verification precedes review`,
      ).toBeLessThan(timestamps[2]!);
      expect(matrixClasses, `${provider} task-class matrix`).toEqual(
        taskClasses,
      );
    }

    const refresh = await readRepoFile(
      `${selectionRoot}/evidence-and-refresh.md`,
    );
    const refreshDates = [
      'guidance_version',
      'last_verified',
      'review_after',
      'stale_after',
    ].map((field) =>
      Date.parse(
        `${refresh.match(new RegExp(`^${field}:\\s*(\\d{4}-\\d{2}-\\d{2})$`, 'm'))?.[1] ?? ''}T00:00:00Z`,
      ),
    );
    expect(refreshDates.every(Number.isFinite)).toBe(true);
    expect(refreshDates[0]).toBeLessThanOrEqual(refreshDates[1]!);
    expect(refreshDates[1]).toBeLessThan(refreshDates[2]!);
    expect(refreshDates[2]).toBeLessThan(refreshDates[3]!);
  });

  it('keeps Claude hard and consequential routing Opus-first', async () => {
    const claude = await readRepoFile(
      '.agents/skills/subagent-orchestration/references/provider-claude.md',
    );
    const hardReasoningRow =
      claude.match(/^\|\s*`hard-reasoning`\s*\|(.+)$/m)?.[1] ?? '';
    const consequentialRow =
      claude.match(/^\|\s*`consequential`\s*\|(.+)$/m)?.[1] ?? '';

    expect(hardReasoningRow).toMatch(/^\s*Opus\b/i);
    expect(consequentialRow).toMatch(/^\s*Opus\b/i);
    expect(claude).toMatch(
      /Opus remains the hard-reasoning and consequential root default/i,
    );
    expect(claude).toMatch(
      /Escalate the\s+root from Opus to Fable only when unresolved ambiguity, exceptional novelty or\s+consequence, or a directly relevant Fable strength/i,
    );
    expect(claude).toMatch(
      /A consequential classification by itself is insufficient/i,
    );
    expect(claude).toMatch(
      /stronger safety classifier[\s\S]{0,180}not an\s+exception that inverts the general Opus-first policy/i,
    );
    const costPosture = claude.slice(
      claude.indexOf('## Root and Subagent Cost Posture'),
      claude.indexOf('## Cyber-Sensitive Evidence'),
    );
    expect(costPosture).toMatch(
      /strong, low-volume root orchestration[\s\S]{0,160}coherence-critical[\s\S]{0,180}bounded subagents carry\s+most execution volume/i,
    );
    expect(costPosture).toMatch(
      /Capture routine savings in higher-volume subagents[\s\S]{0,180}instead\s+of weakening the root orchestrator/i,
    );
  });

  it('keeps provider mechanics generic while retaining selectors and floors', async () => {
    const mechanicsRoot = '.agents/skills/oat-dispatch-subagents/references';
    const versionedModelMarkers = {
      claude: /\b(?:Haiku|Sonnet|Opus|Fable|Mythos)\s+\d/i,
      codex: /\bGPT-\d/i,
      cursor: /\b(?:composer|gpt|claude|grok|gemini|kimi|glm)[- ]\d/i,
    } as const;
    const providerFamilyMarkers = {
      claude: /\b(?:Haiku|Sonnet|Opus|Fable|Mythos)\b/i,
      codex: /\b(?:GPT|o[134])(?:[-\s]|\b)/i,
      cursor:
        /\b(?:Composer|Grok|Gemini|Kimi|GLM|GPT|Haiku|Sonnet|Opus|Fable|Mythos)\b/i,
    } as const;

    for (const provider of ['claude', 'codex', 'cursor'] as const) {
      const mechanics = await readRepoFile(
        `${mechanicsRoot}/provider-${provider}.md`,
      );
      const taskClassStart = mechanics.indexOf('## Task-Class Resolution');
      const taskClassEnd = mechanics.indexOf(
        '\n## ',
        taskClassStart + '## Task-Class Resolution'.length,
      );
      const taskClassResolution = mechanics.slice(
        taskClassStart,
        taskClassEnd === -1 ? undefined : taskClassEnd,
      );
      const recommendationParagraphs = mechanics
        .split(/\n\n+/)
        .filter(
          (paragraph) =>
            /(?:mechanical-recon|intelligent-recon|default-implementation|hard-reasoning|consequential|default|economy|escalat|recommend|prefer|choose|select|best|route)/i.test(
              paragraph,
            ) ||
            (/^(?:[-*]|\d+\.)\s/m.test(paragraph) &&
              providerFamilyMarkers[provider].test(paragraph)),
        );
      const recommendationTables = (
        mechanics.match(/(?:^\|.*\|\n?){2,}/gm) ?? []
      ).filter((table) =>
        /(?:task class|class|model|family|default|economy|escalation|recommend|preferred|route)/i.test(
          table.split('\n')[0] ?? '',
        ),
      );

      expect(mechanics, `${provider} generic model selector`).toMatch(
        /model (?:enum|choices|selector|resolution)|model\/effort selectors/i,
      );
      expect(mechanics, `${provider} generic class floor`).toMatch(
        /class floor|requested floor/i,
      );
      expect(mechanics, `${provider} task-class resolution`).toMatch(
        /^## Task-Class Resolution$/m,
      );
      expect(mechanics, `${provider} no versioned named models`).not.toMatch(
        versionedModelMarkers[provider],
      );
      expect(
        taskClassResolution,
        `${provider} no task-class family recommendations`,
      ).not.toMatch(providerFamilyMarkers[provider]);
      for (const paragraph of recommendationParagraphs) {
        expect(
          paragraph,
          `${provider} no named recommendation paragraph`,
        ).not.toMatch(providerFamilyMarkers[provider]);
      }
      for (const table of recommendationTables) {
        expect(table, `${provider} no named recommendation table`).not.toMatch(
          providerFamilyMarkers[provider],
        );
      }
      expect(mechanics, `${provider} no dated selection heading`).not.toMatch(
        /^## (?:Current Families|Dated Task-Class Matrix|Model Recommendations|Recommendation Matrix)$/m,
      );
    }
  });

  it('keeps dispatch guidance evidence additive and floor-neutral', async () => {
    const schema = await readRepoFile(
      '.agents/skills/oat-dispatch-subagents/references/record-schema.md',
    );
    const engine = await readRepoFile(
      '.agents/skills/oat-dispatch-subagents/SKILL.md',
    );
    const request =
      schema.match(/^## Request[\s\S]*?```yaml\n([\s\S]*?)\n```/m)?.[1] ?? '';
    const legacyRecord =
      schema.match(/^## Legacy Record[\s\S]*?```yaml\n([\s\S]*?)\n```/m)?.[1] ??
      '';
    const enrichedRecord =
      schema.match(/^## Record[\s\S]*?```yaml\n([\s\S]*?)\n```/m)?.[1] ?? '';
    const optionalEvidence =
      schema.match(
        /^## Optional Model-Guidance Evidence[\s\S]*?```yaml\n([\s\S]*?)\n```/m,
      )?.[1] ?? '';
    const guidanceFields = [
      'reasoning_mode_selector',
      'service_tier_selector',
      'guidance_reference',
      'guidance_version',
      'guidance_verified_at',
      'guidance_status',
    ] as const;
    const requestSelectorMapping =
      schema.match(
        /`reasoning_mode` and `service_tier` are normalized[\s\S]*?(?=\n\n`dispatch_policy`)/i,
      )?.[0] ?? '';
    const recordBaselineFields = [
      'request_id',
      'caller',
      'scope',
      'objective',
      'action',
      'role_name',
      'role_class',
      'provider',
      'dispatch_context',
      'authority',
      'role_selector',
      'model_selector',
      'effort_selector',
      'selection_source',
      'selection_reason',
      'selected_route',
      'launch_status',
      'child_outcome',
    ] as const;

    expect(schema).toMatch(
      /following fields are optional for legacy callers[\s\S]{0,180}dated provider\s+mapping influenced selection/i,
    );
    expect(schema).toMatch(
      /legacy\s+`explicit-downgrade` example above is valid only for an unconstrained request/i,
    );
    for (const [requestField, recordField] of [
      ['reasoning_mode', 'reasoning_mode_selector'],
      ['service_tier', 'service_tier_selector'],
    ] as const) {
      expect(request, `request intent ${requestField}`).toMatch(
        new RegExp(`^${requestField}:`, 'm'),
      );
      expect(enrichedRecord, `resolved record evidence ${recordField}`).toMatch(
        new RegExp(`^${recordField}:`, 'm'),
      );
      expect(
        requestSelectorMapping,
        `${requestField} to ${recordField} mapping`,
      ).toContain(`\`${requestField}\``);
      expect(
        requestSelectorMapping,
        `${requestField} to ${recordField} mapping`,
      ).toContain(`\`${recordField}\``);
    }
    expect(requestSelectorMapping).toMatch(
      /launch evidence[\s\S]{0,180}not blind copies[\s\S]{0,180}provider-native controls/i,
    );
    for (const field of recordBaselineFields) {
      expect(legacyRecord, `legacy record baseline ${field}`).toMatch(
        new RegExp(`^${field}:`, 'm'),
      );
      expect(enrichedRecord, `enriched record baseline ${field}`).toMatch(
        new RegExp(`^${field}:`, 'm'),
      );
    }
    for (const field of guidanceFields) {
      expect(enrichedRecord, `enriched record ${field}`).toMatch(
        new RegExp(`^${field}:`, 'm'),
      );
      expect(optionalEvidence, `optional evidence ${field}`).toMatch(
        new RegExp(`^${field}:`, 'm'),
      );
      expect(legacyRecord, `legacy record omits ${field}`).not.toMatch(
        new RegExp(`^${field}:`, 'm'),
      );
    }
    expect(schema).toMatch(
      /service tier never changes `model_class_floor` or `floor_satisfaction`/i,
    );
    expect(schema).toMatch(
      /Unknown tier semantics must be recorded as a diagnostic and may block a\s+consequential route/i,
    );
    expect(engine).toMatch(
      /fast or priority tier[\s\S]{0,180}never satisfies a higher task-class floor/i,
    );
  });

  it('aligns human selection fields with smoke evidence wire paths', async () => {
    const engine = await readRepoFile(
      '.agents/skills/oat-dispatch-subagents/SKILL.md',
    );
    const schema = await readRepoFile(
      '.agents/skills/oat-dispatch-subagents/references/record-schema.md',
    );
    const contract = `${engine}\n${schema}`;
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const smoke = await readRepoFile('tools/smoke/CONTRACT.md');

    for (const [name, content] of [
      ['shared dispatch contract', contract],
      ['implementation dispatch notes', implement],
      ['smoke evidence contract', smoke],
    ] as const) {
      expect(content, `${name} selection reason`).toContain('selection_reason');
      expect(content, `${name} candidates`).toContain('candidates_considered');
    }
    for (const reason of [
      'native-catalog',
      'native-catalog-unsatisfying',
      'pre-start-rejection',
      'inherit',
    ]) {
      expect(contract).toContain(reason);
      expect(implement).toContain(reason);
      expect(smoke).toContain(reason);
    }
    expect(smoke).toMatch(
      /selection_reason[\s\S]{0,160}selection\.reason[\s\S]{0,240}candidates_considered[\s\S]{0,160}selection\.candidatesConsidered/,
    );
    expect(smoke).toMatch(
      /candidates_considered[\s\S]{0,120}ordered decision evidence[\s\S]{0,120}never be sorted/i,
    );
    expect(smoke).toContain('`gate-target` is intentionally outside this');
    expect(smoke).toMatch(/separate canonical[\s\S]{0,40}gate JSON/i);
  });

  it('makes planning inheritance and root-owned phase review executable', async () => {
    const planning = await readRepoFile(
      '.agents/skills/oat-project-plan-writing/SKILL.md',
    );
    const phaseAgent = await readRepoFile(
      '.agents/agents/oat-phase-implementer.md',
    );
    const implement = await readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const autoLoop = planning.slice(
      planning.indexOf('## Auto Artifact-Review Loop'),
      planning.indexOf('## Canonical Plan Format'),
    );
    const reviewRoute = implement.slice(
      implement.indexOf('### Per-Phase Review'),
      implement.indexOf('### Optional External Phase Review Gate'),
    );
    const resumeRoute = implement.slice(
      implement.indexOf('### Step 1.5: Resumption Detection'),
      implement.indexOf('### Step 2: Read Plan Document'),
    );

    expect(autoLoop).toMatch(
      /Default:[\s\S]{0,220}parent-at-or-above-ceiling[\s\S]{0,180}omit the child model[\s\S]{0,120}selection_reason: inherit/i,
    );
    expect(autoLoop).toMatch(
      /Exception:[\s\S]{0,180}planning parent is unknown or below the ceiling[\s\S]{0,180}concrete ceiling target/i,
    );
    expect(autoLoop).toMatch(
      /terminal timeout[\s\S]{0,120}(?:blocks|escalates)[\s\S]{0,160}cannot launch a replacement/i,
    );

    expect(reviewRoute).toContain('--role reviewer');
    expect(reviewRoute).toMatch(/Do not pass[\s\S]{0,80}`--ceiling-tier`/i);
    expect(reviewRoute).toMatch(/root workflow owns implementation review/i);
    expect(reviewRoute).toMatch(/exact\s+review payload before launch/i);
    expect(reviewRoute).toContain('selection reason');
    expect(reviewRoute).toContain('candidates');
    expect(reviewRoute).toMatch(
      /After acceptance[\s\S]{0,220}only through the accepted reviewer\s+handle/i,
    );
    expect(reviewRoute).toMatch(
      /Critical\/Important findings[\s\S]{0,260}Resume the original phase implementer handle/i,
    );
    expect(reviewRoute).toMatch(
      /fresh phase implementer[\s\S]{0,160}same exact target[\s\S]{0,240}original `request_id`[\s\S]{0,120}`continuation_events`/i,
    );
    expect(reviewRoute).toMatch(
      /do not support resuming a completed child handle[\s\S]{0,120}expected rather than an anomalous recovery/i,
    );
    expect(phaseAgent).toMatch(/do not own[\s\S]{0,120}phase review dispatch/i);
    expect(phaseAgent).toMatch(/Never dispatch implementation\s+self-review/i);
    expect(phaseAgent).toMatch(
      /Concurrent child writers[\s\S]{0,180}(?:disjoint|separate worktree)/i,
    );
    expect(resumeRoute).toContain('root-owned');
    expect(resumeRoute).toMatch(
      /root reviewer launch was accepted[\s\S]{0,180}existing reviewer handle[\s\S]{0,180}never replace/i,
    );
    expect(resumeRoute).toContain('explicitly');
    expect(resumeRoute).toMatch(/rejected before\s+child start/i);
    expect(resumeRoute).toContain('resume the original phase implementer');
    expect(resumeRoute).toMatch(
      /fresh same-target[\s\S]{0,160}original[\s\S]{0,80}`request_id`[\s\S]{0,80}`continuation_events`/i,
    );
    expect(resumeRoute).not.toMatch(/re-dispatch the reviewer/i);
  });

  it('requires quick-start to describe session-context synthesis and discovery backfill', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const skillPath = join(
      repoRoot,
      '.agents',
      'skills',
      'oat-project-quick-start',
      'SKILL.md',
    );
    const content = await readFile(skillPath, 'utf8');

    expect(content).toMatch(
      /synthesi(?:ze|s)\s+`?discovery\.md`?\s+from .*session context/i,
    );
    expect(content).toMatch(
      /backfill(?:s|ing)? .*discovery.*(discussion|q&a|decisions)/i,
    );
    expect(content).toMatch(
      /ask only (?:the )?minimum additional questions needed to remove blockers/i,
    );
  });

  it('tracks the quick-start skill contract version explicitly', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const skillPath = join(
      repoRoot,
      '.agents',
      'skills',
      'oat-project-quick-start',
      'SKILL.md',
    );
    const content = await readFile(skillPath, 'utf8');

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('2.3.8');
  });

  it('documents quick-start selective config fallback to collaborative', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const skillPath = join(
      repoRoot,
      '.agents',
      'skills',
      'oat-project-quick-start',
      'SKILL.md',
    );
    const content = await readFile(skillPath, 'utf8');

    expect(
      content,
      'quick-start must accept workflow.designMode=selective from config',
    ).toMatch(/\$CONFIG_MODE" = "selective"/);
    expect(
      content,
      'quick-start must treat selective as collaborative for lightweight design',
    ).toMatch(/treating as collaborative for lightweight design/i);
    expect(
      content,
      'quick-start must point users to full oat-project-design for Selective Collaborative',
    ).toMatch(
      /Selective Collaborative is only available in full oat-project-design/,
    );
  });

  it('preserves the selective collaborative review-pass contract', async () => {
    const repoRoot = join(process.cwd(), '..', '..');
    const skillPath = join(
      repoRoot,
      '.agents',
      'skills',
      'oat-project-design',
      'SKILL.md',
    );
    const referencePath = join(
      repoRoot,
      '.agents',
      'skills',
      'oat-project-design',
      'references',
      'selective-review-pass.md',
    );
    const skillContent = await readFile(skillPath, 'utf8');
    const referenceContent = await readFile(referencePath, 'utf8');

    expect(
      skillContent,
      'oat-project-design selective-mode contract version must stay explicit',
    ).toMatch(/^version:\s*2\.3\.2$/m);
    expect(
      skillContent,
      'Step 4a heading must remain present for selective review-pass flow',
    ).toMatch(/### Step 4a: Selective Review Pass/);
    expect(skillContent, 'Step 4a must name routine classifications').toMatch(
      /`routine`/,
    );
    expect(
      skillContent,
      'Step 4a must name needs-eyes classifications',
    ).toMatch(/`needs-eyes`/);
    expect(
      skillContent,
      'Step 4a must preserve the conservative-bias rule',
    ).toMatch(/any one needs-eyes signal marks the section `needs-eyes`/i);
    expect(
      skillContent,
      'Step 4a must force at least one live review section',
    ).toMatch(/force `Overview \+ Architecture` to `needs-eyes`/i);
    expect(
      skillContent,
      'Step 4a must reveal the Section Review Plan before drafting',
    ).toMatch(/Section Review Plan|Section review plan/);
    expect(
      skillContent,
      'Step 4a must point maintainers to the selective review-pass reference',
    ).toMatch(/references\/selective-review-pass\.md/);
    expect(
      skillContent,
      'Step 1.5 picker copy must use canonical selective wording',
    ).toMatch(/high-risk sections live/);
    expect(
      skillContent,
      'Step 1.5 picker copy must use canonical draft review wording',
    ).toMatch(/you review the committed file/);
    expect(referenceContent).toMatch(/^## Signal Set$/m);
    expect(referenceContent).toMatch(/^## Adequate Grounding$/m);
    expect(referenceContent).toMatch(/^## Recommendation Rules$/m);
    expect(referenceContent).toMatch(/^## Edge Cases$/m);
    expect(referenceContent).toMatch(/^## Dogfood Notes$/m);
  });

  it('reports missing quick-start-specific discovery guidance', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    const skillPath = await createSkillFile(
      root,
      'oat-project-quick-start',
      [
        '---',
        'name: oat-project-quick-start',
        'description: Use when validating quick-start specific guardrails.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Quick Start',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ QUICK START',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        'Minimal body without the required quick-start discovery semantics.',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([
      expect.objectContaining({
        file: skillPath,
        message:
          'Quick-start must describe synthesizing discovery.md from session context when enough detail is already available',
      }),
      expect.objectContaining({
        file: skillPath,
        message:
          'Quick-start must describe backfilling discovery.md after startup Q&A before planning',
      }),
      expect.objectContaining({
        file: skillPath,
        message:
          'Quick-start must limit follow-up questions to the minimum needed to remove blockers',
      }),
      expect.objectContaining({
        file: skillPath,
        message:
          'Quick-start must treat a bare project name as insufficient input, ask for a project description, and avoid inferring scope from the repo',
      }),
    ]);
  });

  it('accepts equivalent quick-start wording for discovery synthesis guidance', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);
    await createSkillFile(
      root,
      'oat-project-quick-start',
      [
        '---',
        'name: oat-project-quick-start',
        'version: 1.0.0',
        'description: Use when validating quick-start specific guardrails.',
        'disable-model-invocation: true',
        'user-invocable: true',
        'allowed-tools: Read, Write',
        '---',
        '',
        '# Quick Start',
        '',
        '## Progress Indicators (User-Facing)',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ' OAT ▸ QUICK START',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        'Populate `discovery.md` from the current session context when enough detail already exists.',
        'Only ask the minimum follow-up questions required to unblock planning.',
        'If startup Q&A is needed, record that discussion and the resulting decisions back into discovery.md before finalizing plan.md.',
        'A bare project name alone is not enough context to start discovery.',
        'Ask the user for a short project description when only the project name was provided.',
        'Do not infer requirements from the repo before that description is available.',
      ].join('\n'),
    );

    const result = await validateOatSkills(root);
    expect(result.findings).toEqual([]);
  });

  it('requires changed canonical skills to bump version relative to base ref', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);

    const skillPath = await createSkillFile(
      root,
      'oat-version-check',
      currentSkillContent(
        'oat-version-check',
        '1.2.3',
        'Updated skill instructions without a version bump.',
      ),
    );

    const result = await validateOatSkills(
      root,
      { baseRef: 'origin/main' },
      {
        gitExecFile: async (_file, args) => {
          if (args[0] === 'diff') {
            return {
              stdout: '.agents/skills/oat-version-check/SKILL.md\n',
              stderr: '',
            };
          }

          if (
            args[0] === 'show' &&
            args[1] === 'origin/main:.agents/skills/oat-version-check/SKILL.md'
          ) {
            return {
              stdout: currentSkillContent(
                'oat-version-check',
                '1.2.3',
                'Previous skill instructions.',
              ),
              stderr: '',
            };
          }

          throw new Error(`Unexpected command: git ${args.join(' ')}`);
        },
      },
    );

    expect(result.findings).toContainEqual({
      file: skillPath,
      message:
        'Changed canonical skill must bump frontmatter version relative to origin/main (still 1.2.3)',
    });
  });

  it('requires changed canonical skills to increase version relative to base ref', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);

    const skillPath = await createSkillFile(
      root,
      'oat-version-regression',
      currentSkillContent(
        'oat-version-regression',
        '1.2.2',
        'Updated skill instructions with a regressed version.',
      ),
    );

    const result = await validateOatSkills(
      root,
      { baseRef: 'origin/main' },
      {
        gitExecFile: async (_file, args) => {
          if (args[0] === 'diff') {
            return {
              stdout: '.agents/skills/oat-version-regression/SKILL.md\n',
              stderr: '',
            };
          }

          if (
            args[0] === 'show' &&
            args[1] ===
              'origin/main:.agents/skills/oat-version-regression/SKILL.md'
          ) {
            return {
              stdout: currentSkillContent(
                'oat-version-regression',
                '1.2.3',
                'Previous skill instructions.',
              ),
              stderr: '',
            };
          }

          throw new Error(`Unexpected command: git ${args.join(' ')}`);
        },
      },
    );

    expect(result.findings).toContainEqual({
      file: skillPath,
      message:
        'Changed canonical skill version must increase relative to origin/main (base 1.2.3, current 1.2.2)',
    });
  });

  it('allows changed canonical skills when the version increases', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);

    await createSkillFile(
      root,
      'oat-version-bumped',
      currentSkillContent(
        'oat-version-bumped',
        '1.2.4',
        'Updated skill instructions with a version bump.',
      ),
    );

    const result = await validateOatSkills(
      root,
      { baseRef: 'origin/main' },
      {
        gitExecFile: async (_file, args) => {
          if (args[0] === 'diff') {
            return {
              stdout: '.agents/skills/oat-version-bumped/SKILL.md\n',
              stderr: '',
            };
          }

          if (
            args[0] === 'show' &&
            args[1] === 'origin/main:.agents/skills/oat-version-bumped/SKILL.md'
          ) {
            return {
              stdout: currentSkillContent(
                'oat-version-bumped',
                '1.2.3',
                'Previous skill instructions.',
              ),
              stderr: '',
            };
          }

          throw new Error(`Unexpected command: git ${args.join(' ')}`);
        },
      },
    );

    expect(result.findings).toEqual([]);
  });

  it('allows brand-new canonical skills that do not exist at the base ref', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);

    await createSkillFile(
      root,
      'oat-brand-new-skill',
      currentSkillContent(
        'oat-brand-new-skill',
        '1.0.0',
        'Brand-new skill content.',
      ),
    );

    const result = await validateChangedSkillVersionBumps(
      root,
      { baseRef: 'origin/main' },
      {
        gitExecFile: async (_file, args) => {
          if (args[0] === 'diff') {
            return {
              stdout: '.agents/skills/oat-brand-new-skill/SKILL.md\n',
              stderr: '',
            };
          }

          if (
            args[0] === 'show' &&
            args[1] ===
              'origin/main:.agents/skills/oat-brand-new-skill/SKILL.md'
          ) {
            throw new Error('not found');
          }

          throw new Error(`Unexpected command: git ${args.join(' ')}`);
        },
      },
    );

    expect(result).toEqual({
      validatedSkillCount: 1,
      findings: [],
    });
  });

  it('skips version-bump enforcement when a changed skill lacks a version key', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-validate-'));
    tempDirs.push(root);

    await createSkillFile(
      root,
      'oat-no-version-enforcement',
      validSkillContent('oat-no-version-enforcement'),
    );

    const result = await validateChangedSkillVersionBumps(
      root,
      { baseRef: 'origin/main' },
      {
        gitExecFile: async (_file, args) => {
          if (args[0] === 'diff') {
            return {
              stdout: '.agents/skills/oat-no-version-enforcement/SKILL.md\n',
              stderr: '',
            };
          }

          if (
            args[0] === 'show' &&
            args[1] ===
              'origin/main:.agents/skills/oat-no-version-enforcement/SKILL.md'
          ) {
            return {
              stdout: currentSkillContent(
                'oat-no-version-enforcement',
                '1.2.3',
                'Previous versioned content.',
              ),
              stderr: '',
            };
          }

          throw new Error(`Unexpected command: git ${args.join(' ')}`);
        },
      },
    );

    expect(result).toEqual({
      validatedSkillCount: 1,
      findings: [],
    });
  });

  it('requires pack-gated workflows to query effective tool availability', async () => {
    const brainstorm = await readRepoFile(
      '.agents/skills/oat-brainstorm/SKILL.md',
    );
    const destinations = await readRepoFile(
      '.agents/skills/oat-brainstorm/references/destinations.md',
    );
    const projectDocument = await readRepoFile(
      '.agents/skills/oat-project-document/SKILL.md',
    );
    const projectSummary = await readRepoFile(
      '.agents/skills/oat-project-summary/SKILL.md',
    );

    for (const content of [
      brainstorm,
      destinations,
      projectDocument,
      projectSummary,
    ]) {
      expect(content).not.toMatch(/oat config get tools\./);
    }
    for (const pack of ['ideas', 'project-management', 'workflows']) {
      expect(brainstorm).toContain(`oat tools has ${pack}`);
      expect(destinations).toContain(`oat tools has ${pack}`);
    }
    expect(projectDocument).toContain('oat tools has project-management');
    expect(projectSummary).toContain('oat tools has project-management');

    for (const content of [projectDocument, projectSummary]) {
      expect(getFrontmatterForTest(content)).toContain('Bash(oat tools:*)');
    }
  });

  it('pins the brainstorm persistence invariant by project scope', async () => {
    const brainstorm = await readRepoFile(
      '.agents/skills/oat-brainstorm/SKILL.md',
    );
    const destinations = await readRepoFile(
      '.agents/skills/oat-brainstorm/references/destinations.md',
    );

    expect(brainstorm).toMatch(
      /Persistence invariant:[\s\S]*?shared and local project artifacts[\s\S]*?exact-path branch commits/,
    );
    expect(brainstorm).toMatch(
      /Synced project[\s\S]*?validated `oat project push --json` receipt[\s\S]*?never stage a synced artifact on the parent branch/,
    );
    expect(brainstorm).toContain(
      'clean fold-back, both dirty fold-back choices,\nand the brainstorming reference-file route',
    );
    expect(brainstorm).toContain(
      'exact-path branch commit for shared/local, validated project-ref push for synced',
    );
    expect(brainstorm).not.toContain(
      'No fold-back commit on a dirty working tree',
    );
    expect(destinations).toMatch(
      /If clean:[\s\S]*?validated `oat project push --json` receipt for synced[\s\S]*?exact-path branch commit for shared\/local/,
    );
    expect(destinations).toMatch(
      /\(a\)[\s\S]*?validated `oat project push --json` receipt for synced[\s\S]*?exact-path branch commit for shared\/local/,
    );
    expect(destinations).toMatch(
      /\(b\)[\s\S]*?validated project-ref push for synced[\s\S]*?exact-path branch commit for shared\/local/,
    );
    expect(destinations).toMatch(
      /\(c\)[\s\S]*?independently resolves scope[\s\S]*?synced-push versus shared\/local-commit split/,
    );
  });

  it('keeps arrival scope failures non-blocking in progress and next routing', async () => {
    for (const skillPath of [
      '.agents/skills/oat-project-progress/SKILL.md',
      '.agents/skills/oat-project-next/SKILL.md',
    ]) {
      const content = await readRepoFile(skillPath);
      expect(content).toContain('if ! PROJECT_SCOPE=$(oat project scope');
      expect(content).toContain(
        'skipping arrival pull and continuing with available local state',
      );
      expect(content).not.toMatch(
        /PROJECT_SCOPE=\$\(oat project scope[^\n]+\) \|\| exit 1/,
      );
    }
  });

  it('keeps shared and local arrival successful in bootstrap workflows', async () => {
    for (const skillPath of [
      '.agents/skills/oat-worktree-bootstrap/SKILL.md',
      '.agents/skills/oat-worktree-bootstrap-auto/SKILL.md',
      '.agents/skills/oat-cursor-cloud-projects/SKILL.md',
      '.agents/skills/oat-project-autonomous/SKILL.md',
    ]) {
      const content = await readRepoFile(skillPath);
      expect(content).toMatch(
        /if \[ "\$PROJECT_SCOPE" = "synced" \]; then\n\s+oat project pull/,
      );
      expect(content).not.toMatch(
        /\[ "\$PROJECT_SCOPE" = "synced" \] && oat project pull/,
      );
    }
  });

  it('requires project-summary decision promotion to pass every record section', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-project-summary/SKILL.md',
    );
    const stepSeven = content.match(
      /### Step 7: Promote Key Decisions[\s\S]*?(?=### Step 8:)/,
    )?.[0];

    expect(stepSeven).toBeDefined();
    expect(stepSeven).toMatch(
      /oat decision new "<title>"[\s\S]*--context "<context>"[\s\S]*--decision "<decision>"[\s\S]*--consequences "<consequences>"/,
    );
    expect(stepSeven).not.toMatch(/oat decision new[\s\S]{0,300}\bTODO\b/);
  });

  it('requires backlog capture to use atomic CLI creation with the confirmed estimate', async () => {
    const content = await readRepoFile(
      '.agents/skills/oat-pjm-add-backlog-item/SKILL.md',
    );

    expect(content).toMatch(
      /oat backlog new "\{title\}"[\s\S]*--scope-estimate "<confirmed-scope-estimate>"/,
    );
    expect(content).toMatch(
      /oat backlog new[\s\S]*Acceptance Criteria[\s\S]*Curated Overview/,
    );
    expect(content).not.toContain('oat backlog generate-id');
    expect(content).not.toContain('oat backlog regenerate-index');
    expect(content).not.toContain('ITEM_PATH=');
  });
});

describe('recon canonical contracts', () => {
  it('keeps the recon skill and worker provider-neutral and versioned', async () => {
    const [skill, worker] = await Promise.all([
      readRepoFile('.agents/skills/recon/SKILL.md'),
      readRepoFile('.agents/agents/recon-worker.md'),
    ]);

    expect(skill).toMatch(/^name:\s*recon$/m);
    expect(skill).toMatch(/^version:\s*1\.1\.0$/m);
    expect(skill).toMatch(/provider-neutral/i);
    expect(skill).toMatch(/exact (?:provider, )?model and effort/i);
    expect(skill).toMatch(/before\s+(?:any\s+)?(?:worker\s+)?launch/i);
    expect(skill).toMatch(/same\s+approved model and effort/i);
    expect(skill).toMatch(/packet directory/i);
    expect(worker).toMatch(/never interact with the user/i);
    expect(worker).toMatch(/never dispatch/i);
  });
});

describe('bundled skill contract truthfulness — doctor inventory', () => {
  it("keeps doctor's declared bundled inventory identical to the pack manifest", async () => {
    const doctor = await readRepoFile('.agents/skills/oat-doctor/SKILL.md');

    const sectionStart = doctor.indexOf(
      '**Bundled skill manifest (source of truth):**',
    );
    const sectionEnd = doctor.indexOf('For each pack, determine:');
    expect(sectionStart, 'inventory section start').toBeGreaterThan(-1);
    expect(sectionEnd, 'inventory section end').toBeGreaterThan(sectionStart);

    const section = doctor.slice(sectionStart, sectionEnd);
    const declared = new Map<string, string[]>();
    let currentPack: string | undefined;
    for (const line of section.split('\n')) {
      const heading = line.match(/^`([a-z-]+)` pack skills:$/);
      if (heading?.[1]) {
        currentPack = heading[1];
        // A repeated heading would let a later block silently discard the
        // names declared under the earlier one.
        expect(
          declared.has(currentPack),
          `duplicate ${currentPack} heading`,
        ).toBe(false);
        declared.set(currentPack, []);
        continue;
      }
      const bullet = line.match(/^-\s+(.+)$/);
      if (bullet?.[1] && currentPack) {
        declared.get(currentPack)?.push(
          ...bullet[1]
            .split(',')
            .map((name) => name.trim())
            .filter((name) => name.length > 0),
        );
      }
    }

    const expected = new Map(
      PACK_MANIFEST.map((pack) => [
        pack.name,
        [...getPackMemberNames(pack.name, 'skill')].sort(),
      ]),
    );

    expect([...declared.keys()].sort(), 'declared pack headings').toEqual(
      [...expected.keys()].sort(),
    );
    for (const [pack, expectedSkills] of expected) {
      expect([...(declared.get(pack) ?? [])].sort(), `${pack} pack`).toEqual(
        expectedSkills,
      );
    }
  });

  it("derives doctor's summary example counts from the pack manifest", async () => {
    const doctor = await readRepoFile('.agents/skills/oat-doctor/SKILL.md');
    const packSkills = new Map(
      PACK_MANIFEST.map((pack) => [
        pack.name,
        [...getPackMemberNames(pack.name, 'skill')].sort(),
      ]),
    );

    const installedTable = doctor.slice(
      doctor.indexOf('## Installed Packs'),
      doctor.indexOf('## Outdated Skills'),
    );
    const installedRows = [
      ...installedTable.matchAll(
        /^\|\s*([a-z-]+)\s*\|\s*[a-z]+\s*\|\s*\d+\/(\d+)\s*\|/gm,
      ),
    ];
    expect(installedRows.length, 'installed pack example rows').toBeGreaterThan(
      0,
    );
    for (const [, pack, total] of installedRows) {
      // Membership is asserted, never filtered: a row naming a pack that does
      // not exist is itself the drift this case exists to catch.
      expect(packSkills.has(pack ?? ''), `${pack} is a manifest pack`).toBe(
        true,
      );
      expect(Number(total), `${pack} example denominator`).toBe(
        packSkills.get(pack ?? '')?.length,
      );
    }

    const availableSection = doctor.slice(
      doctor.indexOf('## Available But Not Installed'),
      doctor.indexOf('## Configuration'),
    );
    const availableRows = [
      ...availableSection.matchAll(
        /^- \*\*([a-z-]+)\*\* pack: (.+?) \((\d+) skills available\)$/gm,
      ),
    ];
    expect(availableRows.length, 'available pack example rows').toBeGreaterThan(
      0,
    );
    for (const [, pack, names, count] of availableRows) {
      const listed = (names ?? '')
        .split(',')
        .map((name) => name.trim())
        .sort();
      expect(listed, `${pack} example skill list`).toEqual(
        packSkills.get(pack ?? ''),
      );
      expect(Number(count), `${pack} example count`).toBe(listed.length);
    }
  });
});

describe('bundled skill contract truthfulness — brainstorm diagnostics', () => {
  it('keeps the brainstorm node-missing note free of a later-doctor promise', async () => {
    const brainstorm = await readRepoFile(
      '.agents/skills/oat-brainstorm/SKILL.md',
    );
    const nodeMissing = brainstorm
      .split('\n')
      .find((line) => line.startsWith('- If `node` is **missing**:'));

    expect(nodeMissing, 'node-missing branch').toBeDefined();

    // The invariant is bounded, not keyword-blocked: exactly one sentence in
    // this branch may refer to a later diagnostic reader, and it must be the
    // sentence that denies the note survives at all. Any *additional*
    // sentence promising a later run observes it therefore fails, even when
    // the truthful wording is still present alongside it.
    const readerSentences = (branch: string): string[] =>
      branch
        .split(/(?<=\.)\s+/)
        .filter((sentence) =>
          /\b(?:oat-)?doctor\b|\bdiagnostics?\b|\b(?:later|subsequent|future|another)\b[^.]*\brun\b/i.test(
            sentence,
          ),
        );
    const permitted = [
      'Nothing persists that note, so no later diagnostic run can report it.',
    ];

    expect(readerSentences(nodeMissing ?? '')).toEqual(permitted);

    // Permanent negative controls: the guard must reject a reinstated promise
    // appended beside the truthful clause, and the original pre-fix phrasing.
    expect(
      readerSentences(
        `${nodeMissing ?? ''} A subsequent \`oat-doctor\` run surfaces it under Configuration.`,
      ),
      'paraphrased promise appended beside the truthful clause',
    ).not.toEqual(permitted);
    expect(
      readerSentences(
        '- If `node` is **missing**: skip the offer entirely. Do not print the offer message. Log a one-line note in the conversation that the visual companion is unavailable in this environment (a state `oat-doctor` can pick up later: "visual companion suppressed — node not on PATH"). Proceed with `VISUAL_COMPANION = "unavailable"`.',
      ),
      'original pre-fix phrasing',
    ).not.toEqual(permitted);

    expect(nodeMissing).toMatch(/for this session only|conversation-only/i);
    expect(nodeMissing).toMatch(/nothing persists/i);
    // The immediate, supported behaviour stays intact.
    expect(nodeMissing).toContain(
      'visual companion suppressed — node not on PATH',
    );
    expect(nodeMissing).toContain('VISUAL_COMPANION = "unavailable"');
    expect(nodeMissing).toContain('skip the offer entirely');
  });
});

describe('bundled skill contract truthfulness — idea-summarize tools', () => {
  it('declares Bash and Glob alongside its prior tools', async () => {
    const skill = await readRepoFile(
      '.agents/skills/oat-idea-summarize/SKILL.md',
    );

    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
    expect(frontmatter, 'idea-summarize frontmatter').toBeDefined();
    const declaredTools = (
      frontmatter?.match(/^allowed-tools:\s*(.+)$/m)?.[1] ?? ''
    )
      .split(',')
      .map((tool) => tool.trim())
      .filter((tool) => tool.length > 0);

    // Declaration and usage are asserted together: the steps below invoke
    // shell commands (Bash) and the Glob tool, so both must be declared, and
    // the previously declared tools must survive.
    expect(declaredTools).toEqual(
      expect.arrayContaining([
        'Read',
        'Write',
        'Bash',
        'Glob',
        'Grep',
        'AskUserQuestion',
      ]),
    );

    const resolveStep = skill.match(
      /### Step 1: Resolve Active Idea[\s\S]*?(?=### Step 2:)/,
    )?.[0];
    expect(resolveStep, 'resolve-active-idea step').toBeDefined();
    // Normal path: a shell command reads the pointer.
    expect(resolveStep).toContain('oat config get activeIdea');
    // Missing-active-idea fallback: Glob tool plus a shell write-back.
    const fallback = resolveStep?.slice(
      resolveStep.indexOf('**If missing or invalid:**'),
    );
    expect(fallback, 'missing-active-idea fallback').toBeDefined();
    expect(fallback).toContain('Use the Glob tool');
    expect(fallback).toContain('oat config set activeIdea');
  });
});

describe('bundled skill contract truthfulness — analyze progress model', () => {
  it('keeps analyze on a single ten-step progress model', async () => {
    const analyze = await readRepoFile('.agents/skills/analyze/SKILL.md');

    // No stale nine-step denominator survives anywhere in the skill.
    expect(analyze).not.toMatch(/\[\d+\/9\]/);

    const advertised = analyze.slice(
      analyze.indexOf('## Progress Indicators (User-Facing)'),
      analyze.indexOf('## Workflow'),
    );
    const advertisedSteps = [
      ...advertised.matchAll(/^- `\[(\d+)\/(\d+)\] ([^`]+)`/gm),
    ];

    expect(advertisedSteps.map(([, index]) => index)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
    ]);
    expect([...new Set(advertisedSteps.map(([, , total]) => total))]).toEqual([
      '10',
    ]);
    expect(
      new Set(advertisedSteps.map(([, , , label]) => label)).size,
      'distinct advertised step labels',
    ).toBe(10);

    // The workflow body emits the same ten-step model it advertises: same
    // indices, same denominators, same labels, one heading each.
    // Bounded at the next top-level heading so Examples, Troubleshooting, and
    // Success Criteria may legitimately quote a progress marker.
    const workflowStart = analyze.indexOf('## Workflow');
    const headingOffset = analyze.slice(workflowStart + 1).search(/^## /m);
    expect(headingOffset, 'heading after the workflow section').toBeGreaterThan(
      -1,
    );
    const workflow = analyze.slice(
      workflowStart,
      workflowStart + 1 + headingOffset,
    );
    const emitted = [...workflow.matchAll(/\[(\d+)\/(\d+)\] ([^`\n]+)/g)];
    expect(emitted.map(([, index]) => index)).toEqual(
      advertisedSteps.map(([, index]) => index),
    );
    expect(emitted.map(([, , total]) => total)).toEqual(
      advertisedSteps.map(([, , total]) => total),
    );
    expect(emitted.map(([, , , label]) => label.trim())).toEqual(
      advertisedSteps.map(([, , , label]) => label.trim()),
    );
    expect(
      [...workflow.matchAll(/^### Step (\d+):/gm)].map(([, index]) => index),
    ).toEqual(advertisedSteps.map(([, index]) => index));
  });
});
