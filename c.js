/* ==========================================================================
   C.JS · EL NÚCLEO (el "corazón" que comparten los 8 mundos)
   ==========================================================================

   Normalmente NO necesitas tocar este archivo. Lo que cambias seguido está en:
     · config.js        → música, modelos 3D, calidad, textos y diálogos
     · mundos/mX-*.js   → cómo se ve cada mundo

   Índice de este archivo (busca el número con Ctrl+F):
     §1  HERRAMIENTAS (H)  → funciones para construir: cajas, luces, pasto…
     §2  CIELO Y AMBIENTE  → degradado del cielo, sol, niebla, reflejos
     §3  MUNDOS            → cargar / descargar un mundo, viajar entre ellos
     §4  JUGADOR           → caminar, chocar con paredes, altura del suelo
     §5  ORBES, PORTALES Y ZONAS → los componentes interactivos
     §6  DIÁLOGOS E INTERFAZ (HUD)
     §7  SONIDO            → música por archivo o sintetizador
     §8  CALIDAD Y RENDIMIENTO
     §9  ARRANQUE

   ──────────────────────────────────────────────────────────────────────────
   MINI-CURSO: A-FRAME Y THREE.JS EN 5 IDEAS
   ──────────────────────────────────────────────────────────────────────────
   1) ESCENA. En index.html, <a-scene> crea el mundo 3D, la cámara y el bucle
      que dibuja ~60 veces por segundo.

   2) ENTIDAD. <a-entity> es un objeto vacío con posición, rotación y escala.
      Las entidades se anidan: si mueves al padre, se mueven los hijos.
      Cada mundo es UNA entidad (id="mundo-3", etc.) y todo lo suyo va dentro;
      por eso borrar un mundo es borrar esa entidad.

   3) COMPONENTE. Es un comportamiento que se pega a una entidad como si fuera
      un atributo HTML:   <a-entity portal="destino: 2; color: #fff">
      Se registra con AFRAME.registerComponent('nombre', { schema, init, tick }):
        · schema → sus opciones (con valores por defecto)
        · init() → se ejecuta una vez al nacer
        · tick() → se ejecuta en cada cuadro (para animar)
      En este archivo hay 4: jugador, orbe-vigia, portal y zona-dialogo.

   4) THREE.JS. A-Frame está construido encima de Three.js. Para los objetos
      del escenario usamos Three.js directo porque es mucho más rápido:
        Geometría (la forma) + Material (el color/brillo) = Malla (Mesh)
      · MeshStandardMaterial → reacciona a la luz (realista)
      · MeshBasicMaterial    → ignora la luz, siempre brilla igual (neones)
      · AdditiveBlending     → suma luz: halos, rayos, cables brillantes

   5) PIEZAS Y RENDIMIENTO. Cada objeto es su propia <a-entity> (con id y
      dentro de una sección), así en el INSPECTOR (Ctrl + Alt + I) se puede
      tocar por separado. Solo las "masas" de miles de cosas iguales (pasto,
      partículas, hojas…) se dibujan juntas, con H.instancias(..., { masa: true }).
      Y solo existe en memoria el mundo activo: al salir, se destruye.
      Lo que muevas en el inspector se guarda en ajustes.js (ver §3, EDICIÓN).
   ========================================================================== */

