import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * The prototype must keep working when someone double-clicks dist/index.html.
 * Browsers block ES-module / stylesheet fetches from file:// origins, so the
 * production HTML is made self-contained. This adds no runtime dependency and
 * no network request; it only inlines the two local bundle files after build.
 */
function inlineLocalFileBuild(): Plugin {
  return {
    name: 'inline-local-file-build',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist');
      const htmlPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(htmlPath)) return;

      let html = fs.readFileSync(htmlPath, 'utf8');

      const cssTag = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/);
      if (cssTag) {
        const cssPath = path.join(distDir, cssTag[1].replace(/^\.?\//, ''));
        if (fs.existsSync(cssPath)) {
          const css = fs.readFileSync(cssPath, 'utf8').replace(/<\/style>/gi, '<\\/style>');
          // Use a replacer callback: the bundles contain "$&" sequences that
          // String.replace would otherwise expand with the matched tag.
          html = html.replace(cssTag[0], () => `<style>\n${css}\n</style>`);
        }
      }

      const jsTag = html.match(/<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/);
      if (jsTag) {
        const jsPath = path.join(distDir, jsTag[1].replace(/^\.?\//, ''));
        if (fs.existsSync(jsPath)) {
          // HTML's script-data parser treats a literal "<script" inside the
          // bundle as a nested start tag. Escape it at the source level so the
          // inlined module is parsed as one script element under file://.
          const js = fs.readFileSync(jsPath, 'utf8')
            .replace(/<script/gi, '<\\x73cript')
            .replace(/<\/script/gi, '<\\/script');
          html = html.replace(jsTag[0], () => `<script type="module">\n${js}\n</script>`);
        }
      }

      fs.writeFileSync(htmlPath, html, 'utf8');
    },
  };
}

// Only local dev. No proxy, no backend, no remote assets.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), inlineLocalFileBuild()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // No modulepreload links or fetch polyfill: the self-contained file must
    // never try to fetch a sibling asset from a file:// origin.
    modulePreload: false,
  },
});
