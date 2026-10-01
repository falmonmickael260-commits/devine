/**
 * ============================================================
 *  GÉNÈRE LA VERSION DÉMO EN UN SEUL FICHIER HTML
 * ============================================================
 *   npm run build:demo   →   dist/devine-demo.html
 *
 * Ce fichier s'ouvre partout (lien publié, double-clic) sans serveur :
 * - CSS, polices et JavaScript sont intégrés dans la page ;
 * - le vrai moteur de jeu tourne dans le navigateur avec des joueurs simulés
 *   (client/demo/net.demo.js remplace client/js/core/net.js).
 * La vraie version multijoueur reste : npm start.
 */
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const client = join(root, 'client');

/* ---------- 1. JavaScript : un seul paquet ---------- */
const swapForDemo = {
  name: 'devine-demo',
  setup(builder) {
    // Le réseau réel est remplacé par le serveur simulé
    builder.onResolve({ filter: /\/net\.js$/ }, () => ({ path: join(client, 'demo/net.demo.js') }));
    // Modules Node utilisés par le moteur → équivalents navigateur
    builder.onResolve({ filter: /^node:events$/ }, () => ({ path: join(client, 'demo/events-shim.js') }));
    builder.onResolve({ filter: /^node:crypto$/ }, () => ({ path: join(client, 'demo/crypto-shim.js') }));
  },
};

const result = await build({
  entryPoints: [join(client, 'js/main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2022'],
  minify: true,
  write: false,
  plugins: [swapForDemo],
});
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

/* ---------- 2. CSS : fichiers concaténés + polices intégrées ---------- */
const cssFiles = ['tokens', 'base', 'stage', 'components', 'screens'];
let css = '';
for (const name of cssFiles) css += `${await readFile(join(client, `css/${name}.css`), 'utf8')}\n`;

const fontUrls = [...new Set([...css.matchAll(/url\('\/fonts\/([^']+)'\)/g)].map((match) => match[1]))];
for (const file of fontUrls) {
  const data = (await readFile(join(client, 'fonts', file))).toString('base64');
  css = css.replaceAll(`url('/fonts/${file}')`, `url(data:font/woff2;base64,${data})`);
}

/* ---------- 3. Page HTML ---------- */
let html = await readFile(join(client, 'index.html'), 'utf8');
html = html
  .replace(/\s*<!-- Styles[^\n]*\n/, '\n')
  .replace(/\s*<link rel="stylesheet"[^>]*>/g, '')
  .replace(/\s*<!-- Socket\.IO[^\n]*\n\s*<script src="\/socket\.io\/socket\.io\.js"><\/script>/, '')
  .replace(/\s*<script type="module" src="\/js\/main\.js"><\/script>/, '')
  .replace('</head>', `  <style>\n${css}</style>\n</head>`)
  .replace(
    '</body>',
    `  <div class="demo-badge">Démo : les autres joueurs sont simulés</div>\n` +
      `  <script>window.DEVINE_DEMO = true;</script>\n  <script>${script}</script>\n</body>`,
  );

await mkdir(join(root, 'dist'), { recursive: true });
const output = join(root, 'dist/devine-demo.html');
await writeFile(output, html);
console.log(`✅ ${output} (${(html.length / 1024).toFixed(0)} Ko)`);
