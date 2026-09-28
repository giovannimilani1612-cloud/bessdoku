/*
 * BESS Doku — utils/rng.js
 * Gerador de números pseudoaleatórios com seed, para permitir reprodutibilidade
 * (essencial para o Desafio Diário: mesma data => mesma sequência => mesmo puzzle).
 */
(function (BessDoku) {
  'use strict';

  // Hash de string -> inteiro 32-bit (cyrb53 simplificado / xfnv1a)
  function hashStringToSeed(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // PRNG mulberry32 — rápido, boa distribuição para uso em jogos.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createRng(seedInput) {
    var seedNum;
    if (typeof seedInput === 'number') {
      seedNum = seedInput >>> 0;
    } else if (typeof seedInput === 'string' && seedInput.length) {
      seedNum = hashStringToSeed(seedInput);
    } else {
      seedNum = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    }
    var next = mulberry32(seedNum);
    return {
      seed: seedNum,
      next: next,
      // inteiro em [0, maxExclusive)
      int: function (maxExclusive) {
        return Math.floor(next() * maxExclusive);
      },
      // escolhe um elemento aleatório de um array não vazio
      pick: function (arr) {
        return arr[Math.floor(next() * arr.length)];
      },
      // embaralha uma cópia do array (Fisher-Yates)
      shuffle: function (arr) {
        var copy = arr.slice();
        for (var i = copy.length - 1; i > 0; i--) {
          var j = Math.floor(next() * (i + 1));
          var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
        }
        return copy;
      }
    };
  }

  function randomSeedString() {
    return String(Date.now()) + ':' + String(Math.floor(Math.random() * 1e9));
  }

  BessDoku.Rng = {
    create: createRng,
    hashStringToSeed: hashStringToSeed,
    randomSeedString: randomSeedString
  };
})(window.BessDoku);
