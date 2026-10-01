/**
 * ============================================================
 *  ÉCRANS 4 & 5 — LOBBY + CHOIX DE LA CATÉGORIE
 * ============================================================
 * - Code de la partie en tuiles + copier / partager le lien.
 * - Équipes A et B : panneaux joueurs animés à chaque arrivée (lumière + son).
 * - L'hôte seul : choisit la catégorie, mélange/déplace les joueurs, lance.
 *
 * Mise à jour « par clé » : chaque joueur garde le même élément d'un état
 * à l'autre, ce qui évite de rejouer les animations à chaque changement.
 */
import { h } from '../core/dom.js';
import { request } from '../core/net.js';
import { play } from '../core/sound.js';
import { getState } from '../core/store.js';
import { leaveRoom } from '../core/session.js';
import { createCategoryVisual } from '../ui/categoryVisual.js';
import { createLogo } from '../ui/logo.js';
import { createCodeTiles } from '../ui/codeTiles.js';
import { ICONS } from '../ui/icons.js';
import { createSoundToggle } from '../ui/soundToggle.js';
import { toast } from '../ui/toast.js';

/** Sous-titres des catégories (les libellés viennent du serveur). */
const CATEGORY_TAGLINES = {
  personnalites: 'Stars, artistes et figures connues',
  films_series: 'Films et séries cultes',
  sport: 'Champions, clubs et disciplines',
  disney: 'Films, héros et chansons',
  mix: 'Les quatre univers mélangés',
};

/** Exécute une action serveur ; affiche l'erreur éventuelle. */
async function act(event, payload) {
  try {
    return await request(event, payload);
  } catch (error) {
    toast(error.message, 'error');
    return null;
  }
}

