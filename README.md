# Mapa Táctico Colombia

Editor de mapas tácticos sobre Colombia para contar operaciones en el tiempo. Permite colocar
unidades con simbología estilo OTAN, puntos y trazos sobre un mapa satelital, organizarlos en
fases, reproducir el escenario con animación y exportarlo o importarlo como JSON.

Es la migración a **Next.js (App Router) + TypeScript estricto** del prototipo
[`referencia/mapa-tactico-colombia.html`](referencia/mapa-tactico-colombia.html), que sigue siendo
la fuente de verdad de la funcionalidad, la simbología y el formato de datos.

## Requisitos

- Node.js **20.9 o superior** (recomendado 22 LTS).
- npm 10 o superior.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre <http://localhost:3000>. La primera vez se carga el escenario de ejemplo
"Ejercicio Cordillera"; a partir de ahí el escenario se autoguarda en `localStorage`.

## Scripts

| Comando              | Qué hace                                      |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Servidor de desarrollo                        |
| `npm run build`      | Compilación de producción                     |
| `npm start`          | Sirve la compilación de producción            |
| `npm run lint`       | ESLint (incluye `no-explicit-any` como error) |
| `npm run typecheck`  | `tsc --noEmit`                                |
| `npm test`           | Pruebas unitarias con Vitest                  |
| `npm run test:watch` | Vitest en modo observación                    |
| `npm run format`     | Formatea con Prettier                         |

Antes de cada commit conviene correr:

```bash
npm run lint && npx tsc --noEmit && npm test
```

## Pruebas

Las pruebas cubren toda la lógica pura de `src/domain/` y `src/lib/`:

- `frameAt`, `visibleAt`, interpolación de posiciones y trazos, fundidos y `easeInOutQuad`.
- Insertar y eliminar fases con el mismo reindexado que el prototipo.
- `parseCoords` en decimal y grados-minutos-segundos (con O u W), y texto libre → `null`.
- Validación Zod del escenario.
- Importación de un JSON **exportado desde el HTML original**
  (`src/lib/__fixtures__/prototipo-export.json`), que se reexporta idéntico.
- Repositorio de `localStorage` y autoguardado con retardo.

## Uso

1. **Ir a coordenadas**: escribe `4.7110, -74.0721`, `4°42′40″N 74°04′20″O`,
   `4 42 40 N 74 4 20 W` o el nombre de un lugar (búsqueda en Nominatim limitada a Colombia), o
   elige una ciudad. "Marcar punto" deja un punto con el nombre del lugar.
2. **Colocar**: elige bando y herramienta y haz clic en el mapa. Con **Shift** colocas varios.
3. **Dibujar trazos**: clic para cada vértice; doble clic o **Enter** para terminar, **Esc** para
   cancelar. Mínimo 2 puntos (3 para una zona).
4. **Fases**: mover un objeto guarda su posición en la fase actual; las siguientes la heredan.
   Desde el inspector puedes fijar en qué fases aparece y guardar la vista de cámara de cada fase.
5. **Reproducir**: ▶ o Espacio. Pausa de 900 ms en cada fase y transición de 1, 2, 4 o 7 s.
6. **Estilo del mapa**: el botón de capas (bajo el zoom) abre un panel para elegir el mapa base
   (satélite, satélite nítido, terreno, relieve, físico, topográfico, National Geographic, calles,
   OpenStreetMap, oscuro o claro) y activar capas superpuestas: sombreado de relieve, carreteras y
   nombres y fronteras. La elección se guarda en el navegador y no forma parte del escenario.
   El grupo **Colombia · IGAC y DANE** añade cartografía oficial (ver más abajo).
7. **Archivo**: "Exportar .json" descarga el escenario; "Abrir…" importa uno (también los
   exportados desde el prototipo HTML).

Atajos: <kbd>←</kbd> <kbd>→</kbd> fase · <kbd>Espacio</kbd> reproducir/pausar ·
<kbd>Supr</kbd> borrar selección · <kbd>V</kbd> seleccionar · <kbd>Esc</kbd> soltar herramienta.
No se activan mientras escribes en un campo (Esc solo quita el foco).

## Cartografía oficial de Colombia (IGAC y DANE)

En «Estilo del mapa» hay capas de servicios abiertos del Instituto Geográfico Agustín Codazzi y del
DANE. El servidor dibuja las líneas **y los nombres**, así que se leen vías, ríos, quebradas,
veredas y centros poblados sin descargar datos:

| Capa                          | Fuente (ArcGIS Server)                                                 | Desde zoom |
| ----------------------------- | ---------------------------------------------------------------------- | ---------- |
| Ortoimagen IGAC (mapa base)   | IGAC `otros/ortocolombia` (2023)                                       | 6          |
| Ríos y cuerpos de agua        | IGAC `Dato_Fundamental_Cuerpos_de_Agua_500k`                           | 7          |
| Municipios y centros poblados | DANE `Serv_CapasNivelReferenciaVeredas_2025` (capas 305, 317, 319)     | 7          |
| Cartografía 1:100.000         | IGAC `carto/carto100000colombia2019` (vías, ríos, quebradas, poblados) | 9          |
| Veredas                       | DANE `Serv_CapasNivelReferenciaVeredas_2025` (capa 1)                  | 11         |
| Curvas de nivel               | IGAC `Curvas_de_nivel_100k`                                            | 12         |

