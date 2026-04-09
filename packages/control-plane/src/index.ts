import type {
  ProjectState,
  ProjectSummary,
  SkillRecommendation,
} from './types';

export * from './types';

export async function getProjectState(
  _projectPath: string,
): Promise<ProjectState> {
  throw new Error('getProjectState is not implemented yet');
}

export async function listProjects(
  _projectsRoot: string,
): Promise<ProjectSummary[]> {
  throw new Error('listProjects is not implemented yet');
}

export function recommendSkill(
  _state: Omit<ProjectState, 'recommendation'>,
): SkillRecommendation {
  throw new Error('recommendSkill is not implemented yet');
}
