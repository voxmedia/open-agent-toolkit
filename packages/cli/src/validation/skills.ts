import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

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

function getFrontmatterBlock(content: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/m);
  return match?.[1] ?? null;
}

function frontmatterHasKey(frontmatter: string, key: string): boolean {
  const re = new RegExp(`^${key}:`, 'm');
  return re.test(frontmatter);
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
  }

  return { validatedSkillCount: oatSkillDirs.length, findings };
}
