import { execFile as execFileCallback } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { getFrontmatterBlock } from '@commands/shared/frontmatter';

export interface ValidationFinding {
  file: string;
  message: string;
  severity?: 'error' | 'warning';
}

export interface ValidateOatSkillsResult {
  validatedSkillCount: number;
  findings: ValidationFinding[];
}

export interface ValidateChangedSkillVersionBumpsOptions {
  baseRef: string;
}

export interface ValidateChangedSkillVersionBumpsResult {
  validatedSkillCount: number;
  findings: ValidationFinding[];
}

export interface ValidateOatSkillsOptions {
  baseRef?: string;
  gateSkillNames?: readonly string[];
}

export type ExecFileResult = {
  stdout: string;
  stderr: string;
};

export type ExecFileLike = (
  file: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
) => Promise<ExecFileResult>;

interface ValidateOatSkillsDependencies {
  gitExecFile?: ExecFileLike;
  env?: NodeJS.ProcessEnv;
}

type SyncedBookkeepingKind = 'resolve' | 'arrival' | 'write';

interface SyncedBookkeepingSite {
  file: string;
  anchor: string;
  guard: string;
  kind: SyncedBookkeepingKind;
}

interface ContentSite {
  start: number;
  end: number;
  content: string;
}

interface LogicalLine {
  content: string;
  endLine: number;
  offset: number;
  startLine: number;
}

const execFileAsync = promisify(execFileCallback);

async function isDirectory(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  if (!(await isDirectory(root))) {
    return [];
  }

  const files: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(path)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path);
    }
  }
  return files.sort();
}

function countOccurrences(content: string, anchor: string): number {
  if (anchor.length === 0) {
    return 0;
  }

  let count = 0;
  let offset = 0;
  while ((offset = content.indexOf(anchor, offset)) !== -1) {
    count += 1;
    offset += anchor.length;
  }
  return count;
}

function isLifecycleSafetyFile(file: string): boolean {
  return (
    /\/\.agents\/skills\/(?:oat-project-[^/]+|oat-worktree-[^/]+|oat-brainstorm|oat-wave-execute)\//.test(
      file,
    ) || file.endsWith('/.agents/agents/oat-phase-implementer.md')
  );
}

function referencesProjectArtifactVariable(line: string): boolean {
  return /\$PROJECT_PATH|\$\{PROJECT_PATH\}|\{PROJECT_PATH\}|\$ARTIFACT_PATH|\$\{ARTIFACT_PATH\}|\$ACTIVE_PROJECT(?!_PATH)|\$\{ACTIVE_PROJECT\}|\$REVIEW_PATH|\$\{REVIEW_PATH\}|\$\{(?:PROJECT|RETRO)_[A-Z0-9_]*(?:PATHS|FILES)\[@\]\}/.test(
    line,
  );
}

