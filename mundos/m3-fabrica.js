/* ==========================================================================
   MUNDO 3 · LA FÁBRICA FRÍA          (camino 1: "Fundirme con la máquina")
   --------------------------------------------------------------------------
   Interior de una fábrica abandonada: cables, tuberías, servidores y
   computadoras viejas que siguen escribiendo solas. Espacio frío, azul-gris,
   iluminado por el sol que entra en diagonal por los ventanales de la izquierda.
   Al fondo, un portón de luz → Mundo 4 (la torre).
   ========================================================================== */
(function () {
  const THREE = AFRAME.THREE;

  const A = {
    ancho: 20, largo: 34, alto: 9,   // la nave industrial (metros)
    ventanas: 6,                     // ventanales en la pared izquierda
    racks: 22,                       // servidores en la pared derecha
    cables: 60,
    colorSol: '#e6eeff',
    colorPantallas: '#9cffd0',
    direccionSol: [-1, 0.75, 0.2],   // de dónde viene el sol (−X = izquierda)
    // maquetas de referencia (cámbialas por modelos .glb cuando los tengas)
    cinta: [2.6, 7, -10.5],          // línea de producción: [x, z inicio, z final]
    cuerposEnCinta: 7,
    velocidadCinta: 0.35,            // metros por segundo
    brazos: [[4.1, 2.5], [4.1, -4]], // brazos robóticos [x, z]
    chispas: [-3.2, -9.5],           // cable roto que suelta chispas [x, z]
    pilas: [[-8, -19], [-8.2, 8.6]], // cajas y barriles [x, z]
  };

  TECNO.registrarMundo({
    id: 3,
    cielo: { arriba: '#5d7088', horizonte: '#d6dde3', abajo: '#40505c', sol: { color: '#ffffff', alto: 35, giro: 80, tamano: 0.8 } },
    niebla: { color: '#8f9ba6', densidad: 0.03 },
    exposicion: 1.05,
    reflejos: 0.5,
    inicio: { pos: [-1.4, 0, 9.4], mirar: 0 },
    limites: { minX: -9.3, maxX: 9.3, minZ: -22.5, maxZ: 10.3 },

    construir(H) {
      const W = A.ancho, L = A.largo, T = A.alto, zc = -6, z1 = zc + L / 2, z0 = zc - L / 2;   // z0 = fondo, z1 = entrada

      // 1 · LUCES ─────────────────────────────────────────────────────────
      H.seccion('1 · Luces');
      H.luzHemisferio('#a9bcd6', '#1c2026', 0.9);
      H.luzAmbiente('#3c4652', 0.5);
      H.luzSol(A.colorSol, 3.4, A.direccionSol, { sombra: true, area: 24, centro: [0, 0, zc] });

      // 2 · PISO, TECHO Y MUROS ───────────────────────────────────────────
      H.seccion('2 · Piso, techo y muros');
      const concreto = H.mat({ textura: 'concreto', repetir: [2, 1], color: '#a3abb2', rugosidad: 0.9 });
      H.plano({ ancho: W, alto: L, rot: [-90, 0, 0], pos: [0, 0, zc], textura: 'concreto', repetir: [W / 4, L / 4], color: '#8c949a', rugosidad: 0.85 });
      // charcos (reflejan el cielo)
      for (let i = 0; i < 5; i++) H.circulo({ radio: H.azar(0.8, 2), rot: [-90, 0, 0], pos: [H.azar(-7, 5), 0.012, H.azar(-20, 8)], esc: [H.azar(1, 1.8), 1, 1], color: '#7f8a94', metal: 1, rugosidad: 0.08, reflejo: 2 });
      H.plano({ ancho: W, alto: L, rot: [90, 0, 0], pos: [0, T, zc], color: '#2a2f35', rugosidad: 1 });

      const muros = [];
      // pared izquierda (−X) con ventanales: un muro con HUECOS
      const tramo = L / A.ventanas, huecos = [];
      for (let i = 0; i < A.ventanas; i++) huecos.push({ centro: tramo * (i + 0.5), ancho: tramo - 1.4, base: 2.4, alto: 4.8 });
      muros.push(...H.muro({ desde: [-W / 2, z1], hasta: [-W / 2, z0], alto: T, grosor: 0.5, huecos, modulo: 0.7 }));
      // parteluces (marcos de los ventanales)
      huecos.forEach(h => {
        const z = z1 - h.centro;
        muros.push(H.geo.caja({ ancho: 0.12, alto: h.alto, fondo: 0.12, pos: [-W / 2, h.base + h.alto / 2, z] }));
        muros.push(H.geo.caja({ ancho: 0.1, alto: 0.1, fondo: h.ancho, pos: [-W / 2, h.base + h.alto * 0.62, z] }));
      });
      // pared derecha y pared de la entrada
      muros.push(...H.muro({ desde: [W / 2, z0], hasta: [W / 2, z1], alto: T, grosor: 0.5, modulo: 4 }));
      muros.push(...H.muro({ desde: [-W / 2, z1], hasta: [W / 2, z1], alto: T, grosor: 0.5, modulo: 4 }));
      // pared del fondo con el PORTÓN
      muros.push(...H.muro({ desde: [W / 2, z0], hasta: [-W / 2, z0], alto: T, grosor: 0.5, modulo: 1, huecos: [{ centro: W / 2, ancho: 5, base: 0, alto: 6 }] }));
      // columnas
      for (let z = z1 - 5; z > z0 + 2; z -= 6) for (const x of [-5, 5]) { muros.push(H.geo.caja({ ancho: 0.7, alto: T, fondo: 0.7, pos: [x, T / 2, z] })); H.solido(x, z, 0.8, 0.8); }
      H.malla(H.fusionar(muros, { nombre: 'muros y columnas' }), concreto);

      // 3 · ESTRUCTURA DE ACERO del techo (cerchas) ──────────────────────
      H.seccion('3 · Estructura de acero del techo');
      const acero = [];
      for (let z = z1 - 2; z > z0; z -= 4) {
        const cercha = [];
        cercha.push(H.geo.caja({ ancho: W, alto: 0.2, fondo: 0.2, pos: [0, T - 1.3, z] }));
        cercha.push(H.geo.caja({ ancho: W, alto: 0.2, fondo: 0.2, pos: [0, T - 0.2, z] }));
        for (let x = -W / 2 + 1; x < W / 2; x += 2) cercha.push(H.geo.caja({ ancho: 0.08, alto: 1.5, fondo: 0.08, pos: [x, T - 0.75, z], rot: [0, 0, (x % 4 === 1 || x % 4 === -3) ? 36 : -36] }));
        acero.push(H.fusionar(cercha, { unir: true, nombre: 'cercha' }));
      }
      H.malla(H.fusionar(acero, { nombre: 'techo de acero' }), H.mat({ color: '#4a535c', metal: 0.7, rugosidad: 0.5 }));

      // 4 · TUBERÍAS en la pared derecha ─────────────────────────────────
      H.seccion('4 · Tuberías en la pared derecha');
      const tubos = [];
      for (const [y, r] of [[6.2, 0.35], [7.1, 0.25], [7.8, 0.18]]) tubos.push(H.geo.cilindro({ radio: r, alto: L, lados: 14, rot: [90, 0, 0], pos: [W / 2 - 0.7, y, zc] }));
      for (let z = z1 - 4; z > z0 + 3; z -= 7) {
        tubos.push(H.geo.cilindro({ radio: 0.25, alto: 5.6, lados: 12, pos: [W / 2 - 0.7, 2.8 + 0.25, z] }));
        tubos.push(H.geo.toro({ radio: 0.4, grosor: 0.25, arco: 90, lados: 10, ladosTubo: 10, pos: [W / 2 - 0.7, 6.2 - 0.4, z + 0.4], rot: [0, 90, 0] }));
        tubos.push(H.geo.cilindro({ radio: 0.32, alto: 0.25, lados: 12, pos: [W / 2 - 0.7, 1.4, z] }));   // válvula
      }
      H.malla(H.fusionar(tubos, { nombre: 'tuberias' }), H.mat({ color: '#5e6b75', metal: 0.65, rugosidad: 0.45, textura: 'metal', repetir: [1, 4] }));

      // 5 · SERVIDORES (instancias) con luces que parpadean ──────────────
      H.seccion('5 · Servidores');
      const racks = [];
      for (let i = 0; i < A.racks; i++) racks.push({ pos: [W / 2 - 2.2, 1.1, z1 - 3 - i * 1.0], rot: [0, 0, 0] });
      const servidores = H.instancias(H.geo.caja({ ancho: 0.8, alto: 2.2, fondo: 0.9, nombre: 'servidor' }), H.mat({ color: '#1d2126', metal: 0.6, rugosidad: 0.4 }), racks);
      const leds = H.tex('leds', [1, 2]);
      H.instancias(H.geo.plano({ ancho: 0.82, alto: 2.0, rot: [0, -90, 0], nombre: 'luces del servidor' }), H.mat({ basico: true, textura: leds }), racks.map(() => ({ pos: [-0.42, 0, 0] })), { dentroDe: servidores, pieza: 'luces' });
      H.solido(W / 2 - 2.2, z1 - 3 - (A.racks - 1) / 2, 0.9, A.racks);
      let parpadeo = 0;
      H.animar((t, dt) => { parpadeo += dt; if (parpadeo > 0.35) { parpadeo = 0; leds.offset.y = Math.floor(Math.random() * 8) / 8; } });

      // 6 · ESCRITORIOS CON COMPUTADORAS VIEJAS ──────────────────────────
      H.seccion('6 · Escritorios con computadoras viejas');
      const escritorios = [], monitores = [];
      for (let fila = 0; fila < 3; fila++) for (let k = 0; k < 3; k++) {
        const x = -6.3 + k * 2.6, z = 3 - fila * 5;
        escritorios.push({ pos: [x, 0, z] });
        const caido = H.azar() < 0.2;
        monitores.push(caido
          ? { pos: [x + H.azar(-1, 1), 0.25, z + 1.1], rot: [H.azar(-90, -60), H.azar(0, 360), 0] }
          : { pos: [x + H.azar(-0.3, 0.3), 0.78, z], rot: [0, H.azar(-15, 15), 0] });
        H.solido(x, z, 1.5, 0.8);
      }
      const mesa = H.fusionar([
        H.geo.caja({ ancho: 1.4, alto: 0.05, fondo: 0.7, pos: [0, 0.75, 0] }),
        ...[[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]].map(([x, z]) => H.geo.caja({ ancho: 0.05, alto: 0.75, fondo: 0.05, pos: [x, 0.375, z] })),
      ], { unir: true, nombre: 'escritorio' });
      H.instancias(mesa, H.mat({ color: '#6b7178', metal: 0.5, rugosidad: 0.6 }), escritorios);
      const crt = H.fusionar([
        H.geo.caja({ ancho: 0.5, alto: 0.42, fondo: 0.4, pos: [0, 0.23, 0] }),
        H.geo.caja({ ancho: 0.36, alto: 0.3, fondo: 0.25, pos: [0, 0.22, -0.3] }),
        H.geo.caja({ ancho: 0.3, alto: 0.04, fondo: 0.3, pos: [0, 0.02, 0] }),
      ], { unir: true, nombre: 'monitor' });
      const mMonitores = H.instancias(crt, H.mat({ color: '#b8b4aa', rugosidad: 0.7 }), monitores);
      H.instancias(H.geo.plano({ ancho: 0.4, alto: 0.31, pos: [0, 0.24, 0.205], nombre: 'pantalla' }), H.mat({ basico: true, textura: H.texPantalla(A.colorPantallas) }), monitores.map(() => ({})), { dentroDe: mMonitores, pieza: 'pantalla' });

      // 7 · LA MÁQUINA CENTRAL: un tanque enorme acostado ─────────────────
      H.seccion('7 · La máquina central');
      const maquina = [];
      maquina.push(H.geo.cilindro({ radio: 1.8, alto: 7, lados: 28, rot: [0, 0, 90], pos: [0, 2.6, 0] }));
      for (let x = -3; x <= 3; x += 1) maquina.push(H.geo.toro({ radio: 1.84, grosor: 0.08, lados: 32, rot: [0, 90, 0], pos: [x, 2.6, 0] }));
      for (const x of [-2.5, 2.5]) maquina.push(H.geo.caja({ ancho: 0.6, alto: 1.6, fondo: 3, pos: [x, 0.8, 0] }));
      for (const x of [-1.5, 0.5, 2]) maquina.push(H.geo.cilindro({ radio: 0.15, alto: T - 4.4, lados: 8, pos: [x, 4.4 + (T - 4.4) / 2, 0.6] }));
      H.malla(H.fusionar(maquina, { unir: true, nombre: 'maquina central' }), H.mat({ color: '#6d7a84', metal: 0.75, rugosidad: 0.35, textura: 'metal', repetir: [3, 1] }), { pos: [1.5, 0, -14] });
      H.solido(1.5, -14, 7.6, 3.8);

      // 8 · CABLES colgando de las cerchas ───────────────────────────────
      H.seccion('8 · Cables colgando de las cerchas');
      const cables = [];
      for (let i = 0; i < H.cantidad(A.cables); i++) {
        const x = H.azar(-W / 2 + 1, W / 2 - 1), z = H.azar(z0 + 1, z1 - 1);
        if (H.azar() < 0.25) {        // algunos llegan hasta el piso
          cables.push(H.geo.tubo({ puntos: [[x, T - 1.3, z], [x + H.azar(-0.5, 0.5), T * 0.5, z + H.azar(-0.5, 0.5)], [x + H.azar(-1, 1), 0.05, z + H.azar(-1, 1)], [x + H.azar(-2, 2), 0.03, z + H.azar(-2, 2)]], radio: 0.025 }));
        } else {
          cables.push(H.geo.cable({ desde: [x, T - 1.3, z], hasta: [x + H.azar(-4, 4), T - 1.3, z + H.azar(-3, 3)], caida: H.azar(0.5, 3), radio: H.azar(0.015, 0.035) }));
        }
      }
      H.malla(H.fusionar(cables, { nombre: 'cables' }), H.mat({ color: '#0d0f12', rugosidad: 0.4, metal: 0.3 }));

      // 9 · TUBOS FLUORESCENTES (uno falla) ──────────────────────────────
      H.seccion('9 · Tubos fluorescentes');
      const tubosLuz = [];
      for (let z = z1 - 4; z > z0 + 2; z -= 8) tubosLuz.push(H.caja({ ancho: 0.08, alto: 0.06, fondo: 2.2, pos: [0, 5.6, z], basico: true, color: '#d8ecff' }));
      const roto = tubosLuz[1];
      H.animar(() => { roto.visible = Math.random() > 0.08; });

      // 10 · RAYOS DE SOL que entran por los ventanales ──────────────────
      H.seccion('10 · Rayos de sol que entran por los ventanales');
      const d = new THREE.Vector3(...A.direccionSol).normalize().negate();     // hacia dónde viaja la luz
      const ejeX = new THREE.Vector3(0, 0, 1).addScaledVector(d, -d.z).normalize();
      const base = new THREE.Matrix4().makeBasis(ejeX, new THREE.Vector3().crossVectors(d, ejeX), d);
      const giro = new THREE.Quaternion().setFromRotationMatrix(base);
      const matRayo = H.mat({ aditivo: true, color: '#cfdcff', opacidad: 0.05, doble: true });
      huecos.forEach(h => {
        const largo = 13, z = z1 - h.centro;
        const rayo = H.caja({ ancho: h.ancho * 0.95, alto: h.alto * 0.9, fondo: largo, mat: matRayo });
        H.pieza(rayo).position.set(-W / 2, h.base + h.alto / 2, z).addScaledVector(d, largo / 2);
        H.pieza(rayo).quaternion.copy(giro);
        // sin sombras reales, una mancha de luz falsa en el piso
        if (!H.sombras()) H.plano({ ancho: 4.5, alto: h.ancho * 0.9, rot: [-90, 0, 0], pos: [-3.5, 0.02, z - 1], aditivo: true, textura: 'brillo', color: '#dfe8ff', opacidad: 0.35 });
      });
      H.particulas({ cantidad: 380, centro: [-4, 3.5, zc], area: [10, 7, L - 2], color: '#dfe9ff', tamano: 0.035, velocidad: [0.05, 0.02, 0], vaiven: 0.06, opacidad: 0.7 });

      // 11 · LA LÍNEA DE PRODUCCIÓN: cuerpos de cromo avanzando en una cinta
      H.seccion('11 · La línea de producción');
      //      hacia la máquina ("aquí se fabricaba el deseo en serie") ─────
      const [bx, bz0, bz1] = A.cinta, largoCinta = bz0 - bz1;
      const estructura = [
        ...[-0.62, 0.62].map(s => H.geo.caja({ ancho: 0.1, alto: 0.25, fondo: largoCinta, pos: [s, 0.92, 0] })),
        ...[-0.62, 0.62].map(s => H.geo.caja({ ancho: 0.06, alto: 0.06, fondo: largoCinta, pos: [s, 0.32, 0] })),
      ];
      for (let z = -largoCinta / 2 + 0.5; z < largoCinta / 2; z += 2) for (const s of [-0.58, 0.58]) estructura.push(H.geo.caja({ ancho: 0.08, alto: 0.85, fondo: 0.08, pos: [s, 0.42, z] }));
      for (const z of [largoCinta / 2 + 0.8, -largoCinta / 2 - 1.2]) {           // las dos "bocas" (túneles) de la cinta
        estructura.push(H.geo.caja({ ancho: 1.7, alto: 0.15, fondo: 2.4, pos: [0, 2.2, z] }));
        for (const s of [-0.8, 0.8]) estructura.push(H.geo.caja({ ancho: 0.12, alto: 2.2, fondo: 2.4, pos: [s, 1.1, z] }));
        estructura.push(H.geo.caja({ ancho: 1.7, alto: 1.1, fondo: 0.1, pos: [0, 1.65, z + (z > 0 ? -1.15 : 1.15)] }));
      }
      H.malla(H.fusionar(estructura, { unir: true, nombre: 'estructura de la cinta' }), H.mat({ color: '#4f5860', metal: 0.7, rugosidad: 0.45 }), { pos: [bx, 0, (bz0 + bz1) / 2] });
      const banda = H.plano({ ancho: 1.15, alto: largoCinta, rot: [-90, 0, 0], pos: [bx, 0.95, (bz0 + bz1) / 2], textura: H.tex('panel', [0.6, largoCinta / 2]), color: '#3a3f44', rugosidad: 0.7 });
      H.solido(bx, (bz0 + bz1) / 2, 1.8, largoCinta + 4.5);
      const cromo = H.mat({ color: '#ffffff', metal: 0.95, rugosidad: 0.25, textura: 'metal', reflejo: 1.4 });
      const enCinta = [];
      for (let i = 0; i < A.cuerposEnCinta; i++) enCinta.push({ i, color: i % 3 === 1 ? '#ff5aa8' : '#c9ccd2' });
      const mCinta = H.instancias(H.cuerpo('de pie'), cromo, enCinta.map(c => ({ color: c.color })), { mover: true });
      const paso = (largoCinta + 1.5) / A.cuerposEnCinta;
      H.animar((t, dt) => {
        banda.material.map.offset.y += dt * A.velocidadCinta / 2;
        enCinta.forEach((c, i) => {
          const pies = bz0 + 1.1 - ((t * A.velocidadCinta + i * paso) % (largoCinta + 1.5));
          H.moverInstancia(mCinta, i, { pos: [bx, 1.1, pies], rot: [-90, 0, 0] });
        });
      });
      H.sonido({ pos: [bx, 1, (bz0 + bz1) / 2], tipo: 'maquinas', radio: 16, volumen: 0.8 });

      // brazos robóticos que se mueven sobre la cinta (maquetas de cajas)
      const pintura = H.mat({ color: '#8a7a50', metal: 0.5, rugosidad: 0.5 });
      const brazos = A.brazos.map(([x, z], i) => {
        const pie = H.grupo({ pos: [x, 0, z] });
        H.cilindro({ padre: pie, radio: 0.45, alto: 0.5, lados: 16, pos: [0, 0.25, 0], mat: pintura });
        const giro = H.grupo({ padre: pie, pos: [0, 0.5, 0] });
        H.cilindro({ padre: giro, radio: 0.3, alto: 0.5, lados: 12, pos: [0, 0.25, 0], mat: pintura });
        const hombro = H.grupo({ padre: giro, pos: [0, 0.7, 0] });
        H.caja({ padre: hombro, ancho: 0.25, alto: 1.4, fondo: 0.25, pos: [0, 0.7, 0], mat: pintura });
        const codo = H.grupo({ padre: hombro, pos: [0, 1.4, 0] });
        H.caja({ padre: codo, ancho: 0.2, alto: 1.1, fondo: 0.2, pos: [0, 0.55, 0], mat: pintura });
        H.cono({ padre: codo, radio: 0.12, alto: 0.3, lados: 8, pos: [0, 1.25, 0], rot: [180, 0, 0], basico: true, color: '#ff3a5c' });
        H.brillo({ padre: codo, pos: [0, 1.15, 0], color: '#ff3a5c', tamano: 0.7, opacidad: 0.6 });
        H.solido(x, z, 1, 1);
        return { giro, hombro, codo, f: i * 2.1 };
      });
      H.animar(t => brazos.forEach(b => {
        b.giro.rotation.y = Math.sin(t * 0.45 + b.f) * 0.6;
        b.hombro.rotation.z = 0.55 + Math.sin(t * 0.8 + b.f) * 0.22;
        b.codo.rotation.z = 0.95 + Math.sin(t * 1.1 + b.f) * 0.35;
      }));
      // cadenas con ganchos colgando sobre la cinta
      const cadenas = [];
      for (let z = bz0 - 1; z > bz1; z -= 2.4) {
        const largo = H.azar(2.5, 4.2), y = T - 1.3 - largo;
        cadenas.push(H.geo.cilindro({ radio: 0.02, alto: largo, lados: 4, pos: [bx, y + largo / 2, z] }));
        cadenas.push(H.geo.toro({ radio: 0.12, grosor: 0.025, arco: 260, lados: 10, ladosTubo: 4, pos: [bx, y - 0.1, z], rot: [0, 90, 200] }));
      }
      H.malla(H.fusionar(cadenas, { nombre: 'cadenas' }), H.mat({ color: '#2a2e33', metal: 0.8, rugosidad: 0.4 }));

      // 12 · PASARELA sobre los servidores, con su escalera ─────────────
      H.seccion('12 · Pasarela sobre los servidores, con su escalera');
      const pasarela = [];
      const [px0, px1] = [W / 2 - 3.4, W / 2 - 0.3], yP = 3.6, zP0 = z1 - 2, zP1 = z0 + 5;
      pasarela.push(H.geo.caja({ ancho: px1 - px0, alto: 0.12, fondo: zP0 - zP1, pos: [(px0 + px1) / 2, yP, (zP0 + zP1) / 2] }));
      pasarela.push(H.geo.caja({ ancho: 0.05, alto: 0.05, fondo: zP0 - zP1, pos: [px0, yP + 1, (zP0 + zP1) / 2] }));
      for (let z = zP1; z <= zP0; z += 1.5) {
        pasarela.push(H.geo.caja({ ancho: 0.05, alto: 1, fondo: 0.05, pos: [px0, yP + 0.5, z] }));
        pasarela.push(H.geo.caja({ ancho: px1 - px0, alto: 0.1, fondo: 0.1, pos: [(px0 + px1) / 2, yP - 0.15, z] }));
      }
      for (let z = zP1; z <= zP0; z += 6) pasarela.push(H.geo.caja({ ancho: 0.15, alto: yP, fondo: 0.15, pos: [px0, yP / 2, z] }));
      for (let k = 0; k < 12; k++) pasarela.push(H.geo.caja({ ancho: 0.35, alto: 0.06, fondo: 1.1, pos: [px0 - 4.2 + k * 0.35, (k + 1) * yP / 12, zP0 + 0.6] }));   // escalera
      pasarela.push(H.geo.caja({ ancho: 4.4, alto: 0.08, fondo: 0.08, pos: [px0 - 2.1, yP / 2 + 1, zP0 + 1.1], rot: [0, 0, 39] }));
      H.malla(H.fusionar(pasarela, { unir: true, nombre: 'pasarela' }), H.mat({ color: '#3d454c', metal: 0.75, rugosidad: 0.5 }));
      H.solido(px0 - 2.1, zP0 + 0.6, 4.4, 1.2);

      // 13 · PARED DE PANTALLAS junto al portón, con el OJO en la grande ─
      H.seccion('13 · Pared de pantallas junto al portón, con el ojo en la grande');
      // (la entidad de la llanura te sigue mirando desde aquí)
      const muroPantallas = [];
      for (let fila = 0; fila < 4; fila++) for (let col = 0; col < 6; col++) muroPantallas.push({ pos: [-8.6 + col * 0.82, 0.55 + fila * 0.62, z0 + 0.7], rot: [0, H.azar(-6, 6), 0] });
      const mPared = H.instancias(H.geo.caja({ ancho: 0.74, alto: 0.56, fondo: 0.55, nombre: 'monitor de la pared' }), H.mat({ color: '#9c988e', rugosidad: 0.7 }), muroPantallas);
      H.instancias(H.geo.plano({ ancho: 0.6, alto: 0.44, pos: [0, 0, 0.28], nombre: 'pantalla de la pared' }), H.mat({ basico: true, textura: H.texPantalla('#a8e8ff'), color: '#c8d8e0' }), muroPantallas.map(() => ({})), { dentroDe: mPared, pieza: 'pantalla' });
      const ojoPantalla = H.grupo({ pos: [-6.55, 4.3, z0 + 0.55] });
      H.caja({ padre: ojoPantalla, ancho: 3.2, alto: 2.2, fondo: 0.4, color: '#1d2126', metal: 0.6, rugosidad: 0.4 });
      H.plano({ padre: ojoPantalla, ancho: 2.9, alto: 1.9, pos: [0, 0, 0.21], basico: true, color: '#18060a' });
      H.circulo({ padre: ojoPantalla, radio: 0.85, lados: 40, pos: [0, 0, 0.22], basico: true, textura: 'iris', color: '#ff3a5c' });
      const pupila = H.circulo({ padre: ojoPantalla, radio: 0.28, lados: 24, pos: [0, 0, 0.23], basico: true, color: '#050003' });
      H.brillo({ padre: ojoPantalla, pos: [0, 0, 0.5], color: '#ff3a5c', tamano: 4, opacidad: 0.3 });
      H.animar(() => {                                   // la pupila se mueve hacia ti
        const c = H.camara();
        pupila.position.x = THREE.MathUtils.clamp((c.x + 6.55) * 0.03, -0.45, 0.45);
        pupila.position.y = THREE.MathUtils.clamp((c.y - 4.3) * 0.05, -0.3, 0.3);
      });
      H.luzPunto('#9ff0ff', 3, 9, [-6, 2, z0 + 2.5]);        // el brillo frío de las pantallas
      H.sonido({ pos: [-6, 2, z0 + 1], tipo: 'estatica', radio: 9, volumen: 0.7 });
      // cables brillantes que bajan hasta las pantallas
      const vivos = [];
      for (let i = 0; i < 6; i++) { const x = -8.8 + i * 0.9; vivos.push(H.geo.cable({ desde: [x, T - 1.3, z0 + 1.6], hasta: [x + 0.6, 5.6, z0 + 0.7], caida: 0.5, radio: 0.01 })); }
      H.malla(H.fusionar(vivos, { nombre: 'cables que brillan' }), H.mat({ aditivo: true, color: '#aefcf0', opacidad: 0.75 }));

      // 14 · UN CABLE ROTO que suelta chispas ───────────────────────────
      H.seccion('14 · Un cable roto que suelta chispas');
      const [sx, sz] = A.chispas;
      H.tubo({ puntos: [[sx, T - 1.3, sz], [sx + 0.3, 7, sz + 0.2], [sx - 0.1, 5.9, sz]], radio: 0.03, color: '#0d0f12' });
      H.particulas({ cantidad: 45, centro: [sx, 3.1, sz], area: [0.7, 5.6, 0.7], color: '#ffb347', tamano: 0.04, velocidad: [0, -2.6, 0], vaiven: 0.25, opacidad: 1 });
      const chispa = H.brillo({ pos: [sx, 5.9, sz], color: '#ffc070', tamano: 1.2, opacidad: 0.8 });
      const luzChispa = H.luzPunto('#ffb060', 4, 7, [sx, 5.6, sz]);
      H.animar(() => { const f = Math.random(); chispa.material.opacity = f > 0.4 ? f : 0.05; luzChispa.intensity = f > 0.4 ? 4 * f : 0; });
      H.sonido({ pos: [sx, 5.9, sz], tipo: 'chisporroteo', radio: 8, volumen: 0.5 });

      // 15 · VAPOR que sale de las válvulas, CAJAS y BARRILES, PAPELES ───
      H.seccion('15 · Vapor que sale de las válvulas, cajas y barriles, papeles');
      H.particulas({ centros: [[W / 2 - 0.7, 2.4, z1 - 4], [W / 2 - 0.7, 2.4, z1 - 11], [W / 2 - 0.7, 2.4, z1 - 18]], cantidad: 90, area: [0.8, 3.5, 0.8], color: '#c8d0d8', tamano: 0.9, velocidad: [-0.15, 0.6, 0], vaiven: 0.1, opacidad: 0.18, aditivo: false });
      const cajas = [], barriles = [];
      for (const [cx, cz] of A.pilas) {
        for (let k = 0; k < 6; k++) {
          const nivel = k < 3 ? 0 : k < 5 ? 1 : 2, e = H.azar(0.8, 1.05);
          cajas.push({ pos: [cx + (k % 3 - 1) * 0.95 * (nivel ? 0.6 : 1), 0.45 * e + nivel * 0.92, cz + H.azar(-0.15, 0.15)], rot: [0, H.azar(-12, 12), 0], esc: e * 0.9, color: H.elegir(['#6f6a5e', '#5d6468', '#7a6e58']) });
        }
        for (let k = 0; k < 4; k++) {
          const tumbado = k === 3;
          barriles.push({ pos: [cx + H.azar(-1.6, 1.6), tumbado ? 0.35 : 0.45, cz + 1.4 + H.azar(-0.3, 0.6)], rot: tumbado ? [90, H.azar(0, 180), 0] : [0, 0, 0], color: H.elegir(['#4a5a66', '#6e3a34', '#5a5a52']) });
        }
        H.solido(cx, cz + 0.5, 3.2, 2.8);
      }
      H.instancias(H.geo.caja({ nombre: 'caja' }), H.mat({ textura: 'metal', color: '#ffffff', rugosidad: 0.8 }), cajas);
      H.instancias(H.geo.cilindro({ radio: 0.33, alto: 0.9, lados: 14, nombre: 'barril' }), H.mat({ color: '#ffffff', metal: 0.5, rugosidad: 0.5 }), barriles);
      const papeles = [];
      for (let i = 0; i < H.cantidad(90); i++) papeles.push({ pos: [H.azar(-8.5, 1), 0.006 + i * 0.0001, H.azar(-12, 7)], rot: [-90, H.azar(0, 360), 0], color: H.elegir(['#e8ecef', '#d6dcd0', '#f2efe6']) });
      H.instancias(H.geo.plano({ ancho: 0.21, alto: 0.3 }), H.mat({ color: '#ffffff', rugosidad: 1 }), papeles, { sinSombra: true, masa: true, nombre: 'papeles' });

      // 16 · LA BALIZA ROJA sobre el portón (gira y late) ────────────────
      H.seccion('16 · La baliza roja sobre el portón');
      H.cilindro({ radio: 0.18, alto: 0.3, lados: 12, pos: [0, 6.5, z0 + 0.5], basico: true, color: '#ff2a3a' });
      const baliza = H.brillo({ pos: [0, 6.5, z0 + 0.7], color: '#ff2a3a', tamano: 3, opacidad: 0.8 });
      const luzBaliza = H.luzPunto('#ff2a3a', 6, 14, [0, 6.2, z0 + 1.5]);
      H.animar(t => { const f = Math.pow(Math.max(0, Math.sin(t * 3)), 3); baliza.material.opacity = 0.15 + f * 0.8; luzBaliza.intensity = f * 7; });
      H.sonido({ pos: [W / 2 - 2.2, 1.2, zc], tipo: 'zumbido', radio: 10, volumen: 0.7 });     // los servidores

      // 17 · EL PORTÓN → MUNDO 4 ─────────────────────────────────────────
      H.seccion('17 · El portón → mundo 4');
      H.portal({ destino: 4, pos: [0, 0, z0 + 0.4], etiqueta: 'La torre', color: '#e6eeff', velo: '#cfd8e0', ancho: 4.2, alto: 5.6, radio: 1.6 });
    },
  });
})();
