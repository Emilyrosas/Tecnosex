/* ==========================================================================
   MUNDO 7 · LAS RUINAS                (camino 2, final)
   --------------------------------------------------------------------------
   Dentro del edificio en ruinas junto al mar. Muros de concreto rotos, medio
   techo caído, pasto creciendo entre las grietas, una cama vieja, una cortina
   que se mueve con el viento y lámparas encendidas en el piso, como si
   alguien fuera a volver. Por los ventanales entra el atardecer.
   Quedan los muebles de quien vivió aquí (sofá, mesa, librero, cuadros, una
   tele encendida), guirnaldas de luces, enredaderas, y afuera un faro gira.
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
    // maquetas de referencia (cámbialas por modelos .glb cuando los tengas)
    sofa: [0.2, 0, -6],              // [x, y, z] mirando al ventanal
    mesa: [5.4, -5.2],               // [x, z]
    librero: [7.45, 10.7],
    cuadros: [                       // en la pared derecha: [z, altura, ancho, alto, color]
      [-7.2, 2.1, 0.9, 0.7, '#d8a0b0'], [-1.6, 2.4, 0.5, 0.7, '#a0b8d8'], [1.4, 2.0, 1.2, 0.8, '#e8c8a0'], [2.9, 2.4, 0.6, 0.6, '#c0a0d8'],
    ],
    espejo: [-5.6, 0, -11.35],
    tele: [-2.6, -6.4],
    guirnaldas: [[7, 4.8, 0.9], [2.5, 5.0, 1.2], [-3.5, 4.4, 0.8]],   // [z, altura, cuánto cuelga]
    faro: [-150, -45],               // [x, z] del faro en el mar
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
      H.seccion('1 · Luces');
      H.luzHemisferio('#c08ac0', '#3a2520', 0.9);
      H.luzAmbiente('#40263a', 0.45);
      H.luzSol(A.colorSol, 3, [-1, 0.28, -0.15], { sombra: true, area: 18 });
      H.luzPunto('#ffc9a8', 4, 9, [-1, 1.2, 2]);

      // 2 · PISO Y MUROS ─────────────────────────────────────────────────
      H.seccion('2 · Piso y muros');
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
      H.malla(H.fusionar(muros, { nombre: 'muros y columnas' }), concreto);

      // charco que refleja el cielo
      H.circulo({ radio: 1.4, rot: [-90, 0, 0], pos: [-2.5, 0.01, -3.5], esc: [1.6, 1, 1], color: '#3a2a3c', metal: 1, rugosidad: 0.05, reflejo: 2 });

      // 3 · PASTO creciendo pegado a los muros ───────────────────────────
      H.seccion('3 · Pasto creciendo pegado a los muros');
      H.pasto({
        cantidad: 2600, area: [W - 0.6, L - 0.6], alto: [0.1, 0.45], color: '#6a8040',
        excluir: (x, z) => Math.min(x - x0, x1 - x, z - z0, z1 - z) > 1.6 && H.azar() < 0.85,
      });

      // 4 · LA CAMA vieja ─────────────────────────────────────────────────
      H.seccion('4 · La cama vieja');
      const cama = H.grupo({ pos: [5.6, 0, 8.6], rot: [0, -90, 0] });
      const fierro = [];
      for (const [x, z] of [[-0.48, -1], [0.48, -1], [-0.48, 1], [0.48, 1]]) fierro.push(H.geo.cilindro({ radio: 0.025, alto: z < 0 ? 1.1 : 0.7, lados: 6, pos: [x, z < 0 ? 0.55 : 0.35, z] }));
      fierro.push(H.geo.toro({ radio: 0.48, grosor: 0.02, arco: 180, lados: 20, ladosTubo: 4, pos: [0, 1.08, -1] }));
      for (let k = -2; k <= 2; k++) fierro.push(H.geo.cilindro({ radio: 0.012, alto: 0.6, lados: 4, pos: [k * 0.18, 0.75, -1] }));
      H.malla(H.fusionar(fierro, { unir: true, nombre: 'cabecera de fierro' }), H.mat({ color: '#4d4448', metal: 0.7, rugosidad: 0.5 }), { padre: cama });
      H.caja({ padre: cama, ancho: 0.95, alto: 0.2, fondo: 1.95, pos: [0, 0.42, 0], color: '#d9cfc4', rugosidad: 1 });
      H.caja({ padre: cama, ancho: 0.9, alto: 0.06, fondo: 1.2, pos: [0.05, 0.55, 0.3], rot: [0, 6, 2], color: '#c79aa8', rugosidad: 1 });   // cobija
      H.solido(5.6, 8.6, 2.1, 1.1);

      // 5 · LÁMPARAS encendidas (algunas caídas) ─────────────────────────
      H.seccion('5 · Lámparas encendidas');
      const lamparas = A.lamparas.map(([x, z, color, forma, caida]) => {
        H.solido(x, z, 0.4, 0.4);
        return H.lampara({ pos: [x, caida ? 0.12 : 0, z], rot: caida ? [0, H.azar(0, 360), 82] : [0, 0, 0], color, forma, alto: H.azar(0.7, 1.15) });
      });
      H.animar(t => lamparas.forEach((l, i) => { l.userData.brillo.material.opacity = 0.5 + Math.sin(t * 2 + i * 1.7) * 0.05 + (Math.random() < 0.01 ? -0.3 : 0); }));

      // 6 · LA CORTINA que se mueve con el viento ────────────────────────
      H.seccion('6 · La cortina que se mueve con el viento');
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
      H.seccion('7 · Afuera');
      H.plano({ ancho: 400, alto: 400, rot: [-90, 0, 0], pos: [-200, -2.6, 0], color: '#2c1d38', metal: 0.9, rugosidad: 0.15, reflejo: 1.8 });
      H.plano({ ancho: 14, alto: 400, rot: [-90, 0, 0], pos: [x0 - 7, -1.4, 0], textura: 'arena', repetir: [4, 100], color: '#c9a0a0' });
      H.plano({ ancho: 8, alto: 200, rot: [-90, 90, 0], pos: [-120, -2.5, 0], textura: 'reflejo', repetir: [1, 4], aditivo: true, color: '#ffc49a', opacidad: 0.4 });

      // sin sombras reales: manchas de luz falsas bajo los ventanales
      if (!H.sombras()) ventanales.forEach(v => H.plano({ ancho: 4.5, alto: 3.2, rot: [-90, 0, 0], pos: [x0 + 2.8, 0.02, z1 - v.centro], aditivo: true, textura: 'brillo', color: '#ffb48a', opacidad: 0.4 }));

      // 8 · RAYOS DE SOL entrando por los ventanales ─────────────────────
      H.seccion('8 · Rayos de sol entrando por los ventanales');
      const dSol = new THREE.Vector3(-1, 0.28, -0.15).normalize().negate();    // hacia dónde viaja la luz
      const ejeX = new THREE.Vector3(0, 0, 1).addScaledVector(dSol, -dSol.z).normalize();
      const giroRayo = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(ejeX, new THREE.Vector3().crossVectors(dSol, ejeX), dSol));
      const matRayo = H.mat({ aditivo: true, color: '#ffb48a', opacidad: 0.06, doble: true });
      ventanales.forEach(v => {
        const largo = 10, rayo = H.caja({ ancho: v.ancho * 0.95, alto: v.alto * 0.9, fondo: largo, mat: matRayo });
        H.pieza(rayo).position.set(x0, v.base + v.alto / 2, z1 - v.centro).addScaledVector(dSol, largo / 2);
        H.pieza(rayo).quaternion.copy(giroRayo);
      });

      // 9 · LA CASA QUE QUEDÓ: sofá, mesa, sillas, librero, cuadros, espejo
      H.seccion('9 · La casa que quedó');
      //     (maquetas de cajas: se cambiarán por modelos al final) ─────────
      const tapiz = H.mat({ color: '#b98c96', rugosidad: 1 }), madera = H.mat({ color: '#6a4a3e', rugosidad: 0.8 });
      // sofá mirando al mar
      const sofa = H.grupo({ pos: A.sofa, rot: [0, -90, 0] });
      H.caja({ padre: sofa, ancho: 2.1, alto: 0.42, fondo: 0.9, pos: [0, 0.3, 0], mat: tapiz });
      H.caja({ padre: sofa, ancho: 2.1, alto: 0.6, fondo: 0.22, pos: [0, 0.75, -0.36], rot: [-8, 0, 0], mat: tapiz });
      for (const s of [-1, 1]) H.caja({ padre: sofa, ancho: 0.22, alto: 0.6, fondo: 0.9, pos: [s * 1.05, 0.5, 0], mat: tapiz });
      H.caja({ padre: sofa, ancho: 0.5, alto: 0.12, fondo: 0.4, pos: [0.45, 0.58, 0.05], rot: [0, 20, 8], color: '#e8d6c0', rugosidad: 1 });   // cojín
      H.solido(A.sofa[0], A.sofa[2], 1.1, 2.3);
      // mesa redonda y dos sillas (una caída)
      const [mx, mz] = A.mesa;
      const mesa = H.fusionar([H.geo.cilindro({ radio: 0.6, alto: 0.05, lados: 24, pos: [0, 0.74, 0] }), H.geo.cilindro({ radio: 0.05, alto: 0.72, lados: 8, pos: [0, 0.36, 0] }), H.geo.cilindro({ radio: 0.3, alto: 0.04, lados: 16, pos: [0, 0.02, 0] })], { unir: true, nombre: 'mesa' });
      H.malla(mesa, madera, { pos: [mx, 0, mz] });
      const silla = H.fusionar([
        H.geo.caja({ ancho: 0.45, alto: 0.05, fondo: 0.45, pos: [0, 0.45, 0] }),
        ...[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z]) => H.geo.caja({ ancho: 0.04, alto: 0.45, fondo: 0.04, pos: [x, 0.225, z] })),
        H.geo.caja({ ancho: 0.45, alto: 0.45, fondo: 0.04, pos: [0, 0.7, -0.21] }),
      ], { unir: true, nombre: 'silla' });
      H.instancias(silla, madera, [{ pos: [mx, 0, mz + 0.9], rot: [0, 180, 0] }, { pos: [mx + 1.1, 0.22, mz - 0.6], rot: [0, 60, 90] }]);
      H.solido(mx, mz, 1.4, 1.4);
      H.cilindro({ radio: 0.05, alto: 0.2, lados: 8, pos: [mx - 0.2, 0.86, mz], color: '#cfe4e0', transparente: true, opacidad: 0.5, rugosidad: 0.05 });   // un vaso
      // librero con libros (algunos en el piso)
      const [lx, lz] = A.librero;
      const repisa = [H.geo.caja({ ancho: 0.4, alto: 2, fondo: 1.3, pos: [0, 1, 0] })];
      for (let k = 0; k < 4; k++) repisa.push(H.geo.caja({ ancho: 0.42, alto: 0.04, fondo: 1.3, pos: [-0.02, 0.3 + k * 0.48, 0] }));
      H.malla(H.fusionar(repisa, { unir: true, nombre: 'librero' }), madera, { pos: [lx, 0, lz] });
      const libros = [];
      for (let k = 0; k < 4; k++) for (let b = 0; b < 9; b++) if (H.azar() < 0.7) libros.push({ pos: [lx - 0.12, 0.32 + k * 0.48 + 0.15, lz - 0.55 + b * 0.13], rot: [H.azar(-8, 8), 0, 0], esc: [0.28, H.azar(0.24, 0.34), 0.08], color: H.elegir(['#8a3a4a', '#3a4a6a', '#c8b89a', '#5a6a4a', '#d8a0b0']) });
      for (let b = 0; b < 12; b++) libros.push({ pos: [lx - H.azar(0.6, 2.2), 0.04, lz + H.azar(-1.2, 1.2)], rot: [90, H.azar(0, 360), 0], esc: [0.22, 0.3, 0.06], color: H.elegir(['#8a3a4a', '#3a4a6a', '#c8b89a', '#d8a0b0']) });
      H.instancias(H.geo.caja({ nombre: 'libro' }), H.mat({ color: '#ffffff', rugosidad: 0.9 }), libros);
      H.solido(lx, lz, 0.6, 1.4);
      // cuadros en la pared (uno caído) y fotos regadas
      const cuadros = A.cuadros.map(([z, y, an, al, color]) => ({ pos: [x1 - 0.27, y, z], rot: [0, -90, H.azar(-6, 6)], esc: [an, al, 1], color }));
      cuadros.push({ pos: [x1 - 0.6, 0.35, -1.9], rot: [-75, -90, 0], esc: [0.6, 0.8, 1], color: '#f0b8c8' });
      H.instancias(H.geo.caja({ ancho: 1, alto: 1, fondo: 0.04, nombre: 'cuadro' }), H.mat({ color: '#ffffff', emisivo: '#402028', brillo: 0.4, rugosidad: 0.6 }), cuadros);
      const fotos = [];
      for (let i = 0; i < 26; i++) fotos.push({ pos: [5.6 + H.azar(-1.6, 1.4), 0.008 + i * 0.0002, 8.6 + H.azar(-2.4, 2)], rot: [-90, H.azar(0, 360), 0], color: H.elegir(['#f4e8e0', '#e8c8d0', '#d0d8e8']) });
      H.instancias(H.geo.plano({ ancho: 0.15, alto: 0.1 }), H.mat({ color: '#ffffff', rugosidad: 1 }), fotos, { sinSombra: true, masa: true, nombre: 'fotos' });
      // espejo apoyado en la pared (refleja el atardecer)
      const espejo = H.grupo({ pos: A.espejo, rot: [-9, 12, 0] });
      H.caja({ padre: espejo, ancho: 1.1, alto: 1.9, fondo: 0.06, pos: [0, 0.95, 0], mat: madera });
      H.plano({ padre: espejo, ancho: 0.95, alto: 1.75, pos: [0, 0.95, 0.035], color: '#ffe6ee', metal: 1, rugosidad: 0.03, reflejo: 2.2 });
      H.solido(A.espejo[0], A.espejo[2], 1.2, 0.5);
      // una tele vieja en el piso, todavía encendida (eco de la fábrica y la llanura)
      H.caja({ ancho: 0.8, alto: 0.4, fondo: 0.5, pos: [A.tele[0], 0.2, A.tele[1]], mat: madera });
      H.crt({ pos: [A.tele[0], 0.4, A.tele[1]], rot: [0, 25, 0], color: '#ffc6dc', sonido: true });
      H.solido(A.tele[0], A.tele[1], 0.9, 0.7);
      // escalera que sube a un piso que ya no existe
      const escalones = [];
      for (let k = 0; k < 12; k++) escalones.push(H.geo.caja({ ancho: 0.4, alto: 0.25 * (k + 1), fondo: 1.1, pos: [3 + k * 0.4, 0.125 * (k + 1), 0] }));
      escalones.push(H.geo.caja({ ancho: 2.2, alto: 0.25, fondo: 1.6, pos: [7.4, 3, 0.2], rot: [0, 0, -12] }));
      H.malla(H.fusionar(escalones, { unir: true, nombre: 'escalera' }), concreto, { pos: [0, 0, z0 + 0.8] });
      H.solido(5.2, z0 + 0.8, 4.8, 1.2);

      // 10 · GUIRNALDAS DE LUCES cruzando el cuarto (los cables de luz
      H.seccion('10 · Guirnaldas de luces cruzando el cuarto');
      //      que unen todos los mundos, aquí cálidos y domésticos) ─────────
      const focos = [], halos = [], hilos = [];
      A.guirnaldas.forEach(([z, y, caida], g) => {
        const a = [x0 + 0.3, y, z + H.azar(-0.6, 0.6)], b = [x1 - 0.3, y - 0.3, z + H.azar(-0.6, 0.6)];
        hilos.push(H.geo.cable({ desde: a, hasta: b, caida, radio: 0.008, segmentos: 20 }));
        const n = 32;
        for (let k = 1; k < n; k++) {
          const t = k / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - caida * 4 * t * (1 - t) - 0.06, a[2] + (b[2] - a[2]) * t];
          focos.push({ pos: p, esc: 0.055, color: (k + g) % 3 ? '#ffd59a' : '#ffb0d0' });
          if (k % 3 === 0) halos.push(H.brillo({ pos: p, color: (k + g) % 2 ? '#ffd59a' : '#ffb0d0', tamano: 0.9, opacidad: 0.55 }));
        }
      });
      H.malla(H.fusionar(hilos, { nombre: 'hilos de las guirnaldas' }), H.mat({ color: '#1a1214' }));
      H.instancias(H.geo.esfera({ radio: 1, lados: 8 }), H.mat({ basico: true, color: '#ffffff' }), focos, { sinSombra: true, masa: true, nombre: 'focos' });
      halos.forEach(h => { h.userData.f = H.azar(0, 6); });
      H.animar(t => halos.forEach(h => { h.material.opacity = 0.4 + Math.sin(t * 1.3 + h.userData.f) * 0.15; }));
      H.luzPunto('#ffb8c8', 4, 12, [0, 4, 1]);
      H.sonido({ pos: [0, 4.4, 1], tipo: 'zumbido', radio: 6, volumen: 0.2 });

      // 11 · ENREDADERAS colgando del techo roto y de los ventanales ─────
      H.seccion('11 · Enredaderas colgando del techo roto y de los ventanales');
      const enredaderas = [], hojas = [];
      const colgar = (x, y, z, largo) => {
        const pts = [[x, y, z]];
        for (let s = 1; s <= 4; s++) pts.push([x + H.azar(-0.25, 0.25), y - largo * s / 4, z + H.azar(-0.25, 0.25)]);
        enredaderas.push(H.geo.tubo({ puntos: pts, radio: 0.018, segmentos: 12, lados: 4 }));
        for (let s = 0; s < largo * 4; s++) { const p = pts[1 + Math.floor(s / (largo * 4) * 4)]; hojas.push({ pos: [p[0] + H.azar(-0.15, 0.15), y - s * 0.25, p[2] + H.azar(-0.15, 0.15)], rot: [H.azar(0, 360), H.azar(0, 360), 0], esc: H.azar(0.08, 0.16), color: H.elegir(['#4f6a34', '#5e7a3a', '#3e5a2a']) }); }
      };
      for (let i = 0; i < H.cantidad(16); i++) colgar(H.azar(x0 + 0.5, x1 - 0.5), T - 0.2, H.azar(-0.4, 0.3), H.azar(0.8, 2.6));
      ventanales.forEach(v => { for (let k = 0; k < 3; k++) colgar(x0 + 0.3, v.base + v.alto, z1 - v.centro + H.azar(-1.4, 1.4), H.azar(0.6, 2)); });
      H.malla(H.fusionar(enredaderas, { nombre: 'enredaderas' }), H.mat({ color: '#3e5a2a', rugosidad: 1 }));
      H.instancias(H.geo.plano({ ancho: 1, alto: 1 }), H.mat({ color: '#ffffff', doble: true, rugosidad: 1 }), hojas, { sinSombra: true, masa: true, nombre: 'hojas' });

      // 12 · ARENA que entró con el viento ────────────────────────────────
      H.seccion('12 · Arena que entró con el viento');
      const dunas = ventanales.map(v => ({ pos: [x0 + 1.2, -0.1, z1 - v.centro + H.azar(-0.5, 0.5)], esc: [1.8, 0.35, 2.4] }));
      dunas.push({ pos: [x1 - 3, -0.12, z1 - 1.5], esc: [2.5, 0.3, 1.4] });
      H.instancias(H.geo.esfera({ radio: 1, lados: 16, nombre: 'duna' }), H.mat({ textura: 'arena', color: '#e0b8a8', rugosidad: 1 }), dunas);

      // 13 · AFUERA: un faro girando en el mar y gaviotas ───────────────
      H.seccion('13 · Afuera');
      const [fx, fz] = A.faro;
      const faro = H.fusionar([
        H.geo.cilindro({ radioArriba: 1.7, radioAbajo: 2.6, alto: 20, lados: 16, pos: [0, 10, 0] }),
        H.geo.cilindro({ radio: 2.1, alto: 0.6, lados: 16, pos: [0, 20.3, 0] }),
        H.geo.cono({ radio: 1.6, alto: 2, lados: 16, pos: [0, 23.5, 0] }),
      ], { unir: true, nombre: 'faro' });
      H.malla(faro, H.mat({ color: '#d8ccd0', rugosidad: 0.8 }), { pos: [fx, -3, fz] });
      H.cilindro({ radio: 2.65, alto: 2, lados: 16, pos: [fx, 4, fz], color: '#a83a4a', rugosidad: 0.8 });
      H.brillo({ pos: [fx, 18.6, fz], color: '#fff2d8', tamano: 10, opacidad: 0.9 });
      const haz = H.grupo({ pos: [fx, 18.6, fz] });
      H.cono({ padre: haz, radio: 6, alto: 140, lados: 16, abierto: true, rot: [0, 0, -90], pos: [-70, 0, 0], aditivo: true, color: '#fff0d0', opacidad: 0.07, doble: true });
      H.animar((t, dt) => { haz.rotation.y += dt * 0.35; });
      H.bandada({ centro: [-40, 12, -4], radio: 18, cantidad: 9, color: '#efe6e8', tamano: 0.9, velocidad: 0.08 });

      // 14 · POLVO dorado en el aire ─────────────────────────────────────
      H.seccion('14 · Polvo dorado en el aire');
      H.particulas({ cantidad: 300, centro: [0, 2.5, 0], area: [W, 5, L], color: '#ffd0a8', tamano: 0.04, velocidad: [0.08, 0.03, 0], vaiven: 0.06, opacidad: 0.7 });

      // 15 · LA PUERTA → MUNDO 8 ───────────────────────────────────────────
      H.seccion('15 · La puerta → mundo 8');
      H.portal({ destino: 8, pos: [0, 0, z0 + 0.35], etiqueta: 'Lo que queda', color: '#ffc6dc', velo: '#ff2f7a', ancho: 2.3, alto: 3.3 });
    },
  });
})();
