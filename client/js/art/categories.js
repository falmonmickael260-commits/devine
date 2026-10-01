/**
 * ============================================================
 *  ILLUSTRATIONS DES CATÉGORIES (vectorielles, 100 % originales)
 * ============================================================
 * Style commun à tout l'univers DEVINE :
 *   - fond « plateau télé » : rayons lumineux + trame de points ;
 *   - objets en aplats de couleur, contour encre épais (#140c40) ;
 *   - un reflet clair par objet, pas de dégradés compliqués.
 * Aucun personnage ni logo protégé : uniquement des objets génériques.
 *
 * Toutes les illustrations : viewBox 300 × 200, contenu important
 * entre y = 40 et y = 160 (la carte Mix est recadrée en bandeau sur mobile).
 */

const INK = '#140c40';
const STROKE = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

/** Fond commun : dégradé radial + rayons + trame de points. */
function backdrop(id, light, dark) {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * 360) / 16;
    return `<polygon points="150,120 140,-260 160,-260" transform="rotate(${angle} 150 120)"/>`;
  }).join('');

  return `
    <defs>
      <radialGradient id="bg-${id}" cx="50%" cy="62%" r="78%">
        <stop offset="0" stop-color="${light}"/>
        <stop offset="1" stop-color="${dark}"/>
      </radialGradient>
      <pattern id="dots-${id}" width="9" height="9" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.3" fill="#ffffff"/>
      </pattern>
    </defs>
    <rect width="300" height="200" fill="url(#bg-${id})"/>
    <g fill="#ffffff" opacity=".1">${rays}</g>
    <rect width="300" height="200" fill="url(#dots-${id})" opacity=".12"/>`;
}

/** Petite étincelle à 4 branches. */
const sparkle = (x, y, size, fill = '#fff8d6') =>
  `<path d="M${x} ${y - size} Q${x + size * 0.18} ${y - size * 0.18} ${x + size} ${y} Q${x + size * 0.18} ${y + size * 0.18} ${x} ${y + size} Q${x - size * 0.18} ${y + size * 0.18} ${x - size} ${y} Q${x - size * 0.18} ${y - size * 0.18} ${x} ${y - size} Z" fill="${fill}"/>`;

/** Étoile à 5 branches. */
function star(cx, cy, outer, inner, fill, extra = '') {
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${points}" fill="${fill}" ${extra}/>`;
}

const wrap = (inner) =>
  `<svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

/* ---------------- 👤 PERSONNALITÉS : silhouettes sous les projecteurs ---------------- */
const personnalites = wrap(`
  ${backdrop('pers', '#ffd77a', '#d9560f')}
  <polygon points="128,0 172,0 236,200 64,200" fill="#ffffff" opacity=".22"/>
  <ellipse cx="150" cy="182" rx="128" ry="20" fill="#8a2f06" ${STROKE}/>
  <ellipse cx="150" cy="176" rx="96" ry="10" fill="#ffb347" opacity=".55"/>
  <!-- silhouettes du fond -->
  <path d="M60 178 Q60 140 90 137 Q120 140 120 178 Z" fill="#5a2a8c" ${STROKE}/>
  <circle cx="90" cy="114" r="16" fill="#5a2a8c" ${STROKE}/>
  <path d="M180 178 Q180 140 210 137 Q240 140 240 178 Z" fill="#5a2a8c" ${STROKE}/>
  <circle cx="210" cy="114" r="16" fill="#5a2a8c" ${STROKE}/>
  <!-- vedette au centre -->
  <path d="M108 180 Q108 124 150 120 Q192 124 192 180 Z" fill="#2a1766" ${STROKE}/>
  <circle cx="150" cy="92" r="23" fill="#2a1766" ${STROKE}/>
  <path d="M136 82 Q142 72 154 72" stroke="#8f7bff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <!-- micro sur pied -->
  <path d="M150 180 V146" ${STROKE}/>
  <rect x="142" y="128" width="16" height="22" rx="8" fill="#e8e4ff" ${STROKE}/>
  ${star(150, 40, 19, 8, '#fff3b0', STROKE)}
  ${sparkle(58, 52, 10)} ${sparkle(246, 44, 12)} ${sparkle(222, 86, 6)} ${sparkle(80, 82, 6)}
