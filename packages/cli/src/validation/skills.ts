import { execFile as execFileCallback } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import {
  getFrontmatterBlock,
  parseSkillFrontmatter,
  resolveSkillVersion,
} from '@commands/shared/frontmatter';

export interface ValidationFinding {
  file: string;
  message: string;
  severity?: 'error' | 'warning';
  code?: string;
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

function referencesProjectArtifactVariable(
  line: string,
  artifactArrays: ReadonlySet<string> = new Set(),
): boolean {
  if (
    /\$PROJECT_PATH|\$\{PROJECT_PATH\}|\{PROJECT_PATH\}|\$ARTIFACT_PATH|\$\{ARTIFACT_PATH\}|\$ACTIVE_PROJECT(?!_PATH)|\$\{ACTIVE_PROJECT\}|\$REVIEW_PATH|\$\{REVIEW_PATH\}|\$\{(?:PROJECT|RETRO)_[A-Z0-9_]*(?:PATHS|FILES)\[@\]\}/.test(
      line,
    )
  ) {
    return true;
  }
  return [...artifactArrays].some((name) => line.includes(`\${${name}[@]}`));
}

function projectArtifactArrays(content: string): Set<string> {
  const arrays = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const { content: line } of logicalLines(content)) {
      const assignment = /^\s*([A-Z][A-Z0-9_]*)(?:\+)?=\((.*)\)\s*$/.exec(line);
      const name = assignment?.[1];
      const value = assignment?.[2];
      if (
        name &&
        value &&
        !arrays.has(name) &&
        referencesProjectArtifactVariable(value, arrays)
      ) {
        arrays.add(name);
        changed = true;
      }
    }
  }
  return arrays;
}

function executesCommand(line: string, command: 'git' | 'oat'): boolean {
  const prefix =
    '(?:(?:&&|\\|\\||;|\\bthen\\b|\\belse\\b|\\bdo\\b|\\bif\\b)\\s+)';
  const modifiers =
    '(?:!\\s+)?(?:command\\s+)?(?:env\\s+)?(?:[A-Z][A-Z0-9_]*=\\S+\\s+)*';
  return new RegExp(
    `^\\s*(?:(?:[A-Z][A-Z0-9_]*)=\\$\\()?${command}\\b|${prefix}${modifiers}${command}\\b`,
  ).test(line);
}

