'use client';

import { useMemo, useRef, useState } from 'react';
import { profileCardSpec } from '@/domain/docCards';
import {
  CSV_TEMPLATE,
  PROFILE_ROLES,
  ROLE_DEFS,
  ROLE_ORDER,
  SOURCE_DEFS,
  SOURCE_TYPES,
  newProfile,
  profileTitle,
  profilesFromCsv,
  profilesToCsv,
  type Profile,
  type ProfileRole,
  type SourceType,
} from '@/domain/profiles';
import { ProfileSchema } from '@/domain/schema';
import type { PointObject } from '@/domain/types';
import { downloadText, imageToDataUrl } from '@/lib/imageResize';
import { useEditorStore } from '@/store/editorStore';
import { useWorkspace } from '@/store/workspaceStore';
import MorphologyPanel from './MorphologyPanel';

const EMPTY: Profile[] = [];

const TEXT_FIELDS: [keyof Profile, string, string][] = [
  ['nombre', 'Nombre completo', ''],
  ['alias', 'Alias', 'Nombre de cobertura'],
  ['grado', 'Grado o rango', 'MY, SV, cabecilla…'],
  ['cargo', 'Cargo o función', 'Comandante, explosivista…'],
  ['organizacion', 'Organización o unidad', ''],
  ['estructura', 'Estructura o componente', 'Mando y control, finanzas…'],
  ['ubicacion', 'Ubicación o zona', ''],
  ['telefono', 'Teléfono', ''],
  ['documento', 'Documento', ''],
];

