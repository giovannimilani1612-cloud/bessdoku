/*
 * BESS Doku — utils/storage.js
 * Camada de persistência local (localStorage) com prefixo de chaves e versão de schema.
 * Tudo isolado aqui para permitir, no futuro, um adaptador diferente (ex.: backend online)
 * sem tocar no resto do jogo.
 */
(function (BessDoku) {
  'use strict';

  var PREFIX = 'bessdoku:';
  var memoryFallback = {};
  var storageAvailable = null;

  function isAvailable() {
    if (storageAvailable !== null) return storageAvailable;
    try {
      var testKey = PREFIX + '__test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      storageAvailable = true;
    } catch (e) {
      storageAvailable = false;
    }
    return storageAvailable;
  }

  function fullKey(key) {
    return PREFIX + key;
  }

  function get(key, fallback) {
    var k = fullKey(key);
    try {
      if (isAvailable()) {
        var raw = window.localStorage.getItem(k);
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
      }
      return Object.prototype.hasOwnProperty.call(memoryFallback, k) ? memoryFallback[k] : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function set(key, value) {
    var k = fullKey(key);
    try {
      if (isAvailable()) {
        window.localStorage.setItem(k, JSON.stringify(value));
      } else {
        memoryFallback[k] = value;
      }
      return true;
    } catch (e) {
      memoryFallback[k] = value;
      return false;
    }
  }

  function remove(key) {
    var k = fullKey(key);
    try {
      if (isAvailable()) window.localStorage.removeItem(k);
      delete memoryFallback[k];
    } catch (e) { /* ignore */ }
  }

  function keysWithPrefix(subPrefix) {
    var result = [];
    if (!isAvailable()) {
      Object.keys(memoryFallback).forEach(function (k) {
        if (k.indexOf(PREFIX + subPrefix) === 0) result.push(k.slice(PREFIX.length));
      });
      return result;
    }
    for (var i = 0; i < window.localStorage.length; i++) {
      var k = window.localStorage.key(i);
      if (k && k.indexOf(PREFIX + subPrefix) === 0) result.push(k.slice(PREFIX.length));
    }
    return result;
  }

  // Garante que um payload lido tenha o schemaVersion esperado; caso contrário,
  // aplica migrações simples (por ora apenas mescla com defaults - schema v1 é o único).
  function withSchema(value, defaults, version) {
    if (!value || typeof value !== 'object') return Object.assign({ schemaVersion: version }, defaults);
    if (value.schemaVersion !== version) {
      return Object.assign({ schemaVersion: version }, defaults, value, { schemaVersion: version });
    }
    return value;
  }

  BessDoku.Storage = {
    get: get,
    set: set,
    remove: remove,
    keysWithPrefix: keysWithPrefix,
    withSchema: withSchema,
    isAvailable: isAvailable
  };
})(window.BessDoku);
