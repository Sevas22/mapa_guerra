'use client';

import { useMemo, useRef, useState } from 'react';
import { MESH_ACCEPT, newModel } from '@/domain/models3d';
import {
  EYE_COLORS,
  FACIAL_HAIR,
  FACIAL_HAIR_NAMES,
  HAIR_COLORS,
  HAIR_STYLES,
  HAIR_STYLE_NAMES,
  SKIN_TONES,
  BUILDS,
  SOMATOTYPES,
  SOMATOTYPE_DEFS,
  STATURES,
  bmi,
  bmiClass,
  build,
  buildOf,
  newMorphology,
  statureOf,
  withBuild,
  withStature,
  type BuildId,
  type Stature,
  type FacialHair,
  type HairStyle,
  type Morphology,
  type Sex,
} from '@/domain/morphology';
import { builtinHuman, defaultOutfit, personModel, personUnit } from '@/domain/personModel';
import { profileTitle, type Profile } from '@/domain/profiles';
import { addMeshFile } from '@/lib/mediaStore';
import { NO_ANIM } from '@/lib/model3dThree';
import { useEditorStore } from '@/store/editorStore';
import { useWorkspace } from '@/store/workspaceStore';
import { ModelViewer } from './ModelViewer';

const dec = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

/** Color del indicador de IMC: verde normal, ámbar sobrepeso o bajo peso, rojo obesidad. */
const bmiColor = (v: number) =>
  v < 18.5 || (v >= 25 && v < 30) ? '#e0a020' : v >= 30 ? '#e5636a' : '#3fbf7f';

function Swatches({
  list,
  value,
  onPick,
}: {
  list: readonly { id: string; name: string; color: string }[];
  value: string;
  onPick: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {list.map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.name}
          aria-label={t.name}
          aria-pressed={value.toLowerCase() === t.color.toLowerCase()}
          className="size-7 rounded-full border-2 border-line aria-pressed:border-accent"
          style={{ background: t.color }}
          onClick={() => onPick(t.color)}
        />
      ))}
      <input
        type="color"
        aria-label="Otro color"
        title="Otro color"
        className="h-7! w-9! p-0!"
        value={value}
        onChange={(e) => onPick(e.target.value)}
      />
    </div>
  );
}

