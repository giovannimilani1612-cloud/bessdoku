/*
 * BESS Doku — core/model.js
 * Fábricas para os dois tipos de dado centrais do jogo:
 *   Puzzle     -> imutável, compartilhável entre os jogadores de um mesmo round.
 *   BoardState -> mutável, uma instância por tentativa/jogador (nunca compartilhada).
 */
(function (BessDoku) {
  'use strict';

  var Storage = BessDoku.Storage;
  var Rules = BessDoku.Rules;

  function nextPuzzleId() {
    var year = new Date().getFullYear();
    var counter = Storage.withSchema(Storage.get('idCounter', null), { value: 0 }, 1);
    counter.value += 1;
    Storage.set('idCounter', counter);
    var padded = String(counter.value);
    while (padded.length < 6) padded = '0' + padded;
    return 'BESS-' + year + '-' + padded;
  }

  function buildPuzzle(candidate, tierKey, seed) {
    return {
      id: nextPuzzleId(),
      size: candidate.size,
      solution: candidate.solution.slice(),
      regions: candidate.regions.map(function (row) { return row.slice(); }),
      seed: seed,
      difficultyTier: tierKey,
      difficultyInfo: candidate.difficultyInfo,
      createdAt: Date.now()
    };
  }

  function createBoardState(puzzleId, playerLabel) {
    return {
      puzzleId: puzzleId,
      playerLabel: playerLabel || 'solo',
      marks: null, // preenchido pelo chamador com Rules.emptyMarks(size)
      startedAt: null,
      elapsedMs: 0,
      finished: false,
      finishedAt: null,
      errorCount: 0,
      hintCount: 0,
      moveCount: 0,
      penaltySeconds: 0,
      finalTimeMs: null,
      history: []
    };
  }

  function freshBoardState(puzzle, playerLabel) {
    var board = createBoardState(puzzle.id, playerLabel);
    board.marks = Rules.emptyMarks(puzzle.size);
    return board;
  }

  BessDoku.Model = {
    nextPuzzleId: nextPuzzleId,
    buildPuzzle: buildPuzzle,
    createBoardState: createBoardState,
    freshBoardState: freshBoardState
  };
})(window.BessDoku);
