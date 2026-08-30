export const LINKABLE_ARTIFACTS = [
  'discovery.md',
  'design.md',
  'summary.md',
] as const;

export type LinkableArtifact = (typeof LINKABLE_ARTIFACTS)[number];

export const LINKS_START = '<!-- oat:project-links:start -->';
export const LINKS_END = '<!-- oat:project-links:end -->';

export interface LinksInput {
  slug: string;
  sha: string;
  ref: string;
  originUrl: string;
  present: LinkableArtifact[];
  durableSummaryPath?: string;
  pinnedAt: string;
}

const ARTIFACT_LABELS: Record<LinkableArtifact, string> = {
  'discovery.md': 'Discovery',
  'design.md': 'Design',
  'summary.md': 'Summary',
};

export function parseGitHubOrigin(
  url: string,
): { owner: string; repo: string } | null {
  const scpMatch = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url);
  if (scpMatch) return { owner: scpMatch[1]!, repo: scpMatch[2]! };

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') return null;
    const parts = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

export function renderLinksBlock(input: LinksInput): string {
  const shortSha = input.sha.slice(0, 7);
  const lines = [
    LINKS_START,
    '',
    `**OAT project** \`${input.slug}\` (synced) — pinned to \`${input.ref}\` @ \`${shortSha}\` (${input.pinnedAt})`,
  ];
  const github = parseGitHubOrigin(input.originUrl);
  if (github) {
    const links = LINKABLE_ARTIFACTS.filter((artifact) =>
      input.present.includes(artifact),
    ).map(
      (artifact) =>
        `[${ARTIFACT_LABELS[artifact]}](https://github.com/${github.owner}/${github.repo}/blob/${input.sha}/${artifact})`,
    );
    if (links.length > 0) lines.push(links.join(' · '));
  }
  if (input.durableSummaryPath) {
    lines.push(`Durable summary: \`${input.durableSummaryPath}\``);
  }
  lines.push('', LINKS_END);
  return lines.join('\n');
}

export function replaceLinksBlock(
  body: string,
  block: string,
): { body: string; replaced: boolean; malformed: boolean } {
  const start = body.indexOf(LINKS_START);
  const end = body.indexOf(LINKS_END);
  if ((start === -1) !== (end === -1) || (start !== -1 && end < start)) {
    return { body, replaced: false, malformed: true };
  }
  if (start === -1) {
    const prefix = body.trimEnd();
    return {
      body: prefix ? `${prefix}\n\n${block}` : block,
      replaced: false,
      malformed: false,
    };
  }
  return {
    body: `${body.slice(0, start)}${block}${body.slice(end + LINKS_END.length)}`,
    replaced: true,
    malformed: false,
  };
}
