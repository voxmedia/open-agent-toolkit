export function parseVersion(version: string | null): [number, number, number] {
  if (!version) {
    return [0, 0, 0];
  }

  const parts = version.split('.');
  if (parts.length !== 3) {
    return [0, 0, 0];
  }

  const parsed = parts.map((part) => Number.parseInt(part, 10));
  if (parsed.some((part) => Number.isNaN(part) || part < 0)) {
    return [0, 0, 0];
  }

  return [parsed[0]!, parsed[1]!, parsed[2]!];
}

export function compareVersions(
  installed: string | null,
  bundled: string | null,
): 'outdated' | 'current' | 'newer' {
  const installedParts = parseVersion(installed);
  const bundledParts = parseVersion(bundled);

  for (let index = 0; index < 3; index += 1) {
    if (bundledParts[index]! > installedParts[index]!) {
      return 'outdated';
    }
    if (bundledParts[index]! < installedParts[index]!) {
      return 'newer';
    }
  }

  return 'current';
}
