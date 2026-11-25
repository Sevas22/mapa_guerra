'use client';

import dynamic from 'next/dynamic';
import { useWorkspace } from '@/store/workspaceStore';

const loading = () => <div className="grid place-items-center text-muted">Cargando…</div>;

// three.js (unos 600 KB) solo se descarga al abrir el taller 3D.
const ModelWorkshop = dynamic(() => import('./ModelWorkshop'), { ssr: false, loading });
const ProfilesWorkspace = dynamic(() => import('./ProfilesWorkspace'), { ssr: false, loading });
const ChartWorkspace = dynamic(() => import('./ChartWorkspace'), { ssr: false, loading });

/** Área de trabajo a pantalla completa sobre la consola (taller 3D, perfiles o grafos). */
export function Workspaces() {
  const open = useWorkspace((s) => s.open);
  if (!open) return null;
  const label = {
    models: 'Taller 3D',
    profiles: 'Perfiles y vínculos · fichas',
    charts: 'Perfiles y vínculos · grafos',
  }[open];
  return (
    <div className="ws" role="dialog" aria-modal="true" aria-label={label}>
      {open === 'models' ? <ModelWorkshop /> : null}
      {open === 'profiles' ? <ProfilesWorkspace /> : null}
      {open === 'charts' ? <ChartWorkspace /> : null}
    </div>
  );
}
