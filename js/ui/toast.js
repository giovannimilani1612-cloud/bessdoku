/*
 * BESS Doku — ui/toast.js
 * Mensagens curtas de personalidade ("Boa!", "Quase lá!"...) e efeito de confete
 * para celebrações. Ambos são efeitos visuais efêmeros, independentes de tela.
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var toastLayer = null;
  var confettiLayer = null;

  function ensureLayers() {
    if (!toastLayer) {
      toastLayer = document.getElementById('toast-layer');
      if (!toastLayer) {
        toastLayer = Dom.el('div', { id: 'toast-layer' });
        document.body.appendChild(toastLayer);
      }
    }
    if (!confettiLayer) {
      confettiLayer = document.getElementById('confetti-layer');
      if (!confettiLayer) {
        confettiLayer = Dom.el('div', { id: 'confetti-layer' });
        document.body.appendChild(confettiLayer);
      }
    }
  }

  function show(message) {
    ensureLayers();
    var node = Dom.el('div', { class: 'toast', text: message });
    toastLayer.appendChild(node);
    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 2300);
  }

  // Paleta quente do layout: coral, dourado, céu, menta, creme, lilás e marrom.
  var CONFETTI_COLORS = ['#E8503E', '#F4B740', '#7CC4F2', '#7ED9A8', '#FFE3BF', '#C8B4F0', '#3B2A1F'];

  function burstConfetti(count) {
    ensureLayers();
    count = count || 40;
    for (var i = 0; i < count; i++) {
      var piece = Dom.el('div', { class: 'confetti-piece' });
      var left = Math.random() * 100;
      var delay = Math.random() * 0.35;
      var duration = 1.1 + Math.random() * 0.9;
      var color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.left = left + 'vw';
      piece.style.background = color;
      piece.style.animationDelay = delay + 's';
      piece.style.animationDuration = duration + 's';
      piece.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
      confettiLayer.appendChild(piece);
      (function (node) {
        setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, 2400);
      })(piece);
    }
  }

  BessDoku.Toast = {
    show: show,
    burstConfetti: burstConfetti
  };
})(window.BessDoku);
