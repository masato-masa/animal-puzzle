import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
// vite の defineConfig は test フィールドを知らないので、vitest 側から取る。
import { defineConfig } from 'vitest/config';

// GitHub Pages はリポジトリ名のサブパスで配信される。ここを変えるとビルド後の
// アセット参照が全部壊れるので、リポジトリ名と必ず一致させること。
export default defineConfig({
  base: '/animal-puzzle/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5174, strictPort: true },
  test: {
    globals: true,
    // storage と router のテストが localStorage / location を使う。
    environment: 'jsdom',
    include: ['__tests__/**/*.test.ts'],
    // ステージ生成器のテストは乱数探索を回すので 40 秒前後かかる。
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
