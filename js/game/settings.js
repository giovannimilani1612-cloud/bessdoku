/*
 * BESS Doku — game/settings.js
 * Configurações do jogador, persistidas localmente.
 *
 * Histórico de schema:
 *   v1 -> penalidade padrão por erro de 5 s.
 *   v2 -> penalidade padrão por erro de 15 s (somada ao cronômetro na hora do
 *         erro) e `lastCharacter` (último personagem escolhido).
 */
(function (BessDoku) {
  'use strict';

  var Storage = BessDoku.Storage;
  var KEY = 'settings';
  var SCHEMA_VERSION = 2;
  var DEFAULTS = {
    sound: true,
    errorPenaltySeconds: 15,
    hintPenaltyEnabled: false,
    hintPenaltySeconds: 10,
    playerName: 'Jogador',
    reducedMotion: false,
    lastCharacter: 'bess'
  };

  function get() {
    var raw = Storage.get(KEY, null);
    var merged = Storage.withSchema(raw, DEFAULTS, SCHEMA_VERSION);
    if (raw && typeof raw === 'object' && raw.schemaVersion !== SCHEMA_VERSION) {
      // Migração v1 -> v2: o valor antigo (5 s) gravado no dispositivo seria
      // preservado pelo merge; o novo padrão de 15 s por erro precisa ser aplicado.
      if (!raw.schemaVersion || raw.schemaVersion < 2) {
        merged.errorPenaltySeconds = DEFAULTS.errorPenaltySeconds;
      }
      Storage.set(KEY, merged);
    }
    return merged;
  }

  function update(patch) {
    var current = get();
    var next = Object.assign({}, current, patch, { schemaVersion: SCHEMA_VERSION });
    Storage.set(KEY, next);
    return next;
  }

  function reset() {
    var next = Object.assign({ schemaVersion: SCHEMA_VERSION }, DEFAULTS);
    Storage.set(KEY, next);
    return next;
  }

  BessDoku.Settings = {
    DEFAULTS: DEFAULTS,
    SCHEMA_VERSION: SCHEMA_VERSION,
    get: get,
    update: update,
    reset: reset
  };
})(window.BessDoku);
