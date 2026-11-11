/* ==========================================================================
   TECNOSEX · NÚCLEO  (c.js)
   ==========================================================================

   Este archivo contiene lo que comparten los 5 mundos:
     · CONFIG        → ajustes que puedes tocar sin miedo
     · HERRAMIENTAS  → funciones auxiliares (texturas, mezclar geometrías…)
     · SISTEMA       → mundos, portales, caminar, HUD, sonido, rendimiento

   Cada mundo vive en su propio archivo dentro de /mundos:
     m1-incubadora.js · m2-llanura.js · m3-fabrica.js · m4-torre.js · m5-mausoleo.js

   ──────────────────────────────────────────────────────────────────────────
   MINI-CURSO DE A-FRAME (lo necesario para entender y editar todo esto)
   ──────────────────────────────────────────────────────────────────────────

   1) ENTIDAD:  <a-entity> es un "objeto vacío" en el mundo 3D. Tiene posición,
      rotación y escala:   <a-entity position="0 1 -3" rotation="0 45 0">
      Las entidades se anidan: si mueves el padre, los hijos se mueven con él
      (por eso cada mundo es una entidad y todo lo suyo va dentro).

   2) COMPONENTE: es un comportamiento que le añades a una entidad como si
      fuera un atributo HTML:   <a-entity halo="radio: 3; altura: 8">
      Aquí está la parte de programación. Un componente se registra así:

          AFRAME.registerComponent('mi-cosa', {
            schema: { radio: {default: 2}, color: {default: '#ff0'} },  // sus opciones
            init() { ... },            // se ejecuta UNA vez al crearse
            tick(tiempo, dt) { ... }   // se ejecuta en CADA fotograma (animaciones)
          });

      y luego se usa:  <a-entity mi-cosa="radio: 5; color: #f0f">
      · `this.data.radio` → el valor que puso quien lo usa (o el default).
      · `this.el`         → la entidad a la que está pegado.
      · `tiempo` está en milisegundos, `dt` es lo que duró el fotograma (ms).

   3) THREE.JS: A-Frame está construido sobre Three.js. Dentro de un componente
      creamos objetos de Three.js directamente (más control, mejor rendimiento):

          const geo  = new THREE.BoxGeometry(1, 2, 1);          // la FORMA
          const mat  = new THREE.MeshStandardMaterial({color:'#f0f'}); // el ASPECTO
          const malla = new THREE.Mesh(geo, mat);               // forma + aspecto
          this.el.setObject3D('mesh', malla);                   // lo pegamos a la entidad

      Geometría = vértices. Material = cómo reacciona a la luz. Malla = ambas.
      · MeshStandardMaterial  → recibe luces y sombras (aspecto realista)
      · MeshBasicMaterial     → ignora las luces: siempre se ve igual (ideal para
                                cosas que brillan: neones, pantallas)
      · blending: AdditiveBlending → suma luz sobre lo de atrás (brillos, rayos)

   4) RENDIMIENTO (por qué el código se ve "raro" a veces):
      · Cada malla = 1 "draw call". Cientos de mallas pesan; miles, mucho.
      · INSTANCIAS (InstancedMesh): miles de copias de la MISMA forma en 1 sola
        llamada. Lo usamos para pasto, cuerpos robot, aletas de la torre…
      · FUSIONAR (fusionar()): junta muchas geometrías distintas en una sola malla
        cuando no necesitan moverse por separado (tubos, cables, pods).
      · Las texturas se dibujan con canvas 2D (lienzo()) → cero archivos externos.
      · Solo el mundo activo se dibuja y se actualiza (los demás se pausan).

   5) CÓMO AÑADIR / CAMBIAR COSAS:
      · ¿Mover o retocar algo?   → index.html (posiciones y opciones de cada pieza)
      · ¿Cambiar colores/forma?  → las opciones de cada componente o CONFIG
      · ¿Una pieza nueva?        → copia un componente parecido y cámbiale el init()
      · ¿Un mundo nuevo?         → copia un bloque <a-entity mundo="..."> en
                                   index.html y crea sus piezas (ver el final del HTML)
   ========================================================================== */

