/* ==========================================================================
   MUNDO 5 · MAUSOLEO
   El interior de la torre: una nave de hormigón enorme y casi a oscuras.
   Cientos de cuerpos robóticos abandonados, amontonados o colgando del techo.
   En el centro, una orbe que te sigue con la mirada.

   Piezas:  salon-brutal · cuerpos-robot · orbe-ojo

   QUÉ APRENDER AQUÍ
     · 220 robots completos (11 piezas cada uno = 2400 piezas) se dibujan con
       solo 8 InstancedMesh. Cada pieza es una matriz 4×4 (posición+giro+escala).
       Las articulaciones se calculan encadenando matrices: brazo = hombro × codo.
     · La mirada de la orbe: Object3D.lookAt(posición de la cámara) en cada tick.
   ========================================================================== */
(function () {
  'use strict';
  const TX = window.TX;
  const { THREE, rng, smoothstep, halo, fusionar, mover, luzPuntual, mat, cajaUV, texturaConcreto, crearRayos } = TX;

  /* ── salon-brutal: la nave (suelo, muros con pilares y balcones, techo con claraboyas) ──
     <a-entity salon-brutal="ancho: 56; largo: 84; alto: 34">                          */
  AFRAME.registerComponent('salon-brutal', {
    schema: {
      ancho: { default: 56 }, largo: { default: 84 }, alto: { default: 34 },
      pilares: { default: 6 },          // pilares por cada lado
      celda: { default: 10 }, huecos: { default: 7 },        // claraboyas del techo
      colorRayo: { default: '#b9e3d4' }, opacidadRayo: { default: 0.16 },
      semilla: { default: 51 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla), raiz = new THREE.Group(), hx = d.ancho / 2, hz = d.largo / 2;
      const tex = texturaConcreto({ base: '#66756f', mancha: '#2f4a3e', intensidad: 1, semilla: 11 });
      const matMuro = mat.estandar('#ffffff', { map: tex, roughness: 0.95 });
      const caja = (w, h, dp, x, y, z, m) => { const o = new THREE.Mesh(cajaUV(w, h, dp, 6), m || matMuro); o.position.set(x, y, z); raiz.add(o); return o; };

      // suelo húmedo y oscuro
      const tSuelo = tex.clone(); tSuelo.repeat.set(d.ancho / 6, d.largo / 6); tSuelo.needsUpdate = true;
      const suelo = new THREE.Mesh(new THREE.PlaneGeometry(d.ancho, d.largo), mat.estandar('#9aa6a2', { map: tSuelo, roughness: 0.35, metalness: 0.3 }));
      suelo.rotation.x = -Math.PI / 2; raiz.add(suelo);

      // muros
      caja(1, d.alto, d.largo, -hx - 0.5, d.alto / 2, 0);
      caja(1, d.alto, d.largo, hx + 0.5, d.alto / 2, 0);
      caja(d.ancho + 2, d.alto, 1, 0, d.alto / 2, -hz - 0.5);
      caja(d.ancho + 2, d.alto, 1, 0, d.alto / 2, hz + 0.5);

      // pilares y balcones escalonados (la arquitectura brutalista de las referencias)
      const bloques = [];
      [-1, 1].forEach(lado => {
        for (let i = 0; i < d.pilares; i++) {
          const z = -hz + (i + 0.5) * d.largo / d.pilares;
          bloques.push(mover(cajaUV(2.6, d.alto, 2.6, 6), [lado * (hx - 1.5), d.alto / 2, z]));
        }
        [8, 16, 24].forEach((y, k) => bloques.push(mover(cajaUV(3 + k * 0.5, 0.8, d.largo - 2, 6), [lado * (hx - 1.5 - k * 0.25), y, 0])));
      });
      raiz.add(new THREE.Mesh(fusionar(bloques), matMuro));

      // techo con claraboyas
      const cols = Math.round(d.ancho / d.celda), filas = Math.round(d.largo / d.celda), cw = d.ancho / cols, cr = d.largo / filas;
      const celdas = [];
      for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) celdas.push([i, j]);
      const huecos = [];
      for (let k = 0; k < d.huecos; k++) huecos.push(celdas.splice(Math.floor(R() * celdas.length), 1)[0]);
      raiz.add(new THREE.Mesh(fusionar(celdas.map(([i, j]) => mover(cajaUV(cw - 0.1, 0.8, cr - 0.1, 6), [-hx + cw * (i + 0.5), d.alto + 0.4, -hz + cr * (j + 0.5)]))), matMuro));
      raiz.add(crearRayos({
        posiciones: huecos.map(([i, j]) => new THREE.Vector3(-hx + cw * (i + 0.5), d.alto, -hz + cr * (j + 0.5))),
        alto: d.alto, ancho: cw * 0.8, inclinacion: -9, color: d.colorRayo, opacidad: d.opacidadRayo
      }));

      // ventana circular enorme en el fondo (por ahí se despierta)
      const rv = 7.5, yv = 8.5;
      const disco = new THREE.Mesh(new THREE.CircleGeometry(rv, 48), mat.basico('#030607')); disco.position.set(0, yv, -hz + 0.05); raiz.add(disco);
      const aro = new THREE.Mesh(new THREE.TorusGeometry(rv + 0.4, 0.7, 10, 56), matMuro); aro.position.set(0, yv, -hz + 0.1); raiz.add(aro);
      const resplandor = halo('#ffd0e0', rv * 3, 0.18); resplandor.position.set(0, yv, -hz + 1); raiz.add(resplandor);

      // luces frías de apoyo (pocas: cada luz real cuesta rendimiento)
      [[-14, 6, 14], [16, 6, -4], [-10, 6, -30]].forEach(([x, y, z]) => { const l = luzPuntual('#7fe0d0', 45, 26); l.position.set(x, y, z); raiz.add(l); });

      this.el.setObject3D('mesh', raiz);
    }
  });

  /* ── cuerpos-robot: cientos de cuerpos robóticos abandonados ────────────────────
     <a-entity cuerpos-robot="cantidad: 220; colgados: 14">
       montones = "x,z,radio,alto; x,z,radio,alto; ..."  (dónde se acumulan)      */
  AFRAME.registerComponent('cuerpos-robot', {
    schema: {
      cantidad:  { default: 220 },
      montones:  { default: '-12,-8,9,2.2; 10,6,8,1.8; -14,16,6,1.4; 14,-18,7,2; 0,-28,9,2.4' },
      colgados:  { default: 14 },
      techo:     { default: 34 },
      area:      { type: 'vec2', default: { x: 44, y: 70 } },     // zona donde cuelgan los de arriba
      visores:   { default: 0.14 },                               // fracción de cabezas con visor encendido
      semilla:   { default: 77 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla), raiz = new THREE.Group();
      const piles = d.montones.split(';').map(s => s.trim().split(',').map(Number));
      const sumR2 = piles.reduce((a, p) => a + p[2] * p[2], 0);

      const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
      const Rot = (x, y, z) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x, y, z));
      const Esc = (x, y, z) => new THREE.Matrix4().makeScale(x, y, z);
      const paleta = ['#d8d4cc', '#b9c2c4', '#e3c6d1', '#8e999c', '#3a3f42', '#cfd6d0'].map(c => new THREE.Color(c));
      const luzVisor = [new THREE.Color('#9fe8ff'), new THREE.Color('#ff3d9a'), new THREE.Color('#ffffff')];
      const apagado = new THREE.Color('#0a0d0e');

      // una lista de matrices + color por cada tipo de pieza
      const P = { torso: [], pelvis: [], cabeza: [], visor: [], brazoA: [], brazoB: [], musloA: [], musloB: [] };
      const C = { torso: [], pelvis: [], cabeza: [], visor: [], brazoA: [], brazoB: [], musloA: [], musloB: [] };
      const add = (k, m, c) => { P[k].push(m); C[k].push(c); };

      // construye UN robot a partir de la matriz de su cuerpo. colgado = brazos flácidos hacia abajo.
      const robot = (root, colgado) => {
        const c = paleta[Math.floor(R() * R() * paleta.length)];
        add('torso', root.clone().multiply(T(0, 0.5, 0)).multiply(Esc(1, 1, 0.6)), c);
        add('pelvis', root.clone(), c);
        const cab = root.clone().multiply(T(0, 1.1, 0)).multiply(Rot((R() - 0.5) * 0.8, (R() - 0.5) * 1.2, (R() - 0.5) * 0.8));
        add('cabeza', cab, c);
        add('visor', cab.clone().multiply(T(0, 0.02, 0.145)), R() < d.visores ? luzVisor[Math.floor(R() * luzVisor.length)] : apagado);
        [-1, 1].forEach(s => {
          // brazo: hombro → codo → antebrazo (cada articulación = una matriz encadenada)
          const az = colgado ? s * (0.05 + R() * 0.3) : s * (0.3 + R() * 2.6), bx = colgado ? (R() - 0.5) * 0.3 : (R() - 0.5) * 1.3;
          const hombro = root.clone().multiply(T(s * 0.28, 0.72, 0)).multiply(Rot(bx, 0, az));
          add('brazoA', hombro.clone().multiply(T(0, -0.21, 0)), c);
          const codo = hombro.clone().multiply(T(0, -0.42, 0)).multiply(Rot(0, 0, s * (colgado ? R() * 0.4 : (R() - 0.2) * 1.8)));
          add('brazoB', codo.clone().multiply(T(0, -0.19, 0)), c);
          // pierna
          const az2 = colgado ? s * (0.03 + R() * 0.2) : s * (0.1 + R() * 1.0), bx2 = colgado ? (R() - 0.5) * 0.2 : (R() - 0.5) * 1.4;
          const cadera = root.clone().multiply(T(s * 0.12, -0.1, 0)).multiply(Rot(bx2, 0, az2));
          add('musloA', cadera.clone().multiply(T(0, -0.28, 0)), c);
          const rodilla = cadera.clone().multiply(T(0, -0.56, 0)).multiply(Rot(-R() * (colgado ? 0.3 : 1.5), 0, 0));
          add('musloB', rodilla.clone().multiply(T(0, -0.25, 0)), c);
        });
      };

      const q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
      // robots caídos, amontonados: más altos hacia el centro de cada montón
      piles.forEach(pl => {
        const n = Math.round(d.cantidad * pl[2] * pl[2] / sumR2);
        for (let i = 0; i < n; i++) {
          const a = R() * 6.283, u = Math.sqrt(R()), x = pl[0] + Math.cos(a) * u * pl[2], z = pl[1] + Math.sin(a) * u * pl[2];
          const y = 0.22 + Math.pow(1 - u, 1.5) * R() * pl[3];
          e.set((R() < 0.5 ? 1 : -1) * (Math.PI / 2 + (R() - 0.5) * 0.9), R() * 6.283, (R() - 0.5) * 1.2, 'YXZ');   // tumbados
          q.setFromEuler(e);
          robot(new THREE.Matrix4().compose(pv.set(x, y, z), q, one), false);
        }
      });

      // robots colgados del techo por un cable
      const lineas = [];
      for (let i = 0; i < d.colgados; i++) {
        const x = (R() - 0.5) * d.area.x, z = (R() - 0.5) * d.area.y, y = 7 + R() * 14;
        e.set((R() - 0.5) * 0.3, R() * 6.283, (R() - 0.5) * 0.3, 'YXZ'); q.setFromEuler(e);
        robot(new THREE.Matrix4().compose(pv.set(x, y, z), q, one), true);
        lineas.push(x, y + 1.3, z, x, d.techo, z);
      }
      if (lineas.length) {
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(lineas, 3));
        raiz.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#1a1f21' })));
      }

      // geometrías base y InstancedMesh (8 llamadas de dibujo para todo)
      const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 3, 7);
      const matR = mat.estandar('#ffffff', { roughness: 0.45, metalness: 0.5 });
      const geos = {
        torso: cap(0.2, 0.35), pelvis: new THREE.BoxGeometry(0.38, 0.2, 0.24), cabeza: new THREE.SphereGeometry(0.15, 12, 10),
        visor: new THREE.BoxGeometry(0.22, 0.04, 0.06), brazoA: cap(0.06, 0.3), brazoB: cap(0.05, 0.28), musloA: cap(0.09, 0.38), musloB: cap(0.07, 0.36)
      };
      Object.keys(P).forEach(k => {
        const im = new THREE.InstancedMesh(geos[k], k === 'visor' ? new THREE.MeshBasicMaterial({ color: '#ffffff' }) : matR, P[k].length);
        P[k].forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, C[k][i]); });
        im.frustumCulled = false; raiz.add(im);
      });
      this.el.setObject3D('mesh', raiz);
    }
  });

  /* ── orbe-ojo: una esfera con un ojo que SIEMPRE te mira ───────────────────────
     <a-entity orbe-ojo="radio: 1.6" position="0 3.4 -10">
     La clave está en tick(): ojo.lookAt(cámara) cada fotograma.                 */
  AFRAME.registerComponent('orbe-ojo', {
    schema: {
      radio: { default: 1.6 }, color: { default: '#ff3d9a' }, iris: { default: '#9fe8ff' },
      flotar: { default: 0.25 }                        // cuánto sube y baja
    },
    init: function () {
      const d = this.data, r = d.radio, raiz = new THREE.Group();
      this.cuerpo = new THREE.Group(); raiz.add(this.cuerpo);

      // esclerótica brillante
      this.cuerpo.add(new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), mat.estandar('#efe4ea', { roughness: 0.2, metalness: 0.1, emissive: d.color, emissiveIntensity: 0.28 })));

      // el ojo: tres casquetes esféricos (aro oscuro, iris, pupila) que miran hacia +Z
      this.ojo = new THREE.Group();
      const casquete = (radio, ang, color) => {
        const g = new THREE.SphereGeometry(radio, 40, 16, 0, Math.PI * 2, 0, ang); g.rotateX(Math.PI / 2);   // el polo apunta a +Z
        return new THREE.Mesh(g, mat.basico(color));
      };
      this.ojo.add(casquete(r * 1.006, 0.68, '#0b3340'));
      this.ojo.add(casquete(r * 1.012, 0.6, d.iris));
      this.ojo.add(casquete(r * 1.016, 0.46, '#2d8fa8'));
      this.pupila = casquete(r * 1.022, 0.2, '#000000'); this.ojo.add(this.pupila);
      this.cuerpo.add(this.ojo);

      // anillos giroscópicos
      this.anillos = [0, 1].map(i => {
        const t = new THREE.Mesh(new THREE.TorusGeometry(r * (1.45 + i * 0.2), 0.022, 8, 80), mat.basico(i ? d.iris : d.color, { transparent: true, opacity: 0.8 }));
        t.rotation.set(i * 1.2, 0.4 * i, i * 0.5); this.cuerpo.add(t); return t;
      });
      this.cuerpo.add(halo(d.color, r * 7, 0.4));
      const luz = luzPuntual(d.color, 150, 34); raiz.add(luz);

      // círculos de luz sobre el suelo, debajo de la orbe
      const yPos = (this.el.getAttribute('position') || { y: 3.4 }).y;
      this.aros = [2.4, 3.6, 5].map((rad, i) => {
        const a = new THREE.Mesh(new THREE.RingGeometry(rad, rad + 0.08, 64), mat.basico(d.color, { transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
        a.rotation.x = -Math.PI / 2; a.position.y = -yPos + 0.04; raiz.add(a); return a;
      });

      this.pos = new THREE.Vector3(); this.cam = new THREE.Vector3(); this.proxParpadeo = 3000;
      this.el.setObject3D('mesh', raiz);
    },
    tick: function (t, dt) {
      const camObj = this.el.sceneEl.camera;
      if (!camObj) return;
      camObj.getWorldPosition(this.cam);
      this.ojo.getWorldPosition(this.pos);
      this.ojo.lookAt(this.cam);                                                // ← la mirada
      const dist = this.pos.distanceTo(this.cam);
      const s = 0.75 + 0.75 * (1 - smoothstep(4, 30, dist));                     // la pupila se dilata al acercarte
      this.pupila.scale.set(s, s, 1);

      this.cuerpo.position.y = this.data.flotar * Math.sin(t * 0.0008);          // flota
      this.anillos[0].rotation.y += dt * 0.0006; this.anillos[1].rotation.x -= dt * 0.0004;
      this.aros.forEach((a, i) => { a.material.opacity = 0.25 + 0.2 * Math.sin(t * 0.0015 - i); });

      // parpadeo ocasional
      this.proxParpadeo -= dt;
      if (this.proxParpadeo < 0) {
        const u = -this.proxParpadeo / 180;                                      // 0 → 1 durante el parpadeo
        this.ojo.scale.y = Math.max(0.06, Math.abs(1 - 2 * u));
        if (u >= 1) { this.ojo.scale.y = 1; this.proxParpadeo = 3000 + Math.random() * 5000; }
      }
    }
  });
})();
