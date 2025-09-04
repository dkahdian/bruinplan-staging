import adapterAuto from '@sveltejs/adapter-auto';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isDev = process.env.NODE_ENV === 'development';
const adapter = isDev ? adapterAuto : adapterStatic;

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: '404.html',
      precompress: false
    }),
    paths: {
      base: process.env.BASE_PATH || ""
    },
    prerender: {
      handleHttpError: ({ path, referrer, message }) => {
        // Log prerender errors but don't fail the build
        console.warn(`Prerender error for ${path}:`, message);
        if (referrer) console.warn(`Referrer: ${referrer}`);
      },
      handleMissingId: ({ path, id, message }) => {
        // Log missing ID errors but don't fail the build
        console.warn(`Missing ID error for ${path}:`, message);
      }
    }
  }
};