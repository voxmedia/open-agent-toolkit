export const PROJECT_LOG_TYPES = [
  'bug',
  'friction',
  'worked-well',
  'feedback',
] as const;
export const PROJECT_LOG_SCOPES = ['project', 'general'] as const;

export type ProjectLogType = (typeof PROJECT_LOG_TYPES)[number];
export type ProjectLogScope = (typeof PROJECT_LOG_SCOPES)[number];

export const PROJECT_LOG_AREA_MAX_LENGTH = 120;

export const JUDGMENT_HEADING_RE =
  /^### (\d{4}-\d{2}-\d{2}) · (project|general) · (bug|friction|worked-well|feedback) · ([^·\r\n]+)$/;
export const STRUCTURAL_HEADING_RE =
  /^### (\d{4}-\d{2}-\d{2}) · structural · ([^·\r\n]+) · ([^·\r\n]+)$/;

export function composeJudgmentHeading(input: {
  date: string;
  scope: ProjectLogScope;
  type: ProjectLogType;
  area: string;
}): string {
  return `### ${input.date} · ${input.scope} · ${input.type} · ${input.area}`;
}

export function composeStructuralHeading(input: {
  date: string;
  producer: string;
  ref: string;
}): string {
  return `### ${input.date} · structural · ${input.producer} · ${input.ref}`;
}
