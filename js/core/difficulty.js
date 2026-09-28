/*
 * BESS Doku — core/difficulty.js
 * Tabela de dificuldades: cada nível define tamanho do tabuleiro E uma faixa de
 * complexidade lógica (não apenas o tamanho), além de parâmetros de geração e
 * dos limiares usados para classificar o resultado final do jogador.
 */
(function (BessDoku) {
  'use strict';

  var TIERS = [
    {
      key: 'iniciante', label: 'Iniciante', order: 0, size: 4,
      complexityMin: 0, complexityMax: 5, complexityMid: 0,
      maxAttempts: 60, baselineMs: 40000
    },
    {
      key: 'facil', label: 'Fácil', order: 1, size: 5,
      complexityMin: 0, complexityMax: 15, complexityMid: 8,
      maxAttempts: 60, baselineMs: 70000
    },
    {
      key: 'medio', label: 'Médio', order: 2, size: 6,
      complexityMin: 10, complexityMax: 35, complexityMid: 22,
      maxAttempts: 40, baselineMs: 120000
    },
    {
      key: 'dificil', label: 'Difícil', order: 3, size: 7,
      complexityMin: 25, complexityMax: 55, complexityMid: 40,
      maxAttempts: 24, baselineMs: 200000
    },
    {
      key: 'muitoDificil', label: 'Muito Difícil', order: 4, size: 8,
      complexityMin: 45, complexityMax: 80, complexityMid: 62,
      maxAttempts: 14, baselineMs: 320000
    },
    {
      key: 'extremo', label: 'Extremo', order: 5, size: 9,
      complexityMin: 70, complexityMax: 130, complexityMid: 95,
      maxAttempts: 10, baselineMs: 480000
    }
  ];

  var byKey = {};
  TIERS.forEach(function (t) { byKey[t.key] = t; });

  function get(key) {
    return byKey[key] || TIERS[0];
  }

  function list() {
    return TIERS.slice();
  }

  function tierForDayIndex(dayIndex) {
    return TIERS[dayIndex % TIERS.length];
  }

  function rateResult(tierKey, finalTimeMs, errorCount) {
    var tier = get(tierKey);
    var baseline = tier.baselineMs;
    if (finalTimeMs <= baseline * 0.6 && errorCount === 0) return 'excelente';
    if (finalTimeMs <= baseline && errorCount <= 2) return 'muitoBom';
    if (finalTimeMs <= baseline * 1.6) return 'bom';
    return 'continueTreinando';
  }

  var RATING_LABELS = {
    excelente: 'Excelente',
    muitoBom: 'Muito Bom',
    bom: 'Bom',
    continueTreinando: 'Continue Treinando'
  };

  BessDoku.Difficulty = {
    TIERS: TIERS,
    get: get,
    list: list,
    tierForDayIndex: tierForDayIndex,
    rateResult: rateResult,
    RATING_LABELS: RATING_LABELS
  };
})(window.BessDoku);
