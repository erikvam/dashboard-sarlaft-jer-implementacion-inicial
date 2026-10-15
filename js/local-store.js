(function () {
  'use strict';
  const DB_NAME = 'jer-sarlaft-dashboard';
  const DB_VERSION = 1;
  const STORE = 'local-config';
  const KEY = 'report-state';
  const defaults = () => ({
    edits: {}, customPages: [], deletedPages: [], pageOrder: [], customBlocks: [], logoDataUrl: null
  });
  let dbPromise;

  function openDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('Este navegador no permite IndexedDB. Usa una versión actualizada de Chrome o Edge.'));
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('No se pudo abrir el almacenamiento local.'));
    });
    return dbPromise;
  }

  async function getState() {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const request = tx.objectStore(STORE).get(KEY);
        request.onsuccess = () => resolve(Object.assign(defaults(), request.result || {}));
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
      throw error;
    }
  }

  async function saveState(state) {
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(state, KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('No se pudieron guardar los cambios.'));
        tx.onabort = () => reject(tx.error || new Error('Se canceló el guardado local.'));
      });
    } catch (error) {
      // Respaldo para preferencias pequeñas; imágenes grandes necesitan IndexedDB.
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (_) { throw new Error('No hay espacio disponible para guardar los cambios. Exporta la configuración y elimina archivos antiguos del navegador.'); }
    }
  }

  window.JERLocalStore = { getState, saveState, defaults };
})();
