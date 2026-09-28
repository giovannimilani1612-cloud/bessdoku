/*
 * BESS Doku — ui/screens.js
 * Registro simples de navegação entre telas: troca o conteúdo do container
 * raiz e aplica uma transição suave. Cada renderizador de tela é uma função
 * pura que devolve um nó DOM pronto.
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var root = null;
  var activeCleanup = null;

  function init(rootEl) {
    root = rootEl;
  }

  // `renderResult` pode ser um nó DOM, ou { node, cleanup } quando a tela
  // precisa de um intervalo/timer para ser cancelado ao sair (ex.: cronômetro).
  function show(renderResult) {
    if (typeof activeCleanup === 'function') {
      activeCleanup();
      activeCleanup = null;
    }
    var node = renderResult;
    if (renderResult && renderResult.node) {
      node = renderResult.node;
      activeCleanup = renderResult.cleanup || null;
    }
    Dom.clear(root);
    root.appendChild(node);
    root.classList.remove('screen-fade-in');
    void root.offsetWidth;
    root.classList.add('screen-fade-in');
    window.scrollTo(0, 0);
  }

  BessDoku.Screens = {
    init: init,
    show: show
  };
})(window.BessDoku);