/** Fila de botones para elegir una cualidad a simple vista. */
function Choice({
  label,
  hint,
  options,
  value,
  onPick,
}: {
  label: string;
  hint?: string;
  options: (readonly [string, string])[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="field">
      <span className="flex items-baseline justify-between">
        {label}
        {hint ? <span className="text-soft">{hint}</span> : null}
      </span>
      <div className="morph-choice" role="radiogroup" aria-label={label}>
        {options.map(([id, name]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            onClick={() => onPick(id)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Morfología de la persona: datos físicos (sexo, edad, estatura, peso, somatotipo, piel,
 * cabello, ojos, señas) con IMC y complexión calculados, y su figura 3D.
 */
export default function MorphologyPanel({
  profile,
  set,
}: {
  profile: Profile;
  set: (patch: Partial<Profile>) => void;
}) {
  const upsert = useEditorStore((s) => s.upsertItem);
  const setTool = useEditorStore((s) => s.setTool);
  const close = useWorkspace((s) => s.close);
  const human = useEditorStore((s) => s.scenario.humanMesh);
  const setHuman = useEditorStore((s) => s.setHumanMesh);
  const humanIn = useRef<HTMLInputElement>(null);
  const [humanErr, setHumanErr] = useState('');
  const m = profile.fisico ?? newMorphology();
  // La figura es siempre un cuerpo humano realista: el propio del escenario o el incluido.
  const outfit = defaultOutfit(profile.rol);
  const setM = (patch: Partial<Morphology>) => set({ fisico: { ...m, ...patch } });
  const v = bmi(m);
  const b = build(m);

  const name = profileTitle(profile);
  const fisico = profile.fisico;
  const body = useMemo(() => human ?? builtinHuman(fisico ?? newMorphology()), [human, fisico]);
  const model = useMemo(
    () => personModel(profile, outfit, undefined, body),
    [profile, outfit, body],
  );

  const loadHuman = async (file: File | undefined) => {
    if (!file) return;
    setHumanErr('');
    const r = await addMeshFile(file);
    if ('error' in r) return setHumanErr(r.error);
    // Los .glb miran hacia +z; la figura, hacia +x. Quieto por defecto (pose del archivo).
    setHuman({ id: r.id, name: file.name, yaw: 90, anim: NO_ANIM });
  };

  const place = () => {
    const md = personModel(profile, outfit, newModel().id, body);
    upsert('models', md);
    const u = personUnit(profile.rol);
    setTool({
      mode: 'place',
      kind: 'unit',
      type: u.type,
      extra: {
        model3d: md.id,
        altitude: 0,
        label: name,
        ...(u.faction ? { faction: u.faction } : {}),
      },
    });
    close();
  };

  const num = (k: 'edad' | 'estatura' | 'peso', label: string, max: number, ph: string) => (
    <label className="field">
      {label}
      <input
        type="number"
        min={0}
        max={max}
        step={1}
        placeholder={ph}
        value={m[k] || ''}
        onChange={(e) => setM({ [k]: Math.max(0, Math.min(max, Number(e.target.value) || 0)) })}
      />
    </label>
  );

  return (
    <section className="mt-5 border-t border-line pt-4">
      <h3 className="sec-h big">Morfología</h3>
      <p className="note mb-3">
        Elige las cualidades a simple vista; la figura cambia al instante. Las medidas exactas son
        opcionales.
      </p>
      <div className="grid grid-cols-[1fr_260px] gap-4 max-[700px]:grid-cols-1">
        <div className="grid content-start gap-3">
          <Choice
            label="Sexo"
            options={[
              ['masculino', 'Hombre'],
              ['femenino', 'Mujer'],
            ]}
            value={m.sexo}
            onPick={(sexo) => setM({ sexo: sexo as Sex })}
          />
          <Choice
            label="Estatura"
            hint={m.estatura > 0 ? `${dec(m.estatura / 100, 2)} m` : ''}
            options={STATURES.map((x) => [x.id, x.name] as const)}
            value={statureOf(m) ?? ''}
            onPick={(id) => set({ fisico: withStature(m, id as Stature) })}
          />
          <Choice
            label="Contextura"
            hint={m.peso > 0 ? `${m.peso} kg${v != null ? ` · IMC ${dec(v)}` : ''}` : ''}
            options={BUILDS.map((x) => [x.id, x.name] as const)}
            value={buildOf(m) ?? ''}
            onPick={(id) => set({ fisico: withBuild(m, id as BuildId) })}
          />
          <div className="field">
            Color de piel
            <Swatches list={SKIN_TONES} value={m.piel} onPick={(piel) => setM({ piel })} />
          </div>

          <details className="morph-more">
            <summary>Más detalles: medidas exactas, edad, cabello y señas</summary>
            <div className="grid grid-cols-3 gap-x-3 pt-2 max-[600px]:grid-cols-1">
              {num('estatura', 'Estatura (cm)', 230, '170')}
              {num('peso', 'Peso (kg)', 300, '75')}
              {num('edad', 'Edad aproximada', 110, '35')}
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-line bg-bg px-3 py-2 text-[13px]">
              {v != null ? (
                <>
                  <span className="font-mono" style={{ color: bmiColor(v) }}>
                    IMC {dec(v)}
                  </span>
                  <span style={{ color: bmiColor(v) }}>{bmiClass(v)}</span>
                </>
              ) : (
                <span className="text-muted">Con estatura y peso se calcula el IMC.</span>
              )}
              {b ? (
                <span className="ml-auto text-soft">
                  Complexión: <b>{b}</b>
                </span>
              ) : null}
            </div>
            <div className="field">
              Somatotipo
              <div className="grid grid-cols-3 gap-1.5">
                {SOMATOTYPES.map((x) => (
                  <button
                    key={x}
                    type="button"
                    aria-pressed={m.somatotipo === x}
                    title={SOMATOTYPE_DEFS[x].hint}
                    className="rounded border border-line px-2 py-1.5 text-left aria-pressed:border-accent aria-pressed:bg-panel-2"
                    onClick={() => setM({ somatotipo: m.somatotipo === x ? '' : x })}
                  >
                    <div className="text-[13px]">{SOMATOTYPE_DEFS[x].name}</div>
                    <div className="text-[10px] leading-tight text-muted">
                      {SOMATOTYPE_DEFS[x].hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              Cabello
              <Swatches
                list={HAIR_COLORS}
                value={m.cabello}
                onPick={(cabello) => setM({ cabello })}
              />
            </div>
            <div className="grid grid-cols-3 gap-x-3 max-[600px]:grid-cols-1">
              <label className="field">
                Peinado
                <select
                  value={m.peinado}
                  onChange={(e) => setM({ peinado: e.target.value as HairStyle })}
                >
                  {HAIR_STYLES.map((h) => (
                    <option key={h} value={h}>
                      {HAIR_STYLE_NAMES[h]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Vello facial
                <select
                  value={m.barba}
                  onChange={(e) => setM({ barba: e.target.value as FacialHair })}
                >
                  {FACIAL_HAIR.map((h) => (
                    <option key={h} value={h}>
                      {FACIAL_HAIR_NAMES[h]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Ojos
                <select value={m.ojos} onChange={(e) => setM({ ojos: e.target.value })}>
                  <option value="">Sin dato</option>
                  {EYE_COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c[0]!.toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              Señas particulares
              <textarea
                rows={2}
                placeholder="Cicatrices, tatuajes, lunares, cojera, lentes, prótesis…"
                value={m.senas}
                onChange={(e) => setM({ senas: e.target.value })}
              />
            </label>
          </details>
        </div>

        <div>
          <div className="relative h-[330px] overflow-hidden rounded border border-line">
            <ModelViewer model={model} spin />
          </div>
          {
            <div className="mt-2 rounded border border-line bg-bg px-2.5 py-2 text-[12px]">
              {human ? (
                <>
                  <div className="truncate text-soft" title={human.name}>
                    Cuerpo propio: {human.name}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <select
                      aria-label="Frente del cuerpo"
                      className="w-auto!"
                      value={String(human.yaw)}
                      onChange={(e) => setHuman({ ...human, yaw: Number(e.target.value) })}
                    >
                      {[0, 90, 180, 270].map((d) => (
                        <option key={d} value={d}>
                          Frente {d}°
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn px-2! py-0.5! text-xs!"
                      onClick={() => humanIn.current?.click()}
                    >
                      Cambiar
                    </button>
                    <button
                      type="button"
                      className="btn px-2! py-0.5! text-xs!"
                      onClick={() => setHuman(undefined)}
                    >
                      Usar el incluido
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-muted">
                    Maniquí anatómico con proporciones humanas reales (hombre o mujer), con la piel,
                    la estatura y la contextura del perfil.
                  </p>
                  <button
                    type="button"
                    className="mt-1.5 text-[11px] text-accent underline"
                    onClick={() => humanIn.current?.click()}
                  >
                    Usar un cuerpo propio (.glb)…
                  </button>
                </>
              )}
              {humanErr ? <p className="mt-1 text-danger">{humanErr}</p> : null}
              <input
                ref={humanIn}
                type="file"
                accept={MESH_ACCEPT}
                hidden
                onChange={(e) => {
                  void loadHuman(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          }
          <button type="button" className="btn primary w-full" onClick={place}>
            Crear figura 3D y colocar en el mapa
          </button>
          <p className="note mt-1.5">
            Queda en el taller 3D como modelo y se ve en la vista 3D del mapa. Maniquí: «Male &amp;
            Female Base Mesh Pack», FormForge3D, CC BY 4.0.
          </p>
        </div>
      </div>
    </section>
  );
}
