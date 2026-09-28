/*
 * BESS Doku — utils/dom.js
 * Pequenos utilitários de DOM usados por toda a camada de UI.
 */
(function (BessDoku) {
  'use strict';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class' || key === 'className') {
        node.className = value;
      } else if (key === 'text') {
        node.textContent = value;
      } else if (key === 'html') {
        node.innerHTML = value;
      } else if (key.indexOf('on') === 0 && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'dataset') {
        Object.keys(value).forEach(function (dk) { node.dataset[dk] = value[dk]; });
      } else if (value === true) {
        node.setAttribute(key, '');
      } else {
        node.setAttribute(key, value);
      }
    });
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      if (typeof child === 'string' || typeof child === 'number') {
        node.appendChild(document.createTextNode(String(child)));
      } else {
        node.appendChild(child);
      }
    });
    return node;
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs, children) {
    var node = document.createElementNS(SVG_NS, tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class' || key === 'className') {
        node.setAttribute('class', value);
      } else {
        node.setAttribute(key, value);
      }
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function onceAnimationEnd(node, cls) {
    function handler() {
      node.classList.remove(cls);
      node.removeEventListener('animationend', handler);
    }
    node.addEventListener('animationend', handler);
  }

  function addTempClass(node, cls, duration) {
    node.classList.remove(cls);
    // força reflow para permitir reiniciar a animação em cliques rápidos
    void node.offsetWidth;
    node.classList.add(cls);
    if (duration) {
      setTimeout(function () { node.classList.remove(cls); }, duration);
    } else {
      onceAnimationEnd(node, cls);
    }
  }

  BessDoku.Dom = {
    el: el,
    svgEl: svgEl,
    clear: clear,
    qs: qs,
    qsa: qsa,
    addTempClass: addTempClass
  };
})(window.BessDoku);
