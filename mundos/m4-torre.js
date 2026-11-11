/* ==========================================================================
   MUNDO 4 · LA TORRE (exterior)
   Estás en una plaza de hormigón, al pie de una torre que se pierde en la
   niebla. Solo puedes mirar hacia arriba. Al fondo, una puerta circular.

   Piezas:  torre · plaza · ciudad-lejana · reflectores

   QUÉ APRENDER AQUÍ
     · Sensación de escala: la niebla (en el <a-entity mundo>) esconde la cima.
       Si bajas la densidad, la torre se ve entera; si la subes, es infinita.
     · Una sola textura de ventanas, con UV en metros (cajaUV), sirve para
       todos los pisos de la torre sin deformarse.
     · ~300 aletas verticales = 1 InstancedMesh; los neones = otro.
   ========================================================================== */
(function () {
  'use strict';
  const TX = window.TX;
  const { THREE, rng, lienzo, halo, fusionar, colorearVertices, mover, mat, cajaUV, texturaConcreto, texturaBrillo } = TX;

  /* ── torre ─────────────────────────────────────────────────────────────────────
     <a-entity torre="pisos: 70:70,58:100,46:110,34:120" position="0 0 -110">
       pisos = lista "ancho:alto" de abajo hacia arriba (cada piso más estrecho)
       La cara frontal del piso inferior queda en  z = +ancho/2  (local).       */
  AFRAME.registerComponent('torre', {
    schema: {
      pisos:   { default: '70:70,58:100,46:110,34:120' },
      aletas:  { default: true },
      puerta:  { default: 12.5 },                       // radio de la puerta circular de la base
      colorLuz: { default: '#ff3d9a' },
      semilla: { default: 41 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla), raiz = new THREE.Group();
      const pisos = d.pisos.split(',').map(s => { const [w, h] = s.split(':').map(Number); return { w: w, h: h }; });

      /* textura de ventanas (1 repetición = 24 m): fondo oscuro + ventanas encendidas al azar */
      const luces = ['#ffcf7a', '#9fe8ff', '#ff7fb5', '#fff1c4'];
      const texV = lienzo(256, 256, (g, w, h) => {
        g.fillStyle = '#0a0f12'; g.fillRect(0, 0, w, h);
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
          g.fillStyle = '#10181c'; g.fillRect(c * 32 + 3, r * 32 + 5, 26, 20);
          if (R() < 0.1) { g.fillStyle = luces[Math.floor(R() * luces.length)]; g.fillRect(c * 32 + 5, r * 32 + 7, 22, 16); }
        }
        g.fillStyle = '#05080a'; for (let r = 0; r < 8; r++) g.fillRect(0, r * 32 + 28, w, 3);       // forjados
      });
      texV.wrapS = texV.wrapT = THREE.RepeatWrapping;
      const matTorre = mat.estandar('#8e9ca3', { map: texV, emissive: '#ffffff', emissiveMap: texV, emissiveIntensity: 0.9, roughness: 0.85, metalness: 0.2 });

      let y0 = 0;
      const aletas = [], neon = [];
      pisos.forEach((p, idx) => {
        const m = new THREE.Mesh(cajaUV(p.w, p.h, p.w, 24), matTorre);
        m.position.y = y0 + p.h / 2; raiz.add(m);
        if (d.aletas) {
          const n = Math.floor(p.w / 3.2);
          for (let i = 0; i < n; i++) {
            const u = -p.w / 2 + (i + 0.5) * p.w / n, off = p.w / 2 + 0.4, yc = y0 + p.h / 2;
            aletas.push([u, yc, off, p.h, 0], [u, yc, -off, p.h, 0], [off, yc, u, p.h, 1], [-off, yc, u, p.h, 1]);
            if (R() < 0.14) neon.push([u + 0.9, yc, off + 0.95, p.h, 0], [off + 0.95, yc, u + 0.9, p.h, 1]);
          }
        }
        y0 += p.h;
      });
      this.altura = y0;

      // aletas: cajas verticales instanciadas. [x, y, z, alto, orientación]
      const caja = new THREE.BoxGeometry(1, 1, 1);
      const matAleta = mat.estandar('#ffffff', { map: texturaConcreto({ base: '#4b4f52', mancha: '#222a2c', semilla: 3 }), roughness: 0.9 });
      const inst = new THREE.InstancedMesh(caja, matAleta, aletas.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pp = new THREE.Vector3(), s = new THREE.Vector3(), cc = new THREE.Color();
      aletas.forEach((a, i) => {
        pp.set(a[0], a[1], a[2]); s.set(a[4] ? 1.8 : 0.9, a[3], a[4] ? 0.9 : 1.8);
        m4.compose(pp, q, s); inst.setMatrixAt(i, m4);
        inst.setColorAt(i, cc.setHSL(0.55, 0.05, 0.25 + R() * 0.25));
      });
      inst.frustumCulled = false; raiz.add(inst);

      // tiras de neón entre las aletas
      const neones = new THREE.InstancedMesh(caja, new THREE.MeshBasicMaterial({ color: '#ffffff' }), neon.length);
      neon.forEach((a, i) => {
        pp.set(a[0], a[1], a[2]); s.set(0.22, a[3] * 0.96, 0.22);
        m4.compose(pp, q, s); neones.setMatrixAt(i, m4);
        neones.setColorAt(i, cc.set(R() < 0.6 ? d.colorLuz : '#9fe8ff'));
      });
      neones.frustumCulled = false; raiz.add(neones);

      // aguja superior y balizas rojas que parpadean
      const ultimo = pisos[pisos.length - 1];
      const aguja = new THREE.Mesh(new THREE.ConeGeometry(3, 70, 8), mat.estandar('#2a3033', { metalness: 0.6, roughness: 0.5 }));
      aguja.position.y = y0 + 35; raiz.add(aguja);
      this.balizas = [];
      let yb = 0;
      pisos.forEach((p, idx) => {
        yb += p.h;
        if (idx < 2) return;
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
          const h = halo('#ff2a2a', 9, 0.9); h.position.set(sx * p.w / 2, yb + 1, sz * p.w / 2); raiz.add(h);
          this.balizas.push({ h: h, fase: R() * 6.28 });
        });
      });
      const hp = halo('#ff2a2a', 16, 1); hp.position.y = y0 + 70; raiz.add(hp); this.balizas.push({ h: hp, fase: 0 });

      // puerta circular gigante en la base (el portal vive aquí)
      const w0 = pisos[0].w, zf = w0 / 2 + 2.4, ry = d.puerta, cy = ry + 0.6;
      const disco = new THREE.Mesh(new THREE.CircleGeometry(ry, 48), mat.basico('#010203'));
      disco.position.set(0, cy, zf); raiz.add(disco);
      const aro = new THREE.Mesh(new THREE.TorusGeometry(ry + 0.7, 1.1, 10, 56), mat.estandar('#3a3f42', { roughness: 0.8 })); aro.position.set(0, cy, zf); raiz.add(aro);
      const aroLuz = new THREE.Mesh(new THREE.TorusGeometry(ry + 0.05, 0.12, 8, 56), mat.basico(d.colorLuz, { blending: THREE.AdditiveBlending, transparent: true })); aroLuz.position.set(0, cy, zf + 0.1); raiz.add(aroLuz);
      const brilloPuerta = halo(d.colorLuz, ry * 3.4, 0.3); brilloPuerta.position.set(0, cy, zf + 1); raiz.add(brilloPuerta);

      this.el.setObject3D('mesh', raiz);
    },
    tick: function (t) {
      this.balizas.forEach(b => { b.h.material.opacity = Math.sin(t * 0.003 + b.fase) > 0.2 ? 0.95 : 0.12; });   // parpadeo rojo
    }
  });

  /* ── plaza: suelo de losas, charcos, bolardos con luz y bloques de hormigón ──────
     <a-entity plaza="bolardos: 14">                                              */
  AFRAME.registerComponent('plaza', {
    schema: {
      tamano:   { default: 700 },
      bolardos: { default: 14 },
      pasillo:  { default: 6 },                   // separación de las dos filas de bolardos
      desde:    { default: -22 }, hasta: { default: -72 },    // tramo de z con bolardos
      bloques:  { default: 30 },
      colorLuz: { default: '#ff7fb5' },
      semilla:  { default: 44 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla), raiz = new THREE.Group();

      // losas grandes (1 repetición = 8 m) con manchas y juntas
      const tex = lienzo(256, 256, (g, w, h) => {
        g.fillStyle = '#26222a'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 2500; i++) { g.fillStyle = 'rgba(' + (R() < 0.5 ? '0,0,0,' : '255,255,255,') + R() * 0.06 + ')'; g.fillRect(R() * w, R() * h, 2, 2); }
        for (let i = 0; i < 6; i++) { const x = R() * w, y = R() * h, gr = g.createRadialGradient(x, y, 0, x, y, 40 + R() * 40); gr.addColorStop(0, 'rgba(10,8,12,0.5)'); gr.addColorStop(1, 'rgba(10,8,12,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
        g.strokeStyle = '#0c0a0e'; g.lineWidth = 4; g.strokeRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,127,181,0.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
      });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(d.tamano / 8, d.tamano / 8);
      const suelo = new THREE.Mesh(new THREE.PlaneGeometry(d.tamano, d.tamano), mat.estandar('#ffffff', { map: tex, roughness: 0.55, metalness: 0.25 }));
      suelo.rotation.x = -Math.PI / 2; raiz.add(suelo);

      // charcos que reflejan el cielo (brillo falso con emisión)
      const ch = [];
      for (let i = 0; i < 14; i++) ch.push(mover(new THREE.CircleGeometry(1, 20), [(R() - 0.5) * 70, 0.03, 10 - R() * 85], [-Math.PI / 2, 0, 0], [2 + R() * 5, 1.5 + R() * 3, 1]));
      raiz.add(new THREE.Mesh(fusionar(ch), mat.estandar('#2a2030', { roughness: 0.04, metalness: 0.9, emissive: '#5a3a56', emissiveIntensity: 0.55 })));

      // bolardos a ambos lados del camino hacia la puerta
      const cuerpo = [], punta = [];
      for (let i = 0; i < d.bolardos; i++) [-1, 1].forEach(lado => {
        const z = d.desde + (d.hasta - d.desde) * i / (d.bolardos - 1), x = lado * d.pasillo / 2 * (1 + (i % 2) * 0.15);
        cuerpo.push(mover(new THREE.CylinderGeometry(0.22, 0.28, 1, 8), [x, 0.5, z]));
        punta.push(mover(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 8), [x, 1.04, z]));
        if (i % 2 === 0) { const h = halo(d.colorLuz, 3.2, 0.5); h.position.set(x, 1.2, z); raiz.add(h); }
      });
      raiz.add(new THREE.Mesh(fusionar(cuerpo), mat.estandar('#2d2b30', { roughness: 0.8 })));
      raiz.add(new THREE.Mesh(fusionar(punta), mat.basico(d.colorLuz)));

      // bloques y monolitos de hormigón dispersos
      const caja = new THREE.BoxGeometry(1, 1, 1); caja.translate(0, 0.5, 0);
      const inst = new THREE.InstancedMesh(caja, mat.estandar('#ffffff', { map: texturaConcreto({ base: '#4f4a52', mancha: '#2a2630', semilla: 8 }), roughness: 1 }), d.bloques);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), cc = new THREE.Color();
      for (let i = 0; i < d.bloques; i++) {
        let x, z; do { x = (R() - 0.5) * 110; z = 20 - R() * 105; } while (Math.abs(x) < 9);
        const alto = i % 6 === 0 ? 5 + R() * 7 : 0.5 + R() * 1.1;
        e.set(0, R() * 6.28, 0); q.setFromEuler(e); p.set(x, 0, z); s.set(1.5 + R() * 3, alto, 1.5 + R() * 3);
        m4.compose(p, q, s); inst.setMatrixAt(i, m4); inst.setColorAt(i, cc.setHSL(0.75, 0.06, 0.3 + R() * 0.2));
      }
      inst.frustumCulled = false; raiz.add(inst);
      this.el.setObject3D('mesh', raiz);
    }
  });

  /* ── ciudad-lejana: siluetas de rascacielos oscuros en el horizonte ───────────────
     <a-entity ciudad-lejana="cantidad: 46">                                       */
  AFRAME.registerComponent('ciudad-lejana', {
    schema: { cantidad: { default: 46 }, radioMin: { default: 190 }, radioMax: { default: 330 }, semilla: { default: 27 } },
    init: function () {
      const d = this.data, R = rng(d.semilla);
      // textura de franjas verticales: se puede estirar en altura sin deformarse
      const tex = lienzo(64, 64, (g, w, h) => {
        g.fillStyle = '#0d0b10'; g.fillRect(0, 0, w, h);
        for (let x = 4; x < w; x += 8) { g.fillStyle = R() < 0.35 ? 'rgba(255,170,200,0.55)' : 'rgba(150,230,255,0.18)'; g.fillRect(x, 0, 2, h); }
      });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 3);
      const caja = new THREE.BoxGeometry(1, 1, 1); caja.translate(0, 0.5, 0);
      const inst = new THREE.InstancedMesh(caja, mat.estandar('#ffffff', { map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.7, roughness: 1 }), d.cantidad);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
      for (let i = 0; i < d.cantidad; i++) {
        const a = R() * 6.283, r = d.radioMin + R() * (d.radioMax - d.radioMin), w = 14 + R() * 30;
        p.set(Math.cos(a) * r, 0, -110 + Math.sin(a) * r); s.set(w, 70 + R() * R() * 220, w * (0.7 + R() * 0.6));
        m4.compose(p, q, s); inst.setMatrixAt(i, m4);
      }
      inst.frustumCulled = false;
      this.el.setObject3D('mesh', inst);
    }
  });

  /* ── reflectores: haces de luz que barren la niebla desde la cima ─────────────────
     <a-entity reflectores="altura: 400" position="0 0 -110">                       */
  AFRAME.registerComponent('reflectores', {
    schema: { altura: { default: 400 }, largo: { default: 320 }, ancho: { default: 7 }, velocidad: { default: 0.15 }, colores: { default: '#ffd0e0,#bfefff' }, opacidad: { default: 0.1 } },
    init: function () {
      const d = this.data, raiz = new THREE.Group();
      const tex = lienzo(256, 32, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'destination-in';
        const gv = g.createLinearGradient(0, 0, 0, h); gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(0.5, 'rgba(0,0,0,1)'); gv.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gv; g.fillRect(0, 0, w, h);
      });
      this.haces = [];
      d.colores.split(',').forEach((c, i) => {
        const m = new THREE.MeshBasicMaterial({ map: tex, color: c.trim(), transparent: true, opacity: d.opacidad, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        const g = new THREE.Group(); g.position.y = d.altura; g.rotation.z = -0.32 - i * 0.1;
        const pivote = new THREE.Group(); pivote.add(g);
        const a = new THREE.Mesh(new THREE.PlaneGeometry(d.largo, d.ancho * 2), m), b = a.clone(); b.rotation.x = Math.PI / 2;
        a.position.x = b.position.x = d.largo / 2; g.add(a, b);
        pivote.position.y = 0; raiz.add(pivote);
        this.haces.push({ p: pivote, v: d.velocidad * (i % 2 ? -0.8 : 1) });
      });
      this.el.setObject3D('mesh', raiz);
    },
    tick: function (t, dt) { this.haces.forEach(h => { h.p.rotation.y += h.v * dt * 0.001; }); }
  });
})();
