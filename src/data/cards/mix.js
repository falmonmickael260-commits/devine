/**
 * 🎲 MIX — 80 cartes exclusives (20 par thème), qui n'existent dans aucune
 * autre catégorie.
 *
 * Lors d'une partie en catégorie MIX, le paquet est tiré dans ces 80 cartes
 * ET dans les 4 autres catégories, de façon équilibrée entre les 4 thèmes
 * (voir engine/deck.js). Chaque carte garde donc un `theme`.
 *
 * Format : [titre, difficulté, thème]. Ajouter les nouvelles cartes À LA FIN.
 */
import { makeCards } from './makeCards.js';

const P = 'personnalites';
const FS = 'films_series';
const S = 'sport';
const DI = 'disney';

export default makeCards({
  prefix: 'mix',
  category: 'mix',
  entries: [
    // 👤 Personnalités
    ['Bruce Lee', 'F', P],
    ['Arnold Schwarzenegger', 'F', P],
    ['Will Smith', 'F', P],
    ['Justin Bieber', 'F', P],
    ['Jackie Chan', 'M', P],
    ['Sylvester Stallone', 'M', P],
    ['Keanu Reeves', 'M', P],
    ['Dwayne Johnson', 'M', P],
    ['Ed Sheeran', 'M', P],
    ['Adele', 'M', P],
    ['Bruno Mars', 'M', P],
    ['Ariana Grande', 'M', P],
    ['Billie Eilish', 'M', P],
    ['Charles de Gaulle', 'M', P],
    ['Walt Disney', 'M', P],
    ['Zaz', 'D', P],
    ['Abraham Lincoln', 'D', P],
    ['Houdini', 'D', P],
    ['Agatha Christie', 'D', P],
    ['Stan Lee', 'D', P],

    // 🎬 Films & Séries
    ['Les Tortues Ninja', 'F', FS],
    ['Mr Bean', 'F', FS],
    ['Tintin', 'F', FS],
    ['Garfield', 'F', FS],
    ['Transformers', 'M', FS],
    ['Jumanji', 'M', FS],
    ['Men in Black', 'M', FS],
    ['Casper', 'M', FS],
    ['Charlie et la Chocolaterie', 'M', FS],
    ['Kirikou', 'M', FS],
    ['Lucky Luke', 'M', FS],
    ['Titeuf', 'M', FS],
    ['Les Lapins Crétins', 'M', FS],
    ['Mad Max', 'D', FS],
    ['Gremlins', 'D', FS],
    ['Beetlejuice', 'D', FS],
    ['Les Goonies', 'D', FS],
    ['Le Magicien d’Oz', 'D', FS],
    ['Gaston Lagaffe', 'D', FS],
    ['Chucky', 'D', FS],

    // ⚽ Sport
    ['Baseball', 'F', S],
    ['Snowboard', 'F', S],
    ['Roller', 'F', S],
    ['Gymnastique', 'F', S],
    ['Hockey sur glace', 'M', S],
    ['Trampoline', 'M', S],
    ['Kobe Bryant', 'M', S],
    ['Novak Djokovic', 'M', S],
    ['David Beckham', 'M', S],
    ['Paul Pogba', 'M', S],
    ['Didier Deschamps', 'M', S],
    ['Cricket', 'D', S],
    ['Polo', 'D', S],
    ['Lutte', 'D', S],
    ['Kitesurf', 'D', S],
    ['Triathlon', 'D', S],
    ['Sébastien Loeb', 'D', S],
    ['Laure Manaudou', 'D', S],
    ['Tony Hawk', 'D', S],
    ['Stephen Curry', 'D', S],

    // 🏰 Disney
    ['Elsa', 'F', DI],
    ['Woody', 'F', DI],
    ['Dory', 'F', DI],
    ['Flash McQueen', 'F', DI],
    ['Mowgli', 'F', DI],
    ['Ariel', 'F', DI],
    ['Jafar', 'M', DI],
    ['Ursula', 'M', DI],
    ['Scar', 'M', DI],
    ['Jasmine', 'M', DI],
    ['Le Chapelier fou', 'M', DI],
    ['Timon et Pumbaa', 'M', DI],
    ['Sulli', 'M', DI],
    ['Merlin l’Enchanteur', 'M', DI],
    ['Bourriquet', 'M', DI],
    ['Sébastien le crabe', 'D', DI],
    ['Lumière', 'D', DI],
    ['Bob Razowski', 'D', DI],
    ['Rémy', 'D', DI],
    ['Edna Mode', 'D', DI],
  ],
});
