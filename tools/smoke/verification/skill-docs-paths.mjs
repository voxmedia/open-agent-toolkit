import { access, readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const executableExtensions = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.mts',
  '.cts',
  '.tsx',
]);

async function executableFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await executableFiles(path)));
    else if (entry.isFile() && executableExtensions.has(extname(path)))
      files.push(path);
  }
  return files;
}

/** Check literal repo docs-page references in executable skill tests/helpers.
 * Historical Markdown/JSON fixture prose and computed paths are not evaluated.
 */
export async function findStaleSkillDocsPaths(repositoryRoot) {
  const skillsRoot = join(repositoryRoot, '.agents/skills');
  const stale = [];
  for (const skill of await readdir(skillsRoot, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const testsRoot = join(skillsRoot, skill.name, 'tests');
    try {
      await access(testsRoot);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    for (const file of await executableFiles(testsRoot)) {
      const content = await readFile(file, 'utf8');
      // Relative prefixes (../../) may precede the repository docs path.
      for (const match of content.matchAll(
        /apps\/oat-docs\/docs\/[\w./-]+\.mdx?\b/gu,
      )) {
        const docsPath = match[0];
        try {
          await access(join(repositoryRoot, docsPath));
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
          stale.push({
            testPath: relative(repositoryRoot, file),
            line: content.slice(0, match.index).split('\n').length,
            docsPath,
          });
        }
      }
    }
  }
  return stale.sort(
    (a, b) => a.testPath.localeCompare(b.testPath) || a.line - b.line,
  );
}
