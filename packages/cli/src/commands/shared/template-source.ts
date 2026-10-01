import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

export type TemplateTier = 'repository' | 'user' | 'bundle';

export interface ResolveTemplateOptions {
  name: string;
  /**
   * Bundled assets root, or a function that returns it. A function is only
   * called when the repository and user tiers both miss, so a caller whose
   * template usually comes from an earlier tier does not need a valid bundle.
   */
  assetsRoot: string | (() => Promise<string>);
  /** Repository template directory, normally `<repo>/.oat/templates`. */
  templatesRoot?: string;
  home?: string;
}

export interface ResolvedTemplate {
  content: string;
  path: string;
  tier: TemplateTier;
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

/**
 * Resolve a template in repository, user, then bundle order
 * (`DR-260927-templates-resolve-repository`).
 */
export async function resolveTemplate(
  options: ResolveTemplateOptions,
): Promise<ResolvedTemplate> {
  if (basename(options.name) !== options.name) {
    throw new Error(`Invalid template name: ${options.name}`);
  }

  // Resolve the same home the installer writes to. `CommandContext.home` is
  // `os.homedir()`, so falling back to `process.env.HOME` would skip the user
  // tier entirely wherever HOME is unset but `homedir()` resolves (Windows
  // derives it from USERPROFILE).
  const home = options.home ?? homedir();
  const candidates: Array<{ path: string; tier: TemplateTier }> = [
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
  ];

  for (const candidate of candidates) {
    const content = await readIfExists(candidate.path);
    if (content !== null) {
      return { ...candidate, content };
    }
  }

  const assetsRoot =
    typeof options.assetsRoot === 'function'
      ? await options.assetsRoot()
      : options.assetsRoot;
  const bundlePath = join(assetsRoot, 'templates', options.name);
  const bundleContent = await readIfExists(bundlePath);
  if (bundleContent !== null) {
    return { content: bundleContent, path: bundlePath, tier: 'bundle' };
  }

  throw new Error(
    `Template ${options.name} was not found in repository, user, or bundled templates.`,
  );
}
