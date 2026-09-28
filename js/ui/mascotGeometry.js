/*
 * BESS Doku — ui/mascotGeometry.js
 * Geometria compartilhada do mascote (Lulu da Pomerânia preto), derivada da
 * foto de referência: cabeça grande e arredondada pelo volume de pelo, orelhas
 * pequenas e pontudas quase escondidas, olhos grandes e escuros, focinho
 * pequeno, peito e patas brancas com pequenas manchas pretas, cauda grande e
 * peluda (clara na base, mais escura na ponta).
 *
 * A "fofura peluda" é obtida por aglomerados de círculos sobrepostos (technique
 * de silhueta "poof"), o que fica robusto em qualquer tamanho sem depender de
 * curvas bézier complexas desenhadas à mão.
 */
(function (BessDoku) {
  'use strict';

  // Gera um anel de círculos sobrepostos ao redor de (cx,cy) para simular pelagem
  // volumosa. O jitter é determinístico (função seno do índice), não aleatório,
  // para que o desenho seja sempre idêntico entre renderizações.
  function poofRing(cx, cy, radius, count, puffRatio, jitterAmp) {
    var puffs = [];
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      var jitter = Math.sin(i * 2.4 + 1.3) * jitterAmp;
      var r = radius + jitter;
      var x = cx + Math.cos(angle) * r;
      var y = cy + Math.sin(angle) * r;
      var pr = radius * puffRatio * (1 + 0.18 * Math.sin(i * 3.7 + 0.6));
      puffs.push({ x: x, y: y, r: Math.max(pr, radius * puffRatio * 0.6) });
    }
    return puffs;
  }

  function headGeometry(cx, cy, r) {
    return {
      center: { x: cx, y: cy },
      radius: r,
      furPuffs: poofRing(cx, cy, r * 0.92, 15, 0.34, r * 0.05),
      earLeft: earPath(cx - r * 0.62, cy - r * 0.86, r * 0.5, -18),
      earRight: earPath(cx + r * 0.62, cy - r * 0.86, r * 0.5, 18),
      eyeLeft: { x: cx - r * 0.36, y: cy + r * 0.04, radius: r * 0.22 },
      eyeRight: { x: cx + r * 0.36, y: cy + r * 0.04, radius: r * 0.22 },
      muzzle: { x: cx, y: cy + r * 0.46, rx: r * 0.4, ry: r * 0.3 },
      nose: { x: cx, y: cy + r * 0.4, rx: r * 0.1, ry: r * 0.075 }
    };
  }

  // Orelha pequena e pontuda, representada como triângulo de pontas arredondadas.
  function earPath(cx, cy, size, tiltDeg) {
    var tilt = (tiltDeg * Math.PI) / 180;
    function rot(px, py) {
      var dx = px - cx, dy = py - cy;
      return {
        x: cx + dx * Math.cos(tilt) - dy * Math.sin(tilt),
        y: cy + dx * Math.sin(tilt) + dy * Math.cos(tilt)
      };
    }
    var tip = rot(cx, cy - size);
    var baseL = rot(cx - size * 0.55, cy + size * 0.35);
    var baseR = rot(cx + size * 0.55, cy + size * 0.35);
    return 'M ' + baseL.x.toFixed(2) + ' ' + baseL.y.toFixed(2) +
      ' Q ' + cx.toFixed(2) + ' ' + (cy - size * 0.1).toFixed(2) + ' ' + tip.x.toFixed(2) + ' ' + tip.y.toFixed(2) +
      ' Q ' + cx.toFixed(2) + ' ' + (cy - size * 0.1).toFixed(2) + ' ' + baseR.x.toFixed(2) + ' ' + baseR.y.toFixed(2) +
      ' Z';
  }

  function bodyGeometry(cx, cy, r) {
    return {
      center: { x: cx, y: cy },
      radius: r,
      furPuffs: poofRing(cx, cy, r * 0.9, 18, 0.3, r * 0.05),
      chest: { x: cx, y: cy + r * 0.32, rx: r * 0.56, ry: r * 0.62 },
      pawLeft: { x: cx - r * 0.5, y: cy + r * 0.92, rx: r * 0.26, ry: r * 0.2 },
      pawRight: { x: cx + r * 0.5, y: cy + r * 0.92, rx: r * 0.26, ry: r * 0.2 },
      spotsLeft: pawSpots(cx - r * 0.5, cy + r * 0.9, r * 0.26),
      spotsRight: pawSpots(cx + r * 0.5, cy + r * 0.9, r * 0.26)
    };
  }

  function pawSpots(cx, cy, r) {
    return [
      { x: cx - r * 0.32, y: cy - r * 0.1, r: r * 0.16 },
      { x: cx + r * 0.28, y: cy + r * 0.18, r: r * 0.13 }
    ];
  }

  // Cauda grande e peluda, clara na base (junto ao corpo) e mais escura na ponta.
  function tailGeometry(originX, originY, length, side) {
    // Círculos espaçados como um "colar de pérolas" (a distância entre eles é
    // maior que o raio médio) para que a transição de cor clara->escura fique
    // visível em vez de um círculo maior sempre encobrir o anterior.
    var puffs = [];
    var steps = 7;
    for (var i = 0; i < steps; i++) {
      var t = i / (steps - 1);
      var curve = Math.sin(t * Math.PI * 0.9);
      var x = originX + side * (length * 0.55 * t + length * 0.25 * curve);
      var y = originY - length * 0.75 * t + length * 0.12 * Math.sin(t * Math.PI);
      var radius = (length * 0.17) * (1 - t * 0.45);
      puffs.push({ x: x, y: y, r: radius, t: t });
    }
    return puffs;
  }

  BessDoku.MascotGeometry = {
    poofRing: poofRing,
    headGeometry: headGeometry,
    bodyGeometry: bodyGeometry,
    tailGeometry: tailGeometry
  };
})(window.BessDoku);
