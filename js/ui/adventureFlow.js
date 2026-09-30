/*
 * BESS Doku — ui/adventureFlow.js
 * Orquestra as telas do modo Aventura (individual e em dupla): intro ->
 * escolher personagem(ns) -> jogar fase -> "fase vencida" (+2:00, e na dupla
 * passa o aparelho) -> próxima fase ... até o tempo acabar -> resumo final.
 * A lógica da corrida (banco de tempo, fases, recordes) fica em game/adventure.js.
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var Screens = BessDoku.Screens;
  var Adventure = BessDoku.Adventure;
  var Timer = BessDoku.Timer;
  var Characters = BessDoku.Characters;
  var CharacterSelectScreen = BessDoku.CharacterSelectScreen;
  var PlayScreen = BessDoku.PlayScreen;
  var Sound = BessDoku.Sound;
  var Toast = BessDoku.Toast;

  function modeTitle(run) {
    return run.mode === 'team' ? 'Aventura em Dupla' : 'Aventura';
  }

  function tierLine(tier) {
    return tier.label + ' ' + tier.size + 'x' + tier.size;
  }

  function playerName(run, player) {
    return 'Jogador ' + player + ' (' + Characters.get(Adventure.characterForPlayer(run, player)).label + ')';
  }

  // Formata o banco de tempo sem centésimos: "02:00".
  function formatBank(ms) {
    return Timer.format(ms).slice(0, 5);
  }

  function centeredScreen(children) {
    return Dom.el('div', { class: 'screen' }, [Dom.el('div', { class: 'pass-device' }, children)]);
  }

  function renderLoadingScreen(characterKey) {
    return centeredScreen([
      Characters.buildFigure(characterKey || Characters.DEFAULT_KEY, { size: 'lg', className: 'mascot--loading' }),
      Dom.el('h1', { text: 'Preparando a próxima fase...' }),
      Dom.el('p', { class: 'text-secondary', text: 'Só um instante, o Lulu está pensando!' })
    ]);
  }

  function bestLine(mode) {
    var best = Adventure.getBest(mode);
    return best ? 'Recorde: ' + best.bestPhasesWon + (best.bestPhasesWon === 1 ? ' fase' : ' fases') : 'Nenhum recorde ainda';
  }

  // ---------- Início ----------
  function start(mode, router) {
    var run = Adventure.createRun(mode);
    showIntro(run, router);
  }

  function showIntro(run, router) {
    var bonus = formatBank(Adventure.BONUS_MS);
    var isTeam = run.mode === 'team';
    var screen = Dom.el('div', { class: 'screen screen--adventure container-scroll' });

    screen.appendChild(Dom.el('div', { class: 'topbar' }, [
      Dom.el('button', { class: 'btn btn--icon', text: '←', onClick: router.goHome }),
      Dom.el('div', { class: 'topbar__title text-center' }, [
        Dom.el('div', { text: modeTitle(run) }),
        Dom.el('div', { class: 'text-small text-secondary', text: 'Contra o relógio' })
      ]),
      Dom.el('div', { style: 'width:46px' })
    ]));

    screen.appendChild(Characters.buildHeroPoster(Characters.DEFAULT_KEY, { small: true, idle: true }));

    screen.appendChild(Dom.el('h1', { class: 'text-center', text: 'Até onde você chega?' }));
    screen.appendChild(Dom.el('p', { class: 'text-center text-secondary', text: isTeam
      ? 'Vocês se revezam a cada fase, com um único relógio para a dupla.'
      : 'Passe de fase em fase antes que o tempo acabe.' }));

    screen.appendChild(Dom.el('div', { class: 'rules-card' }, [
      Dom.el('span', { class: 'rule-chip', text: '⏱ Começa com ' + formatBank(Adventure.INITIAL_BANK_MS) }),
      Dom.el('span', { class: 'rule-chip', text: '✅ Fase vencida: +' + bonus }),
      Dom.el('span', { class: 'rule-chip', text: '❌ Erro: −' + Adventure.ERROR_PENALTY_SECONDS + 's' }),
      Dom.el('span', { class: 'rule-chip', text: '💡 Dica: −' + Adventure.HINT_PENALTY_SECONDS + 's' }),
      Dom.el('span', { class: 'rule-chip', text: '📈 Dificuldade sobe a cada ' + Adventure.PHASES_PER_TIER + ' fases' })
    ]));

    screen.appendChild(Dom.el('p', { class: 'text-center text-strong', text: '🏆 ' + bestLine(run.mode) }));

    screen.appendChild(Dom.el('div', { class: 'stack' }, [
      Dom.el('button', {
        class: 'btn btn--primary btn--block', text: isTeam ? 'Escolher personagens' : 'Escolher personagem',
        onClick: function () { Sound.resumeContext(); showSelectP1(run, router); }
      }),
      Dom.el('button', { class: 'btn btn--ghost btn--block', text: 'Voltar', onClick: router.goHome })
    ]));

    Screens.show(screen);
  }

  // ---------- Personagens ----------
  function showSelectP1(run, router) {
    var isTeam = run.mode === 'team';
    Screens.show(CharacterSelectScreen.render({
      title: isTeam ? 'Jogador 1' : 'Escolha seu personagem',
      subtitle: modeTitle(run),
      initialKey: Characters.getLast(),
      confirmLabel: isTeam ? 'Confirmar' : 'Começar!',
      onBack: function () { showIntro(run, router); },
      onSelect: function (key) {
        Characters.setLast(key);
        run.characters.p1 = key;
        if (isTeam) showSelectP2(run, router);
        else prepareAndPlay(run, router);
      }
    }));
  }

  function showSelectP2(run, router) {
    Screens.show(CharacterSelectScreen.render({
      title: 'Jogador 2',
      subtitle: modeTitle(run),
      excludeKey: run.characters.p1,
      excludeReason: 'Já escolhido pelo Jogador 1',
      initialKey: Characters.getLast(),
      confirmLabel: 'Começar!',
      onBack: function () { showSelectP1(run, router); },
      onSelect: function (key) {
        run.characters.p2 = key;
        prepareAndPlay(run, router);
      }
    }));
  }

  // ---------- Fase ----------
  async function prepareAndPlay(run, router, pendingPromise) {
    var player = Adventure.currentPlayer(run);
    Screens.show(renderLoadingScreen(Adventure.characterForPlayer(run, player)));
    try {
      await (pendingPromise || Adventure.preparePhase(run));
    } catch (e) {
      Toast.show('Não consegui montar o tabuleiro. Tente de novo.');
      router.goHome();
      return;
    }
    Adventure.beginPhase(run, {});
    showPlay(run, router);
  }

  function playContext(run, router) {
    var tier = Adventure.tierForPhase(run.phase);
    var player = Adventure.currentPlayer(run);
    return {
      title: 'Fase ' + run.phase,
      subtitle: (run.mode === 'team' ? 'Jogador ' + player + ' · ' : '') + tierLine(tier),
      showBack: true,
      onBack: function () { showPause(run, router); },
      countdown: {
        getRemainingMs: function () { return Adventure.getRemainingMs(run); },
        onExpired: function () {
          Adventure.timeUp(run);
          showGameOver(run, router);
        }
      },
      onSolved: function () {
        Adventure.phaseSolved(run);
        // Já começa a gerar o próximo tabuleiro enquanto a tela de transição
        // aparece; o relógio fica parado nesse intervalo.
        var nextPromise = Adventure.preparePhase(run);
        nextPromise.catch(function () { /* tratado ao continuar */ });
        showPhaseWon(run, router, nextPromise);
      }
    };
  }

  function showPlay(run, router) {
    Screens.show(PlayScreen.render(run.session, playContext(run, router)));
  }

  function showPhaseWon(run, router, nextPromise) {
    var finished = run.phaseResults[run.phaseResults.length - 1];
    var isTeam = run.mode === 'team';
    var nextPlayer = Adventure.currentPlayer(run);
    var nextTier = Adventure.tierForPhase(run.phase);
    var children = [
      Characters.buildFigure(Adventure.characterForPlayer(run, finished.player), { size: 'lg' }),
      Dom.el('h1', { text: 'Fase ' + finished.phase + ' vencida!' }),
      Dom.el('div', { class: 'adventure-bonus', text: '+' + formatBank(Adventure.BONUS_MS) }),
      Dom.el('p', { class: 'text-secondary', text: 'Tempo no banco: ' + formatBank(run.bankMs) }),
      Dom.el('p', { class: 'text-small text-secondary', text: 'Próxima: Fase ' + run.phase + ' · ' + tierLine(nextTier) })
    ];
    if (isTeam) {
      children.push(Dom.el('p', { class: 'text-strong', text: 'Passe o aparelho para o ' + playerName(run, nextPlayer) + '.' }));
    }
    children.push(Dom.el('button', {
      class: 'btn btn--primary btn--block',
      text: isTeam ? 'Estou pronto, Jogador ' + nextPlayer + '!' : 'Continuar',
      onClick: function () { Sound.resumeContext(); prepareAndPlay(run, router, nextPromise); }
    }));
    Screens.show(centeredScreen(children));
  }

  // ---------- Pausa ----------
  function showPause(run, router) {
    run.session.pause();
    Screens.show(centeredScreen([
      Characters.buildFigure(run.session.character, { size: 'lg' }),
      Dom.el('h1', { text: 'Pausado' }),
      Dom.el('p', { class: 'text-secondary', text: 'Restante: ' + Timer.format(Adventure.getRemainingMs(run)) }),
      Dom.el('p', { class: 'text-small text-secondary', text: 'O tabuleiro fica escondido enquanto o relógio está parado.' }),
      Dom.el('button', {
        class: 'btn btn--primary btn--block', text: 'Continuar',
        onClick: function () { Sound.resumeContext(); showPlay(run, router); }
      }),
      Dom.el('button', {
        class: 'btn btn--ghost btn--block', text: 'Encerrar aventura',
        onClick: function () { Adventure.abandon(run); showGameOver(run, router); }
      })
    ]));
  }

  // ---------- Fim ----------
  function showGameOver(run, router) {
    var summary = Adventure.finishRun(run);
    var isTeam = run.mode === 'team';
    var timeUp = summary.endReason === 'timeUp';
    var screen = Dom.el('div', { class: 'screen screen--result container-scroll' });

    var heroKey = isTeam ? Characters.DEFAULT_KEY : Adventure.characterForPlayer(run, 1);
    screen.appendChild(Characters.buildHeroPoster(heroKey, { small: true, celebrate: summary.isNewBest }));
    screen.appendChild(Dom.el('h1', { class: 'text-center', text: timeUp ? 'Tempo esgotado!' : 'Aventura encerrada' }));
    screen.appendChild(Dom.el('p', { class: 'text-center text-secondary', text: modeTitle(run) + ' · chegou à fase ' + summary.reachedPhase + ' · ' + tierLine(summary.reachedTier) }));

    screen.appendChild(Dom.el('p', { class: 'text-center text-xl', text: summary.phasesWon + (summary.phasesWon === 1 ? ' fase vencida' : ' fases vencidas') }));
    if (summary.isNewBest) {
      screen.appendChild(Dom.el('p', { class: 'text-center text-accent', text: '🏆 Novo recorde!' }));
    } else {
      screen.appendChild(Dom.el('p', { class: 'text-center text-small text-secondary', text: bestLine(run.mode) }));
    }

    if (isTeam) {
      screen.appendChild(Dom.el('div', { class: 'duel-compare' }, [
        teamCard(run, 1, summary.perPlayer[1]),
        teamCard(run, 2, summary.perPlayer[2])
      ]));
    }

    screen.appendChild(Dom.el('div', { class: 'card' }, [Dom.el('div', { class: 'stat-grid stat-grid--two' }, [
      statBox(String(summary.phasesWon), 'Fases'),
      statBox(Timer.format(summary.totalPlayedMs), 'Tempo jogado'),
      statBox(String(summary.totalErrors), 'Erros'),
      statBox(String(summary.totalHints), 'Dicas')
    ])]));

    screen.appendChild(Dom.el('div', { class: 'stack' }, [
      Dom.el('button', {
        class: 'btn btn--primary btn--block', text: 'Jogar de novo',
        onClick: function () {
          Sound.resumeContext();
          var again = Adventure.createRun(run.mode);
          again.characters = { p1: run.characters.p1, p2: run.characters.p2 };
          prepareAndPlay(again, router);
        }
      }),
      Dom.el('button', { class: 'btn btn--dark btn--block', text: 'Início', onClick: router.goHome })
    ]));

    Screens.show(screen);
    if (summary.isNewBest) Toast.burstConfetti(50);
  }

  function statBox(value, label) {
    return Dom.el('div', { class: 'stat-box' }, [
      Dom.el('div', { class: 'stat-box__value', text: value }),
      Dom.el('div', { class: 'stat-box__label', text: label })
    ]);
  }

  function teamCard(run, player, phasesWon) {
    var key = Adventure.characterForPlayer(run, player);
    return Dom.el('div', { class: 'duel-player-card' }, [
      Characters.buildFigure(key, { size: 'md' }),
      Dom.el('div', { class: 'duel-player-card__name', text: 'Jogador ' + player }),
      Dom.el('div', { class: 'duel-player-card__meta', text: Characters.get(key).label }),
      Dom.el('div', { class: 'duel-player-card__time', text: String(phasesWon) }),
      Dom.el('div', { class: 'duel-player-card__meta', text: phasesWon === 1 ? 'fase vencida' : 'fases vencidas' })
    ]);
  }

  BessDoku.AdventureFlow = { start: start };
})(window.BessDoku);
