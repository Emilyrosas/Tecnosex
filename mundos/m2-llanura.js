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
    // maquetas de referencia (cámbialas por modelos .glb cuando los tengas)
    torres: [[-80, 22], [-54, 14], [-29, 6], [-6, -1], [18, -8], [42, -16], [68, -24]],   // alta tensión
    torreCercana: 3,             // de cuál torre salen los cables que llegan a la entidad
    monitores: [24, 15, 6, -3, -12, -21],   // z de cada monitor junto al sendero
    capsula: [-9, 18],           // [x, z] de la cápsula rota (eco del Mundo 1)
    arco: -16,                   // z del arco de concreto sobre el sendero
    escalera: [-24, 13],         // [x, z] de la escalera a ninguna parte
    tanque: [27, 24],            // [x, z] del tanque de agua
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
      H.seccion('1 · Luces');
      H.luzHemisferio('#e8a08a', '#55683a', 1.7);
      H.luzAmbiente('#5a3040', 0.5);
      H.luzSol('#ffab70', 2.6, [0, 0.14, -1], { sombra: true, area: 45 });
      H.luzSol('#7a5aa8', 0.7, [0.6, 0.5, 1]);          // luz violeta del crepúsculo, por detrás

      // 2 · SUELO con colinas (un plano deformado punto por punto) ───────
      H.seccion('2 · Suelo con colinas');
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
      H.seccion('3 · Pasto que se mece');
      H.pasto({
        cantidad: A.pasto, centro: [0, -3], area: [66, 76], color: '#6f8c3a', alto: [0.25, 0.75], alturaSuelo,
        excluir: (x, z) => (sendero(x, z) < 1.3 && z > -27) || Math.hypot(x - ox, z - oz) < 6.5,
      });

      // 4 · ARQUITECTURA BRUTALISTA: columnas de concreto escalonadas ────
      H.seccion('4 · Arquitectura brutalista');
      const concreto = H.mat({ textura: 'concreto', repetir: [1, 2], color: '#a9a49c', rugosidad: 0.95 });
      function bloqueBrutalista(cx, cz, giro, escala) {
        const piezas = [];
        for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
          const alto = (1.5 + Math.abs(Math.sin(i * 1.7 + j * 2.3)) * 8 + H.azar(0, 2)) * escala;
          piezas.push(H.geo.caja({ ancho: H.azar(1.3, 2.1), alto, fondo: H.azar(1.3, 2.1), pos: [i * 1.9 - 3.8, alto / 2, j * 1.9 - 2.85] }));
        }
        for (let k = 0; k < 8; k++) piezas.push(H.geo.caja({ ancho: 1.4, alto: 0.25 + k * 0.25, fondo: 0.45, pos: [5.3, (0.25 + k * 0.25) / 2, 2.6 - k * 0.45] }));   // escalera
        H.malla(H.fusionar(piezas, { nombre: 'bloque brutalista' }), concreto, { pos: [cx, alturaSuelo(cx, cz) - 0.4, cz], rot: [0, giro, 0], solido: true });
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
        H.malla(H.fusionar(piezas, { nombre: 'edificio a medio caer' }), concreto, { pos: [cx, y0, cz] });
      })(19, -16);

      // 5 · FÁBRICAS LEJANAS (siluetas contra el atardecer) ──────────────
      H.seccion('5 · Fábricas lejanas');
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
      H.malla(H.fusionar(fabricas, { nombre: 'fabricas lejanas' }), H.mat({ color: '#3a2a2e', rugosidad: 1 }));
      if (chimeneas.length) H.particulas({ centros: chimeneas, cantidad: 140, area: [4, 14, 4], color: '#5a3e44', tamano: 6, velocidad: [0.7, 0.9, 0], opacidad: 0.22, aditivo: false });

      // 6 · LA COMPUTADORA VIEJA entre lápidas ───────────────────────────
      H.seccion('6 · La computadora vieja entre lápidas');
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
      H.malla(H.fusionar(hierro, { unir: true, nombre: 'mesa y silla de hierro' }), H.mat({ color: '#77706a', metal: 0.7, rugosidad: 0.5 }), { padre: rincon });
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
          ? H.fusionar([H.geo.caja({ ancho: 0.14, alto: al + 0.3, fondo: 0.14, pos: [0, (al + 0.3) / 2, 0] }), H.geo.caja({ ancho: 0.6, alto: 0.13, fondo: 0.13, pos: [0, al * 0.85, 0] })], { unir: true, nombre: 'cruz' })
          : H.fusionar([H.geo.caja({ ancho: an, alto: al, fondo: 0.18, pos: [0, al / 2, 0] }), H.geo.cilindro({ radio: an / 2, alto: 0.18, lados: 14, rot: [90, 0, 0], pos: [0, al, 0] })], { unir: true, nombre: 'lapida' });
        piedras.push(H.mover(pieza, { pos: [x, y - 0.1, z], rot: [H.azar(-9, 9), H.azar(-40, 40), H.azar(-9, 9)] }));
        H.solido(x, z, 0.7, 0.4);
      }
      if (piedras.length) H.malla(H.fusionar(piedras, { nombre: 'lapidas' }), H.mat({ textura: 'concreto', color: '#8d8c88', rugosidad: 1 }));

      // 7 · LA ENTIDAD y su plataforma ───────────────────────────────────
      H.seccion('7 · La entidad y su plataforma');
      const oy = alturaSuelo(ox, oz);
      H.cilindro({ radio: 5, alto: 1.2, lados: 40, pos: [ox, oy - 0.25, oz], mat: concreto });
      H.cilindro({ radio: 5.8, alto: 0.7, lados: 40, pos: [ox, oy - 0.4, oz], mat: concreto });
      H.solido(ox, oz, 9, 9);
      for (let k = 0; k < 6; k++) {                     // monolitos rotos alrededor
        const a = k / 6 * Math.PI * 2 + 0.3, al = H.azar(1.8, 4.5);
        H.caja({ ancho: 0.7, alto: al, fondo: 0.5, pos: [ox + Math.cos(a) * 7.5, alturaSuelo(ox + Math.cos(a) * 7.5, oz + Math.sin(a) * 7.5) + al / 2 - 0.2, oz + Math.sin(a) * 7.5], rot: [H.azar(-6, 6), -a * 57.3, H.azar(-5, 5)], mat: concreto, solido: true });
      }
      H.orbe({ pos: [ox, oy + A.alturaOrbe, oz], radio: 1.3, color: '#f6eee6', iris: '#ff3a5c', dialogo: 'deseo', distancia: 8, anillos: 2, cables: 26, luz: 14, aviso: 'La entidad te observa…' });

      // 8 · TORRES DE ALTA TENSIÓN cruzando el campo ──────────────────────
      H.seccion('8 · Torres de alta tensión cruzando el campo');
      // (los cables son el hilo que une todos los mundos)
      const torre = H.fusionar([
        ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => H.geo.caja({ ancho: 0.2, alto: 22.4, fondo: 0.2, pos: [sx, 11, sz], rot: [-sz * 3, 0, sx * 3] })),
        H.geo.caja({ ancho: 10, alto: 0.3, fondo: 0.3, pos: [0, 18, 0] }),
        H.geo.caja({ ancho: 8, alto: 0.3, fondo: 0.3, pos: [0, 14, 0] }),
        ...[4, 9].map(y => H.geo.caja({ ancho: 2.6, alto: 0.12, fondo: 0.12, pos: [0, y, 0.95], rot: [0, 0, 35] })),
        ...[4, 9].map(y => H.geo.caja({ ancho: 2.6, alto: 0.12, fondo: 0.12, pos: [0, y, -0.95], rot: [0, 0, -35] })),
        H.geo.cono({ radio: 0.7, alto: 3, lados: 4, pos: [0, 23.5, 0] }),
      ], { unir: true, nombre: 'torre de alta tension' });
      const puntosTorre = A.torres.map(([x, z]) => [x, alturaSuelo(x, z) - 0.2, z]);
      const giros = puntosTorre.map((p, i) => {
        const q = puntosTorre[Math.min(i + 1, puntosTorre.length - 1)], r = puntosTorre[Math.max(i - 1, 0)];
        return Math.atan2(q[0] - r[0], q[2] - r[2]);
      });
      H.instancias(torre, H.mat({ color: '#2c2226', metal: 0.6, rugosidad: 0.6 }), puntosTorre.map((p, i) => ({ pos: p, rot: [0, giros[i] * 57.3, 0] })));
      puntosTorre.forEach(([x, , z]) => H.solido(x, z, 2.6, 2.6));
      const brazo = (i, lx, ly) => { const [x, y, z] = puntosTorre[i], a = giros[i]; return [x + Math.cos(a) * lx, y + ly, z - Math.sin(a) * lx]; };
      const tendido = [];
      for (let i = 0; i < puntosTorre.length - 1; i++) for (const [lx, ly] of [[-4.9, 18], [4.9, 18], [-3.9, 14], [3.9, 14]]) {
        tendido.push(H.geo.cable({ desde: brazo(i, lx, ly), hasta: brazo(i + 1, lx, ly), caida: 2.6, radio: 0.035, segmentos: 16 }));
      }
      // cables gruesos que se arrastran desde la torre más cercana hasta la entidad
      const tc = puntosTorre[A.torreCercana];
      for (let k = 0; k < 3; k++) {
        const pts = [];
        for (let s = 0; s <= 8; s++) {
          const t = s / 8, x = tc[0] + (ox - 3 + k * 1.5 - tc[0]) * t + Math.sin(t * 9 + k) * 1.2, z = tc[2] + (oz + 5 - tc[2]) * t;
          pts.push([x, alturaSuelo(x, z) + 0.08, z]);
        }
        pts.unshift([tc[0], tc[1] + 6 - k, tc[2]]);
        tendido.push(H.geo.tubo({ puntos: pts, radio: 0.09, segmentos: 60, lados: 6 }));
      }
      H.malla(H.fusionar(tendido, { nombre: 'cables de alta tension' }), H.mat({ color: '#120c0e', metal: 0.5, rugosidad: 0.4 }));

      // 9 · CAMINO DE MONITORES: computadoras viejas en el pasto que guían
      H.seccion('9 · Camino de monitores');
      //     hacia la entidad (como las lámparas de la orilla, Mundo 6) ──────
      const centroSendero = z => -Math.sin(z * 0.15) * 1.2;
      A.monitores.forEach((z, i) => {
        const lado = i % 2 ? 1 : -1, x = centroSendero(z) + lado * 2.4;
        H.crt({ pos: [x, alturaSuelo(x, z) - 0.06, z], rot: [H.azar(-14, 4), -lado * 28 + H.azar(-10, 10), H.azar(-8, 8)], sonido: true });
        H.solido(x, z, 0.7, 0.7);
      });

      // 10 · POSTES DE LUZ: casi todos apagados; uno parpadea ─────────────
      H.seccion('10 · Postes de luz');
      const poste = H.fusionar([
        H.geo.cilindro({ radioArriba: 0.08, radioAbajo: 0.14, alto: 5.2, lados: 8, pos: [0, 2.6, 0] }),
        H.geo.caja({ ancho: 1.2, alto: 0.1, fondo: 0.12, pos: [0.55, 5.1, 0] }),
        H.geo.caja({ ancho: 0.5, alto: 0.14, fondo: 0.26, pos: [1.1, 5.0, 0] }),
      ], { unir: true, nombre: 'poste de luz' });
      const postes = [28, 17, 6, -6, -18].map((z, i) => {
        const lado = i % 2 ? -1 : 1, x = centroSendero(z) + lado * 3.4;
        H.solido(x, z, 0.5, 0.5);
        return { pos: [x, alturaSuelo(x, z) - 0.1, z], rot: [H.azar(-4, 4), lado > 0 ? 180 : 0, H.azar(-5, 3)] };
      });
      H.instancias(poste, H.mat({ textura: 'concreto', color: '#8f8a84', rugosidad: 0.95 }), postes);
      const cabeza = i => { const p = postes[i], s = p.rot[1] ? -1 : 1; return [p.pos[0] + s * 1.1, p.pos[1] + 4.85, p.pos[2]]; };
      H.brillo({ pos: cabeza(3), color: '#ffb877', tamano: 2.2, opacidad: 0.5 });
      const focoRoto = H.brillo({ pos: cabeza(1), color: '#ffb070', tamano: 2.8, opacidad: 0.7 });
      const luzRota = H.luzPunto('#ffb070', 6, 12, cabeza(1));
      H.sonido({ pos: cabeza(1), tipo: 'chisporroteo', radio: 7, volumen: 0.35 });
      let apagon = 0;
      H.animar((t, dt) => {
        apagon -= dt;
        if (apagon < 0 && Math.random() < 0.02) apagon = H.azar(0.05, 0.6);
        const on = apagon > 0 ? Math.random() < 0.3 : true;
        luzRota.intensity = on ? 6 : 0.2; focoRoto.material.opacity = on ? 0.7 : 0.05;
      });

      // 11 · LA CÁPSULA ROTA (eco del Mundo 1) tirada en el pasto ─────────
      H.seccion('11 · La cápsula rota');
      const [kx, kz] = A.capsula, ky = alturaSuelo(kx, kz);
      const capsula = H.grupo({ pos: [kx, ky + 0.55, kz], rot: [0, 30, 84] });
      H.cilindro({ padre: capsula, radio: 0.72, alto: 2.45, lados: 24, abierto: true, color: '#9ff2e4', transparente: true, opacidad: 0.2, doble: true, rugosidad: 0.05, reflejo: 2 });
      for (const y of [-1.35, 1.35]) H.cilindro({ padre: capsula, radio: 0.8, alto: 0.35, lados: 20, pos: [0, y, 0], color: '#20292a', metal: 0.8, rugosidad: 0.35 });
      H.toro({ padre: capsula, radio: 0.78, grosor: 0.025, rot: [90, 0, 0], pos: [0, 1.15, 0], basico: true, color: '#ff2a74' });
      H.circulo({ radio: 1.6, rot: [-90, 0, 0], pos: [kx + 1.2, ky + 0.04, kz + 0.6], esc: [1.4, 1, 1], color: '#ff2f7a', emisivo: '#ff2f7a', brillo: 0.6, transparente: true, opacidad: 0.55, rugosidad: 0.1 });
      H.malla(H.cuerpo('feto'), H.mat({ color: '#ffc9cf', emisivo: '#ff5c8a', brillo: 0.2, rugosidad: 0.6 }), { pos: [kx + 1.6, ky + 0.02, kz + 1.1], rot: [-80, 140, 0], esc: 0.85 });
      H.brillo({ pos: [kx + 1.2, ky + 0.4, kz + 0.6], color: '#ff3a8a', tamano: 3, opacidad: 0.35 });
      const mangueras = [0, 1, 2].map(k => H.geo.tubo({ puntos: [[kx, ky + 0.6, kz], [kx - 1.5, ky + 0.1, kz - 1 - k], [kx - 4, alturaSuelo(kx - 4, kz - 3) + 0.05, kz - 2 - k * 1.5], [kx - 7, alturaSuelo(kx - 7, kz - 6) + 0.05, kz - 4 - k]], radio: 0.04 }));
      H.malla(H.fusionar(mangueras, { nombre: 'mangueras' }), H.mat({ color: '#0d0f10', metal: 0.5, rugosidad: 0.4 }));
      H.solido(kx, kz, 2.6, 2.6);

      // 12 · MÁS RUINAS: arco sobre el sendero, escalera a ninguna parte,
      H.seccion('12 · Más ruinas');
      //      tanque de agua ──────────────────────────────────────────────
      const zA = A.arco, xA = centroSendero(zA), yA = alturaSuelo(xA, zA) - 0.3;
      const arco = [];
      for (const s of [-1, 1]) { arco.push(H.geo.caja({ ancho: 1.3, alto: 8, fondo: 1.3, pos: [s * 2.8, 4, 0] })); H.solido(xA + s * 2.8, zA, 1.4, 1.4); }
      arco.push(H.geo.caja({ ancho: 7.6, alto: 1.4, fondo: 1.5, pos: [0, 8.4, 0] }));
      arco.push(H.geo.caja({ ancho: 2.2, alto: 1.1, fondo: 1.2, pos: [2.6, 0.4, 2.2], rot: [8, 30, -12] }));   // pedazo caído
      H.malla(H.fusionar(arco, { nombre: 'arco' }), concreto, { pos: [xA, yA, zA] });

      const escalera = [];
      for (let k = 0; k < 14; k++) escalera.push(H.geo.caja({ ancho: 1.6, alto: 0.36 * (k + 1), fondo: 0.5, pos: [0, 0.18 * (k + 1), -k * 0.5] }));
      escalera.push(H.geo.caja({ ancho: 0.3, alto: 5.4, fondo: 7, pos: [0.95, 2.7, -3.25] }));
      H.malla(H.fusionar(escalera, { unir: true, nombre: 'escalera a ninguna parte' }), concreto, { pos: [A.escalera[0], alturaSuelo(A.escalera[0], A.escalera[1]) - 0.2, A.escalera[1]], rot: [0, 15, 0] });
      H.solido(A.escalera[0] - 0.9, A.escalera[1] - 3.3, 2.6, 7.4);

      const [wx, wz] = A.tanque, wy = alturaSuelo(wx, wz) - 0.2;
      const tanque = [];
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tanque.push(H.geo.cilindro({ radio: 0.18, alto: 11, lados: 6, pos: [sx * 1.6, 5.5, sz * 1.6] }));
      tanque.push(H.geo.cilindro({ radio: 3, alto: 3.6, lados: 20, pos: [0, 12.8, 0] }), H.geo.cono({ radio: 3.2, alto: 1.4, lados: 20, pos: [0, 15.3, 0] }));
      for (const y of [3.5, 7.5]) tanque.push(H.geo.toro({ radio: 2.26, grosor: 0.07, lados: 4, ladosTubo: 4, rot: [90, 45, 0], pos: [0, y, 0] }));
      H.malla(H.fusionar(tanque, { unir: true, nombre: 'tanque de agua' }), H.mat({ color: '#5a4a48', metal: 0.5, rugosidad: 0.7, textura: 'metal', repetir: [2, 2] }), { pos: [wx, wy, wz] });
      H.solido(wx, wz, 4, 4);

      // 13 · CERCA ROTA detrás del punto de partida ──────────────────────
      H.seccion('13 · Cerca rota detrás del punto de partida');
      const postesCerca = [], alambre = [];
      for (const [x0, z0, x1, z1] of [[-31, 31, -6, 33.5], [6, 33.5, 31, 29]]) {
        const n = 11, prev = [];
        for (let k = 0; k <= n; k++) {
          const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n, y = alturaSuelo(x, z);
          if (H.azar() < 0.15) { prev.length = 0; continue; }                        // poste que falta
          postesCerca.push({ pos: [x, y + 0.6, z], rot: [H.azar(-10, 10), 0, H.azar(-10, 10)] });
          if (prev.length) for (const h of [0.5, 1.0]) alambre.push(H.geo.cable({ desde: [prev[0], prev[1] + h, prev[2]], hasta: [x, y + h, z], caida: 0.15, radio: 0.008, segmentos: 6 }));
          prev.splice(0, 3, x, y, z);
        }
      }
      H.instancias(H.geo.cilindro({ radio: 0.06, alto: 1.3, lados: 5, nombre: 'poste de cerca' }), H.mat({ color: '#3a2c24', rugosidad: 1 }), postesCerca);
      if (alambre.length) H.malla(H.fusionar(alambre, { nombre: 'alambres' }), H.mat({ color: '#2a2422', metal: 0.6 }));

      // 14 · ATMÓSFERA: niebla baja, rayos de sol, cuervos, luciérnagas ──
      H.seccion('14 · Atmósfera');
      H.nieblaBaja({ centro: [0, 0.4, -4], area: [110, 110], capas: 3, color: '#e89a72', opacidad: 0.2 });
      H.rayos({ pos: [0, 16, -95], color: '#ffb27a', cantidad: 7, largo: 80, ancho: 6, opacidad: 0.06, abanico: 1.4 });
      H.bandada({ centro: [8, 24, -38], radio: 18, cantidad: 14, tamano: 0.7, velocidad: 0.1 });
      H.bandada({ centro: [24, 20, -17], radio: 6, cantidad: 6, tamano: 0.6, velocidad: 0.25 });
      H.particulas({ cantidad: 160, centro: [0, 0.9, 0], area: [60, 1.6, 70], color: '#ffd27a', tamano: 0.08, velocidad: [0, 0.02, 0], vaiven: 0.35, opacidad: 0.9 });

      // 15 · SONIDOS EN LUGARES (más fuertes al acercarte) ───────────────
      H.seccion('15 · Sonidos en lugares');
      H.sonido({ pos: [ox, oy + A.alturaOrbe, oz], tipo: 'zumbido', radio: 24, volumen: 0.9 });   // la entidad vibra
      H.sonido({ pos: [cx, cy + 1, cz], tipo: 'estatica', radio: 6, volumen: 0.6 });                // la computadora vieja

      // 16 · POLVO DORADO en el aire ─────────────────────────────────────
      H.seccion('16 · Polvo dorado en el aire');
      H.particulas({ cantidad: 320, centro: [0, 3, 0], area: [64, 6, 72], color: '#ffc28a', tamano: 0.06, velocidad: [0.25, 0.04, 0], opacidad: 0.6 });
    },
  });
})();
