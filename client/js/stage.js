/**
 * ============================================================
 *  DÉCOR VIVANT DU PLATEAU
 * ============================================================
 * - Formes géométriques flottantes (anneaux, triangles, croix).
 * - Particules lumineuses qui montent doucement (canvas).
 * Tout se met en pause quand l'onglet n'est pas visible (batterie).
 */
import { prefersReducedMotion } from './core/dom.js';

const stage = document.querySelector('.stage');

/* ---------------- Formes géométriques ---------------- */
const SHAPES = [
  // anneau, triangle, croix, losange — contours fins colorés
  (color) => `<svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="20" fill="none" stroke="${color}" stroke-width="3"/></svg>`,
  (color) => `<svg width="60" height="60" viewBox="0 0 60 60"><path d="M30 8 L54 50 H6 Z" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/></svg>`,
  (color) => `<svg width="40" height="40" viewBox="0 0 40 40"><path d="M20 6 V34 M6 20 H34" stroke="${color}" stroke-width="4" stroke-linecap="round"/></svg>`,
  (color) => `<svg width="48" height="48" viewBox="0 0 48 48"><rect x="12" y="12" width="24" height="24" rx="4" transform="rotate(45 24 24)" fill="none" stroke="${color}" stroke-width="3"/></svg>`,
];
const SHAPE_COLORS = ['#2be8ff', '#ff3b8d', '#ffc83d', '#9b7bff'];

function buildShapes() {
  const container = stage.querySelector('.stage__shapes');
  const count = window.innerWidth < 700 ? 6 : 10;
  for (let i = 0; i < count; i += 1) {
    const holder = document.createElement('div');
    holder.innerHTML = SHAPES[i % SHAPES.length](SHAPE_COLORS[i % SHAPE_COLORS.length]);
    // Placées sur les bords pour ne pas gêner la lecture au centre
    const side = i % 2 === 0;
    holder.style.left = `${side ? 2 + Math.random() * 18 : 78 + Math.random() * 18}%`;
    holder.style.top = `${8 + Math.random() * 70}%`;
    holder.style.setProperty('--dur', `${14 + Math.random() * 12}s`);
    holder.style.setProperty('--delay', `${-Math.random() * 20}s`);
    holder.style.setProperty('--dx', `${(Math.random() - 0.5) * 60}px`);
    holder.style.setProperty('--dy', `${-20 - Math.random() * 50}px`);
    holder.style.scale = String(0.6 + Math.random() * 0.7);
    container.append(holder);
  }
}

/* ---------------- Particules ---------------- */
function createParticles() {
  const canvas = stage.querySelector('.stage__particles');
  const ctx = canvas.getContext('2d');
  const colors = ['255,200,61', '43,232,255', '255,59,141', '243,240,255'];
  let particles = [];
  let width = 0;
  let height = 0;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.round(Math.min(70, (width * height) / 18000));
    particles = Array.from({ length: count }, () => spawn(true));
  }

  function spawn(anywhere = false) {
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 10,
      radius: 0.6 + Math.random() * 1.8,
      speed: 0.15 + Math.random() * 0.45,
      drift: (Math.random() - 0.5) * 0.25,
      color: colors[Math.floor(Math.random() * colors.length)],
      twinkle: Math.random() * Math.PI * 2,
    };
  }

  resize();
  window.addEventListener('resize', resize);

  return () => {
    ctx.clearRect(0, 0, width, height);
    for (const particle of particles) {
      particle.y -= particle.speed;
      particle.x += particle.drift;
      particle.twinkle += 0.04;
      if (particle.y < -10) Object.assign(particle, spawn());
      const alpha = 0.25 + 0.35 * (1 + Math.sin(particle.twinkle)) * 0.5;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${particle.color},${alpha.toFixed(2)})`;
      ctx.shadowColor = `rgba(${particle.color},0.8)`;
      ctx.shadowBlur = particle.radius * 4;
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

/* ---------------- Démarrage ---------------- */
export function startStage() {
  buildShapes();
  if (prefersReducedMotion()) return; // décor fixe, sans boucle d'animation

  const tickParticles = createParticles();
  let running = true;

  const loop = () => {
    if (!running) return;
    tickParticles();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(loop);
  });
}

/** Change l'ambiance lumineuse : 'a', 'b', 'gold' ou null. */
export function setMood(mood) {
  if (mood) document.body.dataset.mood = mood;
  else delete document.body.dataset.mood;
}
