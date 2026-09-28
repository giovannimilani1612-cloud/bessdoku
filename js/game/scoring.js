/*
 * BESS Doku — game/scoring.js
 * TEMPO FINAL = TEMPO REAL + PENALIDADES.
 * As penalidades (erros e, se habilitado, dicas) são acumuladas em
 * `board.penaltySeconds` pelo Session no momento em que acontecem; aqui só
 * fica a conversão para o tempo final.
 */
(function (BessDoku) {
  'use strict';

  function computeFinalTimeMs(realTimeMs, penaltySeconds) {
    return realTimeMs + penaltySeconds * 1000;
  }

  BessDoku.Scoring = {
    computeFinalTimeMs: computeFinalTimeMs
  };
})(window.BessDoku);