function executesGitCommand(line: string): boolean {
  return /^\s*(?:(?:[A-Z][A-Z0-9_]*)=\$\()?git\b/.test(line);
}

function logicalLines(content: string): LogicalLine[] {
  const physicalLines = content.split('\n');
  const logical: LogicalLine[] = [];
  let offset = 0;
  for (let index = 0; index < physicalLines.length; index += 1) {
    const startLine = index;
    const startOffset = offset;
    let combined = physicalLines[index] ?? '';
    offset += combined.length + 1;
    while (/\\\s*$/.test(combined) && index + 1 < physicalLines.length) {
      combined = combined.replace(/\\\s*$/, ' ');
      index += 1;
      const continuation = physicalLines[index] ?? '';
      combined += continuation.trimStart();
      offset += continuation.length + 1;
    }
    logical.push({
      content: combined,
      endLine: index,
      offset: startOffset,
      startLine,
    });
  }
  return logical;
}

function isProjectArtifactWriterLine(line: string): boolean {
  const trimmed = line.trim();
  const executesGitOrOat =
    /^(?:[A-Z][A-Z0-9_]*=\$\()?(?:git|oat)\b/.test(trimmed) ||
    /(?:&&|\|\||;|then|else)\s+(?:git|oat)\b/.test(trimmed);
  const writesProjectArtifact =
    executesGitOrOat &&
    /\bgit\s+(?:add|commit)\b|\boat\s+project\s+push\b/.test(trimmed) &&
    referencesProjectArtifactVariable(line);
  const writesActiveProject =
    executesGitOrOat && /\boat\s+config\s+set\s+activeProject\b/.test(trimmed);
  return writesProjectArtifact || writesActiveProject;
}

function fencedContentSites(content: string): ContentSite[] {
  const lines = content.split('\n');
  const sites: ContentSite[] = [];
  let offset = 0;
  let opening: { marker: string; start: number } | null = null;

  for (const line of lines) {
    const lineEnd = offset + line.length;
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})(?:[^`~]*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1] ?? '';
      if (opening === null) {
        opening = { marker, start: offset };
      } else if (
        marker[0] === opening.marker[0] &&
        marker.length >= opening.marker.length &&
        /^\s*[`~]+\s*$/.test(line)
      ) {
        const end = lineEnd;
        sites.push({
          start: opening.start,
          end,
          content: content.slice(opening.start, end),
        });
        opening = null;
      }
    }
    offset = lineEnd + 1;
  }
  return sites;
}

