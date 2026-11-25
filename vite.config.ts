import { defineConfig, type Plugin } from 'vite';
import { cpSync, existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, extname, join, normalize } from 'node:path';

/**
 * Asset pack nằm ở /assets (ngoài public/ để giữ nguyên cấu trúc repo).
 * - dev: middleware phục vụ /assets/* trực tiếp từ thư mục gốc.
 * - build: copy nguyên cây assets vào dist/assets → preview / deploy đều có ảnh.
 * Không nhân bản 799 file trong Git, không dùng placeholder.
 */
function assetPack(): Plugin {
  const root = process.cwd();
  const srcDir = resolve(root, 'assets');
  const mime: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  };
  return {
    name: 'vn1945-asset-pack',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (!url.startsWith('/assets/')) { next(); return; }
        const rel = normalize(url.slice('/assets/'.length)).replace(/^(\.\.(\/|\\|$))+/, '');
        const file = join(srcDir, rel);
        if (!file.startsWith(srcDir) || !existsSync(file) || !statSync(file).isFile()) { next(); return; }
        try {
          res.setHeader('Content-Type', mime[extname(file).toLowerCase()] ?? 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.end(readFileSync(file));
        } catch { next(); }
      });
    },
    closeBundle() {
      const out = resolve(root, 'dist', 'assets');
      if (existsSync(srcDir)) cpSync(srcDir, out, { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [assetPack()],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true, strictPort: true },
  build: { target: 'es2022', assetsInlineLimit: 0, emptyOutDir: true },
});
