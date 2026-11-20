'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { domainOf, modelSize, type Model3D } from '@/domain/models3d';
import { instantiateModel, type ModelInstance } from '@/lib/model3dThree';

/** Visor three.js con cámara orbital, luz de entorno, suelo y sombras suaves. */
export function ModelViewer({ model, spin }: { model: Model3D; spin: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const ctx = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    inst: ModelInstance | null;
    spin: boolean;
  } | null>(null);
  const lastBase = useRef<string>('');

  useEffect(() => {
    const el = box.current;
    // Escena nueva (también al volver a montar en modo estricto): hay que encuadrar otra vez.
    lastBase.current = '';
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // Tono cinematográfico y luz de un estudio para reflejos creíbles en metal y vidrio.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d131b');
    scene.fog = new THREE.Fog('#0d131b', 60, 240);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 0.55;
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 2000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.495;
    scene.add(new THREE.HemisphereLight('#dfe8f2', '#4a5040', 1.2));
    const sun = new THREE.DirectionalLight('#fff3e0', 3.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 4;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshStandardMaterial({ color: '#2a3324', roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(2, 20, '#3b4b61', '#253244');
    grid.position.y = 0.002;
    scene.add(grid);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshStandardMaterial({
        color: '#1f4a63',
        roughness: 0.15,
        metalness: 0.2,
        transparent: true,
        opacity: 0.85,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    scene.add(water);
    ctx.current = { scene, camera, controls, inst: null, spin: true };
    scene.userData = { sun, ground, grid, water };

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const timer = new THREE.Timer();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const c = ctx.current;
      timer.update();
      if (c?.inst && c.spin) c.inst.update(timer.getElapsed(), Math.min(0.1, timer.getDelta()));
      controls.update();
      renderer.render(scene, camera);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      ctx.current?.inst?.dispose();
      envMap.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      ctx.current = null;
    };
  }, []);

  // Reconstruir el modelo con cada cambio; encuadrar al cambiar de modelo o de tipo.
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    if (c.inst) {
      c.scene.remove(c.inst.root);
      c.inst.dispose();
    }
    const size = modelSize(model);
    const domain = domainOf(model.base);
    const { sun, ground, grid, water } = c.scene.userData as {
      sun: THREE.DirectionalLight;
      ground: THREE.Mesh;
      grid: THREE.GridHelper;
      water: THREE.Mesh;
    };
    const key = `${model.id}|${model.base}|${model.mesh?.id ?? ''}`;
    const reframe = lastBase.current !== key;
    lastBase.current = key;
    // Las aeronaves flotan sobre el suelo; vehículos e infantería se apoyan en él y las
    // embarcaciones quedan en su línea de flotación. Se recalcula cuando llega un .glb.
    const fit = (frame: boolean) => {
      const g = inst.root;
      g.position.y = 0;
      const box3 = new THREE.Box3().setFromObject(g, true);
      if (domain === 'aire') g.position.y = -box3.min.y + size * 0.08;
      if (!frame) return;
      const h = box3.max.y - box3.min.y;
      const ty = domain === 'aire' ? g.position.y : Math.max(0, h * 0.4);
      c.camera.position.set(size * 1.1, ty + size * 0.45, size * 1.3);
      c.controls.target.set(0, ty, 0);
      c.camera.near = size / 200;
      c.camera.far = size * 40;
      c.camera.updateProjectionMatrix();
    };
    const inst = instantiateModel(model, () => fit(false));
    c.scene.add(inst.root);
    c.inst = inst;
    ground.visible = grid.visible = domain !== 'mar';
    water.visible = domain === 'mar';
    ground.scale.setScalar(size * 2);
    water.scale.setScalar(size * 2.4);
    grid.scale.setScalar(size * 1.6);
    sun.position.set(size * 1.2, size * 2, size * 0.8);
    const cam = sun.shadow.camera;
    cam.left = cam.bottom = -size;
    cam.right = cam.top = size;
    cam.far = size * 6;
    cam.updateProjectionMatrix();
    c.scene.fog = new THREE.Fog('#0d131b', size * 3, size * 9);
    fit(reframe);
  }, [model]);

  useEffect(() => {
    if (ctx.current) ctx.current.spin = spin;
  }, [spin]);

  return <div ref={box} className="absolute inset-0" aria-label="Vista previa 3D del modelo" />;
}
