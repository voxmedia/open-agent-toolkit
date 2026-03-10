export interface SearchConfig {
  engine: string;
  type: string;
}

export function createSearchConfig(): SearchConfig {
  return {
    engine: 'flexsearch',
    type: 'static',
  };
}
