/*
 * BESS Doku — ui/board.js
 * Renderiza o tabuleiro do puzzle e conecta os gestos à sessão de jogo:
 *   toque simples  -> alterna marcação X NA HORA (ou remove um Lulu já colocado)
 *   toque duplo    -> dois toques na mesma célula em até DOUBLE_TAP_MS:
 *                     confirma/coloca um Lulu (ou remove um já colocado)
 *   arrasto        -> pinta X em todas as células VAZIAS por onde o dedo/mouse
 *                     passa (nunca apaga X nem remove Lulu)
 * A detecção é feita via Pointer Events (não 'click'/'dblclick'). O ponteiro é
 * capturado pelo tabuleiro no pointerdown, então a célula sob o dedo é obtida
 * por elementFromPoint (o evt.target ficaria preso na célula inicial).
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
        cellEl.appendChild(Characters.buildFigure(session.character, { size: 'sm', className: 'cell__mascot' }));
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
    var onCellPaint = function () {}; // (row, col) — arrasto

    // ---------- Toque simples imediato, toque duplo e arrasto ----------
    var activePointer = null; // { pointerId, startX, startY, startCellEl, dragging, visited }
    var lastTap = null; // { key, ts } — último toque simples, para detectar o duplo

    function cellFromEvent(evt) {
      var target = evt.target;
      if (target && target.closest) return target.closest('.cell');
      return null;
    }

    // Célula sob um ponto da tela. Com o ponteiro capturado (e no touch por
    // padrão) evt.target fica preso na célula inicial, então usamos elementFromPoint.
    function cellAtPoint(x, y) {
      var el = document.elementFromPoint(x, y);
      if (!el || !el.closest) return null;
      var cellEl = el.closest('.cell');
      return (cellEl && boardEl.contains(cellEl)) ? cellEl : null;
    }

    function cellKey(cellEl) { return cellEl.dataset.row + '_' + cellEl.dataset.col; }

    function paintCell(cellEl) {
      var key = cellKey(cellEl);
      if (activePointer.visited[key]) return;
      activePointer.visited[key] = true;
      onCellPaint(Number(cellEl.dataset.row), Number(cellEl.dataset.col));
    }

    function resolveTap(row, col) {
      var key = row + '_' + col;
      var now = Date.now();
      if (lastTap && lastTap.key === key && (now - lastTap.ts) <= DOUBLE_TAP_MS) {
        lastTap = null;
        onCellTap(row, col, true);
        return;
      }
      lastTap = { key: key, ts: now };
      onCellTap(row, col, false); // aplicado na hora: o X aparece no ato
    }

    boardEl.addEventListener('pointerdown', function (evt) {
      var cellEl = cellFromEvent(evt);
      if (!cellEl) return;
      activePointer = {
        pointerId: evt.pointerId,
        startX: evt.clientX,
        startY: evt.clientY,
        startCellEl: cellEl,
        dragging: false,
        visited: {}
      };
      if (boardEl.setPointerCapture) {
        try { boardEl.setPointerCapture(evt.pointerId); } catch (e) { /* ponteiro já finalizado */ }
      }
    });

    // Pinta as células entre o último ponto conhecido e o atual. Um deslize
    // rápido gera poucos pointermove, e sem isso células do caminho ficariam de fora.
    function paintPath(x0, y0, x1, y1) {
      var step = Math.max(8, activePointer.cellSize / 2);
      var dx = x1 - x0;
      var dy = y1 - y0;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var n = Math.max(1, Math.ceil(dist / step));
      for (var i = 1; i <= n; i++) {
        var cellEl = cellAtPoint(x0 + dx * i / n, y0 + dy * i / n);
        if (cellEl) paintCell(cellEl);
      }
    }

    boardEl.addEventListener('pointermove', function (evt) {
      if (!activePointer || activePointer.pointerId !== evt.pointerId) return;
      if (!activePointer.dragging) {
        var dx = evt.clientX - activePointer.startX;
        var dy = evt.clientY - activePointer.startY;
        if (Math.sqrt(dx * dx + dy * dy) <= MOVE_TOLERANCE_PX) return;
        activePointer.dragging = true;
        activePointer.cellSize = activePointer.startCellEl.getBoundingClientRect().width || 40;
        activePointer.lastX = activePointer.startX;
        activePointer.lastY = activePointer.startY;
        lastTap = null; // um arrasto nunca vira metade de um toque duplo
        paintCell(activePointer.startCellEl);
      }
      paintPath(activePointer.lastX, activePointer.lastY, evt.clientX, evt.clientY);
      activePointer.lastX = evt.clientX;
      activePointer.lastY = evt.clientY;
    });

    boardEl.addEventListener('pointerup', function (evt) {
      if (!activePointer || activePointer.pointerId !== evt.pointerId) { activePointer = null; return; }
      var pointer = activePointer;
      activePointer = null;
      if (pointer.dragging) return; // arrasto já pintou durante o movimento
      var endCellEl = cellAtPoint(evt.clientX, evt.clientY);
      if (endCellEl !== pointer.startCellEl) return; // soltou fora da célula onde o toque começou
      resolveTap(Number(pointer.startCellEl.dataset.row), Number(pointer.startCellEl.dataset.col));
    });

    boardEl.addEventListener('pointercancel', function () { activePointer = null; });
    boardEl.addEventListener('lostpointercapture', function () { activePointer = null; });

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
    function bindPaintHandler(fn) { onCellPaint = fn; }

    // Estado inicial: necessário quando a sessão já vem com marcações
    // (Desafio Diário retomado); sem isso a grade apareceria vazia.
    refreshAll();

    return {
      el: boardEl,
      cellEls: cellEls,
      bindTapHandler: bindTapHandler,
      bindPaintHandler: bindPaintHandler,
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
