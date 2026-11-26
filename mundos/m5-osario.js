/* ==========================================================================
   MUNDO 5 · EL OSARIO (dentro de la torre)   (camino 1, final)
   --------------------------------------------------------------------------
   Una sala circular altísima. Cientos de cuerpos robóticos abandonados:
   tirados, apilados, sentados contra la pared, colgando de cables. Brillan
   como cromo (plateado y rosa). Arriba, anillos de luz con cables colgando y
   una abertura por donde entra el cielo.
   En el centro, un ORBE te sigue con la mirada → diálogo "ultimo" → Mundo 8.
   ========================================================================== */
(function () {
  const THREE = AFRAME.THREE;

  const A = {
    radio: 22, alto: 34,          // la sala
    tirados: 230,                 // cuerpos en el piso (con calidad Alta)
    sentados: 50,                 // contra la pared
    pilas: 6,                     // montones de cuerpos
    colgados: 18,                 // cuelgan de cables
    proporcionRosa: 0.3,          // 0 = todos plateados, 1 = todos rosas
    colorPlata: '#c9ccd2',
    colorRosa: '#ff5aa8',
    orbe: [0, -9],                // [x, z]
  };

  TECNO.registrarMundo({
    id: 5,
    cielo: { arriba: '#e8f4ff', horizonte: '#262c34', abajo: '#0c0d10' },   // se refleja en el cromo
    niebla: { color: '#0b1014', densidad: 0.035 },
    exposicion: 1.0,
    reflejos: 0.8,
    inicio: { pos: [0, 0, 17], mirar: 0 },
    limites: { radio: 20.5 },

    construir(H) {
      const R = A.radio, T = A.alto, [ox, oz] = A.orbe;

      // 1 · LUCES: todo viene de arriba ──────────────────────────────────
      H.seccion('1 · Luces');
      H.luzHemisferio('#c9e6ff', '#140d12', 0.5);
      H.luzAmbiente('#2a3340', 0.35);
      H.luzSol('#e6f4ff', 2.2, [0.15, 1, 0.1], { sombra: true, area: 22 });
      H.luzPunto('#dff2ff', 30, 40, [0, 15, 0]);

      // 2 · LA SALA ───────────────────────────────────────────────────────
      H.seccion('2 · La sala');
      H.cilindro({ radio: R + 0.5, alto: 0.2, lados: 64, pos: [0, -0.1, 0], textura: 'panel', repetir: [10, 10], color: '#6a7378', metal: 0.5, rugosidad: 0.55 });
      const pared = H.mat({ textura: 'metal', repetir: [14, 6], color: '#77736a', metal: 0.6, rugosidad: 0.5, atras: true });
      H.cilindro({ radio: R + 0.6, alto: T, lados: 64, abierto: true, pos: [0, T / 2, 0], mat: pared });
      // costillas y anillos (como el interior de un cuerpo-máquina)
      const costillas = [];
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * Math.PI * 2;
        costillas.push({ pos: [Math.cos(a) * R, T / 2, Math.sin(a) * R], rot: [0, -a * 180 / Math.PI, 0] });
      }
      const hueso = H.mat({ color: '#8d8a80', metal: 0.4, rugosidad: 0.6 });
      H.instancias(H.geo.caja({ ancho: 1.2, alto: T, fondo: 0.6 }), hueso, costillas);
      const aros = [];
      for (let y = 4; y < T; y += 5) aros.push({ pos: [0, y, 0], rot: [90, 0, 0] });
      H.instancias(H.geo.toro({ radio: R - 0.5, grosor: 0.25, lados: 64, ladosTubo: 6 }), hueso, aros);
      // techo con abertura y la luz del cielo cayendo
      H.anillo({ radioInterno: 6, radio: R + 0.6, lados: 64, rot: [90, 0, 0], pos: [0, T, 0], color: '#2a2c30', doble: true });
      H.circulo({ radio: 6, rot: [90, 0, 0], pos: [0, T + 2, 0], basico: true, color: '#ffffff' });
      H.brillo({ pos: [0, T + 1, 0], color: '#e8f6ff', tamano: 40, opacidad: 0.8 });
      H.cilindro({ radioArriba: 6, radioAbajo: 10, alto: T, lados: 32, abierto: true, pos: [0, T / 2, 0], aditivo: true, color: '#cfe8ff', opacidad: 0.05, doble: true });

      // 3 · EL CANDELABRO: anillos de luz con cables colgando ────────────
      H.seccion('3 · El candelabro');
      H.candelabro({ pos: [0, 19, 0], radio: 9, anillos: 3, separacion: 2, cables: 45, caida: 7, color: '#e3f7ff', girar: 0.02 });

      // 4 · LOS CUERPOS ───────────────────────────────────────────────────
      H.seccion('4 · Los cuerpos');
      // Un solo material de cromo; el color (plata o rosa) va por instancia.
      const cromo = H.mat({ color: '#ffffff', metal: 0.95, rugosidad: 0.22, textura: 'metal', reflejo: 1.6 });
      const tono = () => H.azar() < A.proporcionRosa ? A.colorRosa : A.colorPlata;
      const libre = (x, z) => (Math.abs(x) < 2.3 && z > oz) || Math.hypot(x - ox, z - oz) < 5.5;   // pasillo y zona del orbe

      // tirados en el piso
      const tirados = [];
      let intentos = 0;
      while (tirados.length < H.cantidad(A.tirados) && intentos++ < 5000) {
        const r = H.azar(4, R - 1.5), a = H.azar(0, Math.PI * 2), x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (libre(x, z)) continue;
        tirados.push({ pos: [x, 0.15, z], rot: [-90 + H.azar(-6, 6), H.azar(0, 360), H.azar(-12, 12)], color: tono() });
      }
      // pilas: cuerpos encimados
      for (let p = 0; p < A.pilas; p++) {
        const a = H.azar(0, Math.PI * 2), r = H.azar(9, 17), x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (libre(x, z)) continue;
        for (let k = 0; k < 6; k++) tirados.push({ pos: [x + H.azar(-0.6, 0.6), 0.15 + k * 0.24, z + H.azar(-0.6, 0.6)], rot: [-90 + H.azar(-15, 15), H.azar(0, 360), H.azar(-25, 25)], color: tono() });
        H.solido(x, z, 2.2, 2.2);
      }
      H.instancias(H.cuerpo('caido'), cromo, tirados, { nombre: 'cuerpos tirados', pieza: 'cuerpo' });

      // sentados contra la pared, mirando al centro
      const sentados = [];
      for (let i = 0; i < H.cantidad(A.sentados); i++) {
        const a = H.azar(0, Math.PI * 2), x = Math.cos(a) * (R - 1.1), z = Math.sin(a) * (R - 1.1);
        if (libre(x, z)) continue;
        sentados.push({ pos: [x, 0, z], rot: [0, Math.atan2(-x, -z) * 180 / Math.PI, 0], color: tono() });
      }
      H.instancias(H.cuerpo('sentado'), cromo, sentados, { nombre: 'cuerpos sentados', pieza: 'cuerpo' });

      // colgados: giran despacio colgando de un cable
      const colgados = [], hilos = [];
      for (let i = 0; i < A.colgados; i++) {
        const a = H.azar(0, Math.PI * 2), r = H.azar(3, 8.5), x = Math.cos(a) * r, z = Math.sin(a) * r, y = H.azar(5, 11);
        colgados.push({ x, y, z, giro: H.azar(0, 360), vel: H.azar(-8, 8), color: tono() });
        hilos.push(H.geo.cilindro({ radio: 0.012, alto: 19 - y - 1.8, lados: 4, pos: [x, (19 + y + 1.8) / 2, z] }));
      }
      const mColgados = H.instancias(H.cuerpo('de pie'), cromo, colgados.map(c => ({ pos: [c.x, c.y, c.z], rot: [0, c.giro, 0], color: c.color })), { mover: true });
      H.malla(H.fusionar(hilos, { nombre: 'hilos' }), H.mat({ color: '#0d0f12' }));
      H.animar(t => colgados.forEach((c, i) => H.moverInstancia(mColgados, i, { pos: [c.x, c.y, c.z], rot: [Math.sin(t * 0.4 + i) * 2, c.giro + t * c.vel, 0] })));

      // 5 · EL PASILLO y EL ORBE ──────────────────────────────────────────
      H.seccion('5 · El pasillo y el orbe');
      const guias = [];
      for (let z = R - 2; z > oz + 4; z -= 1.5) for (const x of [-1.8, 1.8]) guias.push({ pos: [x, 0.02, z] });
      H.instancias(H.geo.caja({ ancho: 0.06, alto: 0.03, fondo: 0.7 }), H.mat({ basico: true, color: '#d8f0ff' }), guias);
      H.cilindro({ radio: 2.6, alto: 0.6, lados: 6, pos: [ox, 0.3, oz], color: '#3a3f44', metal: 0.7, rugosidad: 0.4 });
      H.cilindro({ radio: 1.6, alto: 1.4, lados: 6, pos: [ox, 0.7, oz], color: '#2a2e33', metal: 0.7, rugosidad: 0.4 });
      H.solido(ox, oz, 5, 5);
      H.orbe({ pos: [ox, 4.2, oz], radio: 1.5, color: '#eef6ff', iris: '#ff1f4f', dialogo: 'ultimo', distancia: 7, anillos: 1, cables: 18, luz: 8, aviso: 'El ojo te reconoce…' });

      // 6 · POLVO cayendo en la luz ──────────────────────────────────────
      H.seccion('6 · Polvo cayendo en la luz');
      H.particulas({ cantidad: 450, centro: [0, 14, 0], area: [16, 28, 16], color: '#d6ebff', tamano: 0.05, velocidad: [0, -0.12, 0], vaiven: 0.08, opacidad: 0.7 });
    },
  });
})();
