# Guía del Mapa Táctico Colombia

Así funciona el editor en su versión actual. En desarrollo se abre en <http://localhost:3000>
(si ese puerto está ocupado, `next dev` usa el siguiente libre, por ejemplo el 3001).

El editor funciona por completo en el navegador: no hay cuentas, servidor ni trabajo en equipo
en vivo. Para compartir un escenario se exporta y se importa (ver el apartado 7).

## 1. Barra superior

- **Taller 3D** y **Perfiles y vínculos** abren esas herramientas a pantalla completa; **Volver
  al mapa** regresa.
- Nombre del escenario y estado del guardado («Guardado HH:MM»). El escenario se guarda solo en
  el navegador. Si aparece «Sin autoguardado», el navegador no pudo guardar (por ejemplo, porque
  no tiene espacio): exporta el escenario cuanto antes.
- **↶ Deshacer** y **↷ Rehacer** (`Ctrl+Z` y `Ctrl+Y`). Deshacen cualquier cambio del escenario:
  colocar, mover, editar, duplicar o borrar objetos, y añadir, editar o eliminar fases. Al
  deshacer, el editor vuelve a la fase en que se hizo el cambio. Escribir seguido en un campo
  cuenta como un solo paso. Se guardan hasta 100 pasos, solo mientras la página está abierta: al
  recargar, o al usar Nuevo, Ejemplos o Abrir, el historial empieza de cero.
- **Ejemplos** abre uno de estos escenarios ficticios de entrenamiento:
  - **Ejercicio Cordillera**, el ejemplo básico.
  - **Ejercicio Halcón**, una inserción aérea completa con varias unidades.
  - **Ejercicio Colibrí**, un asalto aéreo en 10 fases pensado para verse reproducido, mejor en
    3D: un helicóptero lleva un pelotón del punto A al punto B, lo desembarca, se retira a un
    punto de espera mientras el pelotón asalta el objetivo, lo recoge en la zona de extracción y
    vuelve al punto A. El pelotón aparece al desembarcar y se desvanece junto al helicóptero al
    embarcar.
  - **Ejercicio Argos**, integración de disciplinas de inteligencia en 10 fases. Los registros
    de sensores (V, F), HUMINT, SIGINT y UAS (R) aparecen en su fecha y se acumulan, de modo
    que se ve cómo el expediente se densifica hasta converger en un punto de interés. Las notas
    de cada registro dicen qué aporta y cuál es el límite de esa evidencia. El objetivo («ÉCHO»)
    aparece primero como posible (marco punteado) y solo se confirma en la última fase.
- **Nuevo** empieza un escenario vacío.
- **Abrir** importa un `.json`, incluidos los del prototipo HTML original.
- **Guardar archivo** descarga el escenario (`.json`) con los adjuntos dentro del archivo.

Nuevo, Ejemplos y Abrir piden confirmación, porque reemplazan el escenario actual: exporta
antes lo que quieras conservar.

## 2. Paleta (columna izquierda)

Arriba, fijos, están el bando, la fuerza, el buscador y **Seleccionar y mover**. Debajo, los
símbolos se reparten en cuatro pestañas: **Unidades**, **Puntos**, **Trazos y áreas** y
**Tareas**. Un punto ámbar en una pestaña indica que ahí está la herramienta activa. El
**buscador** encuentra cualquier símbolo por su nombre o grupo sin importar la pestaña
(«fusilero», «emboscada», «puente»…); `Esc` lo limpia. **Ir a coordenadas o a una ciudad** está
plegado al final de la columna.

- **Ir a coordenadas**: acepta decimal (`4.7110, -74.0721`), grados-minutos-segundos
  (`4°42′40″N 74°04′20″O`) o un nombre de lugar. La búsqueda por nombre usa Nominatim
  (OpenStreetMap), necesita internet y solo busca en Colombia. También hay una lista de ciudades.
  **Marcar punto** deja un punto en ese sitio.
- **Bando**: amigo (rectángulo azul), hostil (rombo rojo), neutral (cuadrado verde) o
  desconocido (trébol amarillo). Sigue el MFRE 1-02.
