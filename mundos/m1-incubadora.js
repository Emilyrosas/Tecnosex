/* ==========================================================================
   MUNDO 1 · LA INCUBADORA
   --------------------------------------------------------------------------
   Un pasillo oscuro, de techo bajo, con cápsulas en filas. Dentro de cada una
   flota un cuerpo encogido en líquido rosa. Cables negros cuelgan del techo y
   se arrastran por el piso. Al fondo, una puerta de luz blanca → Mundo 2.

   Referencias: cuerpos en fluido rosa, anillo de cables, piso tecnológico.

   CÓMO ESTÁ ORGANIZADO (igual en todos los mundos):
     · A = { ... }        → AJUSTES rápidos (tamaños, colores, cantidades)
     · registrarMundo({   → la "ficha" del mundo:
         cielo, niebla, exposicion, reflejos  → el ambiente (ver c.js §2)
         inicio   → dónde apareces y hacia dónde miras (grados)
         limites  → hasta dónde puedes caminar
         construir(H) → aquí se arma todo, paso a paso
       })
   ========================================================================== */
(function () {
  const THREE = AFRAME.THREE;

  // ── AJUSTES: cambia estos valores y recarga ──────────────────────────────
  const A = {
    largo: 30, ancho: 14, altoTecho: 4.2,      // tamaño de la sala (metros)
    filas: 8,                                  // cápsulas por columna
    separacion: 3.1,                           // distancia entre cápsulas
    columnas: [-5.2, -3.0, 3.0, 5.2],          // posición X de cada columna
    colorLiquido: '#ff2f7a',
    colorCuerpo: '#ffc9cf',
    colorVidrio: '#9ff2e4',
    colorLuz: '#ff2a74',
    intensidadLuz: 4,                          // fuerza de las 3 luces rosas del pasillo
    cables: 46,                                // cables colgando (se ajusta con la calidad)
    burbujas: 260,
  };

  TECNO.registrarMundo({
    id: 1,
    cielo: { arriba: '#000000', horizonte: '#03100d', abajo: '#000000' },
    niebla: { color: '#020807', densidad: 0.075 },
    exposicion: 1.25,
    reflejos: 0.35,
    inicio: { pos: [0, 0, 12.5], mirar: 0 },
    limites: { minX: -6.5, maxX: 6.5, minZ: -15.5, maxZ: 13.6 },

    construir(H) {
      const W = A.ancho, L = A.largo, T = A.altoTecho;
      const zc = -1;                           // centro de la sala en Z (va de −16 a +14)

      // 1 · LUCES ─────────────────────────────────────────────────────────
      H.seccion('1 · Luces');
      H.luzAmbiente('#123b35', 0.8);
      H.luzHemisferio('#2a7a6c', '#12040a', 0.9);
      const luces = [8, 0, -8].map(z => H.luzPunto(A.colorLuz, A.intensidadLuz, 9, [0, 3.4, z]));
      H.luzPunto('#bff8ee', 8, 10, [0, 2.6, -13]);   // luz fría junto a la salida

      // 2 · LA SALA: piso, techo y paredes ────────────────────────────────
      H.seccion('2 · La sala');
      H.plano({ ancho: W, alto: L, rot: [-90, 0, 0], pos: [0, 0, zc], textura: 'panel', repetir: [W / 3.5, L / 3.5], color: '#7d8b87', rugosidad: 0.5, metal: 0.4 });
      H.plano({ ancho: W, alto: L, rot: [90, 0, 0], pos: [0, T, zc], textura: 'panel', repetir: [W / 4, L / 4], color: '#2a302f' });
      const pared = H.mat({ textura: 'panel', repetir: [L / 4, T / 4], color: '#3c4644', rugosidad: 0.7, metal: 0.3 });
      H.plano({ ancho: L, alto: T, pos: [-W / 2, T / 2, zc], rot: [0, 90, 0], mat: pared });
      H.plano({ ancho: L, alto: T, pos: [W / 2, T / 2, zc], rot: [0, -90, 0], mat: pared });
      const testera = H.mat({ textura: 'panel', repetir: [W / 4, T / 4], color: '#3c4644', rugosidad: 0.7, metal: 0.3 });
      H.plano({ ancho: W, alto: T, pos: [0, T / 2, zc - L / 2], mat: testera });
      H.plano({ ancho: W, alto: T, pos: [0, T / 2, zc + L / 2], rot: [0, 180, 0], mat: testera });

      // vigas, tuberías y conductos → todo FUSIONADO en una sola malla
      const techo = [];
      for (let z = 13; z > -16; z -= 3) techo.push(H.geo.caja({ ancho: W, alto: 0.28, fondo: 0.3, pos: [0, T - 0.14, z] }));
      for (const x of [-4.1, -1.3, 1.3, 4.1]) techo.push(H.geo.cilindro({ radio: 0.13, alto: L, lados: 10, pos: [x, T - 0.45, zc], rot: [90, 0, 0] }));
      for (let z = 12; z > -15; z -= 4.5) for (const x of [-W / 2 + 0.25, W / 2 - 0.25]) techo.push(H.geo.cilindro({ radio: 0.09, alto: T, lados: 8, pos: [x, T / 2, z] }));
      H.malla(H.fusionar(techo, { nombre: 'techo' }), H.mat({ color: '#1b2221', metal: 0.7, rugosidad: 0.45 }));

      // 3 · CÁPSULAS (INSTANCIAS: todas las copias en una sola llamada) ───
      H.seccion('3 · Cápsulas');
      const lugares = [];
      for (const x of A.columnas) for (let i = 0; i < A.filas; i++) lugares.push([x, 10.5 - i * A.separacion]);
      const enCadaCapsula = (extra = {}) => lugares.map(([x, z]) => ({ pos: [x, 0, z], ...extra }));

      // metal: base + tapa + tubo hacia el techo (fusionados en UNA forma)
      const metal = H.fusionar([
        H.geo.cilindro({ radio: 0.82, alto: 0.4, lados: 20, pos: [0, 0.2, 0] }),
        H.geo.cilindro({ radioArriba: 0.45, radioAbajo: 0.78, alto: 0.45, lados: 20, pos: [0, 3.05, 0] }),
        H.geo.cilindro({ radio: 0.09, alto: T - 3.2, lados: 6, pos: [0, (3.2 + T) / 2, 0] }),
      ], { unir: true, nombre: 'capsula metal' });
      // Cada cápsula es UNA pieza (el metal) y adentro lleva sus partes:
      // aros, líquido, vidrio, cuerpo y halo. En el inspector, si mueves la
      // cápsula, todo lo de adentro se mueve con ella.
      const capsulas = H.instancias(metal, H.mat({ color: '#20292a', metal: 0.8, rugosidad: 0.35 }), enCadaCapsula(), { nombre: 'capsulas', pieza: 'capsula' });
      const adentro = () => lugares.map(() => ({}));            // misma posición que su cápsula
      // aros de luz rosa
      const aros = H.fusionar([
        H.geo.toro({ radio: 0.8, grosor: 0.025, rot: [90, 0, 0], pos: [0, 0.42, 0] }),
        H.geo.toro({ radio: 0.78, grosor: 0.025, rot: [90, 0, 0], pos: [0, 2.82, 0] }),
      ], { unir: true, nombre: 'aros de luz' });
      H.instancias(aros, H.mat({ basico: true, color: A.colorLuz }), adentro(), { dentroDe: capsulas, pieza: 'aros' });
      // líquido y vidrio
      const liquido = H.instancias(
        H.geo.cilindro({ radio: 0.66, alto: 2.4, lados: 20, pos: [0, 1.6, 0] }),
        H.mat({ color: A.colorLiquido, emisivo: A.colorLiquido, brillo: 0.8, transparente: true, opacidad: 0.5, rugosidad: 0.2 }),
        adentro(), { dentroDe: capsulas, pieza: 'liquido' });
      H.instancias(
        H.geo.cilindro({ radio: 0.72, alto: 2.45, lados: 24, abierto: true, pos: [0, 1.62, 0] }),
        H.mat({ color: A.colorVidrio, transparente: true, opacidad: 0.16, rugosidad: 0.05, metal: 0.1, reflejo: 2, doble: true }),
        adentro(), { dentroDe: capsulas, pieza: 'vidrio' });

      // cuerpos en posición fetal, cada uno girado distinto (posición relativa a su cápsula)
      const cuerpos = lugares.map(() => ({ rot: [H.azar(-25, 25), H.azar(0, 360), H.azar(-20, 20)], fase: H.azar(0, 6.28) }));
      const mCuerpos = H.instancias(
        H.cuerpo('feto'),
        H.mat({ color: A.colorCuerpo, emisivo: '#ff5c8a', brillo: 0.3, rugosidad: 0.55 }),
        cuerpos.map(c => ({ pos: [0, 1.2, 0], rot: c.rot, esc: 0.8 })),
        { dentroDe: capsulas, pieza: 'cuerpo' });

      // cada cápsula es sólida (no la atraviesas) y tiene un halo arriba
      lugares.forEach(([x, z], i) => {
        H.solidoDe(capsulas.userData.piezas[i]);
        H.brillo({ padre: capsulas.userData.piezas[i], pos: [0, 3.25, 0], color: A.colorLuz, tamano: 1.6, opacidad: 0.35 });
      });

      // 4 · CABLES ────────────────────────────────────────────────────────
      H.seccion('4 · Cables');
      const cables = [];
      for (let i = 0; i < H.cantidad(A.cables); i++) {
        const x = H.azar(-W / 2 + 0.5, W / 2 - 0.5), z = H.azar(-15, 13);
        const enPasillo = Math.abs(x) < 2;
        cables.push(H.geo.cable({
          desde: [x, T - 0.3, z], hasta: [x + H.azar(-2.5, 2.5), T - 0.3, z + H.azar(-3, 3)],
          caida: enPasillo ? H.azar(0.3, 0.9) : H.azar(0.6, 2.4), radio: H.azar(0.015, 0.04),
        }));
      }
      // cables que salen de cada cápsula y se arrastran por el piso
      lugares.forEach(([x, z]) => {
        for (const lado of [-1, 1]) {
          cables.push(H.geo.tubo({
            puntos: [[x + lado * 0.5, 2.9, z], [x + lado * 0.95, 2.0, z + H.azar(-0.3, 0.3)], [x + lado * 1.05, 0.3, z + H.azar(-0.5, 0.5)], [x + lado * 1.5, 0.03, z + H.azar(-1, 1)]],
            radio: 0.03,
          }));
        }
      });
      H.malla(H.fusionar(cables, { nombre: 'cables' }), H.mat({ color: '#060808', metal: 0.6, rugosidad: 0.35 }));

      // unos pocos cables que BRILLAN sobre el pasillo
      const vivos = [];
      for (let i = 0; i < H.cantidad(12); i++) {
        const x = H.azar(-1.4, 1.4), z = H.azar(-14, 12);
        vivos.push(H.geo.cable({ desde: [x, T - 0.35, z], hasta: [x + H.azar(-1, 1), T - 0.35, z + H.azar(-2.5, 2.5)], caida: H.azar(0.4, 1.2), radio: 0.008 }));
      }
      H.malla(H.fusionar(vivos, { nombre: 'cables que brillan' }), H.mat({ aditivo: true, color: '#aefcf0', opacidad: 0.8 }));

      // 5 · TIRAS DE LUZ en el piso que guían hacia la salida ────────────
      H.seccion('5 · Tiras de luz en el piso que guían hacia la salida');
      for (const x of [-1.8, 1.8]) H.caja({ ancho: 0.05, alto: 0.02, fondo: L - 1, pos: [x, 0.01, zc], basico: true, color: '#ff1f5e' });

      // 6 · PARTÍCULAS: burbujas en las cápsulas + polvo en el aire ──────
      H.seccion('6 · Partículas');
      H.particulas({ cantidad: A.burbujas, centros: lugares.map(([x, z]) => [x, 1.6, z]), area: [0.9, 2.3, 0.9], color: '#ffd1e3', tamano: 0.05, velocidad: [0, 0.35, 0], vaiven: 0.05, opacidad: 0.8 });
      H.particulas({ cantidad: 160, centro: [0, 2, zc], area: [W, T, L], color: '#7fd9c8', tamano: 0.03, velocidad: [0, 0.02, 0], opacidad: 0.5 });

      // 7 · LA SALIDA → MUNDO 2 ───────────────────────────────────────────
      H.seccion('7 · La salida → mundo 2');
      H.caja({ ancho: 3.4, alto: 3.8, fondo: 0.3, pos: [0, 1.9, zc - L / 2 + 0.1], color: '#050707' });   // hueco oscuro
      H.portal({ destino: 2, pos: [0, 0, zc - L / 2 + 0.3], etiqueta: 'Afuera', color: '#e9fffb', velo: '#ffffff', ancho: 2.4, alto: 3.3 });

      // 8 · ANIMACIÓN (se ejecuta en cada cuadro) ─────────────────────────
      H.seccion('8 · Animación');
      let falla = 0;
      H.animar((t, dt) => {
        liquido.material.emissiveIntensity = 0.65 + Math.sin(t * 1.1) * 0.25;     // el líquido "respira"
        falla -= dt;                                                               // una luz que falla
        if (falla < 0 && Math.random() < 0.01) falla = H.azar(0.05, 0.4);
        luces[1].intensity = falla > 0 ? (Math.random() < 0.5 ? 0.3 : 2) : A.intensidadLuz;
        cuerpos.forEach((c, i) => H.moverInstancia(mCuerpos, i, {                 // los cuerpos flotan y giran
          pos: [0, 1.2 + Math.sin(t * 0.6 + c.fase) * 0.07, 0],
          rot: [c.rot[0], c.rot[1] + t * 3, c.rot[2]], esc: 0.8,
        }));
      });
    },
  });
})();
