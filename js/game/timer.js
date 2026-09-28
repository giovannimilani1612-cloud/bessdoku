/*
 * BESS Doku — game/timer.js
 * Cronômetro de alta resolução (baseado em performance.now) usado em toda partida.
 */
(function (BessDoku) {
  'use strict';

  function createTimer(initialMs) {
    var startTs = null;
    var accumulatedMs = initialMs || 0;
    var running = false;

    return {
      start: function () {
        startTs = performance.now();
        running = true;
      },
      stop: function () {
        if (running) {
          accumulatedMs += performance.now() - startTs;
          running = false;
        }
        return accumulatedMs;
      },
      reset: function () {
        startTs = null;
        accumulatedMs = 0;
        running = false;
      },
      getElapsedMs: function () {
        if (running) return accumulatedMs + (performance.now() - startTs);
        return accumulatedMs;
      },
      isRunning: function () { return running; }
    };
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  // Formata milissegundos como MM:SS.cc (centésimos), ex.: "00:32.47"
  function format(ms) {
    if (!isFinite(ms) || ms < 0) ms = 0;
    var totalCentis = Math.floor(ms / 10);
    var centis = totalCentis % 100;
    var totalSeconds = Math.floor(totalCentis / 100);
    var seconds = totalSeconds % 60;
    var minutes = Math.floor(totalSeconds / 60);
    return pad2(minutes) + ':' + pad2(seconds) + '.' + pad2(centis);
  }

  BessDoku.Timer = {
    create: createTimer,
    format: format
  };
})(window.BessDoku);