(function () {
  'use strict';
  const THREE = AFRAME.THREE;
  const CONFIG = window.CONFIG;
  const rad = THREE.MathUtils.degToRad;

  /* Arreglo para el INSPECTOR: su puntero revisa qué hay bajo el mouse sin
     decir desde qué cámara mira. Three.js no sabe medir un halo (Sprite) así,
     lanza un error y el dibujo se congela. Le prestamos la cámara activa.   */
  const raycastSprite = THREE.Sprite.prototype.raycast;
  THREE.Sprite.prototype.raycast = function (raycaster, intersecciones) {
    if (!raycaster.camera) raycaster.camera = AFRAME.scenes[0] && AFRAME.scenes[0].camera;
    if (!raycaster.camera) return;
    return raycastSprite.call(this, raycaster, intersecciones);
  };
  // Algo que no se puede tocar con el mouse en el inspector (cielo, niebla, rayos de luz…)
  const intocable = obj => { obj.raycast = () => {}; return obj; };
  const clamp = THREE.MathUtils.clamp;

  // Convierte [x, y, z] en un vector de Three.js
  const V3 = a => Array.isArray(a) ? new THREE.Vector3(a[0] || 0, a[1] || 0, a[2] || 0) : a.clone();

  /* El objeto global TECNO: lo usan los mundos para registrarse y los
     componentes para comunicarse entre sí.                                  */
  const TECNO = window.TECNO = {
    mundos: {},                  // los 8 mundos registrados (por número)
    actual: null,                // la definición del mundo activo
    bloqueado: true,             // true = no puedes caminar (diálogo, transición, inicio)
    transicionando: false,
    panelAbierto: false,
    nivel: null,                 // el nivel de calidad activo (ver config.js)
    claveCalidad: 'media',
    camaraPos: new THREE.Vector3(), // dónde están tus ojos (lo actualiza el jugador)
    camaraDerecha: new THREE.Vector3(1, 0, 0),
    joy: { x: 0, y: 0 },         // joystick táctil
  };

  // Cada archivo de /mundos llama a esto para "presentarse"
  TECNO.registrarMundo = def => { TECNO.mundos[def.id] = def; };

  let escena = null, renderer = null, jugadorEl = null, camaraEl = null, pmrem = null;

  /* E = el mundo activo:
       raiz       → la <a-entity> del mundo
       grupo      → su objeto de Three.js (ahí se agrega todo)
       solidos    → cajas invisibles con las que choca el jugador
       animadores → funciones que se ejecutan en cada cuadro               */
  let E = null;


  /* ==========================================================================
     §1 · HERRAMIENTAS (H)
     --------------------------------------------------------------------------
     Todas reciben un objeto de opciones, así se leen solas:
         H.caja({ ancho: 2, alto: 3, fondo: 1, pos: [0, 1.5, -4], color: '#888' })

     Opciones comunes:
         pos  → [x, y, z]  posición del CENTRO del objeto (metros)
         rot  → [x, y, z]  rotación en grados  (y = girar a los lados)
         esc  → escala: número o [x, y, z]
         padre→ dentro de qué grupo va (por defecto: el mundo)
     Ejes:  X = derecha · Y = arriba · Z = hacia ti (−Z = hacia el fondo)
     ========================================================================== */
  const H = TECNO.H = {};

  /* ── Azar con semilla: cada mundo usa siempre la misma secuencia, así al
        recargar (o cambiar la calidad) se ve igual. ─────────────────────── */
  let semilla = 1;
  function azar() {
    semilla = (semilla + 0x6D2B79F5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  H.azar = (a = 0, b = 1) => a + (b - a) * azar();          // número decimal entre a y b
  H.azarEntero = (a, b) => Math.floor(H.azar(a, b + 1));    // entero entre a y b
  H.elegir = lista => lista[Math.floor(azar() * lista.length)];

  // Escala una cantidad según la calidad (densidad). Úsala para todo lo repetido.
  H.cantidad = n => Math.max(1, Math.round(n * TECNO.nivel.densidad));
  H.densidad = () => TECNO.nivel.densidad;
  H.sombras = () => !!TECNO.nivel.sombras;
  H.camara = () => TECNO.camaraPos;   // posición de tus ojos (para que algo te mire)
  H.suave = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ── TEXTURAS dibujadas con código (canvas 2D) → cero archivos externos ──
     Para usar una imagen tuya: H.mat({ textura: H.imagen('texturas/x.jpg') })  */
  function lienzo(w, h, dibujar) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    if (dibujar) dibujar(c.getContext('2d'), w, h);
    return c;
  }
  function motas(g, w, h, n, colores, min, max, alfa = 0.5) {
    g.globalAlpha = alfa;
    for (let i = 0; i < n; i++) {
      g.fillStyle = colores[(Math.random() * colores.length) | 0];
      const s = min + Math.random() * (max - min);
      g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
    g.globalAlpha = 1;
  }
  function radial(g, w, h, paradas) {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    paradas.forEach(([p, a]) => r.addColorStop(p, `rgba(255,255,255,${a})`));
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  }

  // Cada textura: [ancho, alto, función que la dibuja]
  const DIBUJOS = {
    // halo de luz suave (soles, brillos, lámparas)
    brillo: [128, 128, (g, w, h) => radial(g, w, h, [[0, 1], [0.18, 0.6], [0.45, 0.16], [1, 0]])],
    // puntito para partículas
    punto: [32, 32, (g, w, h) => radial(g, w, h, [[0, 1], [0.4, 0.55], [1, 0]])],
    // la luz de los portales: fuerte al centro, se desvanece hacia arriba
    puerta: [64, 256, (g, w, h) => {
      const gx = g.createLinearGradient(0, 0, w, 0);
      gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gx; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in';
      const gy = g.createLinearGradient(0, 0, 0, h);
      gy.addColorStop(0, 'rgba(0,0,0,0.1)'); gy.addColorStop(0.55, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = gy; g.fillRect(0, 0, w, h);
    }],
    // concreto con marcas de tablas verticales (como la arquitectura brutalista)
    concreto: [256, 256, (g, w, h) => {
      g.fillStyle = '#8b8a86'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) {
        const v = (118 + Math.random() * 34) | 0;
        g.globalAlpha = 0.45; g.fillStyle = `rgb(${v},${v},${v - 3})`; g.fillRect(x, 0, 16, h);
        g.globalAlpha = 0.5; g.fillStyle = '#3a3a38'; g.fillRect(x, 0, 1, h);
      }
      g.globalAlpha = 1;
      motas(g, w, h, 1800, ['#6f6e6a', '#a3a29d', '#5d5c58'], 1, 2.5);
      for (let i = 0; i < 12; i++) {          // chorreaduras de humedad
        const x = Math.random() * w, y = Math.random() * h * 0.6, al = 40 + Math.random() * 150;
        const gr = g.createLinearGradient(0, y, 0, y + al);
        gr.addColorStop(0, 'rgba(40,38,34,0.35)'); gr.addColorStop(1, 'rgba(40,38,34,0)');
        g.fillStyle = gr; g.fillRect(x, y, 5 + Math.random() * 18, al);
      }
    }],
    // piso tecnológico: placas, ranuras y líneas verdes
    panel: [512, 512, (g, w, h) => {
      g.fillStyle = '#1f2322'; g.fillRect(0, 0, w, h);
      const t = 64;
      for (let y = 0; y < h; y += t) for (let x = 0; x < w; x += t) {
        const v = (40 + Math.random() * 18) | 0;
        g.fillStyle = `rgb(${v},${v + 3},${v + 2})`; g.fillRect(x + 2, y + 2, t - 4, t - 4);
        if (Math.random() < 0.4) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + 8 + Math.random() * 20, y + 8 + Math.random() * 20, 10 + Math.random() * 26, 4 + Math.random() * 12); }
        if (Math.random() < 0.15) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 4, y + 4, t - 8, 3); }
      }
      g.strokeStyle = 'rgba(110,170,80,0.35)'; g.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y);
        for (let k = 0; k < 5; k++) { if (Math.random() < 0.5) x += (Math.random() - 0.5) * 300; else y += (Math.random() - 0.5) * 300; g.lineTo(x, y); }
        g.stroke();
      }
      motas(g, w, h, 2500, ['#000', '#3a403e'], 1, 2, 0.3);
    }],
    // metal cepillado (rayitas horizontales, como el cromo rosa de la referencia)
    metal: [256, 256, (g, w, h) => {
      g.fillStyle = '#c4c4c4'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1100; i++) {
        const v = (150 + Math.random() * 105) | 0;
        g.fillStyle = `rgba(${v},${v},${v},0.35)`;
        g.fillRect(Math.random() * w - 40, Math.random() * h, 40 + Math.random() * 160, 1);
      }
    }],
    arena: [256, 256, (g, w, h) => { g.fillStyle = '#c9a888'; g.fillRect(0, 0, w, h); motas(g, w, h, 5000, ['#a88a70', '#e2c6a8', '#8c7360', '#f0dcc4'], 1, 2, 0.5); }],
    pasto: [256, 256, (g, w, h) => { g.fillStyle = '#56733a'; g.fillRect(0, 0, w, h); motas(g, w, h, 5000, ['#3d5528', '#6f8c45', '#8a8a40', '#2e3f20'], 1, 3, 0.6); }],
    // luces de servidores
    leds: [128, 128, (g, w, h) => {
      g.fillStyle = '#0b0d0f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#16191c'; for (let y = 0; y < h; y += 16) g.fillRect(4, y + 2, w - 8, 12);
      const col = ['#38ff8b', '#ffb23a', '#ff3a4a', '#4ad8ff'];
      for (let y = 0; y < h; y += 16) for (let x = 10; x < w - 8; x += 9) if (Math.random() < 0.35) { g.fillStyle = col[(Math.random() * col.length) | 0]; g.fillRect(x, y + 6, 3, 3); }
    }],
    // nubes para el cielo de la torre
    nubes: [512, 512, (g, w, h) => {
      for (let i = 0; i < 90; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 110;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(255,255,255,${0.05 + Math.random() * 0.12})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }],
    // espuma del mar
    espuma: [256, 64, (g, w, h) => {
      for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`; g.fillRect(Math.random() * w, h * 0.3 + Math.random() * h * 0.4, 4 + Math.random() * 30, 1 + Math.random() * 2); }
    }],
    // destellos del sol sobre el agua
    reflejo: [64, 512, (g, w, h) => {
      for (let i = 0; i < 700; i++) {
        const y = Math.random() * h, a = Math.random() * 0.8;
        const an = 4 + Math.random() * 40 * (y / h + 0.3);
        g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(w / 2 - an / 2 + (Math.random() - 0.5) * 20, y, an, 1 + Math.random() * 2);
      }
    }],
    // iris del ojo (se tiñe con el color del orbe)
    iris: [256, 256, (g, w, h) => {
      const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, '#ffffff'); r.addColorStop(0.45, '#ffffff'); r.addColorStop(0.8, '#9a9a9a'); r.addColorStop(0.93, '#1a1a1a'); r.addColorStop(1, '#000');
      g.fillStyle = r; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      for (let i = 0; i < 160; i++) { const a = Math.random() * Math.PI * 2; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 30, h / 2 + Math.sin(a) * 30); g.lineTo(w / 2 + Math.cos(a) * 118, h / 2 + Math.sin(a) * 118); g.stroke(); }
    }],
    // ventanas encendidas para edificios lejanos
    ventanas: [128, 256, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      for (let y = 4; y < h; y += 10) for (let x = 4; x < w; x += 8) if (Math.random() < 0.12) { g.fillStyle = `rgba(160,255,230,${0.3 + Math.random() * 0.7})`; g.fillRect(x, y, 4, 5); }
    }],
  };

  const cacheTex = {};
  /* H.tex('concreto')            → la textura compartida
     H.tex('concreto', [4, 2])    → una copia repetida 4 veces a lo ancho y 2 a lo alto */
  H.tex = (nombre, repetir) => {
    if (!cacheTex[nombre]) {
      const d = DIBUJOS[nombre];
      if (!d) { console.warn('No existe la textura', nombre); return null; }
      const t = new THREE.CanvasTexture(lienzo(d[0], d[1], d[2]));
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      t.userData.compartida = true;          // no se borra al cambiar de mundo
      cacheTex[nombre] = t;
    }
    const base = cacheTex[nombre];
    if (!repetir) return base;
    const t = base.clone();
    t.userData = {};
    t.repeat.set(repetir[0], repetir[1]);
    t.needsUpdate = true;
    return t;
  };

  // Una imagen tuya como textura: H.imagen('texturas/piel.jpg', [2, 2])
  H.imagen = (url, repetir) => {
    const t = new THREE.TextureLoader().load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (repetir) t.repeat.set(repetir[0], repetir[1]);
    return t;
  };

  // Pantalla de computadora animada (texto que cambia solo)
  H.texPantalla = (color = '#8cffc1') => {
    const c = lienzo(128, 96), g = c.getContext('2d');
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const signos = '01<>/#$%_=+ABCDEFXYZ';
    const dibujar = () => {
      g.fillStyle = '#03100a'; g.fillRect(0, 0, 128, 96);
      g.fillStyle = color; g.font = '9px monospace';
      for (let i = 0; i < 8; i++) {
        let s = ''; const n = (Math.random() * 18) | 0;
        for (let k = 0; k < n; k++) s += signos[(Math.random() * signos.length) | 0];
        g.globalAlpha = 0.5 + Math.random() * 0.5; g.fillText(s, 6, 13 + i * 10.5);
      }
      g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,0.35)';
      for (let y = 0; y < 96; y += 3) g.fillRect(0, y, 128, 1);
      t.needsUpdate = true;
    };
    dibujar();
    let acum = 0;
    H.animar((tt, dt) => { acum += dt; if (acum > 0.12) { acum = 0; dibujar(); } });
    return t;
  };

  /* ── MATERIALES ──────────────────────────────────────────────────────────
     H.mat({ ... }) opciones:
       color       '#ff00aa'
       textura     'concreto' | 'panel' | 'metal' | ... (ver DIBUJOS) o una textura
       repetir     [u, v]  cuántas veces se repite la textura
       rugosidad   0 (espejo) a 1 (mate)
       metal       0 a 1
       reflejo     cuánto refleja el cielo (1 normal, 2 mucho)
       emisivo     color con el que BRILLA solo, aunque no haya luz
       brillo      intensidad de ese brillo
       transparente / opacidad (0 a 1)
       aditivo     true → suma luz (halos, rayos, cables brillantes)
       basico      true → ignora las luces (siempre igual de brillante)
       doble       true → se ve por ambos lados
       atras       true → solo se ve por dentro (cúpulas, cuartos cilíndricos)
       colores     true → usa los colores de los vértices
       niebla      false → la niebla no lo afecta
       mapaEmisivo true → la textura también brilla (ventanas encendidas)      */
  H.mat = (o = {}) => {
    let tex = o.textura;
    if (typeof tex === 'string') tex = H.tex(tex, o.repetir);
    const transparente = !!(o.transparente || o.aditivo || (o.opacidad !== undefined && o.opacidad < 1));
    const comun = {
      color: new THREE.Color(o.color ?? '#ffffff'),
      map: tex || null,
      transparent: transparente,
      opacity: o.opacidad ?? 1,
      side: o.doble ? THREE.DoubleSide : (o.atras ? THREE.BackSide : THREE.FrontSide),
      fog: o.niebla ?? !o.aditivo,
      vertexColors: !!o.colores,
      depthWrite: o.escribirProfundidad ?? !transparente,
    };
    if (o.aditivo) comun.blending = THREE.AdditiveBlending;
    if (o.basico || o.aditivo) return new THREE.MeshBasicMaterial(comun);
    return new THREE.MeshStandardMaterial({
      ...comun,
      roughness: o.rugosidad ?? 0.85,
      metalness: o.metal ?? 0,
      emissive: new THREE.Color(o.emisivo ?? '#000000'),
      emissiveIntensity: o.brillo ?? 1,
      emissiveMap: o.mapaEmisivo ? tex : null,
      envMapIntensity: o.reflejo ?? 1,
      flatShading: !!o.facetado,
    });
  };

  /* ── GEOMETRÍAS ──────────────────────────────────────────────────────────
     H.geo.caja({...}) crea la FORMA ya movida a su lugar (pos/rot/esc), lista
     para fusionarla con otras:  H.malla(H.fusionar([geo1, geo2]), material)

     Formas y sus medidas:
       caja      ancho, alto, fondo
       cilindro  radio (o radioArriba / radioAbajo), alto, lados, abierto
       esfera    radio, lados
       capsula   radio, largo
       toro      radio, grosor, arco (grados), lados        (una dona / anillo)
       cono      radio, alto, lados
       plano     ancho, alto, divX, divY
       circulo   radio, lados
       anillo    radioInterno, radio, lados                  (disco con hueco)
       roca      radio, detalle                              (piedra irregular)
       tubo      puntos: [[x,y,z], ...], radio               (curva suave)
       cable     desde: [x,y,z], hasta: [x,y,z], caida, radio (cuelga como cable) */
  const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
  // Las rotaciones usan orden 'YXZ': primero inclina (x, z) y al final gira (y)
  const euler = r => _e.set(rad(r[0] || 0), rad(r[1] || 0), rad(r[2] || 0), 'YXZ');
  function matrizDe(o) {
    o.pos ? _p.set(o.pos[0] || 0, o.pos[1] || 0, o.pos[2] || 0) : _p.set(0, 0, 0);
    _q.setFromEuler(euler(o.rot || [0, 0, 0]));
    const e = o.esc;
    if (e === undefined) _s.set(1, 1, 1); else if (typeof e === 'number') _s.set(e, e, e); else _s.set(e[0], e[1], e[2]);
    return _m.compose(_p, _q, _s);
  }

  function crearGeo(tipo, o) {
    const g = crearGeoBase(tipo, o);
    g.userData.tipo = tipo;                       // el inspector usa esto para nombrar la pieza
    if (o.nombre) g.userData.nombre = o.nombre;
    return g;
  }
  function crearGeoBase(tipo, o) {
    switch (tipo) {
      case 'caja': return new THREE.BoxGeometry(o.ancho ?? 1, o.alto ?? 1, o.fondo ?? 1);
      case 'cilindro': return new THREE.CylinderGeometry(o.radioArriba ?? o.radio ?? 0.5, o.radioAbajo ?? o.radio ?? 0.5, o.alto ?? 1, o.lados ?? 16, 1, !!o.abierto);
      case 'esfera': { const l = o.lados ?? 16; return new THREE.SphereGeometry(o.radio ?? 0.5, l, Math.max(6, Math.round(l * 0.66))); }
      case 'capsula': return new THREE.CapsuleGeometry(o.radio ?? 0.2, o.largo ?? 1, 3, o.lados ?? 8);
      case 'toro': return new THREE.TorusGeometry(o.radio ?? 1, o.grosor ?? 0.05, o.ladosTubo ?? 6, o.lados ?? 48, rad(o.arco ?? 360));
      case 'cono': return new THREE.ConeGeometry(o.radio ?? 0.5, o.alto ?? 1, o.lados ?? 12);
      case 'plano': return new THREE.PlaneGeometry(o.ancho ?? 1, o.alto ?? 1, o.divX ?? 1, o.divY ?? 1);
      case 'circulo': return new THREE.CircleGeometry(o.radio ?? 1, o.lados ?? 32);
      case 'anillo': return new THREE.RingGeometry(o.radioInterno ?? 0.5, o.radio ?? 1, o.lados ?? 48);
      case 'roca': {
        const g = new THREE.DodecahedronGeometry(o.radio ?? 1, o.detalle ?? 1);
        const p = g.attributes.position, k = Math.random() * 10;
        for (let i = 0; i < p.count; i++) {   // deforma cada punto (mismo punto → misma deformación)
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
          const f = 1 + 0.22 * Math.sin(x * 3.1 + k) * Math.cos(z * 2.7 + k) + 0.1 * Math.sin(y * 5.3 + k);
          p.setXYZ(i, x * f, y * f * 0.75, z * f);
        }
        g.computeVertexNormals();
        return g;
      }
      case 'tubo': {
        const curva = new THREE.CatmullRomCurve3(o.puntos.map(V3));
        return new THREE.TubeGeometry(curva, o.segmentos ?? 24, o.radio ?? 0.03, o.lados ?? 5, false);
      }
      case 'cable': {
        const a = V3(o.desde), b = V3(o.hasta), n = o.segmentos ?? 12, pts = [];
        for (let i = 0; i <= n; i++) {
          const t = i / n, p = a.clone().lerp(b, t);
          p.y -= (o.caida ?? 1) * 4 * t * (1 - t);        // curva de cable colgando
          pts.push(p);
        }
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, o.radio ?? 0.03, o.lados ?? 4, false);
      }
    }
    throw new Error('Forma desconocida: ' + tipo);
  }

  const TIPOS = ['caja', 'cilindro', 'esfera', 'capsula', 'toro', 'cono', 'plano', 'circulo', 'anillo', 'roca', 'tubo', 'cable'];
  H.geo = {};
  TIPOS.forEach(t => { H.geo[t] = (o = {}) => crearGeo(t, o).applyMatrix4(matrizDe(o)); });

  // Mueve/gira una geometría que ya existe: H.mover(geo, { pos, rot, esc })
  H.mover = (geo, o) => geo.applyMatrix4(matrizDe(o));

  // Una cápsula que une dos puntos (la usamos para armar cuerpos)
  H.geo.entre = (a, b, radio, lados = 6) => {
    a = V3(a); b = V3(b);
    const d = b.clone().sub(a), largo = Math.max(0.001, d.length());
    const g = new THREE.CapsuleGeometry(radio, largo, 2, lados);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    const m = a.add(b).multiplyScalar(0.5);
    g.translate(m.x, m.y, m.z);
    return g;
  };

  /* FUSIONAR: junta varias geometrías.
       H.fusionar([geo1, geo2, ...])                  → un CONJUNTO: al ponerlo con
            H.malla cada parte vuelve a ser su propia pieza (se edita por separado
            en el inspector). Ej: las vigas de un techo, los cables de un cuarto.
       H.fusionar([...], { unir: true, nombre: 'silla' }) → UNA sola pieza
            (un cuerpo, una silla, una lámpara: cosas que se mueven enteras).  */
  H.fusionar = (lista, op = {}) => {
    let nV = 0, nI = 0;
    lista.forEach(g => { nV += g.attributes.position.count; nI += g.index ? g.index.count : g.attributes.position.count; });
    const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
    const idx = nV > 65535 ? new Uint32Array(nI) : new Uint16Array(nI);
    let oV = 0, oI = 0;
    for (const g of lista) {
      const c = g.attributes.position.count;
      if (!g.attributes.normal) g.computeVertexNormals();
      pos.set(g.attributes.position.array, oV * 3);
      nor.set(g.attributes.normal.array, oV * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, oV * 2);
      if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[oI + i] = a[i] + oV; oI += a.length; }
      else { for (let i = 0; i < c; i++) idx[oI + i] = oV + i; oI += c; }
      oV += c;
      if (op.unir) g.dispose();
    }
    const r = new THREE.BufferGeometry();
    r.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    r.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    r.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    r.setIndex(new THREE.BufferAttribute(idx, 1));
    r.computeBoundingSphere();
    if (!op.unir) r.userData.partes = lista;      // se guardan para separarlas después
    if (op.nombre) r.userData.nombre = op.nombre;
    return r;
  };

  /* ── PIEZAS: cada objeto es su propia entidad de A-Frame ─────────────────
     Todo lo que crean las herramientas (H.caja, H.malla, H.brillo, las luces…)
     vive en su propia <a-entity>, con un id fácil de leer, dentro de la SECCIÓN
     del mundo a la que pertenece. Así en el INSPECTOR (Ctrl + Alt + I) cada
     cosa aparece por separado y se puede mover, girar, escalar u ocultar.

       id de ejemplo:  m3-11-linea-de-produccion-cuerpo-4
                       └mundo └sección              └pieza └número

     Opción común nueva:  nombre: 'mesa'  → cómo se llama la pieza en el inspector */
  function colocar(obj, o) {
    if (o.pos) obj.position.set(o.pos[0] || 0, o.pos[1] || 0, o.pos[2] || 0);
    if (o.rot) obj.rotation.copy(euler(o.rot));
    if (o.esc !== undefined) typeof o.esc === 'number' ? obj.scale.setScalar(o.esc) : obj.scale.set(o.esc[0], o.esc[1], o.esc[2]);
  }
  const aSlug = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pieza';

  // Crea una <a-entity> vacía, con id único, dentro de `padre` (o de la sección actual)
  function nuevaPieza(nombre, padre) {
    const padreEl = (padre && padre.el) || E.seccion || E.raiz;
    const base = aSlug(nombre), prefijo = padreEl === E.raiz ? 'm' + E.id : padreEl.id;
    const clave = prefijo + '|' + base;
    const n = E.contador[clave] = (E.contador[clave] || 0) + 1;
    const el = document.createElement('a-entity');
    el.id = prefijo + '-' + base + '-' + n;
    padreEl.appendChild(el);
    padreEl.object3D.add(el.object3D);           // ya mismo (así se pueden calcular choques)
    return el;
  }
  // Posición / rotación / escala de una pieza (como atributos, para que el inspector las vea)
  function colocarPieza(el, o) {
    const p = o.pos, r = o.rot, e = o.esc;
    if (p) el.setAttribute('position', { x: p[0] || 0, y: p[1] || 0, z: p[2] || 0 });
    if (r) el.setAttribute('rotation', { x: r[0] || 0, y: r[1] || 0, z: r[2] || 0 });
    if (e !== undefined) { const v = typeof e === 'number' ? [e, e, e] : e; el.setAttribute('scale', { x: v[0], y: v[1], z: v[2] }); }
    colocar(el.object3D, o);
  }
  // Mete un objeto de Three.js en una pieza nueva. Si el padre es un grupo de
  // Three.js puro (por ejemplo el cielo), lo agrega ahí directamente.
  function agregar(obj, o, nombre, tipo = 'mesh') {
    if (o.padre && !o.padre.el) { colocar(obj, o); o.padre.add(obj); return obj; }
    const el = nuevaPieza(o.nombre || nombre, o.padre);
    colocarPieza(el, o);
    el.setObject3D(tipo, obj);
    return obj;
  }
  // La entidad (object3D) de una pieza: para moverla entera desde una animación
  H.pieza = obj => (obj.parent && obj.parent.el ? obj.parent : obj);

  /* H.seccion('3 · Cápsulas') → todo lo que crees después va dentro de esta
     sección (una carpeta en el inspector).                                    */
  H.seccion = nombre => {
    E.seccion = null;
    const el = nuevaPieza(nombre, null);
    E.seccion = el;
    return el.object3D;
  };

  // H.malla(geometria, material, { pos, rot, esc, padre, solido, nombre })
  //   solido: true → el jugador choca con su caja
  H.malla = (geo, mat, o = {}) => {
    // un CONJUNTO fusionado se vuelve a separar: cada parte es su propia pieza
    if (geo.userData.partes && !o.unido) {
      const g = H.grupo({ pos: o.pos, rot: o.rot, esc: o.esc, padre: o.padre, nombre: o.nombre || geo.userData.nombre || 'conjunto' });
      geo.userData.partes.forEach(parte => H.malla(parte, mat, { padre: g, nombre: parte.userData.nombre || parte.userData.tipo || 'parte', sinSombra: o.sinSombra }));
      geo.dispose();
      g.material = mat;
      if (o.solido) H.solidoDe(g);
      return g;
    }
    const m = new THREE.Mesh(geo, mat);
    // lo que solo es luz (aditivo) o atmósfera no tapa los clics del inspector
    if (o.sinClic || mat.blending === THREE.AdditiveBlending) intocable(m);
    agregar(m, o, geo.userData.nombre || geo.userData.tipo || 'pieza');
    if (o.solido) H.solidoDe(m);
    if (o.sinSombra) m.userData.sinSombra = true;
    return m;
  };

  /* Atajos: H.caja({...}), H.cilindro({...}), H.esfera({...}), H.plano({...})…
     Reciben medidas + opciones de material + pos/rot/esc en un solo objeto:
        H.caja({ ancho: 1, alto: 2, fondo: 1, pos: [0, 1, -3], color: '#f0f', solido: true })
     o un material ya hecho:  H.caja({ ..., mat: miMaterial })                 */
  TIPOS.forEach(t => { H[t] = (o = {}) => H.malla(crearGeo(t, o), o.mat || H.mat(o), o); });

  // H.grupo({ pos, rot, esc, padre, nombre }) → una pieza vacía que agrupa a otras
  H.grupo = (o = {}) => {
    if (o.padre && !o.padre.el) { const g = new THREE.Group(); colocar(g, o); o.padre.add(g); return g; }
    const el = nuevaPieza(o.nombre || 'grupo', o.padre);
    colocarPieza(el, o);
    return el.object3D;
  };

  /* COPIAS: muchas piezas con la misma forma, cada una en su lugar.
       H.instancias(geometria, material, [ { pos, rot, esc, color }, ... ], { nombre })
     Cada copia es su propia pieza (un grupo con todas las copias adentro).
     Para mover una copia en una animación: H.moverInstancia(grupo, i, { pos, rot, esc })

     masa: true → para miles de cosas iguales (pasto, hojas, ventanitas): se
     dibujan todas juntas en UNA pieza, porque separadas el juego se volvería
     lentísimo. Se cambian desde el código (cantidad, zona, color).        */
  H.instancias = (geo, mat, lista, o = {}) => {
    if (!o.masa) {
      const nombre = o.nombre || geo.userData.nombre || geo.userData.tipo || 'pieza';
      const porColor = {}, piezas = [];
      const materialDe = it => {
        if (!it.color) return mat;
        const c = new THREE.Color(it.color), k = c.getHexString();
        if (!porColor[k]) { porColor[k] = mat.clone(); porColor[k].color.copy(mat.color).multiply(c); }
        return porColor[k];
      };
      /* dentroDe: otro grupo de copias → la copia i va DENTRO de la pieza i de ese
         grupo (y su pos/rot/esc son relativas a ella). Así, por ejemplo, cada
         cápsula lleva adentro su vidrio y su cuerpo, y se mueven juntos.    */
      if (o.dentroDe) {
        lista.forEach((it, i) => {
          const padre = o.dentroDe.userData.piezas[i];
          if (padre) piezas.push(H.pieza(H.malla(geo, materialDe(it), { pos: it.pos, rot: it.rot, esc: it.esc, padre, nombre: o.pieza || o.nombre || nombre, sinSombra: o.sinSombra, unido: true })));
        });
        return { userData: { piezas }, material: mat };
      }
      const g = H.grupo({ nombre: o.nombre || nombre + 's', padre: o.padre });
      lista.forEach(it => {
        piezas.push(H.pieza(H.malla(geo, materialDe(it), { pos: it.pos, rot: it.rot, esc: it.esc, padre: g, nombre: o.pieza || geo.userData.nombre || nombre, sinSombra: o.sinSombra, unido: true })));
      });
      g.userData.piezas = piezas;
      g.material = mat;
      return g;
    }
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, lista.length));
    m.count = lista.length;
    lista.forEach((it, i) => {
      m.setMatrixAt(i, matrizDe(it));
      if (it.color) m.setColorAt(i, new THREE.Color(it.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    m.userData.lista = lista;
    if (o.sinSombra) m.userData.sinSombra = true;
    if (o.mover) m.frustumCulled = false;   // si las copias se mueven mucho
    agregar(m, { padre: o.padre, nombre: o.nombre }, (geo.userData.nombre || 'masa') + ' (masa)');
    return m;
  };
  H.moverInstancia = (m, i, it) => {
    if (m.isInstancedMesh) { m.setMatrixAt(i, matrizDe(it)); m.instanceMatrix.needsUpdate = true; return; }
    const p = m.userData.piezas[i];
    if (p) colocar(p, it);
  };

  // Halo de luz que siempre mira a la cámara (barato y muy efectivo)
  H.brillo = (o = {}) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: H.tex('brillo'), color: new THREE.Color(o.color ?? '#ffffff'), transparent: true,
      opacity: o.opacidad ?? 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    const t = o.tamano ?? 1;
    Array.isArray(t) ? s.scale.set(t[0], t[1], 1) : s.scale.set(t, t, 1);
    agregar(s, { padre: o.padre, pos: o.pos, nombre: o.nombre }, 'brillo');
    return s;
  };

  /* PARTÍCULAS: polvo, burbujas, ceniza, chispas…
       cantidad, centro [x,y,z], area [ancho, alto, fondo], color, tamano,
       velocidad [x,y,z] (metros/segundo), opacidad, aditivo (true = brillan)
       centros: [[x,y,z], ...] → reparte las partículas entre varios lugares   */
  H.particulas = (o = {}) => {
    const n = H.cantidad(o.cantidad ?? 200), area = o.area ?? [10, 5, 10];
    const centros = o.centros || [o.centro ?? [0, 2, 0]];
    const arr = new Float32Array(n * 3), cen = [];
    for (let i = 0; i < n; i++) {
      const c = centros[i % centros.length]; cen.push(c);
      arr[i * 3] = c[0] + (azar() - 0.5) * area[0];
      arr[i * 3 + 1] = c[1] + (azar() - 0.5) * area[1];
      arr[i * 3 + 2] = c[2] + (azar() - 0.5) * area[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const aditivo = o.aditivo ?? true;
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(o.color ?? '#ffffff'), size: o.tamano ?? 0.05, map: H.tex('punto'),
      transparent: true, opacity: o.opacidad ?? 0.7, depthWrite: false, sizeAttenuation: true,
      blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !aditivo,
    });
    const pts = intocable(new THREE.Points(geo, mat));
    pts.frustumCulled = false;
    agregar(pts, { padre: o.padre, nombre: o.nombre }, 'particulas');
    const v = o.velocidad ?? [0, 0.1, 0], vaiven = o.vaiven ?? 0.15;
    H.animar((t, dt) => {
      for (let i = 0; i < n; i++) {
        const c = cen[i], k = i * 3;
        arr[k] += (v[0] + Math.sin(t * 0.7 + i) * vaiven) * dt;
        arr[k + 1] += v[1] * dt;
        arr[k + 2] += (v[2] + Math.cos(t * 0.5 + i * 1.3) * vaiven) * dt;
        for (let e = 0; e < 3; e++) {          // si sale del área, reaparece del otro lado
          const mitad = area[e] / 2, d = arr[k + e] - c[e];
          if (d > mitad) arr[k + e] -= area[e]; else if (d < -mitad) arr[k + e] += area[e];
        }
      }
      geo.attributes.position.needsUpdate = true;
    });
    return pts;
  };

  /* TEXTO flotante (siempre mira a la cámara):
       H.texto({ texto: 'Deseo', pos: [0, 2, -3], alto: 0.5, color: '#fff', resplandor: '#ff4fa0' }) */
  H.texto = (o = {}) => {
    const px = 96, fuente = `${o.cursiva ? 'italic ' : ''}${px}px ${o.fuente ?? 'Georgia, "Times New Roman", serif'}`;
    const c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = fuente;
    c.width = Math.ceil(g.measureText(o.texto).width + px); c.height = Math.ceil(px * 1.6);
    g.font = fuente; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = o.resplandor ?? o.color ?? '#fff'; g.shadowBlur = 28;
    g.fillStyle = o.color ?? '#ffffff';
    g.fillText(o.texto, c.width / 2, c.height / 2);
    g.shadowBlur = 0; g.fillText(o.texto, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: o.opacidad ?? 1 }));
    const alto = o.alto ?? 0.5;
    s.scale.set(alto * c.width / c.height, alto, 1);
    s.renderOrder = 1;                       // se dibuja después de lo transparente (se lee mejor)
    agregar(s, { padre: o.padre, pos: o.pos, nombre: o.nombre }, 'texto ' + o.texto);
    return s;
  };

  /* ── LUCES ───────────────────────────────────────────────────────────────
     Cada luz cuesta rendimiento (sobre todo las puntuales). 2-4 por mundo.
       H.luzAmbiente(color, intensidad)          → luz pareja en todo
       H.luzHemisferio(cielo, suelo, intensidad) → luz de cielo arriba y rebote abajo
       H.luzSol(color, intensidad, [x,y,z], { sombra, area, centro })
            [x,y,z] = DE DÓNDE viene la luz. sombra: true = sombras reales
            (solo si la calidad lo permite). area = tamaño de la zona con sombra.
       H.luzPunto(color, intensidad, alcance, [x,y,z]) → un foco / bombilla   */
  H.luzAmbiente = (color, i = 1) => agregar(new THREE.AmbientLight(color, i), {}, 'luz ambiente', 'light');
  H.luzHemisferio = (cielo, suelo, i = 1) => agregar(new THREE.HemisphereLight(cielo, suelo, i), {}, 'luz hemisferio', 'light');
  H.luzSol = (color, i = 2, dir = [1, 2, 1], o = {}) => {
    const l = new THREE.DirectionalLight(color, i);
    const centro = V3(o.centro ?? [0, 0, 0]);
    l.position.copy(centro).addScaledVector(V3(dir).normalize(), 80);
    l.target.position.copy(centro);
    agregar(l, {}, 'luz sol', 'light');
    E.raiz.object3D.add(l.target);
    if (o.sombra && TECNO.nivel.sombras) {
      l.castShadow = true;
      const a = o.area ?? 30, cam = l.shadow.camera;
      cam.left = -a; cam.right = a; cam.top = a; cam.bottom = -a; cam.near = 1; cam.far = 200;
      l.shadow.mapSize.set(TECNO.nivel.tamanoSombra, TECNO.nivel.tamanoSombra);
      l.shadow.bias = -0.0004; l.shadow.normalBias = 0.04;
      E.usaSombras = true;
    }
    return l;
  };
  H.luzPunto = (color, i = 5, alcance = 10, pos = [0, 2, 0], padre) => {
    return agregar(new THREE.PointLight(color, i, alcance, 1.5), { pos, padre }, 'luz', 'light');
  };

  /* ── ENTIDADES DE A-FRAME (los objetos interactivos) ─────────────────────
       H.orbe({...})   → el ojo que te sigue con la mirada (componente orbe-vigia)
       H.portal({...}) → puerta de luz a otro mundo        (componente portal)
       H.zona({...})   → zona invisible que abre un diálogo (componente zona-dialogo)
       H.modelo({...}) → un modelo .glb/.gltf
     Sus opciones están explicadas en §5.                                    */
  function sinPosicion(o) { const r = { ...o }; delete r.pos; delete r.rot; delete r.esc; delete r.nombre; return r; }
  H.entidad = (componentes, o = {}, nombre = 'entidad') => {
    const el = nuevaPieza(o.nombre || nombre, o.padre);
    colocarPieza(el, o);
    for (const k in componentes) el.setAttribute(k, componentes[k]);
    return el;
  };
  H.orbe = o => H.entidad({ 'orbe-vigia': sinPosicion(o) }, o, 'orbe');
  H.portal = o => H.entidad({ portal: sinPosicion(o) }, o, 'portal');
  H.zona = o => H.entidad({ 'zona-dialogo': sinPosicion(o) }, o, 'zona');
  H.modelo = o => {
    const el = H.entidad({ 'gltf-model': `url(${o.url})` }, o, 'modelo');
    el.addEventListener('model-error', () => console.warn('No se pudo cargar el modelo', o.url, '(¿abriste la página con un servidor local?)'));
    return el;
  };

  // Ejecuta una función en cada cuadro mientras este mundo esté activo.
  //   H.animar((t, dt) => { objeto.rotation.y = t * 0.5; })
  //   t = segundos desde que empezó todo · dt = segundos desde el cuadro anterior
  H.animar = fn => { E.animadores.push(fn); return fn; };

  /* SONIDO EN UN LUGAR: suena más fuerte cuanto más cerca estás, y a la
     izquierda o derecha según hacia dónde miras.
       H.sonido({ pos: [x, y, z], tipo: 'estatica', radio: 8, volumen: 1 })
     tipos: los de Sonido.capa (§7): estatica, zumbido, maquinas, chisporroteo… */
  H.sonido = (o = {}) => {
    const p = V3(o.pos || [0, 0, 0]), radio = o.radio ?? 10, vol = o.volumen ?? 1;
    let capa = null, pan = null, ultimo = -1;
    H.animar(() => {
      const S = TECNO.sonido;
      if (!S.ctx) return;                               // el sonido se enciende con "Entrar"
      if (!capa) {
        pan = S.ctx.createStereoPanner ? S.ctx.createStereoPanner() : S.ctx.createGain();
        pan.connect(S.maestro);
        capa = S.capa(o.tipo, pan, 0);
        const c = capa, pn = pan;
        E.limpiezas.push(() => { c.detener(); setTimeout(() => pn.disconnect(), 1700); });
      }
      const cam = TECNO.camaraPos, d = cam.distanceTo(p), cerca = Math.max(0, 1 - d / radio);
      const g = vol * cerca * cerca;
      if (Math.abs(g - ultimo) > 0.005) { capa.salida.gain.setTargetAtTime(g, S.ctx.currentTime, 0.1); ultimo = g; }
      if (pan.pan) {
        const R = TECNO.camaraDerecha, dx = p.x - cam.x, dz = p.z - cam.z, len = Math.hypot(dx, dz) || 1;
        pan.pan.value = clamp((dx * R.x + dz * R.z) / len, -1, 1) * 0.8;
      }
    });
  };

  /* ── COLISIONES ──────────────────────────────────────────────────────────
     H.solido(x, z, ancho, fondo)  → un rectángulo invisible en el suelo
     H.solidoDe(objeto)            → usa la caja que envuelve a un objeto     */
  H.solido = (x, z, ancho, fondo) => E.solidos.push({ minX: x - ancho / 2, maxX: x + ancho / 2, minZ: z - fondo / 2, maxZ: z + fondo / 2 });
  H.solidoDe = obj => {
    const s = { obj };
    medirSolido(s);
    E.solidos.push(s);
  };
  function medirSolido(s) {
    s.obj.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(s.obj);
    Object.assign(s, { minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, minY: b.min.y, maxY: b.max.y });
  }

  /* ── PIEZAS COMPUESTAS QUE SE REPITEN ENTRE MUNDOS ─────────────────────── */

  /* H.cuerpo(pose) → geometría de un cuerpo humano hecho de cápsulas.
     Poses: 'de pie' | 'feto' | 'caido' | 'sentado'  (o tu propio objeto de ángulos)
     Los ángulos están en radianes (1 ≈ 57°). Mide ~1.75 m y su base está en y = 0. */
  const POSES = {
    'de pie':  { columna: 0,    cuello: 0.05, cadera: 0,    rodilla: 0,    piernas: 0.05, hombro: 0.08, codo: 0.15, brazos: 0.16 },
    'feto':    { columna: 0.85, cuello: 0.7,  cadera: 2.1,  rodilla: 2.4,  piernas: 0.12, hombro: 1.3,  codo: 1.9,  brazos: -0.1 },
    'caido':   { columna: -0.05, cuello: -0.25, cadera: 0.12, rodilla: 0.35, piernas: 0.32, hombro: 0.3, codo: 0.4, brazos: 1.15 },
    'sentado': { columna: 0.5,  cuello: 0.85, cadera: 1.5,  rodilla: 1.55, piernas: 0.2,  hombro: 0.25, codo: 0.3,  brazos: 0.1 },
  };
  H.cuerpo = (pose = 'de pie', grosor = 1) => {
    const p = typeof pose === 'string' ? POSES[pose] : pose;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const dir = a => V(0, Math.cos(a), Math.sin(a));       // a > 0 = inclinado hacia adelante (+Z)
    const pelvis = V(0, 0, 0);
    const pecho = pelvis.clone().addScaledVector(dir(p.columna), 0.42);
    const nuca = pecho.clone().addScaledVector(dir(p.columna + p.cuello * 0.5), 0.14);
    const cabeza = nuca.clone().addScaledVector(dir(p.columna + p.cuello), 0.12);
    const partes = [];
    const seg = (a, b, r) => partes.push(H.geo.entre(a, b, r * grosor));
    seg(pelvis, pecho, 0.12);
    partes.push(H.geo.esfera({ radio: 0.15 * grosor, lados: 10, pos: [pecho.x, pecho.y - 0.04, pecho.z], esc: [1.25, 1, 0.85] }));
    seg(V(-0.1, -0.02, 0), V(0.1, -0.02, 0), 0.13);         // cadera
    seg(pecho, nuca, 0.05);
    partes.push(H.geo.esfera({ radio: 0.11 * grosor, lados: 12, pos: [cabeza.x, cabeza.y, cabeza.z], esc: [0.9, 1.15, 1] }));
    for (const s of [-1, 1]) {
      // brazo
      const hombro = pecho.clone().add(V(0.19 * s, 0.02, 0));
      const dB = V(Math.sin(p.brazos) * s, -Math.cos(p.brazos) * Math.cos(p.hombro), Math.cos(p.brazos) * Math.sin(p.hombro)).normalize();
      const codo = hombro.clone().addScaledVector(dB, 0.28);
      const a2 = p.hombro + p.codo;
      const dA = V(Math.sin(p.brazos) * s * 0.6, -Math.cos(a2), Math.sin(a2)).normalize();
      const mano = codo.clone().addScaledVector(dA, 0.25);
      seg(hombro, codo, 0.05); seg(codo, mano, 0.038);
      partes.push(H.geo.esfera({ radio: 0.045 * grosor, lados: 6, pos: [mano.x, mano.y, mano.z], esc: [0.8, 1.4, 0.6] }));
      // pierna
      const cadera = V(0.1 * s, -0.04, 0);
      const dM = V(Math.sin(p.piernas) * s, -Math.cos(p.cadera), Math.sin(p.cadera)).normalize();
      const rodilla = cadera.clone().addScaledVector(dM, 0.44);
      const a3 = p.cadera - p.rodilla;
      const dP = V(Math.sin(p.piernas) * s * 0.5, -Math.cos(a3), Math.sin(a3)).normalize();
      const tobillo = rodilla.clone().addScaledVector(dP, 0.42);
      seg(cadera, rodilla, 0.072); seg(rodilla, tobillo, 0.05);
      seg(tobillo, tobillo.clone().add(V(0, Math.sin(a3), Math.cos(a3)).multiplyScalar(0.13)), 0.04);
    }
    const g = H.fusionar(partes, { unir: true, nombre: 'cuerpo' });
    g.computeBoundingBox();
    const bb = g.boundingBox;
    g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    g.computeBoundingSphere();
    return g;
  };

  /* H.candelabro({...}) → anillos flotantes con cables brillantes colgando
     (inspirado en la imagen de los anillos de luz). Opciones:
       pos, radio, anillos, separacion, cables (por anillo), caida (máx. metros),
       color, opacidadCables, girar (velocidad), padre                        */
  H.candelabro = (o = {}) => {
    const g = H.grupo({ pos: o.pos, padre: o.padre });
    const r = o.radio ?? 6, n = o.anillos ?? 3, color = o.color ?? '#dff6ff';
    const anillos = [], cables = [];
    for (let k = 0; k < n; k++) {
      const rk = r * (1 - k * 0.1), y = k * (o.separacion ?? 1.4);
      anillos.push(H.geo.toro({ radio: rk, grosor: o.grosor ?? 0.08, lados: 72, pos: [0, y, 0], rot: [90, 0, 0] }));
      const nc = H.cantidad(o.cables ?? 30);
      for (let i = 0; i < nc; i++) {
        const a1 = H.azar(0, Math.PI * 2), a2 = a1 + H.azar(0.25, 1.3);
        cables.push(H.geo.cable({
          desde: [Math.cos(a1) * rk, y, Math.sin(a1) * rk], hasta: [Math.cos(a2) * rk, y, Math.sin(a2) * rk],
          caida: H.azar(1, o.caida ?? 5), radio: o.grosorCable ?? 0.016, segmentos: 14,
        }));
      }
    }
    H.malla(H.fusionar(anillos), H.mat({ basico: true, color }), { padre: g });
    if (cables.length) H.malla(H.fusionar(cables), H.mat({ aditivo: true, color, opacidad: o.opacidadCables ?? 0.75 }), { padre: g });
    const vel = o.girar ?? 0.03;
    if (vel) H.animar((t, dt) => { g.rotation.y += dt * vel; });
    return g;
  };

  /* H.lampara({ pos, rot, color, forma, alto, luz }) → lámpara de pie con pantalla
     encendida (como las lámparas en el pasto de la referencia).
       forma: 'campana' | 'cono' | 'tambor'   ·   luz: intensidad de una luz real
       (0 = solo brillo falso, que es gratis)                                   */
  H.lampara = (o = {}) => {
    const g = H.grupo({ pos: o.pos, rot: o.rot });
    const alto = o.alto ?? 0.9, color = o.color ?? '#ffd9c2';
    const pie = H.fusionar([
      H.geo.cilindro({ radioArriba: 0.05, radioAbajo: 0.15, alto: 0.08, lados: 12, pos: [0, 0.04, 0] }),
      H.geo.cilindro({ radio: 0.025, alto: alto, lados: 6, pos: [0, alto / 2, 0] }),
      H.geo.esfera({ radio: 0.08, lados: 8, pos: [0, alto * 0.45, 0], esc: [1, 1.4, 1] }),
    ]);
    H.malla(pie, H.mat({ color: o.colorPie ?? '#e8e0d4', rugosidad: 0.4, metal: 0.2 }), { padre: g });
    const forma = o.forma ?? 'campana';
    const medidas = { campana: [0.17, 0.32, 0.32], cono: [0.1, 0.3, 0.3], tambor: [0.24, 0.26, 0.34] }[forma] || [0.17, 0.32, 0.32];
    H.cilindro({
      padre: g, radioArriba: medidas[0], radioAbajo: medidas[1], alto: medidas[2], lados: 20, abierto: true,
      pos: [0, alto + medidas[2] / 2 - 0.05, 0], color, emisivo: color, brillo: 1.4, doble: true, rugosidad: 0.9,
    });
    const b = H.brillo({ padre: g, pos: [0, alto + 0.1, 0], color, tamano: o.halo ?? 2.2, opacidad: 0.55 });
    if (o.luz) H.luzPunto(color, o.luz, 6, [0, alto, 0], g);
    g.userData.brillo = b;
    return g;
  };

  /* H.crt({ pos, rot, color, apagado, sonido }) → monitor viejo de tubo (maqueta).
     Todos los monitores de un mundo comparten la misma pantalla animada.
       apagado: true → pantalla negra · sonido: true → estática que oyes al acercarte */
  H.crt = (o = {}) => {
    const g = H.grupo({ pos: o.pos, rot: o.rot, padre: o.padre, nombre: o.nombre || 'monitor' });
    if (!E.texCrt) E.texCrt = H.texPantalla(o.color ?? '#bfe8ff');
    if (!E.geoCrt) E.geoCrt = H.fusionar([
      H.geo.caja({ ancho: 0.55, alto: 0.45, fondo: 0.42, pos: [0, 0.225, 0] }),
      H.geo.caja({ ancho: 0.4, alto: 0.32, fondo: 0.25, pos: [0, 0.21, -0.32] }),
    ], { unir: true, nombre: 'carcasa' });
    H.malla(E.geoCrt, H.mat({ color: o.carcasa ?? '#b9b09c', rugosidad: 0.7 }), { padre: g });
    if (o.apagado) {
      H.plano({ padre: g, ancho: 0.44, alto: 0.33, pos: [0, 0.23, 0.215], color: '#0c0f10', metal: 0.6, rugosidad: 0.15, reflejo: 1.5 });
    } else {
      H.plano({ padre: g, ancho: 0.44, alto: 0.33, pos: [0, 0.23, 0.215], basico: true, textura: E.texCrt, color: '#a9bcc4' });
      H.brillo({ padre: g, pos: [0, 0.23, 0.45], color: o.color ?? '#a9d6ff', tamano: 1.2, opacidad: 0.28 });
      if (o.sonido) { g.updateWorldMatrix(true, false); const w = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld); H.sonido({ pos: [w.x, w.y, w.z], tipo: 'estatica', radio: o.radioSonido ?? 6, volumen: 0.6 }); }
    }
    return g;
  };

  /* H.nieblaBaja({ centro: [x, y, z], area: [ancho, fondo], capas, color, opacidad })
     → bancos de niebla a ras del suelo que se mueven despacio.                */
  H.nieblaBaja = (o = {}) => {
    const c = o.centro ?? [0, 0.8, 0], area = o.area ?? [40, 40], n = o.capas ?? 4, mats = [];
    for (let k = 0; k < n; k++) {
      const m = H.plano({
        ancho: area[0], alto: area[1], rot: [-90, 0, 0], pos: [c[0], c[1] + k * (o.separacion ?? 0.35), c[2]],
        textura: H.tex('nubes', [2, 2]), color: o.color ?? '#ffffff', transparente: true, opacidad: o.opacidad ?? 0.3, doble: true,
        sinClic: true, nombre: 'niebla baja',
      });
      m.userData.sinSombra = true;
      mats.push(m.material);
    }
    H.animar((t, dt) => mats.forEach((m, k) => { m.map.offset.x += dt * 0.004 * (k % 2 ? 1 : -1); m.map.offset.y += dt * 0.002 * (k + 1); }));
  };

  /* H.bandada({ centro: [x, y, z], radio, cantidad, color, tamano, velocidad })
     → pájaros (dos alitas) que vuelan en círculos.                            */
  H.bandada = (o = {}) => {
    const n = H.cantidad(o.cantidad ?? 12), c = o.centro ?? [0, 20, 0], s = o.tamano ?? 0.5;
    const ave = H.fusionar([
      H.geo.caja({ ancho: 0.6, alto: 0.03, fondo: 0.18, pos: [-0.28, 0.06, 0], rot: [0, 0, 18] }),
      H.geo.caja({ ancho: 0.6, alto: 0.03, fondo: 0.18, pos: [0.28, 0.06, 0], rot: [0, 0, -18] }),
    ]);
    const aves = [];
    for (let i = 0; i < n; i++) aves.push({ a: H.azar(0, Math.PI * 2), r: (o.radio ?? 15) * H.azar(0.6, 1.2), y: c[1] + H.azar(-3, 3), v: (o.velocidad ?? 0.12) * H.azar(0.7, 1.3), f: H.azar(0, 6) });
    const m = H.instancias(ave, H.mat({ color: o.color ?? '#140c10', rugosidad: 1, doble: true }), aves.map(() => ({})), { mover: true, sinSombra: true });
    H.animar(t => aves.forEach((b, i) => {
      const a = b.a + t * b.v, aleteo = 1 + Math.sin(t * 9 + b.f) * 0.6;
      H.moverInstancia(m, i, { pos: [c[0] + Math.cos(a) * b.r, b.y + Math.sin(t * 0.5 + b.f), c[2] + Math.sin(a) * b.r], rot: [0, -a * 57.3, Math.sin(t * 2 + b.f) * 15], esc: [s, s * aleteo, s] });
    }));
    return m;
  };

  /* H.rayos({ pos: [x, y, z], color, cantidad, largo, ancho, opacidad, abanico })
     → rayos de luz falsos en abanico (ideal detrás del sol o de una ventana). */
  H.rayos = (o = {}) => {
    const n = o.cantidad ?? 6, lista = [];
    for (let i = 0; i < n; i++) {
      const s = H.brillo({ pos: o.pos, color: o.color ?? '#ffd2a0', tamano: [o.ancho ?? 4, o.largo ?? 60], opacidad: o.opacidad ?? 0.08 });
      s.material.rotation = ((i / Math.max(1, n - 1)) - 0.5) * (o.abanico ?? 1.2) + Math.PI;
      s.userData.base = s.material.opacity; s.userData.f = H.azar(0, 6);
      lista.push(s);
    }
    H.animar(t => lista.forEach(s => { s.material.opacity = s.userData.base * (0.7 + Math.sin(t * 0.4 + s.userData.f) * 0.3); }));
    return lista;
  };

  /* H.muro({ desde: [x, z], hasta: [x, z], alto, grosor, huecos, roto, modulo })
     → lista de geometrías de un muro (para fusionar), con:
        huecos: [{ centro, ancho, base, alto }]  centro = metros desde "desde"
        roto:   0 a 1 → qué tan destruida está la parte de arriba
     Ejemplo: muro de 10 m con una puerta en el medio:
        H.muro({ desde: [0, 0], hasta: [10, 0], alto: 4, huecos: [{ centro: 5, ancho: 2, base: 0, alto: 3 }] }) */
  H.muro = (o = {}) => {
    const a = o.desde, b = o.hasta, alto = o.alto ?? 4, grosor = o.grosor ?? 0.4, mod = o.modulo ?? 1;
    const dx = b[0] - a[0], dz = b[1] - a[1], largo = Math.hypot(dx, dz);
    const giro = THREE.MathUtils.radToDeg(Math.atan2(-dz, dx));
    const n = Math.max(1, Math.round(largo / mod)), ancho = largo / n, piezas = [];
    const y0 = o.y ?? 0;
    for (let i = 0; i < n; i++) {
      const c = (i + 0.5) * ancho;
      let tope = alto;
      if (o.roto && H.azar() < o.roto) tope = alto * H.azar(0.35, 0.9);
      // tramos verticales que quedan después de restar los huecos
      let tramos = [[0, tope]];
      (o.huecos || []).forEach(h => {
        if (Math.abs(c - h.centro) >= h.ancho / 2) return;
        const nuevos = [];
        tramos.forEach(([y1, y2]) => {
          if (h.base > y1) nuevos.push([y1, Math.min(y2, h.base)]);
          if (h.base + h.alto < y2) nuevos.push([Math.max(y1, h.base + h.alto), y2]);
        });
        tramos = nuevos;
      });
      const x = a[0] + dx / largo * c, z = a[1] + dz / largo * c;
      tramos.forEach(([y1, y2]) => {
        if (y2 - y1 < 0.05) return;
        piezas.push(H.geo.caja({ ancho: ancho + 0.01, alto: y2 - y1, fondo: grosor, pos: [x, y0 + (y1 + y2) / 2, z], rot: [0, giro, 0] }));
      });
    }
    // el muro entero es UNA pieza (va en una lista para poder juntarlo con otros)
    return piezas.length ? [H.fusionar(piezas, { unir: true, nombre: o.nombre || 'muro' })] : [];
  };

  /* H.pasto({...}) → miles de hojas de pasto que se mecen con el viento.
       cantidad, centro [x, z], area [ancho, fondo], alto [min, max], color,
       alturaSuelo (función x,z → y), excluir (función x,z → true para saltar) */
  H.pasto = (o = {}) => {
    const n = H.cantidad(o.cantidad ?? 3000);
    const hoja = new THREE.BufferGeometry();
    hoja.setAttribute('position', new THREE.Float32BufferAttribute([-0.045, 0, 0, 0.045, 0, 0, 0.02, 0.5, 0.01, -0.01, 0.5, 0.01, 0.005, 1, 0.03], 3));
    hoja.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 4]);
    hoja.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 0.5, 0, 0.5, 0.5, 1], 2));
    hoja.computeVertexNormals();
    const mat = H.mat({ color: '#ffffff', doble: true, rugosidad: 1, emisivo: o.emisivo ?? '#141c0c' });
    const uTiempo = { value: 0 };
    // Truco de shader: movemos la punta de cada hoja con una onda (viento)
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTiempo = uTiempo;
      sh.vertexShader = 'uniform float uTiempo;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float fase = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;
          float viento = sin(uTiempo * 1.6 + fase) * 0.6 + sin(uTiempo * 3.1 + fase * 2.0) * 0.15;
          transformed.x += viento * 0.18 * position.y * position.y;
          transformed.z += cos(uTiempo * 1.2 + fase) * 0.08 * position.y * position.y;
        #endif`);
    };
    const c0 = o.centro ?? [0, 0], area = o.area ?? [20, 20], altos = o.alto ?? [0.25, 0.7];
    const base = new THREE.Color(o.color ?? '#6d8a3a'), lista = [];
    let intentos = 0;
    while (lista.length < n && intentos++ < n * 4) {
      const x = c0[0] + H.azar(-0.5, 0.5) * area[0], z = c0[1] + H.azar(-0.5, 0.5) * area[1];
      if (o.excluir && o.excluir(x, z)) continue;
      const y = o.alturaSuelo ? o.alturaSuelo(x, z) : (o.y ?? 0);
      const h = H.azar(altos[0], altos[1]);
      lista.push({ pos: [x, y, z], rot: [H.azar(-15, 15), H.azar(0, 360), 0], esc: [H.azar(0.8, 1.6), h, 1], color: base.clone().offsetHSL(H.azar(-0.03, 0.03), 0, H.azar(-0.12, 0.08)) });
    }
    const m = H.instancias(hoja, mat, lista, { sinSombra: true, masa: true, nombre: o.nombre || 'pasto' });
    H.animar(t => { uTiempo.value = t; });
    return m;
  };


  /* ==========================================================================
     §2 · CIELO Y AMBIENTE
     --------------------------------------------------------------------------
     Cada mundo define (ver cualquier archivo de /mundos):
        cielo:  { arriba, horizonte, abajo, sol: { color, alto, giro, tamano } }
                alto = grados sobre el horizonte · giro = grados (0 = al fondo, −Z;
                90 = a la izquierda; −90 = a la derecha)
        niebla: { color, densidad }   (si no hay color, usa el del horizonte)
        exposicion: brillo general de la cámara (1 = normal)
        reflejos:   cuánto se refleja el cielo en metales y agua (0 a 2)
     ========================================================================== */
  function aplicarAmbiente(def) {
    const c = def.cielo || {};
    const arriba = c.arriba ?? '#000000', horizonte = c.horizonte ?? '#222222', abajo = c.abajo ?? '#000000';
    const mezcla = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();
    // 1) el degradado del cielo, dibujado en un canvas
    //    (512 de ancho: el generador de reflejos calcula su calidad con ese ancho)
    const cv = lienzo(512, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, arriba);
      gr.addColorStop(0.32, mezcla(arriba, horizonte, 0.35));
      gr.addColorStop(0.47, mezcla(arriba, horizonte, 0.85));
      gr.addColorStop(0.5, horizonte);
      gr.addColorStop(0.56, mezcla(horizonte, abajo, 0.5));
      gr.addColorStop(1, abajo);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    // 2) una esfera gigante, vista por dentro, que siempre te sigue
    const r = TECNO.nivel.distancia * 0.9;
    const cielo = new THREE.Group();
    const esfera = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
    esfera.renderOrder = -10;
    intocable(esfera);
    cielo.add(esfera);
    // 3) el sol (dos halos)
    if (c.sol) {
      const s = c.sol, alto = rad(s.alto ?? 5), giro = rad(s.giro ?? 0), t = s.tamano ?? 1;
      const d = new THREE.Vector3(-Math.sin(giro) * Math.cos(alto), Math.sin(alto), -Math.cos(giro) * Math.cos(alto)).multiplyScalar(r * 0.92);
      H.brillo({ padre: cielo, pos: [d.x, d.y, d.z], color: s.color ?? '#ffcc88', tamano: r * 0.09 * t, opacidad: 1 });
      H.brillo({ padre: cielo, pos: [d.x, d.y, d.z], color: s.color ?? '#ffcc88', tamano: r * 0.6 * t, opacidad: 0.55 });
    }
    E.grupo.add(cielo);
    H.animar(() => cielo.position.copy(TECNO.camaraPos));
    // 4) niebla
    const n = def.niebla || {};
    escena.object3D.fog.color.set(n.color ?? horizonte);
    escena.object3D.fog.density = n.densidad ?? 0.02;
    // 5) exposición y reflejos (el cielo se usa como "mapa de entorno")
    renderer.toneMappingExposure = def.exposicion ?? 1;
    const envTex = tex.clone();
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.needsUpdate = true;
    E.env = pmrem.fromEquirectangular(envTex);
    envTex.dispose();
    escena.object3D.environment = E.env.texture;
    escena.object3D.environmentIntensity = def.reflejos ?? 0.5;
  }


  /* ==========================================================================
     §3 · MUNDOS: cargar, descargar y viajar
     ========================================================================== */
  function liberarMaterial(m) {
    for (const k in m) { const v = m[k]; if (v && v.isTexture && !v.userData.compartida) v.dispose(); }
    m.dispose();
  }
  function descargarMundo() {
    if (!E) return;
    const viejo = E;
    E = null; TECNO.actual = null;
    viejo.grupo.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach(liberarMaterial);
    });
    if (viejo.raiz.parentNode) viejo.raiz.parentNode.removeChild(viejo.raiz);
    if (viejo.env) viejo.env.dispose();
    viejo.limpiezas.forEach(f => { try { f(); } catch (e) { /* nada */ } });   // apaga sus sonidos
    escena.object3D.environment = null;
  }

  /* EDICIÓN CON EL INSPECTOR
     ------------------------------------------------------------------------
     1. Abre el inspector con Ctrl + Alt + I. Cada pieza tiene su id.
     2. Mueve, gira, escala o borra las piezas que quieras.
     3. Cierra el inspector (Ctrl + Alt + I), abre Ajustes (Esc) y pulsa
        "Copiar cambios de este mundo".
     4. Pega lo copiado al final de ajustes.js y guarda. Al recargar, tus
        cambios se aplican solos encima de lo que arma el código.            */
  const r3 = v => Math.round(v * 1000) / 1000;
  const transformDe = o3 => ({
    pos: o3.position.toArray().map(r3),
    rot: [o3.rotation.x, o3.rotation.y, o3.rotation.z].map(a => Math.round(THREE.MathUtils.radToDeg(a) * 100) / 100),
    esc: o3.scale.toArray().map(r3),
    visible: o3.visible,
  });
  const distinto = (a, b, tol) => a.some((v, i) => Math.abs(v - b[i]) > tol);
  const Edicion = {
    recordar() {
      E.originales = {};
      E.raiz.querySelectorAll('a-entity[id]').forEach(el => { E.originales[el.id] = transformDe(el.object3D); });
      // lo que se mueve solo (cuerpos en la cinta, anillos que giran…) no cuenta como cambio
      E.animadas = new Set();
      const mundo = E;
      setTimeout(() => {
        if (E !== mundo) return;
        for (const id in E.originales) {
          const el = document.getElementById(id), o = E.originales[id];
          if (!el) continue;
          const t = transformDe(el.object3D);
          if (distinto(t.pos, o.pos, 0.001) || distinto(t.rot, o.rot, 0.05) || distinto(t.esc, o.esc, 0.001)) E.animadas.add(id);
        }
      }, 1500);
    },
    aplicar(id) {
      const lista = (window.AJUSTES || {})[id];
      if (!lista) return;
      for (const pid in lista) {
        const el = document.getElementById(pid), a = lista[pid];
        if (!el) { console.warn('ajustes.js: la pieza "' + pid + '" ya no existe en el mundo ' + id); continue; }
        if (a.oculto) { el.setAttribute('visible', false); el.object3D.visible = false; }
        colocarPieza(el, a);
      }
      // los choques se recalculan con las piezas en su nuevo lugar
      E.solidos = E.solidos.filter(s => !s.obj || s.obj.visible !== false);
      E.solidos.forEach(s => { if (s.obj) medirSolido(s); });
    },
    // Compara cada pieza con cómo la dejó el código y copia las diferencias
    copiar() {
      if (!E) return;
      const cambios = {};
      for (const id in E.originales) {
        if (E.animadas.has(id)) continue;
        const el = document.getElementById(id), o = E.originales[id];
        if (!el) { cambios[id] = { oculto: true }; continue; }
        const t = transformDe(el.object3D), c = {};
        if (distinto(t.pos, o.pos, 0.001)) c.pos = t.pos;
        if (distinto(t.rot, o.rot, 0.05)) c.rot = t.rot;
        if (distinto(t.esc, o.esc, 0.001)) c.esc = t.esc;
        if (!t.visible && o.visible) c.oculto = true;
        if (Object.keys(c).length) cambios[id] = c;
      }
      const n = Object.keys(cambios).length;
      if (!n) { TECNO.aviso('No hay cambios en este mundo'); return; }
      const lineas = Object.entries(cambios).map(([k, v]) => `  '${k}': ${JSON.stringify(v).replace(/"(\w+)":/g, '$1: ')},`);
      const texto = `AJUSTES[${E.id}] = {\n${lineas.join('\n')}\n};\n`;
      const listo = () => TECNO.aviso(n + ' cambios copiados: pégalos al final de ajustes.js');
      if (navigator.clipboard) navigator.clipboard.writeText(texto).then(listo, () => { console.log(texto); TECNO.aviso('No pude copiar: el texto está en la consola (F12)'); });
      else { console.log(texto); TECNO.aviso('El texto está en la consola (F12)'); }
    },
  };
  TECNO.copiarCambios = () => Edicion.copiar();

  // Construye el mundo número `id`. Si conservarPosicion = true, no mueve al jugador.
  TECNO.cargarMundo = (id, conservarPosicion) => {
    const def = TECNO.mundos[id];
    if (!def) { console.warn('No existe el mundo', id); return; }
    descargarMundo();
    semilla = id * 7919;
    const raiz = document.createElement('a-entity');
    raiz.setAttribute('id', 'mundo-' + id);
    escena.appendChild(raiz);
    E = { id, def, raiz, grupo: raiz.object3D, solidos: [], animadores: [], limpiezas: [], env: null, usaSombras: false, seccion: null, contador: {} };
    renderer.shadowMap.enabled = !!TECNO.nivel.sombras;
    aplicarAmbiente(def);
    try {
      def.construir(H, def);
    } catch (err) {
      console.error('Error construyendo el mundo ' + id + ':', err);
      TECNO.aviso('Error en el mundo ' + id + ' — abre la consola (F12)');
    }
    E.seccion = null;
    (CONFIG.modelos[id] || []).forEach(m => H.modelo(m));
    Edicion.recordar();                       // cómo quedó cada pieza según el código…
    Edicion.aplicar(id);                      // …y los cambios que guardaste en ajustes.js
    // sombras: todo lo sólido proyecta y recibe (menos lo que brilla o es transparente)
    if (E.usaSombras) E.grupo.traverse(o => {
      if (o.isMesh && !o.userData.sinSombra && !o.material.transparent && !o.material.isMeshBasicMaterial) o.castShadow = o.receiveShadow = true;
    });
    TECNO.actual = def;
    if (!conservarPosicion) TECNO.colocarJugador(def.inicio?.pos ?? [0, 0, 0], def.inicio?.mirar ?? 0);
    document.body.dataset.mundo = id;
    Interfaz.marcarMundo(id);
  };

  // Pone al jugador en [x, y, z] mirando hacia `mirar` grados (0 = al fondo, −Z)
  TECNO.colocarJugador = (pos, mirar = 0) => {
    const def = TECNO.actual;
    const y = def && def.alturaSuelo ? def.alturaSuelo(pos[0], pos[2]) : (pos[1] || 0);
    jugadorEl.object3D.position.set(pos[0], y, pos[2]);
    const lc = camaraEl.components['look-controls'];
    if (lc && lc.yawObject) { lc.yawObject.rotation.y = rad(mirar); lc.pitchObject.rotation.x = 0; }
    camaraEl.object3D.rotation.set(0, rad(mirar), 0);
  };

  // Viaja a otro mundo con un fundido. op.velo = color del fundido.
  TECNO.irA = (id, op = {}) => {
    if (TECNO.transicionando || !TECNO.mundos[id]) return;
    TECNO.transicionando = true; TECNO.bloqueado = true;
    Sonido.efecto('portal');
    TECNO.narrar([]);
    ui.velo.style.background = op.velo || '#000000';
    ui.velo.classList.add('activo');
    setTimeout(() => {
      TECNO.cargarMundo(id);
      const revelar = () => setTimeout(() => {
        ui.velo.classList.remove('activo');
        TECNO.presentarMundo();
        setTimeout(() => { TECNO.transicionando = false; TECNO.bloqueado = false; }, 800);
      }, 300);
      // al volver al Mundo 1 (el ciclo reinicia) se repite la cinemática
      const cin = ajustesCinematica();
      if (id === 1 && cin.alReiniciar) TECNO.cinematica(revelar); else revelar();
    }, 1500);
  };

  // Título, música y narración del mundo activo
  TECNO.presentarMundo = () => {
    const def = TECNO.actual;
    if (!def) return;
    const txt = CONFIG.textos.mundos[def.id] || {};
    const romanos = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    ui.tituloNumero.textContent = 'MUNDO ' + (romanos[def.id] || def.id);
    ui.tituloNombre.textContent = txt.nombre || '';
    ui.tituloSub.textContent = txt.subtitulo || '';
    ui.titulo.classList.add('visible');
    clearTimeout(ui.titulo._t);
    ui.titulo._t = setTimeout(() => ui.titulo.classList.remove('visible'), 5200);
    Sonido.mundo(def.id);
    TECNO.narrar(txt.narracion || [], 3800);
  };


  /* ==========================================================================
     §4 · JUGADOR (componente "jugador", va en <a-entity id="jugador">)
     --------------------------------------------------------------------------
     Lee el teclado / joystick, mueve al jugador hacia donde mira la cámara,
     respeta los límites del mundo y empuja fuera de los sólidos.
     Los límites se definen en cada mundo:
        limites: { minX, maxX, minZ, maxZ }   → rectángulo
        limites: { radio: 20, centro: [0, 0] } → círculo
     y alturaSuelo(x, z) (opcional) hace que camines sobre colinas.
     ========================================================================== */
  function limitar(def, p) {
    const L = def.limites;
    if (!L) return;
    if (L.radio) {
      const cx = L.centro ? L.centro[0] : 0, cz = L.centro ? L.centro[1] : 0;
      const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d > L.radio) { p.x = cx + dx / d * L.radio; p.z = cz + dz / d * L.radio; }
    } else {
      p.x = clamp(p.x, L.minX, L.maxX);
      p.z = clamp(p.z, L.minZ, L.maxZ);
    }
  }
  function colisionar(p, r) {
    for (const b of E.solidos) {
      if (b.maxY !== undefined && (b.maxY < p.y + 0.3 || b.minY > p.y + 1.9)) continue;   // muy bajo o muy alto
      if (p.x > b.minX - r && p.x < b.maxX + r && p.z > b.minZ - r && p.z < b.maxZ + r) {
        const izq = p.x - (b.minX - r), der = (b.maxX + r) - p.x, fre = p.z - (b.minZ - r), atr = (b.maxZ + r) - p.z;
        const m = Math.min(izq, der, fre, atr);
        if (m === izq) p.x = b.minX - r; else if (m === der) p.x = b.maxX + r; else if (m === fre) p.z = b.minZ - r; else p.z = b.maxZ + r;
      }
    }
  }

  AFRAME.registerComponent('jugador', {
    init() {
      this.teclas = {};
      this.vel = new THREE.Vector3();
      this.objetivo = new THREE.Vector3();
      this.adelante = new THREE.Vector3();
      this.derecha = new THREE.Vector3();
      this.paso = 0;
      this.cam = this.el.querySelector('[camera]');
      window.addEventListener('keydown', e => { if (e.target.tagName !== 'INPUT') this.teclas[e.code] = true; });
      window.addEventListener('keyup', e => { this.teclas[e.code] = false; });
      window.addEventListener('blur', () => { this.teclas = {}; });
    },
    tick(t, dt) {
      const s = Math.min(dt, 60) / 1000, k = this.teclas, J = CONFIG.jugador, o = this.el.object3D;
      this.cam.object3D.getWorldPosition(TECNO.camaraPos);
      const def = TECNO.actual;
      if (!def || !E) return;
      let f = 0, r = 0;
      if (!TECNO.bloqueado && !TECNO.panelAbierto) {
        f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + TECNO.joy.y;
        r = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + TECNO.joy.x;
      }
      // hacia dónde mira la cámara, "aplastado" contra el suelo
      this.cam.object3D.getWorldDirection(this.adelante);
      this.adelante.y = 0;
      this.adelante.normalize().negate();
      this.derecha.set(-this.adelante.z, 0, this.adelante.x);
      TECNO.camaraDerecha = this.derecha;          // lo usan los sonidos para saber qué está a tu izquierda
      this.objetivo.set(0, 0, 0).addScaledVector(this.adelante, f).addScaledVector(this.derecha, r);
      if (this.objetivo.lengthSq() > 1) this.objetivo.normalize();
      const corre = k.ShiftLeft || k.ShiftRight;
      this.objetivo.multiplyScalar((def.velocidad ?? J.velocidad) * (corre ? J.correr : 1));
      this.vel.lerp(this.objetivo, 1 - Math.exp(-8 * s));     // acelera y frena suave
      o.position.x += this.vel.x * s;
      o.position.z += this.vel.z * s;
      limitar(def, o.position);
      colisionar(o.position, J.radio);
      const y = def.alturaSuelo ? def.alturaSuelo(o.position.x, o.position.z) : 0;
      o.position.y += (y - o.position.y) * (1 - Math.exp(-12 * s));
      // balanceo de la cabeza al caminar
      const rapidez = this.vel.length();
      this.paso += rapidez * s * 2.2;
      this.cam.object3D.position.y = J.alturaOjos + Math.sin(this.paso * 2) * J.balanceo * Math.min(1, rapidez / 2);
    },
  });


  /* ==========================================================================
     §5 · COMPONENTES INTERACTIVOS
     ========================================================================== */

  // Distancia en el suelo (sin contar la altura) entre la cámara y una posición
  const distanciaPlana = p => Math.hypot(TECNO.camaraPos.x - p.x, TECNO.camaraPos.z - p.z);

  /* ── ORBE-VIGÍA: un ojo que flota y te sigue con la mirada ────────────────
     Opciones (H.orbe({...}) o <a-entity orbe-vigia="...">):
       radio      tamaño del ojo
       color      color del globo        iris   color del iris
       dialogo    nombre del diálogo (config.js) que se abre al acercarte
       distancia  a cuántos metros se abre el diálogo
       aviso      texto que aparece cuando estás cerca
       anillos    cuántos anillos con cables tiene alrededor (0 = ninguno)
       cables     cables por anillo      luz   intensidad de su luz (0 = sin luz)
       flotar     cuánto sube y baja                                         */
  AFRAME.registerComponent('orbe-vigia', {
    schema: {
      radio: { default: 1 }, color: { default: '#f4f1ec' }, iris: { default: '#ff2e7e' },
      dialogo: { default: '' }, distancia: { default: 7 }, aviso: { default: 'Algo te observa…' },
      anillos: { default: 2 }, cables: { default: 24 }, luz: { default: 0 }, flotar: { default: 0.25 },
    },
    init() {
      const d = this.data, raiz = this.el.object3D;
      this.ojo = new THREE.Group();
      raiz.add(this.ojo);
      // el globo del ojo
      this.ojo.add(new THREE.Mesh(new THREE.SphereGeometry(d.radio, 48, 32), H.mat({ color: d.color, emisivo: d.color, brillo: 0.22, rugosidad: 0.25, reflejo: 1.2 })));
      // el iris: un "casquete" de esfera que apunta hacia +Z (hacia donde mira)
      const casquete = (ang, r) => {
        const g = new THREE.SphereGeometry(r, 48, 10, 0, Math.PI * 2, 0, ang);
        g.rotateX(Math.PI / 2);
        const p = g.attributes.position, uv = g.attributes.uv, R = r * Math.sin(ang);
        for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * R) + 0.5, p.getY(i) / (2 * R) + 0.5);
        return g;
      };
      this.ojo.add(new THREE.Mesh(casquete(0.62, d.radio * 1.004), new THREE.MeshBasicMaterial({ map: H.tex('iris'), color: d.iris })));
      this.pupila = new THREE.Mesh(casquete(0.22, d.radio * 1.008), new THREE.MeshBasicMaterial({ color: '#050003' }));
      this.ojo.add(this.pupila);
      H.brillo({ padre: raiz, color: d.iris, tamano: d.radio * 6, opacidad: 0.45 });
      H.brillo({ padre: raiz, color: '#ffffff', tamano: d.radio * 3, opacidad: 0.25 });
      if (d.anillos > 0) H.candelabro({ padre: raiz, pos: [0, d.radio * 0.3, 0], radio: d.radio * 2.4, anillos: d.anillos, separacion: d.radio * 0.45, cables: d.cables, caida: d.radio * 2.6, color: '#eafcff', girar: 0.12, grosor: 0.05 });
      if (d.luz > 0) H.luzPunto(d.iris, d.luz, 25, [0, 0, 0], raiz);
      this.y0 = raiz.position.y;
      this.mira = new THREE.Object3D();
      this.disparado = false;
    },
    tick(t, dt) {
      const d = this.data, o = this.el.object3D, s = dt / 1000;
      o.position.y = this.y0 + Math.sin(t / 1000 * 0.8) * d.flotar;
      // calcular hacia dónde debería mirar y girar suavemente hacia allá
      o.getWorldPosition(this.mira.position);
      this.mira.lookAt(TECNO.camaraPos);
      this.ojo.quaternion.slerp(this.mira.quaternion, 1 - Math.exp(-3 * s));
      const dist = distanciaPlana(this.mira.position);
      this.pupila.scale.setScalar(clamp(dist / 14, 0.45, 1.15));   // la pupila se cierra al acercarte
      if (dist < d.distancia * 2.2) TECNO.pista(d.aviso);
      if (d.dialogo && !this.disparado && dist < d.distancia && !TECNO.bloqueado) {
        this.disparado = true;
        TECNO.dialogo.abrir(d.dialogo);
      }
      if (this.disparado && dist > d.distancia + 3) this.disparado = false;
    },
  });

  /* ── ZONA-DIÁLOGO: lugar invisible que abre un diálogo al entrar ──────────
       H.zona({ pos: [0, 0, -5], radio: 3, dialogo: 'despertar', aviso: '…' })  */
  AFRAME.registerComponent('zona-dialogo', {
    schema: { dialogo: { default: '' }, radio: { default: 3 }, aviso: { default: '' } },
    init() { this.p = new THREE.Vector3(); this.disparado = false; },
    tick() {
      this.el.object3D.getWorldPosition(this.p);
      const dist = distanciaPlana(this.p), d = this.data;
      if (d.aviso && dist < d.radio * 3) TECNO.pista(d.aviso);
      if (!this.disparado && dist < d.radio && !TECNO.bloqueado) { this.disparado = true; TECNO.dialogo.abrir(d.dialogo); }
      if (this.disparado && dist > d.radio + 3) this.disparado = false;
    },
  });

  /* ── PORTAL: puerta de luz hacia otro mundo ───────────────────────────────
     Opciones (H.portal({...})):
       destino   número del mundo al que lleva
       etiqueta  texto que flota encima
       color     color de la luz        velo  color del fundido al cruzar
       ancho, alto  tamaño de la puerta  radio  a qué distancia se activa
     La puerta mira hacia +Z. Para girarla usa rot: [0, 90, 0], etc.          */
  AFRAME.registerComponent('portal', {
    schema: {
      destino: { type: 'int', default: 1 }, etiqueta: { default: '' }, color: { default: '#ffffff' },
      velo: { default: '#000000' }, ancho: { default: 2.2 }, alto: { default: 3.2 }, radio: { default: 1.3 },
    },
    init() {
      const d = this.data, raiz = this.el.object3D;
      this.luz = H.plano({ padre: raiz, ancho: d.ancho, alto: d.alto, pos: [0, d.alto / 2, 0], aditivo: true, color: d.color, textura: 'puerta', doble: true, opacidad: 0.9 });
      const marco = H.fusionar([
        H.geo.caja({ ancho: 0.07, alto: d.alto, fondo: 0.07, pos: [-d.ancho / 2, d.alto / 2, 0] }),
        H.geo.caja({ ancho: 0.07, alto: d.alto, fondo: 0.07, pos: [d.ancho / 2, d.alto / 2, 0] }),
        H.geo.caja({ ancho: d.ancho + 0.07, alto: 0.07, fondo: 0.07, pos: [0, d.alto, 0] }),
      ]);
      H.malla(marco, H.mat({ basico: true, color: d.color }), { padre: raiz });
      H.brillo({ padre: raiz, pos: [0, d.alto * 0.5, 0.3], color: d.color, tamano: d.alto * 2.4, opacidad: 0.4 });
      H.plano({ padre: raiz, ancho: d.ancho * 3, alto: d.ancho * 3, rot: [-90, 0, 0], pos: [0, 0.03, 0.4], aditivo: true, textura: 'brillo', color: d.color, opacidad: 0.5 });
      H.particulas({ padre: raiz, cantidad: 40, centro: [0, d.alto / 2, 0.2], area: [d.ancho, d.alto, 0.6], color: d.color, tamano: 0.05, velocidad: [0, 0.35, 0], vaiven: 0.05 });
      if (d.etiqueta) H.texto({ padre: raiz, texto: d.etiqueta, pos: [0, d.alto + 0.5, 0], alto: 0.36, color: '#ffffff', resplandor: d.color, cursiva: true });
      this.p = new THREE.Vector3();
    },
    tick(t) {
      const d = this.data;
      this.luz.material.opacity = 0.75 + Math.sin(t / 1000 * 2.2) * 0.15;
      this.el.object3D.getWorldPosition(this.p);
      const dist = distanciaPlana(this.p);
      if (dist < d.radio * 4) TECNO.pista(CONFIG.textos.pistaPortal + (d.etiqueta ? ' · ' + d.etiqueta : ''));
      if (dist < d.radio && !TECNO.bloqueado) TECNO.irA(d.destino, { velo: d.velo });
    },
  });


  /* ==========================================================================
     §6 · DIÁLOGOS E INTERFAZ (HUD)
     --------------------------------------------------------------------------
     El HUD es HTML normal (ver index.html y style.css) encima del 3D.
     ========================================================================== */
  const ui = {};

  TECNO.dialogo = {
    abierto: false,
    abrir(clave) {
      const d = CONFIG.dialogos[clave];
      if (!d) { console.warn('No existe el diálogo', clave, '(revisa config.js)'); return; }
      this.d = d; this.i = 0; this.abierto = true;
      TECNO.bloqueado = true;
      ui.dialogoQuien.textContent = d.quien || '';
      ui.dialogo.hidden = false;
      document.body.classList.add('dialogo-abierto');
      requestAnimationFrame(() => ui.dialogo.classList.add('visible'));
      Sonido.efecto('orbe');
      this.mostrarLinea();
    },
    mostrarLinea() {
      const linea = this.d.lineas[this.i] || '';
      ui.dialogoOpciones.innerHTML = '';
      ui.dialogoAyuda.textContent = CONFIG.textos.continuar;
      ui.dialogoTexto.textContent = '';
      this.escribiendo = true;
      let n = 0;
      clearInterval(this.timer);
      this.timer = setInterval(() => {   // efecto máquina de escribir
        n++;
        ui.dialogoTexto.textContent = linea.slice(0, n);
        if (n >= linea.length) this.terminarLinea();
      }, 1000 / CONFIG.velocidadTexto);
    },
    terminarLinea() {
      clearInterval(this.timer);
      this.escribiendo = false;
      ui.dialogoTexto.textContent = this.d.lineas[this.i];
      if (this.i === this.d.lineas.length - 1) this.mostrarOpciones();
    },
    mostrarOpciones() {
      const ops = this.d.opciones || [];
      ops.forEach((op, k) => {
        const b = document.createElement('button');
        b.innerHTML = `<kbd>${k + 1}</kbd><span></span>`;
        b.querySelector('span').textContent = op.texto;
        b.addEventListener('click', e => { e.stopPropagation(); this.elegir(k); });
        ui.dialogoOpciones.appendChild(b);
      });
      ui.dialogoAyuda.textContent = ops.length ? CONFIG.textos.elegir : CONFIG.textos.cerrar;
    },
    avanzar() {
      if (!this.abierto) return;
      if (this.escribiendo) return this.terminarLinea();
      if (this.i < this.d.lineas.length - 1) { this.i++; this.mostrarLinea(); }
      else if (!(this.d.opciones || []).length) this.cerrar();
    },
    elegir(k) {
      const op = (this.d.opciones || [])[k];
      if (!op || this.escribiendo) return;
      Sonido.efecto('eleccion');
      this.cerrar();
      if (op.destino) TECNO.irA(op.destino, { velo: op.velo || '#000000' });
    },
    cerrar() {
      clearInterval(this.timer);
      this.abierto = false;
      document.body.classList.remove('dialogo-abierto');
      ui.dialogo.classList.remove('visible');
      setTimeout(() => { if (!this.abierto) ui.dialogo.hidden = true; }, 450);
      if (!TECNO.transicionando) TECNO.bloqueado = false;
    },
  };

  // Frases que aparecen abajo, una tras otra
  let narracionId = 0;
  TECNO.narrar = (lineas, retraso = 0) => {
    const id = ++narracionId;
    let i = 0;
    ui.subtitulos.classList.remove('visible');
    const siguiente = () => {
      if (id !== narracionId) return;
      if (i >= lineas.length) return;
      const l = lineas[i++];
      ui.subtitulos.textContent = l;
      ui.subtitulos.classList.add('visible');
      setTimeout(() => {
        if (id !== narracionId) return;
        ui.subtitulos.classList.remove('visible');
        setTimeout(siguiente, 1000);
      }, 2600 + l.length * 55);
    };
    if (lineas.length) setTimeout(siguiente, retraso);
  };

  // Pista: texto pequeño que aparece mientras algo cercano lo pide
  let pistaT = 0;
  TECNO.pista = txt => {
    pistaT = performance.now();
    if (ui.pista.textContent !== txt) ui.pista.textContent = txt;
    if (!TECNO.dialogo.abierto) ui.pista.classList.add('visible');
  };

  // Aviso: mensaje corto arriba (cambios de calidad, errores)
  TECNO.aviso = txt => {
    ui.aviso.textContent = txt;
    ui.aviso.classList.add('visible');
    clearTimeout(ui.aviso._t);
    ui.aviso._t = setTimeout(() => ui.aviso.classList.remove('visible'), 2600);
  };

  /* CINEMÁTICA: un video a pantalla completa (se configura en config.js → cinematica).
     Mientras se ve, no puedes caminar. Al terminar (o al saltarla) llama a alTerminar().
     Si config.js no tiene la sección "cinematica", se usan estos valores por defecto. */
  const ajustesCinematica = () => ({
    archivo: 'video/cinematica-inicio.mp4', saltable: true, alReiniciar: true, volumen: 1, textoSaltar: 'Saltar ›',
    ...(CONFIG.cinematica || {}),
  });
  TECNO.enCinematica = false;
  TECNO.cinematica = alTerminar => {
    const cin = ajustesCinematica();
    if (!cin.archivo) { alTerminar(); return; }
    const caja = ui.cinematica, video = ui.cinematicaVideo;
    let terminado = false;
    const terminar = () => {
      if (terminado) return;
      terminado = true;
      TECNO.saltarCinematica = () => {};
      caja.classList.remove('visible');             // fundido de salida
      setTimeout(() => {
        video.pause();
        video.removeAttribute('src'); video.load();  // libera la memoria del video
        caja.hidden = true;
        TECNO.enCinematica = false;
        alTerminar();
      }, 900);
    };
    TECNO.enCinematica = true;
    TECNO.bloqueado = true;
    TECNO.saltarCinematica = terminar;
    Sonido.callar();                                  // que no se encime la música del mundo
    video.onended = terminar;
    video.onerror = () => { console.warn('No se pudo reproducir la cinemática "' + cin.archivo + '" → sigo sin ella.'); terminar(); };
    video.volume = Sonido.silencio ? 0 : Math.min(1, Sonido.volumen * (cin.volumen ?? 1));
    video.src = cin.archivo;
    ui.saltarCinematica.textContent = cin.textoSaltar || 'Saltar ›';
    ui.saltarCinematica.hidden = cin.saltable === false;
    caja.hidden = false;
    requestAnimationFrame(() => caja.classList.add('visible'));
    const p = video.play();
    if (p && p.catch) p.catch(err => { console.warn('El navegador no dejó reproducir la cinemática:', err.message); terminar(); });
  };
  TECNO.saltarCinematica = () => {};

  const Interfaz = {
    iniciar() {
      const ids = ['inicio', 'entrar', 'velo', 'cinematica', 'cinematica-video', 'saltar-cinematica', 'titulo', 'titulo-numero', 'titulo-nombre', 'titulo-sub', 'subtitulos', 'pista', 'aviso',
        'dialogo', 'dialogo-quien', 'dialogo-texto', 'dialogo-opciones', 'dialogo-ayuda', 'panel', 'boton-panel', 'cerrar-panel',
        'fps', 'joystick', 'joystick-bola', 'lista-mundos', 'seccion-mundos', 'volumen', 'silencio', 'ver-fps', 'copiar-cambios', 'abrir-inspector'];
      ids.forEach(id => { ui[id.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = document.getElementById(id); });

      // botones de calidad (en la pantalla de inicio y en el panel)
      document.querySelectorAll('.botones-calidad').forEach(caja => {
        ['auto', ...Object.keys(CONFIG.calidades)].forEach(clave => {
          const b = document.createElement('button');
          b.dataset.calidad = clave;
          b.textContent = clave === 'auto' ? 'Auto' : CONFIG.calidades[clave].nombre;
          b.addEventListener('click', () => TECNO.aplicarCalidad(clave, true));
          caja.appendChild(b);
        });
      });

      // lista de mundos (para saltar mientras editas)
      if (CONFIG.menuDeMundos) {
        Object.keys(TECNO.mundos).map(Number).sort((a, b) => a - b).forEach(id => {
          const b = document.createElement('button');
          b.dataset.mundo = id;
          b.textContent = id + ' · ' + ((CONFIG.textos.mundos[id] || {}).nombre || 'Mundo ' + id);
          b.addEventListener('click', () => { Interfaz.panel(false); TECNO.irA(id); });
          ui.listaMundos.appendChild(b);
        });
      } else ui.seccionMundos.hidden = true;

      // entrar
      ui.entrar.addEventListener('click', () => {
        ui.inicio.classList.add('oculto');
        Sonido.iniciar();
        const empezar = () => { TECNO.bloqueado = false; TECNO.presentarMundo(); };
        // en el Mundo 1 primero va la cinemática (play() dentro del clic → el navegador deja sonar el video)
        if (TECNO.actual && TECNO.actual.id === 1) TECNO.cinematica(empezar); else empezar();
      });

      // saltar la cinemática: botón o clic sobre el video
      const saltar = e => { e.stopPropagation(); if (ajustesCinematica().saltable !== false) TECNO.saltarCinematica(); };
      ui.saltarCinematica.addEventListener('click', saltar);
      ui.cinematica.addEventListener('click', saltar);

      // panel
      ui.botonPanel.addEventListener('click', () => Interfaz.panel(!TECNO.panelAbierto));

      // pantalla completa de TODA la página (así los textos y diálogos no se pierden)
      const botonPantalla = document.getElementById('boton-pantalla');
      if (!document.fullscreenEnabled) botonPantalla.hidden = true;     // p. ej. iPhone
      botonPantalla.addEventListener('click', () => Interfaz.pantallaCompleta());
      document.addEventListener('fullscreenchange', () => {
        botonPantalla.textContent = document.fullscreenElement ? '✕' : '⛶';
        botonPantalla.title = document.fullscreenElement ? 'Salir de pantalla completa (P)' : 'Pantalla completa (P)';
      });
      ui.cerrarPanel.addEventListener('click', () => Interfaz.panel(false));
      ui.volumen.value = Sonido.volumen;
      ui.volumen.addEventListener('input', () => Sonido.ponerVolumen(parseFloat(ui.volumen.value)));
      ui.silencio.addEventListener('click', () => Sonido.alternarSilencio());
      ui.verFps.addEventListener('change', () => ui.fps.classList.toggle('visible', ui.verFps.checked));
      ui.copiarCambios.addEventListener('click', () => Edicion.copiar());
      ui.abrirInspector.addEventListener('click', () => { Interfaz.panel(false); escena.components.inspector.openInspector(); });
      // El inspector pone la clase "aframe-inspector-opened" en <body>: con eso se
      // esconde la interfaz (ver style.css) y el juego deja de escuchar el teclado.
      // Al cerrarlo, los choques se recalculan con las piezas donde quedaron.
      new MutationObserver(() => {
        const abierto = document.body.classList.contains('aframe-inspector-opened');
        if (abierto === TECNO.inspectorAbierto) return;
        TECNO.inspectorAbierto = abierto;
        if (!abierto) {
          if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
          if (E) E.solidos.forEach(s => { if (s.obj) medirSolido(s); });
        }
      }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
      ui.dialogo.addEventListener('click', () => TECNO.dialogo.avanzar());

      // teclado (las teclas de caminar las lee el componente jugador)
      window.addEventListener('keydown', e => {
        if (TECNO.inspectorAbierto) return;   // el inspector usa sus propias teclas
        if (TECNO.enCinematica) {        // durante la cinemática solo sirve saltarla
          if ((e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') && ajustesCinematica().saltable !== false) { e.preventDefault(); TECNO.saltarCinematica(); }
          return;
        }
        if (e.target.tagName === 'INPUT' || !ui.inicio.classList.contains('oculto')) return;
        const D = TECNO.dialogo;
        if (e.code === 'Escape') { if (D.abierto) D.cerrar(); else Interfaz.panel(!TECNO.panelAbierto); return; }
        if (D.abierto) {
          if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); D.avanzar(); }
          const n = parseInt(e.key, 10);
          if (n >= 1 && n <= 9) D.elegir(n - 1);
          return;
        }
        if (e.code === 'KeyM') Sonido.alternarSilencio();
        if (e.code === 'KeyP') Interfaz.pantallaCompleta();
        if (e.code === 'KeyH') document.body.classList.toggle('sin-hud');
        if (e.code === 'KeyF') { ui.verFps.checked = !ui.verFps.checked; ui.fps.classList.toggle('visible', ui.verFps.checked); }
        if (e.code === 'KeyQ') {
          const claves = ['auto', ...Object.keys(CONFIG.calidades)];
          TECNO.aplicarCalidad(claves[(claves.indexOf(TECNO.claveCalidad) + 1) % claves.length], true);
        }
        const n = parseInt(e.key, 10);
        if (CONFIG.menuDeMundos && n >= 1 && TECNO.mundos[n] && !TECNO.panelAbierto) TECNO.irA(n);
      });

      Interfaz.joystick();
    },
    // Entra o sale de pantalla completa. Se pide para <html> (toda la página),
    // no para el lienzo 3D: si no, la interfaz quedaría afuera.
    pantallaCompleta() {
      if (!document.fullscreenEnabled) return;
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(err => TECNO.aviso('No se pudo entrar a pantalla completa: ' + err.message));
    },
    panel(abrir) {
      TECNO.panelAbierto = abrir;
      ui.panel.hidden = !abrir;
    },
    marcarCalidad(clave) {
      document.querySelectorAll('[data-calidad]').forEach(b => b.classList.toggle('activo', b.dataset.calidad === clave));
    },
    marcarMundo(id) {
      document.querySelectorAll('#lista-mundos [data-mundo]').forEach(b => b.classList.toggle('activo', +b.dataset.mundo === id));
    },
    // joystick virtual para pantallas táctiles
    joystick() {
      const tactil = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
      if (!tactil) return;
      document.body.classList.add('tactil');
      const j = ui.joystick, bola = ui.joystickBola, R = 48;
      let id = null, cx = 0, cy = 0;
      j.addEventListener('touchstart', e => {
        const t = e.changedTouches[0], r = j.getBoundingClientRect();
        id = t.identifier; cx = r.left + r.width / 2; cy = r.top + r.height / 2;
        e.preventDefault();
      }, { passive: false });
      j.addEventListener('touchmove', e => {
        for (const t of e.changedTouches) if (t.identifier === id) {
          let dx = t.clientX - cx, dy = t.clientY - cy;
          const d = Math.hypot(dx, dy);
          if (d > R) { dx *= R / d; dy *= R / d; }
          bola.style.transform = `translate(${dx}px, ${dy}px)`;
          TECNO.joy.x = dx / R; TECNO.joy.y = -dy / R;
        }
        e.preventDefault();
      }, { passive: false });
      const soltar = () => { id = null; TECNO.joy.x = TECNO.joy.y = 0; bola.style.transform = ''; };
      j.addEventListener('touchend', soltar);
      j.addEventListener('touchcancel', soltar);
    },
  };


  /* ==========================================================================
     §7 · SONIDO
     --------------------------------------------------------------------------
     La música de cada mundo se configura en config.js → musica.
     Si hay archivo, se reproduce en bucle; si no, se genera con el
     sintetizador (Web Audio API): osciladores + filtro + ruido + campanas.
     ========================================================================== */
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } }

  const Sonido = TECNO.sonido = {
    ctx: null, maestro: null, actual: null, silencio: false,
    volumen: parseFloat(leer('tecno-volumen') ?? CONFIG.volumen),

    iniciar() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.maestro = ctx.createGain();
      this.maestro.gain.value = this.silencio ? 0 : this.volumen;
      const comp = ctx.createDynamicsCompressor();
      this.maestro.connect(comp); comp.connect(ctx.destination);
      // eco compartido (le da espacio a las campanas)
      this.eco = ctx.createDelay(1.5); this.eco.delayTime.value = 0.42;
      const fb = ctx.createGain(); fb.gain.value = 0.45;
      const ecoFiltro = ctx.createBiquadFilter(); ecoFiltro.type = 'lowpass'; ecoFiltro.frequency.value = 2500;
      this.eco.connect(ecoFiltro); ecoFiltro.connect(fb); fb.connect(this.eco); ecoFiltro.connect(this.maestro);
      // ruido blanco reutilizable (viento, mar, efectos)
      const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.bufferRuido = b;
    },

    // Cambia la música al mundo `id` con fundido cruzado
    mundo(id) {
      if (!this.ctx) return;
      const m = CONFIG.musica[id] || {};
      const viejo = this.actual;
      this.actual = m.archivo ? this.pista(m) : this.sinte(m.sinte || {}, m.volumen ?? 1);
      if (viejo) viejo.detener();
    },

    // Apaga la música actual con un fundido (la usa la cinemática)
    callar() {
      if (this.actual) this.actual.detener();
      this.actual = null;
    },

    // Música desde un archivo (mp3, ogg, wav…)
    pista(m) {
      const ctx = this.ctx, g = ctx.createGain(), vol = m.volumen ?? 1;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 3);
      g.connect(this.maestro);
      const audio = new Audio();
      audio.src = m.archivo; audio.loop = true;
      try { ctx.createMediaElementSource(audio).connect(g); } catch (e) { console.warn(e); }
      const yo = {
        detener: () => {
          const t = ctx.currentTime;
          g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 2);
          setTimeout(() => { audio.pause(); g.disconnect(); }, 2200);
        },
      };
      audio.addEventListener('error', () => {
        console.warn('No se pudo cargar la música "' + m.archivo + '" → uso el sintetizador.');
        if (this.actual === yo) this.actual = this.sinte(m.sinte || {}, vol);
        yo.detener();
      });
      audio.play().catch(() => {});
      return yo;
    },

    // El sintetizador de ambiente
    sinte(p, vol = 1) {
      const ctx = this.ctx, t0 = ctx.currentTime, nota = p.nota ?? 55, brillo = p.brillo ?? 400;
      const salida = ctx.createGain();
      salida.gain.setValueAtTime(0, t0);
      salida.gain.linearRampToValueAtTime(vol * 0.5, t0 + 4);
      salida.connect(this.maestro);
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass'; filtro.frequency.value = brillo; filtro.Q.value = 3;
      filtro.connect(salida);
      const nodos = [];
      // 1) el zumbido: varias notas (fundamental, quinta, octava, octava grave)
      [[1, 0.3], [1.5, 0.13], [2.004, 0.09], [0.5, 0.22]].forEach(([mult, amp]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = p.forma ?? 'sawtooth'; o.frequency.value = nota * mult; o.detune.value = (Math.random() - 0.5) * 14;
        g.gain.value = amp; o.connect(g); g.connect(filtro); o.start(); nodos.push(o);
      });
      // 2) respiración: el filtro se abre y se cierra lentamente
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = p.respiracion ?? 0.07; lg.gain.value = brillo * 0.6;
      lfo.connect(lg); lg.connect(filtro.frequency); lfo.start(); nodos.push(lfo);
      // 3) ruido: viento o mar
      if (p.ruido) {
        const r = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), rg = ctx.createGain();
        r.buffer = this.bufferRuido; r.loop = true;
        bp.type = 'bandpass'; bp.frequency.value = p.tonoRuido ?? 700; bp.Q.value = 0.7;
        rg.gain.value = p.oleaje ? p.ruido * 0.5 : p.ruido;
        r.connect(bp); bp.connect(rg); rg.connect(salida); r.start(); nodos.push(r);
        const mod = ctx.createOscillator(), mg = ctx.createGain();
        if (p.oleaje) { mod.frequency.value = 0.09; mg.gain.value = p.ruido * 0.5; mod.connect(mg); mg.connect(rg.gain); }
        else { mod.frequency.value = 0.05; mg.gain.value = (p.tonoRuido ?? 700) * 0.4; mod.connect(mg); mg.connect(bp.frequency); }
        mod.start(); nodos.push(mod);
      }
      // 4) campanas al azar
      let timerC = null;
      if (p.campanas) {
        const escala = [2, 3, 4, 4.5, 5, 6, 8, 9];
        const tocar = () => {
          this.campana(nota * escala[(Math.random() * escala.length) | 0], p.campanas, salida);
          timerC = setTimeout(tocar, 2500 + Math.random() * 6500);
        };
        timerC = setTimeout(tocar, 2500);
      }
      // 5) latido
      let timerL = null;
      if (p.latido) {
        const latir = () => { this.golpe(salida, 0); this.golpe(salida, 0.3); timerL = setTimeout(latir, 1400); };
        timerL = setTimeout(latir, 1000);
      }
      // 6) capas de ambiente (grillos, cuervos, máquinas…): ver Sonido.capa
      const capas = (p.capas || []).map(nombre => this.capa(nombre, salida, 1));
      return {
        detener: () => {
          const t = ctx.currentTime;
          salida.gain.cancelScheduledValues(t); salida.gain.setValueAtTime(salida.gain.value, t); salida.gain.linearRampToValueAtTime(0, t + 2.5);
          clearTimeout(timerC); clearTimeout(timerL);
          capas.forEach(c => c.detener());
          setTimeout(() => { nodos.forEach(n => { try { n.stop(); } catch (e) { /* ya parado */ } }); salida.disconnect(); }, 2700);
        },
      };
    },

    /* CAPAS DE AMBIENTE: sonidos hechos con código que se suman a la música.
       Se piden en config.js → musica[N].sinte.capas: ['grillos', 'cuervos']
       o se ponen en un lugar del mundo con H.sonido({ pos, tipo }).
       Tipos: grillos · cuervos · gaviotas · goteo · zumbido · maquinas ·
              crujidos · chisporroteo · estatica · viento                     */
    capa(tipo, destino, vol = 1) {
      const ctx = this.ctx, nodos = [], cancelar = [];
      let vivo = true;
      const salida = ctx.createGain();
      salida.gain.value = vol;
      salida.connect(destino);
      // repite fn() cada min–max segundos
      const cada = (min, max, fn) => {
        let h;
        const tic = () => { if (!vivo) return; fn(ctx.currentTime); h = setTimeout(tic, (min + Math.random() * (max - min)) * 1000); };
        h = setTimeout(tic, Math.random() * max * 1000);
        cancelar.push(() => clearTimeout(h));
      };
      // un sonido corto colocado a la izquierda o a la derecha
      const lado = (pan = Math.random() * 1.6 - 0.8) => {
        if (!ctx.createStereoPanner) return salida;
        const s = ctx.createStereoPanner(); s.pan.value = pan; s.connect(salida); return s;
      };
      const envolvente = (g, t, ataque, pico, caida) => {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(pico, t + ataque);
        g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
      };
      const ruido = () => { const r = ctx.createBufferSource(); r.buffer = this.bufferRuido; r.loop = true; return r; };
      const filtro = (tipoF, f, q = 1) => { const b = ctx.createBiquadFilter(); b.type = tipoF; b.frequency.value = f; b.Q.value = q; return b; };

      switch (tipo) {
        case 'grillos':          // chirridos agudos en grupos de tres
          cada(0.3, 1.6, t => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.frequency.value = 4200 + Math.random() * 800;
            o.connect(g); g.connect(lado());
            g.gain.setValueAtTime(0, t);
            for (let k = 0; k < 3; k++) { g.gain.linearRampToValueAtTime(0.025, t + k * 0.05 + 0.005); g.gain.linearRampToValueAtTime(0, t + k * 0.05 + 0.03); }
            o.start(t); o.stop(t + 0.2);
          });
          break;
        case 'cuervos':          // graznidos lejanos
          cada(6, 16, t => {
            const n = 2 + (Math.random() * 2 | 0), p = lado();
            for (let k = 0; k < n; k++) {
              const t0 = t + k * 0.42, o = ctx.createOscillator(), g = ctx.createGain(), bp = filtro('bandpass', 950, 2.5);
              o.type = 'sawtooth'; o.frequency.setValueAtTime(560, t0); o.frequency.exponentialRampToValueAtTime(390, t0 + 0.24);
              o.connect(bp); bp.connect(g); g.connect(p); g.connect(this.eco);
              envolvente(g, t0, 0.02, 0.09, 0.26); o.start(t0); o.stop(t0 + 0.32);
            }
          });
          break;
        case 'gaviotas':         // llamadas que bajan de tono
          cada(7, 18, t => {
            const p = lado();
            for (let k = 0; k < 2; k++) {
              const t0 = t + k * 0.5, o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
              o.frequency.setValueAtTime(1750, t0); o.frequency.exponentialRampToValueAtTime(1050, t0 + 0.38);
              vib.frequency.value = 18; vg.gain.value = 45; vib.connect(vg); vg.connect(o.frequency);
              o.connect(g); g.connect(p); g.connect(this.eco);
              envolvente(g, t0, 0.03, 0.035, 0.38); o.start(t0); o.stop(t0 + 0.45); vib.start(t0); vib.stop(t0 + 0.45);
            }
          });
          break;
        case 'goteo':            // gotas de agua
          cada(0.7, 3.2, t => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.frequency.setValueAtTime(650 + Math.random() * 300, t); o.frequency.exponentialRampToValueAtTime(1500 + Math.random() * 500, t + 0.05);
            o.connect(g); g.connect(lado()); g.connect(this.eco);
            envolvente(g, t, 0.003, 0.06, 0.12); o.start(t); o.stop(t + 0.18);
          });
          break;
        case 'zumbido': {        // electricidad: 60 Hz y armónicos, con cortes
          const bp = filtro('bandpass', 220, 0.6), g = ctx.createGain();
          g.gain.value = 1; bp.connect(g); g.connect(salida);
          [[60, 'sawtooth', 0.025], [120, 'sine', 0.02], [180, 'sawtooth', 0.008]].forEach(([f, forma, a]) => {
            const o = ctx.createOscillator(), og = ctx.createGain();
            o.type = forma; o.frequency.value = f; og.gain.value = a; o.connect(og); og.connect(bp); o.start(); nodos.push(o);
          });
          cada(2, 7, t => { g.gain.setValueAtTime(0.15, t); g.gain.setValueAtTime(1, t + 0.05 + Math.random() * 0.15); });
          break;
        }
        case 'maquinas':         // golpe metálico rítmico, lejano
          cada(1.5, 1.7, t => {
            const r = ruido(), bp = filtro('bandpass', 170, 3), g = ctx.createGain();
            r.connect(bp); bp.connect(g); g.connect(salida); envolvente(g, t, 0.005, 0.35, 0.28); r.start(t); r.stop(t + 0.35);
            [1240, 1873].forEach(f => {
              const o = ctx.createOscillator(), og = ctx.createGain();
              o.frequency.value = f; o.connect(og); og.connect(salida); og.connect(this.eco);
              envolvente(og, t + 0.01, 0.002, 0.012, 0.7); o.start(t); o.stop(t + 0.8);
            });
          });
          break;
        case 'crujidos':         // metal que se queja
          cada(8, 20, t => {
            const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), bp = filtro('bandpass', 620, 7), g = ctx.createGain();
            o.type = 'sawtooth'; o.frequency.value = 60 + Math.random() * 40;
            lfo.frequency.value = 6 + Math.random() * 5; lg.gain.value = 22; lfo.connect(lg); lg.connect(o.frequency);
            o.connect(bp); bp.connect(g); g.connect(lado()); g.connect(this.eco);
            envolvente(g, t, 0.35, 0.12, 1.4); o.start(t); o.stop(t + 1.9); lfo.start(t); lfo.stop(t + 1.9);
          });
          break;
        case 'chisporroteo':     // chispas eléctricas
          cada(0.04, 0.5, t => {
            const r = ruido(), hp = filtro('highpass', 2200), g = ctx.createGain();
            r.connect(hp); hp.connect(g); g.connect(salida);
            envolvente(g, t, 0.001, 0.05 + Math.random() * 0.2, 0.02 + Math.random() * 0.04); r.start(t, Math.random()); r.stop(t + 0.1);
          });
          break;
        case 'estatica': {       // televisión sin señal
          const r = ruido(), bp = filtro('bandpass', 3200, 0.4), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
          g.gain.value = 0.05; lfo.frequency.value = 9; lg.gain.value = 0.015;
          lfo.connect(lg); lg.connect(g.gain); r.connect(bp); bp.connect(g); g.connect(salida);
          r.start(); lfo.start(); nodos.push(r, lfo);
          break;
        }
        case 'viento': {         // ráfagas graves
          const r = ruido(), lp = filtro('lowpass', 380, 0.8), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
          g.gain.value = 0.12; lfo.frequency.value = 0.07; lg.gain.value = 0.09;
          lfo.connect(lg); lg.connect(g.gain); r.connect(lp); lp.connect(g); g.connect(salida);
          r.start(); lfo.start(); nodos.push(r, lfo);
          break;
        }
        default: console.warn('No existe la capa de sonido', tipo);
      }
      return {
        salida,
        detener: () => {
          vivo = false;
          cancelar.forEach(f => f());
          salida.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
          setTimeout(() => { nodos.forEach(n => { try { n.stop(); } catch (e) { /* ya parado */ } }); salida.disconnect(); }, 1600);
        },
      };
    },

    campana(freq, vol, destino) {
      const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 0.1, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
      o.connect(g); g.connect(destino); g.connect(this.eco);
      o.start(t); o.stop(t + 5.2);
    },

    golpe(destino, retraso) {
      const ctx = this.ctx, t = ctx.currentTime + retraso, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(75, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.2);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.55, t + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g); g.connect(destino); o.start(t); o.stop(t + 0.4);
    },

    // Efectos cortos: 'portal' | 'eleccion' | 'orbe'
    efecto(tipo) {
      if (!this.ctx) return;
      const ctx = this.ctx, t = ctx.currentTime;
      if (tipo === 'portal') {
        const r = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        r.buffer = this.bufferRuido; bp.type = 'bandpass'; bp.Q.value = 4;
        bp.frequency.setValueAtTime(200, t); bp.frequency.exponentialRampToValueAtTime(4000, t + 1.4);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.8); g.gain.linearRampToValueAtTime(0, t + 1.6);
        r.connect(bp); bp.connect(g); g.connect(this.maestro); g.connect(this.eco); r.start(t); r.stop(t + 1.7);
      } else if (tipo === 'eleccion') {
        this.campana(660, 1.4, this.maestro);
        setTimeout(() => this.ctx && this.campana(990, 1.2, this.maestro), 140);
      } else if (tipo === 'orbe') {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(55, t + 1.6);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.1); g.gain.exponentialRampToValueAtTime(0.001, t + 2);
        o.connect(g); g.connect(this.maestro); g.connect(this.eco); o.start(t); o.stop(t + 2.1);
      }
    },

    ponerVolumen(v) {
      this.volumen = v; guardar('tecno-volumen', v);
      if (this.maestro && !this.silencio) this.maestro.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    },
    alternarSilencio() {
      this.silencio = !this.silencio;
      if (this.maestro) this.maestro.gain.setTargetAtTime(this.silencio ? 0 : this.volumen, this.ctx.currentTime, 0.1);
      ui.silencio.textContent = this.silencio ? 'Activar sonido' : 'Silenciar';
      TECNO.aviso(this.silencio ? 'Sonido apagado (M)' : 'Sonido encendido');
    },
  };


  /* ==========================================================================
     §8 · CALIDAD Y RENDIMIENTO
     ========================================================================== */
  let resolucionActual = 1;
  const techoResolucion = () => Math.min(TECNO.nivel.resolucion, Math.max(1, window.devicePixelRatio || 1));

  // clave: 'auto' | 'baja' | 'media' | 'alta' | 'ultra'
  TECNO.aplicarCalidad = (clave, reconstruir) => {
    if (clave !== 'auto' && !CONFIG.calidades[clave]) clave = 'media';
    const base = CONFIG.calidades[clave === 'auto' ? CONFIG.auto.base : clave];
    const cambiaEstructura = !TECNO.nivel || TECNO.nivel.densidad !== base.densidad || TECNO.nivel.sombras !== base.sombras || TECNO.nivel.distancia !== base.distancia;
    TECNO.claveCalidad = clave;
    TECNO.nivel = { ...base };
    resolucionActual = techoResolucion();
    renderer.setPixelRatio(resolucionActual);
    camaraEl.setAttribute('camera', 'far', base.distancia);
    guardar('tecno-calidad', clave);
    Interfaz.marcarCalidad(clave);
    if (reconstruir && E) {
      // reconstruye el mundo con la nueva densidad, sin moverte de lugar
      if (cambiaEstructura) TECNO.cargarMundo(E.id, true);
      TECNO.aviso('Calidad: ' + (clave === 'auto' ? 'Automática' : base.nombre));
    }
  };

  // Mide los FPS cada 2 segundos y, en modo auto, ajusta la resolución
  let cuadros = 0, acumulado = 0, buenas = 0;
  function medirRendimiento(dt) {
    cuadros++; acumulado += dt;
    if (acumulado < 2000) return;
    const fps = cuadros * 1000 / acumulado;
    cuadros = 0; acumulado = 0;
    ui.fps.textContent = Math.round(fps) + ' fps · ' + resolucionActual.toFixed(2) + 'x · ' + renderer.info.render.calls + ' llamadas';
    if (TECNO.claveCalidad !== 'auto' || fps < 5 || document.hidden) return;
    const A = CONFIG.auto;
    if (fps < A.fpsMinimo && resolucionActual > A.resolucionMinima) {
      resolucionActual = Math.max(A.resolucionMinima, resolucionActual - 0.15);
      renderer.setPixelRatio(resolucionActual); buenas = 0;
    } else if (fps > A.fpsBueno && resolucionActual < techoResolucion()) {
      if (++buenas >= 3) { resolucionActual = Math.min(techoResolucion(), resolucionActual + 0.1); renderer.setPixelRatio(resolucionActual); buenas = 0; }
    }
  }


  /* ==========================================================================
     §9 · ARRANQUE
     --------------------------------------------------------------------------
     Un "sistema" de A-Frame es como un componente, pero hay uno solo por
     escena. Este arranca todo cuando la escena está lista y, en cada cuadro,
     ejecuta las animaciones del mundo activo.
     ========================================================================== */
  AFRAME.registerSystem('tecno', {
    init() {
      escena = this.el;
      if (escena.hasLoaded) arranque(); else escena.addEventListener('loaded', arranque);
    },
    tick(t, dt) {
      if (!E) return;
      const s = Math.min(dt, 100) / 1000, ts = t / 1000;
      const lista = E.animadores;
      for (let i = 0; i < lista.length; i++) {
        try { lista[i](ts, s); } catch (err) {
          console.error('Error en una animación del mundo ' + E.id + ' (se desactiva):', err);
          lista.splice(i--, 1);
        }
      }
      medirRendimiento(dt);
      if (performance.now() - pistaT > 250) ui.pista.classList.remove('visible');
    },
  });

  function arranque() {
    renderer = escena.renderer;
    jugadorEl = document.getElementById('jugador');
    camaraEl = document.getElementById('camara');
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    pmrem = new THREE.PMREMGenerator(renderer);
    // Si algo falla al dibujar un cuadro, se avisa en la consola pero el juego
    // sigue (sin esto, un solo error detiene el dibujo para siempre).
    const protegerDibujo = () => {
      let avisado = false;
      renderer.setAnimationLoop((t, frame) => {
        try { escena.render(t, frame); } catch (err) {
          if (!avisado) { console.error('Error al dibujar un cuadro (el juego sigue):', err); avisado = true; }
        }
      });
    };
    if (escena.renderStarted) protegerDibujo(); else escena.addEventListener('renderstart', protegerDibujo);
    escena.object3D.fog = new THREE.FogExp2(0x000000, 0.02);
    Interfaz.iniciar();
    TECNO.aplicarCalidad(leer('tecno-calidad') || CONFIG.calidadInicial, false);
    const desdeURL = parseInt(new URLSearchParams(location.search).get('mundo'), 10);
    TECNO.cargarMundo(TECNO.mundos[desdeURL] ? desdeURL : CONFIG.mundoInicial);
    document.body.classList.add('listo');
  }
})();
