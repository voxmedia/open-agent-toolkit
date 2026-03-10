import { docs } from 'fumadocs-mdx:collections/docs';
import { loader } from 'fumadocs-core/source';

export const source = loader({
  source: docs,
});
