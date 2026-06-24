export function yymmdd(isoOrDate: string | Date): string {
  const date =
    isoOrDate instanceof Date ? new Date(isoOrDate) : new Date(isoOrDate);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for OAT identifier: ${String(isoOrDate)}`);
  }

  const year = String(date.getUTCFullYear() % 100).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}
