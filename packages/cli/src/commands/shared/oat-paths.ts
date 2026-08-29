import { readOatConfig, type OatConfig } from '@config/oat-config';

type OatConfigReader = (repoRoot: string) => Promise<OatConfig>;

export async function resolveProjectsRoot(
  repoRoot: string,
  env: NodeJS.ProcessEnv,
  readConfig: OatConfigReader = readOatConfig,
): Promise<string> {
  const envRoot = env.OAT_PROJECTS_ROOT?.trim();
  if (envRoot) {
    return envRoot.replace(/\/+$/, '');
  }

  const config = await readConfig(repoRoot);
  const configRoot = config.projects?.root?.trim();
  if (configRoot) {
    return configRoot.replace(/\/+$/, '');
  }

  return '.oat/projects/shared';
}