(function () {
  'use strict';
  const THREE = AFRAME.THREE;

  /* ========================================================================
     1 · CONFIG  (edita libremente)
     ======================================================================== */
  const CONFIG = {

    mundoInicial: 1,                 // 1-5: con cuál empieza la experiencia

    // Calidad. Resolución máxima de render por nivel (Q cambia de nivel).
    //   1 = mínimo coste · 2 = muy nítido en pantallas retina
    //   Truco: añade  ?stats  a la URL para ver los FPS.
    rendimiento: { niveles: [1.5, 1, 0.7] },

    // Sonido generado por código (sin archivos). M = silenciar.
    sonido: { activo: true, volumen: 0.35 },

    // Multiplica la potencia de TODAS las luces puntuales creadas por código
    potenciaLuces: 1,

    paleta: {
      rosa: '#ff3d9a', rosaClaro: '#ffb3d9', cian: '#9fe8ff', verde: '#8dff3a',
      amarillo: '#ffc928', azul: '#2b3cff', rojo: '#ff3b3b', violeta: '#b06bff', blanco: '#f4fdff'
    },

    // Mundo 2 · forma del terreno. Todo lo que se posa sobre el suelo del mundo 2
    // calcula su altura con estos números, así que si los cambias, TODO se adapta.
    llanura: {
      altura: 9,                       // altura de las colinas (metros)
      frecuencia: 0.011,               // más alto = colinas más pequeñas y apretadas
      // zonas planas [x, z, radio]: el terreno se aplana alrededor de estos puntos
      planos: [[0, 30, 16], [0, -48, 40], [-78, -52, 26], [72, -78, 26]],
      // montes lejanos [x, z, altura, ancho]
      montes: [[-90, -20, 16, 40], [110, -60, 22, 55], [45, 75, 14, 35], [-135, -110, 26, 60], [0, -200, 30, 70]],
      // zonas de pavimento de hormigón [x, z, radio]
      concreto: [[0, -48, 34]],
      // el sendero de tierra que une el inicio con las ruinas [x, z]
      sendero: [[0, 40], [0, 14], [-7, -10], [0, -30]]
    }
  };


  /* ========================================================================
     2 · HERRAMIENTAS
     ======================================================================== */

  // Aleatorio con semilla: misma semilla = mismos números siempre.
  // Así el mundo es idéntico cada vez que lo recargas (y puedes "tirar de nuevo"
  // cambiando el número de `semilla` en el HTML).
  function rng(semilla) {
    let s = ((semilla * 2654435761) >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  // '#rrggbb' + opacidad → 'rgba(r,g,b,a)' (para dibujar en canvas)
  function rgba(hex, a) {
    return 'rgba(' + parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16) + ',' + a + ')';
  }

  // Crea una textura dibujando en un canvas 2D:
  //   lienzo(256, 256, (g, w, h) => { g.fillStyle = 'red'; g.fillRect(0, 0, w, h); })
  function lienzo(w, h, dibujar) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    dibujar(g, w, h);
    const t = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  // Mancha de luz suave (halos, partículas, caminos)
  let _brillo = null;
  function texturaBrillo() {
    if (!_brillo) {
      _brillo = lienzo(64, 64, (g, w, h) => {
        const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
    }
    return _brillo;
  }

  // Sprite de halo: un cartel que siempre mira a la cámara y SUMA luz.
  function halo(color, tam, opacidad) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texturaBrillo(), color: color, transparent: true, opacity: opacidad,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.scale.set(tam, tam, 1);
    return s;
  }

  // Une muchas geometrías en una sola (1 draw call en vez de cientos).
  // Requisito: todas deben tener los mismos atributos (position, normal, uv, color…)
  function fusionar(geos) {
    const nombres = Object.keys(geos[0].attributes);
    const datos = {};
    nombres.forEach(n => { datos[n] = { arr: [], size: geos[0].attributes[n].itemSize }; });
    const idx = [];
    let off = 0;
    geos.forEach(g => {
      nombres.forEach(n => { const a = g.attributes[n].array, d = datos[n].arr; for (let i = 0; i < a.length; i++) d.push(a[i]); });
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i++) idx.push(ix[i] + off);
      off += g.attributes.position.count;
      g.dispose();
    });
    const m = new THREE.BufferGeometry();
    nombres.forEach(n => m.setAttribute(n, new THREE.Float32BufferAttribute(datos[n].arr, datos[n].size)));
    m.setIndex(idx);
    return m;
  }

  // Pinta todos los vértices de una geometría de un color (para fusionar piezas de colores distintos)
  function colorearVertices(geo, hex) {
    const c = new THREE.Color(hex), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  }

  // Mueve/rota/escala una geometría "por dentro" (antes de fusionarla):
  //   mover(geo, [x,y,z], [rotX,rotY,rotZ en radianes], [escX,escY,escZ])
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  function mover(geo, p, r, s) {
    _e.set.apply(_e, r || [0, 0, 0]); _q.setFromEuler(_e);
    _p.set.apply(_p, p || [0, 0, 0]); _s.set.apply(_s, s || [1, 1, 1]);
    _m.compose(_p, _q, _s);
    geo.applyMatrix4(_m);
    return geo;
  }

  // Cables que cuelgan entre dos puntos (curva de Bézier que "cae" por gravedad).
  //   tramos = [{ a: Vector3, b: Vector3, caida: número, medio?: Vector3 }]
  function cablesColgantes(tramos, grosor) {
    return fusionar(tramos.map(t => {
      let medio = t.medio;
      if (!medio) { medio = t.a.clone().add(t.b).multiplyScalar(0.5); medio.y -= 2 * t.caida; }
      return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(t.a, medio, t.b), 18, grosor, 4, false);
    }));
  }

  // Luz puntual creada por código (con la potencia global aplicada)
  function luzPuntual(color, intensidad, distancia) {
    const l = new THREE.PointLight(color, intensidad * CONFIG.potenciaLuces, distancia, 2);
    l.userData.base = intensidad;
    return l;
  }

  const mat = {
    basico:   (color, extra) => new THREE.MeshBasicMaterial(Object.assign({ color: color }, extra || {})),
    estandar: (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.7, metalness: 0.1 }, extra || {}))
  };

  // Caja cuyas UV están en METROS: la textura mantiene su tamaño real sin importar
  // lo grande que sea la caja (si no, el hormigón se vería "estirado").
  //   m = cuántos metros cubre una repetición de la textura
  function cajaUV(w, h, d, m) {
    m = m || 4;
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];   // orden de caras de BoxGeometry
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0] / m, uv.getY(i) * dims[f][1] / m);
    }
    uv.needsUpdate = true;
    return g;
  }

  // Textura de hormigón: tablones verticales, ruido, manchas de humedad/musgo.
  //   base: color; mancha: color de la humedad; intensidad: cuánta mancha (0-1)
  function texturaConcreto(o) {
    o = Object.assign({ base: '#8a8a86', mancha: '#3d5a3a', intensidad: 0.6, tam: 512, semilla: 1, tablas: true }, o || {});
    const R = rng(o.semilla);
    const t = lienzo(o.tam, o.tam, (g, w, h) => {
      g.fillStyle = o.base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < w * h / 30; i++) {                               // grano
        g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,' + R() * 0.09 + ')' : 'rgba(255,255,255,' + R() * 0.06 + ')';
        g.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2);
      }
      if (o.tablas) {                                                       // marcas del encofrado
        for (let x = 0; x < w; x += 14 + R() * 30) {
          g.fillStyle = 'rgba(0,0,0,' + (0.12 + R() * 0.18) + ')'; g.fillRect(x, 0, 1.5, h);
          g.fillStyle = 'rgba(255,255,255,' + (0.03 + R() * 0.05) + ')'; g.fillRect(x + 2, 0, 1, h);
        }
      }
      const n = Math.floor(14 * o.intensidad);                              // chorreras verticales
      for (let i = 0; i < n; i++) {
        const x = R() * w, ww = 8 + R() * 46, hh = h * (0.25 + R() * 0.75);
        const gr = g.createLinearGradient(0, 0, 0, hh);
        gr.addColorStop(0, rgba(o.mancha, 0.5)); gr.addColorStop(1, rgba(o.mancha, 0));
        g.fillStyle = gr; g.fillRect(x, 0, ww, hh);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  // Ruido de televisión que se redibuja a mano con actualizar()
  function texturaEstatica() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), img = g.createImageData(64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    const actualizar = function () {
      const px = img.data;
      for (let i = 0; i < px.length; i += 4) { const v = Math.random() * 255; px[i] = v * 0.85; px[i + 1] = v; px[i + 2] = v * 0.92; px[i + 3] = 255; }
      g.putImageData(img, 0, 0); tex.needsUpdate = true;
    };
    actualizar();
    return { textura: tex, actualizar: actualizar };
  }

  // Rayos de luz (God rays): láminas cruzadas con degradado que SUMAN luz.
  //   posiciones: [Vector3] puntos donde nace cada rayo (arriba)
  let _texRayo = null;
  function crearRayos(o) {
    o = Object.assign({ posiciones: [], alto: 20, ancho: 3, inclinacion: -14, color: '#ffffff', opacidad: 0.15 }, o);
    if (!_texRayo) {
      _texRayo = lienzo(64, 256, (g, w, h) => {
        const gh = g.createLinearGradient(0, 0, w, 0);
        gh.addColorStop(0, 'rgba(255,255,255,0)'); gh.addColorStop(0.5, 'rgba(255,255,255,1)'); gh.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gh; g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'destination-in';                       // multiplica por un degradado vertical
        const gv = g.createLinearGradient(0, 0, 0, h);
        gv.addColorStop(0, 'rgba(0,0,0,1)'); gv.addColorStop(0.6, 'rgba(0,0,0,0.45)'); gv.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gv; g.fillRect(0, 0, w, h);
      });
    }
    const inc = o.inclinacion * Math.PI / 180, largo = o.alto / Math.cos(inc);
    const material = new THREE.MeshBasicMaterial({
      map: _texRayo, color: o.color, transparent: true, opacity: o.opacidad,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const geo = new THREE.PlaneGeometry(o.ancho, largo);
    const grupo = new THREE.Group();
    o.posiciones.forEach(p => {
      const g = new THREE.Group();
      g.position.copy(p); g.rotation.z = inc;
      const a = new THREE.Mesh(geo, material), b = new THREE.Mesh(geo, material);
      a.position.y = b.position.y = -largo / 2;
      b.rotation.y = Math.PI / 2;
      g.add(a, b); grupo.add(g);
    });
    return grupo;
  }

  // Todo lo que los archivos de /mundos necesitan
  window.TX = {
    THREE, CONFIG, rng, clamp, smoothstep, rgba, lienzo, texturaBrillo, halo, fusionar, colorearVertices,
    mover, cablesColgantes, luzPuntual, mat, cajaUV, texturaConcreto, texturaEstatica, crearRayos,
    alturaSuelo: null         // función (x,z)→y que el mundo activo puede registrar (colinas del mundo 2)
  };
  const TX = window.TX;


  /* ========================================================================
     3 · SISTEMA DE MUNDOS
     ========================================================================

     Estructura en index.html:

       <a-entity mundo="nombre: Incubadora; niebla: #03080a; ..." >
           ...todo lo de ese mundo (luces, suelo, piezas, portal)...
       </a-entity>

     · `mundo` solo guarda DATOS (atmósfera, dónde apareces, a qué velocidad…).
     · `gestor-mundos` (en <a-scene>) enciende uno, apaga los demás, cambia la
       niebla/cielo/sonido y coloca al jugador.
     · Un mundo apagado está oculto Y pausado: no cuesta nada de rendimiento.
     ======================================================================== */

  AFRAME.registerComponent('mundo', {
    schema: {
      nombre:      { default: 'Mundo' },
      descripcion: { default: '' },
      entrada:     { type: 'vec3', default: { x: 0, y: 0, z: 10 } },  // dónde apareces
      mirar:       { default: 0 },                                    // grados (0 = hacia -Z)
      velocidad:   { default: 4.5 },                                  // m/s al caminar
      limite:      { default: 60 },                                   // radio de movimiento…
      caja:        { type: 'vec3', default: { x: 0, y: 0, z: 0 } },   // …o medio-ancho/medio-largo (si ≠ 0)
      centro:      { type: 'vec3', default: { x: 0, y: 0, z: 0 } },   // centro de ese límite
      fondo:       { default: '#000000' },
      niebla:      { default: '#000000' },
      densidad:    { default: 0.02 },                                 // niebla: más alto = más cerrado
      cieloArriba:    { default: '#000000' },
      cieloHorizonte: { default: '#000000' },
      cieloAbajo:     { default: '#000000' },
      tono:        { default: 55 },                                   // nota base del drone (Hz)
      brillo:      { default: 420 },                                  // brillo del sonido (filtro, Hz)
      campanas:    { default: 0.5 }                                   // 0-1: frecuencia de campanitas
    }
  });


  /* ── gestor-mundos (en <a-scene>) ───────────────────────────────────────── */
  AFRAME.registerComponent('gestor-mundos', {
    init: function () {
      this.lista = [];
      this.actual = -1;
      this.bloqueado = false;
      this.el.addEventListener('loaded', () => {
        this.rig = document.getElementById('jugador');
        this.camara = document.querySelector('[camera]');
        this.cielo = document.querySelector('[cielo]');
        this.fundido = document.getElementById('fundido');
        this.lista = Array.prototype.slice.call(this.el.querySelectorAll('[mundo]'));
        this.lista.forEach(m => { m.setAttribute('visible', false); m.pause(); });   // todos apagados
        this.el.emit('mundos-listos');
        this.activar(CONFIG.mundoInicial - 1);
      });
      // Un portal solo vale si (1) pertenece al mundo que está activo y (2) no acabas de llegar.
      // Sin esto, el portal de un mundo oculto que está en el mismo sitio que otro (el del mundo 1
      // y el del 3 coinciden en planta) podía dispararse y saltarse mundos.
      this.el.addEventListener('portal-cruzado', e => {
        if (e.detail.origen && e.detail.origen !== this.lista[this.actual]) return;
        if (performance.now() - (this.tActivacion || 0) < 1500) return;
        this.ir(e.detail.destino - 1);
      });
    },

    // Cambio con fundido a negro (el momento ideal para esconder los tirones de carga)
    ir: function (i) {
      if (this.bloqueado || i === this.actual || !this.lista[i]) return;
      this.bloqueado = true;
      this.fundido.classList.add('activo');
      setTimeout(() => {
        this.activar(i);
        this.fundido.classList.remove('activo');
        setTimeout(() => { this.bloqueado = false; }, 500);
      }, 450);
    },

    activar: function (i) {
      const nuevo = this.lista[i];
      if (!nuevo) return;
      if (this.actual >= 0) {                                    // apagar el anterior
        const viejo = this.lista[this.actual];
        viejo.setAttribute('visible', false);
        viejo.pause();
      }
      this.actual = i;
      this.tActivacion = performance.now();
      const d = nuevo.getAttribute('mundo');

      // atmósfera
      const escena = this.el.object3D;
      escena.fog.color.set(d.niebla);
      escena.fog.density = d.densidad;
      escena.background = new THREE.Color(d.fondo);
      if (this.cielo && this.cielo.components.cielo) this.cielo.components.cielo.pintar(d.cieloArriba, d.cieloHorizonte, d.cieloAbajo);

      // encender el mundo (si tiene terreno con relieve, se registra en el evento 'activado')
      TX.alturaSuelo = null;
      nuevo.setAttribute('visible', true);
      nuevo.play();
      nuevo.emit('activado');

      // colocar al jugador
      const y = TX.alturaSuelo ? TX.alturaSuelo(d.entrada.x, d.entrada.z) : d.entrada.y;
      this.rig.object3D.position.set(d.entrada.x, y, d.entrada.z);
      this.rig.object3D.rotation.y = d.mirar * Math.PI / 180;
      const lc = this.camara.components['look-controls'];
      if (lc && lc.yawObject) { lc.yawObject.rotation.y = 0; lc.pitchObject.rotation.x = 0; }
      this.rig.setAttribute('limites', { radio: d.limite, caja: d.caja, centro: d.centro });
      this.rig.setAttribute('caminar', 'velocidad', d.velocidad);
      if (this.rig.components.caminar) this.rig.components.caminar.vel.set(0, 0, 0);

      this.el.emit('mundo-cambiado', { indice: i, nombre: d.nombre, descripcion: d.descripcion, tono: d.tono, brillo: d.brillo, campanas: d.campanas });
    }
  });


  /* ── portal ─────────────────────────────────────────────────────────────
     Anillo luminoso: al acercarte te lleva a otro mundo.
     <a-entity portal="destino: 2; etiqueta: llanura; color: #ff3d9a" position="0 1.6 -30">
       destino  → número de mundo (1-5)        tamano → diámetro del anillo
       radio    → a qué distancia (en suelo) se activa                      */
  AFRAME.registerComponent('portal', {
    schema: {
      destino:  { type: 'int', default: 2 },
      etiqueta: { default: '' },
      color:    { default: CONFIG.paleta.rosa },
      tamano:   { default: 2.6 },
      radio:    { default: 1.6 },
      opacidad: { default: 1 }          // transparencia del disco interior (útil en portales enormes)
    },
    init: function () {
      const d = this.data, r = d.tamano / 2, g = new THREE.Group();
      const grosor = Math.max(0.05, r * 0.04);
      g.add(new THREE.Mesh(new THREE.TorusGeometry(r, grosor, 8, 64), mat.basico(d.color, { blending: THREE.AdditiveBlending, transparent: true })));
      g.add(new THREE.Mesh(new THREE.TorusGeometry(r * 1.06, grosor * 0.4, 6, 64), mat.basico('#ffffff', { transparent: true, opacity: 0.6 })));

      // disco interior con espirales que giran
      const tex = lienzo(256, 256, (c, w, h) => {
        const m = w / 2, gr = c.createRadialGradient(m, m, 6, m, m, m);
        gr.addColorStop(0, rgba(d.color, 0.12)); gr.addColorStop(0.75, rgba(d.color, 0.35)); gr.addColorStop(1, rgba(d.color, 0));
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2;
        for (let k = 0; k < 5; k++) {
          c.beginPath();
          for (let t = 0; t <= 1; t += 0.02) {
            const a = t * 5 + k * Math.PI * 2 / 5, rr = t * m * 0.95;
            const x = m + Math.cos(a) * rr, y = m + Math.sin(a) * rr;
            if (t === 0) c.moveTo(x, y); else c.lineTo(x, y);
          }
          c.stroke();
        }
      });
      this.disco = new THREE.Mesh(new THREE.CircleGeometry(r, 48),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: d.opacidad, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      g.add(this.disco);
      g.add(halo(d.color, r * 3.2, 0.35));

      if (d.etiqueta) {                                         // rótulo sobre el anillo
        const t = lienzo(512, 96, (c, w, h) => {
          c.font = '600 44px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillStyle = '#ffffff'; c.shadowColor = d.color; c.shadowBlur = 18;
          c.fillText('→ ' + d.etiqueta.toUpperCase(), w / 2, h / 2);
        });
        const rot = new THREE.Mesh(new THREE.PlaneGeometry(d.tamano * 1.4, d.tamano * 1.4 * 96 / 512),
          new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
        rot.position.y = r + d.tamano * 0.22;
        g.add(rot);
      }
      this.el.setObject3D('mesh', g);
      this.pos = new THREE.Vector3(); this.cam = new THREE.Vector3();
      this.mundoEl = this.el.closest('[mundo]');       // el mundo al que pertenece este portal
    },
    tick: function (t, dt) {
      if (this.mundoEl && !this.mundoEl.object3D.visible) return;   // portal de un mundo apagado: no hace nada
      this.disco.rotation.z += dt * 0.0007;
      this.el.object3D.getWorldPosition(this.pos);
      const camObj = this.el.sceneEl.camera;
      if (!camObj) return;
      camObj.getWorldPosition(this.cam);
      if (Math.hypot(this.cam.x - this.pos.x, this.cam.z - this.pos.z) < this.data.radio) {
        this.el.sceneEl.emit('portal-cruzado', { destino: this.data.destino, origen: this.mundoEl });
      }
    }
  });


  /* ========================================================================
     4 · ATMÓSFERA Y MOVIMIENTO
     ======================================================================== */

  /* ── ambiente (en <a-scene>): crea la niebla; el gestor la ajusta por mundo ── */
  AFRAME.registerComponent('ambiente', {
    init: function () {
      this.el.object3D.fog = new THREE.FogExp2('#000000', 0.02);
      this.el.object3D.background = new THREE.Color('#000000');
    }
  });

  /* ── cielo: esfera con degradado. El gestor la repinta en cada mundo ──────── */
  AFRAME.registerComponent('cielo', {
    schema: { radio: { default: 300 } },
    init: function () {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 8; this.canvas.height = 256;
      this.tex = new THREE.CanvasTexture(this.canvas);
      if (THREE.SRGBColorSpace) this.tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.SphereGeometry(this.data.radio, 24, 16),
        new THREE.MeshBasicMaterial({ map: this.tex, side: THREE.BackSide, fog: false, depthWrite: false }));
      m.renderOrder = -10;
      this.el.setObject3D('mesh', m);
      this.pintar('#000', '#000', '#000');
    },
    pintar: function (arriba, horizonte, abajo) {
      const g = this.canvas.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, arriba); gr.addColorStop(0.5, horizonte); gr.addColorStop(1, abajo);
      g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
      this.tex.needsUpdate = true;
    }
  });

  /* ── limites (en el rig): el jugador no se sale del mundo ─────────────────── */
  AFRAME.registerComponent('limites', {
    schema: {
      radio:  { default: 60 },
      caja:   { type: 'vec3', default: { x: 0, y: 0, z: 0 } },   // si x o z > 0 se usa una caja
      centro: { type: 'vec3', default: { x: 0, y: 0, z: 0 } }
    },
    tick: function () {
      const p = this.el.object3D.position, c = this.data.centro, b = this.data.caja;
      if (b.x > 0 || b.z > 0) {
        p.x = clamp(p.x, c.x - b.x, c.x + b.x);
        p.z = clamp(p.z, c.z - b.z, c.z + b.z);
      } else {
        const dx = p.x - c.x, dz = p.z - c.z, dist = Math.hypot(dx, dz);
        if (dist > this.data.radio) { p.x = c.x + dx / dist * this.data.radio; p.z = c.z + dz / dist * this.data.radio; }
      }
    }
  });

  /* ── caminar (en el rig #jugador) ───────────────────────────────────────────
     WASD/flechas en ordenador · stick izquierdo en VR (derecho = giro por pasos,
     gatillo lateral = mundo anterior/siguiente). Camina hacia donde miras.
     Si el mundo registró TX.alturaSuelo, el jugador sigue el relieve.         */
  AFRAME.registerComponent('caminar', {
    schema: {
      velocidad: { default: 4.5 },
      suavizado: { default: 9 },
      giroVR:    { default: 30 }
    },
    init: function () {
      this.teclas = {};
      this.vel = new THREE.Vector3();
      this.stick = { x: 0, y: 0 };
      this.girando = false;
      this.camara = this.el.querySelector('[camera]');
      this.quat = new THREE.Quaternion();
      this.euler = new THREE.Euler();
      window.addEventListener('keydown', e => { this.teclas[e.code] = true; });
      window.addEventListener('keyup',   e => { this.teclas[e.code] = false; });
      window.addEventListener('blur',    () => { this.teclas = {}; });
      this.el.addEventListener('thumbstickmoved', e => {
        const id = e.target.id, x = e.detail.x, y = e.detail.y;
        if (id === 'mano-izq') { this.stick.x = Math.abs(x) > 0.12 ? x : 0; this.stick.y = Math.abs(y) > 0.12 ? y : 0; }
        if (id === 'mano-der') {
          if (Math.abs(x) > 0.7 && !this.girando) { this.girando = true; this.el.object3D.rotation.y -= Math.sign(x) * this.data.giroVR * Math.PI / 180; }
          else if (Math.abs(x) < 0.3) this.girando = false;
        }
      });
      this.el.addEventListener('gripdown', e => {
        this.el.sceneEl.emit(e.target.id === 'mano-der' ? 'mundo-siguiente' : 'mundo-anterior');
      });
    },
    tick: function (t, dt) {
      if (!this.camara) return;
      dt = Math.min(dt, 50) / 1000;
      const k = this.teclas;
      let ad = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - this.stick.y;
      let la = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + this.stick.x;
      const len = Math.hypot(ad, la);
      if (len > 1) { ad /= len; la /= len; }
      this.camara.object3D.getWorldQuaternion(this.quat);
      const yaw = this.euler.setFromQuaternion(this.quat, 'YXZ').y;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const v = this.data.velocidad, f = 1 - Math.exp(-this.data.suavizado * dt);
      this.vel.x += ((fx * ad + rx * la) * v - this.vel.x) * f;
      this.vel.z += ((fz * ad + rz * la) * v - this.vel.z) * f;
      const p = this.el.object3D.position;
      p.x += this.vel.x * dt; p.z += this.vel.z * dt;
      if (TX.alturaSuelo) p.y += (TX.alturaSuelo(p.x, p.z) - p.y) * (1 - Math.exp(-12 * dt));
    }
  });

  /* ── rendimiento (en <a-scene>) ─────────────────────────────────────────────
     Limita la resolución de render · Q cambia de calidad · ?stats muestra FPS. */
  AFRAME.registerComponent('rendimiento', {
    init: function () {
      this.nivel = 0;
      const escena = this.el;
      if (/[?&]stats/.test(location.search)) escena.setAttribute('stats', true);
      const aplicar = () => {
        const r = escena.renderer;
        if (!r) return;
        r.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.rendimiento.niveles[this.nivel]));
        window.dispatchEvent(new Event('resize'));
      };
      escena.addEventListener('renderstart', aplicar);
      window.addEventListener('keydown', e => {
        if (e.repeat || (e.key !== 'q' && e.key !== 'Q')) return;
        this.nivel = (this.nivel + 1) % CONFIG.rendimiento.niveles.length;
        aplicar();
        const av = document.getElementById('aviso');
        if (av) {
          av.textContent = 'calidad ' + (this.nivel + 1) + '/' + CONFIG.rendimiento.niveles.length +
            ' · resolución ×' + Math.min(window.devicePixelRatio || 1, CONFIG.rendimiento.niveles[this.nivel]);
          av.classList.add('visible');
          clearTimeout(this.tAviso);
          this.tAviso = setTimeout(() => av.classList.remove('visible'), 1800);
        }
      });
      escena.addEventListener('enter-vr', () => {
        const i = document.getElementById('inicio');
        if (i) i.classList.add('oculto');
        escena.emit('entrar');
      });
    }
  });


  /* ========================================================================
     5 · PIEZAS COMUNES (se usan en varios mundos)
     ======================================================================== */

  /* ── brillos: partículas flotantes (purpurina, polvo, ceniza…) ───────────────
     <a-entity brillos="cantidad: 300; area: 40 12 40; velocidad: 0.1; colores: #fff">
       velocidad positiva = sube · negativa = cae (ceniza, lluvia)
       area = tamaño del volumen centrado en la entidad                       */
  AFRAME.registerComponent('brillos', {
    schema: {
      cantidad:  { default: 300 },
      area:      { type: 'vec3', default: { x: 60, y: 10, z: 60 } },
      tamano:    { default: 0.14 },
      velocidad: { default: 0.15 },
      parpadeo:  { default: 1 },                  // 0 = fijas, 1 = titilan
      colores:   { default: '#ffb3d9,#9fe8ff,#8dff3a,#ffc928,#b06bff,#ffffff' }
    },
    init: function () {
      const d = this.data, R = rng(77), n = d.cantidad;
      const paleta = d.colores.split(',').map(s => new THREE.Color(s.trim()));
      this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3);
      this.base = new Float32Array(n * 3); this.fase = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        this.pos[i * 3] = (R() - 0.5) * d.area.x; this.pos[i * 3 + 1] = R() * d.area.y; this.pos[i * 3 + 2] = (R() - 0.5) * d.area.z;
        const c = paleta[Math.floor(R() * paleta.length)];
        this.base.set([c.r, c.g, c.b], i * 3);
        this.fase[i] = R() * Math.PI * 2;
      }
      const geo = new THREE.BufferGeometry();
      this.attrPos = new THREE.BufferAttribute(this.pos, 3); this.attrCol = new THREE.BufferAttribute(this.col, 3);
      geo.setAttribute('position', this.attrPos); geo.setAttribute('color', this.attrCol);
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        size: d.tamano, map: texturaBrillo(), vertexColors: true, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      pts.frustumCulled = false;
      this.el.setObject3D('mesh', pts);
    },
    tick: function (t, dt) {
      const d = this.data, n = d.cantidad, s = dt * 0.001;
      for (let i = 0; i < n; i++) {
        let y = this.pos[i * 3 + 1] + d.velocidad * s;
        if (y > d.area.y) y = 0; else if (y < 0) y = d.area.y;
        this.pos[i * 3 + 1] = y;
        this.pos[i * 3] += Math.sin(t * 0.0004 + this.fase[i]) * 0.004;
        const k = d.parpadeo ? 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 0.0025 + this.fase[i])) : 1;
        this.col[i * 3] = this.base[i * 3] * k; this.col[i * 3 + 1] = this.base[i * 3 + 1] * k; this.col[i * 3 + 2] = this.base[i * 3 + 2] * k;
      }
      this.attrPos.needsUpdate = true; this.attrCol.needsUpdate = true;
    }
  });

  /* ── senda: camino de lucecitas con un pulso que viaja (coordenadas del MUNDO) ──
     <a-entity senda="desde: 0 0 -17; hasta: 0 0 -33; color: #ff3d9a">          */
  AFRAME.registerComponent('senda', {
    schema: {
      desde: { type: 'vec3' }, hasta: { type: 'vec3' },
      separacion: { default: 1.4 }, color: { default: CONFIG.paleta.rosa }, tamano: { default: 0.34 }
    },
    init: function () {
      const d = this.data;
      const a = new THREE.Vector3(d.desde.x, d.desde.y + 0.2, d.desde.z), b = new THREE.Vector3(d.hasta.x, d.hasta.y + 0.2, d.hasta.z);
      const n = Math.max(2, Math.floor(a.distanceTo(b) / d.separacion));
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const p = a.clone().lerp(b, i / (n - 1)); pos.set([p.x, p.y, p.z], i * 3); }
      this.n = n; this.base = new THREE.Color(d.color); this.col = new Float32Array(n * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.attrColor = new THREE.BufferAttribute(this.col, 3);
      geo.setAttribute('color', this.attrColor);
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        size: d.tamano, map: texturaBrillo(), vertexColors: true, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      pts.frustumCulled = false;
      this.el.setObject3D('mesh', pts);
    },
    tick: function (t) {
      for (let i = 0; i < this.n; i++) {
        const k = 0.18 + 0.82 * Math.max(0, Math.sin(t * 0.003 - i * 0.55));
        this.col[i * 3] = this.base.r * k; this.col[i * 3 + 1] = this.base.g * k; this.col[i * 3 + 2] = this.base.b * k;
      }
      this.attrColor.needsUpdate = true;
    }
  });

  /* ── planta: hojas alargadas (barata de dibujar) ─────────────────────────────
     <a-entity planta="hojas: 12; alto: 1.4; flores: 5; color: #3f9e3a; maceta: false"> */
  AFRAME.registerComponent('planta', {
    schema: {
      hojas: { default: 10 }, alto: { default: 1.2 }, color: { default: '#3f9e3a' }, colorB: { default: '#1f5f2b' },
      flores: { default: 0 }, colorFlor: { default: CONFIG.paleta.amarillo }, maceta: { default: true }, semilla: { default: 1 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla + 100), g = new THREE.Group();
      const geoHoja = new THREE.SphereGeometry(0.5, 8, 6);
      geoHoja.scale(0.35, 0.06, 1); geoHoja.translate(0, 0, 0.5);            // base de la hoja en el origen
      const matA = mat.estandar(d.color,  { emissive: d.color,  emissiveIntensity: 0.15, side: THREE.DoubleSide, roughness: 0.8 });
      const matB = mat.estandar(d.colorB, { emissive: d.colorB, emissiveIntensity: 0.15, side: THREE.DoubleSide, roughness: 0.8 });
      const y0 = d.maceta ? 0.28 : 0;
      for (let i = 0; i < d.hojas; i++) {
        const largo = d.alto * (0.55 + R() * 0.6), hoja = new THREE.Mesh(geoHoja, i % 2 ? matA : matB);
        hoja.rotation.order = 'YXZ';
        hoja.rotation.set(-(0.35 + R() * 0.85), R() * Math.PI * 2, 0);        // inclinación y giro
        hoja.scale.set(largo * 0.45, 1, largo); hoja.position.y = y0;
        g.add(hoja);
      }
      if (d.flores > 0) {
        const geoFlor = new THREE.SphereGeometry(0.06, 8, 6), matFlor = mat.basico(d.colorFlor);
        for (let i = 0; i < d.flores; i++) {
          const f = new THREE.Mesh(geoFlor, matFlor), a = R() * Math.PI * 2, r = 0.1 + R() * 0.35;
          f.position.set(Math.cos(a) * r, y0 + d.alto * (0.6 + R() * 0.5), Math.sin(a) * r);
          g.add(f);
        }
      }
      if (d.maceta) {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.28, 12), mat.estandar('#b5532c', { roughness: 0.9 }));
        pot.position.y = 0.14; g.add(pot);
      }
      this.el.setObject3D('mesh', g);
    }
  });

  /* ── cableado: cables que cuelgan de un techo (el origen está en el techo) ──────
     <a-entity cableado="cantidad: 30; ancho: 20; largo: 30; caida: 3" position="0 14 0"> */
  AFRAME.registerComponent('cableado', {
    schema: {
      cantidad: { default: 16 }, ancho: { default: 3.6 }, largo: { default: 9 }, caida: { default: 0.7 },
      grosor: { default: 0.03 }, color: { default: '#d9d2c3' }, semilla: { default: 8 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla), tramos = [];
      for (let i = 0; i < d.cantidad; i++) {
        const x = (R() - 0.5) * d.ancho, z = (R() - 0.5) * d.largo;
        tramos.push({
          a: new THREE.Vector3(x, 0, z),
          b: new THREE.Vector3(x + (R() - 0.5) * 1.6 * (1 + d.caida * 0.4), 0, z + (R() - 0.5) * 2.4 * (1 + d.caida * 0.4)),
          caida: d.caida * (0.4 + R())
        });
      }
      this.el.setObject3D('mesh', new THREE.Mesh(cablesColgantes(tramos, d.grosor), mat.estandar(d.color, { roughness: 0.6 })));
    }
  });

  /* ── rayos-luz: columnas de luz (para ventanas y claraboyas) ─────────────────────
     <a-entity rayos-luz="cantidad: 5; area: 30 40; alto: 15; color: #fff; opacidad: 0.15"
               position="0 15 0">   ← el origen es la altura del techo              */
  AFRAME.registerComponent('rayos-luz', {
    schema: {
      cantidad: { default: 5 }, area: { type: 'vec2', default: { x: 30, y: 40 } }, alto: { default: 15 },
      ancho: { default: 3 }, inclinacion: { default: -14 }, color: { default: '#ffffff' }, opacidad: { default: 0.15 }, semilla: { default: 3 }
    },
    init: function () {
      const d = this.data, R = rng(d.semilla), pos = [];
      for (let i = 0; i < d.cantidad; i++) pos.push(new THREE.Vector3((R() - 0.5) * d.area.x, 0, (R() - 0.5) * d.area.y));
      this.el.setObject3D('mesh', crearRayos({ posiciones: pos, alto: d.alto, ancho: d.ancho, inclinacion: d.inclinacion, color: d.color, opacidad: d.opacidad }));
    }
  });


  /* ========================================================================
     6 · INTERFAZ Y SONIDO
     ======================================================================== */

  /* ── hud (en <a-scene>): menú de mundos, título al entrar, teclas ───────────── */
  AFRAME.registerComponent('hud', {
    init: function () {
      this.items = [];
      this.el.addEventListener('mundos-listos', () => this.construir());
      this.el.addEventListener('mundo-cambiado', e => this.mostrar(e.detail));
      this.el.addEventListener('mundo-siguiente', () => { const g = this.gestor; g.ir((g.actual + 1) % g.lista.length); });
      this.el.addEventListener('mundo-anterior',  () => { const g = this.gestor; g.ir((g.actual - 1 + g.lista.length) % g.lista.length); });
    },
    construir: function () {
      const el = this.el, romano = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
      this.gestor = el.components['gestor-mundos'];
      this.dom = {
        hud: document.getElementById('hud'), lista: document.getElementById('hud-mundos'),
        actual: document.getElementById('hud-actual'), inicio: document.getElementById('inicio'), entrar: document.getElementById('entrar')
      };
      this.gestor.lista.forEach((m, i) => {
        const li = document.createElement('li');
        li.innerHTML = '<span>' + romano[i] + '</span>' + m.getAttribute('mundo').nombre;
        li.addEventListener('click', () => this.gestor.ir(i));
        this.dom.lista.appendChild(li); this.items.push(li);
      });
      this.dom.entrar.addEventListener('click', () => { this.dom.inicio.classList.add('oculto'); el.emit('entrar'); });
      window.addEventListener('keydown', e => {
        if (e.repeat) return;
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= this.gestor.lista.length) this.gestor.ir(n - 1);
        if (e.key === 'h' || e.key === 'H') this.dom.hud.classList.toggle('oculto');
        if (e.key === 'm' || e.key === 'M') el.emit('alternar-sonido');
      });
    },
    mostrar: function (det) {
      if (!this.dom) return;
      this.items.forEach((li, i) => li.classList.toggle('activo', i === det.indice));
      const a = this.dom.actual;
      a.innerHTML = '<b>' + det.nombre + '</b><i>' + det.descripcion + '</i>';
      a.classList.add('visible');
      clearTimeout(this.tTitulo);
      this.tTitulo = setTimeout(() => a.classList.remove('visible'), 5000);
    }
  });

  /* ── ambiente-sonoro (en <a-scene>) ──────────────────────────────────────────
     Drone + campanitas con reverb, todo sintetizado con la Web Audio API.
     Cada mundo define su nota (`tono`), su brillo y cuántas campanas suenan.   */
  AFRAME.registerComponent('ambiente-sonoro', {
    init: function () {
      this.silencio = false; this.tono = 55; this.brillo = 420; this.pCampana = 0.5; this.osc = [];
      this.el.addEventListener('entrar', () => this.iniciar());
      this.el.addEventListener('alternar-sonido', () => this.alternar());
      this.el.addEventListener('mundo-cambiado', e => {
        this.tono = e.detail.tono; this.brillo = e.detail.brillo; this.pCampana = e.detail.campanas; this.afinar();
      });
    },
    afinar: function () {                         // cambia suavemente de un mundo a otro
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.osc.forEach(o => o.osc.frequency.setTargetAtTime(this.tono * o.mult, t, 1.8));
      this.filtro.frequency.setTargetAtTime(this.brillo, t, 1.8);
    },
    iniciar: function () {
      if (!CONFIG.sonido.activo || this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      const salida = this.salida = ctx.createGain();
      salida.gain.value = CONFIG.sonido.volumen; salida.connect(ctx.destination);

      // reverb sintética: ruido que se apaga
      const len = Math.floor(ctx.sampleRate * 3.5), buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const ch = buf.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
      const rev = ctx.createConvolver(); rev.buffer = buf;
      const revG = ctx.createGain(); revG.gain.value = 0.7; rev.connect(revG); revG.connect(salida);

      // drone: 4 osciladores (nota base ×1, ×1.5, ×2, ×3) → filtro → salida
      const filtro = this.filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass'; filtro.frequency.value = this.brillo; filtro.Q.value = 2;
      const padG = ctx.createGain(); padG.gain.value = 0.25;
      filtro.connect(padG); padG.connect(salida); padG.connect(rev);
      [1, 1.5, 2, 3].forEach((mult, i) => {
        const o = ctx.createOscillator();
        o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = this.tono * mult; o.detune.value = (Math.random() - 0.5) * 14;
        const g = ctx.createGain(); g.gain.value = 0.5 / (i + 1);
        o.connect(g); g.connect(filtro); o.start();
        this.osc.push({ osc: o, mult: mult });
      });
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;     // el filtro "respira" lentamente
      const lfoG = ctx.createGain(); lfoG.gain.value = 140;
      lfo.connect(lfoG); lfoG.connect(filtro.frequency); lfo.start();

      // campanitas esporádicas (escala pentatónica)
      const notas = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
      const campana = () => {
        if (!this.silencio && ctx.state === 'running' && Math.random() < this.pCampana) {
          const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
          o.type = 'sine'; o.frequency.value = notas[(Math.random() * notas.length) | 0];
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
          o.connect(g); g.connect(rev); g.connect(salida); o.start(t); o.stop(t + 3.2);
        }
        setTimeout(campana, 2500 + Math.random() * 5000);
      };
      campana();
    },
    alternar: function () {
      this.silencio = !this.silencio;
      if (this.salida) this.salida.gain.setTargetAtTime(this.silencio ? 0 : CONFIG.sonido.volumen, this.ctx.currentTime, 0.2);
    }
  });

})();
