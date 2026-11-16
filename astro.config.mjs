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
  redirects: { '/': { status: 301, destination: '/es/' } },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'es', locales: { es: 'es-CL', en: 'en-US' } },
      filter: (page) => {
        const path = decodeURIComponent(new URL(page).pathname).replace(/\/$/, '');
        return (
          path !== '' &&
          !page.endsWith('/404.html') &&
          !['/toñi', '/carta'].includes(path) &&
          !/\/(dashboard|components)$/.test(path)
        );
      },
    }),
  ],
  markdown: {
    processor: unified({ rehypePlugins: [addImageLoadingAttributes] }),
  },
});