Cómo funcionan:

- Son servicios **dinámicos** (no tienen teselas): la app pide una sola imagen del tamaño de la
  vista al endpoint `MapServer/export` cada vez que el mapa se detiene (`DynamicImageLayer`),
  como hace `dynamicMapLayer` de esri-leaflet. Así los rótulos no salen cortados y se hacen pocas
  peticiones.
- Son **lentos** (de 1 a 30 s; el IGAC a veces más). Un aviso «Cargando capa IGAC/DANE…» aparece
  bajo el botón de capas, y si no hay respuesta en 60 s se indica el fallo. La imagen anterior
  se mantiene hasta que llega la nueva.
- Por debajo de su zoom mínimo no se piden, para no saturar el servidor; el panel lo indica.
- Los colores pálidos del IGAC se realzan y los textos del DANE llevan un halo oscuro (CSS) para
  leerse sobre el satélite.
- Los nombres geográficos puntuales del IGAC (`carto/nombresgeograficos`) existen, pero su
  `export` solo dibuja símbolos sin texto y la consulta es muy lenta; por eso se usan las capas
  anteriores, que ya traen los nombres.
- WMS no está habilitado en estos servidores, por eso se usa la API REST de ArcGIS.

## Arquitectura

```
src/
  app/                 layout (fuentes, CSS) y página
  components/
    Editor.tsx         rejilla del editor (cliente)
    EditorLoader.tsx   carga el editor solo en cliente (next/dynamic, ssr: false)
    Header.tsx         nombre, estado de guardado, Nuevo / Abrir / Exportar
    map/               TacticalMap, UnitMarker, TraceLayer, DraftLayer, MapHint,
                       BaseLayers, DynamicImageLayer (IGAC/DANE), MapStyleControl
    palette/           Palette, GotoCoords
    inspector/         Inspector (fase o objeto seleccionado)
    timeline/          Timeline, Narration
  domain/              lógica pura, sin React ni Leaflet, con pruebas
    types.ts           Scenario, Phase, MapObject (unión discriminada por kind)
    schema.ts          esquemas Zod equivalentes
    catalog.ts         FACTIONS, UNITS, POINTS, LINES, ECHELONS, PLACES
    symbols.ts         SVG de unidades, puntos y vistas previas
    timeline.ts        frameAt, visibleAt, interpolación, insertar/eliminar fase
    coords.ts          parseCoords, formato DMS, límites de Colombia
    scenario.ts        crear, duplicar y modificar objetos
    sample.ts          escenario de ejemplo ficticio
    basemaps.ts        catálogo de mapas base y capas (XYZ y ArcGIS)
    arcgis.ts          URL de export ArcGIS, proyección Web Mercator
  store/editorStore.ts Zustand + persist
  hooks/               usePlayback (requestAnimationFrame), useKeyboardShortcuts
  lib/                 geocode (Nominatim), file (exportar/importar), repository, mapBridge
```

Decisiones relevantes:

- **Formato JSON idéntico al prototipo.** `frames` es un registro indexado por número de fase y
  la clave de `localStorage` es la misma (`mapa-tactico-co-v1`).
- **Validación tolerante con Zod.** Rellena campos que falten (p. ej. `speed` → 2) y cambia
  tipos o bandos desconocidos por uno válido; rechaza lo que no es un escenario.
- **Persistencia desacoplada.** El middleware `persist` de Zustand escribe a través de un
  `ScenarioRepository`. Hoy existe `LocalScenarioRepository`; para usar una API basta con otra
  implementación (sus métodos ya admiten promesas) y pasarla en `editorStore.ts`.
- **Animación sin re-render.** La reproducción escribe `time` y `progress` en el store; las capas
  de Leaflet y la barra de progreso se suscriben fuera de React y se actualizan con
  `setLatLng`, `setLatLngs`, `setOpacity` y `setStyle`. React solo re-renderiza al cambiar de fase.
- **Solo cliente.** Leaflet necesita `window` y el estado viene de `localStorage`, así que el
  editor y el mapa se cargan con `next/dynamic` y `ssr: false`.

## Despliegue en Vercel

1. Sube el repositorio a GitHub, GitLab o Bitbucket.
2. En <https://vercel.com/new>, importa el repositorio. Vercel detecta Next.js automáticamente;
   no hace falta configurar variables de entorno.
3. Pulsa **Deploy**. Cada push a la rama principal publica una nueva versión y cada pull request
   genera una vista previa.

Desde la terminal también puedes usar la CLI:

```bash
npm i -g vercel
vercel        # vista previa
vercel --prod # producción
```

La aplicación es estática y no tiene backend: cada navegador guarda su propio escenario.
Los mosaicos del mapa vienen de Esri, OpenTopoMap, OpenStreetMap y CARTO; la cartografía oficial,
del IGAC y el DANE; y la búsqueda de lugares, de Nominatim (OpenStreetMap). Respeta sus
condiciones de uso si el tráfico crece.
