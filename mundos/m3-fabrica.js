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
  };

  TECNO.registrarMundo({
    id: 3,
    cielo: { arriba: '#5d7088', horizonte: '#d6dde3', abajo: '#40505c', sol: { color: '#ffffff', alto: 35, giro: 80, tamano: 0.8 } },
    niebla: { color: '#8f9ba6', densidad: 0.03 },
    exposicion: 1.05,
    reflejos: 0.5,
    inicio: { pos: [0, 0, 9], mirar: 0 },
    limites: { minX: -9.3, maxX: 9.3, minZ: -22.5, maxZ: 10.3 },

    construir(H) {
      const W = A.ancho, L = A.largo, T = A.alto, zc = -6, z1 = zc + L / 2, z0 = zc - L / 2;   // z0 = fondo, z1 = entrada

      // 1 · LUCES ─────────────────────────────────────────────────────────
      H.luzHemisferio('#a9bcd6', '#1c2026', 0.9);
      H.luzAmbiente('#3c4652', 0.5);
      H.luzSol(A.colorSol, 3.4, A.direccionSol, { sombra: true, area: 24, centro: [0, 0, zc] });

      // 2 · PISO, TECHO Y MUROS ───────────────────────────────────────────
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
      H.malla(H.fusionar(muros), concreto);

      // 3 · ESTRUCTURA DE ACERO del techo (cerchas) ──────────────────────
      const acero = [];
      for (let z = z1 - 2; z > z0; z -= 4) {
        acero.push(H.geo.caja({ ancho: W, alto: 0.2, fondo: 0.2, pos: [0, T - 1.3, z] }));
        acero.push(H.geo.caja({ ancho: W, alto: 0.2, fondo: 0.2, pos: [0, T - 0.2, z] }));
        for (let x = -W / 2 + 1; x < W / 2; x += 2) acero.push(H.geo.caja({ ancho: 0.08, alto: 1.5, fondo: 0.08, pos: [x, T - 0.75, z], rot: [0, 0, (x % 4 === 1 || x % 4 === -3) ? 36 : -36] }));
      }
      H.malla(H.fusionar(acero), H.mat({ color: '#4a535c', metal: 0.7, rugosidad: 0.5 }));

      // 4 · TUBERÍAS en la pared derecha ─────────────────────────────────
      const tubos = [];
      for (const [y, r] of [[6.2, 0.35], [7.1, 0.25], [7.8, 0.18]]) tubos.push(H.geo.cilindro({ radio: r, alto: L, lados: 14, rot: [90, 0, 0], pos: [W / 2 - 0.7, y, zc] }));
      for (let z = z1 - 4; z > z0 + 3; z -= 7) {
        tubos.push(H.geo.cilindro({ radio: 0.25, alto: 5.6, lados: 12, pos: [W / 2 - 0.7, 2.8 + 0.25, z] }));
        tubos.push(H.geo.toro({ radio: 0.4, grosor: 0.25, arco: 90, lados: 10, ladosTubo: 10, pos: [W / 2 - 0.7, 6.2 - 0.4, z + 0.4], rot: [0, 90, 0] }));
        tubos.push(H.geo.cilindro({ radio: 0.32, alto: 0.25, lados: 12, pos: [W / 2 - 0.7, 1.4, z] }));   // válvula
      }
      H.malla(H.fusionar(tubos), H.mat({ color: '#5e6b75', metal: 0.65, rugosidad: 0.45, textura: 'metal', repetir: [1, 4] }));

      // 5 · SERVIDORES (instancias) con luces que parpadean ──────────────
      const racks = [];
      for (let i = 0; i < A.racks; i++) racks.push({ pos: [W / 2 - 2.2, 1.1, z1 - 3 - i * 1.0], rot: [0, 0, 0] });
      H.instancias(H.geo.caja({ ancho: 0.8, alto: 2.2, fondo: 0.9 }), H.mat({ color: '#1d2126', metal: 0.6, rugosidad: 0.4 }), racks);
      const leds = H.tex('leds', [1, 2]);
      H.instancias(H.geo.plano({ ancho: 0.82, alto: 2.0, rot: [0, -90, 0] }), H.mat({ basico: true, textura: leds }), racks.map(r => ({ pos: [r.pos[0] - 0.42, 1.1, r.pos[2]] })));
      H.solido(W / 2 - 2.2, z1 - 3 - (A.racks - 1) / 2, 0.9, A.racks);
      let parpadeo = 0;
      H.animar((t, dt) => { parpadeo += dt; if (parpadeo > 0.35) { parpadeo = 0; leds.offset.y = Math.floor(Math.random() * 8) / 8; } });

      // 6 · ESCRITORIOS CON COMPUTADORAS VIEJAS ──────────────────────────
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
      ]);
      H.instancias(mesa, H.mat({ color: '#6b7178', metal: 0.5, rugosidad: 0.6 }), escritorios);
      const crt = H.fusionar([
        H.geo.caja({ ancho: 0.5, alto: 0.42, fondo: 0.4, pos: [0, 0.23, 0] }),
        H.geo.caja({ ancho: 0.36, alto: 0.3, fondo: 0.25, pos: [0, 0.22, -0.3] }),
        H.geo.caja({ ancho: 0.3, alto: 0.04, fondo: 0.3, pos: [0, 0.02, 0] }),
      ]);
      H.instancias(crt, H.mat({ color: '#b8b4aa', rugosidad: 0.7 }), monitores);
      H.instancias(H.geo.plano({ ancho: 0.4, alto: 0.31, pos: [0, 0.24, 0.205] }), H.mat({ basico: true, textura: H.texPantalla(A.colorPantallas) }), monitores);

      // 7 · LA MÁQUINA CENTRAL: un tanque enorme acostado ─────────────────
      const maquina = [];
      maquina.push(H.geo.cilindro({ radio: 1.8, alto: 7, lados: 28, rot: [0, 0, 90], pos: [0, 2.6, 0] }));
      for (let x = -3; x <= 3; x += 1) maquina.push(H.geo.toro({ radio: 1.84, grosor: 0.08, lados: 32, rot: [0, 90, 0], pos: [x, 2.6, 0] }));
      for (const x of [-2.5, 2.5]) maquina.push(H.geo.caja({ ancho: 0.6, alto: 1.6, fondo: 3, pos: [x, 0.8, 0] }));
      for (const x of [-1.5, 0.5, 2]) maquina.push(H.geo.cilindro({ radio: 0.15, alto: T - 4.4, lados: 8, pos: [x, 4.4 + (T - 4.4) / 2, 0.6] }));
      H.malla(H.fusionar(maquina), H.mat({ color: '#6d7a84', metal: 0.75, rugosidad: 0.35, textura: 'metal', repetir: [3, 1] }), { pos: [1.5, 0, -14] });
      H.solido(1.5, -14, 7.6, 3.8);

      // 8 · CABLES colgando de las cerchas ───────────────────────────────
      const cables = [];
      for (let i = 0; i < H.cantidad(A.cables); i++) {
        const x = H.azar(-W / 2 + 1, W / 2 - 1), z = H.azar(z0 + 1, z1 - 1);
        if (H.azar() < 0.25) {        // algunos llegan hasta el piso
          cables.push(H.geo.tubo({ puntos: [[x, T - 1.3, z], [x + H.azar(-0.5, 0.5), T * 0.5, z + H.azar(-0.5, 0.5)], [x + H.azar(-1, 1), 0.05, z + H.azar(-1, 1)], [x + H.azar(-2, 2), 0.03, z + H.azar(-2, 2)]], radio: 0.025 }));
        } else {
          cables.push(H.geo.cable({ desde: [x, T - 1.3, z], hasta: [x + H.azar(-4, 4), T - 1.3, z + H.azar(-3, 3)], caida: H.azar(0.5, 3), radio: H.azar(0.015, 0.035) }));
        }
      }
      H.malla(H.fusionar(cables), H.mat({ color: '#0d0f12', rugosidad: 0.4, metal: 0.3 }));

      // 9 · TUBOS FLUORESCENTES (uno falla) ──────────────────────────────
      const tubosLuz = [];
      for (let z = z1 - 4; z > z0 + 2; z -= 8) tubosLuz.push(H.caja({ ancho: 0.08, alto: 0.06, fondo: 2.2, pos: [0, 5.6, z], basico: true, color: '#d8ecff' }));
      const roto = tubosLuz[1];
      H.animar(() => { roto.visible = Math.random() > 0.08; });

      // 10 · RAYOS DE SOL que entran por los ventanales ──────────────────
      const d = new THREE.Vector3(...A.direccionSol).normalize().negate();     // hacia dónde viaja la luz
      const ejeX = new THREE.Vector3(0, 0, 1).addScaledVector(d, -d.z).normalize();
      const base = new THREE.Matrix4().makeBasis(ejeX, new THREE.Vector3().crossVectors(d, ejeX), d);
      const giro = new THREE.Quaternion().setFromRotationMatrix(base);
      const matRayo = H.mat({ aditivo: true, color: '#cfdcff', opacidad: 0.05, doble: true });
      huecos.forEach(h => {
        const largo = 13, z = z1 - h.centro;
        const rayo = H.caja({ ancho: h.ancho * 0.95, alto: h.alto * 0.9, fondo: largo, mat: matRayo });
        rayo.position.set(-W / 2, h.base + h.alto / 2, z).addScaledVector(d, largo / 2);
        rayo.quaternion.copy(giro);
        // sin sombras reales, una mancha de luz falsa en el piso
        if (!H.sombras()) H.plano({ ancho: 4.5, alto: h.ancho * 0.9, rot: [-90, 0, 0], pos: [-3.5, 0.02, z - 1], aditivo: true, textura: 'brillo', color: '#dfe8ff', opacidad: 0.35 });
      });
      H.particulas({ cantidad: 380, centro: [-4, 3.5, zc], area: [10, 7, L - 2], color: '#dfe9ff', tamano: 0.035, velocidad: [0.05, 0.02, 0], vaiven: 0.06, opacidad: 0.7 });

      // 11 · EL PORTÓN → MUNDO 4 ─────────────────────────────────────────
      H.portal({ destino: 4, pos: [0, 0, z0 + 0.4], etiqueta: 'La torre', color: '#e6eeff', velo: '#cfd8e0', ancho: 4.2, alto: 5.6, radio: 1.6 });
    },
  });
})();
