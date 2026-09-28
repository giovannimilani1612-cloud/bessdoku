/*
 * BESS Doku — game/hints.js
 * Interface fina sobre o resolvedor lógico para o sistema de dicas.
 */
(function (BessDoku) {
  'use strict';

  function computeHint(puzzle, marks) {
    return BessDoku.Solver.findForcedCell(puzzle.size, puzzle.regions, marks, puzzle.solution);
  }

  BessDoku.Hints = {
    computeHint: computeHint
  };
})(window.BessDoku);
