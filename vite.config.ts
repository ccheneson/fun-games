/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// Content-Security-Policy is injected at build time only: the dev server needs
// inline/websocket allowances (HMR) that a strict policy would block.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://m.media-amazon.com",
  "connect-src 'self' https://query.wikidata.org https://commons.wikimedia.org https://upload.wikimedia.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const cspPlugin = {
  name: 'inject-csp',
  apply: 'build' as const,
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' as const },
  ],
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [svelte(), cspPlugin],
  test: { include: ['tests/**/*.test.ts'] },
})
