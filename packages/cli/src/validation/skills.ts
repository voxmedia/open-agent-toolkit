import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';

export interface ValidationFinding {
  file: string;
  message: string;
}

export interface ValidateOatSkillsResult {
  validatedSkillCount: number;
  findings: ValidationFinding[];
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
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

function isValidSemver(value: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(value);
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
}

export async function validateOatSkills(
  repoRoot: string,
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

  return { validatedSkillCount: oatSkillDirs.length, findings };
}
