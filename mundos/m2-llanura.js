/* ==========================================================================
   MUNDO 2 · LA LLANURA
   --------------------------------------------------------------------------
   Campo abierto con pasto y colinas verdes. Atardecer rojo, opresivo y bello.
   Arquitectura brutalista abandonada, fábricas a lo lejos, una computadora
   vieja sobre una mesa de hierro entre lápidas.
   Al final del campo flota LA ENTIDAD: un ojo que te sigue con la mirada.
   Al acercarte pregunta "¿Qué deseas?" y te deja elegir entre dos caminos
   (el diálogo "deseo" en config.js):
       · Fundirme con la máquina → Mundo 3
       · Volver a sentir         → Mundo 6
   ========================================================================== */
(function () {
  const THREE = AFRAME.THREE;

  const A = {
    pasto: 9000,                 // hojas de pasto (con calidad Alta)
    colorPasto: '#5f7d34',
    colorTierra: '#4a3b2a',
    orbe: [0, -31],              // [x, z] donde flota la entidad
    alturaOrbe: 4.4,             // metros sobre el suelo
    lapidas: 10,
    computadora: [6, 12],        // [x, z] de la mesa con la computadora vieja
  };

  // La forma del terreno: ondas suaves + colinas que crecen lejos del centro.
  // El jugador camina SOBRE esta función (ver alturaSuelo más abajo).
  function alturaSuelo(x, z) {
    const r = Math.hypot(x, z + 2);
    const ondas = Math.sin(x * 0.13) * Math.cos(z * 0.11) * 0.45 + Math.sin(x * 0.05 + z * 0.07) * 0.6;
    const colinas = TECNO.H.suave(30, 75, r) * (7 + 4 * Math.sin(Math.atan2(z, x) * 3 + 1.3) + 3 * Math.sin(x * 0.06) * Math.cos(z * 0.045));
    const plano = 1 - TECNO.H.suave(0, 8, Math.hypot(x - A.orbe[0], z - A.orbe[1]));   // aplanado bajo la entidad
    return (ondas + colinas) * (1 - plano * 0.9);
  }
  // el sendero de tierra que lleva hasta la entidad
  const sendero = (x, z) => Math.abs(x + Math.sin(z * 0.15) * 1.2);

  TECNO.registrarMundo({
    id: 2,
    cielo: { arriba: '#21142a', horizonte: '#e0663f', abajo: '#3a1c1b', sol: { color: '#ff9a5c', alto: 7, giro: 0, tamano: 1.2 } },
    niebla: { color: '#b4563d', densidad: 0.014 },
    exposicion: 1.15,
    reflejos: 0.6,
    inicio: { pos: [0, 0, 30], mirar: 0 },
    limites: { minX: -32, maxX: 32, minZ: -40, maxZ: 34 },
    alturaSuelo,

    construir(H) {
      const [ox, oz] = A.orbe;

      // 1 · LUCES: el sol bajo detrás de la entidad ──────────────────────
      H.luzHemisferio('#e8a08a', '#55683a', 1.7);
      H.luzAmbiente('#5a3040', 0.5);
      H.luzSol('#ffab70', 2.6, [0, 0.14, -1], { sombra: true, area: 45 });

      // 2 · SUELO con colinas (un plano deformado punto por punto) ───────
      const seg = Math.max(40, Math.round(120 * Math.sqrt(H.densidad())));
      const suelo = H.geo.plano({ ancho: 260, alto: 260, divX: seg, divY: seg, rot: [-90, 0, 0] });
      const p = suelo.attributes.position, colores = [];
      const verde = new THREE.Color(A.colorPasto), seco = new THREE.Color('#8a7a3a'), tierra = new THREE.Color(A.colorTierra), c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        p.setY(i, alturaSuelo(x, z));
        c.copy(verde).lerp(seco, THREE.MathUtils.clamp(Math.sin(x * 0.21 + z * 0.17) * 0.5 + 0.3, 0, 1));
        if (z > -27 && z < 33) c.lerp(tierra, Math.max(0, 1 - sendero(x, z) / 1.6) * 0.85);
        colores.push(c.r, c.g, c.b);
      }
      suelo.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
      suelo.computeVertexNormals();
      H.malla(suelo, H.mat({ colores: true, textura: 'pasto', repetir: [60, 60], rugosidad: 1 }));

      // 3 · PASTO que se mece ────────────────────────────────────────────
      H.pasto({
        cantidad: A.pasto, centro: [0, -3], area: [66, 76], color: '#6f8c3a', alto: [0.25, 0.75], alturaSuelo,
        excluir: (x, z) => (sendero(x, z) < 1.3 && z > -27) || Math.hypot(x - ox, z - oz) < 6.5,
      });

      // 4 · ARQUITECTURA BRUTALISTA: columnas de concreto escalonadas ────
      const concreto = H.mat({ textura: 'concreto', repetir: [1, 2], color: '#a9a49c', rugosidad: 0.95 });
      function bloqueBrutalista(cx, cz, giro, escala) {
        const piezas = [];
        for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
          const alto = (1.5 + Math.abs(Math.sin(i * 1.7 + j * 2.3)) * 8 + H.azar(0, 2)) * escala;
          piezas.push(H.geo.caja({ ancho: H.azar(1.3, 2.1), alto, fondo: H.azar(1.3, 2.1), pos: [i * 1.9 - 3.8, alto / 2, j * 1.9 - 2.85] }));
        }
        for (let k = 0; k < 8; k++) piezas.push(H.geo.caja({ ancho: 1.4, alto: 0.25 + k * 0.25, fondo: 0.45, pos: [5.3, (0.25 + k * 0.25) / 2, 2.6 - k * 0.45] }));   // escalera
        H.malla(H.fusionar(piezas), concreto, { pos: [cx, alturaSuelo(cx, cz) - 0.4, cz], rot: [0, giro, 0], solido: true });
      }
      bloqueBrutalista(-17, -6, 20, 1);
      bloqueBrutalista(22, 10, -35, 0.7);

      // esqueleto de un edificio a medio caer
      (function esqueleto(cx, cz) {
        const piezas = [], W = 10, D = 7, P = 4.2, y0 = alturaSuelo(cx, cz) - 0.2;
        for (let pi = 0; pi < 2; pi++) for (const x of [-W / 2, 0, W / 2]) for (const z of [-D / 2, D / 2]) {
          piezas.push(H.geo.caja({ ancho: 0.5, alto: P, fondo: 0.5, pos: [x, pi * P + P / 2, z] }));
          if (pi === 0) H.solido(cx + x, cz + z, 0.6, 0.6);
        }
        piezas.push(H.geo.caja({ ancho: W + 0.6, alto: 0.35, fondo: D + 0.6, pos: [0, P, 0] }));
        piezas.push(H.geo.caja({ ancho: W * 0.6, alto: 0.35, fondo: D + 0.6, pos: [-W * 0.2, 2 * P - 0.6, 0], rot: [0, 0, -9] }));   // losa que se cae
        piezas.push(H.geo.caja({ ancho: 0.3, alto: P * 0.7, fondo: D, pos: [W / 2, P * 0.35, 0] }));                                // muro roto
        piezas.push(H.geo.cilindro({ radioArriba: 0.7, radioAbajo: 1, alto: 18, lados: 12, pos: [W / 2 + 2.5, 9, -1] }));             // chimenea
        H.solido(cx + W / 2 + 2.5, cz - 1, 2, 2);
        H.malla(H.fusionar(piezas), concreto, { pos: [cx, y0, cz] });
      })(19, -16);

      // 5 · FÁBRICAS LEJANAS (siluetas contra el atardecer) ──────────────
      const fabricas = [], chimeneas = [];
      for (let i = 0; i < 9; i++) {
        const x = -110 + i * 27 + H.azar(-8, 8), z = -82 + H.azar(-12, 6), an = H.azar(10, 22), al = H.azar(6, 16), fo = H.azar(8, 16);
        const y = alturaSuelo(x, z) - 1;
        fabricas.push(H.geo.caja({ ancho: an, alto: al, fondo: fo, pos: [x, y + al / 2, z] }));
        for (let k = 0; k < H.azarEntero(0, 2); k++) {
          const ch = H.azar(18, 34), cx = x + H.azar(-an / 3, an / 3);
          fabricas.push(H.geo.cilindro({ radioArriba: 0.8, radioAbajo: 1.3, alto: ch, lados: 10, pos: [cx, y + ch / 2, z] }));
          chimeneas.push([cx, y + ch + 7, z]);
        }
      }
      H.malla(H.fusionar(fabricas), H.mat({ color: '#3a2a2e', rugosidad: 1 }));
      if (chimeneas.length) H.particulas({ centros: chimeneas, cantidad: 140, area: [4, 14, 4], color: '#5a3e44', tamano: 6, velocidad: [0.7, 0.9, 0], opacidad: 0.22, aditivo: false });

      // 6 · LA COMPUTADORA VIEJA entre lápidas ───────────────────────────
      const [cx, cz] = A.computadora, cy = alturaSuelo(cx, cz);
      const rincon = H.grupo({ pos: [cx, cy, cz], rot: [0, -37, 0] });       // gira todo el rincón junto
      const hierro = [];
      hierro.push(H.geo.caja({ ancho: 1.1, alto: 0.04, fondo: 0.6, pos: [0, 0.75, 0] }));
      for (const [x, z] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) hierro.push(H.geo.cilindro({ radio: 0.018, alto: 0.75, lados: 6, pos: [x, 0.375, z] }));
      for (let k = 0; k < 4; k++) hierro.push(H.geo.toro({ radio: 0.12, grosor: 0.012, arco: 270, lados: 16, ladosTubo: 4, pos: [-0.5 + k * 0.33, 0.55, 0.27], rot: [0, 0, k * 90] }));
      // la silla de hierro forjado
      for (const [x, z] of [[-0.22, 0.55], [0.22, 0.55], [-0.22, 0.98], [0.22, 0.98]]) hierro.push(H.geo.cilindro({ radio: 0.015, alto: 0.45, lados: 6, pos: [x, 0.225, z] }));
      hierro.push(H.geo.toro({ radio: 0.25, grosor: 0.015, arco: 180, lados: 16, ladosTubo: 4, pos: [0, 0.85, 1.0] }));
      for (const x of [-0.22, 0.22]) hierro.push(H.geo.cilindro({ radio: 0.015, alto: 0.42, lados: 6, pos: [x, 0.66, 1.0] }));
      for (let k = 0; k < 3; k++) hierro.push(H.geo.toro({ radio: 0.07, grosor: 0.01, lados: 12, ladosTubo: 4, pos: [-0.1 + k * 0.1, 0.72, 1.0] }));
      H.malla(H.fusionar(hierro), H.mat({ color: '#77706a', metal: 0.7, rugosidad: 0.5 }), { padre: rincon });
      H.caja({ padre: rincon, ancho: 0.5, alto: 0.06, fondo: 0.48, pos: [0, 0.46, 0.76], color: '#c9c3d6', rugosidad: 1 });            // cojín
      // el monitor CRT
      const beige = H.mat({ color: '#b9b09c', rugosidad: 0.7 });
      H.caja({ padre: rincon, ancho: 0.55, alto: 0.45, fondo: 0.42, pos: [0, 1.02, -0.02], mat: beige });
      H.caja({ padre: rincon, ancho: 0.4, alto: 0.32, fondo: 0.25, pos: [0, 1.0, -0.33], mat: beige });
      H.caja({ padre: rincon, ancho: 0.6, alto: 0.06, fondo: 0.45, pos: [0, 0.8, -0.05], mat: beige });
      H.caja({ padre: rincon, ancho: 0.5, alto: 0.03, fondo: 0.17, pos: [0, 0.785, 0.21], color: '#c8c0ae' });
      H.plano({ padre: rincon, ancho: 0.44, alto: 0.33, pos: [0, 1.03, 0.195], basico: true, textura: H.texPantalla('#bfe8ff'), color: '#a9bcc4' });
      H.brillo({ padre: rincon, pos: [0, 1.03, 0.45], color: '#a9d6ff', tamano: 1.3, opacidad: 0.3 });
      H.solido(cx, cz, 1.5, 1.5);

      // lápidas y cruces alrededor
      const piedras = [];
      for (let i = 0; i < A.lapidas; i++) {
        const x = cx + H.azar(-1, 8), z = cz + H.azar(-7, 4);
        if (Math.hypot(x - cx, z - cz) < 1.8 || sendero(x, z) < 1.5) continue;
        const y = alturaSuelo(x, z), al = H.azar(0.6, 1.4), an = H.azar(0.4, 0.7);
        const pieza = H.azar() < 0.35
          ? H.fusionar([H.geo.caja({ ancho: 0.14, alto: al + 0.3, fondo: 0.14, pos: [0, (al + 0.3) / 2, 0] }), H.geo.caja({ ancho: 0.6, alto: 0.13, fondo: 0.13, pos: [0, al * 0.85, 0] })])
          : H.fusionar([H.geo.caja({ ancho: an, alto: al, fondo: 0.18, pos: [0, al / 2, 0] }), H.geo.cilindro({ radio: an / 2, alto: 0.18, lados: 14, rot: [90, 0, 0], pos: [0, al, 0] })]);
        piedras.push(H.mover(pieza, { pos: [x, y - 0.1, z], rot: [H.azar(-9, 9), H.azar(-40, 40), H.azar(-9, 9)] }));
        H.solido(x, z, 0.7, 0.4);
      }
      if (piedras.length) H.malla(H.fusionar(piedras), H.mat({ textura: 'concreto', color: '#8d8c88', rugosidad: 1 }));

      // 7 · LA ENTIDAD y su plataforma ───────────────────────────────────
      const oy = alturaSuelo(ox, oz);
      H.cilindro({ radio: 5, alto: 1.2, lados: 40, pos: [ox, oy - 0.25, oz], mat: concreto });
      H.cilindro({ radio: 5.8, alto: 0.7, lados: 40, pos: [ox, oy - 0.4, oz], mat: concreto });
      H.solido(ox, oz, 9, 9);
      for (let k = 0; k < 6; k++) {                     // monolitos rotos alrededor
        const a = k / 6 * Math.PI * 2 + 0.3, al = H.azar(1.8, 4.5);
        H.caja({ ancho: 0.7, alto: al, fondo: 0.5, pos: [ox + Math.cos(a) * 7.5, alturaSuelo(ox + Math.cos(a) * 7.5, oz + Math.sin(a) * 7.5) + al / 2 - 0.2, oz + Math.sin(a) * 7.5], rot: [H.azar(-6, 6), -a * 57.3, H.azar(-5, 5)], mat: concreto, solido: true });
      }
      H.orbe({ pos: [ox, oy + A.alturaOrbe, oz], radio: 1.3, color: '#f6eee6', iris: '#ff3a5c', dialogo: 'deseo', distancia: 8, anillos: 2, cables: 26, luz: 14, aviso: 'La entidad te observa…' });

      // 8 · POLVO DORADO en el aire ──────────────────────────────────────
      H.particulas({ cantidad: 320, centro: [0, 3, 0], area: [64, 6, 72], color: '#ffc28a', tamano: 0.06, velocidad: [0.25, 0.04, 0], opacidad: 0.6 });
    },
  });
})();