export function createLobbyScreen() {
  const playerEls = new Map(); // id → élément du panneau joueur
  let renderedOnce = false;
  let codeRendered = null;

  /* ---------- Squelette ---------- */
  const codeHolder = h('div');
  const countLabel = h('p', { class: 'lobby__count' });

  const copyButton = h('button', { class: 'btn btn--ghost', html: `${ICONS.copy}<span>Copier</span>` });
  const shareButton = h('button', { class: 'btn btn--ghost', html: `${ICONS.share}<span>Inviter</span>` });

  const teamEls = {
    A: buildTeam('A', 'Équipe A'),
    B: buildTeam('B', 'Équipe B'),
  };
  const teamsHint = h('p');
  const shuffleButton = h('button', { class: 'btn btn--ghost btn--block', style: { 'margin-top': '12px' }, html: `${ICONS.shuffle}<span>Mélanger les équipes</span>` });

  const categoriesGrid = h('div', { class: 'categories', role: 'radiogroup', 'aria-label': 'Catégorie de cartes' });
  const categoriesHint = h('p');
  const categoryNote = h('p', { class: 'categories__note' });
  const categoryEls = new Map(); // id → élément de la carte

  const startButton = h('button', { class: 'btn btn--primary btn--xl', html: `${ICONS.play}<span>Lancer la partie</span>` });
  const actionHint = h('p', { class: 'action-bar__hint' });
  const actionBar = h('div', { class: 'action-bar' }, startButton, actionHint);

  const el = h('section', { class: 'lobby', 'aria-label': 'Salle d’attente' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Quitter la partie', html: ICONS.exit, onClick: onLeave }),
      createLogo({ small: true }),
      createSoundToggle(),
    ),
    h('div', { class: 'panel lobby__code' },
      h('p', { class: 'lobby__code-label' }, 'Code de la partie'),
      codeHolder,
      h('div', { class: 'lobby__code-actions' }, copyButton, shareButton),
      countLabel,
    ),
    h('div', { class: 'lobby__grid' },
      h('section', { 'aria-label': 'Équipes' },
        h('div', { class: 'section-head' }, h('h2', {}, 'Équipes'), teamsHint),
        h('div', { class: 'teams' }, teamEls.A.el, teamEls.B.el),
        shuffleButton,
      ),
      h('section', { 'aria-label': 'Catégorie' },
        h('div', { class: 'section-head' }, h('h2', {}, 'Catégorie'), categoriesHint),
        categoriesGrid,
        categoryNote,
      ),
    ),
    actionBar,
  );

  /* ---------- Actions ---------- */
  async function onLeave() {
    play('leave');
    await leaveRoom(); // → retour au menu
  }

  copyButton.addEventListener('click', async () => {
    const code = getState().view?.room.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      play('select');
      toast(`Code ${code} copié`, 'success');
    } catch {
      toast(`Le code est ${code}`);
    }
  });

  shareButton.addEventListener('click', async () => {
    const code = getState().view?.room.code;
    if (!code) return;
    const url = `${location.origin}/?code=${code}`;
    const text = `Rejoins ma partie de DEVINE avec le code ${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'DEVINE', text, url });
      } else {
        await navigator.clipboard.writeText(`${text} : ${url}`);
        play('select');
        toast('Lien d’invitation copié', 'success');
      }
    } catch {
      /* partage annulé par l'utilisateur */
    }
  });

  shuffleButton.addEventListener('click', () => {
    play('select');
    act('lobby:shuffle-teams');
  });

  startButton.addEventListener('click', async () => {
    startButton.disabled = true;
    const ok = await act('game:start');
    if (ok) play('start');
    else startButton.disabled = false;
  });

  /* ---------- Construction ---------- */
  function buildTeam(teamId, name) {
    const list = h('div', { class: 'team__list', style: { display: 'grid', gap: '8px' } });
    const size = h('span', { class: 'team__size' });
    const el = h('div', { class: 'team', dataset: { team: teamId } },
      h('div', { class: 'team__head' }, h('span', { class: 'team__name' }, name), size),
      list,
    );
    return { el, list, size };
  }

  function buildPlayer(player) {
    const moveButton = h('button', { class: 'player__move', html: ICONS.swap });
    moveButton.addEventListener('click', () => {
      const view = getState().view;
      const current = view.room.players.find((p) => p.id === player.id);
      const target = view.room.teams.find((team) => team.id !== current?.teamId);
      if (!target) return;
      play('click');
      act('lobby:move-player', { playerId: player.id, teamId: target.id });
    });

    const el = h('div', { class: 'player' },
      h('span', { class: 'player__avatar', 'aria-hidden': 'true' }, initials(player.name)),
      h('span', { class: 'player__body' },
        h('span', { class: 'player__name' }, player.name),
        h('span', { class: 'player__meta' }),
      ),
      h('span', { class: 'player__status' }),
      moveButton,
    );
    el.refs = { meta: el.querySelector('.player__meta'), status: el.querySelector('.player__status'), moveButton };
    return el;
  }

  function buildCategory(category) {
    const el = h('button', { class: 'cat-card', role: 'radio', dataset: { cat: category.id } },
      h('span', { class: 'cat-card__art' }, createCategoryVisual(category.id)),
      h('span', { class: 'cat-card__body' },
        h('span', { class: 'cat-card__title' }, category.label),
        h('span', { class: 'cat-card__info' }),
      ),
      h('span', { class: 'cat-card__check', html: ICONS.check }),
    );
    el.addEventListener('click', () => {
      const view = getState().view;
      if (!view?.you.isHost || view.room.categoryId === category.id) return;
      play('select');
      act('lobby:set-category', { categoryId: category.id });
    });
    return el;
  }

  /* ---------- Rendu (appelé à chaque nouvel état) ---------- */
  function update(state) {
    const view = state.view;
    if (!view?.room || view.room.status !== 'lobby') return;
    const { room, you } = view;
    const isHost = you.isHost;

    // Code (animé à la première apparition seulement)
    if (codeRendered !== room.code) {
      codeHolder.replaceChildren(createCodeTiles(room.code, { animate: true }));
      codeRendered = room.code;
    }
    countLabel.replaceChildren(
      h('b', {}, room.players.length),
      ` joueur${room.players.length > 1 ? 's' : ''} sur ${room.rules.maxPlayers}`,
    );

    renderTeams(room, you, isHost);
    renderCategories(room, isHost);
    renderActionBar(room, isHost);
    renderedOnce = true;
  }

  function renderTeams(room, you, isHost) {
    const playersById = new Map(room.players.map((p) => [p.id, p]));
    const seen = new Set();
    let arrivals = 0;

    for (const team of room.teams) {
      const teamEl = teamEls[team.id];
      if (!teamEl) continue;

      team.playerIds.forEach((playerId, index) => {
        const player = playersById.get(playerId);
        if (!player) return;
        seen.add(playerId);

        let el = playerEls.get(playerId);
        if (!el) {
          el = buildPlayer(player);
          playerEls.set(playerId, el);
          // Animation d'arrivée : décalée au premier affichage, + son ensuite
          el.style.animationDelay = renderedOnce ? '0ms' : `${index * 90 + (team.id === 'B' ? 45 : 0)}ms`;
          el.classList.add('is-arriving');
          el.addEventListener('animationend', (event) => event.target === el && el.classList.remove('is-arriving'));
          if (renderedOnce && playerId !== you.id) arrivals += 1;
        }

        // Place l'élément au bon endroit (équipe + ordre)
        if (teamEl.list.children[index] !== el) teamEl.list.insertBefore(el, teamEl.list.children[index] ?? null);

        el.dataset.team = team.id;
        el.classList.toggle('is-me', playerId === you.id);
        el.classList.toggle('is-offline', !player.connected);
        el.refs.meta.replaceChildren(
          ...[
            player.isHost && h('span', { class: 'player__tag--host' }, 'Hôte'),
            playerId === you.id && h('span', {}, 'Toi'),
            !player.connected && h('span', {}, 'Reconnexion…'),
          ].filter(Boolean),
        );
        el.refs.status.setAttribute('title', player.connected ? 'Connecté' : 'Déconnecté');
        el.refs.moveButton.hidden = !isHost;
        el.refs.moveButton.setAttribute('aria-label', `Changer ${player.name} d’équipe`);
      });

      teamEl.size.textContent = `${team.playerIds.length} joueur${team.playerIds.length > 1 ? 's' : ''}`;
    }

    // Départs
    for (const [playerId, el] of playerEls) {
      if (seen.has(playerId)) continue;
      el.remove();
      playerEls.delete(playerId);
      if (renderedOnce) play('leave');
    }
    if (arrivals > 0) play('join');

    // Places libres (une par équipe tant que la salle n'est pas pleine)
    const hasRoom = room.players.length < room.rules.maxPlayers;
    for (const teamEl of Object.values(teamEls)) {
      teamEl.list.querySelector('.player-slot')?.remove();
      if (hasRoom) teamEl.list.append(h('div', { class: 'player-slot' }, 'En attente…'));
    }

    teamsHint.textContent = isHost ? 'Touche ⇄ pour changer un joueur d’équipe' : 'Équipes formées automatiquement';
    shuffleButton.hidden = !isHost;
  }

  function renderCategories(room, isHost) {
    if (categoryEls.size === 0) {
      for (const category of room.categories) {
        const el = buildCategory(category);
        categoryEls.set(category.id, el);
        categoriesGrid.append(el);
      }
    }

    for (const category of room.categories) {
      const el = categoryEls.get(category.id);
      const selected = room.categoryId === category.id;
      const unavailable = room.players.length > category.maxPlayers;
      el.classList.toggle('is-selected', selected);
      el.classList.toggle('is-unavailable', unavailable);
      el.setAttribute('aria-checked', String(selected));
      el.disabled = !isHost;
      el.querySelector('.cat-card__info').textContent = unavailable
        ? `Trop de joueurs : ${category.maxPlayers} maximum`
        : CATEGORY_TAGLINES[category.id] ?? '';
    }

    categoriesHint.textContent = isHost ? 'C’est toi qui choisis' : 'Choisie par l’hôte';
    const selected = room.categories.find((category) => category.id === room.categoryId);
    categoryNote.textContent = selected
      ? `${room.deckSize} cartes, les mêmes pendant les 3 manches.`
      : isHost ? 'Choisis une catégorie pour pouvoir lancer la partie.' : 'L’hôte n’a pas encore choisi.';
  }

  function renderActionBar(room, isHost) {
    const host = room.players.find((player) => player.isHost);
    startButton.hidden = !isHost;
    startButton.disabled = !room.canStart;

    if (isHost) {
      actionHint.textContent = room.canStart
        ? 'Tout le monde est prêt.'
        : room.startBlockers[0]?.message ?? '';
    } else {
      actionHint.replaceChildren(
        h('span', { class: 'waiting-dots' }, `En attente du lancement par ${host?.name ?? 'l’hôte'}`),
      );
    }
  }

  return {
    el,
    update,
    mounted: () => update(getState()),
  };
}

/** Initiales pour l'avatar : « Mika » → M, « Jean-Paul » → JP */
function initials(name) {
  const parts = name.split(/[\s-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 1);
  return letters.toUpperCase();
}
