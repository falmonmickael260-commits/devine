/**
 * ============================================================
 *  SERVICE DES FICHIERS DU CLIENT WEB
 * ============================================================
 * Le serveur DEVINE sert aussi l'interface (dossier /client) :
 * une seule adresse pour jouer → https://ton-domaine/
 *
 * - Aucune dépendance externe (node:fs + node:path).
 * - Protégé contre la remontée de dossiers (../).
 * - Toute URL inconnue sans extension renvoie index.html
 *   (permet les liens d'invitation du type /?code=X7K9P ou /X7K9P).
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
});

/**
 * Crée un gestionnaire HTTP pour un dossier statique.
 * @param {string} rootDir Dossier à servir (ex. <projet>/client)
 * @returns {(req, res) => Promise<boolean>} true si la requête a été servie
 */
export function createStaticHandler(rootDir) {
  const root = resolve(rootDir);

  return async function serveStatic(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      return false;
    }

    // Chemin demandé, ramené DANS le dossier racine (anti « ../ »)
    let filePath = normalize(join(root, pathname));
    if (filePath !== root && !filePath.startsWith(root + sep)) return false;

    let info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) {
      filePath = join(filePath, 'index.html');
      info = await stat(filePath).catch(() => null);
    }

    // URL « de page » inconnue (sans extension) → application
    if (!info && extname(pathname) === '') {
      filePath = join(root, 'index.html');
      info = await stat(filePath).catch(() => null);
    }
    if (!info?.isFile()) return false;

    const extension = extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream',
      'Content-Length': info.size,
      // Polices : cache long. Le reste : revalidation (on itère vite sur l'interface).
      'Cache-Control': extension === '.woff2' ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      createReadStream(filePath).pipe(res);
    }
    return true;
  };
}
