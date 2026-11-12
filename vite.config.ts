import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `pnpm build`        -> dist/ 常规静态站点
// `pnpm build:single` -> dist-single/index.html 单文件（JS 全部内联，方便直接分享）
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
  },
}));
