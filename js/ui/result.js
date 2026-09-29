/*
 * BESS Doku — ui/result.js
 * Tela de resultado individual (Solo e Desafio Diário) e helpers de estatística
 * reaproveitados pela tela de resultado do Duelo/Melhor de 3.
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var Timer = BessDoku.Timer;
  var Characters = BessDoku.Characters;
  var Difficulty = BessDoku.Difficulty;

  function statBox(value, label) {
    return Dom.el('div', { class: 'stat-box' }, [
      Dom.el('div', { class: 'stat-box__value', text: value }),
      Dom.el('div', { class: 'stat-box__label', text: label })
    ]);
  }

  function buildStatGrid(snapshot) {
    return Dom.el('div', { class: 'stat-grid' }, [
      statBox(Timer.format(snapshot.elapsedMs), 'Tempo'),
      statBox(String(snapshot.errorCount), 'Erros'),
      statBox(String(snapshot.hintCount), 'Dicas'),
      statBox(String(snapshot.moveCount), 'Movimentos'),
      statBox('+' + snapshot.penaltySeconds + 's', 'Penalidades'),
      statBox(Timer.format(snapshot.finalTimeMs), 'Tempo final')
    ]);
  }

  function ratingBadge(rating) {
    return Dom.el('div', { class: 'rating-badge rating-badge--' + rating }, [
      Dom.el('span', { text: Difficulty.RATING_LABELS[rating] })
    ]);
  }

  // options: { title, subtitleLine, isNewBest, onPlayAgain, onHome, onRanking, hidePlayAgain }
  function render(snapshot, options) {
    options = options || {};
    var tier = Difficulty.get(snapshot.difficultyTier);
    var screen = Dom.el('div', { class: 'screen screen--result container-scroll' });

    screen.appendChild(Dom.el('div', { class: 'mascot-hero-wrap mascot-hero-wrap--celebrate' }, [
      Characters.buildFigure(snapshot.character, { size: 'lg' })
    ]));

    screen.appendChild(Dom.el('h1', { class: 'text-center', text: options.title || 'Desafio concluído!' }));
    if (options.subtitleLine) {
      screen.appendChild(Dom.el('p', { class: 'text-center text-secondary', text: options.subtitleLine }));
    } else {
      screen.appendChild(Dom.el('p', { class: 'text-center text-secondary', text: tier.label + ' · ' + tier.size + 'x' + tier.size }));
    }

    screen.appendChild(Dom.el('div', { class: 'row row--center' }, [ratingBadge(snapshot.rating)]));

    if (options.isNewBest) {
      screen.appendChild(Dom.el('p', { class: 'text-center', style: 'color:var(--color-accent-red-dark);font-weight:800;', text: '🏆 Novo melhor tempo!' }));
    }

    screen.appendChild(Dom.el('div', { class: 'card' }, [buildStatGrid(snapshot)]));

    var actions = Dom.el('div', { class: 'stack' });
    if (!options.hidePlayAgain) {
      actions.appendChild(Dom.el('button', { class: 'btn btn--primary btn--block', text: 'Jogar novamente', onClick: options.onPlayAgain }));
    }
    actions.appendChild(Dom.el('button', { class: 'btn btn--ghost btn--block', text: 'Ver ranking', onClick: options.onRanking }));
    actions.appendChild(Dom.el('button', { class: 'btn btn--dark btn--block', text: 'Início', onClick: options.onHome }));
    screen.appendChild(actions);

    return screen;
  }

  BessDoku.ResultScreen = {
    render: render,
    buildStatGrid: buildStatGrid,
    ratingBadge: ratingBadge
  };
})(window.BessDoku);
