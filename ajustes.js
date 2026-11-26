/* ==========================================================================
   AJUSTES.JS · LO QUE MOVISTE CON EL INSPECTOR
   ==========================================================================

   Aquí se guardan los cambios que haces a mano en el inspector de A-Frame.

   CÓMO SE USA
     1. Abre el inspector: Ctrl + Alt + I  (o Esc → "Abrir inspector").
     2. En el árbol de la izquierda, cada mundo está dividido en secciones
        y cada objeto es su propia pieza, con un id como:
            m3-11-linea-de-produccion-cuerpo-4
        Selecciónala y muévela, gírala, escálala o bórrala (tecla Supr).
     3. Cierra el inspector (Ctrl + Alt + I), abre Ajustes (Esc) y pulsa
        "Copiar cambios de este mundo".
     4. Pega aquí abajo lo copiado y guarda el archivo. Recarga (F5).

   Cada bloque se ve así:
       AJUSTES[3] = {
         'm3-7-la-maquina-central-conjunto-1': { pos: [2, 0, -14] },
         'm3-12-pasarela-sobre-los-servidores-pasarela-1': { oculto: true },
       };
     pos = [x, y, z] metros · rot = [x, y, z] grados · esc = [x, y, z] · oculto = borrada

   Si pegas dos veces el mismo mundo, vale el último bloque (el botón siempre
   copia TODOS los cambios de ese mundo, así que puedes reemplazar el anterior).

   OJO: el id depende del orden en que el código crea las piezas. Si después
   agregas o quitas piezas en una sección del código, revisa los ajustes de
   esa sección (la consola avisa si alguno ya no encuentra su pieza).
   ========================================================================== */

window.AJUSTES = {};
const AJUSTES = window.AJUSTES;

// ↓↓↓ Pega tus cambios debajo de esta línea ↓↓↓

