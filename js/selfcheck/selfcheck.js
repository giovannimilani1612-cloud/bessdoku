/*
 * BESS Doku — selfcheck/selfcheck.js
 * Autoteste em navegador (dev-only), ativado com ?selfcheck=1 na URL.
 * Gera puzzles para cada dificuldade e valida unicidade/regras, testa o
 * resolvedor, o cronômetro e o round-trip do armazenamento local.
 */
(function (BessDoku) {
  'use strict';

  var results = [];

  function check(name, condition, detail) {
    results.push({ name: name, pass: !!condition, detail: detail || '' });
  }

  function runGeneratorChecks() {
    var RUNS_PER_TIER = 12;
    BessDoku.Difficulty.list().forEach(function (tier) {
      for (var i = 0; i < RUNS_PER_TIER; i++) {
        var seed = 'selfcheck:' + tier.key + ':' + i;
        try {
          var puzzle = BessDoku.Generator.generatePuzzle(tier.key, seed);
          var validSolution = BessDoku.Rules.validateFullSolution(puzzle.size, puzzle.regions, puzzle.solution);
          check(tier.key + ' #' + i + ' solução válida', validSolution);

          var countResult = BessDoku.Solver.countSolutions(puzzle.size, puzzle.regions, 2, null);
          check(tier.key + ' #' + i + ' solução única', countResult.count === 1, 'count=' + countResult.count);

          var cellsCovered = 0;
          var regionSeeds = {};
          for (var r = 0; r < puzzle.size; r++) {
            for (var c = 0; c < puzzle.size; c++) {
              if (puzzle.regions[r][c] === undefined || puzzle.regions[r][c] < 0 || puzzle.regions[r][c] >= puzzle.size) continue;
              cellsCovered++;
            }
          }
          check(tier.key + ' #' + i + ' regiões cobrem o tabuleiro', cellsCovered === puzzle.size * puzzle.size);

          for (var rr = 0; rr < puzzle.size; rr++) {
            regionSeeds[puzzle.regions[rr][puzzle.solution[rr]]] = true;
          }
          check(tier.key + ' #' + i + ' uma célula-solução por região', Object.keys(regionSeeds).length === puzzle.size);

          check(tier.key + ' #' + i + ' complexidade dentro/perto da faixa',
            puzzle.difficultyInfo.complexity >= 0,
            'complexity=' + puzzle.difficultyInfo.complexity);
        } catch (e) {
          check(tier.key + ' #' + i + ' geração sem exceção', false, String(e));
        }
      }
    });
  }

  function runSolverChecks() {
    // Puzzle fixo 4x4 desenhado à mão (4 quadrantes 2x2) para validar o
    // resolvedor de forma independente do gerador.
    var size = 4;
    var regions = [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [3, 3, 2, 2],
      [3, 3, 2, 2]
    ];
    var solution = [2, 0, 3, 1]; // linha->coluna: (0,2) (1,0) (2,3) (3,1)
    var validSolution = BessDoku.Rules.validateFullSolution(size, regions, solution);
    check('fixture 4x4: solução manual válida', validSolution);

    var countResult = BessDoku.Solver.countSolutions(size, regions, 3, null);
    check('fixture 4x4: contador encontra ao menos 1 solução', countResult.count >= 1, 'count=' + countResult.count);

    var marks = BessDoku.Rules.emptyMarks(size);
    var hint = BessDoku.Hints.computeHint({ size: size, regions: regions, solution: solution }, marks);
    check('fixture 4x4: dica retorna uma célula', !!hint);
    if (hint) {
      check('fixture 4x4: dica é célula de linha ainda vazia', marks[hint.row].indexOf(BessDoku.Rules.LULU) === -1);
    }
  }

  function runRuleChecks() {
    var size = 4;
    var regions = [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [3, 3, 2, 2],
      [3, 3, 2, 2]
    ];
    var marks = BessDoku.Rules.emptyMarks(size);
    marks[0][1] = BessDoku.Rules.LULU;
    // (1,2) é diagonalmente adjacente a (0,1), mas não compartilha linha,
    // coluna nem região com ela — isola especificamente a regra de adjacência.
    var adjacentCheck = BessDoku.Rules.canPlaceLulu(size, regions, marks, 1, 2);
    check('regra adjacência rejeita vizinho', adjacentCheck.ok === false && adjacentCheck.reason === 'adjacent');
    var rowCheck = BessDoku.Rules.canPlaceLulu(size, regions, marks, 0, 3);
    check('regra linha rejeita segunda unidade na mesma linha', rowCheck.ok === false && rowCheck.reason === 'row');
  }

  function runTimerChecks() {
    check('Timer.format(0)', BessDoku.Timer.format(0) === '00:00.00', BessDoku.Timer.format(0));
    check('Timer.format(65432)', BessDoku.Timer.format(65432) === '01:05.43', BessDoku.Timer.format(65432));
  }

  function runStorageChecks() {
    var testKey = 'selfcheck:roundtrip';
    var payload = { schemaVersion: 1, hello: 'lulu', n: 42 };
    BessDoku.Storage.set(testKey, payload);
    var readBack = BessDoku.Storage.get(testKey, null);
    check('Storage round-trip', readBack && readBack.hello === 'lulu' && readBack.n === 42);
    BessDoku.Storage.remove(testKey);
    check('Storage remove', BessDoku.Storage.get(testKey, null) === null);
  }

  function runSessionChecks() {
    // Mesmo fixture 4x4 do resolvedor: solução (0,2) (1,0) (2,3) (3,1).
    var regions = [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [3, 3, 2, 2],
      [3, 3, 2, 2]
    ];
    var puzzle = { id: 'selfcheck-4x4', size: 4, regions: regions, solution: [2, 0, 3, 1], difficultyTier: BessDoku.Difficulty.list()[0].key };
    var events = [];
    var session = BessDoku.Session.create(puzzle, 'selfcheck', {
      error: function (p) { events.push('error:' + p.reason); },
      place: function () { events.push('place'); }
    }, null, 'mamae');
    var penalty = BessDoku.Settings.get().errorPenaltySeconds;

    check('sessão: personagem escolhido fica na sessão', session.character === 'mamae');

    // Toque duplo numa casa que NÃO faz parte da solução: (0,0).
    var wrong = session.interactCell(0, 0, true);
    check('sessão: casa errada é rejeitada', wrong.ok === false && wrong.reason === 'wrong', JSON.stringify(wrong));
    check('sessão: casa errada NÃO recebe o personagem', session.board.marks[0][0] !== BessDoku.Rules.LULU);
    check('sessão: casa errada recebe X automático', session.board.marks[0][0] === BessDoku.Rules.MARK_X);
    check('sessão: casa errada conta 1 erro', session.board.errorCount === 1);
    check('sessão: erro soma penalidade na hora', session.board.penaltySeconds === penalty, 'penalty=' + session.board.penaltySeconds);
    check('sessão: tempo exibido inclui a penalidade', session.getDisplayTimeMs() >= penalty * 1000);
    check('sessão: tempo real não inclui a penalidade', session.getLiveElapsedMs() < penalty * 1000);
    check('sessão: callback error disparado com reason=wrong', events.indexOf('error:wrong') !== -1);

    // Toque duplo numa casa certa: (0,2).
    var right = session.interactCell(0, 2, true);
    check('sessão: casa certa é aceita', right.ok === true);
    check('sessão: casa certa recebe o personagem', session.board.marks[0][2] === BessDoku.Rules.LULU);
    check('sessão: casa certa não conta erro', session.board.errorCount === 1);

    // Arrasto (paintX): só pinta casa vazia; nunca apaga X nem remove personagem.
    var movesBeforePaint = session.board.moveCount;
    session.paintX(1, 1);
    check('sessão: paintX marca X em casa vazia', session.board.marks[1][1] === BessDoku.Rules.MARK_X);
    check('sessão: paintX conta 1 jogada', session.board.moveCount === movesBeforePaint + 1);
    var repaint = session.paintX(1, 1);
    check('sessão: paintX sobre X é ignorado', repaint.ignored === true && session.board.marks[1][1] === BessDoku.Rules.MARK_X);
    check('sessão: paintX ignorado não conta jogada', session.board.moveCount === movesBeforePaint + 1);
    session.paintX(0, 2);
    check('sessão: paintX não remove personagem', session.board.marks[0][2] === BessDoku.Rules.LULU);

    // Toque simples imediato + undoRecentTap (primeiro toque de um toque duplo).
    var movesBeforeTap = session.board.moveCount;
    var histBeforeTap = session.board.history.length;
    session.interactCell(2, 0, false);
    check('sessão: toque simples marca X na hora', session.board.marks[2][0] === BessDoku.Rules.MARK_X);
    check('sessão: undoRecentTap desfaz o toque recente', session.undoRecentTap(2, 0, 400) === true);
    check('sessão: undo devolve a casa ao estado anterior', session.board.marks[2][0] === BessDoku.Rules.EMPTY);
    check('sessão: undo devolve a contagem de jogadas', session.board.moveCount === movesBeforeTap);
    check('sessão: undo remove a entrada do histórico', session.board.history.length === histBeforeTap);
    check('sessão: undo repetido não faz nada', session.undoRecentTap(2, 0, 400) === false);
    check('sessão: undo em outra casa não faz nada', session.undoRecentTap(0, 0, 400) === false);

    // Toque duplo real na casa certa (1,0): toque simples + undo + duplo = 1 jogada.
    var movesBeforeDouble = session.board.moveCount;
    session.interactCell(1, 0, false);
    session.undoRecentTap(1, 0, 400);
    session.interactCell(1, 0, true);
    check('sessão: toque duplo coloca o personagem', session.board.marks[1][0] === BessDoku.Rules.LULU);
    check('sessão: toque duplo conta 1 jogada só', session.board.moveCount === movesBeforeDouble + 1, 'moves=' + (session.board.moveCount - movesBeforeDouble));

    // Completar o puzzle: penalidade não pode ser somada duas vezes no fim.
    session.start();
    session.interactCell(2, 3, true);
    session.interactCell(3, 1, true);
    check('sessão: puzzle resolvido', session.board.finished === true);
    check('sessão: penalidade final não é duplicada', session.board.penaltySeconds === penalty, 'penalty=' + session.board.penaltySeconds);
    check('sessão: tempo final = real + penalidade', session.board.finalTimeMs === session.board.elapsedMs + penalty * 1000);
    var snap = session.snapshotResult();
    check('sessão: snapshot inclui personagem', snap.character === 'mamae');
  }

  // Gestos no DOM real (BoardView + Pointer Events sintéticos). É síncrono
  // porque o toque simples é aplicado na hora e o duplo só compara timestamps.
  function runBoardGestureChecks() {
    if (typeof PointerEvent !== 'function' || !BessDoku.BoardView) {
      check('gestos: PointerEvent indisponível (pulado)', true);
      return;
    }
    var regions = [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [3, 3, 2, 2],
      [3, 3, 2, 2]
    ];
    var puzzle = { id: 'selfcheck-gestos', size: 4, regions: regions, solution: [2, 0, 3, 1], difficultyTier: BessDoku.Difficulty.list()[0].key };
    var session = BessDoku.Session.create(puzzle, 'selfcheck', {}, null, 'bess');
    var view = BessDoku.BoardView.create(session);
    var taps = [];
    view.bindTapHandler(function (row, col, isDoubleTap) {
      taps.push({ row: row, col: col, dbl: isDoubleTap });
      if (isDoubleTap) session.undoRecentTap(row, col, 400);
      session.interactCell(row, col, isDoubleTap);
    });
    view.bindPaintHandler(function (row, col) { session.paintX(row, col); });

    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:0;top:0;width:320px;height:320px;z-index:9999;';
    wrap.appendChild(view.el);
    document.body.appendChild(wrap);

    function center(r, c) {
      var rect = view.cellEls[r][c].getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    function fire(type, r, c, id) {
      var p = center(r, c);
      view.cellEls[r][c].dispatchEvent(new PointerEvent(type, { pointerId: id || 1, clientX: p.x, clientY: p.y, bubbles: true, cancelable: true }));
    }
    function tap(r, c) { fire('pointerdown', r, c); fire('pointerup', r, c); }

    try {
      var rect0 = view.cellEls[0][0].getBoundingClientRect();
      check('gestos: célula tem tamanho na tela', rect0.width > 8 && rect0.height > 8, 'w=' + rect0.width);
      check('gestos: elementFromPoint acha a célula', document.elementFromPoint(center(0, 0).x, center(0, 0).y) === view.cellEls[0][0]);

      tap(0, 0);
      check('gestos: toque simples marca X sem esperar', session.board.marks[0][0] === BessDoku.Rules.MARK_X);
      check('gestos: toque simples chega como isDoubleTap=false', taps.length === 1 && taps[0].dbl === false);

      tap(1, 0); tap(1, 0);
      check('gestos: dois toques rápidos chegam como duplo', taps.length === 3 && taps[2].dbl === true);
      check('gestos: toque duplo coloca o personagem', session.board.marks[1][0] === BessDoku.Rules.LULU);
      check('gestos: toque duplo conta 1 jogada', session.board.moveCount === 2, 'moves=' + session.board.moveCount);

      // Arrasto em "U" sem diagonais: (2,0) → (2,1) → (2,2) → (1,2) → (0,2) →
      // (0,1) → (0,0) → (1,0). Seis casas vazias viram X; (0,0), que já era X,
      // e o personagem em (1,0) não mudam.
      var before = session.board.moveCount;
      fire('pointerdown', 2, 0);
      fire('pointermove', 2, 1);
      fire('pointermove', 2, 2);
      fire('pointermove', 1, 2);
      fire('pointermove', 0, 2);
      fire('pointermove', 0, 1);
      fire('pointermove', 0, 0);
      fire('pointermove', 1, 0);
      fire('pointerup', 1, 0);
      var m = session.board.marks;
      check('gestos: arrasto pinta a célula inicial', m[2][0] === BessDoku.Rules.MARK_X);
      check('gestos: arrasto pinta as células do caminho', m[2][1] === BessDoku.Rules.MARK_X && m[2][2] === BessDoku.Rules.MARK_X && m[1][2] === BessDoku.Rules.MARK_X && m[0][2] === BessDoku.Rules.MARK_X && m[0][1] === BessDoku.Rules.MARK_X);
      check('gestos: arrasto não pinta fora do caminho', m[1][1] === BessDoku.Rules.EMPTY && m[3][0] === BessDoku.Rules.EMPTY);
      check('gestos: arrasto não remove personagem', m[1][0] === BessDoku.Rules.LULU);
      check('gestos: arrasto não apaga X existente', m[0][0] === BessDoku.Rules.MARK_X);
      check('gestos: arrasto conta só as células pintadas', session.board.moveCount === before + 6, 'moves=' + (session.board.moveCount - before));
      check('gestos: soltar após arrasto não vira toque', taps.length === 3);

      // Arrasto de volta pelo mesmo caminho: nada muda.
      fire('pointerdown', 2, 2);
      fire('pointermove', 2, 1);
      fire('pointermove', 2, 0);
      fire('pointerup', 2, 0);
      check('gestos: repassar pelo caminho não desmarca', m[2][1] === BessDoku.Rules.MARK_X && session.board.moveCount === before + 6);

      // Deslize rápido: um único pointermove saltando de (3,0) para (3,3) deve
      // pintar também (3,1) e (3,2), que ficaram no caminho.
      fire('pointerdown', 3, 0);
      fire('pointermove', 3, 3);
      fire('pointerup', 3, 3);
      check('gestos: deslize rápido pinta as células puladas', session.board.marks[3][0] === BessDoku.Rules.MARK_X && session.board.marks[3][1] === BessDoku.Rules.MARK_X && session.board.marks[3][2] === BessDoku.Rules.MARK_X && session.board.marks[3][3] === BessDoku.Rules.MARK_X);
    } catch (e) {
      check('gestos: sem exceção', false, String(e));
    } finally {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
  }

  function runSettingsChecks() {
    check('settings: penalidade padrão por erro é 15 s', BessDoku.Settings.DEFAULTS.errorPenaltySeconds === 15);
    check('settings: schema atual é v2', BessDoku.Settings.SCHEMA_VERSION === 2);
  }

  function runCharacterChecks() {
    var list = BessDoku.Characters.list();
    var keys = {};
    list.forEach(function (c) { keys[c.key] = true; });
    check('personagens: 4 personagens', list.length === 4, 'n=' + list.length);
    check('personagens: chaves únicas', Object.keys(keys).length === 4);
    check('personagens: contém bess/mamae/papai/amigo', !!(keys.bess && keys.mamae && keys.papai && keys.amigo));
    check('personagens: get inválido cai no BESS', BessDoku.Characters.get('xyz').key === 'bess');
    list.forEach(function (c) {
      ['iconic', 'full'].forEach(function (detail) {
        try {
          var svg = BessDoku.Characters.buildSVG(c.key, { size: 'md', pose: 'happy', detail: detail });
          check('personagens: SVG ' + c.key + '/' + detail, !!(svg && svg.tagName && svg.tagName.toLowerCase() === 'svg' && svg.childNodes.length > 0));
        } catch (e) {
          check('personagens: SVG ' + c.key + '/' + detail + ' sem exceção', false, String(e));
        }
      });
    });
  }

  function renderReport() {
    var passCount = results.filter(function (r) { return r.pass; }).length;
    var failCount = results.length - passCount;

    console.log('BESS Doku selfcheck: ' + passCount + '/' + results.length + ' passaram');
    if (window.console && console.table) console.table(results);

    var lines = ['BESS Doku — Autoteste', '======================', '',
      'Total: ' + results.length + '  |  OK: ' + passCount + '  |  Falhas: ' + failCount, ''];
    results.forEach(function (r) {
      lines.push((r.pass ? '[OK]   ' : '[FALHA]') + ' ' + r.name + (r.detail ? '  (' + r.detail + ')' : ''));
    });

    var pre = document.createElement('pre');
    pre.style.cssText = 'font-family:monospace;font-size:12px;padding:16px;white-space:pre-wrap;color:' + (failCount ? '#C4283A' : '#2E9E5B') + ';background:#fafafa;';
    pre.textContent = lines.join('\n');
    document.body.innerHTML = '';
    document.body.appendChild(pre);
  }

  function run() {
    results = [];
    runTimerChecks();
    runStorageChecks();
    runRuleChecks();
    runSettingsChecks();
    runSessionChecks();
    runBoardGestureChecks();
    runCharacterChecks();
    runSolverChecks();
    runGeneratorChecks();
    renderReport();
  }

  BessDoku.SelfCheck = { run: run };
})(window.BessDoku);