/** Vista previa de la ficha tal como se verá en el mapa. */
function CardPreview({
  ids,
  profiles,
  label,
}: {
  ids: string[];
  profiles: Profile[];
  label?: string;
}) {
  const html = useMemo(() => {
    const o = {
      kind: 'point',
      type: 'perfil',
      profileIds: ids,
      label: label ?? '',
    } as unknown as PointObject;
    return profileCardSpec(o, { profiles }, false).html;
  }, [ids, profiles, label]);
  return <div className="w-fit max-w-full" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Perfiles de operación: fichas de todas las personas relacionadas con la operación. */
export default function ProfilesWorkspace() {
  const profiles = useEditorStore((s) => s.scenario.profiles ?? EMPTY);
  const upsert = useEditorStore((s) => s.upsertItem);
  const removeItem = useEditorStore((s) => s.removeItem);
  const addProfiles = useEditorStore((s) => s.addProfiles);
  const setTool = useEditorStore((s) => s.setTool);
  const focusId = useWorkspace((s) => s.focusId);
  const close = useWorkspace((s) => s.close);
  const [currentId, setCurrentId] = useState<string | null>(focusId ?? profiles[0]?.id ?? null);
  const [checked, setChecked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<ProfileRole | ''>('');
  const [msg, setMsg] = useState('');
  const csvIn = useRef<HTMLInputElement>(null);
  const photoIn = useRef<HTMLInputElement>(null);
  const p = profiles.find((x) => x.id === currentId);

  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const list = useMemo(() => {
    const q = fold(query.trim());
    return [...profiles]
      .filter((x) => !role || x.rol === role)
      .filter(
        (x) =>
          !q ||
          fold([x.nombre, x.alias, x.cargo, x.organizacion, x.estructura].join(' ')).includes(q),
      )
      .sort((a, b) => ROLE_ORDER[a.rol] - ROLE_ORDER[b.rol]);
  }, [profiles, query, role]);

  const set = (patch: Partial<Profile>) => {
    if (!p) return;
    upsert('profiles', { ...p, ...patch }, `profile:${p.id}:${Object.keys(patch).join(',')}`);
  };

  const add = () => {
    const n = newProfile({ rol: role || 'persona' });
    upsert('profiles', n);
    setCurrentId(n.id);
  };

  const onCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    let r: ReturnType<typeof profilesFromCsv>;
    if (/\.json$/i.test(file.name)) {
      try {
        const data = JSON.parse(text) as unknown;
        const arr = Array.isArray(data) ? data : (data as { profiles?: unknown[] }).profiles;
        if (!Array.isArray(arr)) throw new Error();
        // Ids nuevos para no pisar perfiles que ya existan.
        const ok = arr.flatMap((x) => {
          const parsed = ProfileSchema.safeParse(x);
          return parsed.success ? [{ ...parsed.data, id: newProfile().id }] : [];
        });
        r = ok.length
          ? { ok: true, profiles: ok }
          : { ok: false, error: 'El JSON no trae perfiles.' };
      } catch {
        r = { ok: false, error: 'El archivo no es un JSON de perfiles válido.' };
      }
    } else r = profilesFromCsv(text);
    if (!r.ok) {
      setMsg(r.error);
      return;
    }
    addProfiles(r.profiles);
    setCurrentId(r.profiles[0]!.id);
    setMsg(`Se cargaron ${r.profiles.length} perfiles de «${file.name}».`);
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !p) return;
    try {
      set({ foto: await imageToDataUrl(file) });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se pudo leer la imagen.');
    }
  };

  const place = (ids: string[]) => {
    if (!ids.length) return;
    setTool({
      mode: 'place',
      kind: 'point',
      type: 'perfil',
      extra: { profileIds: ids, label: ids.length > 1 ? 'Perfiles de operación' : '' },
    });
    close();
  };

  const toggle = (id: string) =>
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const allChecked = list.length > 0 && list.every((x) => checked.includes(x.id));

  return (
    <>
      <div className="ws-h max-[900px]:flex-wrap">
        <h2>
          Perfiles de operación <span className="text-accent">·</span> {profiles.length}
        </h2>
        <span className="flex-1" />
        <button type="button" className="btn" onClick={() => csvIn.current?.click()}>
          Cargar planilla…
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => downloadText('plantilla-perfiles.csv', CSV_TEMPLATE, 'text/csv')}
        >
          Descargar plantilla
        </button>
        <button
          type="button"
          className="btn"
          disabled={!profiles.length}
          onClick={() => downloadText('perfiles.csv', profilesToCsv(profiles), 'text/csv')}
        >
          Exportar CSV
        </button>
        <button type="button" className="btn primary" onClick={close}>
          Volver al mapa
        </button>
        <input ref={csvIn} type="file" accept=".csv,.txt,.json,text/csv" hidden onChange={onCsv} />
      </div>
      <div className="ws-body grid-cols-[300px_1fr_340px] max-[1000px]:grid-cols-1">
        <aside className="ws-side flex flex-col border-r border-line">
          <section className="sec">
            {msg ? (
              <p
                className="mb-2 rounded border border-accent px-2 py-1.5 text-[12px] text-soft"
                role="status"
              >
                {msg}
              </p>
            ) : null}
            <input
              type="search"
              placeholder="Buscar nombre, alias, cargo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              <button
                type="button"
                aria-pressed={role === ''}
                className="btn px-2! py-0.5! text-xs! aria-pressed:border-accent aria-pressed:text-accent"
                onClick={() => setRole('')}
              >
                Todos
              </button>
              {PROFILE_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={role === r}
                  className="btn px-2! py-0.5! text-xs! aria-pressed:border-accent aria-pressed:text-accent"
                  onClick={() => setRole(role === r ? '' : r)}
                >
                  <i
                    className="mr-1 inline-block size-2 rounded-full"
                    style={{ background: ROLE_DEFS[r].color }}
                  />
                  {r === 'amenaza'
                    ? 'Amenaza'
                    : r === 'persona'
                      ? 'Personas'
                      : r === 'fuente'
                        ? 'Fuentes'
                        : 'Propios'}
                </button>
              ))}
            </div>
          </section>
          <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-xs text-muted">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                className="w-auto!"
                checked={allChecked}
                onChange={() => setChecked(allChecked ? [] : list.map((x) => x.id))}
              />
              Marcar todos
            </label>
            <span className="flex-1" />
            <button type="button" className="btn px-2! py-0.5! text-xs!" onClick={add}>
              + Perfil
            </button>
          </div>
          <ul className="min-h-0 flex-1 overflow-auto">
            {list.map((x) => (
              <li key={x.id} className="flex items-center gap-2 border-b border-line px-3 py-1.5">
                <input
                  type="checkbox"
                  className="w-auto!"
                  aria-label={`Marcar ${profileTitle(x)}`}
                  checked={checked.includes(x.id)}
                  onChange={() => toggle(x.id)}
                />
                <button
                  type="button"
                  aria-pressed={x.id === currentId}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left aria-pressed:bg-panel-2"
                  onClick={() => setCurrentId(x.id)}
                >
                  {x.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={x.foto} alt="" className="size-8 flex-none rounded object-cover" />
                  ) : (
                    <span className="grid size-8 flex-none place-items-center rounded bg-bg text-muted">
                      ?
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[13px]">{profileTitle(x)}</span>
                    <span className="flex items-center gap-1 truncate text-[11px] text-muted">
                      <i
                        className="inline-block size-2 flex-none rounded-full"
                        style={{
                          background:
                            x.rol === 'fuente' && x.fuente
                              ? SOURCE_DEFS[x.fuente].color
                              : ROLE_DEFS[x.rol].color,
                        }}
                      />
                      {x.cargo || ROLE_DEFS[x.rol].name}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {!list.length ? (
              <li className="p-4 text-[13px] text-muted">
                {profiles.length
                  ? 'Ningún perfil coincide con el filtro.'
                  : 'Sin perfiles. Agrega uno o carga una planilla CSV (descarga la plantilla para ver las columnas).'}
              </li>
            ) : null}
          </ul>
          <div className="border-t border-line p-3">
            <button
              type="button"
              className="btn primary w-full"
              disabled={!checked.length}
              onClick={() => place(profiles.filter((x) => checked.includes(x.id)).map((x) => x.id))}
            >
              Colocar plantilla en el mapa ({checked.length})
            </button>
          </div>
        </aside>

        <main className="min-h-0 overflow-auto">
          {p ? (
            <div className="mx-auto max-w-[760px] p-4">
              <div className="mb-4 flex gap-4">
                <button
                  type="button"
                  className="grid h-[150px] w-[120px] flex-none place-items-center overflow-hidden rounded border border-dashed border-line bg-bg text-xs text-muted"
                  onClick={() => photoIn.current?.click()}
                  title="Cambiar foto"
                >
                  {p.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.foto}
                      alt="Foto del perfil"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    'Agregar foto'
                  )}
                </button>
                <input ref={photoIn} type="file" accept="image/*" hidden onChange={onPhoto} />
                <div className="grid flex-1 content-start gap-2">
                  <div className="row">
                    <label className="field">
                      Rol en la operación
                      <select
                        value={p.rol}
                        onChange={(e) => {
                          const rol = e.target.value as ProfileRole;
                          set(
                            rol === 'fuente'
                              ? { rol, fuente: p.fuente ?? 'estudio' }
                              : { rol, fuente: undefined },
                          );
                        }}
                      >
                        {PROFILE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_DEFS[r].name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {p.rol === 'fuente' ? (
                      <label className="field">
                        Tipo de fuente
                        <select
                          value={p.fuente ?? 'estudio'}
                          onChange={(e) => set({ fuente: e.target.value as SourceType })}
                        >
                          {SOURCE_TYPES.map((s) => (
                            <option key={s} value={s}>
                              {SOURCE_DEFS[s].name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                  {p.foto ? (
                    <button
                      type="button"
                      className="btn w-fit text-xs!"
                      onClick={() => set({ foto: undefined })}
                    >
                      Quitar foto
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 max-[600px]:grid-cols-1">
                {TEXT_FIELDS.map(([k, label, ph]) => (
                  <label key={k} className="field">
                    {label}
                    <input
                      type="text"
                      value={(p[k] as string) ?? ''}
                      placeholder={ph}
                      onChange={(e) => set({ [k]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              <label className="field">
                Notas
                <textarea
                  value={p.notas}
                  rows={4}
                  onChange={(e) => set({ notas: e.target.value })}
                />
              </label>
              <MorphologyPanel profile={p} set={set} />
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn" onClick={() => place([p.id])}>
                  Colocar esta ficha en el mapa
                </button>
                <span className="flex-1" />
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    if (
                      !confirm(
                        `¿Eliminar el perfil «${profileTitle(p)}»? También sale de las fichas y grafos.`,
                      )
                    )
                      return;
                    removeItem('profiles', p.id);
                    setChecked((c) => c.filter((x) => x !== p.id));
                    setCurrentId(null);
                  }}
                >
                  Eliminar perfil
                </button>
              </div>
            </div>
          ) : (
            <div className="grid h-full place-items-center p-6 text-center text-muted">
              Elige un perfil de la lista o agrega uno nuevo.
            </div>
          )}
        </main>

        <aside className="ws-side border-l border-line p-3">
          <h3 className="sec-h">Así se verá en el mapa</h3>
          {p ? <CardPreview ids={[p.id]} profiles={profiles} /> : null}
          {checked.length > 1 ? (
            <>
              <h3 className="sec-h mt-4">Plantilla con los marcados</h3>
              <CardPreview ids={checked} profiles={profiles} label="Perfiles de operación" />
            </>
          ) : (
            <p className="note mt-4">
              Marca varios perfiles en la lista para colocar una plantilla con todos ellos.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
