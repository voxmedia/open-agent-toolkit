export const PROJECT_MANAGEMENT_AGENTS_SECTION_KEY = 'project-management';

export function buildProjectManagementAgentsSectionBody(): string {
  return [
    '### Project Management',
    '',
    '- Repository planning and durable context live under `.oat/repo/`.',
    '- Consult it when prioritizing or planning work, checking the backlog, starting or closing tracked work, or looking for established repository context.',
    '- Start with `.oat/repo/AGENTS.md`; it routes to `pjm/` for active state and `reference/` for durable records.',
    '- If the surface is missing, initialize it with `oat pjm init`.',
  ].join('\n');
}
