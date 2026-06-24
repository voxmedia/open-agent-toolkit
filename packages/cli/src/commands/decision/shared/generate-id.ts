import { yymmdd } from '@commands/shared/date-id';
import { slugify } from '@commands/shared/slug';

export function generateDecisionId(
  title: string,
  createdAt: string | Date,
): string {
  return `DR-${yymmdd(createdAt)}-${slugify(title)}`;
}
