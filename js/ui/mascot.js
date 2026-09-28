/*
 * BESS Doku — ui/mascot.js
 * Constrói o SVG do mascote (o Lulu da Pomerânia) em duas variantes:
 *   detail: 'iconic' -> só cabeça/orelhas/olhos/focinho, para caber nas células.
 *   detail: 'full'   -> corpo completo, para telas de destaque (hero).
 * Poses: idle, happy, wink, shy, victory.
 * Paletas (options.palette): 'black' (BESS, padrão) e 'caramel' (Amigo do BESS).
 * As peças de rosto (olhos/boca/poses) são exportadas em BessDoku.MascotParts
 * para os personagens humanos (ui/humanCharacter.js) reutilizarem.
 */
(function (BessDoku) {
  'use strict';

  var svgEl = BessDoku.Dom.svgEl;
  var Geo = BessDoku.MascotGeometry;

  var EYE_DARK = '#0B0B0D';
  var NOSE_DARK = '#08080A';
  var WHITE = '#FFFFFF';
  var BLUSH = '#F3A6B4';
  var TONGUE = '#E8798F';

  var PALETTES = {
    black: {
      fur: '#17171B',
      furSoft: '#3D3D45',
      chest: '#FFFFFF',
      paw: '#FFFFFF',
      spot: '#17171B',
      tailFrom: '#FFFFFF',
      tailTo: '#2E2E33'
    },
    caramel: {
      fur: '#D89A4E',
      furSoft: '#B97C35',
      chest: '#FFF3E0',
      paw: '#FFF3E0',
      spot: '#B97C35',
      tailFrom: '#FFF3E0',
      tailTo: '#B97C35'
    }
  };

  function paletteFor(name) {
    return PALETTES[name] || PALETTES.black;
  }

  function lerpColor(hexA, hexB, t) {
    var a = hexToRgb(hexA), b = hexToRgb(hexB);
    var r = Math.round(a.r + (b.r - a.r) * t);
    var g = Math.round(a.g + (b.g - a.g) * t);
    var bl = Math.round(a.b + (b.b - a.b) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };
  }

  function circle(spec, fill, extraAttrs) {
    var attrs = Object.assign({ cx: spec.x, cy: spec.y, r: spec.r, fill: fill }, extraAttrs || {});
    return svgEl('circle', attrs);
  }

  function ellipse(cx, cy, rx, ry, fill, extraAttrs) {
    return svgEl('ellipse', Object.assign({ cx: cx, cy: cy, rx: rx, ry: ry, fill: fill }, extraAttrs || {}));
  }

  function furPoofGroup(puffs, fill, cls) {
    var g = svgEl('g', { class: cls || null });
    puffs.forEach(function (p) { g.appendChild(circle(p, fill)); });
    return g;
  }

  function eyeShape(spec, mode) {
    var group = svgEl('g', {});
    var r = spec.radius;
    if (mode === 'happy' || mode === 'victory') {
      group.appendChild(svgEl('path', {
        d: 'M ' + (spec.x - r) + ' ' + (spec.y + r * 0.25) +
          ' Q ' + spec.x + ' ' + (spec.y - r * 1.15) + ' ' + (spec.x + r) + ' ' + (spec.y + r * 0.25),
        stroke: EYE_DARK, 'stroke-width': r * 0.42, fill: 'none', 'stroke-linecap': 'round'
      }));
    } else if (mode === 'closed') {
      group.appendChild(svgEl('path', {
        d: 'M ' + (spec.x - r * 0.95) + ' ' + (spec.y - r * 0.1) +
          ' Q ' + spec.x + ' ' + (spec.y + r * 0.7) + ' ' + (spec.x + r * 0.95) + ' ' + (spec.y - r * 0.1),
        stroke: EYE_DARK, 'stroke-width': r * 0.34, fill: 'none', 'stroke-linecap': 'round'
      }));
    } else if (mode === 'wink') {
      group.appendChild(svgEl('path', {
        d: 'M ' + (spec.x - r) + ' ' + spec.y + ' Q ' + spec.x + ' ' + (spec.y + r * 0.55) + ' ' + (spec.x + r) + ' ' + spec.y,
        stroke: EYE_DARK, 'stroke-width': r * 0.36, fill: 'none', 'stroke-linecap': 'round'
      }));
    } else {
      group.appendChild(circle({ x: spec.x, y: spec.y, r: r }, EYE_DARK));
      group.appendChild(circle({ x: spec.x - r * 0.32, y: spec.y - r * 0.34, r: r * 0.26 }, WHITE, { opacity: 0.92 }));
    }
    return group;
  }

  function mouthShape(cx, cy, w, mode) {
    if (mode === 'victory') {
      var g = svgEl('g', {});
      g.appendChild(svgEl('path', {
        d: 'M ' + (cx - w) + ' ' + cy + ' Q ' + cx + ' ' + (cy + w * 1.15) + ' ' + (cx + w) + ' ' + cy,
        stroke: EYE_DARK, 'stroke-width': w * 0.22, fill: 'none', 'stroke-linecap': 'round'
      }));
      g.appendChild(ellipse(cx, cy + w * 0.55, w * 0.32, w * 0.4, TONGUE));
      return g;
    }
    if (mode === 'smile') {
      return svgEl('path', {
        d: 'M ' + (cx - w) + ' ' + cy + ' Q ' + cx + ' ' + (cy + w * 0.85) + ' ' + (cx + w) + ' ' + cy,
        stroke: EYE_DARK, 'stroke-width': w * 0.2, fill: 'none', 'stroke-linecap': 'round'
      });
    }
    return svgEl('path', {
      d: 'M ' + (cx - w * 0.6) + ' ' + cy + ' Q ' + cx + ' ' + (cy + w * 0.3) + ' ' + (cx + w * 0.6) + ' ' + cy,
      stroke: EYE_DARK, 'stroke-width': w * 0.18, fill: 'none', 'stroke-linecap': 'round'
    });
  }

  function poseConfig(pose) {
    switch (pose) {
      case 'happy': return { eyes: 'happy', mouth: 'smile', blush: false };
      case 'wink': return { eyes: 'wink', mouth: 'smile', blush: false };
      case 'shy': return { eyes: 'closed', mouth: 'neutral', blush: true };
      case 'victory': return { eyes: 'victory', mouth: 'victory', blush: true };
      default: return { eyes: 'open', mouth: 'neutral', blush: false };
    }
  }

  function buildHead(headGeo, pose, oneEyeWink, pal) {
    var g = svgEl('g', { class: 'mascot__head' });
    g.appendChild(svgEl('path', { d: headGeo.earLeft, fill: pal.furSoft }));
    g.appendChild(svgEl('path', { d: headGeo.earRight, fill: pal.furSoft }));
    // Base sólida antes da franja de pelo "poof" — sem isso o centro do rosto
    // (onde ficam olhos/focinho) apareceria oco, como uma máscara de panda.
    g.appendChild(circle({ x: headGeo.center.x, y: headGeo.center.y, r: headGeo.radius * 0.88 }, pal.fur));
    g.appendChild(furPoofGroup(headGeo.furPuffs, pal.fur, 'mascot__fur'));

    var cfg = poseConfig(pose);
    if (cfg.blush) {
      g.appendChild(circle({ x: headGeo.eyeLeft.x - headGeo.radius * 0.18, y: headGeo.eyeLeft.y + headGeo.radius * 0.32, r: headGeo.radius * 0.14 }, BLUSH, { opacity: 0.85 }));
      g.appendChild(circle({ x: headGeo.eyeRight.x + headGeo.radius * 0.18, y: headGeo.eyeRight.y + headGeo.radius * 0.32, r: headGeo.radius * 0.14 }, BLUSH, { opacity: 0.85 }));
    }

    g.appendChild(eyeShape(headGeo.eyeLeft, oneEyeWink ? 'wink' : cfg.eyes));
    g.appendChild(eyeShape(headGeo.eyeRight, cfg.eyes));

    g.appendChild(ellipse(headGeo.nose.x, headGeo.nose.y, headGeo.nose.rx, headGeo.nose.ry, NOSE_DARK));
    g.appendChild(mouthShape(headGeo.muzzle.x, headGeo.muzzle.y, headGeo.radius * 0.22, cfg.mouth));
    return g;
  }

  function buildTail(originX, originY, length, side, pal, cls) {
    var puffs = Geo.tailGeometry(originX, originY, length, side);
    var g = svgEl('g', { class: cls || 'mascot__tail' });
    var base = puffs[0];
    g.setAttribute('style', 'transform-origin:' + base.x.toFixed(1) + 'px ' + base.y.toFixed(1) + 'px;');
    puffs.forEach(function (p) {
      var color = lerpColor(pal.tailFrom, pal.tailTo, p.t);
      g.appendChild(circle(p, color));
    });
    return g;
  }

  function buildBody(bodyGeo, pal) {
    var g = svgEl('g', { class: 'mascot__body' });
    // Base sólida (mesmo motivo do rosto: evita um "buraco" atrás do peito/pescoço).
    g.appendChild(circle({ x: bodyGeo.center.x, y: bodyGeo.center.y, r: bodyGeo.radius * 0.88 }, pal.fur));
    g.appendChild(furPoofGroup(bodyGeo.furPuffs, pal.fur, 'mascot__bodyfur'));

    // Peito e barriga claros: base sólida (para nunca ficar "oca") mais uma
    // franja de círculos maiores para a transição de pelo parecer fofa.
    g.appendChild(ellipse(bodyGeo.chest.x, bodyGeo.chest.y, bodyGeo.chest.rx, bodyGeo.chest.ry, pal.chest));
    var chestFringe = Geo.poofRing(bodyGeo.chest.x, bodyGeo.chest.y - bodyGeo.chest.ry * 0.15, bodyGeo.chest.rx * 0.85, 9, 0.34, bodyGeo.radius * 0.03);
    g.appendChild(furPoofGroup(chestFringe, pal.chest, 'mascot__chest'));

    // Patas claras com pequenas manchas escuras (efeito dálmata)
    [bodyGeo.pawLeft, bodyGeo.pawRight].forEach(function (paw, idx) {
      g.appendChild(ellipse(paw.x, paw.y, paw.rx, paw.ry, pal.paw));
      var spots = idx === 0 ? bodyGeo.spotsLeft : bodyGeo.spotsRight;
      spots.forEach(function (s) { g.appendChild(circle(s, pal.spot)); });
    });
    return g;
  }

  function buildSVG(options) {
    options = options || {};
    var size = options.size || 'md';
    var pose = options.pose || 'idle';
    var detail = options.detail || 'iconic';
    var pal = paletteFor(options.palette);
    var cls = 'mascot mascot--' + size + ' mascot--pose-' + pose + ' mascot--' + detail + (options.className ? ' ' + options.className : '');

    if (detail === 'full') {
      var svg = svgEl('svg', { viewBox: '0 0 100 148', class: cls, 'aria-hidden': 'true' });
      var bodyGeo = Geo.bodyGeometry(50, 100, 32);
      var headGeo = Geo.headGeometry(50, 46, 30);
      // A cauda nasce BEM dentro do corpo (para a franja cobrir a base) e
      // se estende para fora e para cima, então é desenhada antes do corpo.
      var tailAngle = -55 * Math.PI / 180;
      var tailOriginX = bodyGeo.center.x + Math.cos(tailAngle) * bodyGeo.radius * 0.65;
      var tailOriginY = bodyGeo.center.y + Math.sin(tailAngle) * bodyGeo.radius * 0.65;
      svg.appendChild(buildTail(tailOriginX, tailOriginY, bodyGeo.radius * 1.75, 1, pal));
      svg.appendChild(buildBody(bodyGeo, pal));
      svg.appendChild(buildHead(headGeo, pose, false, pal));
      return svg;
    }

    var svgIcon = svgEl('svg', { viewBox: '0 0 100 100', class: cls, 'aria-hidden': 'true' });
    var headGeoIcon = Geo.headGeometry(50, 56, 38);
    svgIcon.appendChild(buildHead(headGeoIcon, pose, false, pal));
    return svgIcon;
  }

  BessDoku.Mascot = {
    buildSVG: buildSVG,
    PALETTES: PALETTES
  };

  BessDoku.MascotParts = {
    EYE_DARK: EYE_DARK,
    WHITE: WHITE,
    BLUSH: BLUSH,
    circle: circle,
    ellipse: ellipse,
    eyeShape: eyeShape,
    mouthShape: mouthShape,
    poseConfig: poseConfig
  };
})(window.BessDoku);
