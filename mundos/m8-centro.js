/* ==========================================================================
   MUNDO 8 · TECNOSEXUALIDAD (el centro)     (los dos caminos terminan aquí)
   --------------------------------------------------------------------------
   Un vacío rosa y carnoso, como un útero. Células translúcidas flotan unidas
   por membranas; cada una lleva una palabra (Deseo, Interfaz, Ciborg…).
   Arriba, los anillos de luz con cables. En el centro, una figura hecha de
   luz. Al acercarte → diálogo "despertar" → vuelves al Mundo 1 y el ciclo
   empieza de nuevo.
   ========================================================================== */
(function () {
  const THREE = AFRAME.THREE;

  const A = {
    // las palabras de las células (cámbialas, agrega o quita)
    palabras: ['Deseo', 'Erotismo', 'Tecnología', 'Sexualidad', 'Ciberespacio', 'Ciborg', 'Corporalidad', 'IAs', 'Interfaz', 'Virtualidad', 'Onírico', 'Sexo'],
    centro: 'Tecnosexualidad',
    colorCelula: '#ff7fb0',
    colorFigura: '#ffffff',
    cuerposFlotando: 8,
  };

  TECNO.registrarMundo({
    id: 8,
    cielo: { arriba: '#4a0420', horizonte: '#ff4f8f', abajo: '#3a0418' },
    niebla: { color: '#c2245e', densidad: 0.024 },
    exposicion: 1.0,
    reflejos: 1.2,
    inicio: { pos: [0, 0, 16], mirar: 0 },
    limites: { radio: 22 },

    construir(H) {
      // 1 · LUCES ─────────────────────────────────────────────────────────
      H.luzHemisferio('#ff8ab8', '#3a0016', 1.0);
      H.luzAmbiente('#ff3a7a', 0.35);
      H.luzPunto('#ffffff', 14, 22, [0, 1.6, 0]);

      // 2 · EL PISO: líquido brillante con ondas de luz que se expanden ──
      H.circulo({ radio: 60, lados: 64, rot: [-90, 0, 0], color: '#ff7aa8', metal: 0.7, rugosidad: 0.14, reflejo: 1.6 });
      const ondas = [0, 1, 2].map(() => H.toro({ radio: 1, grosor: 0.02, lados: 64, ladosTubo: 3, rot: [90, 0, 0], pos: [0, 0.03, 0], aditivo: true, color: '#ff9ccc', opacidad: 0.5 }));
      H.animar(t => ondas.forEach((o, k) => {
        const f = ((t * 0.12 + k / 3) % 1);
        o.scale.set(1 + f * 18, 1 + f * 18, 1);
        o.material.opacity = 0.55 * (1 - f);
      }));

      // 3 · LAS CÉLULAS con palabras, unidas por membranas ──────────────
      const piel = H.mat({ color: A.colorCelula, emisivo: '#ff2f7a', brillo: 0.35, transparente: true, opacidad: 0.5, rugosidad: 0.12, reflejo: 1.3 });
      const nucleo = [0, 8.5, 0];
      const celulas = A.palabras.map((palabra, i) => {
        const a = i / A.palabras.length * Math.PI * 2, r = 10 + (i % 2) * 2.5, y = 2.6 + (i % 3) * 1.5;
        const pos = [Math.cos(a) * r, y, Math.sin(a) * r];
        const m = H.esfera({ radio: 1, lados: 24, pos, esc: [1.7, 0.8, 1], rot: [0, -a * 180 / Math.PI + 90, 0], mat: piel });
        H.texto({ texto: palabra, pos, alto: 0.75, color: '#fff0f5', resplandor: '#ff5fa0' });
        return { m, pos, fase: H.azar(0, 6.28) };
      });
      // la célula central, encima de la figura
      const grande = H.esfera({ radio: 1, lados: 32, pos: nucleo, esc: [3.6, 1.3, 2], mat: piel });
      H.texto({ texto: A.centro, pos: nucleo, alto: 1.1, color: '#ffffff', resplandor: '#ff5fa0' });
      // membranas: cada célula se une con la siguiente y con el centro
      const membranas = [];
      celulas.forEach((c, i) => {
        const sig = celulas[(i + 1) % celulas.length].pos, p = c.pos;
        membranas.push(H.geo.tubo({ puntos: [p, [(p[0] + sig[0]) / 2 * 0.92, (p[1] + sig[1]) / 2 - 0.6, (p[2] + sig[2]) / 2 * 0.92], sig], radio: 0.18, lados: 8 }));
        membranas.push(H.geo.tubo({ puntos: [p, [p[0] * 0.5, (p[1] + nucleo[1]) / 2 - 1.5, p[2] * 0.5], nucleo], radio: 0.12, lados: 8 }));
      });
      H.malla(H.fusionar(membranas), piel);
      H.animar(t => {               // las células respiran
        celulas.forEach(c => { const s = 1 + Math.sin(t * 0.9 + c.fase) * 0.05; c.m.scale.set(1.7 * s, 0.8 * s, 1 * s); });
        const s = 1 + Math.sin(t * 0.6) * 0.03; grande.scale.set(3.6 * s, 1.3 * s, 2 * s);
      });

      // 4 · LOS ANILLOS DE LUZ arriba ────────────────────────────────────
      H.candelabro({ pos: [0, 12, 0], radio: 6.5, anillos: 3, separacion: 1.2, cables: 34, caida: 5, color: '#ffe6f2', girar: 0.05 });

      // 5 · LA FIGURA DE LUZ ──────────────────────────────────────────────
      const figura = H.grupo({ pos: [0, 0, 0] });
      H.malla(H.cuerpo('de pie'), H.mat({ basico: true, color: A.colorFigura }), { padre: figura });
      H.brillo({ padre: figura, pos: [0, 1.2, 0], color: '#ffffff', tamano: 3.5, opacidad: 0.9 });
      H.brillo({ padre: figura, pos: [0, 1.1, 0], color: '#bfe9ff', tamano: 9, opacidad: 0.45 });
      const destello = H.brillo({ padre: figura, pos: [0, 1.35, 0], color: '#9fd8ff', tamano: [18, 0.12], opacidad: 0.6 });   // destello horizontal
      H.brillo({ padre: figura, pos: [0, 1.45, 0], color: '#ff9fd0', tamano: [11, 0.08], opacidad: 0.35 });
      H.zona({ pos: [0, 0, 0], radio: 3.6, dialogo: 'despertar', aviso: 'Una presencia te espera' });
      const mira = new THREE.Object3D();
      H.animar((t, dt) => {
        // la figura gira lentamente hacia ti
        mira.position.copy(figura.position); mira.lookAt(H.camara().x, 0, H.camara().z);
        figura.quaternion.slerp(mira.quaternion, 1 - Math.exp(-0.8 * dt));
        destello.material.opacity = 0.5 + Math.sin(t * 2.3) * 0.15;
      });

      // 6 · CUERPOS translúcidos flotando a lo lejos (el eco del Mundo 1) ─
      const flotantes = [];
      for (let i = 0; i < A.cuerposFlotando; i++) flotantes.push({ a: i / A.cuerposFlotando * Math.PI * 2, r: H.azar(19, 26), y: H.azar(3, 10), rot: [H.azar(0, 360), H.azar(0, 360), H.azar(0, 360)], v: H.azar(0.01, 0.03) });
      const mFlot = H.instancias(H.cuerpo('feto'), H.mat({ color: '#ffd0c0', emisivo: '#ff9a9a', brillo: 0.4, transparente: true, opacidad: 0.35 }), flotantes.map(() => ({})), { mover: true });
      H.animar(t => flotantes.forEach((f, i) => {
        const a = f.a + t * f.v;
        H.moverInstancia(mFlot, i, { pos: [Math.cos(a) * f.r, f.y + Math.sin(t * 0.3 + i) * 0.8, Math.sin(a) * f.r], rot: [f.rot[0] + t * 4, f.rot[1] + t * 3, f.rot[2]], esc: 2.6 });
      }));

      // 7 · PARTÍCULAS rosas subiendo ────────────────────────────────────
      H.particulas({ cantidad: 400, centro: [0, 5, 0], area: [44, 12, 44], color: '#ffb3d6', tamano: 0.07, velocidad: [0, 0.18, 0], vaiven: 0.1, opacidad: 0.7 });
    },
  });
})();
