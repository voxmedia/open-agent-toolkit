import type { PathMapping } from '@providers/shared/adapter.types';

export function canonicalRuleNameForProviderEntry(
  providerEntryName: string,
  mapping?: Pick<PathMapping, 'contentType' | 'providerExtension'>,
): string {
  const providerExtension =
    mapping?.contentType === 'rule' ? mapping.providerExtension : undefined;

  if (providerExtension && providerEntryName.endsWith(providerExtension)) {
    return `${providerEntryName.slice(0, -providerExtension.length)}.md`;
  }
  if (providerEntryName.endsWith('.instructions.md')) {
    return `${providerEntryName.slice(0, -'.instructions.md'.length)}.md`;
  }
  if (providerEntryName.endsWith('.mdc')) {
    return `${providerEntryName.slice(0, -'.mdc'.length)}.md`;
  }
  return providerEntryName;
}
