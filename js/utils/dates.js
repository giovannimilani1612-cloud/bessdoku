/*
 * BESS Doku — utils/dates.js
 * Utilitários de data para o Desafio Diário.
 */
(function (BessDoku) {
  'use strict';

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function toISODateString(date) {
    date = date || new Date();
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function dayOfYear(date) {
    date = date || new Date();
    var start = new Date(date.getFullYear(), 0, 0);
    var diff = date - start;
    var oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  function formatDisplayDate(isoString) {
    var parts = isoString.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  BessDoku.Dates = {
    toISODateString: toISODateString,
    dayOfYear: dayOfYear,
    formatDisplayDate: formatDisplayDate
  };
})(window.BessDoku);
