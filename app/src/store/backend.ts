// Storage backend: the artifact's shared `db` when the page runs inside claude.ai,
// otherwise browser localStorage (local development, or a host without db).

type Doc = Record<string, unknown> & { id: string };

export interface Backend {
  kind: 'db' | 'local';
  subscribe(collection: string, cb: (docs: Doc[]) => void, onError?: (msg: string) => void): () => void;
  set(collection: string, id: string, data: Record<string, unknown>): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
}

interface DbLike {
  collection(path: string): {
    doc(id: string): { set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> };
    onSnapshot(next: (s: { docs: { id: string; data(): Record<string, unknown> | undefined }[] }) => void, err?: (e: { code: string; message: string }) => void): () => void;
  };
}

function dbBackend(db: DbLike): Backend {
  return {
    kind: 'db',
    subscribe(col, cb, onError) {
      return db.collection(col).onSnapshot(
        snap => cb(snap.docs.map(d => ({ ...(d.data() ?? {}), id: d.id }))),
        e => onError?.(e.message || e.code),
      );
    },
    async set(col, id, data) {
      const { id: _drop, ...body } = data as Doc;
      void _drop;
      try {
        await db.collection(col).doc(id).set(stripUndefined(body));
      } catch (e) {
        const err = e as { code?: string };
        if (err.code === 'unavailable') {
          await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
          await db.collection(col).doc(id).set(stripUndefined(body));
        } else throw e;
      }
    },
    remove: (col, id) => db.collection(col).doc(id).delete(),
  };
}

function stripUndefined(o: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(o));
}

const LS_KEY = 'reclaim-db';

function localBackend(): Backend {
  let store: Record<string, Record<string, Record<string, unknown>>> = {};
  try { store = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { store = {}; }
  const listeners = new Map<string, Set<(docs: Doc[]) => void>>();
  const docs = (col: string): Doc[] => Object.entries(store[col] ?? {}).map(([id, d]) => ({ ...d, id }));
  const emit = (col: string) => listeners.get(col)?.forEach(fn => fn(docs(col)));
  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch { /* full or blocked */ } };
  return {
    kind: 'local',
    subscribe(col, cb) {
      if (!listeners.has(col)) listeners.set(col, new Set());
      listeners.get(col)!.add(cb);
      queueMicrotask(() => cb(docs(col)));
      return () => listeners.get(col)?.delete(cb);
    },
    async set(col, id, data) {
      const { id: _drop, ...body } = data as Doc;
      void _drop;
      store[col] = { ...(store[col] ?? {}), [id]: stripUndefined(body) };
      save();
      emit(col);
    },
    async remove(col, id) {
      if (store[col]) delete store[col][id];
      save();
      emit(col);
    },
  };
}

declare global {
  interface Window { claude?: { use(name: string): Promise<unknown> } }
}

/** Resolves the shared db when the viewer grants it, else the local fallback. */
export async function connect(): Promise<Backend> {
  if (!window.claude?.use) return localBackend();
  try {
    const db = (await window.claude.use('db')) as DbLike | null;
    return db ? dbBackend(db) : localBackend();
  } catch {
    return localBackend();
  }
}
