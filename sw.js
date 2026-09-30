/* Service worker do BESS Doku.
   Pré-cacheia todos os arquivos do jogo para funcionar offline.
   IMPORTANTE: ao alterar qualquer arquivo do jogo, aumente CACHE_NAME (v1 -> v2 ...)
   para que os jogadores recebam a versão nova. */
var CACHE_NAME = 'bessdoku-v6';

var PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/favicon-64.png',
  'img/characters/bess.jpg',
  'img/characters/mamae.jpg',
  'img/characters/papai.jpg',
  'img/characters/amigo.jpg',
  'img/characters/bess-poster.jpg',
  'img/characters/mamae-poster.jpg',
  'img/characters/papai-poster.jpg',
  'img/characters/amigo-poster.jpg',
  'fonts/nunito-latin.woff2',
  'css/reset.css',
  'css/tokens.css',
  'css/layout.css',
  'css/components.css',
  'css/board.css',
  'css/mascot.css',
  'css/animations.css',
  'js/namespace.js',
  'js/utils/dom.js',
  'js/utils/rng.js',
  'js/utils/dates.js',
  'js/utils/storage.js',
  'js/core/rules.js',
  'js/core/solver.js',
  'js/core/difficulty.js',
  'js/core/model.js',
  'js/core/generator.js',
  'js/game/timer.js',
  'js/game/scoring.js',
  'js/game/hints.js',
  'js/game/sound.js',
  'js/game/settings.js',
  'js/game/characters.js',
  'js/game/ranking.js',
  'js/game/dailyChallenge.js',
  'js/game/session.js',
  'js/game/duel.js',
  'js/game/adventure.js',
  'js/ui/toast.js',
  'js/ui/board.js',
  'js/ui/screens.js',
  'js/ui/home.js',
  'js/ui/difficultySelect.js',
  'js/ui/characterSelect.js',
  'js/ui/play.js',
  'js/ui/result.js',
  'js/ui/duelFlow.js',
  'js/ui/adventureFlow.js',
  'js/ui/ranking.js',
  'js/ui/settingsScreen.js',
  'js/selfcheck/selfcheck.js',
  'js/app.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) { return caches.delete(key); }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') { return; }

  // Navegação (abrir o app): sempre responde o index.html do cache, com rede como reserva.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then(function (cached) {
        return cached || fetch(request);
      })
    );
    return;
  }

  // Demais arquivos: cache primeiro, rede como reserva (e guarda no cache o que vier da rede).
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) { return cached; }
      return fetch(request).then(function (response) {
        if (response && response.ok && new URL(request.url).origin === self.location.origin) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});
