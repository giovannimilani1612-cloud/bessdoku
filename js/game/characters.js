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
 * Cada personagem tem uma foto real (img/characters/*.jpg, recorte quadrado
 * centrado no rosto). `buildFigure` devolve um <img> redondo (medalhão) com as
 * classes .mascot que o CSS de layout e as animações já conhecem.
 */
(function (BessDoku) {
  'use strict';

  var LIST = [
    { key: 'bess', label: 'BESS', short: 'BESS', image: 'img/characters/bess.jpg', description: 'O Lulu preto original' },
    { key: 'mamae', label: 'Mamãe do BESS', short: 'Mamãe', image: 'img/characters/mamae.jpg', description: 'Advogada' },
    { key: 'papai', label: 'Papai do BESS', short: 'Papai', image: 'img/characters/papai.jpg', description: 'Engenheiro' },
    { key: 'amigo', label: 'Amigo do BESS', short: 'Amigo', image: 'img/characters/amigo.jpg', description: 'Caramelo brasileiro' }
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
      draggable: 'false',
      decoding: 'async'
    });
  }

  BessDoku.Characters = {
    DEFAULT_KEY: DEFAULT_KEY,
    list: list,
    get: get,
    isValidKey: isValidKey,
    getLast: getLast,
    setLast: setLast,
    buildFigure: buildFigure
  };
})(window.BessDoku);
