// Storage may be inaccessible in private browsing or a restricted game frame.
// The in-memory copy keeps the current session playable without claiming persistence.
export function createStore(name, host = globalThis) {
  const memory = new Map();
  let backing;
  let persistent = false;
  try {
    backing = host[name];
    const probe = '__spqr_storage_probe__';
    backing.setItem(probe, '1');
    backing.removeItem(probe);
    persistent = true;
  } catch {
    backing = null;
  }
  return {
    get persistent() { return persistent; },
    getItem(key) {
      const id = String(key);
      if (backing) {
        try {
          const value = backing.getItem(id);
          if (value !== null) return value;
        } catch { persistent = false; }
      }
      return memory.has(id) ? memory.get(id) : null;
    },
    setItem(key, value) {
      const id = String(key), text = String(value);
      memory.set(id, text);
      if (persistent) {
        try { backing.setItem(id, text); }
        catch { persistent = false; }
      }
    },
    removeItem(key) {
      const id = String(key);
      memory.delete(id);
      if (backing) {
        try { backing.removeItem(id); }
        catch { persistent = false; }
      }
    }
  };
}

export const localStore = createStore('localStorage');
export const sessionStore = createStore('sessionStorage');
