/** Accès minimal à IndexedDB (une base, un magasin) pour la file d'envoi. */
const DB_NAME = 'lavio';
const STORE = 'outbox';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB indisponible'));
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error ?? new Error('Écriture IndexedDB impossible'));
      tx.onabort = () => reject(tx.error ?? new Error('Écriture IndexedDB annulée'));
    });
  } finally {
    db.close();
  }
}

export const outbox = {
  all: <T>() => run<T[]>('readonly', (s) => s.getAll() as IDBRequest<T[]>),
  put: (value: unknown) => run('readwrite', (s) => s.put(value)),
  delete: (id: string) => run('readwrite', (s) => s.delete(id)),
};
