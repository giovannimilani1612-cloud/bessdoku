/*
 * BESS Doku — ui/characterSelect.js
 * Tela de escolha do personagem (BESS, Mamãe, Papai ou Amigo do BESS), usada
 * antes de cada partida: Solo e Desafio Diário (uma vez) e Duelo/Melhor de 3
 * (uma vez por jogador, sem repetir o personagem do adversário).
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var Characters = BessDoku.Characters;
  var Sound = BessDoku.Sound;

  // options: { title, subtitle, excludeKey, excludeReason, initialKey,
  //            confirmLabel, onSelect(key), onBack, backLabel }
  function render(options) {
    options = options || {};
    var screen = Dom.el('div', { class: 'screen screen--character container-scroll' });

    var backBtn = options.onBack
      ? Dom.el('button', { class: 'btn btn--icon', text: '←', onClick: function () { options.onBack(); } })
      : Dom.el('div', { style: 'width:46px' });

    screen.appendChild(Dom.el('div', { class: 'topbar' }, [
      backBtn,
      Dom.el('div', { class: 'topbar__title text-center' }, [
        Dom.el('div', { text: options.title || 'Escolha seu personagem' }),
        options.subtitle ? Dom.el('div', { class: 'text-small text-secondary', text: options.subtitle }) : null
      ]),
      Dom.el('div', { style: 'width:46px' })
    ]));

    screen.appendChild(Dom.el('p', { class: 'text-center text-secondary', text: 'Quem vai entrar no tabuleiro?' }));

    var list = Characters.list();
    var available = list.filter(function (c) { return c.key !== options.excludeKey; });
    var selectedKey = available.some(function (c) { return c.key === options.initialKey; })
      ? options.initialKey
      : available[0].key;

    var cardEls = {};
    var grid = Dom.el('div', { class: 'char-grid' });

    function refresh() {
      Object.keys(cardEls).forEach(function (key) {
        cardEls[key].classList.toggle('is-selected', key === selectedKey);
        cardEls[key].setAttribute('aria-pressed', key === selectedKey ? 'true' : 'false');
      });
    }

    list.forEach(function (character) {
      var excluded = character.key === options.excludeKey;
      var card = Dom.el('button', {
        type: 'button',
        class: 'char-card',
        disabled: excluded,
        'aria-label': character.label,
        onClick: function () {
          if (excluded) return;
          Sound.resumeContext();
          selectedKey = character.key;
          refresh();
        }
      }, [
        Characters.buildPoster(character.key, { className: 'char-card__poster' }),
        Dom.el('div', { class: 'char-card__body' }, [
          Dom.el('div', { class: 'char-card__label', text: character.label }),
          Dom.el('div', { class: 'char-card__sub', text: excluded ? (options.excludeReason || 'Já escolhido pelo outro jogador') : character.description })
        ])
      ]);
      cardEls[character.key] = card;
      grid.appendChild(card);
    });
    refresh();
    screen.appendChild(grid);

    screen.appendChild(Dom.el('div', { class: 'stack' }, [
      Dom.el('button', {
        class: 'btn btn--primary btn--block',
        text: options.confirmLabel || 'Confirmar',
        onClick: function () {
          Sound.resumeContext();
          options.onSelect && options.onSelect(selectedKey);
        }
      }),
      options.onBack && options.backLabel
        ? Dom.el('button', { class: 'btn btn--ghost btn--block', text: options.backLabel, onClick: function () { options.onBack(); } })
        : null
    ]));

    return screen;
  }

  BessDoku.CharacterSelectScreen = { render: render };
})(window.BessDoku);
