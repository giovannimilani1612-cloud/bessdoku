/*
 * BESS Doku — core/solver.js
 * Motor lógico: propagação de restrições (eliminação) + busca com backtracking.
 * Usado para: (1) garantir solução única na geração, (2) dar dicas lógicas,
 * (3) medir a dificuldade "humana" de um puzzle gerado.
 *
 * Estado interno do resolvedor (não confundir com BoardState do jogador):
 *   possible[r][c]  -> booleano, se a célula ainda é candidata a receber o Lulu
 *   rowPlaced[r]    -> coluna decidida para a linha r, ou -1
 *   colPlaced[c]    -> linha decidida para a coluna c, ou -1
 *   regionPlaced[g] -> {row,col} decidido para a região g, ou -1
 */
(function (BessDoku) {
  'use strict';

  var Rules = BessDoku.Rules;

  function cloneState(state) {
    return {
      possible: state.possible.map(function (row) { return row.slice(); }),
      rowPlaced: state.rowPlaced.slice(),
      colPlaced: state.colPlaced.slice(),
      regionPlaced: state.regionPlaced.slice()
    };
  }

  function makeEmptyState(size) {
    var possible = [];
    for (var r = 0; r < size; r++) possible.push(new Array(size).fill(true));
    return {
      possible: possible,
      rowPlaced: new Array(size).fill(-1),
      colPlaced: new Array(size).fill(-1),
      regionPlaced: new Array(size).fill(-1)
    };
  }

  // Coloca um Lulu em (r,c) e propaga as eliminações imediatas (linha/coluna/região/adjacência).
  // Retorna um NOVO estado (não muta o recebido).
  function place(stateIn, r, c, size, regions) {
    var state = cloneState(stateIn);
    var region = regions[r][c];
    state.rowPlaced[r] = c;
    state.colPlaced[c] = r;
    state.regionPlaced[region] = { row: r, col: c };
    for (var r2 = 0; r2 < size; r2++) {
      for (var c2 = 0; c2 < size; c2++) {
        if (r2 === r && c2 === c) continue;
        if (r2 === r || c2 === c || regions[r2][c2] === region || Rules.isAdjacent(r, c, r2, c2)) {
          state.possible[r2][c2] = false;
        }
      }
    }
    return state;
  }

  function buildInitialState(size, regions, marks) {
    var state = makeEmptyState(size);
    if (!marks) return state;
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (marks[r][c] === Rules.MARK_X) state.possible[r][c] = false;
      }
    }
    for (r = 0; r < size; r++) {
      for (c = 0; c < size; c++) {
        if (marks[r][c] === Rules.LULU) {
          state = place(state, r, c, size, regions);
        }
      }
    }
    return state;
  }

  function candidatesForRow(state, size, r) {
    if (state.rowPlaced[r] !== -1) return [state.rowPlaced[r]];
    var out = [];
    for (var c = 0; c < size; c++) {
      if (state.possible[r][c] && state.colPlaced[c] === -1) out.push(c);
    }
    return out;
  }

  function candidatesForCol(state, size, c) {
    if (state.colPlaced[c] !== -1) return [state.colPlaced[c]];
    var out = [];
    for (var r = 0; r < size; r++) {
      if (state.possible[r][c] && state.rowPlaced[r] === -1) out.push(r);
    }
    return out;
  }

  function cellsForRegion(state, size, regions, region) {
    var out = [];
    for (var r = 0; r < size; r++) {
      if (state.rowPlaced[r] !== -1) continue;
      for (var c = 0; c < size; c++) {
        if (regions[r][c] === region && state.possible[r][c] && state.colPlaced[c] === -1) {
          out.push({ row: r, col: c });
        }
      }
    }
    return out;
  }

  function allRowsPlaced(state, size) {
    for (var r = 0; r < size; r++) if (state.rowPlaced[r] === -1) return false;
    return true;
  }

  // Propaga deduções lógicas até ponto fixo ou contradição.
  // Retorna { contradiction: boolean, state, forcedCount: número de linhas resolvidas por esta chamada }
  function propagate(stateIn, size, regions) {
    var state = stateIn;
    var forcedCount = 0;
    var changed = true;
    while (changed) {
      changed = false;

      // Singleton de linha
      for (var r = 0; r < size; r++) {
        if (state.rowPlaced[r] !== -1) continue;
        var rowCands = candidatesForRow(state, size, r);
        if (rowCands.length === 0) return { contradiction: true, state: state, forcedCount: forcedCount };
        if (rowCands.length === 1) { state = place(state, r, rowCands[0], size, regions); changed = true; forcedCount++; }
      }
      if (changed) continue;

      // Singleton de coluna
      for (var c = 0; c < size; c++) {
        if (state.colPlaced[c] !== -1) continue;
        var colCands = candidatesForCol(state, size, c);
        if (colCands.length === 0) return { contradiction: true, state: state, forcedCount: forcedCount };
        if (colCands.length === 1) { state = place(state, colCands[0], c, size, regions); changed = true; forcedCount++; }
      }
      if (changed) continue;

      // Singleton de região
      for (var g = 0; g < size; g++) {
        if (state.regionPlaced[g] !== -1) continue;
        var regionCells = cellsForRegion(state, size, regions, g);
        if (regionCells.length === 0) return { contradiction: true, state: state, forcedCount: forcedCount };
        if (regionCells.length === 1) { state = place(state, regionCells[0].row, regionCells[0].col, size, regions); changed = true; forcedCount++; }
      }
      if (changed) continue;

      // Interseção região -> linha/coluna: se os candidatos restantes de uma região
      // estão todos numa mesma linha (ou coluna), elimina outras regiões dessa linha/coluna.
      for (g = 0; g < size; g++) {
        if (state.regionPlaced[g] !== -1) continue;
        var cells = cellsForRegion(state, size, regions, g);
        if (cells.length === 0) continue;
        var rowsSet = {}, colsSet = {};
        cells.forEach(function (cell) { rowsSet[cell.row] = true; colsSet[cell.col] = true; });
        var rowKeys = Object.keys(rowsSet), colKeys = Object.keys(colsSet);
        if (rowKeys.length === 1) {
          var onlyRow = Number(rowKeys[0]);
          for (var cc = 0; cc < size; cc++) {
            if (regions[onlyRow][cc] !== g && state.possible[onlyRow][cc] && state.rowPlaced[onlyRow] === -1) {
              state.possible[onlyRow][cc] = false; changed = true;
            }
          }
        }
        if (colKeys.length === 1) {
          var onlyCol = Number(colKeys[0]);
          for (var rr = 0; rr < size; rr++) {
            if (regions[rr][onlyCol] !== g && state.possible[rr][onlyCol] && state.colPlaced[onlyCol] === -1) {
              state.possible[rr][onlyCol] = false; changed = true;
            }
          }
        }
      }
      if (changed) continue;

      // Contenção linha/coluna -> região: se os candidatos restantes de uma linha (ou coluna)
      // pertencem todos a uma mesma região, elimina o resto daquela região fora da linha/coluna.
      for (r = 0; r < size; r++) {
        if (state.rowPlaced[r] !== -1) continue;
        var rc = candidatesForRow(state, size, r);
        if (rc.length === 0) continue;
        var regSet = {};
        rc.forEach(function (col) { regSet[regions[r][col]] = true; });
        var regKeys = Object.keys(regSet);
        if (regKeys.length === 1) {
          var onlyReg = Number(regKeys[0]);
          for (var r2 = 0; r2 < size; r2++) {
            if (r2 === r || state.rowPlaced[r2] !== -1) continue;
            for (var c2 = 0; c2 < size; c2++) {
              if (regions[r2][c2] === onlyReg && state.possible[r2][c2]) { state.possible[r2][c2] = false; changed = true; }
            }
          }
        }
      }
      if (changed) continue;

      for (c = 0; c < size; c++) {
        if (state.colPlaced[c] !== -1) continue;
        var ccands = candidatesForCol(state, size, c);
        if (ccands.length === 0) continue;
        var regSet2 = {};
        ccands.forEach(function (row) { regSet2[regions[row][c]] = true; });
        var regKeys2 = Object.keys(regSet2);
        if (regKeys2.length === 1) {
          var onlyReg2 = Number(regKeys2[0]);
          for (var c3 = 0; c3 < size; c3++) {
            if (c3 === c || state.colPlaced[c3] !== -1) continue;
            for (var r3 = 0; r3 < size; r3++) {
              if (regions[r3][c3] === onlyReg2 && state.possible[r3][c3]) { state.possible[r3][c3] = false; changed = true; }
            }
          }
        }
      }
    }
    return { contradiction: false, state: state, forcedCount: forcedCount };
  }

  function pickRowWithFewestCandidates(state, size) {
    var best = -1, bestCount = Infinity;
    for (var r = 0; r < size; r++) {
      if (state.rowPlaced[r] !== -1) continue;
      var count = candidatesForRow(state, size, r).length;
      if (count < bestCount) { bestCount = count; best = r; }
    }
    return best;
  }

  // Conta soluções até um limite (capAt), com corte antecipado. Usado para checar unicidade.
  function countSolutions(size, regions, capAt, marks) {
    capAt = capAt || 2;
    var initial = buildInitialState(size, regions, marks || null);
    var prop = propagate(initial, size, regions);
    if (prop.contradiction) return { count: 0 };
    if (allRowsPlaced(prop.state, size)) return { count: 1, solution: prop.state.rowPlaced.slice() };

    var count = 0;
    var firstSolution = null;
    function search(state) {
      if (count >= capAt) return;
      var row = pickRowWithFewestCandidates(state, size);
      if (row === -1) { count++; if (!firstSolution) firstSolution = state.rowPlaced.slice(); return; }
      var cands = candidatesForRow(state, size, row);
      for (var i = 0; i < cands.length; i++) {
        if (count >= capAt) return;
        var next = place(state, row, cands[i], size, regions);
        var p = propagate(next, size, regions);
        if (p.contradiction) continue;
        if (allRowsPlaced(p.state, size)) { count++; if (!firstSolution) firstSolution = p.state.rowPlaced.slice(); continue; }
        search(p.state);
      }
    }
    search(prop.state);
    return { count: Math.min(count, capAt), solution: firstSolution };
  }

  // Encontra uma célula que o jogador é logicamente obrigado a preencher, dado o estado atual.
  // Prioriza dedução pura; se a propagação empacar, revela a próxima célula da solução conhecida.
  function findForcedCell(size, regions, marks, knownSolution) {
    var initial = buildInitialState(size, regions, marks);
    var prop = propagate(initial, size, regions);
    if (!prop.contradiction) {
      for (var r = 0; r < size; r++) {
        var alreadyPlaced = marks[r].indexOf(Rules.LULU) !== -1;
        if (!alreadyPlaced && prop.state.rowPlaced[r] !== -1) {
          return { row: r, col: prop.state.rowPlaced[r], reason: 'logic' };
        }
      }
    }
    if (knownSolution) {
      for (r = 0; r < size; r++) {
        if (marks[r].indexOf(Rules.LULU) === -1) {
          return { row: r, col: knownSolution[r], reason: 'reveal' };
        }
      }
    }
    return null;
  }

  // Mede a "dificuldade humana" de um puzzle: quanto ele resolve por pura lógica
  // vs. quanto exige tentativa/erro (profundidade e amplitude de decisões de busca).
  function rateDifficulty(size, regions, solution) {
    var initial = makeEmptyState(size);
    var prop = propagate(initial, size, regions);
    var forcedStepsCount = prop.contradiction ? 0 : countPlacedRows(prop.state, size);

    if (!prop.contradiction && forcedStepsCount === size) {
      return { complexity: 0, pureLogicSolvable: true, guessDepth: 0, forcedStepsCount: size, branchingFactorSum: 0 };
    }

    var maxDepth = 0;
    var branchSum = 0;
    var visitedGuard = { count: 0 };

    function search(state, depth) {
      visitedGuard.count++;
      if (visitedGuard.count > 200000) return false; // salvaguarda de desempenho
      var row = pickRowWithFewestCandidates(state, size);
      if (row === -1) return true;
      var cands = candidatesForRow(state, size, row);
      branchSum += Math.max(0, cands.length - 1);
      maxDepth = Math.max(maxDepth, depth + 1);
      for (var i = 0; i < cands.length; i++) {
        var next = place(state, row, cands[i], size, regions);
        var p = propagate(next, size, regions);
        if (p.contradiction) continue;
        if (allRowsPlaced(p.state, size)) return true;
        if (search(p.state, depth + 1)) return true;
      }
      return false;
    }

    var startState = prop.contradiction ? initial : prop.state;
    search(startState, 0);

    var complexity = (size - forcedStepsCount) * 10 + maxDepth * 25 + branchSum * 5;
    return {
      complexity: complexity,
      pureLogicSolvable: false,
      guessDepth: maxDepth,
      forcedStepsCount: forcedStepsCount,
      branchingFactorSum: branchSum
    };
  }

  function countPlacedRows(state, size) {
    var n = 0;
    for (var r = 0; r < size; r++) if (state.rowPlaced[r] !== -1) n++;
    return n;
  }

  BessDoku.Solver = {
    buildInitialState: buildInitialState,
    propagate: propagate,
    place: place,
    countSolutions: countSolutions,
    findForcedCell: findForcedCell,
    rateDifficulty: rateDifficulty,
    allRowsPlaced: allRowsPlaced
  };
})(window.BessDoku);
