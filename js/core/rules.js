/*
 * BESS Doku — core/rules.js
 * As 4 regras fundamentais do puzzle:
 *   1) exatamente um Lulu por linha
 *   2) exatamente um Lulu por coluna
 *   3) exatamente um Lulu por região
 *   4) nenhum Lulu pode ser adjacente a outro (8 direções)
 *
 * Marks: matriz NxN de inteiros. 0 = vazio, 1 = Lulu, 2 = X (marcação do jogador).
 * Regions: matriz NxN de inteiros 0..N-1 identificando a região de cada célula.
 */
(function (BessDoku) {
  'use strict';

  var EMPTY = 0, LULU = 1, MARK_X = 2;

  function inBounds(size, r, c) {
    return r >= 0 && r < size && c >= 0 && c < size;
  }

  function neighborOffsets() {
    return [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];
  }

  function isAdjacent(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
  }

  function findLulus(marks) {
    var found = [];
    for (var r = 0; r < marks.length; r++) {
      for (var c = 0; c < marks[r].length; c++) {
        if (marks[r][c] === LULU) found.push({ row: r, col: c });
      }
    }
    return found;
  }

  // Verifica se colocar um Lulu em (row,col) é uma jogada legal dado o estado atual do tabuleiro.
  // Retorna { ok: boolean, reason: 'row'|'col'|'region'|'adjacent'|null }
  function canPlaceLulu(size, regions, marks, row, col) {
    var lulus = findLulus(marks);
    for (var i = 0; i < lulus.length; i++) {
      var L = lulus[i];
      if (L.row === row && L.col === col) continue;
      if (L.row === row) return { ok: false, reason: 'row' };
      if (L.col === col) return { ok: false, reason: 'col' };
      if (regions[L.row][L.col] === regions[row][col]) return { ok: false, reason: 'region' };
      if (isAdjacent(L.row, L.col, row, col)) return { ok: false, reason: 'adjacent' };
    }
    return { ok: true, reason: null };
  }

  // Valida uma solução completa (um valor de coluna por linha, representando permutação).
  function validateFullSolution(size, regions, solution) {
    if (!solution || solution.length !== size) return false;
    var seenCols = {};
    var seenRegions = {};
    for (var r = 0; r < size; r++) {
      var c = solution[r];
      if (c === undefined || c === null || c < 0 || c >= size) return false;
      if (seenCols[c]) return false;
      seenCols[c] = true;
      var reg = regions[r][c];
      if (seenRegions[reg]) return false;
      seenRegions[reg] = true;
      if (r > 0) {
        var prevC = solution[r - 1];
        if (Math.abs(prevC - c) <= 1) return false; // linhas consecutivas adjacentes
      }
    }
    return true;
  }

  // Verifica se o estado atual do tabuleiro (marks) representa o puzzle resolvido:
  // exatamente um Lulu por linha/coluna/região e nenhuma adjacência entre eles.
  function isSolved(size, regions, marks) {
    var lulus = findLulus(marks);
    if (lulus.length !== size) return false;
    var rowsSeen = {}, colsSeen = {}, regionsSeen = {};
    for (var i = 0; i < lulus.length; i++) {
      var L = lulus[i];
      if (rowsSeen[L.row]) return false;
      rowsSeen[L.row] = true;
      if (colsSeen[L.col]) return false;
      colsSeen[L.col] = true;
      var reg = regions[L.row][L.col];
      if (regionsSeen[reg]) return false;
      regionsSeen[reg] = true;
    }
    for (var a = 0; a < lulus.length; a++) {
      for (var b = a + 1; b < lulus.length; b++) {
        if (isAdjacent(lulus[a].row, lulus[a].col, lulus[b].row, lulus[b].col)) return false;
      }
    }
    return true;
  }

  function emptyMarks(size) {
    var m = [];
    for (var r = 0; r < size; r++) {
      m.push(new Array(size).fill(EMPTY));
    }
    return m;
  }

  BessDoku.Rules = {
    EMPTY: EMPTY,
    LULU: LULU,
    MARK_X: MARK_X,
    inBounds: inBounds,
    neighborOffsets: neighborOffsets,
    isAdjacent: isAdjacent,
    findLulus: findLulus,
    canPlaceLulu: canPlaceLulu,
    validateFullSolution: validateFullSolution,
    isSolved: isSolved,
    emptyMarks: emptyMarks
  };
})(window.BessDoku);
