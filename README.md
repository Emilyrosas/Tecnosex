# Tecnosexualidad · ocho mundos

Experiencia 3D navegable hecha con **A-Frame** (que usa Three.js por dentro).
Ocho mundos compactos, oníricos y distópicos, conectados por portales de luz y por
una bifurcación: al final de la llanura, una entidad te pregunta **“¿Qué deseas?”**.

---

## 1. Cómo abrirlo

A-Frame se descarga de internet, así que necesitas conexión.

**Opción rápida:** doble clic en `index.html`. Funciona, pero **sin música de archivos
ni modelos .glb** (el navegador los bloquea cuando la página se abre como archivo).

**Opción recomendada (servidor local):** abre una terminal en la carpeta del proyecto y ejecuta:

```bash
python -m http.server 8765
```

Luego abre <http://localhost:8765> en el navegador.

**Truco para editar:** `http://localhost:8765/?mundo=5` te deja entrar directo al mundo 5.

### Controles

| Acción | Tecla |
|---|---|
| Caminar | W A S D o flechas (en celular: joystick abajo a la izquierda) |
| Mirar | arrastrar el mouse (o el dedo) |
| Correr | Shift |
| Ajustes (calidad, volumen, lista de mundos) | Esc o el botón ⚙ |
| Avanzar diálogo / elegir | Espacio, clic / teclas 1 y 2 |
| Silencio · ocultar interfaz · cambiar calidad · ver FPS | M · H · Q · F |
| Saltar a un mundo (mientras editas) | 1 a 8 |

---

## 2. El mapa de la historia

```
 1 La Incubadora ─▶ 2 La Llanura ─▶ la entidad: "¿Qué deseas?"
                                        │
              ┌─────────────────────────┴─────────────────────────┐
     "Fundirme con la máquina"                            "Volver a sentir"
              │                                                    │
     3 La Fábrica Fría                                     6 La Orilla
              │                                                    │
     4 La Torre (afuera)                                   7 Las Ruinas
              │                                                    │
     5 El Osario (adentro de la torre)                             │
              └──────────────────▶ 8 Tecnosexualidad ◀─────────────┘
                                        │
                                  "Despertar" ─▶ vuelve al 1 (el ciclo reinicia)
```

| # | Mundo | Qué hay | Referencias que fusiona |
|---|---|---|---|
| 1 | La Incubadora | pasillo oscuro, 32 cápsulas con cuerpos encogidos en líquido rosa, cables | cuerpos en fluido rosa, anillo de cables, piso tecnológico |
| 2 | La Llanura | pasto, colinas, atardecer rojo, brutalismo, fábricas lejanas, computadora vieja entre lápidas, **la entidad** | concreto escalonado, la computadora en el campo |
| 3 | La Fábrica Fría | nave industrial fría, sol entrando por ventanales, servidores, CRT, cables, tuberías | — |
| 4 | La Torre | torre biomecánica que atraviesa las nubes, ceniza, ciudad de bloques | la figura biomecánica, el piso de bloques |
| 5 | El Osario | cientos de cuerpos de cromo (plata y rosa), candelabro de cables, **el ojo** | el cromo rosa, los anillos de luz |
| 6 | La Orilla | mar que se mueve, sol reflejado, silla frente al mar, lámparas en la arena | las lámparas en el pasto |
| 7 | Las Ruinas | edificio roto junto al mar, cama, cortina al viento, lámparas encendidas | concreto, lámparas |
| 8 | Tecnosexualidad | vacío rosa, células con palabras unidas por membranas, figura de luz | el mapa de palabras, la silueta luminosa, los cuerpos translúcidos |

**¿Por qué 8 y no 7?** El camino común (1, 2) + el camino 1 (3, 4, 5) + el camino 2 (6, 7)
suman 7. El octavo es el **punto donde los dos caminos se juntan** y desde donde la historia
vuelve a empezar. Si prefieres que cada camino tenga su propio final, cambia el `destino` del
portal del mundo 7 o del diálogo `ultimo` (ver sección 4).

---

## 3. Los archivos

