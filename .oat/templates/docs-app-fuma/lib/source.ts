import { loader } from 'fumadocs-core/source';
import { docs } from 'fumadocs-mdx:collections/docs';

export const source = loader({
  source: docs,
});
