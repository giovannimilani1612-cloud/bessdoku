/*
 * BESS Doku — ui/difficultySelect.js
 * Tela de seleção de dificuldade, usada por Solo, Duelo e Melhor de 3.
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var Difficulty = BessDoku.Difficulty;
  var Timer = BessDoku.Timer;
  var Ranking = BessDoku.Ranking;

  var MODE_TITLES = {
    solo: 'Jogar Solo',
    duel: 'BESS Doku Duel',
    bo3: 'Melhor de 3'
  };

  function render(mode, router) {
    var screen = Dom.el('div', { class: 'screen screen--difficulty container-scroll' });

    screen.appendChild(Dom.el('div', { class: 'topbar' }, [
      Dom.el('button', { class: 'btn btn--icon', text: '←', onClick: function () { router.goHome(); } }),
      Dom.el('div', { class: 'topbar__title', text: MODE_TITLES[mode] || 'Escolha a dificuldade' }),
      Dom.el('div', { style: 'width:46px' })
    ]));

    screen.appendChild(Dom.el('p', { class: 'text-center text-secondary', text: 'Vamos lá! Escolha o seu nível.' }));

    var bestTimes = Ranking.getBestTimes();
    var list = Dom.el('div', { class: 'diff-list' });

    Difficulty.list().forEach(function (tier) {
      var best = bestTimes[tier.key];
      // Selo com o tamanho do tabuleiro; a cor sobe junto com o nível (CSS).
      var iconWrap = Dom.el('div', { class: 'diff-card__icon', 'aria-hidden': 'true', text: tier.size + '×' + tier.size });
      var card = Dom.el('button', {
        type: 'button',
        class: 'diff-card diff-card--' + tier.order,
        onClick: function () { handleSelect(mode, tier.key, router); }
      }, [
        iconWrap,
        Dom.el('div', { class: 'diff-card__body' }, [
          Dom.el('div', { class: 'diff-card__title', text: tier.label }),
          Dom.el('div', { class: 'diff-card__meta', text: tier.size + 'x' + tier.size + ' células' }),
          mode === 'solo' && best
            ? Dom.el('div', { class: 'diff-card__best', text: '⏱ Melhor: ' + Timer.format(best.finalTimeMs) })
            : null
        ]),
        Dom.el('span', { class: 'diff-card__chevron', text: '›' })
      ]);
      list.appendChild(card);
    });

    screen.appendChild(list);
    return screen;
  }

  function handleSelect(mode, tierKey, router) {
    if (mode === 'solo') router.startSolo(tierKey);
    else if (mode === 'duel') router.startDuel(tierKey);
    else if (mode === 'bo3') router.startBestOf3(tierKey);
  }

  BessDoku.DifficultySelectScreen = { render: render };
})(window.BessDoku);
