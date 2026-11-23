/**
 * Local class joiner for the figure components. It stands in for shadcn's
 * `cn` (clsx + tailwind-merge) without the merge step: figures accept no
 * author-supplied `className`, so no conflicting utilities need resolving.
 * Never pass a utility that overrides another in the same list (for example
 * `p-0` beside `px-5`): Tailwind's stylesheet order, not list order, wins.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(' ');
}
