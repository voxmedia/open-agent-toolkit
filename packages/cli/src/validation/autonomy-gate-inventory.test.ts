import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const PROMPT_PATTERN =
  /AskUserQuestion|ask (?:the user|once)|approval|confirm|prompt|choose|wait for/i;

interface PromptSite {
  file: string;
  key: string;
  heading: string;
  text: string;
}

interface ComparisonMapping {
  file: string;
  key: string;
  targets: string[];
}

interface InventoryReport {
  invalidMappings: ComparisonMapping[];
  staleMappings: ComparisonMapping[];
  unmappedSites: PromptSite[];
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

function normalizeSiteText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function createSiteKey(text: string, heading = ''): string {
  const normalizedText = normalizeSiteText(text);
  const normalizedHeading = normalizeSiteText(heading);
  return createHash('sha256')
    .update(
      normalizedHeading
        ? `${normalizedHeading}\n${normalizedText}`
        : normalizedText,
    )
    .digest('hex')
    .slice(0, 12);
}

function splitTableRow(line: string): string[] {
  return line
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function parseTable(markdown: string, heading: string): string[][] {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex < 0) {
    throw new Error(`Missing contract heading: ${heading}`);
  }

  const tableStart = lines.findIndex(
    (line, index) => index > headingIndex && line.trim().startsWith('|'),
  );
  if (tableStart < 0) {
    throw new Error(`Missing table after contract heading: ${heading}`);
  }

  const rows: string[][] = [];
  for (let index = tableStart; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (!line.trim().startsWith('|')) break;
    rows.push(splitTableRow(line.trim()));
  }
  return rows;
}

function parseInventory(markdown: string): {
  ids: Set<string>;
  skillRoots: string[];
} {
  const rows = parseTable(markdown, '## Gate inventory');
  const dataRows = rows.slice(2);
  return {
    ids: new Set(
      dataRows.map((row) => row[0]).filter((id): id is string => Boolean(id)),
    ),
    skillRoots: [
      ...new Set(
        dataRows
          .map((row) => row[1]?.replaceAll('`', ''))
          .filter((root): root is string => Boolean(root)),
      ),
    ],
  };
}

function parseComparisonMappings(markdown: string): ComparisonMapping[] {
  const rows = parseTable(markdown, '## HEAD prompt-site coverage');
  const mappings: ComparisonMapping[] = [];
  const mappingPattern =
    /`(\*|[a-f0-9]{12}) -> (NG|[A-Z][A-Z0-9-]*(?:\+[A-Z][A-Z0-9-]*)*)`/g;

  for (const row of rows.slice(2)) {
    const file = row[0]?.replaceAll('`', '');
    const mappingCell = row[1];
    if (!file || !mappingCell) continue;

    for (const match of mappingCell.matchAll(mappingPattern)) {
      mappings.push({
        file,
        key: match[1]!,
        targets: match[2] === 'NG' ? [] : match[2]!.split('+'),
      });
    }
  }

  return mappings;
}

async function collectMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(path)));
      continue;
    }
    if (
      entry.name.endsWith('.md') &&
      (entry.isFile() || entry.isSymbolicLink())
    ) {
      files.push(path);
    }
  }

  return files;
}