`);

/* ---------------- 🎬 FILMS & SÉRIES : clap, écran, bobine ---------------- */
const filmsSeries = wrap(`
  ${backdrop('film', '#ff8aa0', '#a3103c')}
  <defs>
    <pattern id="clap-stripes" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
      <rect width="12" height="24" fill="#ffffff"/><rect x="12" width="12" height="24" fill="${INK}"/>
    </pattern>
  </defs>
  <!-- écran / télévision -->
  <path d="M196 152 L184 172 M240 152 L252 172" ${STROKE}/>
  <rect x="152" y="46" width="132" height="106" rx="14" fill="#2a1766" ${STROKE}/>
  <rect x="164" y="58" width="108" height="82" rx="8" fill="#4b2bb5"/>
  <path d="M164 108 Q210 84 272 104 V132 a8 8 0 0 1 -8 8 H172 a8 8 0 0 1 -8 -8 Z" fill="#6b4fe0"/>
  <path d="M205 82 L235 99 L205 116 Z" fill="#ffc83d" ${STROKE}/>
  <!-- clap de cinéma -->
  <g transform="rotate(-8 90 130)">
    <rect x="30" y="104" width="122" height="78" rx="8" fill="#2a1766" ${STROKE}/>
    <path d="M44 128 H136 M44 146 H110 M44 164 H124" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity=".75"/>
    <rect x="30" y="86" width="122" height="18" fill="url(#clap-stripes)" ${STROKE}/>
    <g transform="rotate(-18 32 86)">
      <rect x="32" y="66" width="122" height="18" fill="url(#clap-stripes)" ${STROKE}/>
    </g>
  </g>
  <!-- bobine -->
  <circle cx="262" cy="172" r="26" fill="#e8e4ff" ${STROKE}/>
  <circle cx="262" cy="172" r="6" fill="${INK}"/>
  <circle cx="262" cy="157" r="6" fill="#a3103c"/><circle cx="276" cy="176" r="6" fill="#a3103c"/><circle cx="249" cy="181" r="6" fill="#a3103c"/>
  ${sparkle(40, 40, 10)} ${sparkle(128, 30, 7)} ${sparkle(140, 186, 6)}
`);

/* ---------------- ⚽ SPORT : ballon, raquette, médaille ---------------- */
function footballPatches(cx, cy, radius) {
  // Pentagones autour du centre, coupés par le contour du ballon
  const pentagon = (x, y, r, rotation) =>
    `<polygon points="${Array.from({ length: 5 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 5 + rotation;
      return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ')}" fill="${INK}"/>`;
  const outer = Array.from({ length: 5 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return pentagon(cx + radius * 0.95 * Math.cos(a), cy + radius * 0.95 * Math.sin(a), radius * 0.3, a);
  }).join('');
  const seams = Array.from({ length: 5 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return `<path d="M${(cx + radius * 0.36 * Math.cos(a)).toFixed(1)} ${(cy + radius * 0.36 * Math.sin(a)).toFixed(1)} L${(cx + radius * 0.7 * Math.cos(a)).toFixed(1)} ${(cy + radius * 0.7 * Math.sin(a)).toFixed(1)}" stroke="${INK}" stroke-width="3"/>`;
  }).join('');
  return pentagon(cx, cy, radius * 0.36, -Math.PI / 2) + outer + seams;
}

