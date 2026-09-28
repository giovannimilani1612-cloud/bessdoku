/*
 * BESS Doku — game/characters.js
 * Catálogo dos personagens jogáveis. O personagem escolhido é a "peça" que o
 * jogador coloca no tabuleiro (uma por linha, coluna e região) e aparece nas
 * telas de resultado.
 *
 *   bess  -> o Lulu da Pomerânia preto (mascote original)
 *   mamae -> Mamãe do BESS, humana, advogada com a Constituição na mão
 *   papai -> Papai do BESS, humano, engenheiro de capacete
 *   amigo -> Amigo do BESS, outro Lulu, de pelo caramelo
 *
 * `buildSVG` despacha para o desenhista certo (ui/mascot.js para os cães,
 * ui/humanCharacter.js para os humanos); esses módulos carregam depois deste,
 * por isso são resolvidos só na hora da chamada.
 */
(function (BessDoku) {
  'use strict';

  var LIST = [
    { key: 'bess', label: 'BESS', short: 'BESS', kind: 'dog', palette: 'black', description: 'O Lulu preto original' },
    { key: 'mamae', label: 'Mamãe do BESS', short: 'Mamãe', kind: 'human', outfit: 'lawyer', description: 'Advogada, com a Constituição' },
    { key: 'papai', label: 'Papai do BESS', short: 'Papai', kind: 'human', outfit: 'engineer', description: 'Engenheiro, de capacete' },
    { key: 'amigo', label: 'Amigo do BESS', short: 'Amigo', kind: 'dog', palette: 'caramel', description: 'Um Lulu caramelo' }
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

  // options: { size, pose, detail, className } — mesmos de Mascot.buildSVG.
  function buildSVG(key, options) {
    var character = get(key);
    options = Object.assign({}, options || {});
    if (character.kind === 'human') {
      options.outfit = character.outfit;
      return BessDoku.HumanCharacter.buildSVG(options);
    }
    options.palette = character.palette;
    return BessDoku.Mascot.buildSVG(options);
  }

  BessDoku.Characters = {
    DEFAULT_KEY: DEFAULT_KEY,
    list: list,
    get: get,
    isValidKey: isValidKey,
    getLast: getLast,
    setLast: setLast,
    buildSVG: buildSVG
  };
})(window.BessDoku);
