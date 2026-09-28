/*
 * BESS Doku — ui/settingsScreen.js
 * Tela de configurações: som, penalidades, nome do jogador e movimento reduzido.
 */
(function (BessDoku) {
  'use strict';

  var Dom = BessDoku.Dom;
  var Settings = BessDoku.Settings;

  function switchEl(isOn, onToggle) {
    var el = Dom.el('div', { class: 'switch' + (isOn ? ' is-on' : ''), onClick: function () {
      var next = !el.classList.contains('is-on');
      el.classList.toggle('is-on', next);
      onToggle(next);
    } }, [Dom.el('div', { class: 'switch__knob' })]);
    return el;
  }

  function stepper(value, min, max, step, onChange) {
    var valueEl = Dom.el('span', { class: 'stepper__value', text: String(value) });
    var wrap = Dom.el('div', { class: 'stepper' }, [
      Dom.el('button', { type: 'button', text: '−', onClick: function () {
        value = Math.max(min, value - step);
        valueEl.textContent = String(value);
        onChange(value);
      } }),
      valueEl,
      Dom.el('button', { type: 'button', text: '+', onClick: function () {
        value = Math.min(max, value + step);
        valueEl.textContent = String(value);
        onChange(value);
      } })
    ]);
    return wrap;
  }

  function settingsRow(label, desc, control) {
    return Dom.el('div', { class: 'settings-row' }, [
      Dom.el('div', {}, [
        Dom.el('div', { class: 'settings-row__label', text: label }),
        desc ? Dom.el('div', { class: 'settings-row__desc', text: desc }) : null
      ]),
      control
    ]);
  }

  function render(router) {
    var settings = Settings.get();
    var screen = Dom.el('div', { class: 'screen screen--settings container-scroll' });

    screen.appendChild(Dom.el('div', { class: 'topbar' }, [
      Dom.el('button', { class: 'btn btn--icon', text: '←', onClick: function () { router.goHome(); } }),
      Dom.el('div', { class: 'topbar__title', text: 'Configurações' }),
      Dom.el('div', { style: 'width:46px' })
    ]));

    var card = Dom.el('div', { class: 'card stack' });

    var nameInput = Dom.el('input', {
      class: 'name-input', type: 'text', value: settings.playerName, maxlength: '18',
      onChange: function (e) { Settings.update({ playerName: e.target.value.trim() || 'Jogador' }); },
      onInput: function (e) { Settings.update({ playerName: e.target.value }); }
    });
    card.appendChild(settingsRow('Nome do jogador', 'Usado no ranking local', nameInput));

    card.appendChild(settingsRow('Som', 'Efeitos sonoros curtos', switchEl(settings.sound, function (v) { Settings.update({ sound: v }); })));

    card.appendChild(settingsRow('Movimento reduzido', 'Reduz animações da interface', switchEl(settings.reducedMotion, function (v) {
      Settings.update({ reducedMotion: v });
      document.body.classList.toggle('reduced-motion', v);
    })));

    card.appendChild(settingsRow('Penalidade por erro', 'Segundos somados ao cronômetro na hora do erro', stepper(settings.errorPenaltySeconds, 0, 60, 5, function (v) {
      Settings.update({ errorPenaltySeconds: v });
    })));

    var hintPenaltyToggle = switchEl(settings.hintPenaltyEnabled, function (v) { Settings.update({ hintPenaltyEnabled: v }); });
    card.appendChild(settingsRow('Penalidade por dica', 'Cada dica usada soma tempo extra', hintPenaltyToggle));

    card.appendChild(settingsRow('Segundos por dica', 'Aplicado somente se a penalidade estiver ativa', stepper(settings.hintPenaltySeconds, 0, 60, 5, function (v) {
      Settings.update({ hintPenaltySeconds: v });
    })));

    screen.appendChild(card);

    var resetBtn = Dom.el('button', { class: 'btn btn--ghost btn--block', text: 'Restaurar padrões', onClick: function () {
      Settings.reset();
      router.goSettings();
    } });
    screen.appendChild(resetBtn);

    return screen;
  }

  BessDoku.SettingsScreen = { render: render };
})(window.BessDoku);
