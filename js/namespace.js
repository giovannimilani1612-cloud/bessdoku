/*
 * BESS Doku — namespace.js
 * Cria o namespace global único usado por todos os módulos do jogo.
 * Carregado primeiro, antes de qualquer outro script.
 */
(function (global) {
  'use strict';
  if (!global.BessDoku) {
    global.BessDoku = {};
  }
})(window);