```
index.html          → la página: carga todo, la interfaz (HUD) y la escena 3D
style.css           → el aspecto de la interfaz (colores en :root)
config.js           → TUS AJUSTES: música, modelos, calidad, textos, diálogos  ← lo que más vas a tocar
c.js                → el núcleo: herramientas de construcción, jugador, portales, orbes, sonido
mundos/
  m1-incubadora.js  → un archivo por mundo                                       ← lo segundo que más vas a tocar
  m2-llanura.js
  m3-fabrica.js
  m4-torre.js
  m5-osario.js
  m6-orilla.js
  m7-ruinas.js
  m8-centro.js
audio/              → tu música (.mp3, .ogg)
modelos/            → tus modelos 3D (.glb)
```

---

## 4. Recetas: dónde cambiar cada cosa

### Cambiar la música
`config.js` → sección **4 · MÚSICA**. Pon el archivo en `audio/` y escribe su ruta:

```js
3: { archivo: 'audio/fabrica.mp3', volumen: 0.8, sinte: { ... } },
```

Con `archivo: ''` el mundo usa el **sintetizador** (zumbido + viento/mar + campanas + latido),
que no necesita archivos. Sus perillas (`nota`, `brillo`, `ruido`, `oleaje`, `campanas`, `latido`)
están explicadas en el mismo archivo. Si un archivo falla, el sintetizador entra solo.

### Agregar un modelo 3D (.glb)
`config.js` → sección **5 · MODELOS 3D**. Pon el archivo en `modelos/` y agrégalo al mundo:

```js
2: [
  { url: 'modelos/estatua.glb', pos: [-6, 0, 8], rot: [0, 45, 0], esc: 1.5 },
],
```

O desde el código de un mundo, dentro de `construir(H)`:

```js
H.modelo({ url: 'modelos/silla.glb', pos: [0, 0, -3], rot: [0, 180, 0], esc: 1 });
```

### Cambiar textos, narración y diálogos
`config.js` → sección **6 · TEXTOS**. Cada mundo tiene `nombre`, `subtitulo` y `narracion`.
Los diálogos (`deseo`, `ultimo`, `despertar`) tienen `quien`, `lineas` y `opciones`;
cada opción tiene `destino` (número de mundo, o `null` para solo cerrar) y `velo` (color del fundido).

### Cambiar a dónde lleva un portal
En el archivo del mundo, busca `H.portal({ destino: ... })`.

### Cambiar el ambiente de un mundo (colores, niebla, sol)
Al principio de cada archivo de `mundos/`, en `registrarMundo({ ... })`:

```js
cielo: { arriba: '#21142a', horizonte: '#e0663f', abajo: '#3a1c1b',
         sol: { color: '#ff9a5c', alto: 7, giro: 0, tamano: 1.2 } },
niebla: { color: '#b4563d', densidad: 0.014 },   // más densidad = más opresivo
exposicion: 1.15,                                  // brillo general
reflejos: 0.6,                                     // cuánto refleja el cielo en metal/agua
```

`alto` = grados sobre el horizonte; `giro` = hacia dónde (0 = al fondo, 90 = izquierda, −90 = derecha).

### Ajustes rápidos de cada mundo
Cada archivo empieza con un objeto `A = { ... }`: tamaños, cantidades y colores.
Ejemplos: `A.filas` (cápsulas del mundo 1), `A.pasto` (mundo 2), `A.alturaTorre` (mundo 4),
`A.proporcionRosa` (mundo 5), `A.palabras` (mundo 8).

### Calidad y rendimiento
`config.js` → sección **3 · CALIDAD**. Cada nivel define `resolucion`, `densidad`
(cuántas cosas repetidas), `distancia` (hasta dónde se dibuja) y `sombras`.
El modo **Auto** baja la resolución sola si los FPS caen. Con **F** ves los FPS y
cuántas "llamadas de dibujo" hace cada mundo.

---

## 5. Explicación completa del código

### 5.1 `index.html`

1. Carga, en orden: A-Frame → `config.js` → `c.js` → los 8 mundos. El orden importa porque
   cada archivo usa lo que definió el anterior.
2. Tiene la **interfaz** en HTML normal: título del mundo, subtítulos, pistas, cuadro de
   diálogo, panel de ajustes, joystick táctil, pantalla de inicio y el "velo" (fundido).
