/*
 * BESS Doku — game/adventure.js
 * Estado de uma corrida do modo Aventura (individual ou em dupla): fases em
 * sequência contra o relógio. O jogador começa com 2:00 no "banco de tempo";
 * cada fase vencida devolve o que sobrou e soma +2:00; a dificuldade sobe a
 * cada 2 fases. Na dupla, os dois jogadores se revezam a cada fase, no mesmo
 * aparelho, com um único relógio.
 *
 * Cada fase roda uma Session comum (cronômetro progressivo + penalidades já
 * somadas no tempo exibido). O restante mostrado na tela é
 *   bankMs - session.getDisplayTimeMs()
 * então erros e dicas descontam do relógio sozinhos, e entre fases (transição,
 * geração do próximo tabuleiro, pausa) nenhuma sessão roda: o relógio fica parado.
 *
 * Status possíveis: 'idle' -> 'playing' -> 'transition' -> 'playing' ... -> 'over'
 */
(function (BessDoku) {
  'use strict';

  var Difficulty = BessDoku.Difficulty;
  var Generator = BessDoku.Generator;
  var Session = BessDoku.Session;
  var Storage = BessDoku.Storage;

  var INITIAL_BANK_MS = 120000;
  var BONUS_MS = 120000;
  var PHASES_PER_TIER = 2;
  var ERROR_PENALTY_SECONDS = 15;
  var HINT_PENALTY_SECONDS = 20;

  var STORAGE_KEY = 'adventure';
  var SCHEMA_VERSION = 1;
  var RECORD_DEFAULTS = { solo: null, team: null };

  function tierForPhase(phase) {
    var tiers = Difficulty.list();
    var index = Math.floor((Math.max(1, phase) - 1) / PHASES_PER_TIER);
    return tiers[Math.min(index, tiers.length - 1)];
  }

  function createRun(mode) {
    return {
      id: 'adventure-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      mode: mode === 'team' ? 'team' : 'solo',
      phase: 1,
      bankMs: INITIAL_BANK_MS,
      status: 'idle',
      puzzle: null,
      session: null,
      characters: { p1: null, p2: null },
      phaseResults: [],
      endReason: null,
      // Tempo real da fase em que a corrida terminou (não vencida), para o resumo.
      lastPhaseMs: 0
    };
  }

  function currentPlayer(run) {
    if (run.mode !== 'team') return 1;
    return ((run.phase - 1) % 2) + 1;
  }

  function characterForPlayer(run, player) {
    var key = player === 2 ? run.characters.p2 : run.characters.p1;
    return key || BessDoku.Characters.DEFAULT_KEY;
  }

  // Gera o tabuleiro da fase atual (assíncrono: pode levar segundos nos
  // níveis grandes). Quem chama decide o que mostrar enquanto espera.
  async function preparePhase(run) {
    var tier = tierForPhase(run.phase);
    run.puzzle = await Generator.generatePuzzleAsync(tier.key);
    return run.puzzle;
  }

  function beginPhase(run, callbacks) {
    if (!run.puzzle) throw new Error('Adventure.beginPhase: fase sem tabuleiro (chame preparePhase antes)');
    var player = currentPlayer(run);
    run.session = Session.create(run.puzzle, 'p' + player, callbacks || {}, null,
      characterForPlayer(run, player),
      { errorPenaltySeconds: ERROR_PENALTY_SECONDS, hintPenaltySeconds: HINT_PENALTY_SECONDS });
    run.status = 'playing';
    return run.session;
  }

  function getRemainingMs(run) {
    if (!run.session) return run.bankMs;
    return Math.max(0, run.bankMs - run.session.getDisplayTimeMs());
  }

  function phaseSolved(run) {
    var session = run.session;
    if (!session.board.finished) session.finish();
    var snapshot = session.snapshotResult();
    var remaining = Math.max(0, run.bankMs - snapshot.finalTimeMs);
    run.bankMs = remaining + BONUS_MS;
    run.phaseResults.push({
      phase: run.phase,
      player: currentPlayer(run),
      tierKey: snapshot.difficultyTier,
      finalTimeMs: snapshot.finalTimeMs,
      elapsedMs: snapshot.elapsedMs,
      errorCount: snapshot.errorCount,
      hintCount: snapshot.hintCount
    });
    run.phase++;
    run.puzzle = null;
    run.status = 'transition';
    return snapshot;
  }

  function endRun(run, reason) {
    if (run.session) {
      if (!run.session.board.finished) run.session.finish();
      run.lastPhaseMs = run.session.board.elapsedMs || 0;
    }
    run.status = 'over';
    run.endReason = reason;
  }

  function timeUp(run) { endRun(run, 'timeUp'); }
  function abandon(run) { endRun(run, 'abandon'); }

  // ---------- Recordes locais (fases vencidas, separado por modo) ----------
  function readRecords() {
    return Storage.withSchema(Storage.get(STORAGE_KEY, null), RECORD_DEFAULTS, SCHEMA_VERSION);
  }

  function getBest(mode) {
    var records = readRecords();
    return records[mode === 'team' ? 'team' : 'solo'] || null;
  }

  function submitBest(mode, phasesWon) {
    var key = mode === 'team' ? 'team' : 'solo';
    var records = readRecords();
    var previous = records[key];
    var isNewBest = phasesWon > 0 && (!previous || phasesWon > previous.bestPhasesWon);
    if (isNewBest) {
      records[key] = { bestPhasesWon: phasesWon, date: BessDoku.Dates.toISODateString() };
      Storage.set(STORAGE_KEY, records);
    }
    return { isNewBest: isNewBest, best: records[key] };
  }

  function clearRecords() {
    Storage.remove(STORAGE_KEY);
  }

  // Resumo final da corrida (e grava o recorde). Chamar uma vez, ao terminar.
  function finishRun(run) {
    if (run.status !== 'over') endRun(run, run.endReason || 'abandon');
    var phasesWon = run.phaseResults.length;
    var perPlayer = { 1: 0, 2: 0 };
    var totalErrors = 0, totalHints = 0, totalPlayedMs = run.lastPhaseMs;
    run.phaseResults.forEach(function (r) {
      perPlayer[r.player]++;
      totalErrors += r.errorCount;
      totalHints += r.hintCount;
      totalPlayedMs += r.elapsedMs; // tempo real, sem penalidades
    });
    if (run.session) {
      totalErrors += run.session.board.errorCount;
      totalHints += run.session.board.hintCount;
    }
    var record = submitBest(run.mode, phasesWon);
    return {
      mode: run.mode,
      phasesWon: phasesWon,
      reachedPhase: run.phase,
      reachedTier: tierForPhase(run.phase),
      totalErrors: totalErrors,
      totalHints: totalHints,
      totalPlayedMs: totalPlayedMs,
      perPlayer: perPlayer,
      isNewBest: record.isNewBest,
      endReason: run.endReason
    };
  }

  BessDoku.Adventure = {
    INITIAL_BANK_MS: INITIAL_BANK_MS,
    BONUS_MS: BONUS_MS,
    PHASES_PER_TIER: PHASES_PER_TIER,
    ERROR_PENALTY_SECONDS: ERROR_PENALTY_SECONDS,
    HINT_PENALTY_SECONDS: HINT_PENALTY_SECONDS,
    tierForPhase: tierForPhase,
    createRun: createRun,
    currentPlayer: currentPlayer,
    characterForPlayer: characterForPlayer,
    preparePhase: preparePhase,
    beginPhase: beginPhase,
    getRemainingMs: getRemainingMs,
    phaseSolved: phaseSolved,
    timeUp: timeUp,
    abandon: abandon,
    finishRun: finishRun,
    getBest: getBest,
    submitBest: submitBest,
    clearRecords: clearRecords
  };
})(window.BessDoku);
