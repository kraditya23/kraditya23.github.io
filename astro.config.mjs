// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site } from './src/data/site.ts';

// Domain comes from site.url in src/data/site.ts.
export default defineConfig({
  site: site.url,
  integrations: [sitemap()],
});
