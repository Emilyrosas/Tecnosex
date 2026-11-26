/* ==========================================================================
   MUNDO 4 · LA TORRE (afuera)        (camino 1: "Fundirme con la máquina")
   --------------------------------------------------------------------------
   Estás al pie de una torre enorme que atraviesa las nubes: costillas,
   vértebras y tubos, como un organismo-máquina. Cielo verdoso y ceniza.
   Solo puedes observarla desde abajo. En su base, una puerta → Mundo 5.
   ========================================================================== */
(function () {
  const THREE = AFRAME.THREE;

  const A = {
    alturaTorre: 420,         // metros (la punta se pierde en las nubes)
    radioTorre: 11,
    centroTorre: [0, -45],    // [x, z]
    costillas: 28,            // nervaduras verticales alrededor
    anillosCada: 15,          // un anillo cada N metros
    ventanas: 420,            // rendijas de luz
    alturaNubes: 140,
    colorVentanas: '#7ff5e1',
    colorAlerta: '#ff2a3a',   // luces rojas que parpadean
  };

  TECNO.registrarMundo({
    id: 4,
    cielo: { arriba: '#16201f', horizonte: '#7d8f86', abajo: '#2a302e' },
    niebla: { color: '#5c6b66', densidad: 0.011 },
    exposicion: 1.1,
    reflejos: 0.6,
    inicio: { pos: [0, 0, 18], mirar: 0 },
    limites: { minX: -20, maxX: 20, minZ: -27.4, maxZ: 22 },

    construir(H) {
      const [tx, tz] = A.centroTorre, R = A.radioTorre, Ht = A.alturaTorre;

      // 1 · LUCES: el sol está detrás de la torre (te tapa su sombra) ────
      H.seccion('1 · Luces');
      H.luzHemisferio('#b8cdc4', '#3a4440', 1.8);
      H.luzAmbiente('#3c4846', 0.7);
      H.luzSol('#d8eee4', 1.8, [0.3, 1, -0.8], { sombra: true, area: 45, centro: [0, 0, -12] });

      // 2 · EL SUELO: placas tecnológicas y "ciudad" de bloques bajos ────
      H.seccion('2 · El suelo');
      H.plano({ ancho: 500, alto: 500, rot: [-90, 0, 0], textura: 'panel', repetir: [90, 90], color: '#8a9894', rugosidad: 0.8, metal: 0.3 });
      const bloques = [];
      let intentos = 0;
      while (bloques.length < H.cantidad(520) && intentos++ < 5000) {
        const x = H.azar(-170, 170), z = H.azar(-200, 120);
        if (Math.hypot(x, z) < 30 || Math.hypot(x - tx, z - tz) < R + 12) continue;
        const an = H.azar(0.8, 6), al = H.azar(0.2, 2.5) * (Math.hypot(x, z) / 60 + 0.5), fo = H.azar(0.8, 6);
        bloques.push({ pos: [x, al / 2, z], esc: [an, al, fo], color: new THREE.Color('#3b4542').offsetHSL(0, 0, H.azar(-0.06, 0.06)) });
      }
      H.instancias(H.geo.caja(), H.mat({ textura: 'panel', color: '#ffffff', rugosidad: 0.8, metal: 0.3 }), bloques, { masa: true, nombre: 'ciudad de bloques' });
      // pedestales en la plaza (sólidos)
      for (const [x, z, an, al] of [[-12, 4, 3, 1.2], [13, -6, 4, 0.8], [-9, -16, 2.5, 2], [11, 12, 2, 1.5]]) H.caja({ ancho: an, alto: al, fondo: an, pos: [x, al / 2, z], textura: 'panel', color: '#6a7673', solido: true });
      // luces en el piso que llevan a la puerta
      const guias = [];
      for (let z = 20; z > -27; z -= 3) for (const x of [-2.5, 2.5]) guias.push({ pos: [x, 0.02, z] });
      H.instancias(H.geo.caja({ ancho: 0.3, alto: 0.04, fondo: 0.9 }), H.mat({ basico: true, color: A.colorVentanas }), guias);

      // 3 · LA TORRE ──────────────────────────────────────────────────────
      H.seccion('3 · La torre');
      const torre = H.grupo({ pos: [tx, 0, tz], nombre: 'torre' });
      const metal = H.mat({ textura: 'metal', repetir: [8, 60], color: '#59625f', metal: 0.75, rugosidad: 0.45 });
      H.cilindro({ padre: torre, radio: R, alto: Ht, lados: 48, pos: [0, Ht / 2, 0], mat: metal });                    // núcleo
      H.cilindro({ padre: torre, radioArriba: R + 0.5, radioAbajo: R + 6, alto: 14, lados: 48, pos: [0, 7, 0], mat: metal });  // base ensanchada
      // costillas verticales (instancias)
      const costillas = [];
      for (let i = 0; i < A.costillas; i++) {
        const a = i / A.costillas * Math.PI * 2;
        costillas.push({ pos: [Math.cos(a) * (R + 0.5), Ht / 2, Math.sin(a) * (R + 0.5)], rot: [0, -a * 180 / Math.PI, 0] });
      }
      H.instancias(H.geo.caja({ ancho: 1.6, alto: Ht, fondo: 0.7, nombre: 'costilla' }), metal, costillas, { padre: torre });
      // anillos cada N metros
      const anillos = [];
      for (let y = 20; y < Ht; y += A.anillosCada) anillos.push({ pos: [0, y, 0], rot: [90, 0, 0] });
      H.instancias(H.geo.toro({ radio: R + 1.4, grosor: 0.45, lados: 64, ladosTubo: 8 }), H.mat({ color: '#3f4745', metal: 0.8, rugosidad: 0.4 }), anillos, { padre: torre });
      // vértebras a lo largo de 8 costillas (como una columna vertebral)
      const vertebra = H.fusionar([
        H.geo.esfera({ radio: 1, lados: 10, esc: [1.1, 0.55, 0.9] }),
        H.geo.cono({ radio: 0.35, alto: 1.4, lados: 6, rot: [0, 0, -90], pos: [0.9, 0, 0] }),
      ], { unir: true, nombre: 'vertebra' });
      const vertebras = [];
      for (let k = 0; k < 8; k++) {
        const a = (k + 0.5) / 8 * Math.PI * 2;
        for (let y = 16; y < 160; y += 2.6) vertebras.push({ pos: [Math.cos(a) * (R + 1.6), y, Math.sin(a) * (R + 1.6)], rot: [0, -a * 180 / Math.PI, 0], esc: 0.9 + Math.sin(y * 0.3) * 0.15 });
      }
      H.instancias(vertebra, H.mat({ color: '#8b8a7e', metal: 0.4, rugosidad: 0.55 }), vertebras, { padre: torre, masa: true, nombre: 'vertebras' });
      // tubos que suben
      const tubos = [];
      for (let k = 0; k < 14; k++) { const a = H.azar(0, Math.PI * 2); tubos.push(H.geo.cilindro({ radio: H.azar(0.15, 0.4), alto: Ht, lados: 8, pos: [Math.cos(a) * (R + 0.9), Ht / 2, Math.sin(a) * (R + 0.9)] })); }
      H.malla(H.fusionar(tubos, { nombre: 'tubos' }), H.mat({ color: '#2b302f', metal: 0.8, rugosidad: 0.35 }), { padre: torre });
      // rendijas de luz
      const ventanas = [];
      for (let i = 0; i < H.cantidad(A.ventanas); i++) {
        const a = H.azar(0, Math.PI * 2), y = H.azar(16, 260);
        ventanas.push({ pos: [Math.cos(a) * (R + 0.05), y, Math.sin(a) * (R + 0.05)], rot: [0, -a * 180 / Math.PI + 90, 0] });
      }
      H.instancias(H.geo.caja({ ancho: 0.25, alto: 1.4, fondo: 0.1 }), H.mat({ basico: true, color: A.colorVentanas }), ventanas, { padre: torre, masa: true, nombre: 'ventanas' });
      // luces rojas de advertencia (parpadean)
      const alertas = [];
      for (let y = 40; y < 260; y += 40) for (let k = 0; k < 4; k++) {
        const a = k / 4 * Math.PI * 2 + y;
        alertas.push(H.brillo({ padre: torre, pos: [Math.cos(a) * (R + 2), y, Math.sin(a) * (R + 2)], color: A.colorAlerta, tamano: 6, opacidad: 0.9 }));
      }
      H.animar(t => { const on = (t % 2) < 0.3; alertas.forEach(b => { b.material.opacity = on ? 0.9 : 0.08; }); });

      // la puerta: dos contrafuertes enormes y un dintel
      const puerta = [];
      for (const x of [-3.4, 3.4]) { puerta.push(H.geo.caja({ ancho: 1.6, alto: 16, fondo: 6, pos: [x, 8, 0] })); H.solido(x, -29.5, 1.8, 6); }
      puerta.push(H.geo.caja({ ancho: 8.4, alto: 2, fondo: 6, pos: [0, 15, 0] }));
      puerta.push(H.geo.caja({ ancho: 5.2, alto: 8, fondo: 0.4, pos: [0, 4, -2.6] }));
      H.malla(H.fusionar(puerta, { nombre: 'puerta' }), metal, { pos: [0, 0, -29.5] });
      H.portal({ destino: 5, pos: [0, 0, -27.9], etiqueta: 'Entrar', color: '#aefcf0', velo: '#000000', ancho: 4.6, alto: 7, radio: 1.8 });

      // 4 · OTRAS TORRES a lo lejos (siluetas con ventanas encendidas) ───
      H.seccion('4 · Otras torres a lo lejos');
      const lejanas = [];
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2 + H.azar(-0.2, 0.2), r = H.azar(150, 260);
        const an = H.azar(14, 36), al = H.azar(140, 380);
        lejanas.push(H.geo.caja({ ancho: an, alto: al, fondo: an * H.azar(0.6, 1.2), pos: [Math.cos(a) * r, al / 2, Math.sin(a) * r - 40] }));
      }
      H.malla(H.fusionar(lejanas, { nombre: 'torres lejanas' }), H.mat({ textura: 'ventanas', repetir: [3, 30], mapaEmisivo: true, emisivo: '#9ff5e0', brillo: 1.2, color: '#3a4644', rugosidad: 0.9 }));

      // 5 · NUBES (dos capas que se mueven) y CENIZA ─────────────────────
      H.seccion('5 · Nubes');
      const capas = [A.alturaNubes, A.alturaNubes - 35].map((y, k) =>
        H.plano({ ancho: 900, alto: 900, rot: [90, 0, 0], pos: [0, y, -40], textura: 'nubes', repetir: [3, 3], color: '#8a9a94', transparente: true, opacidad: k ? 0.55 : 0.9, doble: true }));
      H.animar((t, dt) => { capas.forEach((c, k) => { c.material.map.offset.x += dt * (0.004 + k * 0.003); }); });
      H.particulas({ cantidad: 500, centro: [0, 8, 0], area: [50, 18, 55], color: '#a9b2ae', tamano: 0.07, velocidad: [0.35, -0.45, 0.1], vaiven: 0.25, opacidad: 0.75, aditivo: false });
    },
  });
})();
