import { z } from 'zod';

export const ContentTypeSchema = z.enum(['skill', 'agent', 'rule']);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const SyncStrategySchema = z.enum(['symlink', 'copy', 'auto']);
export type SyncStrategy = z.infer<typeof SyncStrategySchema>;

export const ScopeSchema = z.enum(['project', 'user', 'all']);
export type Scope = z.infer<typeof ScopeSchema>;
export type ConcreteScope = Exclude<Scope, 'all'>;

const PROJECT_SCOPE_CONTENT_TYPES: ContentType[] = ['skill', 'agent', 'rule'];
const USER_SCOPE_CONTENT_TYPES: ContentType[] = ['skill'];
const ALL_SCOPE_CONTENT_TYPES = [
  ...new Set([...PROJECT_SCOPE_CONTENT_TYPES, ...USER_SCOPE_CONTENT_TYPES]),
] as ContentType[];

export const SCOPE_CONTENT_TYPES: Record<Scope, ContentType[]> = {
  project: PROJECT_SCOPE_CONTENT_TYPES,
  user: USER_SCOPE_CONTENT_TYPES,
  all: ALL_SCOPE_CONTENT_TYPES,
};
