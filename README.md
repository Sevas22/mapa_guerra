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
6. **Archivo**: "Exportar .json" descarga el escenario; "Abrir…" importa uno (también los
   exportados desde el prototipo HTML).

Atajos: <kbd>←</kbd> <kbd>→</kbd> fase · <kbd>Espacio</kbd> reproducir/pausar ·
<kbd>Supr</kbd> borrar selección · <kbd>V</kbd> seleccionar · <kbd>Esc</kbd> soltar herramienta.
No se activan mientras escribes en un campo (Esc solo quita el foco).

## Arquitectura

```
src/
  app/                 layout (fuentes, CSS) y página
  components/
    Editor.tsx         rejilla del editor (cliente)
    EditorLoader.tsx   carga el editor solo en cliente (next/dynamic, ssr: false)
    Header.tsx         nombre, estado de guardado, Nuevo / Abrir / Exportar
    map/               TacticalMap, UnitMarker, TraceLayer, DraftLayer, MapHint
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
Los mosaicos del mapa vienen de Esri, OpenTopoMap y CARTO, y la búsqueda de lugares de
Nominatim (OpenStreetMap); respeta sus condiciones de uso si el tráfico crece.
