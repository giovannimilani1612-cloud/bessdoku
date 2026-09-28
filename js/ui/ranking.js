/*
 * BESS Doku — ui/ranking.js
 * Tela de ranking local: filtra por dificuldade e mostra os melhores tempos.
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var Difficulty = BessDoku.Difficulty;
  var Timer = BessDoku.Timer;
  var Ranking = BessDoku.Ranking;
  var Dates = BessDoku.Dates;

  function render(router) {
    var screen = Dom.el('div', { class: 'screen screen--ranking container-scroll' });
    var currentFilter = 'all';

    screen.appendChild(Dom.el('div', { class: 'topbar' }, [
      Dom.el('button', { class: 'btn btn--icon', text: '←', onClick: function () { router.goHome(); } }),
      Dom.el('div', { class: 'topbar__title', text: 'Ranking' }),
      Dom.el('div', { style: 'width:46px' })
    ]));

    var segmented = Dom.el('div', { class: 'segmented' });
    var listWrap = Dom.el('div', { class: 'stack' });

    var options = [{ key: 'all', label: 'Todos' }].concat(
      Difficulty.list().map(function (t) { return { key: t.key, label: t.label }; })
    );

    function buildList() {
      Dom.clear(listWrap);
      var entries = currentFilter === 'all' ? Ranking.list() : Ranking.list({ difficulty: currentFilter });
      if (entries.length === 0) {
        listWrap.appendChild(Dom.el('p', { class: 'text-center text-secondary', text: 'Nenhum resultado ainda. Jogue uma partida para aparecer aqui!' }));
        return;
      }
      entries.slice(0, 50).forEach(function (entry, idx) {
        var pos = idx + 1;
        var tier = Difficulty.get(entry.difficulty);
        listWrap.appendChild(Dom.el('div', { class: 'ranking-row' }, [
          Dom.el('div', { class: 'ranking-row__pos ranking-row__pos--' + pos, text: String(pos) }),
          Dom.el('div', { class: 'ranking-row__info' }, [
            Dom.el('div', { class: 'ranking-row__name', text: entry.name || 'Jogador' }),
            Dom.el('div', { class: 'ranking-row__meta', text: tier.label + ' · ' + Dates.formatDisplayDate(entry.date) + ' · ' + entry.errorCount + ' erro(s)' })
          ]),
          Dom.el('div', { class: 'ranking-row__time', text: Timer.format(entry.finalTimeMs) })
        ]));
      });
    }

    options.forEach(function (opt) {
      var btn = Dom.el('button', {
        type: 'button',
        text: opt.label,
        class: opt.key === currentFilter ? 'is-active' : '',
        onClick: function () {
          currentFilter = opt.key;
          Dom.qsa('button', segmented).forEach(function (b) { b.classList.remove('is-active'); });
          btn.classList.add('is-active');
          buildList();
        }
      });
      segmented.appendChild(btn);
    });

    screen.appendChild(segmented);
    screen.appendChild(listWrap);
    buildList();

    return screen;
  }

  BessDoku.RankingScreen = { render: render };
})(window.BessDoku);