const sport = wrap(`
  ${backdrop('sport', '#8bffc0', '#0b8a4b')}
  <defs><clipPath id="ball-clip"><circle cx="122" cy="122" r="50"/></clipPath></defs>
  <!-- lignes de terrain -->
  <path d="M-10 196 Q150 120 310 196" stroke="#ffffff" stroke-width="3" fill="none" opacity=".35"/>
  <path d="M-10 214 Q150 150 310 214" stroke="#ffffff" stroke-width="3" fill="none" opacity=".25"/>
  <!-- médaille -->
  <path d="M42 18 L60 70 L72 66 L56 18 Z" fill="#2be8ff" ${STROKE}/>
  <path d="M96 18 L78 70 L66 66 L82 18 Z" fill="#ff3b8d" ${STROKE}/>
  <circle cx="69" cy="82" r="20" fill="#ffc83d" ${STROKE}/>
  ${star(69, 82, 10, 4.5, '#fff3b0')}
  <!-- raquette -->
  <g transform="rotate(24 222 92)">
    <rect x="215" y="134" width="14" height="56" rx="6" fill="#ff3b8d" ${STROKE}/>
    <path d="M222 120 V136" ${STROKE}/>
    <ellipse cx="222" cy="78" rx="38" ry="48" fill="#ffffff" fill-opacity=".25" ${STROKE}/>
    <g stroke="#ffffff" stroke-width="2" opacity=".85">
      <path d="M198 50 H246 M190 66 H254 M186 82 H258 M188 98 H256 M196 114 H248"/>
      <path d="M200 38 V118 M212 32 V126 M224 30 V126 M236 32 V124 M248 40 V116"/>
    </g>
    <ellipse cx="222" cy="78" rx="38" ry="48" fill="none" ${STROKE} stroke-width="7"/>
  </g>
  <!-- balle de tennis -->
  <circle cx="262" cy="160" r="15" fill="#d8ff3d" ${STROKE}/>
  <path d="M250 150 Q262 160 250 171 M274 150 Q262 160 274 171" stroke="#ffffff" stroke-width="2.5" fill="none"/>
  <!-- ballon -->
  <circle cx="122" cy="122" r="50" fill="#ffffff"/>
  <g clip-path="url(#ball-clip)">${footballPatches(122, 122, 50)}</g>
  <circle cx="122" cy="122" r="50" fill="none" ${STROKE}/>
  <path d="M92 96 Q102 84 118 82" stroke="#ffffff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".9"/>
  ${sparkle(176, 40, 9)} ${sparkle(30, 140, 7)}
`);

/* ---------------- 🏰 DISNEY : château de conte, baguette, nuit étoilée ---------------- */
const disney = wrap(`
  ${backdrop('magic', '#c3aeff', '#3a1f9c')}
  <!-- lune -->
  <path d="M256 22 A28 28 0 1 0 270 74 A22 22 0 1 1 256 22 Z" fill="#fff3b0" ${STROKE}/>
  <!-- château (silhouette originale) -->
  <g>
    <rect x="98" y="118" width="104" height="74" fill="#e9e2ff" ${STROKE}/>
    <path d="M98 118 V108 H112 V118 M126 118 V108 H140 V118 M160 118 V108 H174 V118 M188 118 V108 H202 V118" fill="#e9e2ff" ${STROKE}/>
    <rect x="76" y="104" width="30" height="88" fill="#d6ccff" ${STROKE}/>
    <polygon points="72,106 91,58 110,106" fill="#ff6fb5" ${STROKE}/>
    <rect x="194" y="104" width="30" height="88" fill="#d6ccff" ${STROKE}/>
    <polygon points="190,106 209,58 228,106" fill="#ff6fb5" ${STROKE}/>
    <rect x="134" y="80" width="32" height="112" fill="#f4f0ff" ${STROKE}/>
    <polygon points="128,82 150,22 172,82" fill="#2be8ff" ${STROKE}/>
    <path d="M150 22 V8 L164 13 L150 18" fill="#ffc83d" ${STROKE}/>
    <path d="M91 58 V48 L101 52 L91 56" fill="#ffc83d" ${STROKE} stroke-width="3"/>
    <path d="M209 58 V48 L219 52 L209 56" fill="#ffc83d" ${STROKE} stroke-width="3"/>
    <path d="M138 192 V170 A12 12 0 0 1 162 170 V192" fill="#5a2a8c" ${STROKE}/>
    <rect x="144" y="100" width="12" height="18" rx="6" fill="#ffc83d"/>
    <rect x="85" y="128" width="12" height="16" rx="6" fill="#ffc83d"/>
    <rect x="203" y="128" width="12" height="16" rx="6" fill="#ffc83d"/>
  </g>
  <!-- baguette magique + traînée d'étincelles -->
  <path d="M30 186 L74 128" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
  <path d="M30 186 L74 128" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
  ${star(78, 122, 16, 7, '#ffc83d', STROKE)}
  <path d="M92 108 Q120 70 106 44" stroke="#fff8d6" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round" fill="none"/>
  ${sparkle(108, 40, 9)} ${sparkle(40, 60, 8)} ${sparkle(236, 96, 7)} ${sparkle(270, 140, 9)} ${sparkle(30, 110, 5)}
  ${star(196, 30, 6, 2.6, '#fff8d6')} ${star(56, 28, 5, 2.2, '#fff8d6')}
`);

