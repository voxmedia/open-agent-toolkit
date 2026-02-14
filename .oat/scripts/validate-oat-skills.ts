#!/usr/bin/env tsx

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { cwd, exit } from 'node:process';

type Finding = {
  file: string;
  message: string;
};

async function isDir(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function readText(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

function getFrontmatterBlock(content: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/m);
  return match?.[1] ?? null;
}

function frontmatterHasKey(frontmatter: string, key: string): boolean {
  const re = new RegExp(`^${key}:`, 'm');
  return re.test(frontmatter);
}

function fileHasProgressIndicatorsSection(content: string): boolean {
  return /^## Progress Indicators \(User-Facing\)\s*$/m.test(content);
}

function fileHasBannerSnippet(content: string): boolean {
  return (
    /OAT ▸/m.test(content) &&
    /━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━/m.test(content)
  );
}

async function main(): Promise<void> {
  const repoRoot = cwd();
  const skillsRoot = join(repoRoot, '.agents', 'skills');

  const findings: Finding[] = [];

  if (!(await isDir(skillsRoot))) {
    console.error(`Error: skills directory not found: ${skillsRoot}`);
    exit(2);
  }

  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const oatSkillDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith('oat-'))
    .map((e) => e.name)
    .sort();

  if (oatSkillDirs.length === 0) {
    console.error('Error: no oat-* skills found under .agents/skills/');
    exit(2);
  }

  for (const dir of oatSkillDirs) {
    const skillPath = join(skillsRoot, dir, 'SKILL.md');
    let content: string;
    try {
      content = await readText(skillPath);
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

    if (!fileHasProgressIndicatorsSection(content)) {
      findings.push({
        file: skillPath,
        message:
          'Missing section heading: ## Progress Indicators (User-Facing)',
      });
    } else if (!fileHasBannerSnippet(content)) {
      findings.push({
        file: skillPath,
        message:
          'Progress Indicators section missing banner snippet (separator lines + "OAT ▸ ...")',
      });
    }
  }

  if (findings.length > 0) {
    console.error('OAT skill validation failed:\n');
    for (const f of findings) {
      console.error(`- ${f.file}: ${f.message}`);
    }
    console.error(
      '\nFix the issues above, then re-run: pnpm oat:validate-skills',
    );
    exit(1);
  }

  console.log(`OK: validated ${oatSkillDirs.length} oat-* skills`);
}

main().catch((err) => {
  console.error(String(err instanceof Error ? err.message : err));
  exit(2);
});
