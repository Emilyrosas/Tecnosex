/* ==========================================================================
   CONFIG.JS · TODO LO QUE PUEDES CAMBIAR SIN TOCAR EL MOTOR
   ==========================================================================

   Este archivo es el "tablero de control" de la experiencia. Aquí están:

     1. INICIO        → en qué mundo empiezas
     2. JUGADOR       → altura, velocidad al caminar
     3. CALIDAD       → niveles de rendimiento (resolución, densidad, sombras…)
     4. MÚSICA        → qué suena en cada mundo  ← AQUÍ CAMBIAS LA MÚSICA
     5. MODELOS 3D    → archivos .glb que quieras poner  ← AQUÍ AGREGAS MODELOS
     6. TEXTOS        → nombres de mundos, narración y diálogos

   Regla de oro: cambia un valor, guarda, recarga la página (F5).
   Si algo se rompe, abre la consola del navegador (F12) y lee el error:
   casi siempre es una coma o una comilla que falta.
   ========================================================================== */

window.CONFIG = {

  /* ────────────────────────────────────────────────────────────────────────
     1 · INICIO
     ──────────────────────────────────────────────────────────────────────── */
  mundoInicial: 1,        // 1-8: con qué mundo empieza la experiencia
                          // TRUCO: abre  index.html?mundo=5  para entrar directo
                          // al mundo 5 mientras lo editas.

  menuDeMundos: true,     // true = el panel de ajustes (Esc) muestra la lista de
                          // mundos y las teclas 1-8 te teletransportan.
                          // Ponlo en false para la versión final.


  /* ────────────────────────────────────────────────────────────────────────
     2 · JUGADOR
     ──────────────────────────────────────────────────────────────────────── */
  jugador: {
    alturaOjos: 1.6,      // metros (altura de la cámara sobre el suelo)
    velocidad: 2.3,       // metros por segundo al caminar
    correr: 1.9,          // multiplicador con Shift
    radio: 0.35,          // "grosor" del cuerpo para chocar con paredes
    balanceo: 0.035,      // cuánto sube y baja la cabeza al caminar (0 = nada)
  },


  /* ────────────────────────────────────────────────────────────────────────
     3 · CALIDAD Y RENDIMIENTO
     ────────────────────────────────────────────────────────────────────────
     resolucion  → densidad de píxeles. 1 = nítido; 0.6 = borroso pero rápido.
                   (nunca supera la de tu pantalla)
     densidad    → multiplica la CANTIDAD de cosas repetidas: pasto, cables,
                   partículas, cuerpos… 0.35 = un tercio.
     distancia   → hasta dónde dibuja la cámara (metros). Menos = más rápido.
     sombras     → sombras reales del sol (lo más caro de todo).
     tamanoSombra→ resolución de la sombra (1024 / 2048).

     'auto' empieza en el nivel "base" y baja la resolución sola si los
     cuadros por segundo (FPS) caen de fpsMinimo.                            */
  calidadInicial: 'auto',   // 'auto' | 'baja' | 'media' | 'alta' | 'ultra'

  calidades: {
    baja:  { nombre: 'Baja',  resolucion: 0.6,  densidad: 0.35, distancia: 150, sombras: false, tamanoSombra: 512 },
    media: { nombre: 'Media', resolucion: 0.85, densidad: 0.65, distancia: 230, sombras: false, tamanoSombra: 1024 },
    alta:  { nombre: 'Alta',  resolucion: 1.25, densidad: 1.0,  distancia: 320, sombras: true,  tamanoSombra: 1024 },
    ultra: { nombre: 'Ultra', resolucion: 2.0,  densidad: 1.4,  distancia: 450, sombras: true,  tamanoSombra: 2048 },
  },

  auto: {
    base: 'media',          // nivel con el que arranca el modo automático
    fpsMinimo: 32,          // si baja de aquí → reduce resolución
    fpsBueno: 55,           // si se mantiene arriba → la vuelve a subir
    resolucionMinima: 0.45,
  },


  /* ────────────────────────────────────────────────────────────────────────
     4 · MÚSICA  ← AQUÍ SE CAMBIA LA MÚSICA DE CADA MUNDO
     ────────────────────────────────────────────────────────────────────────
     Cada mundo tiene su entrada (1 a 8):

       archivo: ''                    → '' = usa el SINTETIZADOR (no necesita archivos)
       archivo: 'audio/mundo1.mp3'    → pon tu archivo en la carpeta /audio y escribe
                                        su nombre aquí. Se repite en bucle y hace un
                                        fundido suave al cambiar de mundo.
       volumen: 0 a 1

     ¡OJO! Para que los archivos de música suenen, abre el proyecto con un
     servidor local (ver README), no con doble clic en index.html.

     Si el archivo no existe o falla, el sintetizador toma su lugar.

     El sintetizador genera un "drone" (zumbido ambiental) con:
       nota       → frecuencia grave en Hz (41 = Mi grave, 55 = La, 65 = Do)
       forma      → 'sine' (suave) | 'triangle' | 'sawtooth' (áspero) | 'square'
       brillo     → qué tan abierto suena (Hz del filtro). 200 = sordo, 1200 = brillante
       ruido      → viento / mar de fondo (0 a 0.5)
       tonoRuido  → grave (300) o agudo (1500) del ruido
       oleaje     → true = el ruido sube y baja como olas
       campanas   → notas sueltas que aparecen al azar (0 a 1)
       latido     → true = un latido grave (corazón)                         */
  volumen: 0.7,

  musica: {
    1: { archivo: '', volumen: 1, sinte: { nota: 41.2, forma: 'sawtooth', brillo: 240, ruido: 0.05, tonoRuido: 400, campanas: 0.25, latido: true } },
    2: { archivo: '', volumen: 1, sinte: { nota: 49.0, forma: 'sawtooth', brillo: 420, ruido: 0.22, tonoRuido: 650, campanas: 0.45 } },
    3: { archivo: '', volumen: 1, sinte: { nota: 55.0, forma: 'square',   brillo: 300, ruido: 0.10, tonoRuido: 1400, campanas: 0.2 } },
    4: { archivo: '', volumen: 1, sinte: { nota: 36.7, forma: 'sawtooth', brillo: 190, ruido: 0.25, tonoRuido: 500, campanas: 0.12 } },
    5: { archivo: '', volumen: 1, sinte: { nota: 55.0, forma: 'triangle', brillo: 900, ruido: 0.06, tonoRuido: 2000, campanas: 0.6 } },
    6: { archivo: '', volumen: 1, sinte: { nota: 65.4, forma: 'sine',     brillo: 700, ruido: 0.35, tonoRuido: 450, oleaje: true, campanas: 0.4 } },
    7: { archivo: '', volumen: 1, sinte: { nota: 61.7, forma: 'triangle', brillo: 520, ruido: 0.18, tonoRuido: 380, oleaje: true, campanas: 0.5 } },
    8: { archivo: '', volumen: 1, sinte: { nota: 43.65, forma: 'sawtooth', brillo: 360, ruido: 0.06, tonoRuido: 900, campanas: 0.55, latido: true } },
  },


  /* ────────────────────────────────────────────────────────────────────────
     5 · MODELOS 3D  ← AQUÍ AGREGAS TUS PROPIOS MODELOS (.glb / .gltf)
     ────────────────────────────────────────────────────────────────────────
     1. Pon el archivo en la carpeta /modelos  (ej: modelos/silla.glb)
     2. Agrégalo a la lista del mundo donde quieras verlo:

          3: [
            { url: 'modelos/silla.glb', pos: [2, 0, -4], rot: [0, 90, 0], esc: 1 },
          ],

        pos → [x, y, z] en metros   (y = altura; z negativo = hacia el fondo)
        rot → [x, y, z] en grados   (y = girarlo hacia los lados)
        esc → tamaño (1 = original, 0.5 = mitad, [1, 2, 1] = estirado en altura)

     Modelos gratuitos: sketchfab.com (filtra "downloadable"), poly.pizza
     Necesitas un servidor local para que carguen (ver README).               */
  modelos: {
    1: [],
    2: [
      // Ejemplo (quita las // para activarlo):
      // { url: 'modelos/estatua.glb', pos: [-6, 0, 8], rot: [0, 45, 0], esc: 1.5 },
    ],
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
    8: [],
  },


  /* ────────────────────────────────────────────────────────────────────────
     6 · TEXTOS: nombres, narración y diálogos
     ──────────────────────────────────────────────────────────────────────── */
  velocidadTexto: 38,     // letras por segundo en los diálogos

  // Lo que aparece al entrar a cada mundo.
  //   nombre / subtitulo → la tarjeta de título
  //   narracion          → frases que aparecen abajo, una tras otra
  textos: {
    mundos: {
      1: { nombre: 'La Incubadora', subtitulo: 'Donde el deseo todavía no tiene cuerpo',
           narracion: ['Despertaste.', 'Aquí todos duermen dentro de su propio líquido.', 'Al fondo hay una luz. Camina hacia ella.'] },
      2: { nombre: 'La Llanura', subtitulo: 'El sol no se pone: se apaga',
           narracion: ['Afuera nunca termina de anochecer.', 'Alguien construyó todo esto y después se fue.', 'Al final del campo, algo te está mirando.'] },
      3: { nombre: 'La Fábrica Fría', subtitulo: 'Aquí se fabricaba el deseo en serie',
           narracion: ['Elegiste la máquina.', 'El sol entra, pero aquí nada se calienta.', 'Las pantallas siguen hablando solas. Sigue hacia el portón.'] },
      4: { nombre: 'La Torre', subtitulo: 'Nadie ha visto dónde termina',
           narracion: ['Levanta la mirada.', 'Fue hecha para que recuerdes tu tamaño.', 'La puerta está abierta. Siempre lo estuvo.'] },
      5: { nombre: 'El Osario', subtitulo: 'Cuerpos que ya no desean',
           narracion: ['Cientos de cuerpos. Ninguno respira.', 'Brillan como si todavía esperaran a alguien.', 'En el centro, el ojo te reconoce.'] },
      6: { nombre: 'La Orilla', subtitulo: 'Un lugar para mirar hacia adentro',
           narracion: ['Elegiste sentir.', 'El mar repite lo mismo una y otra vez, como un pensamiento.', 'Quédate el tiempo que quieras. Las lámparas te muestran el camino.'] },
      7: { nombre: 'Las Ruinas', subtitulo: 'Lo que queda cuando el deseo se va',
           narracion: ['Alguien vivió aquí.', 'Dejó las luces encendidas, por si volvía.', 'Al fondo, una puerta sigue abierta.'] },
      8: { nombre: 'Tecnosexualidad', subtitulo: 'Todo deseo regresa a su origen',
           narracion: ['Este es el centro.', 'Deseo, interfaz, carne, código: todo está conectado.', 'Acércate a la luz.'] },
    },

    // Mensajes de la interfaz
    pistaPortal: 'Atraviesa la luz',
    continuar: 'Clic o Espacio para continuar',
    elegir: 'Elige con un clic o con las teclas 1 y 2',
    cerrar: 'Clic o Espacio para cerrar',
  },

  /* DIÁLOGOS
     Se abren cuando te acercas a un orbe (H.orbe) o a una zona (H.zona) que
     tenga  dialogo: 'nombre'.
       quien    → quién habla (arriba del cuadro)
       lineas   → frases, una por pantalla
       opciones → botones al final. destino = número de mundo al que te lleva
                  (null = solo cierra el diálogo). velo = color del fundido.   */
  dialogos: {
    // Mundo 2 · la entidad al final de la llanura → BIFURCACIÓN
    deseo: {
      quien: 'LA ENTIDAD',
      lineas: [
        'Te vi salir de la incubadora.',
        'Todo lo que existe aquí fue hecho para querer algo.',
        '¿Qué deseas?',
      ],
      opciones: [
        { texto: 'Fundirme con la máquina', destino: 3, velo: '#cfd8e0' },   // camino 1
        { texto: 'Volver a sentir',         destino: 6, velo: '#ff9a7a' },   // camino 2
      ],
    },

    // Mundo 5 · el ojo dentro de la torre
    ultimo: {
      quien: 'EL OJO DE LA TORRE',
      lineas: [
        'Ellos también eligieron la máquina.',
        'Sus cuerpos siguen aquí. Su deseo, no.',
        'La torre no olvida: solo guarda.',
        '¿Quieres ver lo que hay en el centro?',
      ],
      opciones: [
        { texto: 'Sí. Llévame',  destino: 8, velo: '#ff2f7a' },
        { texto: 'Todavía no',   destino: null },
      ],
    },

    // Mundo 8 · la figura de luz → el ciclo vuelve a empezar
    despertar: {
      quien: 'LA FIGURA DE LUZ',
      lineas: [
        'Llegaste al centro.',
        'Aquí el deseo, la carne y el código son la misma sustancia.',
        'Todos los caminos terminan en el mismo lugar: en un nuevo comienzo.',
        '¿Despiertas?',
      ],
      opciones: [
        { texto: 'Despertar',             destino: 1, velo: '#ffffff' },
        { texto: 'Quedarme un poco más',  destino: null },
      ],
    },
  },
};