/* ---------------- 🎲 MIX : dé + tuiles des 4 univers ---------------- */
function tile(x, y, rotation, fill, glyph) {
  return `<g transform="translate(${x} ${y}) rotate(${rotation})">
    <rect x="-27" y="-27" width="54" height="54" rx="12" fill="${INK}" transform="translate(4 5)"/>
    <rect x="-27" y="-27" width="54" height="54" rx="12" fill="${fill}" ${STROKE}/>
    ${glyph}
  </g>`;
}

const mix = wrap(`
  ${backdrop('mix', '#86f6ff', '#1563c4')}
  ${tile(56, 74, -14, '#ffb23f', star(0, 0, 15, 6.5, '#fff3b0', STROKE))}
  ${tile(92, 138, 9, '#ff4f6d', `<path d="M-8 -12 L13 0 L-8 12 Z" fill="#fff3b0" ${STROKE}/>`)}
  ${tile(244, 72, 13, '#3be38a', `<circle r="14" fill="#ffffff" ${STROKE}/><polygon points="0,-6 5.7,-1.9 3.5,4.9 -3.5,4.9 -5.7,-1.9" fill="${INK}"/>`)}
  ${tile(208, 140, -10, '#9b7bff', `<path d="M-12 13 L6 -5" stroke="#fff3b0" stroke-width="5" stroke-linecap="round"/>${star(8, -8, 9, 4, '#ffc83d', STROKE)}`)}
  <!-- dé central -->
  <g transform="translate(150 100) rotate(10)">
    <rect x="-42" y="-42" width="84" height="84" rx="18" fill="${INK}" transform="translate(6 8)"/>
    <rect x="-42" y="-42" width="84" height="84" rx="18" fill="#ffffff" ${STROKE}/>
    <path d="M-30 -36 H22" stroke="#e8e4ff" stroke-width="5" stroke-linecap="round"/>
    <g fill="${INK}">
      <circle cx="-20" cy="-20" r="7.5"/><circle cx="20" cy="-20" r="7.5"/>
      <circle cx="0" cy="0" r="7.5"/>
      <circle cx="-20" cy="20" r="7.5"/><circle cx="20" cy="20" r="7.5"/>
    </g>
  </g>
  ${sparkle(150, 38, 9)} ${sparkle(150, 168, 7)} ${sparkle(24, 130, 7)} ${sparkle(282, 120, 8)}
`);

/** Illustration par identifiant de catégorie (ids du serveur). */
export const CATEGORY_ART = Object.freeze({
  personnalites,
  films_series: filmsSeries,
  sport,
  disney,
  mix,
});
