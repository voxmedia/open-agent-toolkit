import { yymmdd } from '@commands/shared/date-id';
import { slugify } from '@commands/shared/slug';

export function generateBacklogId(
  titleOrSlug: string,
  createdAt: string,
): string {
  return `bl-${yymmdd(createdAt)}-${slugify(titleOrSlug)}`;
}
