/*
 * BESS Doku — ui/play.js
 * Tela de jogo genérica: HUD (cronômetro/estatísticas), regras, tabuleiro,
 * ferramentas (personagem/X) e dica. Reutilizada por Solo, Diário, Duelo e
 * Melhor de 3 — quem chama decide o título/contexto e o que acontece ao resolver.
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var Timer = BessDoku.Timer;
  var BoardView = BessDoku.BoardView;
  var Sound = BessDoku.Sound;
  var Toast = BessDoku.Toast;
  var Difficulty = BessDoku.Difficulty;
  var Characters = BessDoku.Characters;

  var ENCOURAGE_LINES = ['Boa!', 'Quase lá!', 'Pense como um Lulu!', 'Continue assim!'];

  function pickEncouragement() {
    return ENCOURAGE_LINES[Math.floor(Math.random() * ENCOURAGE_LINES.length)];
  }

  // context: { title, subtitle, badge, showBack, onBack, onSolved(session) }
  function render(session, context) {
    context = context || {};
    var puzzle = session.puzzle;
    var tier = Difficulty.get(puzzle.difficultyTier);
    var character = Characters.get(session.character);
    var name = character.short;
    var rafId = null;

    var screen = Dom.el('div', { class: 'screen screen--play' });

    var backBtn = context.showBack
      ? Dom.el('button', { class: 'btn btn--icon', text: '←', onClick: function () { context.onBack && context.onBack(); } })
      : Dom.el('div', { style: 'width:46px' });

    var topbar = Dom.el('div', { class: 'topbar' }, [
      backBtn,
      Dom.el('div', { class: 'topbar__title text-center' }, [
        Dom.el('div', { text: context.title || tier.label }),
        context.subtitle ? Dom.el('div', { class: 'text-small text-secondary', text: context.subtitle }) : null
      ]),
      Dom.el('div', { class: 'topbar__avatar', title: character.label }, [
        Characters.buildSVG(session.character, { size: 'sm', pose: 'idle', detail: 'iconic' })
      ])
    ]);

    var timerValueEl = Dom.el('span', { text: '00:00.00' });
    var errorsValueEl = Dom.el('span', { class: 'hud__stat-value', text: String(session.board.errorCount) });
    var hintsValueEl = Dom.el('span', { class: 'hud__stat-value', text: String(session.board.hintCount) });

    var hud = Dom.el('div', { class: 'hud' }, [
      Dom.el('div', { class: 'hud__col' }, [
        Dom.el('span', { class: 'hud__label', text: 'Tempo' }),
        Dom.el('span', { class: 'hud__timer' }, [timerValueEl])
      ]),
      Dom.el('div', { class: 'hud__stats' }, [
        Dom.el('div', { class: 'hud__col' }, [Dom.el('span', { class: 'hud__label', text: 'Erros' }), errorsValueEl]),
        Dom.el('div', { class: 'hud__col' }, [Dom.el('span', { class: 'hud__label', text: 'Dicas' }), hintsValueEl])
      ])
    ]);

    var rulesCard = Dom.el('div', { class: 'rules-card' }, [
      Dom.el('span', { class: 'rule-chip', text: '1 ' + name + ' por região' }),
      Dom.el('span', { class: 'rule-chip', text: '1 por linha e coluna' }),
      Dom.el('span', { class: 'rule-chip', text: 'Não podem se tocar' })
    ]);

    var boardView = BoardView.create(session);

    var controlsHint = Dom.el('p', {
      class: 'text-center text-small text-secondary',
      text: 'Toque para marcar ✕ · arraste para marcar vários · toque duas vezes rápido para colocar ' + name
    });

    var hintBtn = Dom.el('button', { class: 'btn btn--ghost btn--pill btn--block', text: '💡 Dica' });
    var hintToken = 0;
    hintBtn.addEventListener('click', function () {
      Sound.resumeContext();
      var hint = session.useHint();
      hintsValueEl.textContent = String(session.board.hintCount);
      if (hint) {
        Sound.hint();
        boardView.applyHintHighlight(hint);
        var myToken = ++hintToken;
        setTimeout(function () { if (myToken === hintToken) boardView.clearHintHighlight(); }, 3800);
      } else {
        Toast.show('Sem dicas lógicas agora — confie no seu raciocínio!');
      }
    });

    var toolbar = Dom.el('div', { class: 'toolbar' }, [hintBtn]);

    boardView.bindTapHandler(function (row, col, isDoubleTap) {
      Sound.resumeContext();
      boardView.clearHintHighlight();
      // O primeiro toque já foi aplicado na hora; no duplo, desfaz esse primeiro
      // toque para a jogada contar uma vez só (ver Session.undoRecentTap).
      if (isDoubleTap) session.undoRecentTap(row, col, 400);
      session.interactCell(row, col, isDoubleTap);
    });

    // Arrasto: pinta ✕ nas células vazias por onde o dedo passa.
    boardView.bindPaintHandler(function (row, col) {
      Sound.resumeContext();
      boardView.clearHintHighlight();
      session.paintX(row, col);
    });

    screen.appendChild(topbar);
    screen.appendChild(hud);
    screen.appendChild(rulesCard);
    screen.appendChild(Dom.el('div', { class: 'board-wrap' }, [boardView.el]));
    screen.appendChild(controlsHint);
    screen.appendChild(toolbar);

    // O cronômetro exibido já inclui as penalidades: cada erro faz o relógio
    // pular na hora (ver Session.getDisplayTimeMs).
    function tick() {
      timerValueEl.textContent = Timer.format(session.getDisplayTimeMs());
      if (!session.board.finished) rafId = requestAnimationFrame(tick);
    }

    // Liga os callbacks do Session às reações visuais do tabuleiro + feedback global.
    // `session.callbacks` é o mesmo objeto referenciado internamente pelo Session
    // (ver game/session.js), então preenchê-lo aqui conecta os eventos já disparados.
    Object.assign(session.callbacks, {
      place: function (payload) {
        boardView.applyPlaced(payload);
        Sound.place();
        if (Math.random() < 0.5) Toast.show(pickEncouragement());
      },
      clear: function (payload) { boardView.applyClear(payload); },
      mark: function (payload) { boardView.applyMark(payload); Sound.markX(); },
      error: function (payload) {
        // A casa errada recebeu um ✕ automático no Session: redesenha e treme.
        boardView.applyMark(payload);
        boardView.applyError(payload);
        Sound.error();
        errorsValueEl.textContent = String(session.board.errorCount);
        timerValueEl.textContent = Timer.format(session.getDisplayTimeMs());
        Dom.addTempClass(timerValueEl, 'hud__timer--penalty', 700);
        var penalty = payload.penaltySeconds || 0;
        Toast.show('Aqui não tem ' + name + '!' + (penalty ? ' +' + penalty + 's' : ''));
      },
      regionComplete: function (payload) { boardView.applyRegionGlow(payload); },
      solved: function (resultSnapshot) {
        Sound.win();
        Toast.show('Desafio concluído!');
        Toast.burstConfetti(46);
        timerValueEl.textContent = Timer.format(session.board.finalTimeMs);
        setTimeout(function () {
          context.onSolved && context.onSolved(session, resultSnapshot);
        }, 900);
      }
    });

    session.start();
    rafId = requestAnimationFrame(tick);

    function cleanup() {
      if (rafId) cancelAnimationFrame(rafId);
    }

    return { node: screen, cleanup: cleanup };
  }

  BessDoku.PlayScreen = {
    render: render
  };
})(window.BessDoku);
