/*
 * BESS Doku — ui/board.js
 * Renderiza o tabuleiro do puzzle e conecta os gestos à sessão de jogo:
 *   toque simples  -> alterna marcação X (ou remove um Lulu já colocado)
 *   toque duplo    -> confirma/coloca um Lulu (ou remove um já colocado)
 * A detecção é feita via Pointer Events (não 'click'/'dblclick'), medindo a
 * distância entre o início e o fim do toque, para que arrastar o dedo/mouse
 * pelo tabuleiro NUNCA seja interpretado como uma sequência de marcações —
 * só conta como jogada um toque que começa e termina na mesma célula, sem
 * deslocamento relevante.
 * Não decide sons/toasts/navegação — apenas o estado visual das células; quem
 * monta a sessão (ui/play.js) registra os callbacks do Session e repassa para
 * os métodos `apply*` retornados aqui.
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var Rules = BessDoku.Rules;
  var Characters = BessDoku.Characters;

  var DOUBLE_TAP_MS = 300;
  var MOVE_TOLERANCE_PX = 14;

  function regionClass(region) {
    return 'cell--r' + (region % 12);
  }

  function createBoardView(session) {
    var puzzle = session.puzzle;
    var size = puzzle.size;
    var regions = puzzle.regions;

    var boardEl = Dom.el('div', { class: 'board' });
    boardEl.style.setProperty('--n', size);

    var cellEls = [];
    for (var r = 0; r < size; r++) {
      var rowArr = [];
      for (var c = 0; c < size; c++) {
        var cellEl = Dom.el('button', {
          type: 'button',
          class: 'cell ' + regionClass(regions[r][c]),
          dataset: { row: String(r), col: String(c) },
          'aria-label': 'Linha ' + (r + 1) + ', coluna ' + (c + 1)
        });
        cellEl.style.borderRight = (c < size - 1)
          ? (regions[r][c] !== regions[r][c + 1] ? '3px solid var(--region-border)' : '1px solid var(--region-border-soft)')
          : 'none';
        cellEl.style.borderBottom = (r < size - 1)
          ? (regions[r][c] !== regions[r + 1][c] ? '3px solid var(--region-border)' : '1px solid var(--region-border-soft)')
          : 'none';
        boardEl.appendChild(cellEl);
        rowArr.push(cellEl);
      }
      cellEls.push(rowArr);
    }

    function renderCellContent(r, c) {
      var cellEl = cellEls[r][c];
      var mark = session.board.marks[r][c];
      Dom.clear(cellEl);
      cellEl.classList.remove('cell--lulu', 'cell--x');
      if (mark === Rules.LULU) {
        cellEl.classList.add('cell--lulu');
        cellEl.appendChild(Characters.buildSVG(session.character, { size: 'sm', pose: 'happy', detail: 'iconic', className: 'cell__mascot' }));
      } else if (mark === Rules.MARK_X) {
        cellEl.classList.add('cell--x');
        cellEl.appendChild(Dom.el('span', { class: 'cell__x', text: '✕' }));
      }
    }

    function refreshAll() {
      for (var r = 0; r < size; r++) {
        for (var c = 0; c < size; c++) renderCellContent(r, c);
      }
    }

    var onCellTap = function () {}; // (row, col, isDoubleTap)

    // ---------- Detecção de toque simples/duplo, imune a arrastos ----------
    var activePointer = null; // { pointerId, startX, startY, cellEl }
    var pendingSingle = null; // { key, timer }

    function cellFromEvent(evt) {
      var target = evt.target;
      if (target && target.closest) return target.closest('.cell');
      return null;
    }

    function resolveTap(row, col) {
      var key = row + '_' + col;
      if (pendingSingle && pendingSingle.key === key) {
        clearTimeout(pendingSingle.timer);
        pendingSingle = null;
        onCellTap(row, col, true);
        return;
      }
      if (pendingSingle) {
        clearTimeout(pendingSingle.timer);
        pendingSingle = null;
      }
      pendingSingle = {
        key: key,
        timer: setTimeout(function () {
          pendingSingle = null;
          onCellTap(row, col, false);
        }, DOUBLE_TAP_MS)
      };
    }

    boardEl.addEventListener('pointerdown', function (evt) {
      var cellEl = cellFromEvent(evt);
      if (!cellEl) return;
      activePointer = { pointerId: evt.pointerId, startX: evt.clientX, startY: evt.clientY, cellEl: cellEl };
    });

    boardEl.addEventListener('pointerup', function (evt) {
      if (!activePointer || activePointer.pointerId !== evt.pointerId) { activePointer = null; return; }
      var dx = evt.clientX - activePointer.startX;
      var dy = evt.clientY - activePointer.startY;
      var moved = Math.sqrt(dx * dx + dy * dy);
      var startCellEl = activePointer.cellEl;
      activePointer = null;
      if (moved > MOVE_TOLERANCE_PX) return; // foi um arrasto — ignora, não marca nada
      var endCellEl = cellFromEvent(evt);
      if (endCellEl !== startCellEl) return; // soltou fora da célula onde o toque começou
      resolveTap(Number(startCellEl.dataset.row), Number(startCellEl.dataset.col));
    });

    boardEl.addEventListener('pointercancel', function () { activePointer = null; });

    // Acessibilidade por teclado: Enter confirma um Lulu, Espaço marca/desmarca X.
    boardEl.addEventListener('keydown', function (evt) {
      var cellEl = cellFromEvent(evt);
      if (!cellEl) return;
      if (evt.key === 'Enter') {
        evt.preventDefault();
        onCellTap(Number(cellEl.dataset.row), Number(cellEl.dataset.col), true);
      } else if (evt.key === ' ' || evt.key === 'Spacebar') {
        evt.preventDefault();
        onCellTap(Number(cellEl.dataset.row), Number(cellEl.dataset.col), false);
      }
    });

    function bindTapHandler(fn) { onCellTap = fn; }

    // Estado inicial: necessário quando a sessão já vem com marcações
    // (Desafio Diário retomado); sem isso a grade apareceria vazia.
    refreshAll();

    return {
      el: boardEl,
      cellEls: cellEls,
      bindTapHandler: bindTapHandler,
      refreshAll: refreshAll,
      applyPlaced: function (payload) {
        renderCellContent(payload.row, payload.col);
        Dom.addTempClass(cellEls[payload.row][payload.col], 'cell--just-placed', 320);
      },
      applyClear: function (payload) {
        renderCellContent(payload.row, payload.col);
      },
      applyMark: function (payload) {
        renderCellContent(payload.row, payload.col);
      },
      applyError: function (payload) {
        Dom.addTempClass(cellEls[payload.row][payload.col], 'cell--error', 360);
      },
      applyRegionGlow: function (payload) {
        Dom.addTempClass(cellEls[payload.row][payload.col], 'cell--region-complete', 620);
      },
      applyHintHighlight: function (payload) {
        this.clearHintHighlight();
        if (payload) cellEls[payload.row][payload.col].classList.add('cell--hint');
      },
      clearHintHighlight: function () {
        for (var r = 0; r < size; r++) {
          for (var c = 0; c < size; c++) cellEls[r][c].classList.remove('cell--hint');
        }
      }
    };
  }

  BessDoku.BoardView = {
    create: createBoardView
  };
})(window.BessDoku);
