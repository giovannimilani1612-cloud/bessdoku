/*
 * BESS Doku — game/characters.js
 * Catálogo dos personagens jogáveis. O personagem escolhido é a "peça" que o
 * jogador coloca no tabuleiro (uma por linha, coluna e região) e aparece nas
 * telas de resultado.
 *
 *   bess  -> o Lulu da Pomerânia preto (mascote original)
 *   mamae -> Mamãe do BESS, advogada
 *   papai -> Papai do BESS, engenheiro
 *   amigo -> Amigo do BESS, um caramelo brasileiro
 *
 * Cada personagem tem duas imagens (estilo Pixar): `image` é o recorte quadrado
 * no rosto (medalhão redondo, via `buildFigure`) e `poster` é a cena inteira
 * (cartão grande das telas de destaque, via `buildPoster`). Ambas devolvem um
 * <img> com as classes que o CSS de layout e as animações já conhecem.
 */
(function (BessDoku) {
  'use strict';

  var LIST = [
    { key: 'bess', label: 'BESS', short: 'BESS', image: 'img/characters/bess.jpg', poster: 'img/characters/bess-poster.jpg', description: 'O Lulu preto original' },
    { key: 'mamae', label: 'Mamãe do BESS', short: 'Mamãe', image: 'img/characters/mamae.jpg', poster: 'img/characters/mamae-poster.jpg', description: 'Advogada' },
    { key: 'papai', label: 'Papai do BESS', short: 'Papai', image: 'img/characters/papai.jpg', poster: 'img/characters/papai-poster.jpg', description: 'Engenheiro' },
    { key: 'amigo', label: 'Amigo do BESS', short: 'Amigo', image: 'img/characters/amigo.jpg', poster: 'img/characters/amigo-poster.jpg', description: 'Caramelo brasileiro' }
  ];
  var DEFAULT_KEY = 'bess';

  function list() {
    return LIST.slice();
  }

  function get(key) {
    for (var i = 0; i < LIST.length; i++) {
      if (LIST[i].key === key) return LIST[i];
    }
    return LIST[0];
  }

  function isValidKey(key) {
    return LIST.some(function (c) { return c.key === key; });
  }

  function getLast() {
    var settings = BessDoku.Settings.get();
    return isValidKey(settings.lastCharacter) ? settings.lastCharacter : DEFAULT_KEY;
  }

  function setLast(key) {
    if (!isValidKey(key)) return;
    BessDoku.Settings.update({ lastCharacter: key });
  }

  // options: { size: 'sm'|'md'|'lg'|'xl', className }
  // Retorna a foto do personagem como <img> redondo; ver css/mascot.css.
  function buildFigure(key, options) {
    var character = get(key);
    options = options || {};
    var size = options.size || 'md';
    var cls = 'mascot mascot--photo mascot--' + size + (options.className ? ' ' + options.className : '');
    return BessDoku.Dom.el('img', {
      class: cls,
      src: character.image,
      alt: character.label,
      draggable: 'false'
    });
  }

  // options: { className } — classe extra no <img> (ex.: 'char-card__poster').
  // Retorna a cena inteira do personagem; ver .hero-poster em css/components.css.
  function buildPoster(key, options) {
    var character = get(key);
    options = options || {};
    // Sem decoding="async": o pôster é o destaque da tela e deve aparecer
    // junto com o resto (assíncrono deixava a moldura vazia por um instante).
    return BessDoku.Dom.el('img', {
      class: options.className || 'hero-poster__img',
      src: character.poster,
      alt: character.label,
      draggable: 'false'
    });
  }

  // Cartão-pôster pronto (moldura + imagem) para as telas de destaque.
  // options: { small, celebrate, idle }
  function buildHeroPoster(key, options) {
    options = options || {};
    var cls = 'hero-poster'
      + (options.small ? ' hero-poster--sm' : '')
      + (options.celebrate ? ' hero-poster--celebrate' : '')
      + (options.idle ? ' hero-poster--idle' : '');
    return BessDoku.Dom.el('div', { class: cls }, [buildPoster(key)]);
  }

  BessDoku.Characters = {
    DEFAULT_KEY: DEFAULT_KEY,
    list: list,
    get: get,
    isValidKey: isValidKey,
    getLast: getLast,
    setLast: setLast,
    buildFigure: buildFigure,
    buildPoster: buildPoster,
    buildHeroPoster: buildHeroPoster
  };
})(window.BessDoku);