- **Fuerza o estructura**: para amigos hay EJC, ARC, FAC, Policía y organización gubernamental;
  para hostiles, varias estructuras. Cada una cambia el color del relleno.
- **Seleccionar y mover** (tecla `V`).
- **Unidades**, en tres grupos:
  - Armas y servicios: infantería, caballería, blindados, artillería, morteros, ingenieros,
    comunicaciones, aviación, sanidad…
  - Unidades especiales: FF.EE, GAULA, alta montaña, contra narcotráfico…
  - Otras fuerzas: fuerza naval, infantería de marina, Policía, unidad por nombre…
- **Puntos**:
  - Objetivos y hechos: objetivo numerado, combate, campamento, IED…
  - Puntos de control: PC, PS, PI, PD, PT y puestos de vigilancia.
  - Aéreos: PCA, ZD, ZE, RP, IP y coordinación.
  - Instalaciones y lugares: bases, aeropuerto, antena, lugar.
- **Trazos**: línea de frente, eje de avance y ruta. Solo la ruta y el eje calculan distancia y
  tiempo.
- **Áreas**: zona, AO, ANI y ABI. Al demarcarlas se ve en vivo, junto al cursor, el tramo que se está
  trazando, el perímetro y el área. Ya dibujadas, el mapa (2D y 3D) rotula el área (m², ha o
  km²) y el perímetro en su etiqueta y la longitud de cada lado en el borde; el inspector
  muestra además la extensión norte-sur y este-oeste y el rumbo de cada lado, y permite ocultar
  las medidas. Se calculan sobre la superficie terrestre.
- **Tareas tácticas**: las 43 del capítulo 9 del manual. Cada una se dibuja con dos clics (desde
  la unidad hacia el objetivo; en las circulares, centro y borde).

Al colocar un objeto, un clic lo pone y la herramienta vuelve a selección. Con **Shift** puedes
colocar varios seguidos.

Para dibujar trazos y áreas, haz clic en cada vértice y termina con doble clic o `Enter`. Un
trazo necesita al menos 2 vértices y un área al menos 3; si terminas antes, no se crea. `Esc`
cancela.

## 3. Mapa (centro)

- **Narración** arriba a la izquierda: fase, fecha, título, descripción y miniaturas de los
  adjuntos.
- **Estilo del mapa**: el botón de capas (bajo el zoom) abre el panel. `Esc` lo cierra.
  - Mapas base: satélite, satélite nítido, terreno, relieve sombreado, físico, topográfico,
    topográfico Esri, National Geographic, calles, calles Esri, OpenStreetMap, oscuro, claro y
    ortoimagen IGAC 2023.
  - Capas superpuestas: sombreado de relieve, carreteras, nombres y fronteras, y las capas de
    IGAC y DANE (veredas, municipios, centros poblados, vías, ríos con nombre y curvas de nivel).
  - Las capas de IGAC y DANE son lentas (de 1 a 30 s) y solo se cargan a partir de cierto zoom.
    Mientras cargan aparece «Cargando capa IGAC/DANE…»; si el zoom es insuficiente, el panel
    indica «Acércate (zoom ≥ N)».
  - La elección se recuerda en el navegador y no forma parte del escenario.
- **Escala y lectura del cursor** en grados-minutos-segundos y decimal, con el zoom.
- **Etiquetas**:
  - las unidades muestran sus PAX («CIA A · 36 PAX»);
  - las rutas y ejes con medio de desplazamiento muestran distancia y tiempo
    («49 km · 26 MN · 13 min»);
  - un 📎 indica que el objeto tiene adjuntos.
- **Arrastrar** un objeto guarda su posición en la fase actual. Las fases siguientes la heredan.

### Vista 3D

El botón **3D** (bajo el de capas) muestra el escenario sobre el relieve real, al estilo de
Google Earth. Para volver, el mismo botón dice **2D**.

- Se ve el mapa base elegido en «Estilo del mapa» apoyado sobre el terreno, con las unidades,
  puntos, trazos, áreas, tareas tácticas y etiquetas de la fase.
