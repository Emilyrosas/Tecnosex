/* ==========================================================================
   MUNDO 6 · LA ORILLA                 (camino 2: "Volver a sentir")
   --------------------------------------------------------------------------
   Playa al atardecer, más rosa y violeta que la llanura. El mar se mueve, el
   sol se refleja en el agua. Una silla mira hacia el horizonte (para
   quedarse, pensar). Lámparas encendidas en la arena marcan el camino hacia
   un edificio en ruinas a la derecha → Mundo 7.
   ========================================================================== */
(function () {
  const THREE = AFRAME.THREE;

  const A = {
    nivelMar: -0.3,
    olas: 1,                       // fuerza de las olas (0 = mar quieto)
    colorMar: '#7a5a8e',
    colorSol: '#ffd2a0',
    ruina: [30, 3],                // [x, z] del centro del edificio en ruinas
    lamparas: [                    // [x, z, color, forma]
      [1.4, -2.6, '#ffd9c2', 'campana'],
      [6, 0.5, '#ff9ec7', 'tambor'],
      [10, 3.5, '#f7f0ff', 'cono'],
      [14, 4.6, '#ffb3d1', 'campana'],
      [17.5, 7.2, '#ffe2b8', 'tambor'],
      [20.6, 8.0, '#d8b8ff', 'cono'],
    ],
  };

  // La arena baja suavemente hacia el mar (−Z)
  function alturaSuelo(x, z) {
    return (z + 7) * 0.07 + 0.12 * Math.sin(x * 0.3) * Math.cos(z * 0.25) + 0.25 * Math.sin(x * 0.07 + 1);
  }

  TECNO.registrarMundo({
    id: 6,
    cielo: { arriba: '#24143a', horizonte: '#ff8f7a', abajo: '#2c1a3a', sol: { color: A.colorSol, alto: 3, giro: 0, tamano: 1.4 } },
    niebla: { color: '#d48a88', densidad: 0.011 },
    exposicion: 1.05,
    reflejos: 1.0,
    inicio: { pos: [-3, 0, 12], mirar: 10 },
    limites: { minX: -24, maxX: 22.4, minZ: -8.5, maxZ: 18 },
    alturaSuelo,

    construir(H) {
      // 1 · LUCES ─────────────────────────────────────────────────────────
      H.luzHemisferio('#c49ae0', '#5a3a2a', 1.1);
      H.luzAmbiente('#3a2238', 0.4);
      H.luzSol('#ffb08a', 2.4, [0, 0.12, -1], { sombra: true, area: 35, centro: [5, 0, 2] });

      // 2 · ARENA ─────────────────────────────────────────────────────────
      const seg = Math.max(30, Math.round(90 * Math.sqrt(H.densidad())));
      const arena = H.geo.plano({ ancho: 300, alto: 110, divX: seg * 2, divY: seg, rot: [-90, 0, 0], pos: [0, 0, -5] });
      const p = arena.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, alturaSuelo(p.getX(i), p.getZ(i)));
      arena.computeVertexNormals();
      H.malla(arena, H.mat({ textura: 'arena', repetir: [80, 30], color: '#e0b8a8', rugosidad: 0.95 }));

      // 3 · EL MAR: un plano cuyos puntos suben y bajan en cada cuadro ───
      const segMar = Math.max(24, Math.round(70 * Math.sqrt(H.densidad())));
      const mar = H.geo.plano({ ancho: 420, alto: 230, divX: segMar * 2, divY: segMar, rot: [-90, 0, 0], pos: [0, 0, -125] });
      const mp = mar.attributes.position, base = mp.array.slice();
      H.malla(mar, H.mat({ color: A.colorMar, metal: 0.9, rugosidad: 0.12, reflejo: 2.2 }), { pos: [0, A.nivelMar, 0], sinSombra: true });
      H.animar(t => {
        for (let i = 0; i < mp.count; i++) {
          const x = base[i * 3], z = base[i * 3 + 2];
          const calma = Math.min(1, Math.max(0, (-z - 9) / 18));          // cerca de la orilla, olas más chicas
          mp.array[i * 3 + 1] = (Math.sin(x * 0.08 + t * 0.9) * 0.25 + Math.sin(z * 0.13 - t * 1.3) * 0.3 + Math.sin((x + z) * 0.21 + t * 1.7) * 0.08) * calma * A.olas;
        }
        mp.needsUpdate = true;
        mar.computeVertexNormals();
      });
      // espuma que va y viene
      const espuma = H.plano({ ancho: 300, alto: 2.4, rot: [-90, 0, 0], pos: [0, A.nivelMar + 0.08, -11], textura: 'espuma', repetir: [60, 1], aditivo: true, color: '#ffe8f0', opacidad: 0.5 });
      // el camino de luz del sol sobre el agua
      const reflejo = H.plano({ ancho: 16, alto: 200, rot: [-90, 0, 0], pos: [0, A.nivelMar + 0.25, -112], textura: 'reflejo', repetir: [1, 5], aditivo: true, color: A.colorSol, opacidad: 0.55 });
      H.animar((t, dt) => {
        espuma.position.z = -11 + Math.sin(t * 0.55) * 0.7;
        espuma.material.opacity = 0.35 + Math.sin(t * 0.55 + 1) * 0.2;
        reflejo.material.map.offset.y -= dt * 0.03;
        reflejo.material.opacity = 0.45 + Math.sin(t * 3.1) * 0.06;
      });

      // 4 · LA SILLA frente al mar (y su lámpara) ────────────────────────
      const sx = 0, sz = -4, sy = alturaSuelo(sx, sz);
      const silla = [];
      silla.push(H.geo.caja({ ancho: 0.5, alto: 0.05, fondo: 0.48, pos: [0, 0.45, 0] }));
      for (const [x, z] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) silla.push(H.geo.cilindro({ radio: 0.022, alto: 0.45, lados: 6, pos: [x, 0.225, z] }));
      silla.push(H.geo.caja({ ancho: 0.5, alto: 0.5, fondo: 0.04, pos: [0, 0.72, 0.22], rot: [-8, 0, 0] }));
      H.malla(H.fusionar(silla), H.mat({ color: '#d7c7b8', rugosidad: 0.8 }), { pos: [sx, sy, sz], rot: [0, 8, 0] });
      H.solido(sx, sz, 0.6, 0.6);

      // 5 · LÁMPARAS en la arena: marcan el camino a las ruinas ──────────
      A.lamparas.forEach(([x, z, color, forma], i) => {
        const l = H.lampara({ pos: [x, alturaSuelo(x, z) - 0.05, z], color, forma, alto: H.azar(0.8, 1.2), luz: i === 0 ? 3 : 0 });
        H.solido(x, z, 0.4, 0.4);
        l.userData.fase = H.azar(0, 6);
      });

      // 6 · RESTOS DE UN MUELLE que se pierde en el mar ──────────────────
      const postes = [];
      for (let z = -9; z > -75; z -= 3.4) for (const dx of [-1.2, 1.2]) if (H.azar() < 0.8) postes.push({ pos: [-13 + dx + H.azar(-0.2, 0.2), A.nivelMar - 0.6 + H.azar(0, 0.9), z], rot: [H.azar(-6, 6), 0, H.azar(-6, 6)] });
      H.instancias(H.geo.cilindro({ radio: 0.16, alto: 3, lados: 8, pos: [0, 1.5, 0] }), H.mat({ color: '#3a2a2a', rugosidad: 0.9 }), postes);

      // 7 · ROCAS ─────────────────────────────────────────────────────────
      const formas = [H.geo.roca({ radio: 1 }), H.geo.roca({ radio: 1, detalle: 0 }), H.geo.roca({ radio: 1 })];
      const piedra = H.mat({ color: '#5e4c56', rugosidad: 0.9, facetado: true });
      formas.forEach((f, k) => {
        const lista = [];
        for (let i = 0; i < H.cantidad(9); i++) {
          const x = H.azar(-26, 24), z = H.azar(-14, 16), e = H.azar(0.3, 1.4);
          if (Math.hypot(x - sx, z - sz) < 3 || (x > -6 && x < 22 && z > -4 && z < 7 && e > 0.5)) continue;   // no tapar el camino
          lista.push({ pos: [x, alturaSuelo(x, z) - 0.2, z], rot: [H.azar(0, 360), H.azar(0, 360), 0], esc: [e, e * H.azar(0.6, 1.1), e] });
          if (e > 0.7) H.solido(x, z, e * 1.6, e * 1.6);
        }
        H.instancias(f, piedra, lista);
      });
      // un monitor viejo medio enterrado
      H.caja({ ancho: 0.55, alto: 0.45, fondo: 0.5, pos: [-7, alturaSuelo(-7, 3) + 0.1, 3], rot: [-20, 35, 12], color: '#a89c8c', rugosidad: 0.8 });

      // 8 · EL EDIFICIO EN RUINAS (por fuera) ────────────────────────────
      const [rx, rz] = A.ruina, ry = alturaSuelo(rx, rz) - 0.6, x0 = rx - 7, x1 = rx + 7, z0 = rz - 11, z1 = rz + 11;
      const ruina = [
        // fachada que mira al jugador, con la puerta
        ...H.muro({ desde: [x0, z1], hasta: [x0, z0], alto: 12, grosor: 0.6, roto: 0.3, y: ry, huecos: [{ centro: 4, ancho: 2.8, base: 0, alto: 3.6 }, { centro: 4, ancho: 3, base: 5, alto: 3 }, { centro: 18, ancho: 3, base: 5, alto: 3 }, { centro: 11, ancho: 3, base: 9, alto: 2 }] }),
        ...H.muro({ desde: [x0, z0], hasta: [x1, z0], alto: 10, grosor: 0.6, roto: 0.5, y: ry, huecos: [{ centro: 7, ancho: 4, base: 2, alto: 3 }] }),
        ...H.muro({ desde: [x0, z1], hasta: [x1, z1], alto: 12, grosor: 0.6, roto: 0.4, y: ry }),
        ...H.muro({ desde: [x1, z0], hasta: [x1, z1], alto: 12, grosor: 0.6, roto: 0.2, y: ry }),
        H.geo.caja({ ancho: 14, alto: 0.5, fondo: 12, pos: [rx, ry + 12, rz + 5] }),          // techo a medias
        H.geo.caja({ ancho: 5, alto: 0.5, fondo: 7, pos: [rx - 1, ry + 6.5, rz - 6], rot: [12, 0, -20] }),   // losa colgando
      ];
      H.malla(H.fusionar(ruina), H.mat({ textura: 'concreto', repetir: [1, 1], color: '#b7a8a4', rugosidad: 0.95 }));
      H.solido(rx, rz, 14.6, 22.6);
      H.portal({ destino: 7, pos: [x0 - 0.45, alturaSuelo(x0, z1 - 4), z1 - 4], rot: [0, -90, 0], etiqueta: 'Las ruinas', color: '#ffd9e6', velo: '#1a0f1a', ancho: 2.4, alto: 3.4, radio: 1.5 });

      // 9 · PARTÍCULAS: brisa y brillos ──────────────────────────────────
      H.particulas({ cantidad: 260, centro: [0, 2.5, 4], area: [50, 5, 30], color: '#ffd2c8', tamano: 0.05, velocidad: [0.4, 0.02, 0.1], opacidad: 0.6 });
    },
  });
})();
