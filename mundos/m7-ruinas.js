/* ==========================================================================
   MUNDO 7 · LAS RUINAS                (camino 2, final)
   --------------------------------------------------------------------------
   Dentro del edificio en ruinas junto al mar. Muros de concreto rotos, medio
   techo caído, pasto creciendo entre las grietas, una cama vieja, una cortina
   que se mueve con el viento y lámparas encendidas en el piso, como si
   alguien fuera a volver. Por los ventanales entra el atardecer.
   Al fondo, una puerta de luz rosa → Mundo 8.
   ========================================================================== */
(function () {
  const THREE = AFRAME.THREE;

  const A = {
    ancho: 16, largo: 24, alto: 6,    // la sala: x de −8 a 8, z de −12 a 12
    colorSol: '#ffb487',
    lamparas: [                       // [x, z, color, forma, ¿caída?]
      [-4.5, 6, '#ffd9c2', 'campana', false],
      [3.8, 7.5, '#ff9ec7', 'tambor', false],
      [-1.5, 1.2, '#f7f0ff', 'cono', true],
      [5.2, -1, '#ffb3d1', 'campana', false],
      [-5.6, -4, '#ffe2b8', 'tambor', false],
      [2, -6.5, '#d8b8ff', 'cono', false],
      [-2.4, -9, '#ffc6dc', 'campana', false],
      [5.8, -9.5, '#ffd9c2', 'tambor', true],
    ],
  };

  TECNO.registrarMundo({
    id: 7,
    cielo: { arriba: '#1d1233', horizonte: '#f08a6a', abajo: '#2a1830', sol: { color: '#ffc49a', alto: 4, giro: 90, tamano: 1.5 } },
    niebla: { color: '#b8706c', densidad: 0.022 },
    exposicion: 1.1,
    reflejos: 0.9,
    inicio: { pos: [0, 0, 10.5], mirar: 0 },
    limites: { minX: -7.4, maxX: 7.4, minZ: -11.6, maxZ: 11.3 },

    construir(H) {
      const W = A.ancho, L = A.largo, T = A.alto, x0 = -W / 2, x1 = W / 2, z0 = -L / 2, z1 = L / 2;

      // 1 · LUCES: el sol entra bajo por los ventanales (izquierda, −X) ──
      H.luzHemisferio('#c08ac0', '#3a2520', 0.9);
      H.luzAmbiente('#40263a', 0.45);
      H.luzSol(A.colorSol, 3, [-1, 0.28, -0.15], { sombra: true, area: 18 });
      H.luzPunto('#ffc9a8', 4, 9, [-1, 1.2, 2]);

      // 2 · PISO Y MUROS ─────────────────────────────────────────────────
      H.plano({ ancho: W, alto: L, rot: [-90, 0, 0], textura: 'concreto', repetir: [4, 6], color: '#a8988f', rugosidad: 0.9 });
      const concreto = H.mat({ textura: 'concreto', repetir: [1, 1], color: '#b3a39c', rugosidad: 0.95 });
      const ventanales = [4, 12, 20].map(c => ({ centro: c, ancho: 3.4, base: 0.9, alto: 3.6 }));
      const muros = [
        ...H.muro({ desde: [x0, z1], hasta: [x0, z0], alto: T, grosor: 0.5, roto: 0.35, huecos: ventanales }),                         // lado del mar
        ...H.muro({ desde: [x1, z0], hasta: [x1, z1], alto: T, grosor: 0.5, roto: 0.3, huecos: [{ centro: 8, ancho: 1.6, base: 1.4, alto: 2 }, { centro: 17, ancho: 1.6, base: 1.4, alto: 2 }] }),
        ...H.muro({ desde: [x1, z0], hasta: [x0, z0], alto: T, grosor: 0.5, roto: 0.2, huecos: [{ centro: W / 2, ancho: 2.6, base: 0, alto: 3.4 }] }),   // fondo, con la puerta
        ...H.muro({ desde: [x0, z1], hasta: [x1, z1], alto: T, grosor: 0.5, roto: 0.6, huecos: [{ centro: 6, ancho: 3, base: 0, alto: 3.5 }] }),
      ];
      // columnas: una rota, una caída
      for (const [x, z, alto] of [[-3.5, -8, T], [3.5, -8, T], [-3.5, -2, T * 0.55], [3.5, -2, T], [3.5, 4, T], [-3.5, 10, T]]) {
        muros.push(H.geo.caja({ ancho: 0.6, alto, fondo: 0.6, pos: [x, alto / 2, z] }));
        H.solido(x, z, 0.7, 0.7);
      }
      muros.push(H.geo.caja({ ancho: 0.6, alto: T, fondo: 0.6, pos: [-1.2, 0.35, 5.2], rot: [90, 70, 0] }));   // columna caída
      H.solido(-1.2, 5.2, 2.2, 1.6);
      // techo: solo queda la mitad del fondo, con huecos
      for (let x = x0; x < x1; x += 2) for (let z = z0; z < 0; z += 2) if (H.azar() > 0.22) muros.push(H.geo.caja({ ancho: 2, alto: 0.4, fondo: 2, pos: [x + 1, T, z + 1] }));
      // escombros
      for (let i = 0; i < 9; i++) muros.push(H.geo.caja({ ancho: H.azar(0.4, 1.6), alto: H.azar(0.2, 0.6), fondo: H.azar(0.4, 1.4), pos: [H.azar(-6.5, 6.5), 0.15, H.azar(0, 11)], rot: [H.azar(-20, 20), H.azar(0, 90), H.azar(-20, 20)] }));
      muros.push(H.geo.caja({ ancho: 3.5, alto: 0.35, fondo: 2.4, pos: [4.6, 0.9, 1.5], rot: [0, 15, 28] }));   // pedazo de techo caído
      H.solido(4.8, 1.5, 3.2, 2.4);
      H.malla(H.fusionar(muros), concreto);

      // charco que refleja el cielo
      H.circulo({ radio: 1.4, rot: [-90, 0, 0], pos: [-2.5, 0.01, -3.5], esc: [1.6, 1, 1], color: '#3a2a3c', metal: 1, rugosidad: 0.05, reflejo: 2 });

      // 3 · PASTO creciendo pegado a los muros ───────────────────────────
      H.pasto({
        cantidad: 2600, area: [W - 0.6, L - 0.6], alto: [0.1, 0.45], color: '#6a8040',
        excluir: (x, z) => Math.min(x - x0, x1 - x, z - z0, z1 - z) > 1.6 && H.azar() < 0.85,
      });

      // 4 · LA CAMA vieja ─────────────────────────────────────────────────
      const cama = H.grupo({ pos: [5.6, 0, 8.6], rot: [0, -90, 0] });
      const fierro = [];
      for (const [x, z] of [[-0.48, -1], [0.48, -1], [-0.48, 1], [0.48, 1]]) fierro.push(H.geo.cilindro({ radio: 0.025, alto: z < 0 ? 1.1 : 0.7, lados: 6, pos: [x, z < 0 ? 0.55 : 0.35, z] }));
      fierro.push(H.geo.toro({ radio: 0.48, grosor: 0.02, arco: 180, lados: 20, ladosTubo: 4, pos: [0, 1.08, -1] }));
      for (let k = -2; k <= 2; k++) fierro.push(H.geo.cilindro({ radio: 0.012, alto: 0.6, lados: 4, pos: [k * 0.18, 0.75, -1] }));
      H.malla(H.fusionar(fierro), H.mat({ color: '#4d4448', metal: 0.7, rugosidad: 0.5 }), { padre: cama });
      H.caja({ padre: cama, ancho: 0.95, alto: 0.2, fondo: 1.95, pos: [0, 0.42, 0], color: '#d9cfc4', rugosidad: 1 });
      H.caja({ padre: cama, ancho: 0.9, alto: 0.06, fondo: 1.2, pos: [0.05, 0.55, 0.3], rot: [0, 6, 2], color: '#c79aa8', rugosidad: 1 });   // cobija
      H.solido(5.6, 8.6, 2.1, 1.1);

      // 5 · LÁMPARAS encendidas (algunas caídas) ─────────────────────────
      const lamparas = A.lamparas.map(([x, z, color, forma, caida]) => {
        H.solido(x, z, 0.4, 0.4);
        return H.lampara({ pos: [x, caida ? 0.12 : 0, z], rot: caida ? [0, H.azar(0, 360), 82] : [0, 0, 0], color, forma, alto: H.azar(0.7, 1.15) });
      });
      H.animar(t => lamparas.forEach((l, i) => { l.userData.brillo.material.opacity = 0.5 + Math.sin(t * 2 + i * 1.7) * 0.05 + (Math.random() < 0.01 ? -0.3 : 0); }));

      // 6 · LA CORTINA que se mueve con el viento ────────────────────────
      const tela = H.geo.plano({ ancho: 3, alto: 3.4, divX: 12, divY: 14 });
      const tp = tela.attributes.position, tb = tp.array.slice();
      H.malla(tela, H.mat({ color: '#f6dfe6', emisivo: '#ffb0a0', brillo: 0.25, transparente: true, opacidad: 0.6, doble: true, rugosidad: 1 }), { pos: [x0 + 0.5, 2.7, z1 - 12], rot: [0, 90, 0], sinSombra: true });
      H.animar(t => {
        for (let i = 0; i < tp.count; i++) {
          const x = tb[i * 3], y = tb[i * 3 + 1], libre = (1.7 - y) / 3.4;     // arriba está sujeta
          tp.array[i * 3 + 2] = Math.sin(t * 1.4 + y * 1.3 + x * 0.9) * 0.35 * libre + libre * 0.4;
        }
        tp.needsUpdate = true;
        tela.computeVertexNormals();
      });

      // 7 · AFUERA: el mar y la arena (se ven por los ventanales) ────────
      H.plano({ ancho: 400, alto: 400, rot: [-90, 0, 0], pos: [-200, -2.6, 0], color: '#2c1d38', metal: 0.9, rugosidad: 0.15, reflejo: 1.8 });
      H.plano({ ancho: 14, alto: 400, rot: [-90, 0, 0], pos: [x0 - 7, -1.4, 0], textura: 'arena', repetir: [4, 100], color: '#c9a0a0' });
      H.plano({ ancho: 8, alto: 200, rot: [-90, 90, 0], pos: [-120, -2.5, 0], textura: 'reflejo', repetir: [1, 4], aditivo: true, color: '#ffc49a', opacidad: 0.4 });

      // sin sombras reales: manchas de luz falsas bajo los ventanales
      if (!H.sombras()) ventanales.forEach(v => H.plano({ ancho: 4.5, alto: 3.2, rot: [-90, 0, 0], pos: [x0 + 2.8, 0.02, z1 - v.centro], aditivo: true, textura: 'brillo', color: '#ffb48a', opacidad: 0.4 }));

      // 8 · POLVO dorado en el aire ──────────────────────────────────────
      H.particulas({ cantidad: 300, centro: [0, 2.5, 0], area: [W, 5, L], color: '#ffd0a8', tamano: 0.04, velocidad: [0.08, 0.03, 0], vaiven: 0.06, opacidad: 0.7 });

      // 9 · LA PUERTA → MUNDO 8 ───────────────────────────────────────────
      H.portal({ destino: 8, pos: [0, 0, z0 + 0.35], etiqueta: 'Lo que queda', color: '#ffc6dc', velo: '#ff2f7a', ancho: 2.3, alto: 3.3 });
    },
  });
})();
