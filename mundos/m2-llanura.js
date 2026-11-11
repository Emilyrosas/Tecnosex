/* ==========================================================================
   MUNDO 2 · LLANURA
   Campo abierto y soleado: colinas de pasto, ruinas brutalistas, fábricas
   abandonadas en el horizonte y un escritorio con un ordenador viejo olvidado.

   Piezas:  terreno · brutalismo · ruinas-fabrica · cielo-vivo · escritorio-retro

   QUÉ APRENDER AQUÍ
     · Terreno procedural: una función altura(x,z) suma ondas seno. TODO lo que
       se posa en el suelo llama a esa misma función, así que nunca flota.
       Se edita en CONFIG.llanura (en c.js).
     · InstancedMesh: 3000 briznas de pasto y ~80 bloques de hormigón en 2 llamadas.
     · Colores por vértice: el terreno se tiñe según altura, sendero y pavimento.
   ========================================================================== */
(function () {
  'use strict';
  const TX = window.TX;
  const { THREE, CONFIG, rng, smoothstep, lienzo, texturaBrillo, halo, fusionar, colorearVertices, mover, mat, cajaUV, texturaConcreto } = TX;
  const L = CONFIG.llanura;

  /* ─── La función de altura del terreno ─────────────────────────────────── */
  function altura(x, z) {
    const f = L.frecuencia;
    let h = Math.sin(x * f + 1.3) * Math.cos(z * f * 0.8 + 0.4)
          + 0.5 * Math.sin(x * f * 2.3 - z * f * 1.7 + 2.1)
          + 0.25 * Math.sin(x * f * 5.1 + z * f * 4.3);
    h = h * L.altura * 0.45 + L.altura * 0.35;
    let plano = 1;                                           // 0 = totalmente plano, 1 = relieve completo
    for (const p of L.planos) plano = Math.min(plano, smoothstep(p[2], p[2] + 22, Math.hypot(x - p[0], z - p[1])));
    let m = 0;                                               // montes lejanos (campanas de Gauss)
    for (const b of L.montes) m += b[2] * Math.exp(-(((x - b[0]) ** 2 + (z - b[1]) ** 2) / (b[3] * b[3])));
    return (h + m) * plano;
  }
  TX.alturaLlanura = altura;

  // distancia de un punto a una polilínea (para pintar el sendero)
  function distSendero(x, z) {
    let mejor = 1e9;
    for (let i = 0; i < L.sendero.length - 1; i++) {
      const a = L.sendero[i], b = L.sendero[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      mejor = Math.min(mejor, Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t)));
    }
    return mejor;
  }
  const enConcreto = (x, z, margen) => L.concreto.some(c => Math.hypot(x - c[0], z - c[1]) < c[2] + (margen || 0));

  /* ── terreno ────────────────────────────────────────────────────────────────
     <a-entity terreno="pasto: 3000; piedras: 26">                               */
  AFRAME.registerComponent('terreno', {
    schema: {
      tamano:     { default: 500 },
      segmentos:  { default: 200 },     // más = relieve más fino (y más pesado)
      pasto:      { default: 3000 },    // briznas 3D alrededor del inicio
      piedras:    { default: 26 },      // lápidas / menhires dispersos
      colorBajo:  { default: '#3f7a2c' },
      colorAlto:  { default: '#9bd05a' },
      semilla:    { default: 12 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla), raiz = new THREE.Group();

      // el mundo registra su función de altura cuando se activa
      const mundoEl = this.el.closest('[mundo]');
      if (mundoEl) mundoEl.addEventListener('activado', () => { TX.alturaSuelo = altura; });

      /* 1 · malla del terreno: una rejilla cuyos vértices suben según altura(x,z) */
      const geo = new THREE.PlaneGeometry(d.tamano, d.tamano, d.segmentos, d.segmentos);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
      const cBajo = new THREE.Color(d.colorBajo), cAlto = new THREE.Color(d.colorAlto);
      const cTierra = new THREE.Color('#b9a077'), cConcreto = new THREE.Color('#79806f'), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), y = altura(x, z);
        pos.setY(i, y);
        const ruido = 0.5 + 0.5 * Math.sin(x * 0.21) * Math.cos(z * 0.17) + 0.15 * Math.sin(x * 0.9 + z * 0.7);
        c.copy(cBajo).lerp(cAlto, Math.max(0, Math.min(1, y / (L.altura * 0.9) * 0.7 + ruido * 0.35)));
        c.lerp(cTierra, (1 - smoothstep(1.2, 3, distSendero(x, z))) * 0.85);                  // sendero
        for (const k of L.concreto) c.lerp(cConcreto, 1 - smoothstep(k[2] * 0.8, k[2] + 6, Math.hypot(x - k[0], z - k[1])));   // pavimento
        col.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.computeVertexNormals();
      raiz.add(new THREE.Mesh(geo, mat.estandar('#ffffff', { vertexColors: true, roughness: 1, metalness: 0 })));

      /* 2 · pasto: briznas (conos de 3 lados) repartidas con InstancedMesh */
      const blade = new THREE.ConeGeometry(0.05, 0.55, 3); blade.translate(0, 0.275, 0);
      const pasto = new THREE.InstancedMesh(blade, mat.estandar('#ffffff', { roughness: 1, side: THREE.DoubleSide }), d.pasto);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), cc = new THREE.Color();
      for (let i = 0; i < d.pasto; i++) {
        let x, z, tries = 0;
        do { const a = R() * 6.283, r = Math.sqrt(R()) * 110; x = Math.cos(a) * r; z = 10 + Math.sin(a) * r * 0.9 - 40 * R(); tries++; }
        while (enConcreto(x, z, 2) && tries < 6);
        e.set((R() - 0.5) * 0.35, R() * 6.28, (R() - 0.5) * 0.35); q.setFromEuler(e);
        const k = 0.7 + R() * 1.1;
        p.set(x, altura(x, z), z); s.set(1, k, 1);
        m4.compose(p, q, s); pasto.setMatrixAt(i, m4);
        pasto.setColorAt(i, cc.setHSL(0.24 + R() * 0.08, 0.55, 0.3 + R() * 0.25));
      }
      pasto.frustumCulled = false;
      raiz.add(pasto);

      /* 3 · piedras altas inclinadas (como las lápidas del campo) */
      const caja = new THREE.BoxGeometry(1, 1, 1); caja.translate(0, 0.5, 0);
      const piedras = new THREE.InstancedMesh(caja, mat.estandar('#ffffff', { map: texturaConcreto({ base: '#a7a79f', mancha: '#58704a', semilla: 5 }), roughness: 1 }), d.piedras);
      for (let i = 0; i < d.piedras; i++) {
        let x, z;
        do { const a = R() * 6.283, r = 18 + R() * 85; x = Math.cos(a) * r; z = 8 + Math.sin(a) * r * 0.9; } while (distSendero(x, z) < 4 || enConcreto(x, z, 4));
        const h = 2 + R() * 3.5;
        e.set((R() - 0.5) * 0.3, R() * 6.28, (R() - 0.5) * 0.3); q.setFromEuler(e);
        p.set(x, altura(x, z) - 0.3, z); s.set(1.1 + R() * 1.1, h, 0.6 + R() * 0.3);
        m4.compose(p, q, s); piedras.setMatrixAt(i, m4);
        piedras.setColorAt(i, cc.setHSL(0.2 + R() * 0.1, 0.1 + R() * 0.15, 0.55 + R() * 0.25));
      }
      piedras.frustumCulled = false;
      raiz.add(piedras);

      this.el.setObject3D('mesh', raiz);
    }
  });

  /* ── brutalismo ─────────────────────────────────────────────────────────────
     Terrazas de bloques de hormigón que suben como una fuente seca, con un pasillo
     central, y al fondo un muro enorme con un agujero circular (el portal).
     <a-entity brutalismo="filas: 7; columnas: 9" position="0 0 -48">           */
  AFRAME.registerComponent('brutalismo', {
    schema: {
      columnas: { default: 9 }, filas: { default: 7 }, celda: { default: 4.2 },
      desnivel: { default: 0.9 },       // cuánto suben las terrazas hacia el fondo
      muro:     { default: true },      // el muro con agujero circular del fondo
      agujero:  { default: 5.5 },       // radio del agujero
      semilla:  { default: 12 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla), raiz = new THREE.Group();
      const tex = texturaConcreto({ base: '#9b9c96', mancha: '#5b7650', intensidad: 0.8, semilla: 9 });
      const matConcreto = mat.estandar('#ffffff', { map: tex, roughness: 1 });

      const unidad = new THREE.BoxGeometry(1, 1, 1); unidad.translate(0, 0.5, 0);     // base en y=0
      const losas = [];
      const mid = Math.floor(d.columnas / 2);
      for (let r = 0; r < d.filas; r++) for (let c = 0; c < d.columnas; c++) {
        if (c === mid || R() < 0.1) continue;                                          // pasillo central y huecos
        const h = 1.2 + r * d.desnivel * (0.6 + R() * 0.8) + R() * R() * 3.5 * (r / d.filas + 0.3);
        losas.push({ x: (c - (d.columnas - 1) / 2) * d.celda, z: -4 - r * d.celda, h: h, w: d.celda * (0.8 + R() * 0.1) });
      }
      const inst = new THREE.InstancedMesh(unidad, matConcreto, losas.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), cc = new THREE.Color();
      losas.forEach((l, i) => {
        p.set(l.x, 0, l.z); s.set(l.w, l.h, l.w);
        m4.compose(p, q, s); inst.setMatrixAt(i, m4);
        inst.setColorAt(i, cc.setHSL(0.12 + R() * 0.12, 0.04 + R() * 0.12, 0.45 + R() * 0.3));
      });
      inst.frustumCulled = false;
      raiz.add(inst);

      if (d.muro) {                                                   // muro con agujero circular
        const w = 34, h = 26, rr = d.agujero;
        const forma = new THREE.Shape();
        forma.moveTo(-w / 2, 0); forma.lineTo(w / 2, 0); forma.lineTo(w / 2, h); forma.lineTo(-w / 2, h); forma.closePath();
        const hueco = new THREE.Path(); hueco.absarc(0, rr + 0.1, rr, 0, Math.PI * 2, false);
        forma.holes.push(hueco);
        const geo = new THREE.ExtrudeGeometry(forma, { depth: 3, bevelEnabled: false, curveSegments: 40 });
        geo.translate(0, 0, -1.5);
        const texMuro = tex.clone(); texMuro.repeat.set(0.2, 0.2); texMuro.needsUpdate = true;
        const zMuro = -4 - d.filas * d.celda - 4;
        const muro = new THREE.Mesh(geo, mat.estandar('#ffffff', { map: texMuro, roughness: 1 }));
        muro.position.set(0, 0, zMuro);
        raiz.add(muro);
        const oscuro = new THREE.Mesh(new THREE.CircleGeometry(rr + 0.2, 40), mat.basico('#020403'));   // el "fondo" del túnel
        oscuro.position.set(0, rr + 0.1, zMuro - 1.1);
        raiz.add(oscuro);
        // muros bajos laterales
        [-1, 1].forEach(lado => {
          const b = new THREE.Mesh(cajaUV(2, 7, 24, 4), matConcreto);
          b.position.set(lado * (w / 2 + 1), 3.5, zMuro + 10); raiz.add(b);
        });
      }
      this.el.setObject3D('mesh', raiz);
    }
  });

  /* ── ruinas-fabrica ─────────────────────────────────────────────────────────
     Nave industrial abandonada: tejado de dientes de sierra, chimeneas, humo.
     <a-entity ruinas-fabrica="ancho: 34; chimeneas: 2" position="-70 0 -40">    */
  AFRAME.registerComponent('ruinas-fabrica', {
    schema: {
      ancho: { default: 34 }, largo: { default: 24 }, alto: { default: 10 },
      dientes: { default: 4 }, chimeneas: { default: 2 }, humo: { default: true }, semilla: { default: 8 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla), raiz = new THREE.Group();

      // textura de fachada: hormigón oxidado + ventanas oscuras (1 repetición = 12 m)
      const texFachada = lienzo(256, 256, (g, w, h) => {
        g.fillStyle = '#7b6b5c'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 1800; i++) { g.fillStyle = 'rgba(0,0,0,' + R() * 0.08 + ')'; g.fillRect(R() * w, R() * h, 2, 2); }
        for (let c = 0; c < 4; c++) for (let r = 0; r < 2; r++) {
          const x = 10 + c * 62, y = 28 + r * 100;
          g.fillStyle = '#4a3f36'; g.fillRect(x - 3, y - 3, 52, 72);
          g.fillStyle = R() < 0.25 ? '#8aa9b8' : '#141c20'; g.fillRect(x, y, 46, 66);
          g.strokeStyle = '#3a322c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 23, y); g.lineTo(x + 23, y + 66); g.moveTo(x, y + 33); g.lineTo(x + 46, y + 33); g.stroke();
        }
        for (let i = 0; i < 10; i++) {                                                 // chorreras de óxido
          const x = R() * w, gr = g.createLinearGradient(0, 0, 0, 140); gr.addColorStop(0, 'rgba(120,60,30,0.35)'); gr.addColorStop(1, 'rgba(120,60,30,0)');
          g.fillStyle = gr; g.fillRect(x, 0, 14, 140);
        }
      });
      texFachada.wrapS = texFachada.wrapT = THREE.RepeatWrapping;
      const matFachada = mat.estandar('#ffffff', { map: texFachada, roughness: 1 });
      const matTecho = mat.estandar('#5d4a40', { roughness: 0.9, metalness: 0.3, side: THREE.DoubleSide });

      const nave = new THREE.Mesh(cajaUV(d.ancho, d.alto, d.largo, 12), matFachada);
      nave.position.y = d.alto / 2; raiz.add(nave);
      const anexo = new THREE.Mesh(cajaUV(d.ancho * 0.45, d.alto * 0.6, d.largo * 0.7, 12), matFachada);
      anexo.position.set(d.ancho * 0.7, d.alto * 0.3, d.largo * 0.1); raiz.add(anexo);

      // tejado de dientes de sierra: un prisma triangular repetido
      const forma = new THREE.Shape();
      const Ld = d.largo / d.dientes;
      forma.moveTo(0, 0); forma.lineTo(Ld, 0); forma.lineTo(Ld, 3); forma.closePath();
      for (let k = 0; k < d.dientes; k++) {
        const g = new THREE.ExtrudeGeometry(forma, { depth: d.ancho, bevelEnabled: false });
        g.translate(0, 0, -d.ancho / 2); g.rotateY(Math.PI / 2);                         // el prisma se extiende a lo largo de X
        g.translate(0, d.alto, -d.largo / 2 + k * Ld + Ld);
        raiz.add(new THREE.Mesh(g, matTecho));
      }

      // chimeneas rayadas
      this.humos = [];
      const partes = [];
      for (let c = 0; c < d.chimeneas; c++) {
        const x = (c === 0 ? -1 : 1) * (d.ancho / 2 + 3), z = -d.largo / 2 + 2 + c * 7;
        for (let k = 0; k < 4; k++) partes.push(colorearVertices(mover(new THREE.CylinderGeometry(1.1 - k * 0.05 - 0.05, 1.1 - k * 0.05 + 0.15, 8, 14), [x, 4 + k * 8, z]), k % 2 ? '#d8d2c8' : '#8a4b3a'));
        if (d.humo) for (let k = 0; k < 5; k++) {
          const s = halo('#b9b9be', 8, 0.2);
          s.material.blending = THREE.NormalBlending;
          raiz.add(s); this.humos.push({ s: s, x: x, z: z, fase: k / 5 });
        }
      }
      if (partes.length) raiz.add(new THREE.Mesh(fusionar(partes), mat.estandar('#ffffff', { vertexColors: true, roughness: 1 })));
      this.el.setObject3D('mesh', raiz);
    },
    tick: function (t) {
      this.humos.forEach(h => {                          // columnas de humo que suben, crecen y se desvanecen
        const u = ((t * 0.00004 + h.fase) % 1);
        h.s.position.set(h.x + u * 14, 33 + u * 26, h.z);
        h.s.scale.setScalar(6 + u * 18);
        h.s.material.opacity = 0.22 * Math.sin(u * Math.PI);
      });
    }
  });

  /* ── cielo-vivo: sol, luna pálida y nubes a la deriva ──────────────────────────
     <a-entity cielo-vivo="nubes: 14; sol: 1">
     El sol debe coincidir con la dirección de la luz direccional del HTML.       */
  AFRAME.registerComponent('cielo-vivo', {
    schema: {
      nubes: { default: 14 }, area: { default: 520 }, velocidad: { default: 1.5 },
      sol: { default: 1 }, direccionSol: { type: 'vec3', default: { x: 60, y: 80, z: 30 } }
    },
    init: function () {
      const d = this.data, R = rng(21), raiz = new THREE.Group();
      const texNube = lienzo(256, 128, (g, w, h) => {
        for (let i = 0; i < 22; i++) {
          const x = 40 + R() * 176, y = 40 + R() * 40, r = 22 + R() * 30;
          const gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.fillRect(0, 0, w, h);
        }
      });
      this.nubes = [];
      for (let i = 0; i < d.nubes; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNube, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
        const k = 70 + R() * 90; s.scale.set(k * 2, k, 1);
        s.position.set((R() - 0.5) * d.area, 85 + R() * 60, (R() - 0.5) * d.area);
        raiz.add(s); this.nubes.push(s);
      }
      if (d.sol) {
        const dir = new THREE.Vector3(d.direccionSol.x, d.direccionSol.y, d.direccionSol.z).normalize().multiplyScalar(280);
        const sol = halo('#fff3c4', 90, 1); sol.material.fog = false; sol.position.copy(dir); raiz.add(sol);
        const nucleo = halo('#ffffff', 30, 1); nucleo.material.fog = false; nucleo.position.copy(dir); raiz.add(nucleo);
        // una segunda "luna" rosa pálida: el toque onírico
        const luna = halo('#ffb3d9', 120, 0.28); luna.material.fog = false; luna.position.set(-dir.x * 0.9, dir.y * 0.8, dir.z * -0.6); raiz.add(luna);
      }
      this.el.setObject3D('mesh', raiz);
    },
    tick: function (t, dt) {
      const d = this.data, lim = d.area / 2;
      this.nubes.forEach((n, i) => { n.position.x += d.velocidad * dt * 0.001 * (1 + (i % 3) * 0.4); if (n.position.x > lim) n.position.x = -lim; });
    }
  });

  /* ── escritorio-retro: un ordenador viejo en un escritorio de hierro forjado ────
     <a-entity escritorio-retro="texto: > hay alguien ahi?" position="6 0 18">    */
  AFRAME.registerComponent('escritorio-retro', {
    schema: { texto: { default: '> hay alguien ahi?' }, color: { default: '#9fe8ff' } },
    init: function () {
      const d = this.data, g = new THREE.Group();
      const hierro = mat.estandar('#2e2c2a', { metalness: 0.6, roughness: 0.5 });
      const beige = mat.estandar('#cfc6b0', { roughness: 0.8 });
      const parte = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };

      parte(new THREE.BoxGeometry(1.3, 0.04, 0.75), hierro, 0, 0.78, 0);
      [[-0.6, -0.33], [0.6, -0.33], [-0.6, 0.33], [0.6, 0.33]].forEach(([x, z]) => parte(new THREE.CylinderGeometry(0.025, 0.025, 0.78, 6), hierro, x, 0.39, z));
      [-1, 1].forEach(s => { const c = parte(new THREE.TorusGeometry(0.2, 0.012, 6, 24), hierro, s * 0.6, 0.4, 0); c.rotation.y = Math.PI / 2; });   // adorno curvo

      parte(new THREE.BoxGeometry(0.4, 0.06, 0.35), beige, 0, 0.83, -0.1);                  // base del monitor
      parte(new THREE.BoxGeometry(0.5, 0.42, 0.46), beige, 0, 1.07, -0.12);                 // cuerpo CRT
      parte(new THREE.BoxGeometry(0.48, 0.03, 0.16), beige, 0, 0.815, 0.22);                // teclado

      const tex = lienzo(256, 192, (c, w, h) => {
        c.fillStyle = '#04100d'; c.fillRect(0, 0, w, h);
        c.fillStyle = d.color; c.font = '16px "Courier New", monospace';
        c.fillText('TECNOSEX OS 0.1', 14, 28); c.fillText('. . . . . . . . .', 14, 52); c.fillText(d.texto, 14, 96); c.fillRect(14, 106, 10, 16);
        c.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 2);
      });
      const pantalla = parte(new THREE.PlaneGeometry(0.38, 0.29), mat.basico('#ffffff', { map: tex }), 0, 1.09, 0.115);
      const brillo = halo(d.color, 1.4, 0.3); brillo.position.set(0, 1.1, 0.3); g.add(brillo);

      // silla de hierro con asiento de tela floreada
      const tela = lienzo(64, 64, (c, w, h) => {
        c.fillStyle = '#d8dcec'; c.fillRect(0, 0, w, h); c.fillStyle = '#7f8fc0';
        for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(8 + (i % 4) * 16, 8 + Math.floor(i / 4) * 30 + (i % 2) * 6, 5, 0, 7); c.fill(); }
      });
      parte(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 20), mat.estandar('#ffffff', { map: tela, roughness: 1 }), 0, 0.5, 0.95);
      [[-0.17, 0.78], [0.17, 0.78], [-0.17, 1.12], [0.17, 1.12]].forEach(([x, z]) => parte(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 5), hierro, x, 0.25, z));
      const respaldo = parte(new THREE.TorusGeometry(0.25, 0.014, 6, 24, Math.PI), hierro, 0, 0.78, 1.18);
      parte(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 5), hierro, -0.25, 0.65, 1.18);
      parte(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 5), hierro, 0.25, 0.65, 1.18);

      g.scale.setScalar(1.15);
      this.el.setObject3D('mesh', g);
    }
  });
})();
