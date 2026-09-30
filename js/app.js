/*
 * BESS Doku — app.js
 * Ponto de entrada: monta o Router e liga todas as telas. Carregado por
 * último, depois de todos os módulos do namespace BessDoku estarem prontos.
 */
(function (BessDoku) {
  'use strict';

  function submitRankingEntry(snapshot) {
    var settings = BessDoku.Settings.get();
    return BessDoku.Ranking.submit({
      name: settings.playerName,
      character: snapshot.character,
      difficulty: snapshot.difficultyTier,
      finalTimeMs: snapshot.finalTimeMs,
      errorCount: snapshot.errorCount,
      penaltySeconds: snapshot.penaltySeconds,
      hintCount: snapshot.hintCount
    });
  }

  function renderLoadingScreen() {
    return BessDoku.Dom.el('div', { class: 'screen' }, [BessDoku.Dom.el('div', { class: 'pass-device' }, [
      BessDoku.Characters.buildFigure(BessDoku.Characters.DEFAULT_KEY, { size: 'lg', className: 'mascot--loading' }),
      BessDoku.Dom.el('h1', { text: 'Preparando o desafio...' }),
      BessDoku.Dom.el('p', { class: 'text-secondary', text: 'Só um instante, o Lulu está pensando!' })
    ])]);
  }

  // Tela de escolha de personagem antes de uma partida individual. A escolha
  // fica salva como padrão para a próxima vez.
  function chooseCharacter(subtitle, onBack, onChosen) {
    BessDoku.Screens.show(BessDoku.CharacterSelectScreen.render({
      title: 'Escolha seu personagem',
      subtitle: subtitle,
      initialKey: BessDoku.Characters.getLast(),
      confirmLabel: 'Jogar!',
      onBack: onBack,
      onSelect: function (key) {
        BessDoku.Characters.setLast(key);
        onChosen(key);
      }
    }));
  }

  async function startSoloSession(tierKey, characterKey, Router) {
    BessDoku.Screens.show(renderLoadingScreen());
    var puzzle = await BessDoku.Generator.generatePuzzleAsync(tierKey);
    var session = BessDoku.Session.create(puzzle, 'solo', {}, null, characterKey);
    BessDoku.Screens.show(BessDoku.PlayScreen.render(session, {
      title: BessDoku.Difficulty.get(tierKey).label,
      subtitle: 'Modo Solo',
      showBack: true,
      onBack: Router.goHome,
      onSolved: function (sess, snapshot) {
        var entry = submitRankingEntry(snapshot);
        var bestTimes = BessDoku.Ranking.getBestTimes();
        var bestForTier = bestTimes[snapshot.difficultyTier];
        var isNewBest = !!(bestForTier && bestForTier.id === entry.id);
        BessDoku.Screens.show(BessDoku.ResultScreen.render(snapshot, {
          isNewBest: isNewBest,
          onPlayAgain: function () { startSoloSession(tierKey, characterKey, Router); },
          onRanking: Router.goRanking,
          onHome: Router.goHome
        }));
      }
    }));
  }

  function startSolo(tierKey, Router) {
    var tier = BessDoku.Difficulty.get(tierKey);
    chooseCharacter('Modo Solo · ' + tier.label, function () { Router.goDifficultySelect('solo'); }, function (key) {
      startSoloSession(tierKey, key, Router);
    });
  }

  function dailySaveProgress(dateKey, data, session) {
    if (session.board.finished) return;
    data.board = {
      marks: session.board.marks,
      errorCount: session.board.errorCount,
      hintCount: session.board.hintCount,
      moveCount: session.board.moveCount,
      penaltySeconds: session.board.penaltySeconds,
      initialElapsedMs: session.getLiveElapsedMs(),
      character: session.character
    };
    BessDoku.DailyChallenge.save(dateKey, data);
  }

  async function startDailySession(Router) {
    BessDoku.Screens.show(renderLoadingScreen());
    var dateKey = BessDoku.DailyChallenge.todayKey();
    var data = await BessDoku.DailyChallenge.loadOrCreate(dateKey);

    if (data.completed && data.result) {
      BessDoku.Screens.show(BessDoku.ResultScreen.render(data.result, {
        title: 'Você já jogou hoje!',
        subtitleLine: 'Volte amanhã para um novo Desafio Diário.',
        hidePlayAgain: true,
        onRanking: Router.goRanking,
        onHome: Router.goHome
      }));
      return;
    }

    // Partida em andamento salva: retoma com o mesmo personagem, sem perguntar.
    if (data.board && data.board.character) {
      launchDaily(dateKey, data, data.board.character, Router);
      return;
    }
    var tier = BessDoku.Difficulty.get(data.puzzle.difficultyTier);
    chooseCharacter('Desafio Diário · ' + tier.label, Router.goHome, function (key) {
      launchDaily(dateKey, data, key, Router);
    });
  }

  function launchDaily(dateKey, data, characterKey, Router) {
    var puzzle = data.puzzle;
    var resumeData = data.board ? {
      marks: data.board.marks,
      errorCount: data.board.errorCount,
      hintCount: data.board.hintCount,
      moveCount: data.board.moveCount,
      penaltySeconds: data.board.penaltySeconds,
      initialElapsedMs: data.board.initialElapsedMs,
      character: data.board.character
    } : null;

    var session = BessDoku.Session.create(puzzle, 'daily', {}, resumeData, characterKey);
    var tier = BessDoku.Difficulty.get(puzzle.difficultyTier);

    var renderResult = BessDoku.PlayScreen.render(session, {
      title: 'Desafio Diário',
      subtitle: BessDoku.Dates.formatDisplayDate(dateKey) + ' · ' + tier.label,
      showBack: true,
      onBack: Router.goHome,
      onSolved: function (sess, snapshot) {
        submitRankingEntry(snapshot);
        data.completed = true;
        data.result = snapshot;
        data.board = null;
        BessDoku.DailyChallenge.save(dateKey, data);
        BessDoku.Screens.show(BessDoku.ResultScreen.render(snapshot, {
          title: 'Desafio Diário concluído!',
          hidePlayAgain: true,
          onRanking: Router.goRanking,
          onHome: Router.goHome
        }));
      }
    });

    var saveInterval = setInterval(function () { dailySaveProgress(dateKey, data, session); }, 3000);
    var originalCleanup = renderResult.cleanup;
    renderResult.cleanup = function () {
      if (originalCleanup) originalCleanup();
      clearInterval(saveInterval);
      dailySaveProgress(dateKey, data, session);
    };

    BessDoku.Screens.show(renderResult);
  }

  function initApp() {
    var rootEl = document.getElementById('screen-root');
    BessDoku.Screens.init(rootEl);

    var settings = BessDoku.Settings.get();
    document.body.classList.toggle('reduced-motion', !!settings.reducedMotion);

    var Router = {
      goHome: function () { BessDoku.Screens.show(BessDoku.HomeScreen.render(Router)); },
      goDifficultySelect: function (mode) { BessDoku.Screens.show(BessDoku.DifficultySelectScreen.render(mode, Router)); },
      goRanking: function () { BessDoku.Screens.show(BessDoku.RankingScreen.render(Router)); },
      goSettings: function () { BessDoku.Screens.show(BessDoku.SettingsScreen.render(Router)); },
      startSolo: function (tierKey) { startSolo(tierKey, Router); },
      startDaily: function () { startDailySession(Router); },
      startDuel: function (tierKey) { BessDoku.DuelFlow.start(tierKey, 1, Router); },
      startBestOf3: function (tierKey) { BessDoku.DuelFlow.start(tierKey, 3, Router); },
      // mode: 'solo' | 'team' (a progressão de dificuldade é fixa; não passa
      // pela seleção de dificuldade).
      startAdventure: function (mode) { BessDoku.AdventureFlow.start(mode, Router); }
    };

    Router.goHome();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (location.search.indexOf('selfcheck=1') !== -1 && BessDoku.SelfCheck) {
      BessDoku.SelfCheck.run();
      return;
    }
    initApp();
  });
})(window.BessDoku);