- **Cámara**: rueda para acercar; arrastrar para desplazarse; clic derecho y arrastrar (o
  `Ctrl` + arrastrar) para girar e inclinar. Los botones de abajo a la derecha acercan, alejan
  y, con la brújula, orientan al norte.
- **Panel de relieve** (abajo a la izquierda): exageración del relieve ×1, ×1,5, ×2 o ×3 (se
  recuerda en el navegador), **Inclinar** (alterna vista cenital e inclinada) y **Norte**.
- **Reproducir** funciona igual que en 2D: las fases avanzan, los objetos se animan y la cámara
  viaja a la vista guardada de cada fase.
- Un clic en un objeto lo selecciona y lo muestra en el inspector, donde se puede editar.
- Es **solo para ver y reproducir**: la paleta se desactiva. Para colocar, mover o dibujar,
  vuelve a 2D (Redibujar en esta fase lo hace solo).
- Las capas de IGAC y DANE (y la ortoimagen IGAC) solo se ven en 2D: son servidores lentos y
  el 3D les pediría decenas de imágenes a la vez. En 3D se usa el satélite en su lugar.
- El relieve viene de Terrain Tiles (AWS), un modelo de elevación abierto y sin clave. Necesita
  internet, como el resto de mapas.

## 4. Inspector (columna derecha)

Sin selección (la fase):

- título, fecha y hora, narración y vista de cámara (guardar o quitar). En 3D se guardan el
  centro y el zoom, no la inclinación ni el giro;
- imágenes y videos de la fase: subir, poner pie, ordenar y quitar;
- fuerza en esta fase: unidades y PAX por identidad;
- nombre del escenario y ayuda rápida.

Con un objeto seleccionado:

- etiqueta, identidad, tipo, fuerza o estructura y texto del símbolo (número o sigla);
- solo unidades:
  - escalón, desde equipo (Ø) hasta comando (++);
  - estado presente o planeada;
  - modificador 1 (ASLT, SAR…) y movilidad (asalto aéreo, fluvial, montaña…);
  - refuerzo (+, −, ±), eficacia de combate y fuerza de tarea;
- notas;
- fases en que aparece y hasta cuándo es visible;
- posición (latitud y longitud), o **Redibujar en esta fase** si es un trazo;
- solo rutas y ejes de avance: desplazamiento, velocidad, distancia y
  tiempo estimado. Los medios y su velocidad por defecto, que se puede cambiar, son:

  | Medio                    | Velocidad por defecto |
  | ------------------------ | --------------------- |
  | A pie                    | 2,5 km/h              |
  | Motorizado · pavimentado | 45 km/h               |
  | Motorizado · destapado   | 20 km/h               |
  | Fluvial                  | 25 km/h               |
  | Aéreo (ala rotatoria)    | 220 km/h              |

  En los trayectos aéreos la distancia también se da en millas náuticas;

- ficha (unidades y puntos): PAX, medios y misión;
- imágenes y videos del objeto;
- **Duplicar**, **Eliminar** y **Listo**.

## 4 bis. Herramientas (taller 3D, perfiles y grafos)

Se abren desde **Herramientas**, en la paleta. Cada una ocupa la pantalla completa; **Volver
al mapa** regresa. Todo se guarda en el escenario (y en el `.json` exportado) y se puede
deshacer con Ctrl+Z.

**Taller 3D.** Crea equipos y tropas a partir de un modelo de partida, agrupados en cuatro
pestañas: **Aire** (aviones de hélice, cazas a reacción, helicópteros utilitarios y de ataque,
drones multirrotor y de ala fija), **Tierra** (carro de combate, blindados de ruedas y de orugas,
camiones de tropas, cisterna, lanzacohetes, radar o taller, camionetas, vehículo táctico ligero y
obuses remolcados o autopropulsados), **Mar y río** (lancha patrullera, bote semirrígido, fragata,
buque de desembarco y submarino) e **Infantería** (un soldado o un grupo de hasta 12 en cuña,
línea, columna o fila india, con fusiles y un arma especial: ametralladora, lanzador antitanque o
mortero). Cada tipo muestra solo sus controles: medidas (largo, envergadura, ancho, eslora,
manga, estatura o separación), cantidad (motores, rotores, ejes, ruedas de rodaje, soldados),
variante, armamento o carrocería y colores. Todos los modelos son genéricos. El visor se gira
con el ratón y tiene luz de estudio y tono cinematográfico.

