/**
 * ============================================================
 *  ÉCRAN DE JEU — VERSION PROVISOIRE
 * ============================================================
 * Permet déjà de jouer une partie complète en ligne (manche, joueur actif,
 * chrono synchronisé, carte, TROUVÉ / PASSER, scores, fin, revanche).
 *
 * ⚠️ Sera remplacé à l'étape 6 par le vrai écran de jeu (grande carte
 *    illustrée, animations, transitions) et à l'étape 8 par l'écran de dessin.
 */
import { h } from '../core/dom.js';
import { request } from '../core/net.js';
import { play } from '../core/sound.js';
import { getState, serverNow } from '../core/store.js';
import { setMood } from '../stage.js';
import { toast } from '../ui/toast.js';

export function createGameScreen() {
  const content = h('div', { class: 'panel game-wait__card', style: { display: 'grid', gap: '18px' } });
  const timerEl = h('p', { class: 'logo', style: { 'font-size': 'var(--fs-2xl)' } });
  let timer = null;

  const el = h('section', { class: 'game-wait', 'aria-label': 'Partie en cours' },
    content,
    h('p', { class: 'field__hint' }, 'Écran provisoire : l’écran de jeu final arrive à l’étape suivante.'),
  );

  async function act(event) {
    try {
      await request(event);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  /** Chrono local, recalé sur l'heure du serveur. */
  function tick() {
    const turn = getState().view?.game?.turn;
    if (!turn) return;
    const remaining = Math.max(0, Math.ceil((turn.endsAt - serverNow()) / 1000));
    timerEl.textContent = `${remaining}s`;
  }

  function update(state) {
    const view = state.view;
    const game = view?.game;
    if (!game) return;
    const teamName = (id) => game.teams.find((team) => team.id === id)?.name ?? id;
    const playerName = (id) => game.players.find((player) => player.id === id)?.name ?? '?';

    const scores = h('p', { class: 'lobby__count' },
      game.teams.map((team, i) => [i > 0 ? '   ' : '', `${team.name} : `, h('b', {}, team.score)]),
    );
    const blocks = [];

    if (game.status === 'playing' && game.turn) {
      setMood(game.turn.teamId === 'A' ? 'a' : 'b');
      blocks.push(
        h('h2', { class: 'game-wait__round' }, `Manche ${game.round.number} : ${game.round.label}`),
        h('p', { class: 'menu__tagline', style: { margin: '0 auto' } }, game.round.instruction),
        scores,
        h('p', {}, `${game.cardsRemaining} carte${game.cardsRemaining > 1 ? 's' : ''} restante${game.cardsRemaining > 1 ? 's' : ''}`),
        h('p', { class: 'lobby__count' }, `Au tour de ${playerName(game.turn.playerId)} (${teamName(game.turn.teamId)})`),
        timerEl,
      );
      if (game.isActivePlayer && game.activeCard) {
        const found = h('button', { class: 'btn btn--primary btn--xl btn--block' }, 'Trouvé');
        const pass = h('button', { class: 'btn btn--glow btn--xl btn--block' }, 'Passer');
        found.addEventListener('click', () => { play('select'); act('game:found'); });
        pass.addEventListener('click', () => { play('click'); act('game:pass'); });
        blocks.push(
          h('div', { class: 'panel', style: { padding: '22px' } },
            h('p', { class: 'field__label' }, 'Ta carte'),
            h('p', { class: 'form-screen__title' }, game.activeCard.title),
          ),
          found,
          pass,
        );
      }
      clearInterval(timer);
      timer = setInterval(tick, 200);
      tick();
    } else if (game.status === 'round_over') {
      setMood('gold');
      clearInterval(timer);
      blocks.push(h('h2', { class: 'game-wait__round' }, `Fin de la manche ${game.round.number}`), scores);
      if (game.nextRoundAt === null && view.you.isHost) {
        const next = h('button', { class: 'btn btn--primary btn--xl btn--block' }, 'Manche suivante');
        next.addEventListener('click', () => act('game:next-round'));
        blocks.push(next);
      } else {
        blocks.push(h('p', { class: 'waiting-dots' }, 'La manche suivante arrive'));
      }
    } else if (game.status === 'finished' && game.results) {
      setMood('gold');
      clearInterval(timer);
      const winners = game.results.winnerTeamIds.map(teamName).join(' et ');
      blocks.push(
        h('h2', { class: 'game-wait__round' }, game.results.isDraw ? 'Égalité !' : `Victoire : ${winners}`),
        scores,
      );
      if (view.you.isHost) {
        const rematch = h('button', { class: 'btn btn--primary btn--xl btn--block' }, 'Rejouer');
        rematch.addEventListener('click', () => act('game:rematch'));
        blocks.push(rematch);
      }
    }
    content.replaceChildren(...blocks);
  }

  return {
    el,
    update,
    mounted: () => update(getState()),
    destroy: () => {
      clearInterval(timer);
      setMood(null);
    },
  };
}