3. Tiene la **escena** `<a-scene>` con una sola cosa adentro: el jugador.
   - `<a-entity id="jugador" jugador>` es el cuerpo que camina por el suelo.
   - Adentro va la cámara a 1.6 m (los ojos) con `look-controls` (mirar con el mouse).
   - **Los mundos no están en el HTML:** `c.js` los crea uno a la vez.

La pantalla de inicio existe también por una razón técnica: los navegadores no dejan
sonar audio hasta que el usuario hace clic. El botón "Entrar" enciende el sonido.

### 5.2 `config.js`

Un solo objeto, `window.CONFIG`, con todos los ajustes. No tiene lógica: solo datos.
`c.js` y los mundos lo leen. Así puedes cambiar música, textos o calidad sin tocar código.

### 5.3 `c.js` — el núcleo

Está dividido en 9 secciones (busca `§1`, `§2`… con Ctrl+F):

**§1 · Herramientas (`H`).** Funciones cortas para construir con Three.js sin escribir
mucho código. Todas reciben un objeto de opciones:

```js
H.caja({ ancho: 2, alto: 3, fondo: 1, pos: [0, 1.5, -4], color: '#888', solido: true });
```

- *Azar con semilla* (`H.azar`): cada mundo usa siempre los mismos números “aleatorios”,
  así se ve igual cada vez que entras.
- *Texturas dibujadas con código* (`H.tex('concreto')`): concreto con tablas, piso
  tecnológico, metal cepillado, arena, pasto, LEDs, nubes… todo con canvas, sin archivos.
  Para usar una imagen tuya: `H.imagen('texturas/x.jpg')`.
- *Materiales* (`H.mat`): traduce opciones en español (`rugosidad`, `metal`, `emisivo`,
  `aditivo`…) a materiales de Three.js.
- *Geometrías* (`H.geo.caja`, `H.geo.cable`, `H.geo.tubo`…): formas ya colocadas, listas
  para **fusionar**.
- **`H.fusionar([...])`**: junta muchas formas en UNA malla. La GPU dibuja una sola vez
  en lugar de cientos. Se usa para muros, vigas, cables, lápidas…
- **`H.instancias(forma, material, lista)`**: cientos de copias de la misma forma en una
  sola llamada (cápsulas, cuerpos, pasto, servidores). Es la razón por la que el osario
  puede tener cientos de cuerpos.
- `H.brillo` (halos que miran a la cámara), `H.particulas` (polvo, burbujas, ceniza),
  `H.texto` (palabras flotantes), luces (`H.luzSol`, `H.luzPunto`…).
- Piezas compuestas que se repiten entre mundos: `H.cuerpo(pose)` arma un cuerpo con
  cápsulas a partir de ángulos (de pie, feto, caído, sentado); `H.candelabro` (anillos con
  cables colgando); `H.lampara`; `H.muro` (muro con huecos y bordes rotos); `H.pasto`
  (hojas que se mecen con un pequeño truco de shader).
- `H.animar(fn)`: registra una función que se ejecuta en cada cuadro mientras el mundo
  está activo. `H.solido(...)`: cajas invisibles con las que chocas.

**§2 · Cielo y ambiente.** Dibuja el degradado del cielo en un canvas, lo pone en una
esfera gigante que te sigue, agrega el sol (dos halos), ajusta la niebla y la exposición,
y convierte ese mismo cielo en el **mapa de reflejos** (por eso el mar refleja el
atardecer y los cuerpos de cromo brillan).

**§3 · Mundos.** `TECNO.cargarMundo(id)`:
1. Destruye el mundo anterior y **libera su memoria** (geometrías, materiales, texturas).
2. Crea una `<a-entity id="mundo-N">` vacía.
3. Aplica el ambiente, llama a `construir(H)` del mundo y agrega los modelos de `config.js`.
4. Si hay sombras, marca qué objetos las proyectan.
5. Coloca al jugador en `inicio`.

`TECNO.irA(id)` hace lo mismo con un fundido de color, efecto de sonido, tarjeta de
título, música y narración.

