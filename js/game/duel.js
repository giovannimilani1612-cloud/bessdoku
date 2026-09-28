/*
 * BESS Doku — game/duel.js
 * Máquina de estados do BESS Doku Duel e do Melhor de 3. Ambos reutilizam a
 * mesma lógica: um Puzzle único por rodada, jogado em sequência pelos dois
 * jogadores no mesmo dispositivo, com o resultado do Jogador 1 mantido oculto
 * até o Jogador 2 terminar aquela rodada.
 *
 * Fases possíveis: 'p1-ready' -> 'p1-playing' -> 'pass-device' -> 'p2-ready'
 *   -> 'p2-playing' -> ('round-transition' se houver mais rodadas, senão 'results')
 */
(function (BessDoku) {
  'use strict';

  var Generator = BessDoku.Generator;
  var Session = BessDoku.Session;

  function createMatch(tierKey, totalRounds) {
    return {
      id: 'match-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      tierKey: tierKey,
      totalRounds: totalRounds || 1,
      roundIndex: 0,
      phase: 'p1-ready',
      puzzle: null,
      sessionP1: null,
      sessionP2: null,
      roundResultsP1: [],
      roundResultsP2: [],
      // Personagens escolhidos por cada jogador (ver game/characters.js);
      // definidos na 1ª rodada e mantidos nas seguintes.
      characterP1: null,
      characterP2: null,
      totals: null,
      winner: null
    };
  }

  async function startRound(match, callbacksP1, callbacksP2) {
    match.puzzle = await Generator.generatePuzzleAsync(match.tierKey);
    match.sessionP1 = Session.create(match.puzzle, 'p1', callbacksP1);
    match.sessionP2Callbacks = callbacksP2;
    match.sessionP2 = null;
    match.phase = 'p1-ready';
    return match;
  }

  function beginP1(match, characterKey) {
    if (characterKey) match.characterP1 = characterKey;
    match.sessionP1.character = match.characterP1 || BessDoku.Characters.DEFAULT_KEY;
    match.phase = 'p1-playing';
    match.sessionP1.start();
  }

  function finishP1(match) {
    match.sessionP1.finish();
    match.roundResultsP1.push(match.sessionP1.snapshotResult());
    match.phase = 'pass-device';
  }

  function beginP2(match, characterKey) {
    if (characterKey) match.characterP2 = characterKey;
    match.phase = 'p2-playing';
    match.sessionP2 = Session.create(match.puzzle, 'p2', match.sessionP2Callbacks, null,
      match.characterP2 || BessDoku.Characters.DEFAULT_KEY);
    match.sessionP2.start();
  }

  function finishP2(match) {
    match.sessionP2.finish();
    match.roundResultsP2.push(match.sessionP2.snapshotResult());
    match.roundIndex++;
    if (match.roundIndex >= match.totalRounds) {
      match.phase = 'results';
      computeFinalOutcome(match);
    } else {
      match.phase = 'round-transition';
    }
  }

  function continueToNextRound(match, callbacksP1, callbacksP2) {
    return startRound(match, callbacksP1, callbacksP2);
  }

  function sum(arr, key) {
    return arr.reduce(function (acc, item) { return acc + item[key]; }, 0);
  }

  function computeFinalOutcome(match) {
    var totalP1 = sum(match.roundResultsP1, 'finalTimeMs');
    var totalP2 = sum(match.roundResultsP2, 'finalTimeMs');
    match.totals = { p1: totalP1, p2: totalP2 };
    if (totalP1 < totalP2) match.winner = 'p1';
    else if (totalP2 < totalP1) match.winner = 'p2';
    else match.winner = 'tie';
    return match;
  }

  function currentRoundNumber(match) {
    return Math.min(match.roundIndex + 1, match.totalRounds);
  }

  BessDoku.Duel = {
    createMatch: createMatch,
    startRound: startRound,
    beginP1: beginP1,
    finishP1: finishP1,
    beginP2: beginP2,
    finishP2: finishP2,
    continueToNextRound: continueToNextRound,
    currentRoundNumber: currentRoundNumber
  };
})(window.BessDoku);
