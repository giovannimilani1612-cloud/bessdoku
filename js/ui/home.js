/*
 * BESS Doku — ui/home.js
 * Tela inicial: mascote em destaque, nome do jogo e o menu principal.
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var Characters = BessDoku.Characters;

  function tile(opts) {
    var children = [
      Dom.el('span', { class: 'menu-tile__icon', text: opts.icon }),
      Dom.el('span', { class: 'menu-tile__label', text: opts.label })
    ];
    if (opts.sub) children.push(Dom.el('span', { class: 'menu-tile__sub', text: opts.sub }));
    if (opts.dot) children.push(Dom.el('span', { class: 'menu-tile__dot' }));
    return Dom.el('button', {
      type: 'button',
      class: 'menu-tile' + (opts.primary ? ' menu-tile--primary' : ''),
      onClick: opts.onClick
    }, children);
  }

  function render(router) {
    var dailyDone = BessDoku.DailyChallenge && isDailyDoneToday();

    var screen = Dom.el('div', { class: 'screen screen--home container-scroll' });

    screen.appendChild(Dom.el('div', { class: 'mascot-hero-wrap' }, [
      Characters.buildFigure(Characters.DEFAULT_KEY, { size: 'xl' })
    ]));

    screen.appendChild(Dom.el('h1', { class: 'text-center', style: 'font-size:2rem;font-weight:900;letter-spacing:-.02em;', text: 'BESS Doku' }));
    screen.appendChild(Dom.el('p', { class: 'text-center text-secondary', text: 'Pense como um Lulu!' }));

    var grid = Dom.el('div', { class: 'menu-grid' }, [
      tile({ icon: '🐾', label: 'Jogar', sub: 'Modo Solo', primary: true, onClick: function () { router.goDifficultySelect('solo'); } }),
      tile({ icon: '🗺️', label: 'Aventura', sub: adventureSub('solo', 'Contra o relógio'), onClick: function () { router.startAdventure('solo'); } }),
      tile({ icon: '🤝', label: 'Aventura em Dupla', sub: adventureSub('team', '2 jogadores, 1 relógio'), onClick: function () { router.startAdventure('team'); } }),
      tile({ icon: '⚔️', label: 'Duelo', sub: 'BESS Doku Duel', onClick: function () { router.goDifficultySelect('duel'); } }),
      tile({ icon: '🏆', label: 'Melhor de 3', sub: '2 jogadores', onClick: function () { router.goDifficultySelect('bo3'); } }),
      tile({ icon: '📅', label: 'Desafio Diário', sub: dailyDone ? 'Concluído hoje' : 'Novo hoje', dot: !dailyDone, onClick: function () { router.startDaily(); } }),
      tile({ icon: '📊', label: 'Ranking', sub: 'Melhores tempos', onClick: function () { router.goRanking(); } }),
      tile({ icon: '⚙️', label: 'Configurações', sub: 'Som e penalidades', onClick: function () { router.goSettings(); } })
    ]);
    screen.appendChild(grid);

    return screen;
  }

  // Legenda do tile da Aventura: recorde local (fases vencidas) ou o texto padrão.
  function adventureSub(mode, fallback) {
    try {
      var best = BessDoku.Adventure && BessDoku.Adventure.getBest(mode);
      if (best && best.bestPhasesWon > 0) {
        return 'Recorde: ' + best.bestPhasesWon + (best.bestPhasesWon === 1 ? ' fase' : ' fases');
      }
    } catch (e) { /* sem recorde */ }
    return fallback;
  }

  function isDailyDoneToday() {
    try {
      var key = 'daily:' + BessDoku.Dates.toISODateString();
      var data = BessDoku.Storage.get(key, null);
      return !!(data && data.completed);
    } catch (e) { return false; }
  }

  BessDoku.HomeScreen = { render: render };
})(window.BessDoku);
