/* ==========================================================================
   MUNDO 1 · INCUBADORA
   Un pasillo bajo, húmedo y opresivo lleno de cápsulas con cuerpos flotando.
   Casi todo está oscuro: lo único que ves son las luces de las cápsulas.

   Pieza principal:  incubadora   (construye la sala entera + las cápsulas)

   QUÉ APRENDER AQUÍ
     · fusionar(): las 18 cápsulas comparten 6 mallas en total, aunque cada una
       tiene base, tapa, cristal, líquido, leds y cables.
     · colorearVertices(): cada cápsula tiene su color dentro de UNA misma malla.
     · tick(): parpadeo aleatorio de luces y leds, y flotación de los cuerpos.
   ========================================================================== */
(function () {
  'use strict';
  const { THREE, rng, lienzo, halo, fusionar, colorearVertices, mover, cablesColgantes, luzPuntual, mat, cajaUV, texturaConcreto } = window.TX;

  // Un cuerpo pálido en una pose aleatoria (cabeza, torso, 2 brazos, 2 piernas) → UNA geometría
  function geoFigura(R) {
    const partes = [];
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 2, 6);
    partes.push(cap(0.14, 0.42));
    partes.push(mover(new THREE.SphereGeometry(0.11, 10, 8), [0, 0.45, 0]));
    // una extremidad = dos cápsulas encadenadas (como un hueso y un antebrazo)
    function miembro(px, py, a1, b1, a2, largo, r) {
      const m1 = new THREE.Matrix4().compose(new THREE.Vector3(px, py, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(b1, 0, a1)), new THREE.Vector3(1, 1, 1));
      const g1 = cap(r, largo); g1.translate(0, -(largo / 2 + r), 0); g1.applyMatrix4(m1);
      const mCodo = m1.clone().multiply(new THREE.Matrix4().makeTranslation(0, -(largo + 2 * r), 0)).multiply(new THREE.Matrix4().makeRotationZ(a2));
      const g2 = cap(r * 0.85, largo); g2.translate(0, -(largo / 2 + r), 0); g2.applyMatrix4(mCodo);
      partes.push(g1, g2);
    }
    [-1, 1].forEach(s => {
      miembro(s * 0.18, 0.26, s * (0.3 + R() * 1.7), (R() - 0.5) * 0.8, s * (R() - 0.3) * 1.2, 0.26, 0.045);   // brazos
      miembro(s * 0.08, -0.26, s * (0.1 + R() * 0.7), (R() - 0.5) * 0.7, -s * R() * 0.9, 0.3, 0.06);          // piernas
    });
    return fusionar(partes);
  }

  AFRAME.registerComponent('incubadora', {
    schema: {
      desde:    { default: 22 },      // z de la entrada (local)
      hasta:    { default: -34 },     // z del fondo
      ancho:    { default: 8 },
      alto:     { default: 3.5 },     // techo bajo = agobio
      parejas:  { default: 9 },       // cápsulas por lado (total = parejas × 2)
      ocupadas: { default: 0.72 },    // fracción de cápsulas con cuerpo dentro
      colores:  { default: '#7dffd8,#ff4fa6,#6fc8ff,#ffc36b' },   // colores de los líquidos
      semilla:  { default: 4 }
    },

    init: function () {
      const d = this.data, R = rng(d.semilla), raiz = new THREE.Group();
      const largo = d.desde - d.hasta, zc = (d.desde + d.hasta) / 2, hx = d.ancho / 2;
      const cols = d.colores.split(',').map(s => s.trim());

      /* ─── 1 · LA SALA: suelo, paredes, techo ─────────────────────────────── */
      const matMuro = mat.estandar('#ffffff', { map: texturaConcreto({ base: '#1d2b2d', mancha: '#0f3a2c', intensidad: 0.9, semilla: 2 }), roughness: 0.95 });
      const caja = (w, h, dp, x, y, z) => { const m = new THREE.Mesh(cajaUV(w, h, dp, 4), matMuro); m.position.set(x, y, z); raiz.add(m); };
      caja(0.4, d.alto + 0.4, largo, -hx - 0.2, d.alto / 2, zc);          // pared izquierda
      caja(0.4, d.alto + 0.4, largo, hx + 0.2, d.alto / 2, zc);           // pared derecha
      caja(d.ancho + 1, 0.4, largo, 0, d.alto + 0.2, zc);                 // techo
      caja(d.ancho + 1, d.alto + 0.4, 0.4, 0, d.alto / 2, d.hasta - 0.2); // fondo
      caja(d.ancho + 1, d.alto + 0.4, 0.4, 0, d.alto / 2, d.desde + 0.2); // atrás de ti

      // suelo de rejilla metálica (se dibuja con un canvas y se repite)
      const texPiso = lienzo(128, 128, (g, w, h) => {
        g.fillStyle = '#070d0f'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#1a3034'; g.lineWidth = 3;
        for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); }
        g.fillStyle = '#0d1a1d'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(i * 32 + 8, j * 32 + 8, 16, 16);
      });
      texPiso.wrapS = texPiso.wrapT = THREE.RepeatWrapping; texPiso.repeat.set(d.ancho / 2, largo / 2);
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(d.ancho, largo), mat.estandar('#ffffff', { map: texPiso, roughness: 0.4, metalness: 0.5 }));
      piso.rotation.x = -Math.PI / 2; piso.position.z = zc; raiz.add(piso);

      /* ─── 2 · AGUJEROS REDONDOS EN LAS PAREDES (como un conducto abandonado) ─── */
      const negros = [], bordes = [], brillosG = [];
      [-1, 1].forEach(lado => {
        for (let i = 0; i < 7; i++) {
          const z = d.desde - 4 - i * (largo - 8) / 6, y = 2.15, x = lado * (hx - 0.01);
          const rot = [0, lado < 0 ? Math.PI / 2 : -Math.PI / 2, 0];            // que miren hacia dentro
          negros.push(mover(new THREE.CircleGeometry(0.5, 20), [x, y, z], rot));
          bordes.push(mover(new THREE.TorusGeometry(0.52, 0.07, 6, 20), [x, y, z], rot));
          if (R() < 0.35) brillosG.push(colorearVertices(mover(new THREE.CircleGeometry(0.44, 16), [x - lado * 0.02, y, z], rot), cols[Math.floor(R() * cols.length)]));
        }
      });
      raiz.add(new THREE.Mesh(fusionar(negros), mat.basico('#000000')));
      raiz.add(new THREE.Mesh(fusionar(bordes), matMuro));
      if (brillosG.length) raiz.add(new THREE.Mesh(fusionar(brillosG), mat.basico('#ffffff', { vertexColors: true, transparent: true, opacity: 0.55 })));

      /* ─── 3 · TUBERÍAS EN EL TECHO + CABLES COLGANDO ────────────────────────── */
      const tubos = [];
      [-3.3, -2.6, -1.4, 1.3, 2.4, 3.3].forEach((x, i) => {
        const r = 0.07 + R() * 0.1, y = d.alto - 0.25 - R() * 0.35;
        tubos.push(colorearVertices(mover(new THREE.CylinderGeometry(r, r, largo, 8, 1), [x, y, zc], [Math.PI / 2, 0, 0]), i % 3 ? '#3b4a4d' : '#4a3a30'));
      });
      raiz.add(new THREE.Mesh(fusionar(tubos), mat.estandar('#ffffff', { vertexColors: true, roughness: 0.6, metalness: 0.5 })));

      /* ─── 4 · LAS CÁPSULAS ─────────────────────────────────────────────────────
         Para cada cápsula creamos sus piezas como GEOMETRÍAS sueltas y las vamos
         metiendo en listas. Al final cada lista se fusiona en UNA sola malla.       */
      const bases = [], neones = [], vidrios = [], liquidos = [], ledsV = [], ledsR = [], tramos = [];
      this.cuerpos = [];
      const matsCuerpo = {};
      const n = d.parejas, paso = (largo - 12) / (n - 1), z0 = d.desde - 6;
      [-1, 1].forEach(lado => {
        for (let i = 0; i < n; i++) {
          const x = lado * 2.65 + (R() - 0.5) * 0.1, z = z0 - i * paso + (R() - 0.5) * 0.2;
          const ocupada = R() < d.ocupadas, col = cols[Math.floor(R() * cols.length)];

          bases.push(mover(new THREE.CylinderGeometry(0.8, 0.85, 0.3, 20), [x, 0.15, z]));    // pedestal
          bases.push(mover(new THREE.CylinderGeometry(0.8, 0.7, 0.35, 20), [x, 2.42, z]));    // tapa superior
          neones.push(colorearVertices(mover(new THREE.CylinderGeometry(0.72, 0.72, 0.05, 24), [x, 0.32, z]), ocupada ? col : '#1a2a2a'));
          vidrios.push(mover(new THREE.CylinderGeometry(0.64, 0.64, 1.95, 24, 1, true), [x, 1.3, z]));
          if (ocupada) {
            liquidos.push(colorearVertices(mover(new THREE.CylinderGeometry(0.6, 0.6, 1.85, 18), [x, 1.25, z]), col));
            // el cuerpo flotando es una malla propia (para poder animarla)
            if (!matsCuerpo[col]) matsCuerpo[col] = mat.basico(new THREE.Color(col).lerp(new THREE.Color('#ffffff'), 0.45), { transparent: true, opacity: 0.55, depthWrite: false });
            const cuerpo = new THREE.Mesh(geoFigura(R), matsCuerpo[col]);
            cuerpo.position.set(x, 1.3, z); cuerpo.scale.setScalar(0.95); cuerpo.rotation.y = R() * 6.28;
            raiz.add(cuerpo);
            this.cuerpos.push({ m: cuerpo, y0: 1.3, fase: R() * 6.28, giro: (R() - 0.5) * 0.0004 });
          }
          const resplandor = halo(col, 3.4, ocupada ? 0.38 : 0.08);
          resplandor.position.set(x, 1.3, z);
          raiz.add(resplandor);

          // 3 cables que suben de la tapa al techo
          for (let k = 0; k < 3; k++) {
            const a = new THREE.Vector3(x + (R() - 0.5) * 0.5, 2.6, z + (R() - 0.5) * 0.5);
            tramos.push({ a: a, b: new THREE.Vector3(a.x + (R() - 0.5) * 1.2, d.alto, a.z + (R() - 0.5) * 1.2), caida: 0.2 + R() * 0.3 });
          }
          // 3 leds en el pedestal (1 rojo, 2 verdes) mirando al pasillo
          for (let k = 0; k < 3; k++) (k === 0 ? ledsR : ledsV).push(mover(new THREE.BoxGeometry(0.05, 0.05, 0.02), [x - lado * 0.86, 0.17, z + (k - 1) * 0.16], [0, Math.PI / 2, 0]));
        }
      });

      const matMetal = mat.estandar('#2a3235', { metalness: 0.7, roughness: 0.45 });
      raiz.add(new THREE.Mesh(fusionar(bases), matMetal));
      raiz.add(new THREE.Mesh(fusionar(neones), mat.basico('#ffffff', { vertexColors: true })));
      raiz.add(new THREE.Mesh(fusionar(vidrios), mat.estandar('#bfeee6', { transparent: true, opacity: 0.16, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })));
      raiz.add(new THREE.Mesh(fusionar(liquidos), mat.basico('#ffffff', { vertexColors: true, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })));
      raiz.add(new THREE.Mesh(cablesColgantes(tramos, 0.03), mat.estandar('#14191a', { roughness: 0.5 })));
      this.matLedR = mat.basico('#ff2a2a'); this.matLedV = mat.basico('#38ff8a');
      raiz.add(new THREE.Mesh(fusionar(ledsR), this.matLedR));
      raiz.add(new THREE.Mesh(fusionar(ledsV), this.matLedV));

      /* ─── 5 · LUCES ──────────────────────────────────────────────────────────── */
      // tubos fluorescentes del techo: algunos están muertos, otros parpadean
      this.tubosLuz = [];
      for (let i = 0; i < 6; i++) {
        const m = mat.basico('#d8fff0');
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 2.2), m);
        t.position.set(0, d.alto - 0.03, d.desde - 5 - i * (largo - 10) / 5);
        raiz.add(t);
        this.tubosLuz.push({ m: m, viva: R() < 0.6, fase: R() * 100 });
      }
      // luces de verdad (pocas: cada una cuesta rendimiento)
      this.luces = [];
      [[d.desde - 8, '#7dffd8'], [zc + 4, '#ff4fa6'], [d.hasta + 14, '#7dffd8'], [d.hasta + 5, '#6fc8ff']].forEach(([z, c], i) => {
        const l = luzPuntual(c, 18, 16); l.position.set(0, d.alto - 0.6, z);
        raiz.add(l); this.luces.push({ l: l, fase: i * 1.7 });
      });

      this.rojoOn = new THREE.Color('#ff2a2a');
      this.el.setObject3D('mesh', raiz);
    },

    tick: function (t) {
      // luces: respiración lenta + caídas bruscas ocasionales (fallo eléctrico)
      this.luces.forEach(o => {
        const base = o.l.userData.base * window.TX.CONFIG.potenciaLuces;
        o.l.intensity = base * (0.82 + 0.18 * Math.sin(t * 0.002 + o.fase)) * (Math.random() < 0.012 ? 0.25 : 1);
      });
      this.tubosLuz.forEach(o => {
        const v = o.viva ? (Math.random() < 0.04 ? 0.15 : 0.9) : 0.06;
        o.m.color.set('#d8fff0').multiplyScalar(v);
      });
      this.matLedR.color.copy(this.rojoOn).multiplyScalar(Math.floor(t / 650) % 2 ? 1 : 0.12);
      this.matLedV.color.set('#38ff8a').multiplyScalar(0.6 + 0.4 * Math.sin(t * 0.004));
      // cuerpos flotando dentro del líquido
      for (let i = 0; i < this.cuerpos.length; i++) {
        const c = this.cuerpos[i];
        c.m.position.y = c.y0 + 0.06 * Math.sin(t * 0.0008 + c.fase);
        c.m.rotation.y += c.giro * 16;
      }
    }
  });
})();
