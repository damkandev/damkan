// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { unified } from '@astrojs/markdown-remark';

const addImageLoadingAttributes = () => (tree) => {
  const visit = (node) => {
    if (node.type === 'element' && node.tagName === 'img') {
      node.properties = {
        ...node.properties,
        loading: 'lazy',
        decoding: 'async',
      };
    }

    node.children?.forEach(visit);
  };

  visit(tree);
};

// https://astro.build/config
export default defineConfig({
  site: 'https://dapan.es',
  output: 'server',
  adapter: vercel(),
  vite: {
    server: {
      allowedHosts: ['elevator-duchess-verbally.ngrok-free.dev'],
    },
  },
  integrations: [
    sitemap({
      filter: (page) =>
        page !== 'https://dapan.es/' &&
        !page.endsWith('/404.html') &&
        !['/toñi', '/carta'].includes(
          decodeURIComponent(new URL(page).pathname).replace(/\/$/, ''),
        ),
    }),
  ],
  markdown: {
    processor: unified({ rehypePlugins: [addImageLoadingAttributes] }),
  },
});
