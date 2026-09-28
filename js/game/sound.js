/*
 * BESS Doku — game/sound.js
 * Efeitos sonoros curtos gerados por WebAudio (sem arquivos externos), para
 * manter o jogo 100% offline. Respeita a configuração de som do jogador.
 */
(function (BessDoku) {
  'use strict';

  var ctx = null;

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function isEnabled() {
    try { return BessDoku.Settings.get().sound; } catch (e) { return true; }
  }

  function resumeContext() {
    var c = ensureCtx();
    if (c && c.state === 'suspended') { c.resume().catch(function () {}); }
  }

  function tone(freq, duration, opts) {
    if (!isEnabled()) return;
    var c = ensureCtx();
    if (!c) return;
    opts = opts || {};
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = opts.type || 'sine';
    var startTime = c.currentTime + (opts.delaySec || 0);
    osc.frequency.setValueAtTime(freq, startTime);
    if (opts.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), startTime + duration);
    }
    gain.gain.setValueAtTime(opts.volume || 0.14, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  function sequence(notes) {
    if (!isEnabled()) return;
    var t = 0;
    notes.forEach(function (n) {
      tone(n.freq, n.duration, { type: n.type, delaySec: t });
      t += n.gap !== undefined ? n.gap : n.duration * 0.85;
    });
  }

  BessDoku.Sound = {
    resumeContext: resumeContext,
    place: function () { tone(660, 0.07, { type: 'sine', volume: 0.13 }); },
    error: function () { tone(220, 0.18, { type: 'square', slideTo: 100, volume: 0.12 }); },
    markX: function () { tone(340, 0.04, { type: 'triangle', volume: 0.08 }); },
    regionComplete: function () { sequence([{ freq: 523, duration: 0.1 }, { freq: 659, duration: 0.14 }]); },
    win: function () { sequence([{ freq: 523, duration: 0.12 }, { freq: 659, duration: 0.12 }, { freq: 784, duration: 0.12 }, { freq: 1047, duration: 0.24 }]); },
    duelWin: function () {
      sequence([
        { freq: 523, duration: 0.12 }, { freq: 659, duration: 0.12 },
        { freq: 784, duration: 0.12 }, { freq: 988, duration: 0.12 },
        { freq: 1319, duration: 0.32 }
      ]);
    },
    hint: function () { tone(880, 0.1, { type: 'sine', volume: 0.1 }); }
  };
})(window.BessDoku);
