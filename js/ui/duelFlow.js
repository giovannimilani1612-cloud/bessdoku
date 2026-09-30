/*
 * BESS Doku — ui/duelFlow.js
 * Orquestra as telas do BESS Doku Duel e do Melhor de 3: escolher personagem
 * -> jogar -> passar dispositivo -> escolher personagem -> jogar -> (transição
 * de rodada ou resultado). Cada jogador escolhe um personagem diferente na
 * 1ª rodada; nas seguintes os personagens são mantidos.
 * O resultado do Jogador 1 nunca é renderizado antes de o Jogador 2 terminar.
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var Screens = BessDoku.Screens;
  var Duel = BessDoku.Duel;
  var Difficulty = BessDoku.Difficulty;
  var Timer = BessDoku.Timer;
  var Characters = BessDoku.Characters;
  var CharacterSelectScreen = BessDoku.CharacterSelectScreen;
  var Sound = BessDoku.Sound;
  var Toast = BessDoku.Toast;
  var PlayScreen = BessDoku.PlayScreen;

  function roundLabelFor(match) {
    return match.totalRounds > 1 ? ('Rodada ' + Duel.currentRoundNumber(match) + ' de ' + match.totalRounds) : '';
  }

  function contextLine(match) {
    var round = roundLabelFor(match);
    return (round ? round + ' · ' : '') + Difficulty.get(match.tierKey).label;
  }

  function centeredScreen(children) {
    return Dom.el('div', { class: 'screen' }, [Dom.el('div', { class: 'pass-device' }, children)]);
  }

  function renderLoadingScreen() {
    return centeredScreen([
      Characters.buildFigure(Characters.DEFAULT_KEY, { size: 'lg', className: 'mascot--loading' }),
      Dom.el('h1', { text: 'Preparando o desafio...' }),
      Dom.el('p', { class: 'text-secondary', text: 'Só um instante, o Lulu está pensando!' })
    ]);
  }

  async function start(tierKey, totalRounds, router) {
    var match = Duel.createMatch(tierKey, totalRounds);
    Screens.show(renderLoadingScreen());
    await Duel.startRound(match, {}, {});
    showReadyP1(match, router);
  }

  // ---------- Jogador 1 ----------
  function showReadyP1(match, router) {
    if (match.characterP1) {
      // Rodadas seguintes do Melhor de 3: personagem já escolhido.
      Screens.show(centeredScreen([
        Characters.buildFigure(match.characterP1, { size: 'lg' }),
        Dom.el('h1', { text: 'Jogador 1' }),
        Dom.el('p', { class: 'text-secondary', text: 'Prepare-se, ' + Characters.get(match.characterP1).label + '! ' + contextLine(match) }),
        Dom.el('button', {
          class: 'btn btn--primary btn--block', text: 'Começar!',
          onClick: function () { Sound.resumeContext(); Duel.beginP1(match); showPlayP1(match, router); }
        }),
        Dom.el('button', { class: 'btn btn--ghost btn--block', text: 'Cancelar e voltar ao início', onClick: router.goHome })
      ]));
      return;
    }
    Screens.show(CharacterSelectScreen.render({
      title: 'Jogador 1',
      subtitle: 'Escolha seu personagem · ' + contextLine(match),
      initialKey: Characters.getLast(),
      confirmLabel: 'Começar!',
      onBack: router.goHome,
      backLabel: 'Cancelar e voltar ao início',
      onSelect: function (key) {
        Characters.setLast(key);
        Duel.beginP1(match, key);
        showPlayP1(match, router);
      }
    }));
  }

  function showPlayP1(match, router) {
    Screens.show(PlayScreen.render(match.sessionP1, {
      title: 'Jogador 1',
      subtitle: contextLine(match),
      showBack: false,
      onSolved: function () {
        Duel.finishP1(match);
        showPassDevice(match, router);
      }
    }));
  }

  // ---------- Passagem e Jogador 2 ----------
  function showPassDevice(match, router) {
    Screens.show(centeredScreen([
      Characters.buildFigure(Characters.DEFAULT_KEY, { size: 'lg' }),
      Dom.el('h1', { text: 'Desafio concluído!' }),
      Dom.el('p', { class: 'text-secondary', text: 'Passe o dispositivo para o Jogador 2.' }),
      Dom.el('p', { class: 'text-small text-secondary', text: 'O resultado do Jogador 1 ficará em segredo até o fim.' }),
      Dom.el('button', {
        class: 'btn btn--primary btn--block', text: 'Estou pronto, Jogador 2!',
        onClick: function () {
          Sound.resumeContext();
          if (match.characterP2) {
            Duel.beginP2(match);
            showPlayP2(match, router);
          } else {
            showSelectP2(match, router);
          }
        }
      })
    ]));
  }

  function showSelectP2(match, router) {
    Screens.show(CharacterSelectScreen.render({
      title: 'Jogador 2',
      subtitle: 'Escolha seu personagem · ' + contextLine(match),
      excludeKey: match.characterP1,
      excludeReason: 'Já escolhido pelo Jogador 1',
      initialKey: Characters.getLast(),
      confirmLabel: 'Começar!',
      onSelect: function (key) {
        Duel.beginP2(match, key);
        showPlayP2(match, router);
      }
    }));
  }

  function showPlayP2(match, router) {
    Screens.show(PlayScreen.render(match.sessionP2, {
      title: 'Jogador 2',
      subtitle: contextLine(match),
      showBack: false,
      onSolved: function () {
        Duel.finishP2(match);
        if (match.phase === 'round-transition') {
          showRoundTransition(match, router);
        } else {
          showResults(match, router);
        }
      }
    }));
  }

  function showRoundTransition(match, router) {
    var finishedRound = match.roundIndex;
    Screens.show(centeredScreen([
      Characters.buildFigure(Characters.DEFAULT_KEY, { size: 'lg' }),
      Dom.el('h1', { text: 'Rodada ' + finishedRound + ' concluída!' }),
      Dom.el('p', { class: 'text-secondary', text: 'Passe o dispositivo. Os placares só aparecem no final.' }),
      Dom.el('button', {
        class: 'btn btn--primary btn--block', text: 'Continuar',
        onClick: async function () {
          Screens.show(renderLoadingScreen());
          await Duel.continueToNextRound(match, {}, {});
          showReadyP1(match, router);
        }
      })
    ]));
  }

  // ---------- Resultado ----------
  function playerCard(label, characterKey, finalTimeMs, meta, isWinner) {
    return Dom.el('div', { class: 'duel-player-card' + (isWinner ? ' is-winner' : '') }, [
      isWinner ? Dom.el('div', { class: 'duel-player-card__crown', text: '👑' }) : null,
      Dom.el('div', { class: 'duel-player-card__name', text: label }),
      Dom.el('div', { class: 'duel-player-card__meta', text: Characters.get(characterKey).label }),
      Dom.el('div', { class: 'duel-player-card__time', text: Timer.format(finalTimeMs) }),
      Dom.el('div', { class: 'duel-player-card__meta', text: meta })
    ]);
  }

  function showResults(match, router) {
    var isBo3 = match.totalRounds > 1;
    var tier = Difficulty.get(match.tierKey);
    var screen = Dom.el('div', { class: 'screen screen--result container-scroll' });

    var totalP1 = isBo3 ? match.totals.p1 : match.roundResultsP1[0].finalTimeMs;
    var totalP2 = isBo3 ? match.totals.p2 : match.roundResultsP2[0].finalTimeMs;
    var winner = match.winner;

    screen.appendChild(Dom.el('h1', { class: 'text-center', text: 'Quem é o Rei do BESS Doku?' }));
    screen.appendChild(Dom.el('p', { class: 'text-center text-secondary', text: tier.label + (isBo3 ? ' · Melhor de 3' : ' · Duelo') }));

    screen.appendChild(Dom.el('div', { class: 'mascot-hero-wrap' }, [Dom.el('div', { class: 'mascot-pair' }, [
      Dom.el('div', { class: 'mascot-pair__item' + (winner === 'p1' ? ' mascot-pair__item--winner' : '') }, [
        Characters.buildFigure(match.characterP1, { size: 'md' }),
        Dom.el('span', { class: 'text-small text-secondary', text: 'Jogador 1' })
      ]),
      Dom.el('div', { class: 'mascot-pair__item' + (winner === 'p2' ? ' mascot-pair__item--winner' : '') }, [
        Characters.buildFigure(match.characterP2, { size: 'md' }),
        Dom.el('span', { class: 'text-small text-secondary', text: 'Jogador 2' })
      ])
    ])]));

    var errP1 = sum(match.roundResultsP1, 'errorCount'), errP2 = sum(match.roundResultsP2, 'errorCount');
    screen.appendChild(Dom.el('div', { class: 'duel-compare' }, [
      playerCard('Jogador 1', match.characterP1, totalP1, errP1 + ' erro(s)', winner === 'p1'),
      playerCard('Jogador 2', match.characterP2, totalP2, errP2 + ' erro(s)', winner === 'p2')
    ]));

    if (isBo3) {
      var table = Dom.el('div', { class: 'card card--flat stack' });
      table.appendChild(Dom.el('div', { class: 'row row--between text-small text-secondary' }, [
        Dom.el('span', { text: 'Rodada' }), Dom.el('span', { text: 'Jogador 1' }), Dom.el('span', { text: 'Jogador 2' })
      ]));
      for (var i = 0; i < match.totalRounds; i++) {
        table.appendChild(Dom.el('div', { class: 'row row--between' }, [
          Dom.el('span', { text: String(i + 1) }),
          Dom.el('span', { text: Timer.format(match.roundResultsP1[i].finalTimeMs) }),
          Dom.el('span', { text: Timer.format(match.roundResultsP2[i].finalTimeMs) })
        ]));
      }
      screen.appendChild(table);
    }

    var winnerName = winner === 'p1' ? 'Jogador 1' : 'Jogador 2';
    var winnerCharacter = Characters.get(winner === 'p1' ? match.characterP1 : match.characterP2).label;
    var headline = winner === 'tie'
      ? 'Empate incrível! Os dois pensam como Lulus.'
      : 'AU-AU! ' + winnerName + ' (' + winnerCharacter + ') venceu!';
    screen.appendChild(Dom.el('p', { class: 'text-center text-lg', text: headline }));

    var actions = Dom.el('div', { class: 'stack' }, [
      Dom.el('button', {
        class: 'btn btn--primary btn--block',
        text: isBo3 ? 'Jogar novo Melhor de 3' : 'Jogar novo Duelo',
        onClick: function () { start(match.tierKey, match.totalRounds, router); }
      }),
      Dom.el('button', { class: 'btn btn--dark btn--block', text: 'Início', onClick: router.goHome })
    ]);
    screen.appendChild(actions);

    Screens.show(screen);
    Sound.duelWin();
    Toast.burstConfetti(70);
  }

  function sum(arr, key) {
    return arr.reduce(function (acc, item) { return acc + item[key]; }, 0);
  }

  BessDoku.DuelFlow = { start: start };
})(window.BessDoku);
