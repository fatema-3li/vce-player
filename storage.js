const keys = ['exams', 'session', 'history'];
const storeName = 'practice';

export function readLegacy(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function openPracticeStorage() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('vce-player', 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(storeName);
      for (const key of keys) {
        const value = readLegacy(key, null);
        if (value !== null) store.put(value, key);
      }
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other VCE Player tabs and reload.'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

export function loadPractice(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName);
    const store = transaction.objectStore(storeName);
    const requests = keys.map(key => store.get(key));
    transaction.oncomplete = () => {
      resolve(Object.fromEntries(keys.map((key, i) => [key, requests[i].result])));
    };
    transaction.onabort = () => reject(transaction.error);
  });
}

export function savePractice(db, changes) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error);
    const store = transaction.objectStore(storeName);
    try {
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) store.delete(key);
        else store.put(value, key);
      }
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
}
