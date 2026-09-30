/*
 * BESS Doku — ui/home.js
 * Tela inicial: pôster do BESS, nome do jogo e o menu principal em hierarquia
 * (Jogar em destaque › modos em dupla coluna › Diário › atalhos compactos).
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var Characters = BessDoku.Characters;

  // opts: { icon, label, sub, tone, primary, wide, compact, dot, chevron, onClick }
  function tile(opts) {
    var text = [Dom.el('span', { class: 'menu-tile__label', text: opts.label })];
    if (opts.sub) text.push(Dom.el('span', { class: 'menu-tile__sub', text: opts.sub }));

    var children = [
      Dom.el('span', { class: 'menu-tile__icon', 'aria-hidden': 'true', text: opts.icon }),
      Dom.el('span', { class: 'menu-tile__text' }, text)
    ];
    if (opts.chevron) children.push(Dom.el('span', { class: 'menu-tile__chevron', 'aria-hidden': 'true', text: '›' }));
    if (opts.dot) children.push(Dom.el('span', { class: 'menu-tile__dot' }));

    var cls = 'menu-tile'
      + (opts.primary ? ' menu-tile--primary' : '')
      + (opts.wide ? ' menu-tile--wide' : '')
      + (opts.compact ? ' menu-tile--compact' : '')
      + (opts.tone ? ' menu-tile--tone-' + opts.tone : '');

    return Dom.el('button', {
      type: 'button',
      class: cls,
      'aria-label': opts.sub ? opts.label + '. ' + opts.sub : opts.label,
      onClick: opts.onClick
    }, children);
  }

  function render(router) {
    var dailyDone = BessDoku.DailyChallenge && isDailyDoneToday();

    var screen = Dom.el('div', { class: 'screen screen--home container-scroll' });

    screen.appendChild(Characters.buildHeroPoster(Characters.DEFAULT_KEY, { idle: true }));

    screen.appendChild(Dom.el('div', { class: 'brand' }, [
      Dom.el('h1', { class: 'brand__title' }, ['BESS ', Dom.el('em', { text: 'Doku' })]),
      Dom.el('p', { class: 'brand__tagline', text: 'Pense como um Lulu!' })
    ]));

    var grid = Dom.el('div', { class: 'menu-grid' }, [
      tile({ icon: '🐾', label: 'Jogar', sub: 'Modo Solo', primary: true, wide: true, chevron: true, onClick: function () { router.goDifficultySelect('solo'); } }),
      tile({ icon: '🗺️', label: 'Aventura', sub: adventureSub('solo', 'Contra o relógio'), tone: 'gold', onClick: function () { router.startAdventure('solo'); } }),
      tile({ icon: '🤝', label: 'Aventura em Dupla', sub: adventureSub('team', '2 jogadores, 1 relógio'), tone: 'mint', onClick: function () { router.startAdventure('team'); } }),
      tile({ icon: '⚔️', label: 'Duelo', sub: 'BESS Doku Duel', tone: 'sky', onClick: function () { router.goDifficultySelect('duel'); } }),
      tile({ icon: '🏆', label: 'Melhor de 3', sub: '2 jogadores', tone: 'lilac', onClick: function () { router.goDifficultySelect('bo3'); } }),
      tile({ icon: '📅', label: 'Desafio Diário', sub: dailyDone ? 'Concluído hoje' : 'Novo tabuleiro hoje', tone: 'peach', wide: true, dot: !dailyDone, onClick: function () { router.startDaily(); } }),
      tile({ icon: '📊', label: 'Ranking', sub: 'Melhores tempos', tone: 'coral', compact: true, onClick: function () { router.goRanking(); } }),
      tile({ icon: '⚙️', label: 'Configurações', sub: 'Som e penalidades', tone: 'gold', compact: true, onClick: function () { router.goSettings(); } })
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
