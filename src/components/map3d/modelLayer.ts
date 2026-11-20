/**
 * Capa personalizada de MapLibre que dibuja con three.js los modelos 3D de las unidades que
 * tienen uno asignado: aeronaves a su altura de vuelo, vehículos y tropas sobre el relieve y
 * embarcaciones a flote, orientados según su recorrido, con rotores y animaciones en marcha.
 */
import { MercatorCoordinate, type CustomLayerInterface, type Map as GlMap } from 'maplibre-gl';
import * as THREE from 'three';
import { domainOf, headingBetween, modelSize, type Model3D } from '@/domain/models3d';
import { objectStateAt } from '@/domain/timeline';
import type { UnitObject } from '@/domain/types';
import { instantiateModel, type ModelInstance } from '@/lib/model3dThree';
import { useEditorStore } from '@/store/editorStore';

interface Entry {
  model: Model3D;
  root: THREE.Group;
  inst: ModelInstance;
  /** Línea vertical hasta el suelo, para leer la altura. */
  stem: THREE.Line;
  heading: number;
}

/** Tamaño en pantalla (px) que se garantiza en el modo «visible». */
export const VISIBLE_PX = 64;
const EARTH_M = 40075016.686;

export interface ModelLayer extends CustomLayerInterface {
  /** `true`: agranda los modelos para que se vean a cualquier zoom; `false`: tamaño real. */
  setVisibleScale(on: boolean): void;
}

export function createModelLayer(): ModelLayer {
  let map: GlMap | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const entries = new Map<string, Entry>();
  const timer = new THREE.Timer();
  let visible = true;

  scene.add(new THREE.HemisphereLight('#eef3f8', '#4a4a3a', 2.2));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.6);
  sun.position.set(0.6, 1, 0.4);
  scene.add(sun);
  const stemMat = new THREE.LineDashedMaterial({
    color: '#ffffff',
    dashSize: 0.04,
    gapSize: 0.03,
    transparent: true,
    opacity: 0.7,
  });

  const release = (e: Entry) => {
    scene.remove(e.root);
    e.inst.dispose();
    e.stem.geometry.dispose();
  };

  const entryFor = (o: UnitObject, model: Model3D): Entry => {
    let e = entries.get(o.id);
    if (e && e.model === model) return e;
    if (e) release(e);
    const root = new THREE.Group();
    const inst = instantiateModel(model, () => map?.triggerRepaint());
    root.add(inst.root);
    const stem = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -1, 0),
      ]),
      stemMat,
    );
    stem.computeLineDistances();
    root.add(stem);
    scene.add(root);
    e = { model, root, inst, stem, heading: e?.heading ?? 0 };
    entries.set(o.id, e);
    return e;
  };

  const drop = (id: string) => {
    const e = entries.get(id);
    if (!e) return;
    release(e);
    entries.delete(id);
  };

  return {
    id: 'models-3d',
    type: 'custom',
    renderingMode: '3d',

    setVisibleScale(on) {
      visible = on;
      map?.triggerRepaint();
    },

    onAdd(m, gl) {
      map = m;
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
      // Tono cinematográfico: luces altas suaves y colores más naturales en los modelos.
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
    },

    onRemove() {
      for (const id of [...entries.keys()]) drop(id);
      renderer?.dispose();
      renderer = null;
      map = null;
    },

    render(_gl, args) {
      if (!map || !renderer) return;
      const st = useEditorStore.getState();
      const { objects, phases, models } = st.scenario;
      const byId = new Map((models ?? []).map((x) => [x.id, x]));
      const n = phases.length;
      const t = st.time;
      const zoom = map.getZoom();
      const exaggeration = map.getTerrain()?.exaggeration ?? 1;
      const main = new THREE.Matrix4().fromArray(
        args.defaultProjectionData.mainMatrix as ArrayLike<number> as number[],
      );
      const seen = new Set<string>();
      const draw: { e: Entry; matrix: THREE.Matrix4 }[] = [];

      for (const o of objects) {
        if (o.kind !== 'unit' || !o.model3d) continue;
        const model = byId.get(o.model3d);
        if (!model) continue;
        const s = objectStateAt(o, t, n);
        if (!s || s.kind !== 'point' || s.opacity < 0.3) continue;
        seen.add(o.id);
        const e = entryFor(o, model);

        // Rumbo según el desplazamiento alrededor del instante actual.
        const a = objectStateAt(o, Math.max(0, t - 0.04), n);
        const b = objectStateAt(o, Math.min(n - 1, t + 0.04), n);
        if (a?.kind === 'point' && b?.kind === 'point') {
          const h = headingBetween([a.lat, a.lng], [b.lat, b.lng]);
          if (h != null) e.heading = h;
        }

        const domain = domainOf(model.base);
        let ground = map.queryTerrainElevation([s.lng, s.lat]) ?? 0;
        // En el mar el modelo de elevación trae la batimetría: los buques flotan en el nivel 0.
        if (domain === 'mar') ground = Math.max(0, ground);
        const mpp = (EARTH_M * Math.cos((s.lat * Math.PI) / 180)) / (512 * 2 ** zoom);
        const k = visible ? Math.max(1, (VISIBLE_PX * mpp) / modelSize(model)) : 1;
        // El relieve está exagerado: la altura de vuelo se exagera igual para conservar la
        // proporción. Lo que no vuela va siempre a ras del suelo o del agua.
        let alt = domain === 'aire' ? (s.alt ?? o.altitude ?? 0) * exaggeration : 0;
        // Agrandado, el modelo taparía su símbolo: en vuelo se separa al menos una vez y media su
        // tamaño en pantalla. Posado (altura 0) queda sobre el terreno.
        if (visible && alt > 1) alt = Math.max(alt, modelSize(model) * k * 1.5);
        const mc = MercatorCoordinate.fromLngLat([s.lng, s.lat], ground + alt);
        const unitM = mc.meterInMercatorCoordinateUnits();
        const sc = unitM * k;

        // Ejes del modelo: x nariz, y arriba, z derecha. Mercator: x este, y sur, z arriba.
        // Sin escala negativa (invertiría las caras); el giro en X lleva «arriba» a z y el giro
        // en Y orienta la nariz al rumbo (0 = norte, sentido horario).
        const local = new THREE.Matrix4()
          .makeTranslation(mc.x, mc.y, mc.z)
          .scale(new THREE.Vector3(sc, sc, sc))
          .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
          .multiply(new THREE.Matrix4().makeRotationY(e.heading - Math.PI / 2));
        e.stem.scale.set(1, alt / k, 1);
        e.stem.visible = alt > 1;
        draw.push({ e, matrix: main.clone().multiply(local) });
      }
      for (const id of [...entries.keys()]) if (!seen.has(id)) drop(id);
      if (!draw.length) return;

      timer.update();
      const secs = timer.getElapsed();
      const dt = Math.min(0.1, timer.getDelta());
      renderer.resetState();
      for (const { e } of draw) e.root.visible = false;
      for (const { e, matrix } of draw) {
        e.inst.update(secs, dt);
        e.root.visible = true;
        camera.projectionMatrix = matrix;
        camera.projectionMatrixInverse.copy(matrix).invert();
        renderer.render(scene, camera);
        e.root.visible = false;
      }
      // Animar los rotores mientras haya modelos en pantalla.
      map.triggerRepaint();
    },
  };
}
