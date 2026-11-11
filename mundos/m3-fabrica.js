/* ==========================================================================
   MUNDO 3 · FÁBRICA
   El interior de una nave industrial abandonada. Frío, húmedo, lleno de
   tuberías, cables y ordenadores viejos. La luz del sol entra por el techo roto
   y por los agujeros redondos de la pared.

   Piezas:  fabrica · racks-pc · tuberias   (+ cableado, planta, brillos y
            rayos-luz que vienen del núcleo c.js)

   QUÉ APRENDER AQUÍ
     · Rayos de luz falsos: láminas con degradado que SUMAN luz (crearRayos).
       Mucho más baratos que luces/sombras reales y se ven igual de bien.
     · InstancedMesh con materiales distintos por cara (los racks).
     · Tuberías: una polilínea con esquinas redondeadas → TubeGeometry.
   ========================================================================== */
(function () {
  'use strict';
  const TX = window.TX;
  const { THREE, rng, lienzo, texturaBrillo, halo, fusionar, colorearVertices, mover, cablesColgantes, mat, cajaUV, texturaConcreto, texturaEstatica, crearRayos } = TX;

  /* ── fabrica: la nave (suelo, muros, techo con huecos, vigas, rayos de sol) ───
     <a-entity fabrica="ancho: 46; largo: 66; alto: 15; huecos: 9">              */
  AFRAME.registerComponent('fabrica', {
    schema: {
      ancho: { default: 46 }, largo: { default: 66 }, alto: { default: 15 },
      celda: { default: 8 },             // tamaño de cada panel del techo
      huecos: { default: 9 },            // paneles que faltan (por ahí entra el sol)
      inclinacion: { default: -14 },     // ángulo del sol (grados)
      colorRayo: { default: '#e6f6ff' },
      opacidadRayo: { default: 0.17 },
      semilla: { default: 31 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla), raiz = new THREE.Group(), hx = d.ancho / 2, hz = d.largo / 2;

      /* 1 · suelo y muros de hormigón frío con musgo */
      const texF = texturaConcreto({ base: '#5e6b70', mancha: '#3f6a52', intensidad: 1, semilla: 6 });
      const matMuro = mat.estandar('#ffffff', { map: texF, roughness: 1 });
      const suelo = new THREE.Mesh(new THREE.PlaneGeometry(d.ancho, d.largo), (() => {
        const t = texF.clone(); t.repeat.set(d.ancho / 6, d.largo / 6); t.needsUpdate = true;
        return mat.estandar('#ffffff', { map: t, roughness: 0.8 });
      })());
      suelo.rotation.x = -Math.PI / 2; raiz.add(suelo);
      const muro = (w, h, dp, x, y, z) => { const m = new THREE.Mesh(cajaUV(w, h, dp, 6), matMuro); m.position.set(x, y, z); raiz.add(m); };
      muro(0.6, d.alto, d.largo, -hx - 0.3, d.alto / 2, 0);
      muro(0.6, d.alto, d.largo, hx + 0.3, d.alto / 2, 0);
      muro(d.ancho + 1.2, d.alto, 0.6, 0, d.alto / 2, -hz - 0.3);
      muro(d.ancho + 1.2, d.alto, 0.6, 0, d.alto / 2, hz + 0.3);

      // charcos oscuros y brillantes
      const charcos = [];
      for (let i = 0; i < 6; i++) charcos.push(mover(new THREE.CircleGeometry(1, 20), [(R() - 0.5) * (d.ancho - 8), 0.025, (R() - 0.5) * (d.largo - 8)], [-Math.PI / 2, 0, 0], [2 + R() * 3, 2 + R() * 2.5, 1]));
      raiz.add(new THREE.Mesh(fusionar(charcos), mat.estandar('#0f1d24', { roughness: 0.05, metalness: 0.9, emissive: '#0b2a33', emissiveIntensity: 0.5 })));

      /* 2 · techo: rejilla de paneles; los que faltan son los huecos del sol */
      const cols = Math.round(d.ancho / d.celda), filas = Math.round(d.largo / d.celda);
      const cw = d.ancho / cols, cr = d.largo / filas;
      const celdas = [];
      for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) celdas.push([i, j]);
      const huecos = [];
      for (let k = 0; k < d.huecos && celdas.length; k++) huecos.push(celdas.splice(Math.floor(R() * celdas.length), 1)[0]);
      const paneles = celdas.map(([i, j]) => mover(cajaUV(cw - 0.1, 0.4, cr - 0.1, 6), [-hx + cw * (i + 0.5), d.alto + 0.2, -hz + cr * (j + 0.5)]));
      raiz.add(new THREE.Mesh(fusionar(paneles), matMuro));

      // vigas de acero
      const vigas = [];
      for (let j = 0; j <= filas; j++) vigas.push(mover(new THREE.BoxGeometry(d.ancho, 0.6, 0.5), [0, d.alto - 0.3, -hz + j * cr]));
      for (let i = 0; i <= cols; i++) vigas.push(mover(new THREE.BoxGeometry(0.5, 0.6, d.largo), [-hx + i * cw, d.alto - 0.3, 0]));
      raiz.add(new THREE.Mesh(fusionar(vigas), mat.estandar('#2b3438', { metalness: 0.7, roughness: 0.55 })));

      /* 3 · rayos de sol que entran por los huecos + manchas de luz en el suelo */
      const posiciones = huecos.map(([i, j]) => new THREE.Vector3(-hx + cw * (i + 0.5), d.alto, -hz + cr * (j + 0.5)));
      raiz.add(crearRayos({ posiciones: posiciones, alto: d.alto, ancho: cw * 0.85, inclinacion: d.inclinacion, color: d.colorRayo, opacidad: d.opacidadRayo }));
      const desplaza = d.alto * Math.tan(d.inclinacion * Math.PI / 180);                  // cuánto se corre el rayo al llegar al suelo
      const mancha = new THREE.PlaneGeometry(cw * 1.2, cr * 1.1);
      const matMancha = new THREE.MeshBasicMaterial({ map: texturaBrillo(), color: d.colorRayo, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
      posiciones.forEach(p => { const m = new THREE.Mesh(mancha, matMancha); m.rotation.x = -Math.PI / 2; m.position.set(p.x + desplaza, 0.04, p.z); raiz.add(m); });
      this.posRayos = posiciones.map(p => new THREE.Vector3(p.x + desplaza, 0, p.z));

      /* 4 · agujeros redondos en el muro este por donde entra la luz */
      const discos = [], bordes = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
        const y = 6 + r * 4, z = -hz + 8 + c * ((d.largo - 16) / 5), x = hx - 0.02;
        discos.push(mover(new THREE.CircleGeometry(1.1, 24), [x, y, z], [0, -Math.PI / 2, 0]));
        bordes.push(mover(new THREE.TorusGeometry(1.15, 0.12, 6, 24), [x, y, z], [0, -Math.PI / 2, 0]));
        if (r === 0 && c % 2 === 0) { const h = halo('#dff6ff', 7, 0.35); h.position.set(x - 0.5, y, z); raiz.add(h); }
      }
      raiz.add(new THREE.Mesh(fusionar(discos), mat.basico('#e8f7ff', { fog: false })));
      raiz.add(new THREE.Mesh(fusionar(bordes), matMuro));

      /* 5 · tanque central con pasarela */
      const tx = 8, tz = -6, tanque = new THREE.Group(); tanque.position.set(tx, 0, tz);
      const matTanque = mat.estandar('#4d6a6c', { roughness: 0.75, metalness: 0.4 });
      const cil = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 9, 28), matTanque); cil.position.y = 4.5; tanque.add(cil);
      [1.5, 4.5, 7.5].forEach(y => { const b = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.12, 6, 28), mat.estandar('#2a3436', { metalness: 0.7 })); b.rotation.x = Math.PI / 2; b.position.y = y; tanque.add(b); });
      const reja = lienzo(64, 64, (g, w, h) => { g.fillStyle = '#10181a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2f4246'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 16); g.lineTo(w, i * 16); g.stroke(); } });
      reja.wrapS = reja.wrapT = THREE.RepeatWrapping; reja.repeat.set(6, 6);
      const pasarela = new THREE.Mesh(new THREE.RingGeometry(3.3, 5.3, 36), mat.estandar('#ffffff', { map: reja, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.5 }));
      pasarela.rotation.x = -Math.PI / 2; pasarela.position.y = 5.5; tanque.add(pasarela);
      const baranda = new THREE.Mesh(new THREE.TorusGeometry(5.25, 0.05, 5, 40), mat.estandar('#2a3436', { metalness: 0.7 })); baranda.rotation.x = Math.PI / 2; baranda.position.y = 6.5; tanque.add(baranda);
      const escalera = [];
      escalera.push(mover(new THREE.BoxGeometry(0.08, 5.5, 0.08), [-0.25, 2.75, 5.3]), mover(new THREE.BoxGeometry(0.08, 5.5, 0.08), [0.25, 2.75, 5.3]));
      for (let k = 0; k < 11; k++) escalera.push(mover(new THREE.BoxGeometry(0.5, 0.05, 0.05), [0, 0.3 + k * 0.5, 5.3]));
      tanque.add(new THREE.Mesh(fusionar(escalera), mat.estandar('#2a3436', { metalness: 0.7 })));
      raiz.add(tanque);

      this.el.setObject3D('mesh', raiz);
    }
  });

  /* ── racks-pc: filas de servidores y mesas con monitores antiguos ───────────────
     <a-entity racks-pc="filas: 2; porFila: 7" position="-6 0 10">               */
  AFRAME.registerComponent('racks-pc', {
    schema: {
      filas: { default: 2 }, porFila: { default: 7 }, separacion: { default: 2.2 }, pasillo: { default: 5 },
      monitores: { default: 12 }, derribados: { default: 3 }, semilla: { default: 14 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla), raiz = new THREE.Group();

      /* RACKS: cajas oscuras con panel de ledes. Una textura dibujada a mano; el
         material tiene un arreglo de 6 (una por cara) para que solo el frente brille. */
      const texPanel = lienzo(128, 256, (g, w, h) => {
        g.fillStyle = '#0c1114'; g.fillRect(0, 0, w, h);
        for (let r = 0; r < 12; r++) { g.fillStyle = '#141d22'; g.fillRect(8, 10 + r * 20, w - 16, 14); }
        const cs = ['#38ff8a', '#7fe3ff', '#ff4a4a', '#ffbf4a'];
        for (let i = 0; i < 60; i++) { g.fillStyle = cs[Math.floor(R() * cs.length)]; g.fillRect(12 + R() * (w - 28), 12 + Math.floor(R() * 12) * 20, 3, 3); }
      });
      const lado = mat.estandar('#1a2024', { metalness: 0.6, roughness: 0.5 });
      const frente = mat.estandar('#ffffff', { map: texPanel, emissive: '#ffffff', emissiveMap: texPanel, emissiveIntensity: 0.9, roughness: 0.6 });
      const geoRack = new THREE.BoxGeometry(0.9, 2.2, 0.9); geoRack.translate(0, 1.1, 0);
      const racks = [];
      for (let f = 0; f < d.filas; f++) for (let i = 0; i < d.porFila; i++) {
        if (R() < 0.1) continue;
        const z = (f - (d.filas - 1) / 2) * (d.pasillo + 1);
        racks.push({ x: (i - (d.porFila - 1) / 2) * d.separacion, z: z, yaw: f % 2 ? 0 : Math.PI });   // las filas se miran entre sí
      }
      const inst = new THREE.InstancedMesh(geoRack, [lado, lado, lado, lado, frente, frente], racks.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
      racks.forEach((r, i) => {
        const caido = i < d.derribados;                                           // los primeros están tumbados
        e.set(0, r.yaw + (R() - 0.5) * 0.15, caido ? Math.PI / 2 * (R() < 0.5 ? 1 : -1) : 0); q.setFromEuler(e);
        p.set(r.x, caido ? 0.45 : 0, r.z + (caido ? (R() - 0.5) * 2 : 0));
        m4.compose(p, q, s); inst.setMatrixAt(i, m4);
      });
      inst.frustumCulled = false; raiz.add(inst);

      /* MESAS con MONITORES (3 InstancedMesh: mesas, cuerpos, pantallas) */
      const n = d.monitores;
      const mesas = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.75, 0.8), mat.estandar('#3a4144', { roughness: 0.8 }), n);
      const cuerpos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.42, 0.46), mat.estandar('#b7b19f', { roughness: 0.8 }), n);
      this.estatica = texturaEstatica();
      const pantallas = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.38, 0.29), new THREE.MeshBasicMaterial({ map: this.estatica.textura }), n);
      const cc = new THREE.Color(), tonos = ['#ffffff', '#9fd8ff', '#555555', '#000000'];
      for (let i = 0; i < n; i++) {
        const x = (R() - 0.5) * (d.separacion * d.porFila + 4), z = (R() < 0.5 ? -1 : 1) * (d.pasillo / 2 + 1.5 + R() * 3.5), yaw = (z > 0 ? Math.PI : 0) + (R() - 0.5) * 0.7;
        e.set(0, yaw, 0); q.setFromEuler(e);
        p.set(x, 0.375, z); m4.compose(p, q, s); mesas.setMatrixAt(i, m4);
        const cos = Math.cos(yaw), sen = Math.sin(yaw);
        p.set(x, 0.96, z); m4.compose(p, q, s); cuerpos.setMatrixAt(i, m4);
        p.set(x + sen * 0.235, 0.98, z + cos * 0.235); m4.compose(p, q, s); pantallas.setMatrixAt(i, m4);
        pantallas.setColorAt(i, cc.set(tonos[Math.floor(R() * tonos.length)]));      // algunas apagadas, otras azuladas
      }
      [mesas, cuerpos, pantallas].forEach(o => { o.frustumCulled = false; raiz.add(o); });

      /* CABLES por el suelo: salen de lo alto de un rack y serpentean por el suelo */
      const tr = [], tr2 = [];
      racks.slice(d.derribados).forEach(r => {
        if (R() < 0.5) return;
        const a = new THREE.Vector3(r.x, 2.15, r.z), b = new THREE.Vector3(r.x + (R() - 0.5) * 6, 0.04, r.z + (R() - 0.5) * 5);
        (R() < 0.2 ? tr2 : tr).push({ a: a, b: b, medio: new THREE.Vector3((a.x + b.x) / 2 + (R() - 0.5) * 2, 0.05, (a.z + b.z) / 2) });
      });
      if (tr.length)  raiz.add(new THREE.Mesh(cablesColgantes(tr, 0.035), mat.estandar('#101415', { roughness: 0.5 })));
      if (tr2.length) raiz.add(new THREE.Mesh(cablesColgantes(tr2, 0.035), mat.basico('#ff4a6a')));

      this.t = 0;
      this.el.setObject3D('mesh', raiz);
    },
    tick: function (t, dt) {
      this.t += dt;
      if (this.t > 120) { this.t = 0; this.estatica.actualizar(); }     // el ruido se redibuja ~8 veces por segundo
    }
  });

  /* ── tuberias: haces de tubos con esquinas redondeadas por toda la nave ──────────
     <a-entity tuberias="cantidad: 14; ancho: 44; largo: 62; alto: 14">           */
  AFRAME.registerComponent('tuberias', {
    schema: {
      cantidad: { default: 14 }, ancho: { default: 44 }, largo: { default: 62 }, alto: { default: 14 },
      columnas: { default: 8 }, semilla: { default: 19 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla), V = (x, y, z) => new THREE.Vector3(x, y, z);
      const geos = [], colores = ['#47585b', '#5b4a3a', '#2f4a4a', '#7e8a8c', '#3b3f44'];
      const hx = d.ancho / 2 - 0.8, hz = d.largo / 2 - 0.8;

      // un tubo = recorrido de segmentos rectos; en cada esquina se redondea con una curva de Bézier
      function tubo(puntos, radio) {
        const esq = 0.8 + radio * 2, cp = new THREE.CurvePath();
        let prev = puntos[0].clone();
        for (let i = 1; i < puntos.length - 1; i++) {
          const p = puntos[i], a = p.clone().sub(puntos[i - 1]).normalize(), b = puntos[i + 1].clone().sub(p).normalize();
          const antes = p.clone().addScaledVector(a, -esq), despues = p.clone().addScaledVector(b, esq);
          cp.add(new THREE.LineCurve3(prev, antes)); cp.add(new THREE.QuadraticBezierCurve3(antes, p, despues)); prev = despues;
        }
        cp.add(new THREE.LineCurve3(prev, puntos[puntos.length - 1]));
        return new THREE.TubeGeometry(cp, puntos.length * 14, radio, 8, false);
      }

      for (let i = 0; i < d.cantidad; i++) {
        // recorrido aleatorio por ejes: arranca en un muro y gira en X, Y o Z
        const lado = R() < 0.5 ? -1 : 1;
        let x = lado * hx, y = 2 + R() * (d.alto - 4), z = (R() - 0.5) * (d.largo - 10);
        const pts = [V(x, y, z)], ejes = ['z', 'y', 'x', 'z', 'y'];
        let eje = ejes[Math.floor(R() * 3)];
        for (let k = 0; k < 4; k++) {
          const largoSeg = 5 + R() * 10, sg = R() < 0.5 ? -1 : 1;
          if (eje === 'x') x = Math.max(-hx, Math.min(hx, x + (lado > 0 ? -1 : 1) * largoSeg));
          if (eje === 'y') y = Math.max(1, Math.min(d.alto - 1.2, y + sg * largoSeg * 0.6));
          if (eje === 'z') z = Math.max(-hz, Math.min(hz, z + sg * largoSeg));
          const ult = pts[pts.length - 1];
          if (ult.distanceTo(V(x, y, z)) > 2.5) pts.push(V(x, y, z));
          eje = ['x', 'y', 'z'].filter(a => a !== eje)[Math.floor(R() * 2)];
        }
        if (pts.length >= 3) geos.push(colorearVertices(tubo(pts, 0.1 + R() * 0.2), colores[Math.floor(R() * colores.length)]));
      }
      // columnas verticales suelo→techo (haces de 2-3 tubos)
      for (let i = 0; i < d.columnas; i++) {
        const x = (R() - 0.5) * (d.ancho - 6), z = (R() - 0.5) * (d.largo - 6), n = 2 + Math.floor(R() * 2);
        for (let k = 0; k < n; k++) {
          const r = 0.12 + R() * 0.16;
          geos.push(colorearVertices(mover(new THREE.CylinderGeometry(r, r, d.alto, 10, 1), [x + k * 0.45, d.alto / 2, z + (R() - 0.5) * 0.3]), colores[Math.floor(R() * colores.length)]));
        }
      }
      // todas las geometrías deben tener los mismos atributos antes de fusionarse
      this.el.setObject3D('mesh', new THREE.Mesh(fusionar(geos), mat.estandar('#ffffff', { vertexColors: true, roughness: 0.55, metalness: 0.6 })));
    }
  });
})();
