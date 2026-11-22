const keys = ['exams', 'history', 'session', 'candidate', 'textSize', 'browserArabicV1', 'translationMemory', 'examLanguage'];
const collections = new Set(['exams', 'history']);
const values = new Map();
let database;

function waitFor(request) {
 return new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(Error('Browser storage is blocked by another tab.'));
 });
}

function transaction() {
 const tx = database.transaction(['state', 'entries'], 'readwrite');
 const done = new Promise((resolve, reject) => {
  tx.oncomplete = resolve;
  tx.onabort = () => reject(tx.error || Error('Storage transaction aborted.'));
 });
 return {state:tx.objectStore('state'),entries:tx.objectStore('entries'),done};
}

function loadCollection(state, entries, key, loaded) {
 const order = state.get(key);
 const records = entries.getAll(IDBKeyRange.bound([key], [key, []]));
 records.onsuccess = () => {
  const byId = new Map(records.result.map(record => [record.id, record.value]));
  loaded((order.result || []).map(id => byId.get(id)), order.result || []);
 };
}

function storeCollection(state, entries, key, next, previous = [], ids = []) {
 const previousIds = new Map(previous.map((value, i) => [value, ids[i]]));
 const order = next.map(value => {
  if (previousIds.has(value)) return previousIds.get(value);
  const id = crypto.randomUUID();
  entries.put({id,value}, [key,id]);
  return id;
 });
 const retained = new Set(order);
 for (const id of ids) {
  if (!retained.has(id)) entries.delete([key,id]);
 }
 state.put(order, key);
}

export async function initializeStorage() {
 const request = indexedDB.open('vce-player', 1);
 request.onupgradeneeded = () => {
  request.result.createObjectStore('state');
  request.result.createObjectStore('entries');
 };
 database = await waitFor(request);
 database.onversionchange = () => database.close();

 const {state, entries, done} = transaction();
 const migrated = state.get('migrated');
 const migratedRaw = new Map();
 migrated.onsuccess = () => {
  if (!migrated.result) {
   for (const key of keys) {
    try {
     const raw = localStorage.getItem(key);
     if (raw === null) continue;
     const value = JSON.parse(raw);
     if (collections.has(key)) {
      if (!Array.isArray(value)) continue;
      storeCollection(state, entries, key, value);
     } else {
      state.put(value, key);
     }
     migratedRaw.set(key, raw);
    } catch (error) {
     // A malformed value stays in legacy storage. Other errors abort the copy.
     if (!(error instanceof SyntaxError)) {
      state.transaction.abort();
      return;
     }
    }
   }
   state.put(true, 'migrated');
  }
  for (const key of keys) {
   if (collections.has(key)) {
    loadCollection(state, entries, key, value => values.set(key, value));
   } else {
    const request = state.get(key);
    request.onsuccess = () => values.set(key, request.result);
   }
  }
 };
 await done;

 // Free old quota only after commit, and only if the source has not changed.
 for (const [key, raw] of migratedRaw) {
  try {
   if (localStorage.getItem(key) === raw) localStorage.removeItem(key);
  } catch {
   // A legacy copy can remain if the browser blocks removal.
  }
 }
}

export function read(key, fallback) {
 return values.get(key) ?? fallback;
}

export async function write(changes) {
 const {state, entries, done} = transaction();
 const committed = new Map();
 for (const [key, change] of Object.entries(changes)) {
  if (collections.has(key)) {
   loadCollection(state, entries, key, (previous, ids) => {
    const next = typeof change === 'function' ? change(previous) : change;
    storeCollection(state, entries, key, next, previous, ids);
    committed.set(key, next);
   });
   continue;
  }
  const put = value => {
   if (value === undefined) state.delete(key);
   else state.put(value, key);
   committed.set(key, value);
  };
  if (typeof change === 'function') {
   const request = state.get(key);
   request.onsuccess = () => put(change(request.result));
  } else {
   put(change);
  }
 }
 await done;
 for (const [key, value] of committed) values.set(key, value);
}
