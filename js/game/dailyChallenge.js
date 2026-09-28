/*
 * BESS Doku — game/dailyChallenge.js
 * Um único puzzle determinístico por data (baseado em seed derivada da data),
 * persistido para que recarregar a página no mesmo dia sempre retome o mesmo
 * desafio — nunca gera um puzzle novo para uma data já iniciada/concluída.
 */
(function (BessDoku) {
  'use strict';

  var Storage = BessDoku.Storage;
  var Dates = BessDoku.Dates;

  function todayKey() {
    return Dates.toISODateString();
  }

  function storageKey(dateStr) {
    return 'daily:' + dateStr;
  }

  function tierForDate(dateStr) {
    var parts = dateStr.split('-').map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    var doy = Dates.dayOfYear(date);
    return BessDoku.Difficulty.tierForDayIndex(doy);
  }

  async function loadOrCreate(dateStr) {
    dateStr = dateStr || todayKey();
    var key = storageKey(dateStr);
    var existing = Storage.get(key, null);
    if (existing && existing.puzzle) {
      return Storage.withSchema(existing, { puzzle: null, board: null, completed: false, result: null }, 1);
    }
    var tier = tierForDate(dateStr);
    var puzzle = await BessDoku.Generator.generatePuzzleAsync(tier.key, 'daily:' + dateStr);
    var data = { schemaVersion: 1, dateStr: dateStr, puzzle: puzzle, board: null, completed: false, result: null };
    Storage.set(key, data);
    return data;
  }

  function save(dateStr, data) {
    Storage.set(storageKey(dateStr), data);
  }

  BessDoku.DailyChallenge = {
    todayKey: todayKey,
    tierForDate: tierForDate,
    loadOrCreate: loadOrCreate,
    save: save
  };
})(window.BessDoku);