**Modelo realista (.glb).** Las piezas paramétricas sirven de base, pero para un acabado de
videojuego cada modelo puede usar un archivo propio .glb (hecho en Blender o descargado de una
biblioteca con licencia libre), con sus texturas y animaciones. Se escala al largo (o a la
estatura, en la infantería) indicado en Medidas; **Frente** lo gira si no mira hacia adelante y
**Animación** elige la que se reproduce (caminar, reposo…). La infantería repite la figura en
cada puesto de la formación. El archivo se guarda en el navegador y viaja dentro del JSON al
exportar.

**Modelos reales.** En la pestaña de cada dominio, **Modelos reales** muestra los vehículos,
aeronaves, embarcaciones y tropas hechos por artistas que estén en `public/models/vehiculos/`.
Para agregar uno: descarga el modelo en formato .glb (por ejemplo de Sketchfab, filtrando por
«Downloadable» y licencia CC Attribution o CC0), cópialo a esa carpeta y agrega una entrada en
`catalogo.json`:

```json
[
  {
    "file": "humvee.glb",
    "name": "Vehículo táctico ligero",
    "base": "vehiculo-ligero",
    "length": 4.9,
    "yaw": 90,
    "author": "Nombre del autor",
    "license": "CC-BY-4.0",
    "url": "https://sketchfab.com/3d-models/..."
  }
]
```

`base` es el tipo del taller (avion, caza, helicoptero, dron-multirrotor, dron-ala-fija, tanque,
blindado, camion, camioneta, vehiculo-ligero, artilleria, lancha, buque, submarino, soldados):
define el símbolo y si vuela, rueda o navega. `length` es el largo real en metros (escala el
archivo) y `yaw` gira el modelo si no mira hacia adelante. Los créditos se muestran en el taller;
la licencia CC-BY exige citarlos también en el trabajo.

**Colocar en el mapa** pone una unidad con el símbolo que corresponde (aviación, blindados,
mecanizada, transportes, artillería, naval, infantería...) y el modelo ya asignado: haz clic en
el mapa. También se puede elegir el modelo de una unidad existente en **Modelo 3D** del
inspector (o **Asignar** en el taller). En la vista 3D las aeronaves vuelan a su altura sobre el
relieve, los vehículos y las tropas van sobre el terreno y las embarcaciones a flote, todos
orientados según su recorrido. La altura de vuelo se puede cambiar por fase (**En esta fase**;
0 = posado), así se ven despegues y aterrizajes. **Modelos: visibles** agranda los modelos para
que se lean a cualquier zoom y sube el símbolo de los que están en el suelo por encima del
modelo; **tamaño real** los muestra a escala. El ejemplo *Colibrí* trae el helicóptero.

**Perfiles y vínculos.** Un solo botón abre las fichas de las personas y sus grafos, en dos
pestañas que trabajan sobre las mismas personas: **Fichas** y **Grafos y red**. Al cambiar de
pestaña se lleva el foco: desde una ficha se abre el grafo donde aparece, con su nodo
seleccionado, y desde un nodo del grafo se abre su ficha. Cada ficha muestra **Vínculos en los
grafos**: en qué grafo aparece, con quién está unida (confirmado, por confirmar, fuente) y qué
estructuras integra; un clic en un vínculo abre la ficha de esa persona, **Ver en el grafo** lo
muestra en el diagrama y **Agregar a un grafo** la pone en otro. En la lista, ◆ indica en
cuántos grafos aparece cada ficha. En el grafo, **Crear ficha con este nodo** (o **Crear
ficha a N personas del diagrama**, para todas) convierte lo dibujado en fichas: el rótulo
«a. Alias» pasa a alias, la segunda línea a cargo, el cuadro que la contiene a estructura y la
foto a la ficha.

