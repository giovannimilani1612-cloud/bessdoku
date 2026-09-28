/*
 * BESS Doku — ui/humanCharacter.js
 * Desenha os personagens humanos (Mamãe e Papai do BESS) em SVG, com a mesma
 * interface e as mesmas classes CSS do mascote (ui/mascot.js):
 *   detail: 'iconic' -> cabeça e ombros, para caber nas células.
 *   detail: 'full'   -> corpo inteiro, para telas de destaque (hero).
 * Poses (idle, happy, wink, shy, victory) reutilizam olhos/boca de
 * BessDoku.MascotParts para manterem a mesma "expressão" do BESS.
 *
 * Ambos: pele branca, cabelo castanho-claro, olhos castanho-claros.
 *   outfit: 'lawyer'   -> Mamãe: blazer escuro, cabelo comprido, livro verde
 *                         da Constituição ("CF") na mão.
 *   outfit: 'engineer' -> Papai: capacete amarelo, colete laranja refletivo.
 */
(function (BessDoku) {
  'use strict';

  var svgEl = BessDoku.Dom.svgEl;
  var Parts = BessDoku.MascotParts;

  var SKIN = '#F3D6B8';
  var SKIN_SHADE = '#E2B995';
  var HAIR = '#A97C50';
  var IRIS = '#8B5E34';
  var PUPIL = '#2A1A0E';
  var WHITE = '#FFFFFF';

  var OUTFITS = {
    lawyer: {
      top: '#2B2F4A', topDark: '#1F2238', bottom: '#2B2F4A', shoes: '#111113',
      book: '#2E7D4F', bookDark: '#1F5A38'
    },
    engineer: {
      top: '#F28C28', topDark: '#D2731A', bottom: '#3A3F4B', shoes: '#5B3A1E',
      stripe: '#FFF1A8', helmet: '#F2C21B', helmetDark: '#D9A80E', blueprint: '#4A78C2'
    }
  };

  function rect(x, y, w, h, rx, fill, extra) {
    return svgEl('rect', Object.assign({ x: x, y: y, width: w, height: h, rx: rx, ry: rx, fill: fill }, extra || {}));
  }

  function path(d, fill, extra) {
    return svgEl('path', Object.assign({ d: d, fill: fill }, extra || {}));
  }

  function text(x, y, content, fontSize, fill) {
    var t = svgEl('text', {
      x: x, y: y, fill: fill, 'font-size': fontSize, 'font-weight': '800',
      'text-anchor': 'middle', 'font-family': 'Arial, Helvetica, sans-serif'
    });
    t.textContent = content;
    return t;
  }

  // Olho humano: esclera branca + íris castanho-clara quando aberto; nas
  // outras poses (feliz/piscando/fechado) usa os mesmos traços do mascote.
  function humanEye(spec, mode) {
    if (mode !== 'open') return Parts.eyeShape(spec, mode);
    var r = spec.radius;
    var g = svgEl('g', {});
    g.appendChild(Parts.ellipse(spec.x, spec.y, r * 1.1, r, WHITE));
    g.appendChild(Parts.circle({ x: spec.x, y: spec.y, r: r * 0.62 }, IRIS));
    g.appendChild(Parts.circle({ x: spec.x, y: spec.y, r: r * 0.3 }, PUPIL));
    g.appendChild(Parts.circle({ x: spec.x - r * 0.28, y: spec.y - r * 0.3, r: r * 0.16 }, WHITE, { opacity: 0.95 }));
    return g;
  }

  // geo: { cx, cy, r } da cabeça. Desenha cabelo, rosto, expressão e (para o
  // engenheiro) o capacete por cima.
  function buildHead(geo, pose, outfit, colors) {
    var cx = geo.cx, cy = geo.cy, r = geo.r;
    var g = svgEl('g', { class: 'mascot__head' });
    var cfg = Parts.poseConfig(pose);

    // Orelhas (atrás do rosto)
    g.appendChild(Parts.circle({ x: cx - r * 0.98, y: cy + r * 0.08, r: r * 0.17 }, SKIN));
    g.appendChild(Parts.circle({ x: cx + r * 0.98, y: cy + r * 0.08, r: r * 0.17 }, SKIN));

    // Cabelo (calota deslocada para cima; o rosto cobre a parte de baixo)
    g.appendChild(Parts.circle({ x: cx, y: cy - r * 0.2, r: r * 1.08 }, HAIR));

    // Rosto
    g.appendChild(Parts.circle({ x: cx, y: cy, r: r }, SKIN));

    // Franja (só sem capacete — no engenheiro o capacete cobre a testa)
    if (outfit === 'lawyer') {
      g.appendChild(Parts.ellipse(cx - r * 0.4, cy - r * 0.8, r * 0.58, r * 0.27, HAIR));
      g.appendChild(Parts.ellipse(cx + r * 0.46, cy - r * 0.76, r * 0.54, r * 0.27, HAIR));
    }

    if (cfg.blush) {
      g.appendChild(Parts.circle({ x: cx - r * 0.58, y: cy + r * 0.35, r: r * 0.14 }, Parts.BLUSH, { opacity: 0.85 }));
      g.appendChild(Parts.circle({ x: cx + r * 0.58, y: cy + r * 0.35, r: r * 0.14 }, Parts.BLUSH, { opacity: 0.85 }));
    }

    g.appendChild(humanEye({ x: cx - r * 0.35, y: cy, radius: r * 0.18 }, cfg.eyes));
    g.appendChild(humanEye({ x: cx + r * 0.35, y: cy, radius: r * 0.18 }, cfg.eyes));
    g.appendChild(Parts.ellipse(cx, cy + r * 0.3, r * 0.09, r * 0.065, SKIN_SHADE));
    g.appendChild(Parts.mouthShape(cx, cy + r * 0.55, r * 0.23, cfg.mouth));

    if (outfit === 'engineer') {
      // Capacete: cúpula + aba
      var domeY = cy - r * 0.2;
      var domeR = r * 1.1;
      g.appendChild(path(
        'M ' + (cx - domeR) + ' ' + domeY + ' A ' + domeR + ' ' + domeR + ' 0 0 1 ' + (cx + domeR) + ' ' + domeY + ' Z',
        colors.helmet
      ));
      g.appendChild(rect(cx - r * 0.16, domeY - domeR * 0.98, r * 0.32, domeR * 0.7, r * 0.16, colors.helmetDark, { opacity: 0.55 }));
      g.appendChild(rect(cx - domeR * 1.18, domeY - r * 0.1, domeR * 2.36, r * 0.26, r * 0.13, colors.helmetDark));
    }
    return g;
  }

  function buildFull(pose, outfit, colors) {
    var svg = svgEl('svg', { viewBox: '0 0 100 148', 'aria-hidden': 'true' });
    var head = { cx: 50, cy: 40, r: 20 };

    // Cabelo comprido da advogada, atrás de tudo
    if (outfit === 'lawyer') {
      svg.appendChild(Parts.ellipse(50, 54, 26, 34, HAIR));
    }

    // Pescoço
    svg.appendChild(rect(46, 56, 8, 10, 2, SKIN_SHADE));

    // Braços
    svg.appendChild(rect(21, 68, 10, 34, 5, colors.top));
    svg.appendChild(rect(69, 68, 10, 34, 5, colors.top));

    // Tronco
    svg.appendChild(rect(30, 64, 40, 44, 10, colors.top));
    if (outfit === 'lawyer') {
      svg.appendChild(path('M 41 64 L 50 82 L 59 64 Z', WHITE));
      svg.appendChild(path('M 41 64 L 50 82 L 45 64 Z', colors.topDark));
      svg.appendChild(path('M 59 64 L 50 82 L 55 64 Z', colors.topDark));
      svg.appendChild(Parts.circle({ x: 50, y: 90, r: 1.6 }, colors.topDark));
      svg.appendChild(Parts.circle({ x: 50, y: 98, r: 1.6 }, colors.topDark));
    } else {
      svg.appendChild(path('M 44 64 L 50 74 L 56 64 Z', WHITE));
      svg.appendChild(rect(30, 82, 40, 4, 0, colors.stripe, { opacity: 0.95 }));
      svg.appendChild(rect(30, 94, 40, 4, 0, colors.stripe, { opacity: 0.95 }));
    }

    // Parte de baixo
    if (outfit === 'lawyer') {
      svg.appendChild(rect(30, 104, 40, 24, 6, colors.bottom));
      svg.appendChild(rect(38, 126, 8, 14, 3, SKIN));
      svg.appendChild(rect(54, 126, 8, 14, 3, SKIN));
    } else {
      svg.appendChild(rect(30, 104, 40, 22, 6, colors.bottom));
      svg.appendChild(rect(38, 124, 8, 16, 3, colors.bottom));
      svg.appendChild(rect(54, 124, 8, 16, 3, colors.bottom));
    }
    svg.appendChild(Parts.ellipse(42, 141, 7.5, 4.5, colors.shoes));
    svg.appendChild(Parts.ellipse(58, 141, 7.5, 4.5, colors.shoes));

    // Objeto na mão + mãos
    if (outfit === 'lawyer') {
      // Livro da Constituição na mão direita (à direita para quem olha)
      svg.appendChild(rect(64, 86, 18, 22, 2, colors.book));
      svg.appendChild(rect(64, 86, 3.5, 22, 1, colors.bookDark));
      svg.appendChild(text(75, 101, 'CF', 7.5, WHITE));
      svg.appendChild(Parts.circle({ x: 26, y: 104, r: 4.5 }, SKIN));
      svg.appendChild(Parts.circle({ x: 74, y: 108, r: 4.5 }, SKIN));
    } else {
      // Planta enrolada na mão esquerda
      svg.appendChild(rect(17, 88, 10, 26, 5, colors.blueprint));
      svg.appendChild(Parts.ellipse(22, 89, 5, 2.2, '#DCE8F7'));
      svg.appendChild(Parts.ellipse(22, 113, 5, 2.2, WHITE));
      svg.appendChild(Parts.circle({ x: 24, y: 103, r: 4.5 }, SKIN));
      svg.appendChild(Parts.circle({ x: 74, y: 104, r: 4.5 }, SKIN));
    }

    svg.appendChild(buildHead(head, pose, outfit, colors));
    return svg;
  }

  function buildIconic(pose, outfit, colors) {
    var svg = svgEl('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' });
    var head = { cx: 50, cy: 44, r: 26 };

    if (outfit === 'lawyer') {
      svg.appendChild(Parts.ellipse(50, 60, 33, 40, HAIR));
    }
    svg.appendChild(rect(45, 66, 10, 12, 2, SKIN_SHADE));

    // Ombros
    svg.appendChild(rect(12, 74, 76, 26, 14, colors.top));
    if (outfit === 'lawyer') {
      svg.appendChild(path('M 40 74 L 50 92 L 60 74 Z', WHITE));
      svg.appendChild(path('M 40 74 L 50 92 L 44 74 Z', colors.topDark));
      svg.appendChild(path('M 60 74 L 50 92 L 56 74 Z', colors.topDark));
    } else {
      svg.appendChild(path('M 43 74 L 50 86 L 57 74 Z', WHITE));
      svg.appendChild(rect(12, 91, 76, 5, 0, colors.stripe, { opacity: 0.95 }));
    }

    svg.appendChild(buildHead(head, pose, outfit, colors));
    return svg;
  }

  function buildSVG(options) {
    options = options || {};
    var size = options.size || 'md';
    var pose = options.pose || 'idle';
    var detail = options.detail || 'iconic';
    var outfit = OUTFITS[options.outfit] ? options.outfit : 'lawyer';
    var colors = OUTFITS[outfit];
    var cls = 'mascot mascot--human mascot--' + outfit + ' mascot--' + size + ' mascot--pose-' + pose + ' mascot--' + detail +
      (options.className ? ' ' + options.className : '');

    var svg = detail === 'full' ? buildFull(pose, outfit, colors) : buildIconic(pose, outfit, colors);
    svg.setAttribute('class', cls);
    return svg;
  }

  BessDoku.HumanCharacter = {
    buildSVG: buildSVG,
    OUTFITS: OUTFITS
  };
})(window.BessDoku);
