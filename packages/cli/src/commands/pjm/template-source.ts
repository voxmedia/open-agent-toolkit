import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

export type PjmTemplateTier = 'repository' | 'user' | 'bundle';

export interface ResolvePjmTemplateOptions {
  name: string;
  assetsRoot: string;
  templatesRoot?: string;
  home?: string;
}

export interface ResolvedPjmTemplate {
  content: string;
  path: string;
  tier: PjmTemplateTier;
}

async function readIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return null;
    }
    throw error;
  }
}

export async function resolvePjmTemplate(
  options: ResolvePjmTemplateOptions,
): Promise<ResolvedPjmTemplate> {
  if (basename(options.name) !== options.name) {
    throw new Error(`Invalid PJM template name: ${options.name}`);
  }

  // Resolve the same home the installer writes to. `CommandContext.home` is
  // `os.homedir()`, so falling back to `process.env.HOME` would skip the user
  // tier entirely wherever HOME is unset but `homedir()` resolves (Windows
  // derives it from USERPROFILE).
  const home = options.home ?? homedir();
  const candidates: Array<{ path: string; tier: PjmTemplateTier }> = [
    ...(options.templatesRoot
      ? [
          {
            path: join(options.templatesRoot, options.name),
            tier: 'repository' as const,
          },
        ]
      : []),
    ...(home
      ? [
          {
            path: join(home, '.oat', 'templates', options.name),
            tier: 'user' as const,
          },
        ]
      : []),
    {
      path: join(options.assetsRoot, 'templates', options.name),
      tier: 'bundle',
    },
  ];

  for (const candidate of candidates) {
    const content = await readIfExists(candidate.path);
    if (content !== null) {
      return { ...candidate, content };
    }
  }

  throw new Error(
    `Template ${options.name} was not found in repository, user, or bundled PJM templates.`,
  );
}