**Fichas.** Una ficha por persona relacionada con la operación: rol (propio,
integrante de la amenaza, persona de interés o fuente con su tipo), nombre, alias, grado, cargo,
organización, estructura, ubicación, contacto, foto y notas. **Cargar planilla…** lee un CSV
(o JSON); **Descargar plantilla** da un CSV de ejemplo con las columnas. Marca varios perfiles y
usa **Colocar plantilla en el mapa**, o **Colocar esta ficha en el mapa** para uno solo; luego
haz clic en el mapa. En el inspector de la ficha se eligen los perfiles y el ancho.

**Morfología.** En cada perfil se registran las características físicas: sexo, edad aproximada,
estatura (cm), peso (kg), somatotipo (ectomorfo, mesomorfo o endomorfo), color de piel, cabello y
peinado, vello facial, ojos y señas particulares (cicatrices, tatuajes, cojera…). Se calculan el
IMC con su clasificación (bajo peso, normal, sobrepeso, obesidad) y la complexión (flaco, media,
atlética, robusta, gordo). La descripción aparece en la ficha del mapa y en la planilla CSV
(columnas Sexo, Edad, Estatura, Peso, Somatotipo, Piel, Ojos y Señas particulares). Al lado se ve
la **figura 3D** de la persona con esas proporciones y la vestimenta elegida (camuflado o civil,
con o sin arma); **Crear figura 3D y colocar en el mapa** la convierte en modelo del taller y pone
la unidad: integrantes de la amenaza en rojo y propios en azul.

**Cuerpo humano realista.** Por defecto la figura de la persona es un cuerpo humano real
(hombre o mujer según el sexo del perfil; modelos de Quaternius, licencia CC0, en
`public/models/humanos`). Se adapta a cada persona: la estatura lo escala; el peso y el
somatotipo ensanchan hombros, cadera y abdomen y engrosan brazos y piernas; la piel toma el tono
elegido; el cabello sale según el peinado (corto, rapado, largo, recogido o calvo) y el color, con
barba si se marca. **Figura simple** vuelve a la figura con vestimenta (camuflado o civil, con o
sin arma). **Usar un cuerpo propio (.glb)** reemplaza el cuerpo incluido por otro modelo (p. ej.
de MakeHuman exportado desde Blender); si trae formas de mezcla de peso, delgadez, músculo o sexo,
se usan esas.

**Grafos y red.** Lámina de análisis de redes: integrantes de la amenaza (rombos),
personas, fuentes (anillo de color según el tipo), propios, lugares y vehículos o propiedades
(triángulo, admite foto), dentro de **cuadros de estructura** con pestaña (mando y control,
finanzas, logística…). El panel izquierdo va de arriba abajo:

- **Grafos**: la lista con cuántos elementos tiene cada uno, **+ Nuevo grafo** y, plegado,
  **Cargar un ejemplo** (diagrama de estructura o red grande para teoría de grafos).
- **Agregar al diagrama**: cada botón muestra el símbolo que pone (amenaza, persona, fuente,
  propio, lugar, vehículo o bien, estructura). Aparece en el centro de la vista; luego se
  arrastra a su sitio.
- **Personas con ficha**: agrega una ficha, trae las que faltan o crea fichas para las personas
  dibujadas que no tienen.
- **Vincular**: se elige el tipo de vínculo viendo su línea (confirmado, por confirmar, de la
  fuente) y se pulsa **Vincular dos elementos**; un aviso ámbar sobre el lienzo dice si toca
  hacer clic en el origen o en el destino, y **Terminar** sale.

En la pestaña **Red** estas secciones de edición se ocultan. Arrastra para mover (un cuadro mueve lo que tiene dentro) y usa la esquina
naranja para cambiar su tamaño; Supr borra. Incluye el cuadro de **convenciones**. Se exporta
en PNG o SVG y **Colocar en el mapa** lo pone como ficha.

