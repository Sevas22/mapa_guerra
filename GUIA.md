# Guía del Mapa Táctico Colombia

Así funciona el editor en su versión actual. En desarrollo se abre en <http://localhost:3000>
(si ese puerto está ocupado, `next dev` usa el siguiente libre, por ejemplo el 3001).

El editor funciona por completo en el navegador: no hay cuentas, servidor ni trabajo en equipo
en vivo. Para compartir un escenario se exporta y se importa (ver el apartado 7).

## 1. Barra superior

- Nombre del escenario y estado del guardado («Guardado HH:MM»). El escenario se guarda solo en
  el navegador. Si aparece «Sin autoguardado», el navegador no pudo guardar (por ejemplo, porque
  no tiene espacio): exporta el escenario cuanto antes.
- **↶ Deshacer** y **↷ Rehacer** (`Ctrl+Z` y `Ctrl+Y`). Deshacen cualquier cambio del escenario:
  colocar, mover, editar, duplicar o borrar objetos, y añadir, editar o eliminar fases. Al
  deshacer, el editor vuelve a la fase en que se hizo el cambio. Escribir seguido en un campo
  cuenta como un solo paso. Se guardan hasta 100 pasos, solo mientras la página está abierta: al
  recargar, o al usar Nuevo, Ejemplos… o Abrir…, el historial empieza de cero.
- **Ejemplos…** abre uno de estos escenarios ficticios de entrenamiento:
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
- **Abrir…** importa un `.json`, incluidos los del prototipo HTML original.
- **Exportar .json** descarga el escenario con los adjuntos dentro del archivo.

Nuevo, Ejemplos… y Abrir… piden confirmación, porque reemplazan el escenario actual: exporta
antes lo que quieras conservar.

## 2. Paleta (columna izquierda)

- **Ir a coordenadas**: acepta decimal (`4.7110, -74.0721`), grados-minutos-segundos
  (`4°42′40″N 74°04′20″O`) o un nombre de lugar. La búsqueda por nombre usa Nominatim
  (OpenStreetMap), necesita internet y solo busca en Colombia. También hay una lista de ciudades.
  **Marcar punto** deja un punto en ese sitio.
- **Identidad**: amigo (rectángulo azul), hostil (rombo rojo), neutral (cuadrado verde) o
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
- **Áreas**: zona, AO, ANI y ABI.
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

**Colocar en el mapa** pone una unidad con el símbolo que corresponde (aviación, blindados,
mecanizada, transportes, artillería, naval, infantería...) y el modelo ya asignado: haz clic en
el mapa. También se puede elegir el modelo de una unidad existente en **Modelo 3D** del
inspector (o **Asignar** en el taller). En la vista 3D las aeronaves vuelan a su altura sobre el
relieve, los vehículos y las tropas van sobre el terreno y las embarcaciones a flote, todos
orientados según su recorrido. La altura de vuelo se puede cambiar por fase (**En esta fase**;
0 = posado), así se ven despegues y aterrizajes. **Modelos: visibles** agranda los modelos para
que se lean a cualquier zoom y sube el símbolo de los que están en el suelo por encima del
modelo; **tamaño real** los muestra a escala. El ejemplo *Colibrí* trae el helicóptero.

**Perfiles de operación.** Una ficha por persona relacionada con la operación: rol (propio,
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

**Grafos de vínculos.** Lámina de análisis de redes: integrantes de la amenaza (rombos),
personas, fuentes (anillo de color según el tipo), propios, lugares y vehículos o propiedades
(triángulo, admite foto), dentro de **cuadros de estructura** con pestaña (mando y control,
finanzas, logística…). **Vincular elementos**: clic en el origen y en el destino; el tipo de
vínculo (confirmado o por confirmar, de la organización o de la fuente) se elige antes y se
cambia en el panel. Arrastra para mover (un cuadro mueve lo que tiene dentro) y usa la esquina
naranja para cambiar su tamaño; Supr borra. Incluye el cuadro de **convenciones**. Se exporta
en PNG o SVG y **Colocar en el mapa** lo pone como ficha. **Ejemplo ficticio** carga una red
inventada para ver la estructura.

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
