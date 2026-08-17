import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages 部署基路径：仓库名是 tzy → base = /tzy/
// 可通过环境变量 VITE_PAGES_BASE 覆盖（仓库名变更时不用改代码）
const DEFAULT_PAGES_BASE = '/tzy/';
const rawBase = (process.env.VITE_PAGES_BASE || DEFAULT_PAGES_BASE).trim();
// 规范化：保证开头有 /，结尾无 /，传给 React Router basename
const normalizedForRouter = rawBase.replace(/\/+$/, '') || '/';
// Vite base 必须结尾带 /（文档要求），避免相对路径拼接出错
const baseForVite = normalizedForRouter.endsWith('/') ? normalizedForRouter : normalizedForRouter + '/';

export default defineConfig({
  plugins: [
    react(),
  ],
  // GitHub Pages 子路径前缀
  base: baseForVite,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 标准输出目录（和 gh-pages 工具配合：npx gh-pages -d dist）
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  // 传给 React Router createBrowserRouter 的 basename
  define: {
    'process.env.CLIENT_BASE_PATH': JSON.stringify(normalizedForRouter),
    'process.env.CLIENT_DEV_PORT': JSON.stringify(process.env.CLIENT_DEV_PORT || '8001'),
  },
  server: {
    host: true,
    port: Number(process.env.CLIENT_DEV_PORT || 8001),
  },
});