**§4 · Jugador.** El componente `jugador` lee el teclado/joystick en cada cuadro, calcula
hacia dónde mira la cámara, acelera suave, respeta los `limites` del mundo, te empuja
fuera de los sólidos y te pega al suelo usando `alturaSuelo(x, z)` (por eso subes las
colinas de la llanura). También mueve un poco la cabeza al caminar.

**§5 · Componentes interactivos** (A-Frame):
- `orbe-vigia`: el ojo. Calcula hacia dónde debería mirar (`lookAt`) y gira suavemente
  hacia ti (`slerp`); la pupila se cierra cuando te acercas. A cierta distancia abre su
  diálogo.
- `zona-dialogo`: lo mismo, pero invisible (la usa la figura de luz del mundo 8).
- `portal`: puerta de luz con marco, halo, partículas y etiqueta. Al cruzarla, viaja.

**§6 · Diálogos e interfaz.** El cuadro de diálogo escribe letra por letra, avanza con
clic/Espacio y muestra las opciones al final. También están la narración (subtítulos),
las pistas, los avisos, el panel de ajustes, el teclado y el joystick táctil.

**§7 · Sonido.** Con Web Audio API. Si el mundo tiene archivo, lo reproduce en bucle con
fundido cruzado. Si no, el **sintetizador** crea: cuatro osciladores (nota, quinta, octava,
octava grave) → un filtro que "respira" → ruido filtrado (viento, o mar si `oleaje`) →
campanas al azar con eco → latido opcional.

**§8 · Calidad.** `TECNO.aplicarCalidad` cambia la resolución al instante y, si cambia la
densidad o las sombras, reconstruye el mundo sin moverte. Cada 2 segundos mide los FPS; en
modo Auto baja o sube la resolución.

**§9 · Arranque.** Un *sistema* de A-Frame que, cuando la escena está lista, configura
el renderizador (tono cinematográfico, sombras suaves, niebla), prepara la interfaz, aplica
la calidad guardada y carga el primer mundo. En cada cuadro ejecuta las animaciones del
mundo activo (si una falla, la desactiva y avisa en la consola en vez de congelar todo).

### 5.4 Un archivo de mundo, paso a paso

Todos siguen el mismo esquema:

```js
(function () {
  const A = { /* ajustes rápidos */ };

  TECNO.registrarMundo({
    id: 3,                                   // su número
    cielo: {...}, niebla: {...},             // ambiente
    exposicion: 1, reflejos: 0.5,
    inicio: { pos: [0, 0, 9], mirar: 0 },    // dónde apareces
    limites: { minX: -9, maxX: 9, minZ: -22, maxZ: 10 },
    alturaSuelo(x, z) { return 0; },          // opcional: terreno con relieve

    construir(H) {
      // 1 luces · 2 suelo y muros · 3 objetos · 4 interactivos · 5 animación
    },
  });
})();
```

El `(function () { ... })();` sirve para que las variables de un mundo (como `A`) no
choquen con las de otro.

---

## 6. Crear un mundo nuevo

1. Copia `mundos/m7-ruinas.js` como `mundos/m9-loquesea.js` y cambia `id: 9`.
2. En `index.html`, agrega `<script src="mundos/m9-loquesea.js"></script>` después de los demás.
3. En `config.js`, agrega `9:` en `musica`, `modelos` y `textos.mundos`.
4. Conéctalo: pon un `H.portal({ destino: 9, ... })` en otro mundo, o un `destino: 9` en
   una opción de diálogo.
5. Ábrelo directo con `?mundo=9` mientras lo construyes.

---

## 7. Si algo falla

- **Pantalla negra o un mundo vacío:** abre la consola (F12). Los errores de un mundo
  aparecen como `Error construyendo el mundo N`. Casi siempre es una coma o una llave.
- **No suena la música de archivo:** ¿abriste con el servidor local? ¿la ruta en
  `config.js` coincide exactamente con el nombre del archivo (mayúsculas incluidas)?
- **Va lento:** baja la calidad (Esc → Baja), o baja los números de `A` del mundo
  (pasto, cuerpos, cables). Las sombras (Alta/Ultra) son lo más caro.
- **Los colores se ven raros después de cambiar algo:** prueba con `exposicion` y
  `densidad` de la niebla; son los dos valores que más cambian el ambiente.
