import { readOatConfig } from '@config/oat-config';

export async function resolveProjectsRoot(
  repoRoot: string,
  env: NodeJS.ProcessEnv,
): Promise<string> {
  const envRoot = env.OAT_PROJECTS_ROOT?.trim();
  if (envRoot) {
    return envRoot.replace(/\/+$/, '');
  }

  const config = await readOatConfig(repoRoot);
  const configRoot = config.projects?.root?.trim();
  if (configRoot) {
    return configRoot.replace(/\/+$/, '');
  }

  return '.oat/projects/shared';
}