**Red (teoría de grafos).** La pestaña **Red** convierte el diagrama, mientras lo armas, en una
red al estilo de Gephi: cada elemento es un nodo, cada cuadro de estructura es un nodo unido a
quienes contiene y cada vínculo pesa más si está confirmado. La red se acomoda sola por fuerzas
(tipo ForceAtlas2) cada vez que cambias el diagrama; el tamaño de los nodos sigue la métrica
elegida —**grado** (más conectados), **intermediación** (intermediarios y puentes),
**cercanía** (alcance) o **vector propio** (conectados con los importantes)— y el color, la
**comunidad** detectada por modularidad (método de Louvain) o el tipo. Se resaltan los
**puntos de corte** (actores cuya neutralización divide la red) y los **vínculos puente**
entre comunidades. El panel muestra el resumen (densidad, grado medio, comunidades y
modularidad, componentes), el ranking de **actores clave** y la composición de cada
comunidad. Arrastra un nodo para ubicarlo, el fondo para moverte y la rueda para acercar;
**Reorganizar** vuelve a distribuirla. **Exportar GEXF (Gephi)** guarda la red con métricas,
colores y posiciones para seguir el análisis en Gephi. El color por **Rol** clasifica como una lámina de
inteligencia: líder o hub principal, operativo, familia o seguridad, sentimental, personal o
apoyo, finanzas y bienes o evidencia (según el tipo, el detalle y la estructura de cada nodo).
**Cargar un ejemplo → Red grande para teoría de grafos** carga una red ficticia grande (un cabecilla con seis
estructuras y dos aliados) para ver todo el análisis.

## 5. Línea de tiempo (abajo)

- ◀◀ ▶ ▶▶ para cambiar de fase y reproducir.
- Transición de 1, 2, 4 o 7 s.
- **+ Fase después de esta** y **Eliminar fase** (pide confirmación).
- Fichas de fase con número, fecha y título. Haz clic en una para ir a ella.
- Al reproducir: pausa de 0,9 s en cada fase, movimiento animado, fundido al aparecer o
  desaparecer, y la cámara viaja a la vista guardada.

## 6. Atajos

| Tecla                     | Acción                                                                |
| ------------------------- | --------------------------------------------------------------------- |
| `←` `→`                   | Cambiar de fase                                                       |
| `Espacio`                 | Reproducir o pausar                                                   |
| `Supr` o `Retroceso`      | Borrar la selección                                                   |
| `V`                       | Seleccionar                                                           |
| `Enter`                   | Terminar un trazo                                                     |
| `Esc`                     | Cancelar, soltar la herramienta o cerrar el visor o el panel de capas |
| `Ctrl+Z`                  | Deshacer (mientras dibujas un trazo, quita el último vértice)         |
| `Ctrl+Y` o `Ctrl+Mayús+Z` | Rehacer                                                               |

En Mac, `Cmd` hace las veces de `Ctrl`.

Mientras escribes en un campo solo funciona `Esc`, que además saca el cursor del campo. Ahí,
`Ctrl+Z` deshace el texto del campo, como en cualquier formulario.

## 7. Datos y archivos: cómo no perder el trabajo

- El escenario se guarda en el navegador. Los adjuntos van aparte en IndexedDB, con un máximo de
  60 MB por archivo.
- **Cada navegador guarda un solo escenario.** No hay lista de escenarios ni historial: abrir un
  ejemplo, empezar uno nuevo o importar un archivo reemplaza el actual.
- Exporta con frecuencia, sobre todo antes de usar Nuevo, Ejemplos… o Abrir…, y si ves
  «Sin autoguardado».
- **Exportar** junta todo en un JSON autónomo; **Abrir** lo restaura, adjuntos incluidos.
- Para compartir un escenario o pasarlo a otro equipo, exporta e importa.
- Borrar los datos del navegador borra también el escenario.

Bajo 900 px de ancho los paneles se apilan debajo del mapa.

Los detalles técnicos (instalación, pruebas, despliegue y arquitectura) están en el
[README](README.md).
