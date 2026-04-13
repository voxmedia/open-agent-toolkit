import { readFileSync } from 'node:fs';

interface CliPackageJson {
  version?: string;
}

const packageJson = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as CliPackageJson;

export const OAT_VERSION = packageJson.version ?? '0.0.0';
