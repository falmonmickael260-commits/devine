/**
 * Point d'entrée du serveur DEVINE.
 *   npm start            → port 3000
 *   PORT=4000 npm start  → port personnalisé
 */
import { fileURLToPath } from 'node:url';
import { createDevineServer } from './multiplayer/socketServer.js';

// Dossier de l'interface web : <projet>/client
const clientDir = fileURLToPath(new URL('../client', import.meta.url));

const port = Number(process.env.PORT) || 3000;
const server = createDevineServer({
  corsOrigin: process.env.CORS_ORIGIN?.split(',') ?? '*',
  clientDir,
});

const actualPort = await server.listen(port);
console.log(`🎲 DEVINE — serveur prêt : http://localhost:${actualPort}`);

// Arrêt propre (Ctrl+C, redémarrage de l'hébergeur...)
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await server.close();
    process.exit(0);
  });
}