async function scanPromptSites(
  repoRoot: string,
  skillRoots: readonly string[],
): Promise<PromptSite[]> {
  const skillsRoot = join(repoRoot, '.agents', 'skills');
  const sites: PromptSite[] = [];

  for (const skillRoot of skillRoots) {
    const root = join(skillsRoot, skillRoot);
    const files = await collectMarkdownFiles(root);
    for (const path of files) {
      const content = await readFile(path, 'utf8');
      let heading = '';
      for (const line of content.split(/\r?\n/)) {
        if (/^#{1,6}\s+/.test(line)) heading = normalizeSiteText(line);
        if (!PROMPT_PATTERN.test(line)) continue;
        sites.push({
          file: relative(skillsRoot, path).replaceAll('\\', '/'),
          key: createSiteKey(line, heading),
          heading,
          text: normalizeSiteText(line),
        });
      }
    }
  }

  return sites;
}

async function inspectInventory(
  repoRoot: string,
  requestedSkillRoots?: readonly string[],
): Promise<InventoryReport> {
  const contract = await readFile(
    join(repoRoot, '.agents', 'docs', 'autonomy-contract.md'),
    'utf8',
  );
  const inventory = parseInventory(contract);
  const skillRoots = requestedSkillRoots ?? inventory.skillRoots;
  const inventoryIds = inventory.ids;
  const mappings = parseComparisonMappings(contract);
  const sites = await scanPromptSites(repoRoot, skillRoots);
  const siteKeys = new Set(sites.map((site) => `${site.file}:${site.key}`));
  const wildcardFiles = new Set(
    mappings
      .filter((mapping) => mapping.key === '*')
      .map((mapping) => mapping.file),
  );
  const mappingKeys = new Set(
    mappings.map((mapping) => `${mapping.file}:${mapping.key}`),
  );

  return {
    invalidMappings: mappings.filter((mapping) =>
      mapping.targets.some((target) => !inventoryIds.has(target)),
    ),
    staleMappings: mappings.filter(
      (mapping) =>
        mapping.key !== '*' && !siteKeys.has(`${mapping.file}:${mapping.key}`),
    ),
    unmappedSites: sites.filter(
      (site) =>
        !wildcardFiles.has(site.file) &&
        !mappingKeys.has(`${site.file}:${site.key}`),
    ),
  };
}

function formatReport(report: InventoryReport): string {
  const lines = ['Autonomy gate-inventory drift detected.'];

  if (report.unmappedSites.length > 0) {
    lines.push('', 'Unmapped prompt sites:');
    for (const site of report.unmappedSites) {
      lines.push(
        `- ${site.file} [site ${site.key}]${site.heading ? ` under "${site.heading}"` : ''}: "${site.text}"`,
        `  Add \`${site.key} -> <GATE-ID>\` or \`${site.key} -> NG\` to the HEAD prompt-site coverage table.`,
      );
    }
  }

  if (report.staleMappings.length > 0) {
    lines.push('', 'Stale HEAD coverage mappings:');
    for (const mapping of report.staleMappings) {
      lines.push(`- ${mapping.file} [site ${mapping.key}]`);
    }
  }

  if (report.invalidMappings.length > 0) {
    lines.push('', 'Mappings with unknown gate IDs:');
    for (const mapping of report.invalidMappings) {
      lines.push(
        `- ${mapping.file} [site ${mapping.key}] -> ${mapping.targets.join('+')}`,
      );
    }
  }

  return lines.join('\n');
}

async function assertInventoryCurrent(
  repoRoot: string,
  skillRoots?: readonly string[],
): Promise<void> {
  const report = await inspectInventory(repoRoot, skillRoots);
  if (
    report.unmappedSites.length > 0 ||
    report.staleMappings.length > 0 ||
    report.invalidMappings.length > 0
  ) {
    throw new Error(formatReport(report));
  }
}

async function writeFixtureContract(
  root: string,
  comparison: string,
): Promise<void> {
  const docsRoot = join(root, '.agents', 'docs');
  await mkdir(docsRoot, { recursive: true });
  await writeFile(
    join(docsRoot, 'autonomy-contract.md'),
    [
      '## Gate inventory',
      '',
      '| ID | Skill | Gate |',
      '| --- | --- | --- |',
      '| NEW-01 | `oat-project-new` | Example gate |',
      '',
      '## HEAD prompt-site coverage',
      '',
      '| Skill root / file | Stable prompt-site mappings |',
      '| --- | --- |',
      `| \`oat-project-new/SKILL.md\` | ${comparison} |`,
      '',
    ].join('\n'),
    'utf8',
  );
}

describe('autonomy gate-inventory drift enforcement', () => {
  it('rejects an unmapped prompt site with actionable stable-key guidance', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-autonomy-inventory-'));
    tempDirs.push(root);
    const skillRoot = join(root, '.agents', 'skills', 'oat-project-new');
    await mkdir(skillRoot, { recursive: true });
    await writeFile(
      join(skillRoot, 'SKILL.md'),
      'Ask the user to confirm the deployment target.\n',
      'utf8',
    );
    await writeFixtureContract(root, '');

    await expect(
      assertInventoryCurrent(root, ['oat-project-new']),
    ).rejects.toThrowError(
      /oat-project-new\/SKILL\.md \[site 49db92f03cb1\][\s\S]*49db92f03cb1 -> <GATE-ID>[\s\S]*49db92f03cb1 -> NG/,
    );
  });

  it('accepts a prompt site mapped to a known inventory gate', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oat-autonomy-inventory-'));
    tempDirs.push(root);
    const prompt = 'Ask the user to confirm the deployment target.';
    const skillRoot = join(root, '.agents', 'skills', 'oat-project-new');
    await mkdir(skillRoot, { recursive: true });
    await writeFile(join(skillRoot, 'SKILL.md'), `${prompt}\n`, 'utf8');
    await writeFixtureContract(root, `\`${createSiteKey(prompt)} -> NEW-01\``);

    await expect(
      assertInventoryCurrent(root, ['oat-project-new']),
    ).resolves.toBeUndefined();
  });

  it('keeps configured exit-gate autonomy policy fail closed', async () => {
    const repoRoot = resolve(process.cwd(), '..', '..');
    const contract = await readFile(
      join(repoRoot, '.agents', 'docs', 'autonomy-contract.md'),
      'utf8',
    );
    const normalized = normalizeSiteText(contract);
    const implementExitGate = parseTable(contract, '## Gate inventory').find(
      (row) => row[0] === 'IMPLEMENT-18',
    );

    expect(normalized).toContain(
      'Configured lifecycle gate `onFailure` policy applies only to a validated, receive-eligible `blocked` envelope after its eligible receive has durably completed',
    );
    expect(normalized).toContain(
      'Operational, validation, correlation, malformed or contradictory envelope, launch, and receive failures are boundary stops regardless of `onFailure`.',
    );
    expect(normalized).toContain(
      'None can continue under `warn` or produce an allowed disposition.',
    );
    expect(implementExitGate?.[4]).toContain(
      'Apply configured failure semantics only to a validated, receive-eligible `blocked` envelope after durable receive',
    );
    expect(implementExitGate?.[4]).toContain(
      'failures stop regardless of `onFailure`, including `warn`',
    );

    for (const path of [
      '.agents/skills/oat-project-implement/references/docs/autonomy-contract.md',
      '.agents/skills/oat-project-quick-start/references/docs/autonomy-contract.md',
      '.agents/skills/oat-project-document/references/docs/autonomy-contract.md',
      '.agents/skills/oat-project-pr-final/references/docs/autonomy-contract.md',
    ]) {
      await expect(readFile(join(repoRoot, path), 'utf8')).resolves.toBe(
        contract,
      );
    }
  });

  it('keeps all sixteen autonomous skill roots mapped at repository HEAD', async () => {
    const repoRoot = resolve(process.cwd(), '..', '..');
    const contract = await readFile(
      join(repoRoot, '.agents', 'docs', 'autonomy-contract.md'),
      'utf8',
    );

    expect(parseInventory(contract).skillRoots).toHaveLength(16);
    await expect(assertInventoryCurrent(repoRoot)).resolves.toBeUndefined();
  });
});