function contentSiteAt(
  content: string,
  offset: number,
  fencedSites: readonly ContentSite[],
): ContentSite {
  const fenced = fencedSites.find(
    (site) => offset >= site.start && offset < site.end,
  );
  if (fenced) return fenced;

  const preceding = content.slice(0, offset);
  const headings = [...preceding.matchAll(/^([#]{1,6})\s+.+$/gm)];
  const heading = headings.at(-1);
  if (heading?.index !== undefined) {
    const level = heading[1]?.length ?? 6;
    const following = content.slice(offset);
    const nextHeading = [...following.matchAll(/^([#]{1,6})\s+.+$/gm)].find(
      (candidate) => (candidate[1]?.length ?? 7) <= level,
    );
    const end =
      nextHeading?.index === undefined
        ? content.length
        : offset + nextHeading.index;
    return {
      start: heading.index,
      end,
      content: content.slice(heading.index, end),
    };
  }

  const start = content.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
  const nextNewline = content.indexOf('\n', offset);
  const end = nextNewline === -1 ? content.length : nextNewline;
  return { start, end, content: content.slice(start, end) };
}

function projectArtifactWriterSites(content: string): ContentSite[] {
  const fencedSites = fencedContentSites(content);
  const sites = new Map<string, ContentSite>();
  for (const line of logicalLines(content)) {
    if (isProjectArtifactWriterLine(line.content)) {
      const site = contentSiteAt(content, line.offset, fencedSites);
      sites.set(`${site.start}:${site.end}`, site);
    }
  }
  return [...sites.values()];
}

function collectSyncedContentFindings(
  file: string,
  content: string,
  findings: ValidationFinding[],
): void {
  for (const match of content.matchAll(
    /PROJECT_SCOPE=\$\(oat project scope[^\n]+\) \|\| exit 1\n\s*\[\s*"?\$PROJECT_SCOPE"?\s*=\s*"?synced"?\s*\]\s*&&\s*oat\s+project\s+pull\b/g,
  )) {
    const lineNumber = content.slice(0, match.index).split('\n').length + 1;
    findings.push({
      file,
      message: `Line ${lineNumber}: Synced arrival pull must use an if block so shared and local arrival exits successfully`,
    });
  }

  const logical = logicalLines(content);
  for (const [logicalIndex, site] of logical.entries()) {
    const line = site.content;
    const lineNumber = site.startLine + 1;

    if (/\bgit\s+add\b[^\n]*\.oat\/projects\/synced(?:\/|\b)/.test(line)) {
      findings.push({
        file,
        message: `Line ${lineNumber}: Never stage a path under .oat/projects/synced/; use oat project push`,
      });
    }

    if (
      /\boat\s+project\s+scope\b/.test(line) &&
      (/--json\b/.test(line) || /\|[^\n]*\bjq\b/.test(line))
    ) {
      findings.push({
        file,
        message: `Line ${lineNumber}: Resolve project scope with --format value; do not parse --json or pipe into jq`,
      });
    }

    if (
      isLifecycleSafetyFile(file) &&
      executesGitCommand(line) &&
      /\bgit\s+add\s+-A(?:\s*$|\s*[;&|])/.test(line)
    ) {
      findings.push({
        file,
        message: `Line ${lineNumber}: Project-artifact staging must use exact pathspecs; broad git add -A is forbidden`,
      });
    }
    if (
      isLifecycleSafetyFile(file) &&
      executesGitCommand(line) &&
      /\bgit\s+add\b/.test(line) &&
      /(?:\$PROJECT_PATH|\$\{PROJECT_PATH\})(?:\/?(?:\*|\*\*)?)?(?:["'}\s]|$)/.test(
        line,
      ) &&
      !/\$PROJECT_PATH\/[A-Za-z0-9_.-]+|\$\{PROJECT_PATH\}\/[A-Za-z0-9_.-]+/.test(
        line,
      )
    ) {
      findings.push({
        file,
        message: `Line ${lineNumber}: Project-artifact staging must name exact files, not the project directory or a glob`,
      });
    }

    const pushReceipt =
      /^\s*([A-Z][A-Z0-9_]*)=\$\(oat project push\b[^\n]*--json\b/.exec(line);
    if (pushReceipt) {
      const outputVariable = pushReceipt[1] ?? '';
      const validationLines = logical
        .slice(logicalIndex + 1, logicalIndex + 5)
        .map((candidate) => candidate.content);
      const parserNeedle = `parse_synced_push_receipt "$${outputVariable}"`;
      const parserOffset = validationLines.findIndex((candidate) =>
        candidate.includes(parserNeedle),
      );
      if (parserOffset === -1) {
        findings.push({
          file,
          message: `Line ${lineNumber}: Synced push JSON receipt must validate status as pushed or up-to-date and require a full SHA before use`,
        });
      } else {
        for (const [offset, candidate] of validationLines
          .slice(0, parserOffset)
          .entries()) {
          if (
            candidate.includes(`$${outputVariable}`) &&
            /(?:\.sha\b|\[['"]sha['"]\])/.test(candidate)
          ) {
            findings.push({
              file,
              message: `Line ${lineNumber + offset + 1}: Synced push JSON receipt must not extract or use .sha before parse_synced_push_receipt validation`,
            });
          }
        }
      }
    }

    if (
      /\boat\s+project\s+scope\b/.test(line) &&
      /\|\|\s*echo\s+["']?shared\b/.test(line)
    ) {
      findings.push({
        file,
        message: `Line ${lineNumber}: Project scope resolution must fail closed; do not fall back to shared`,
      });
    }

    const isPushCommand =
      /^\s*(?:[A-Z][A-Z0-9_]*=\$\()?oat\s+project\s+push\b/.test(line);
    const pushFailureHandled =
      /\|\|\s*(?:\{|exit\b)/.test(line) ||
      ((line.match(/"/g)?.length ?? 0) % 2 === 1 &&
        logical
          .slice(logicalIndex + 1, logicalIndex + 16)
          .some((candidate) =>
            /"\s*\|\|\s*(?:\{|exit\b)/.test(candidate.content),
          ));
    if (isPushCommand && !pushFailureHandled) {
      findings.push({
        file,
        message: `Line ${lineNumber}: Project push must handle a nonzero exit explicitly and stop bookkeeping`,
      });
    }
  }

  const lines = content.split('\n');
  const logicalByStart = new Map(
    logical.map((line) => [line.startLine, line.content] as const),
  );
  const continuedLines = new Set(
    logical.flatMap((line) =>
      Array.from(
        { length: line.endLine - line.startLine },
        (_, offset) => line.startLine + offset + 1,
      ),
    ),
  );
  let fenceMarker: string | null = null;
  let scopeGuardSeen = false;

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})(?:[^`~]*)$/);

    if (fenceMatch) {
      const marker = fenceMatch[1] ?? '';
      if (fenceMarker === null) {
        fenceMarker = marker;
        scopeGuardSeen = false;
      } else if (
        marker[0] === fenceMarker[0] &&
        marker.length >= fenceMarker.length &&
        /^\s*[`~]+\s*$/.test(line)
      ) {
        fenceMarker = null;
        scopeGuardSeen = false;
      }
      continue;
    }

    if (continuedLines.has(index)) continue;
    const inspectedLine = logicalByStart.get(index) ?? line;

    if (fenceMarker === null || !isLifecycleSafetyFile(file)) {
      continue;
    }

    if (
      /\boat\s+project\s+scope\b/.test(inspectedLine) &&
      /--format\s+value\b/.test(inspectedLine)
    ) {
      scopeGuardSeen = true;
    }
    if (
      /\bPROJECT_SCOPE\b/.test(inspectedLine) &&
      /\bsynced\b/.test(inspectedLine)
    ) {
      scopeGuardSeen = true;
    }

    if (
      /\bgit\s+(?:add|commit)\b/.test(inspectedLine) &&
      referencesProjectArtifactVariable(inspectedLine) &&
      !scopeGuardSeen
    ) {
      findings.push({
        file,
        message: `Line ${lineNumber}: Project-artifact git writes require an oat project scope --format value guard earlier in the same fenced block`,
      });
    }
  }
}

async function collectSyncedBookkeepingInventoryFindings(
  repoRoot: string,
  safetyFiles: readonly string[],
  findings: ValidationFinding[],
): Promise<void> {
  const inventoryPath = join(
    repoRoot,
    'packages',
    'cli',
    'src',
    'validation',
    'synced-bookkeeping-sites.json',
  );
  if (!(await isFile(inventoryPath))) {
    return;
  }

  let sites: SyncedBookkeepingSite[];
  try {
    const parsed = JSON.parse(await readFile(inventoryPath, 'utf8')) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('expected a JSON array');
    }
    sites = parsed as SyncedBookkeepingSite[];
  } catch (error) {
    findings.push({
      file: inventoryPath,
      message: `Invalid synced-bookkeeping inventory: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }

  const inventoriedWriterSites = new Map<string, ContentSite[]>();
  for (const site of sites) {
    if (
      typeof site?.file !== 'string' ||
      typeof site?.anchor !== 'string' ||
      typeof site?.guard !== 'string' ||
      !['resolve', 'arrival', 'write'].includes(site?.kind)
    ) {
      findings.push({
        file: inventoryPath,
        message:
          'Each synced-bookkeeping inventory entry requires file, unique anchor, companion guard, and kind (resolve | arrival | write)',
      });
      continue;
    }

    const sitePath = join(repoRoot, site.file);
    let content: string;
    try {
      content = await readFile(sitePath, 'utf8');
    } catch {
      findings.push({
        file: inventoryPath,
        message: `Missing synced-bookkeeping inventory file: ${sitePath}`,
      });
      continue;
    }

    const occurrences = countOccurrences(content, site.anchor);
    if (occurrences === 0) {
      findings.push({
        file: inventoryPath,
        message: `Stale synced-bookkeeping inventory anchor in ${sitePath}: ${site.anchor}`,
      });
    } else if (occurrences > 1) {
      findings.push({
        file: inventoryPath,
        message: `Synced-bookkeeping inventory anchor is not unique in ${sitePath}: ${site.anchor}`,
      });
    }

    if (occurrences === 1) {
      const fencedSites = fencedContentSites(content);
      const anchorOffset = content.indexOf(site.anchor);
      const anchorSite = contentSiteAt(content, anchorOffset, fencedSites);
      const companionGuardPresent =
        site.kind === 'write' && site.guard === 'project-scope'
          ? /\boat\s+project\s+scope\b[^\n]*--format\s+value\b|\bPROJECT_SCOPE\b[^\n]*\bsynced\b/.test(
              anchorSite.content,
            )
          : site.kind === 'arrival' && site.guard === 'materialized-arrival'
            ? /\boat\s+project\s+pull\b|pulled and materialized/i.test(
                anchorSite.content,
              )
            : site.kind === 'resolve' && site.guard === 'canonical-resolution'
              ? /\bresolve(?:Project|NamedProject|SyncedTarget|ProjectScope|ActiveProject)\b|\bprojectScope\s*===\s*['"]synced['"]|options\.remote[^\n]*synced|\boat\s+project\s+new\b[^\n]*--scope\b|project:synced_tracked_artifacts|\boat\s+config\s+get\s+activeProject\b/.test(
                  anchorSite.content,
                )
              : anchorSite.content.includes(site.guard);
      if (!companionGuardPresent) {
        findings.push({
          file: inventoryPath,
          message: `Synced-bookkeeping ${site.kind} site lacks its companion guard in the same function or fenced block: ${sitePath}: ${site.anchor}`,
        });
      }

      if (site.kind === 'write') {
        const fileSites = inventoriedWriterSites.get(sitePath) ?? [];
        fileSites.push(anchorSite);
        inventoriedWriterSites.set(sitePath, fileSites);
      }
    }
  }

  for (const file of safetyFiles) {
    const content = await readFile(file, 'utf8');
    if (!isLifecycleSafetyFile(file)) continue;

    const inventoriedSites = inventoriedWriterSites.get(file) ?? [];
    const writerSites = projectArtifactWriterSites(content);
    if (writerSites.length > 0 && inventoriedSites.length === 0) {
      findings.push({
        file: inventoryPath,
        message: `Lifecycle project-artifact writer is missing from synced-bookkeeping inventory: ${file}`,
      });
      continue;
    }
    for (const writerSite of writerSites) {
      if (
        inventoriedSites.some(
          (site) =>
            site.start === writerSite.start && site.end === writerSite.end,
        )
      ) {
        continue;
      }
      const writer = writerSite.content
        .split('\n')
        .find(isProjectArtifactWriterLine)
        ?.trim();
      findings.push({
        file: inventoryPath,
        message: `Lifecycle project-artifact writer site is missing from synced-bookkeeping inventory: ${file}: ${writer ?? '(unknown writer)'}`,
      });
    }
  }
}

async function collectSyncedSafetyFindings(
  repoRoot: string,
  oatSkillDirs: readonly string[],
  findings: ValidationFinding[],
): Promise<void> {
  const skillFiles = (
    await Promise.all(
      oatSkillDirs.map((dir) =>
        listMarkdownFiles(join(repoRoot, '.agents', 'skills', dir)),
      ),
    )
  ).flat();
  const phaseImplementerPath = join(
    repoRoot,
    '.agents',
    'agents',
    'oat-phase-implementer.md',
  );
  const safetyFiles = (await isFile(phaseImplementerPath))
    ? [...skillFiles, phaseImplementerPath]
    : skillFiles;

  for (const file of safetyFiles) {
    collectSyncedContentFindings(file, await readFile(file, 'utf8'), findings);
  }
  await collectSyncedBookkeepingInventoryFindings(
    repoRoot,
    safetyFiles,
    findings,
  );
}

function frontmatterHasKey(frontmatter: string, key: string): boolean {
  const re = new RegExp(`^${key}:`, 'm');
  return re.test(frontmatter);
}

function getFrontmatterScalar(frontmatter: string, key: string): string | null {
  const re = new RegExp(`^${key}:\\s*(.*)$`, 'm');
  const match = frontmatter.match(re);
  return match?.[1]?.trim() ?? null;
}

function hasTrueFrontmatterValue(frontmatter: string, key: string): boolean {
  return (
    frontmatterHasKey(frontmatter, key) &&
    getFrontmatterScalar(frontmatter, key) === 'true'
  );
}

function isValidSemver(value: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(value);
}

function compareSemver(left: string, right: string): number {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);

  for (let index = 0; index < 3; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function hasProgressIndicatorsSection(content: string): boolean {
  return /^## Progress Indicators \(User-Facing\)\s*$/m.test(content);
}

function hasBannerSnippet(content: string): boolean {
  return (
    /OAT ▸/m.test(content) &&
    /━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━/m.test(content)
  );
}

function validateQuickStartSemantics(
  skillPath: string,
  content: string,
  findings: ValidationFinding[],
): void {
  // Keep these checks intent-based rather than tied to one exact sentence so
  // small wording edits in the skill do not create false validation failures.
  const mentionsDiscovery = /`?discovery\.md`?/i.test(content);
  const mentionsSessionContext =
    /(session context|current conversation|current session|existing context)/i.test(
      content,
    );
  const mentionsDiscoverySynthesis =
    /(synthesi(?:ze|s)|populate|draft|create)/i.test(content);
  const mentionsEnoughExistingDetail =
    /(enough detail|sufficient detail|detail already exists|already available)/i.test(
      content,
    );

  if (
    !(
      mentionsDiscovery &&
      mentionsSessionContext &&
      mentionsDiscoverySynthesis &&
      mentionsEnoughExistingDetail
    )
  ) {
    findings.push({
      file: skillPath,
      message:
        'Quick-start must describe synthesizing discovery.md from session context when enough detail is already available',
    });
  }

  if (
    !(
      mentionsDiscovery &&
      /(backfill(?:s|ing)?|record|capture|reflect)/i.test(content) &&
      /(discussion|q&a|questions|answers|decisions|options considered)/i.test(
        content,
      ) &&
      /(before planning|before finalizing .*plan\.md|before writing .*plan\.md)/i.test(
        content,
      )
    )
  ) {
    findings.push({
      file: skillPath,
      message:
        'Quick-start must describe backfilling discovery.md after startup Q&A before planning',
    });
  }

  if (
    !(
      /(?:ask|only ask)/i.test(content) &&
      /(minimum|minimum additional|minimum follow-up)/i.test(content) &&
      /questions?/i.test(content) &&
      /(remove blockers|resolve blockers|unblock planning)/i.test(content)
    )
  ) {
    findings.push({
      file: skillPath,
      message:
        'Quick-start must limit follow-up questions to the minimum needed to remove blockers',
    });
  }

  if (
    !(
      /(project description|project brief)/i.test(content) &&
      /(project name alone|bare .*project-name|only a bare .*project-name)/i.test(
        content,
      ) &&
      /(ask the user|ask for)/i.test(content) &&
      /(do not infer requirements from the project name alone|not enough context to start discovery)/i.test(
        content,
      )
    )
  ) {
    findings.push({
      file: skillPath,
      message:
        'Quick-start must treat a bare project name as insufficient input, ask for a project description, and avoid inferring scope from the repo',
    });
  }
}

function normalizeGateSkillNames(
  gateSkillNames: readonly string[] | undefined,
): string[] {
  if (!gateSkillNames) {
    return [];
  }

  return [
    ...new Set(gateSkillNames.map((name) => name.trim()).filter(Boolean)),
  ].sort();
}

async function collectGateabilityFindings(
  skillsRoot: string,
  gateSkillNames: readonly string[] | undefined,
  findings: ValidationFinding[],
): Promise<void> {
  for (const skillName of normalizeGateSkillNames(gateSkillNames)) {
    const skillPath = join(skillsRoot, skillName, 'SKILL.md');
    let content: string;
    try {
      content = await readFile(skillPath, 'utf8');
    } catch {
      findings.push({
        file: skillPath,
        message: `Configured gate targets unknown skill: ${skillName}`,
        severity: 'warning',
      });
      continue;
    }

    const frontmatter = getFrontmatterBlock(content);
    if (
      frontmatter === null ||
      !hasTrueFrontmatterValue(frontmatter, 'oat_gateable')
    ) {
      findings.push({
        file: skillPath,
        message: 'Configured gate targets skill without oat_gateable: true',
        severity: 'warning',
      });
    }
  }
}

async function listChangedSkillFiles(
  repoRoot: string,
  baseRef: string,
  dependencies: ValidateOatSkillsDependencies,
): Promise<string[]> {
  const execFile = dependencies.gitExecFile ?? execFileAsync;
  const { stdout } = await execFile(
    'git',
    [
      'diff',
      '--name-only',
      '--diff-filter=ACMR',
      `${baseRef}...HEAD`,
      '--',
      '.agents/skills/*/SKILL.md',
    ],
    {
      cwd: repoRoot,
      env: dependencies.env ?? process.env,
    },
  );

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function readFileAtGitRef(
  repoRoot: string,
  ref: string,
  filePath: string,
  dependencies: ValidateOatSkillsDependencies,
): Promise<string | null> {
  const execFile = dependencies.gitExecFile ?? execFileAsync;

  try {
    const { stdout } = await execFile('git', ['show', `${ref}:${filePath}`], {
      cwd: repoRoot,
      env: dependencies.env ?? process.env,
    });
    return stdout;
  } catch {
    return null;
  }
}

async function collectChangedSkillVersionBumpFindings(
  repoRoot: string,
  baseRef: string,
  changedSkillFiles: readonly string[],
  findings: ValidationFinding[],
  dependencies: ValidateOatSkillsDependencies,
): Promise<void> {
  for (const relativeSkillPath of changedSkillFiles) {
    const skillPath = join(repoRoot, relativeSkillPath);
    const currentContent = await readFile(skillPath, 'utf8');
    const baseContent = await readFileAtGitRef(
      repoRoot,
      baseRef,
      relativeSkillPath,
      dependencies,
    );

    if (baseContent === null || baseContent === currentContent) {
      continue;
    }

    const currentFrontmatter = getFrontmatterBlock(currentContent);
    const baseFrontmatter = getFrontmatterBlock(baseContent);
    const currentVersion = currentFrontmatter
      ? getFrontmatterScalar(currentFrontmatter, 'version')
      : null;
    const baseVersion = baseFrontmatter
      ? getFrontmatterScalar(baseFrontmatter, 'version')
      : null;

    if (!currentVersion || !baseVersion) {
      continue;
    }

    if (currentVersion === baseVersion) {
      findings.push({
        file: skillPath,
        message: `Changed canonical skill must bump frontmatter version relative to ${baseRef} (still ${currentVersion})`,
      });
      continue;
    }

    if (
      isValidSemver(currentVersion) &&
      isValidSemver(baseVersion) &&
      compareSemver(currentVersion, baseVersion) <= 0
    ) {
      findings.push({
        file: skillPath,
        message: `Changed canonical skill version must increase relative to ${baseRef} (base ${baseVersion}, current ${currentVersion})`,
      });
    }
  }
}

export async function validateChangedSkillVersionBumps(
  repoRoot: string,
  options: ValidateChangedSkillVersionBumpsOptions,
  dependencies: ValidateOatSkillsDependencies = {},
): Promise<ValidateChangedSkillVersionBumpsResult> {
  const findings: ValidationFinding[] = [];
  const changedSkillFiles = await listChangedSkillFiles(
    repoRoot,
    options.baseRef,
    dependencies,
  );

  await collectChangedSkillVersionBumpFindings(
    repoRoot,
    options.baseRef,
    changedSkillFiles,
    findings,
    dependencies,
  );

  return {
    validatedSkillCount: changedSkillFiles.length,
    findings,
  };
}

export async function validateOatSkills(
  repoRoot: string,
  options: ValidateOatSkillsOptions = {},
  dependencies: ValidateOatSkillsDependencies = {},
): Promise<ValidateOatSkillsResult> {
  const skillsRoot = join(repoRoot, '.agents', 'skills');
  const findings: ValidationFinding[] = [];

  if (!(await isDirectory(skillsRoot))) {
    throw new Error(`skills directory not found: ${skillsRoot}`);
  }

  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const oatSkillDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('oat-'))
    .map((entry) => entry.name)
    .sort();

  for (const dir of oatSkillDirs) {
    const skillPath = join(skillsRoot, dir, 'SKILL.md');
    let content: string;
    try {
      content = await readFile(skillPath, 'utf8');
    } catch {
      findings.push({ file: skillPath, message: 'Missing SKILL.md' });
      continue;
    }

    const fm = getFrontmatterBlock(content);
    if (!fm) {
      findings.push({
        file: skillPath,
        message: 'Missing frontmatter block (--- ... ---)',
      });
      continue;
    }

    for (const key of [
      'name',
      'description',
      'disable-model-invocation',
      'user-invocable',
      'allowed-tools',
    ]) {
      if (!frontmatterHasKey(fm, key)) {
        findings.push({
          file: skillPath,
          message: `Missing frontmatter key: ${key}`,
        });
      }
    }

    const frontmatterName = getFrontmatterScalar(fm, 'name');
    if (frontmatterName && frontmatterName !== dir) {
      findings.push({
        file: skillPath,
        message: `Frontmatter name must match directory name (expected: ${dir}, found: ${frontmatterName})`,
      });
    }

    const frontmatterDescription = getFrontmatterScalar(fm, 'description');
    if (frontmatterDescription) {
      if (/^[>|]/.test(frontmatterDescription)) {
        findings.push({
          file: skillPath,
          message: 'Frontmatter description must be a single-line scalar',
        });
      } else {
        if (!/^(Use|Run|Trigger) when\b/.test(frontmatterDescription)) {
          findings.push({
            file: skillPath,
            message:
              'Frontmatter description must start with one of: "Use when", "Run when", "Trigger when"',
          });
        }
        if (frontmatterDescription.length > 500) {
          findings.push({
            file: skillPath,
            message: `Frontmatter description exceeds 500 characters (${frontmatterDescription.length})`,
          });
        }
      }
    }

    if (frontmatterHasKey(fm, 'version')) {
      const version = getFrontmatterScalar(fm, 'version') ?? '';
      if (!isValidSemver(version)) {
        findings.push({
          file: skillPath,
          message: 'Frontmatter version must be valid semver (e.g., 1.0.0)',
        });
      }
    }

    if (!hasProgressIndicatorsSection(content)) {
      findings.push({
        file: skillPath,
        message:
          'Missing section heading: ## Progress Indicators (User-Facing)',
      });
    } else if (!hasBannerSnippet(content)) {
      findings.push({
        file: skillPath,
        message:
          'Progress Indicators section missing banner snippet (separator lines + "OAT ▸ ...")',
      });
    }

    if (dir === 'oat-project-quick-start') {
      validateQuickStartSemantics(skillPath, content, findings);
    }
  }

  await collectSyncedSafetyFindings(repoRoot, oatSkillDirs, findings);

  await collectGateabilityFindings(
    skillsRoot,
    options.gateSkillNames,
    findings,
  );

  if (options.baseRef) {
    const changedSkillFiles = await listChangedSkillFiles(
      repoRoot,
      options.baseRef,
      dependencies,
    );
    await collectChangedSkillVersionBumpFindings(
      repoRoot,
      options.baseRef,
      changedSkillFiles,
      findings,
      dependencies,
    );
  }

  return { validatedSkillCount: oatSkillDirs.length, findings };
}
