import { z } from 'zod';

export const ContentTypeSchema = z.enum(['skill', 'agent']);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const SyncStrategySchema = z.enum(['symlink', 'copy', 'auto']);
export type SyncStrategy = z.infer<typeof SyncStrategySchema>;

export const ScopeSchema = z.enum(['project', 'user', 'all']);
export type Scope = z.infer<typeof ScopeSchema>;

export const SCOPE_CONTENT_TYPES: Record<Scope, ContentType[]> = {
  project: ['skill', 'agent'],
  user: ['skill'],
  all: ['skill', 'agent'],
};
