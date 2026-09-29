/*
 * BESS Doku — game/session.js
 * Controlador de uma partida em andamento (uma tentativa de um jogador sobre
 * um Puzzle). Encapsula o BoardState mutável, o cronômetro e a aplicação das
 * regras/pontuação, expondo callbacks para a camada de UI reagir a eventos.
 */
(function (BessDoku) {
  'use strict';

  var Rules = BessDoku.Rules;
  var Model = BessDoku.Model;
  var Timer = BessDoku.Timer;
  var Scoring = BessDoku.Scoring;
  var Hints = BessDoku.Hints;
  var Settings = BessDoku.Settings;

  // `resumeData` (opcional) permite retomar uma partida salva (usado pelo
  // Desafio Diário após um reload): { marks, errorCount, hintCount, moveCount,
  // penaltySeconds, initialElapsedMs, character }.
  // `characterKey` (opcional) é o personagem escolhido pelo jogador (ver
  // game/characters.js); pode ser alterado depois via `session.character`,
  // desde que antes de a tela de jogo ser montada.
  function createSession(puzzle, playerLabel, callbacks, resumeData, characterKey) {
    var board = Model.freshBoardState(puzzle, playerLabel);
    if (resumeData) {
      if (resumeData.marks) board.marks = resumeData.marks;
      board.errorCount = resumeData.errorCount || 0;
      board.hintCount = resumeData.hintCount || 0;
      board.moveCount = resumeData.moveCount || 0;
      board.penaltySeconds = resumeData.penaltySeconds || 0;
    }
    var timer = Timer.create(resumeData ? resumeData.initialElapsedMs : 0);
    // `cb` é um objeto mutável e compartilhado: quem monta a tela de jogo pode
    // preencher/atualizar suas propriedades DEPOIS da sessão criada (necessário
    // no Duelo, onde a sessão de cada jogador é criada antes de a tela existir).
    var cb = callbacks || {};
    var lastHintCell = null;

    function fire(name, payload) {
      if (typeof cb[name] === 'function') cb[name](payload);
    }

    function start() {
      board.startedAt = Date.now();
      timer.start();
    }

    // Tempo REAL decorrido (sem penalidades). É o que o Desafio Diário salva
    // como `initialElapsedMs`; as penalidades ficam em `penaltySeconds`.
    function getLiveElapsedMs() {
      return board.finished ? board.elapsedMs : timer.getElapsedMs();
    }

    // Tempo exibido no cronômetro: real + penalidades já acumuladas, para que
    // cada erro faça o relógio "pular" na hora.
    function getDisplayTimeMs() {
      if (board.finished) return board.finalTimeMs;
      return Scoring.computeFinalTimeMs(timer.getElapsedMs(), board.penaltySeconds);
    }

    function recordHistory(row, col, prevMark, newMark) {
      board.history.push({ row: row, col: col, prevMark: prevMark, newMark: newMark, ts: Date.now() });
    }

    // Interação principal de célula:
    //   toque simples (isDoubleTap=false) -> alterna vazio <-> X; sobre um
    //     personagem já colocado, apenas o remove (undo livre, nunca conta como erro).
    //     A UI aplica o toque simples IMEDIATAMENTE (o X aparece no ato).
    //   toque duplo   (isDoubleTap=true)  -> confirma/coloca o personagem; sobre um
    //     já colocado, remove-o (alternância). Como o primeiro toque já foi aplicado,
    //     a UI chama `undoRecentTap` antes, para que a jogada conte uma vez só.
    function interactCell(row, col, isDoubleTap) {
      if (board.finished) return { ok: true, ignored: true };
      var prevMark = board.marks[row][col];

      if (isDoubleTap) {
        if (prevMark === Rules.LULU) {
          board.marks[row][col] = Rules.EMPTY;
          board.moveCount++;
          recordHistory(row, col, prevMark, Rules.EMPTY);
          fire('clear', { row: row, col: col });
          return { ok: true, cleared: true };
        }
        return placeLulu(row, col);
      }

      if (prevMark === Rules.EMPTY) {
        board.marks[row][col] = Rules.MARK_X;
        board.moveCount++;
        recordHistory(row, col, prevMark, Rules.MARK_X);
        fire('mark', { row: row, col: col });
        return { ok: true, marked: true };
      }

      board.marks[row][col] = Rules.EMPTY;
      board.moveCount++;
      recordHistory(row, col, prevMark, Rules.EMPTY);
      fire('clear', { row: row, col: col });
      return { ok: true, cleared: true };
    }

    // Arrasto: pinta X apenas em casa VAZIA. Nunca apaga um X nem remove um
    // personagem — assim passar o dedo duas vezes pelo mesmo caminho não desfaz nada.
    function paintX(row, col) {
      if (board.finished) return { ok: true, ignored: true };
      var prevMark = board.marks[row][col];
      if (prevMark !== Rules.EMPTY) return { ok: true, ignored: true };
      board.marks[row][col] = Rules.MARK_X;
      board.moveCount++;
      recordHistory(row, col, prevMark, Rules.MARK_X);
      fire('mark', { row: row, col: col });
      return { ok: true, marked: true };
    }

    // Desfaz o toque simples que acabou de acontecer nesta casa (o primeiro
    // toque de um toque duplo), para que o duplo não conte como duas jogadas.
    // Só olha a ÚLTIMA entrada do histórico; não dispara callback porque a
    // ação seguinte (place/error/clear) já redesenha a célula.
    function undoRecentTap(row, col, maxAgeMs) {
      if (board.finished) return false;
      var last = board.history[board.history.length - 1];
      if (!last || last.row !== row || last.col !== col) return false;
      if (last.newMark === Rules.LULU) return false;
      if (Date.now() - last.ts > maxAgeMs) return false;
      board.history.pop();
      board.marks[row][col] = last.prevMark;
      board.moveCount = Math.max(0, board.moveCount - 1);
      return true;
    }

    // Jogada errada: conta o erro, soma a penalidade ao cronômetro na hora e
    // marca a casa com X (o jogador já pagou pela informação de que ali não
    // há personagem). O personagem NUNCA é colocado numa casa errada.
    function rejectPlacement(row, col, reason) {
      var prevMark = board.marks[row][col];
      board.errorCount++;
      var penalty = Settings.get().errorPenaltySeconds || 0;
      board.penaltySeconds += penalty;
      if (prevMark === Rules.EMPTY) {
        board.marks[row][col] = Rules.MARK_X;
        recordHistory(row, col, prevMark, Rules.MARK_X);
      }
      fire('error', { row: row, col: col, reason: reason, penaltySeconds: penalty });
      return { ok: false, reason: reason };
    }

    function placeLulu(row, col) {
      board.moveCount++;

      // A casa só é válida se fizer parte da solução do puzzle (solution[row] = col).
      // Checar apenas conflitos com as peças já colocadas não basta: uma casa
      // errada sem conflito algum seria aceita.
      if (puzzle.solution[row] !== col) {
        return rejectPlacement(row, col, 'wrong');
      }
      // Defensivo: só falha se o tabuleiro já contiver peças inconsistentes
      // (ex.: partida salva por uma versão antiga do jogo).
      var check = Rules.canPlaceLulu(puzzle.size, puzzle.regions, board.marks, row, col);
      if (!check.ok) {
        return rejectPlacement(row, col, check.reason);
      }

      var prevMark = board.marks[row][col];
      board.marks[row][col] = Rules.LULU;
      recordHistory(row, col, prevMark, Rules.LULU);
      fire('place', { row: row, col: col, region: puzzle.regions[row][col] });
      fire('regionComplete', { row: row, col: col, region: puzzle.regions[row][col] });

      if (Rules.isSolved(puzzle.size, puzzle.regions, board.marks)) {
        finish();
        fire('solved', snapshotResult());
      }
      return { ok: true };
    }

    function useHint() {
      if (board.finished) return null;
      var hint = Hints.computeHint(puzzle, board.marks);
      if (!hint) return null;
      board.hintCount++;
      var settings = Settings.get();
      if (settings.hintPenaltyEnabled) {
        board.penaltySeconds += settings.hintPenaltySeconds;
      }
      lastHintCell = hint;
      fire('hint', hint);
      return hint;
    }

    function finish() {
      if (board.finished) return;
      board.finished = true;
      board.finishedAt = Date.now();
      var realMs = timer.stop();
      board.elapsedMs = realMs;
      // Todas as penalidades (erros e dicas) já foram somadas em
      // `penaltySeconds` no momento em que aconteceram.
      board.finalTimeMs = Scoring.computeFinalTimeMs(realMs, board.penaltySeconds);
    }

    function snapshotResult() {
      return {
        puzzleId: puzzle.id,
        playerLabel: playerLabel,
        character: api.character,
        difficultyTier: puzzle.difficultyTier,
        size: puzzle.size,
        errorCount: board.errorCount,
        hintCount: board.hintCount,
        moveCount: board.moveCount,
        penaltySeconds: board.penaltySeconds,
        elapsedMs: board.elapsedMs,
        finalTimeMs: board.finalTimeMs,
        rating: BessDoku.Difficulty.rateResult(puzzle.difficultyTier, board.finalTimeMs, board.errorCount)
      };
    }

    var api = {
      puzzle: puzzle,
      board: board,
      callbacks: cb,
      character: characterKey || (resumeData && resumeData.character) || BessDoku.Characters.DEFAULT_KEY,
      start: start,
      interactCell: interactCell,
      paintX: paintX,
      undoRecentTap: undoRecentTap,
      useHint: useHint,
      finish: finish,
      getLiveElapsedMs: getLiveElapsedMs,
      getDisplayTimeMs: getDisplayTimeMs,
      snapshotResult: snapshotResult,
      isSolved: function () { return Rules.isSolved(puzzle.size, puzzle.regions, board.marks); }
    };
    return api;
  }

  BessDoku.Session = {
    create: createSession
  };
})(window.BessDoku);