function executesGitCommand(line: string): boolean {
  return executesCommand(line, 'git');
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

function isProjectArtifactWriterLine(
  line: string,
  artifactArrays: ReadonlySet<string> = new Set(),
): boolean {
  const trimmed = line.trim();
  const executesGitOrOat =
    executesGitCommand(trimmed) || executesCommand(trimmed, 'oat');
  const writesProjectArtifact =
    executesGitOrOat &&
    /\bgit\s+(?:add|commit)\b|\boat\s+project\s+push\b/.test(trimmed) &&
    referencesProjectArtifactVariable(line, artifactArrays);
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
  const artifactArrays = projectArtifactArrays(content);
  for (const line of logicalLines(content)) {
    if (isProjectArtifactWriterLine(line.content, artifactArrays)) {
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
  const artifactArrays = projectArtifactArrays(content);
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
      executesCommand(line, 'oat') && /\boat\s+project\s+push\b/.test(line);
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
      referencesProjectArtifactVariable(inspectedLine, artifactArrays) &&
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
    const artifactArrays = projectArtifactArrays(content);
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
        .find((line) => isProjectArtifactWriterLine(line, artifactArrays))
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

function unreadableFrontmatterFinding(file: string): ValidationFinding {
  return {
    file,
    code: 'skill-frontmatter-unreadable',
    severity: 'error',
    message:
      'Frontmatter must be a valid YAML mapping with unique keys (version could not be read)',
  };
}

function pushUniqueFinding(
  findings: ValidationFinding[],
  finding: ValidationFinding,
): void {
  const duplicate = findings.some(
    (existing) =>
      existing.file === finding.file &&
      existing.code === finding.code &&
      existing.message === finding.message,
  );
  if (!duplicate) {
    findings.push(finding);
  }
}

/**
 * A `version` key is present but carries no usable value (empty, or a
 * non-string scalar such as `1.10`, which YAML reads as the number 1.1).
 *
 * This is reported rather than skipped: the value the author wrote is a
 * version OAT cannot read, and letting it resolve to nothing would silently
 * disable both the semver check and bump enforcement for that skill.
 */
function unusableVersionFinding(file: string): ValidationFinding {
  return {
    file,
    code: 'skill-version-unusable',
    severity: 'error',
    message:
      'Frontmatter declares a version that cannot be read; use a quoted semver string (unquoted, version: 1.10 is the number 1.1)',
  };
}

const MISSING_FRONTMATTER_BLOCK_MESSAGE =
  'Missing frontmatter block (--- ... ---)';

/**
 * The file carries no `--- … ---` block at all, so there is no position a
 * version could be declared in.
 *
 * Reported rather than skipped: a changed file with no frontmatter used to
 * fall through the bump gate's `continue`, which meant a canonical skill or
 * agent role could drop its frontmatter and pass the version contract by
 * omission. The structural pass reports the same state for every skill
 * directory, so `pushUniqueFinding` keeps it to one finding per file.
 */
function missingFrontmatterFinding(file: string): ValidationFinding {
  return {
    file,
    code: 'skill-frontmatter-missing',
    severity: 'error',
    message: `${MISSING_FRONTMATTER_BLOCK_MESSAGE}; a changed canonical skill or agent role must declare a version`,
  };
}

/**
 * Frontmatter is present and readable but declares no version anywhere — the
 * `metadata:` map with no `version` child is the shape that made this state
 * common once bundled skills moved off the top-level alias.
 *
 * Distinct from `skill-version-unusable`: there the author wrote a version
 * OAT cannot read, here no version was written at all. Both disable version
 * enforcement, so both are errors.
 */
/**
 * True when some pass already reported that this file has no frontmatter
 * block.
 *
 * The `oat-*` structural loop reports the state with its own long-standing
 * message and no `code`, so `pushUniqueFinding` cannot dedupe it against the
 * coded finding. `validateOatSkills` runs the structural loop, the
 * version-source pass, and (when a `baseRef` is given) the bump collector into
 * one findings array, and all three can see the same file.
 */
function hasMissingFrontmatterReport(
  findings: readonly ValidationFinding[],
  file: string,
): boolean {
  return findings.some(
    (finding) =>
      finding.file === file &&
      (finding.code === 'skill-frontmatter-missing' ||
        finding.message === MISSING_FRONTMATTER_BLOCK_MESSAGE),
  );
}

function missingVersionFinding(file: string): ValidationFinding {
  return {
    file,
    code: 'skill-version-missing',
    severity: 'error',
    message:
      'Frontmatter declares no resolvable version; declare metadata.version (a canonical agent role under .agents/agents may declare a top-level version: instead)',
  };
}

type UncomparableBaseReason =
  | 'unreadable'
  | 'unusable'
  | 'missing-frontmatter'
  | 'missing-version';

const UNCOMPARABLE_BASE_CODES: Record<UncomparableBaseReason, string> = {
  unreadable: 'skill-frontmatter-unreadable',
  unusable: 'skill-version-unusable',
  'missing-frontmatter': 'skill-frontmatter-missing',
  'missing-version': 'skill-version-missing',
};

const UNCOMPARABLE_BASE_REASONS: Record<UncomparableBaseReason, string> = {
  unreadable:
    'the base frontmatter is not a valid YAML mapping with unique keys',
  unusable: 'the base frontmatter declares a version that cannot be read',
  'missing-frontmatter': 'the base file has no frontmatter block (--- ... ---)',
  'missing-version': 'the base frontmatter declares no resolvable version',
};

/**
 * The base side is deliberately asymmetric with the current side: a base that
 * cannot be read is a comparison problem, not a defect in the file the author
 * just changed, so the message says the base cannot be compared rather than
 * accusing the current file.
 */
function uncomparableBaseFinding(
  file: string,
  baseRef: string,
  reason: UncomparableBaseReason,
): ValidationFinding {
  return {
    file,
    code: UNCOMPARABLE_BASE_CODES[reason],
    severity: 'error',
    message: `Changed canonical skill cannot be version-checked against ${baseRef}: ${UNCOMPARABLE_BASE_REASONS[reason]}`,
  };
}

function uncomparableBaseConflictFinding(
  file: string,
  baseRef: string,
  conflict: { metadata: string; topLevel: string },
): ValidationFinding {
  return {
    file,
    code: 'skill-version-conflict',
    severity: 'error',
    message: `Changed canonical skill cannot be version-checked against ${baseRef}: the base frontmatter metadata.version (${conflict.metadata}) and top-level version (${conflict.topLevel}) differ`,
  };
}

function versionConflictFinding(
  file: string,
  conflict: { metadata: string; topLevel: string },
): ValidationFinding {
  return {
    file,
    code: 'skill-version-conflict',
    severity: 'error',
    message: `Frontmatter metadata.version (${conflict.metadata}) and top-level version (${conflict.topLevel}) differ; a conflicting skill has no resolvable version`,
  };
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

const SKILLS_PATH_PREFIX = '.agents/skills/';
const AGENTS_PATH_PREFIX = '.agents/agents/';

/**
 * One versioned file that must bump, together with the diffed paths that made
 * it change.
 *
 * `changedPaths` exists so a scripts-only failure can name what actually
 * changed, and so the identical-content skip can tell "the owning file itself
 * was listed with unchanged bytes" (a rename or mode change, still skipped)
 * from "a sibling changed while `SKILL.md` stood still" (the state clause D
 * exists to catch).
 */
interface ChangedVersionedFile {
  file: string;
  changedPaths: string[];
}

/**
 * Map a diffed path to the versioned files that must bump for it, or an empty
 * list when nothing owns it.
 *
 * Everything a skill directory ships is owned by that skill's `SKILL.md`,
 * because `bundle-assets.sh` copies the directory with `cp -RL` and then
 * removes `tests`. `tests` is therefore the one excluded entry: it does not
 * reach consumers, and demanding a bump for it would train maintainers to bump
 * reflexively. The exclusion matches a plain `tests` path as well as the
 * `tests/` subtree because `rm -rf .../tests` removes either one.
 *
 * A path can map to two files. The previous pathspec was a `*` wildcard
 * between `.agents/skills/` and `SKILL.md`, and a Git pathspec `*` crosses
 * `/`, so it also matched a *nested* `SKILL.md` such as
 * `.agents/skills/foo/references/example/SKILL.md` and validated that file's
 * own version. Mapping such a path only to the outer skill would drop a
 * finding this gate already emitted, which the weaker-anywhere rule forbids.
 * A nested `SKILL.md` therefore maps to itself (preserving the old half
 * exactly) *and* to its owning skill (adding the new coverage).
 */
async function resolveOwningVersionedFiles(
  repoRoot: string,
  changedPath: string,
): Promise<string[]> {
  if (changedPath.startsWith(SKILLS_PATH_PREFIX)) {
    const rest = changedPath.slice(SKILLS_PATH_PREFIX.length);
    const separator = rest.indexOf('/');
    if (separator <= 0) {
      // A file directly under `.agents/skills` belongs to no skill.
      return [];
    }
    const withinSkill = rest.slice(separator + 1);
    if (withinSkill === 'tests' || withinSkill.startsWith('tests/')) {
      // Deliberate, including for a `SKILL.md` nested under `tests/`, which
      // the old wildcard pathspec also matched. Excluding it narrows that
      // pathspec by exactly one shape, and that is the intended trade: a
      // fixture `SKILL.md` under `tests/` is test data, it never reaches a
      // consumer, and demanding a version bump for it is the reflexive
      // bumping the `tests/` boundary exists to prevent. No such file exists
      // in the bundled tree; every `SKILL.md` sits at the skill root.
      return [];
    }

    const candidates = [
      `${SKILLS_PATH_PREFIX}${rest.slice(0, separator)}/SKILL.md`,
    ];
    if (
      changedPath.endsWith('/SKILL.md') &&
      !candidates.includes(changedPath)
    ) {
      candidates.push(changedPath);
    }

    const owners: string[] = [];
    for (const candidate of candidates) {
      // A candidate that is not on disk was removed or renamed away, so there
      // is nothing left to bump and nothing to read.
      if (await isFile(join(repoRoot, candidate))) {
        owners.push(candidate);
      }
    }
    return owners;
  }

  if (changedPath.startsWith(AGENTS_PATH_PREFIX)) {
    const rest = changedPath.slice(AGENTS_PATH_PREFIX.length);
    // Git pathspec `*` crosses `/`, so the nested-directory bound the pathspec
    // implies is enforced here rather than assumed of the pathspec.
    if (rest.length === 0 || rest.includes('/') || !rest.endsWith('.md')) {
      return [];
    }
    return [changedPath];
  }

  return [];
}

/**
 * List the canonical files whose version must move, given everything that
 * changed under `.agents/skills` and `.agents/agents`.
 *
 * The pathspec is deliberately wider than the files that carry a version: a
 * skill's `scripts/` and `references/` ship to every `oat tools install`
 * consumer, so a change to one is a change to that skill even when `SKILL.md`
 * is untouched. Agent roles are diffed for the first time here; per
 * `DR-260908-bundled-skills-declare` they still declare a top-level `version:`
 * and are deliberately not migrated, so the gate accepts either declaration
 * shape rather than demanding `metadata.version` of them.
 */
async function listChangedVersionedFiles(
  repoRoot: string,
  baseRef: string,
  dependencies: ValidateOatSkillsDependencies,
): Promise<ChangedVersionedFile[]> {
  const execFile = dependencies.gitExecFile ?? execFileAsync;
  const { stdout } = await execFile(
    'git',
    [
      'diff',
      '--name-only',
      // NUL-delimited: without `-z`, Git C-quotes any path containing a tab,
      // quote, backslash, or (under the default `core.quotePath`) a non-ASCII
      // byte. The old pathspec only ever produced plain `SKILL.md` paths, but
      // this one lists every shipped file, so a quoted name would no longer
      // match the prefixes below and would silently escape the gate.
      '-z',
      '--diff-filter=ACMR',
      `${baseRef}...HEAD`,
      '--',
      '.agents/skills',
      '.agents/agents/*.md',
    ],
    {
      cwd: repoRoot,
      env: dependencies.env ?? process.env,
    },
  );

  // No trimming: with `-z` each entry is the exact path, and a Git path may
  // legitimately begin or end with a space. The trailing empty entry after the
  // final NUL is what the length filter removes.
  const changedPaths = stdout.split('\0').filter((entry) => entry.length > 0);

  const grouped = new Map<string, string[]>();
  for (const changedPath of changedPaths) {
    const owningFiles = await resolveOwningVersionedFiles(
      repoRoot,
      changedPath,
    );
    for (const owningFile of owningFiles) {
      const owned = grouped.get(owningFile);
      if (owned === undefined) {
        grouped.set(owningFile, [changedPath]);
      } else if (!owned.includes(changedPath)) {
        owned.push(changedPath);
      }
    }
  }

  // Plain code-unit ordering, not `localeCompare`: findings order is part of
  // this command's observable output, and a locale-aware comparison would make
  // it depend on the ICU data of whatever machine ran the gate.
  return [...grouped.entries()]
    .map(([file, owned]) => ({ file, changedPaths: [...owned].sort() }))
    .sort((left, right) =>
      left.file < right.file ? -1 : left.file > right.file ? 1 : 0,
    );
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

/**
 * Name the sibling paths that changed, relative to the owning file's
 * directory, when the owning file itself is not one of them.
 *
 * Without this a scripts-only failure would point at a `SKILL.md` whose bytes
 * the author never touched and say nothing about why it is being asked to
 * bump.
 */
function changedSiblingSuffix(entry: ChangedVersionedFile): string {
  if (entry.changedPaths.includes(entry.file)) {
    return '';
  }
  const directory = entry.file.slice(0, entry.file.lastIndexOf('/') + 1);
  const relativePaths = entry.changedPaths.map((path) =>
    path.startsWith(directory) ? path.slice(directory.length) : path,
  );
  return ` [changed: ${relativePaths.join(', ')}]`;
}

const VERSION_DECLARATION_HINT =
  'declare metadata.version (a canonical agent role under .agents/agents may declare a top-level version: instead)';

async function collectChangedSkillVersionBumpFindings(
  repoRoot: string,
  baseRef: string,
  changedVersionedFiles: readonly ChangedVersionedFile[],
  findings: ValidationFinding[],
  dependencies: ValidateOatSkillsDependencies,
): Promise<void> {
  for (const entry of changedVersionedFiles) {
    const relativeSkillPath = entry.file;
    const skillPath = join(repoRoot, relativeSkillPath);
    const currentContent = await readFile(skillPath, 'utf8');
    const baseContent = await readFileAtGitRef(
      repoRoot,
      baseRef,
      relativeSkillPath,
      dependencies,
    );

    if (baseContent === null) {
      continue;
    }

    // Identical bytes are skipped only when the owning file is the *whole* of
    // what changed — a rename or mode change, which the original skip was
    // written for. When a sibling under the skill directory changed, identical
    // `SKILL.md` bytes are exactly the failure to report: the bundled skill
    // shipped new content under an unchanged version.
    if (
      baseContent === currentContent &&
      entry.changedPaths.length === 1 &&
      entry.changedPaths[0] === relativeSkillPath
    ) {
      continue;
    }

    // Falsy, not `=== null`: `getFrontmatterBlock` returns `""` for an empty
    // `---` / `---` pair and `null` only when there is no pair at all. Both
    // declare nothing, and the pre-existing `oat-*` structural loop already
    // treats them alike, so matching it here keeps one file to one diagnosis.
    const currentBlock = getFrontmatterBlock(currentContent);
    const parsedCurrent = currentBlock
      ? parseSkillFrontmatter(currentBlock)
      : null;
    const baseBlock = getFrontmatterBlock(baseContent);
    const parsedBase = baseBlock ? parseSkillFrontmatter(baseBlock) : null;

    // Every state that leaves this collector without a version comparison now
    // reports. The closed set is: malformed frontmatter, an unusable version
    // declaration, a version conflict, no frontmatter block at all, and
    // frontmatter that declares no version anywhere — on either side. Nothing
    // reaches a silent `continue`, because "no version found, so skip" is the
    // state that let a changed file pass the version contract by omission.
    //
    // The guards below run in a fixed order and the four uncomparable-state
    // guards and the two conflict guards come first, so their specific
    // diagnoses are never masked by the generic missing-block or
    // missing-version message added at the tail. Both sides are guarded,
    // because either one being uncomparable defeats the comparison.
    // `validateOatSkills` runs the structural version-source pass before this
    // collector, so the same file can already carry the current-side finding.
    if (parsedCurrent?.malformed) {
      pushUniqueFinding(findings, unreadableFrontmatterFinding(skillPath));
      continue;
    }
    if (parsedCurrent?.unusableVersionDeclaration) {
      pushUniqueFinding(findings, unusableVersionFinding(skillPath));
      continue;
    }
    if (parsedBase?.malformed) {
      findings.push(uncomparableBaseFinding(skillPath, baseRef, 'unreadable'));
      continue;
    }
    if (parsedBase?.unusableVersionDeclaration) {
      findings.push(uncomparableBaseFinding(skillPath, baseRef, 'unusable'));
      continue;
    }

    const resolvedCurrent =
      parsedCurrent === null ? null : resolveSkillVersion(parsedCurrent);
    const resolvedBase =
      parsedBase === null ? null : resolveSkillVersion(parsedBase);

    // A conflicting skill has no resolvable version, so it cannot be bump
    // checked. `validate-skill-version-bumps.ts` fails the gate on any finding
    // regardless of severity, so the one version-source finding deliberately
    // kept out of this collector is the top-level alias — an error since step
    // 1 of the retirement schedule — which stays in structural validation and
    // never reaches this result.
    if (resolvedCurrent?.conflict) {
      findings.push(
        versionConflictFinding(skillPath, resolvedCurrent.conflict),
      );
      continue;
    }

    // A conflicting base has no single version to compare against either:
    // silently taking its metadata side would accept a downgrade relative to
    // the top-level version the base also declares.
    if (resolvedBase?.conflict) {
      findings.push(
        uncomparableBaseConflictFinding(
          skillPath,
          baseRef,
          resolvedBase.conflict,
        ),
      );
      continue;
    }

    const currentVersion = resolvedCurrent?.version ?? null;
    const baseVersion = resolvedBase?.version ?? null;

    // The current-state defects come before the base-side comparison problems,
    // matching the order the guards above already use, and both come after
    // every specific diagnosis so neither can mask one.
    if (!currentBlock) {
      if (!hasMissingFrontmatterReport(findings, skillPath)) {
        pushUniqueFinding(findings, missingFrontmatterFinding(skillPath));
      }
      continue;
    }

    if (!currentVersion) {
      pushUniqueFinding(findings, missingVersionFinding(skillPath));
      continue;
    }

    if (!baseBlock) {
      findings.push(
        uncomparableBaseFinding(skillPath, baseRef, 'missing-frontmatter'),
      );
      continue;
    }

    if (!baseVersion) {
      findings.push(
        uncomparableBaseFinding(skillPath, baseRef, 'missing-version'),
      );
      continue;
    }

    const changedSuffix = changedSiblingSuffix(entry);

    if (currentVersion === baseVersion) {
      findings.push({
        file: skillPath,
        message: `Changed canonical skill or agent role must bump its version relative to ${baseRef} (still ${currentVersion})${changedSuffix}; ${VERSION_DECLARATION_HINT}`,
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
        message: `Changed canonical skill or agent role version must increase relative to ${baseRef} (base ${baseVersion}, current ${currentVersion})${changedSuffix}; ${VERSION_DECLARATION_HINT}`,
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
  const changedVersionedFiles = await listChangedVersionedFiles(
    repoRoot,
    options.baseRef,
    dependencies,
  );

  await collectChangedSkillVersionBumpFindings(
    repoRoot,
    options.baseRef,
    changedVersionedFiles,
    findings,
    dependencies,
  );

  return {
    // The count is owning files, not diffed paths: a skill whose `scripts/`
    // and `references/` both changed is one file that must bump.
    validatedSkillCount: changedVersionedFiles.length,
    findings,
  };
}

/**
 * Report where each bundled skill keeps its version.
 *
 * This pass deliberately iterates every skill directory, not just `oat-*`:
 * the top-level `version` alias is deprecated across the whole bundle, so a
 * pass that inherited the `oat-*` filter used by the other structural checks
 * could never fire for the 18 non-`oat-*` skills.
 *
 * `skill-version-alias` is an **error**. That is step 1 of the retirement
 * schedule fixed by `DR-260908-bundled-skills-declare`: the deprecated
 * top-level alias becomes blocking in the first validator-changing release
 * after CLI 0.2.65 (0.2.66 shipped without one). The promotion was safe to
 * make because the bundled tree was verified clean immediately before it —
 * `oat internal validate-oat-skills` returned 65 skills and zero findings — so
 * no bundled skill trips it. A corpus case in `skills.test.ts` keeps that
 * true. Step 2, removing the top-level read from
 * `resolveSkillVersion`, is owned by `BL-260908-remove-the-top-level-skill`,
 * must land a release later, and must not be done here: the bump gate now
 * enforces `.agents/agents/*.md`, whose roles still declare the top-level
 * field by design.
 *
 * `skill-version-alias` is never produced by the bump validator, whose wrapper
 * fails on any finding at all regardless of severity. That separation is what
 * keeps a third-party skill that still declares the alias from failing
 * `check:skill-bumps` for a reason unrelated to bumping, and the promotion
 * above does not change it. `skill-version-conflict` is not isolated that way:
 * the bump collector emits it for a current or base conflict, because a
 * conflicting file has no single version to compare.
 */
async function collectSkillVersionSourceFindings(
  skillsRoot: string,
  skillDirs: readonly string[],
  findings: ValidationFinding[],
): Promise<void> {
  for (const dir of skillDirs) {
    const skillPath = join(skillsRoot, dir, 'SKILL.md');
    let content: string;
    try {
      content = await readFile(skillPath, 'utf8');
    } catch {
      // A missing SKILL.md is reported by the structural pass for oat-*
      // skills and is not this pass's concern.
      continue;
    }

    const block = getFrontmatterBlock(content);
    if (!block) {
      // The `oat-*` structural loop above already reports a missing block with
      // its own wording, so only skills it does not cover are reported here.
      // Without this, a non-`oat-*` skill could drop its frontmatter and be
      // reported by neither validator.
      if (!hasMissingFrontmatterReport(findings, skillPath)) {
        pushUniqueFinding(findings, missingFrontmatterFinding(skillPath));
      }
      continue;
    }

    const parsed = parseSkillFrontmatter(block);
    if (parsed.malformed) {
      // Reported for every skill, not just `oat-*` ones: unreadable
      // frontmatter is exactly the state that would otherwise make a version
      // silently unreadable everywhere.
      findings.push(unreadableFrontmatterFinding(skillPath));
      continue;
    }

    // Declaration usability is checked here, before the unresolved bail, so it
    // covers every bundled skill. Inside the `oat-*` loop it could never fire
    // for the 18 skills that are not named `oat-*`, which is how an unusable
    // declaration became invisible to validation.
    if (parsed.unusableVersionDeclaration) {
      findings.push(unusableVersionFinding(skillPath));
      continue;
    }

    const resolved = resolveSkillVersion(parsed);
    if (!resolved) {
      // Readable frontmatter that declares no version at all — a `metadata:`
      // map with no `version` child is the common shape. Skipping it silently
      // disabled the semver check and bump enforcement for that skill.
      pushUniqueFinding(findings, missingVersionFinding(skillPath));
      continue;
    }

    if (resolved.conflict) {
      findings.push(versionConflictFinding(skillPath, resolved.conflict));
      continue;
    }

    if (resolved.source === 'top-level') {
      findings.push({
        file: skillPath,
        code: 'skill-version-alias',
        severity: 'error',
        message: `Frontmatter version ${resolved.version} uses the deprecated top-level alias; move it to metadata.version (metadata.version wins when both are present)`,
      });
    }
  }
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
  const allSkillDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const oatSkillDirs = allSkillDirs.filter((name) => name.startsWith('oat-'));

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
        message: MISSING_FRONTMATTER_BLOCK_MESSAGE,
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

    // Malformed frontmatter and unusable version declarations are reported
    // once, for every skill, by collectSkillVersionSourceFindings; this is the
    // `oat-*` structural rule for a version that does resolve.
    const resolvedVersion = resolveSkillVersion(parseSkillFrontmatter(fm));
    if (resolvedVersion !== null && !isValidSemver(resolvedVersion.version)) {
      findings.push({
        file: skillPath,
        message: 'Frontmatter version must be valid semver (e.g., 1.0.0)',
      });
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

  await collectSkillVersionSourceFindings(skillsRoot, allSkillDirs, findings);

  await collectSyncedSafetyFindings(repoRoot, oatSkillDirs, findings);

  await collectGateabilityFindings(
    skillsRoot,
    options.gateSkillNames,
    findings,
  );

  if (options.baseRef) {
    const changedVersionedFiles = await listChangedVersionedFiles(
      repoRoot,
      options.baseRef,
      dependencies,
    );
    await collectChangedSkillVersionBumpFindings(
      repoRoot,
      options.baseRef,
      changedVersionedFiles,
      findings,
      dependencies,
    );
  }

  return { validatedSkillCount: oatSkillDirs.length, findings };
}
