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
  SOMATOTYPES,
  SOMATOTYPE_DEFS,
  bmi,
  bmiClass,
  build,
  newMorphology,
  type FacialHair,
  type HairStyle,
  type Morphology,
  type Sex,
} from '@/domain/morphology';
import {
  OUTFIT_PRESETS,
  builtinHuman,
  defaultOutfit,
  personModel,
  personUnit,
  type Outfit,
} from '@/domain/personModel';
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
  const [outfits, setOutfits] = useState<Record<string, Outfit>>({});
  // Figura: cuerpo humano realista (el propio del escenario o el incluido) o figura simple.
  const [realistic, setRealistic] = useState(true);
  const outfit = outfits[profile.id] ?? defaultOutfit(profile.rol);
  const setM = (patch: Partial<Morphology>) => set({ fisico: { ...m, ...patch } });
  const v = bmi(m);
  const b = build(m);

  const name = profileTitle(profile);
  const fisico = profile.fisico;
  const body = useMemo(
    () => (realistic ? (human ?? builtinHuman(fisico ?? newMorphology())) : undefined),
    [realistic, human, fisico],
  );
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
      <div className="grid grid-cols-[1fr_250px] gap-4 max-[700px]:grid-cols-1">
        <div>
          <div className="grid grid-cols-2 gap-x-3">
            <label className="field">
              Sexo
              <select value={m.sexo} onChange={(e) => setM({ sexo: e.target.value as Sex | '' })}>
                <option value="">Sin dato</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </label>
            {num('edad', 'Edad aproximada (años)', 110, '35')}
            {num('estatura', 'Estatura (cm)', 230, '170')}
            {num('peso', 'Peso (kg)', 300, '75')}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-line bg-bg px-3 py-2 text-[13px]">
            {v != null ? (
              <>
                <span className="font-mono text-base" style={{ color: bmiColor(v) }}>
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
              {SOMATOTYPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={m.somatotipo === s}
                  title={SOMATOTYPE_DEFS[s].hint}
                  className="rounded border border-line px-2 py-1.5 text-left aria-pressed:border-accent aria-pressed:bg-panel-2"
                  onClick={() => setM({ somatotipo: m.somatotipo === s ? '' : s })}
                >
                  <div className="text-[13px]">{SOMATOTYPE_DEFS[s].name}</div>
                  <div className="text-[10px] leading-tight text-muted">
                    {SOMATOTYPE_DEFS[s].hint}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            Color de piel
            <Swatches list={SKIN_TONES} value={m.piel} onPick={(piel) => setM({ piel })} />
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
        </div>

        <div>
          <div className="relative h-[330px] overflow-hidden rounded border border-line">
            <ModelViewer model={model} spin />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1" role="radiogroup" aria-label="Figura">
            {[
              [true, 'Cuerpo realista'],
              [false, 'Figura simple'],
            ].map(([v, label]) => (
              <button
                key={String(v)}
                type="button"
                role="radio"
                aria-checked={realistic === v}
                className="rounded border border-line px-2 py-1 text-[12px] text-muted aria-checked:border-accent aria-checked:text-accent"
                onClick={() => setRealistic(v as boolean)}
              >
                {label as string}
              </button>
            ))}
          </div>
          {realistic ? (
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
                    Cuerpo humano real (hombre o mujer según el sexo), con el peinado, la barba, la
                    piel y las proporciones del perfil.
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
          ) : (
            <label className="field mt-2">
              Vestimenta de la figura
              <select
                value={OUTFIT_PRESETS.findIndex(
                  (o) => JSON.stringify(o.outfit) === JSON.stringify(outfit),
                )}
                onChange={(e) =>
                  setOutfits({
                    ...outfits,
                    [profile.id]: OUTFIT_PRESETS[Number(e.target.value)]!.outfit,
                  })
                }
              >
                {OUTFIT_PRESETS.map((o, i) => (
                  <option key={o.name} value={i}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="btn primary w-full" onClick={place}>
            Crear figura 3D y colocar en el mapa
          </button>
          <p className="note mt-1.5">
            La figura toma la estatura, el somatotipo, el peso, la piel y el cabello. Queda en el
            taller 3D como modelo y se ve en la vista 3D del mapa. Cuerpos realistas: Quaternius
            (CC0).
          </p>
        </div>
      </div>
    </section>
  );
}
