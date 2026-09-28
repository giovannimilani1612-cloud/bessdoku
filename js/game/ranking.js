/*
 * BESS Doku — game/ranking.js
 * Ranking local e melhores tempos por dificuldade. Implementado atrás de uma
 * interface de adaptador simples para permitir, no futuro, um backend online
 * sem alterar a camada de UI.
 */
(function (BessDoku) {
  'use strict';

  var Storage = BessDoku.Storage;
  var RANKING_KEY = 'ranking';
  var BEST_TIMES_KEY = 'bestTimes';
  var MAX_ENTRIES = 200;

  function getRankingData() {
    return Storage.withSchema(Storage.get(RANKING_KEY, null), { entries: [] }, 1);
  }

  function getBestTimesData() {
    return Storage.withSchema(Storage.get(BEST_TIMES_KEY, null), { byDifficulty: {} }, 1);
  }

  function updateBestTime(entry) {
    var data = getBestTimesData();
    var current = data.byDifficulty[entry.difficulty];
    if (!current || entry.finalTimeMs < current.finalTimeMs) {
      data.byDifficulty[entry.difficulty] = entry;
      Storage.set(BEST_TIMES_KEY, data);
    }
    return data;
  }

  var LocalRankingAdapter = {
    list: function (filter) {
      var data = getRankingData();
      var entries = data.entries.slice();
      if (filter && filter.difficulty) {
        entries = entries.filter(function (e) { return e.difficulty === filter.difficulty; });
      }
      entries.sort(function (a, b) { return a.finalTimeMs - b.finalTimeMs; });
      return entries;
    },
    submit: function (entry) {
      var data = getRankingData();
      var full = Object.assign({
        id: 'r' + Date.now() + Math.floor(Math.random() * 1000),
        date: BessDoku.Dates.toISODateString()
      }, entry);
      data.entries.push(full);
      data.entries.sort(function (a, b) { return a.finalTimeMs - b.finalTimeMs; });
      if (data.entries.length > MAX_ENTRIES) data.entries = data.entries.slice(0, MAX_ENTRIES);
      Storage.set(RANKING_KEY, data);
      updateBestTime(full);
      return full;
    }
  };

  BessDoku.Ranking = {
    adapter: LocalRankingAdapter,
    list: LocalRankingAdapter.list,
    submit: LocalRankingAdapter.submit,
    getBestTimes: function () { return getBestTimesData().byDifficulty; }
  };
})(window.BessDoku);
