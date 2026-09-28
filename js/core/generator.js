/*
 * BESS Doku — core/generator.js
 * Gera puzzles válidos, com solução única, para uma dada dificuldade:
 *   1) permutação-solução respeitando a regra de não-adjacência entre linhas consecutivas
 *   2) crescimento aleatório de regiões conectadas a partir das células-solução
 *   3) verificação de unicidade via Solver.countSolutions
 *   4) aceitação por faixa de complexidade (dificuldade "humana"), com fallback
 *      para o melhor candidato único encontrado se o limite de tentativas for atingido
 */
(function (BessDoku) {
  'use strict';

  var Rng = BessDoku.Rng;
  var Solver = BessDoku.Solver;
  var Difficulty = BessDoku.Difficulty;
  var Model = BessDoku.Model;

  function generateSolutionPermutation(size, rng) {
    for (var attempt = 0; attempt < 40; attempt++) {
      var perm = rng.shuffle(baseRange(size));
      if (isAdjacencySafe(perm)) return perm;
    }
    return backtrackPermutation(size, rng);
  }

  function baseRange(size) {
    var arr = [];
    for (var i = 0; i < size; i++) arr.push(i);
    return arr;
  }

  function isAdjacencySafe(perm) {
    for (var i = 1; i < perm.length; i++) {
      if (Math.abs(perm[i] - perm[i - 1]) <= 1) return false;
    }
    return true;
  }

  function backtrackPermutation(size, rng) {
    var used = new Array(size).fill(false);
    var perm = [];

    function tryRow(rowIndex) {
      if (rowIndex === size) return true;
      var candidates = rng.shuffle(baseRange(size)).filter(function (c) { return !used[c]; });
      for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];
        if (rowIndex > 0 && Math.abs(c - perm[rowIndex - 1]) <= 1) continue;
        used[c] = true;
        perm.push(c);
        if (tryRow(rowIndex + 1)) return true;
        perm.pop();
        used[c] = false;
      }
      return false;
    }

    if (!tryRow(0)) {
      throw new Error('Não foi possível gerar uma permutação-solução válida para tamanho ' + size);
    }
    return perm;
  }

  function neighbors4(size, r, c) {
    var out = [];
    if (r > 0) out.push([r - 1, c]);
    if (r < size - 1) out.push([r + 1, c]);
    if (c > 0) out.push([r, c - 1]);
    if (c < size - 1) out.push([r, c + 1]);
    return out;
  }

  function growRegions(size, solution, rng) {
    var regionOf = [];
    for (var r = 0; r < size; r++) regionOf.push(new Array(size).fill(-1));
    for (r = 0; r < size; r++) regionOf[r][solution[r]] = r;

    var frontiers = [];
    for (var g = 0; g < size; g++) frontiers.push([]);
    for (g = 0; g < size; g++) {
      neighbors4(size, g, solution[g]).forEach(function (n) {
        if (regionOf[n[0]][n[1]] === -1) frontiers[g].push(n);
      });
    }

    var unclaimed = size * size - size;
    var guard = 0;
    var maxGuard = size * size * 20 + 100;
    var regionSizes = new Array(size).fill(1); // cada região começa com sua célula-semente

    // Crescimento equilibrado: a cada passo, a região MENOR entre as ativas cresce.
    // Isso evita que uma única região vire um "blob" gigante (o que deixa o puzzle
    // com muitas soluções alternativas) e produz regiões de tamanho mais parecido,
    // que restringem melhor o tabuleiro — essencial para conseguir solução única
    // em tamanhos maiores (7x7 em diante).
    while (unclaimed > 0) {
      guard++;
      if (guard > maxGuard) return null;

      var activeRegions = [];
      for (g = 0; g < size; g++) {
        frontiers[g] = frontiers[g].filter(function (cell) { return regionOf[cell[0]][cell[1]] === -1; });
        if (frontiers[g].length > 0) activeRegions.push(g);
      }
      if (activeRegions.length === 0) return null;

      var minSize = Infinity;
      activeRegions.forEach(function (g2) { if (regionSizes[g2] < minSize) minSize = regionSizes[g2]; });
      var smallestRegions = activeRegions.filter(function (g2) { return regionSizes[g2] === minSize; });
      var region = rng.pick(smallestRegions);

      var idx = rng.int(frontiers[region].length);
      var cell = frontiers[region][idx];
      var cr = cell[0], cc = cell[1];
      if (regionOf[cr][cc] !== -1) continue;

      regionOf[cr][cc] = region;
      regionSizes[region]++;
      unclaimed--;
      neighbors4(size, cr, cc).forEach(function (n) {
        if (regionOf[n[0]][n[1]] === -1) frontiers[region].push(n);
      });
    }
    return regionOf;
  }

  function cloneRegions(regions) {
    return regions.map(function (row) { return row.slice(); });
  }

  // Verifica se a região `region` continua conectada (alcançável a partir da sua
  // célula-semente) se a célula (excludeR,excludeC) for removida dela. Usada para
  // garantir que o reparo por busca local nunca quebre uma região em pedaços.
  function isRegionConnectedWithout(regionOf, size, region, excludeR, excludeC, seedR, seedC) {
    var total = 0;
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (regionOf[r][c] === region && !(r === excludeR && c === excludeC)) total++;
      }
    }
    if (total === 0) return true;
    var visited = {};
    var stack = [[seedR, seedC]];
    visited[seedR + '_' + seedC] = true;
    var count = 0;
    while (stack.length) {
      var cur = stack.pop();
      count++;
      neighbors4(size, cur[0], cur[1]).forEach(function (n) {
        var key = n[0] + '_' + n[1];
        if (!visited[key] && regionOf[n[0]][n[1]] === region && !(n[0] === excludeR && n[1] === excludeC)) {
          visited[key] = true;
          stack.push(n);
        }
      });
    }
    return count === total;
  }

  // Reparo por busca local (hill-climbing): tenta mover, uma célula por vez, uma
  // célula de fronteira entre duas regiões vizinhas, mantendo sempre a conectividade
  // e nunca movendo a célula-semente (que é a própria célula-solução daquela
  // região). A cada movimento que não piora o número de soluções encontradas,
  // o movimento é aceito. Isso reduz progressivamente a ambiguidade do puzzle até
  // chegar a solução única (ou esgotar o orçamento de iterações). Regiões geradas
  // puramente por crescimento aleatório raramente são únicas em tabuleiros maiores
  // (7x7+) — este reparo é o que torna a geração confiável nesses tamanhos.
  function repairToUniqueSolution(size, regions, solution, rng, maxIters, solverCap) {
    var current = cloneRegions(regions);
    var seedOf = [];
    for (var g = 0; g < size; g++) seedOf.push([g, solution[g]]);

    var bestCount = Solver.countSolutions(size, current, solverCap, null).count;
    if (bestCount === 1) return { regions: current, count: 1 };

    for (var it = 0; it < maxIters; it++) {
      var r = rng.int(size), c = rng.int(size);
      var fromRegion = current[r][c];
      if (r === seedOf[fromRegion][0] && c === seedOf[fromRegion][1]) continue;

      var neighborCells = neighbors4(size, r, c).filter(function (n) { return current[n[0]][n[1]] !== fromRegion; });
      if (neighborCells.length === 0) continue;
      var target = rng.pick(neighborCells);
      var toRegion = current[target[0]][target[1]];

      if (!isRegionConnectedWithout(current, size, fromRegion, r, c, seedOf[fromRegion][0], seedOf[fromRegion][1])) continue;

      var candidate = cloneRegions(current);
      candidate[r][c] = toRegion;
      var cnt = Solver.countSolutions(size, candidate, solverCap, null).count;
      if (cnt <= bestCount) {
        current = candidate;
        bestCount = cnt;
        if (bestCount === 1) return { regions: current, count: 1 };
      }
    }
    return { regions: current, count: bestCount };
  }

  // Orçamento do reparo por tamanho de tabuleiro: tabuleiros maiores começam com
  // muito mais soluções alternativas e precisam de mais iterações para convergir.
  var REPAIR_BUDGET_BY_SIZE = {
    4: { maxIters: 150, solverCap: 400 },
    5: { maxIters: 250, solverCap: 800 },
    6: { maxIters: 400, solverCap: 1500 },
    7: { maxIters: 700, solverCap: 3000 },
    8: { maxIters: 1000, solverCap: 5000 },
    9: { maxIters: 1400, solverCap: 6000 }
  };

  // Geradora compartilhada pelas versões síncrona e assíncrona: cada `yield`
  // marca a fronteira de uma tentativa, para que a versão assíncrona possa ceder
  // o controle ao navegador ali (evitando travar a interface em tabuleiros
  // grandes, onde uma tentativa isolada pode levar até ~1-2s).
  function* attemptSequence(tierKey, seedOverride) {
    var tier = Difficulty.get(tierKey);
    var baseSeed = seedOverride || Rng.randomSeedString();
    var budget = REPAIR_BUDGET_BY_SIZE[tier.size] || { maxIters: 600, solverCap: 2000 };
    var best = null;

    for (var attempt = 1; attempt <= tier.maxAttempts; attempt++) {
      var rng = Rng.create(baseSeed + ':attempt:' + attempt);
      var solution;
      try {
        solution = generateSolutionPermutation(tier.size, rng);
      } catch (e) {
        yield { done: false };
        continue;
      }
      var initialRegions = growRegions(tier.size, solution, rng);
      if (!initialRegions) { yield { done: false }; continue; }

      var repaired = repairToUniqueSolution(tier.size, initialRegions, solution, rng, budget.maxIters, budget.solverCap);
      if (repaired.count !== 1) { yield { done: false }; continue; } // não convergiu para solução única no orçamento

      var regions = repaired.regions;
      var info = Solver.rateDifficulty(tier.size, regions, solution);
      var candidate = { size: tier.size, solution: solution, regions: regions, difficultyInfo: info };

      if (info.complexity >= tier.complexityMin && info.complexity <= tier.complexityMax) {
        yield { done: true, puzzle: Model.buildPuzzle(candidate, tierKey, baseSeed) };
        return;
      }
      if (!best || Math.abs(info.complexity - tier.complexityMid) < Math.abs(best.difficultyInfo.complexity - tier.complexityMid)) {
        best = candidate;
      }
      yield { done: false };
    }

    if (best) {
      yield { done: true, puzzle: Model.buildPuzzle(best, tierKey, baseSeed) };
      return;
    }
    yield { done: true, error: new Error('Não foi possível gerar um puzzle único para a dificuldade "' + tierKey + '" após ' + tier.maxAttempts + ' tentativas.') };
  }

  // Versão síncrona (bloqueante) — usada pelo autoteste e por qualquer chamador
  // que aceite travar a thread durante a geração.
  function generatePuzzle(tierKey, seedOverride) {
    var it = attemptSequence(tierKey, seedOverride);
    var step = it.next();
    while (!step.value.done) step = it.next();
    if (step.value.error) throw step.value.error;
    return step.value.puzzle;
  }

  // Cede o controle ao navegador entre tentativas sem usar setTimeout: navegadores
  // limitam temporizadores a ~1 disparo por segundo em abas fora de foco/minimizadas,
  // o que faria uma geração com várias tentativas (tabuleiros maiores) travar por
  // dezenas de segundos nesse cenário. MessageChannel não sofre essa limitação e
  // ainda assim devolve o controle ao navegador entre uma tentativa e outra.
  function yieldToUI() {
    return new Promise(function (resolve) {
      if (typeof MessageChannel === 'function') {
        var channel = new MessageChannel();
        channel.port2.onmessage = function () { resolve(); };
        channel.port1.postMessage(null);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  // Versão assíncrona — cede o controle ao navegador entre tentativas, para que
  // uma tela de carregamento continue animada em vez de travar em tabuleiros
  // grandes (Difícil em diante). Use esta versão em qualquer fluxo de UI.
  async function generatePuzzleAsync(tierKey, seedOverride) {
    var it = attemptSequence(tierKey, seedOverride);
    var step = it.next();
    while (!step.value.done) {
      await yieldToUI();
      step = it.next();
    }
    if (step.value.error) throw step.value.error;
    return step.value.puzzle;
  }

  BessDoku.Generator = {
    generatePuzzle: generatePuzzle,
    generatePuzzleAsync: generatePuzzleAsync,
    generateSolutionPermutation: generateSolutionPermutation,
    growRegions: growRegions,
    repairToUniqueSolution: repairToUniqueSolution
  };
})(window.BessDoku);
