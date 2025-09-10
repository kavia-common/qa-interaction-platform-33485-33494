import { useEffect, useRef, useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * useLocalStorage provides a React stateful value that is persisted to localStorage.
 * It supports any JSON-serializable value and exposes a value, setter, and updater.
 *
 * Usage:
 *   const [value, setValue, updateValue] = useLocalStorage('my_key', { a: 1 });
 *   setValue({ a: 2 }); // replaces value and persists
 *   updateValue(prev => ({ ...prev, b: 3 })); // function updater supported
 *
 * Behavior notes:
 * - On initial mount, it attempts to read from localStorage; if parsing fails or
 *   no entry exists, it falls back to the provided initialValue.
 * - Whenever the value changes, it persists to localStorage (best-effort).
 * - This hook is generic and can be reused for any serializable data.
 *
 * @param {string} key - localStorage key to persist to.
 * @param {any} initialValue - default value to use if nothing is in storage.
 * @returns {[any, function(any | (prev:any)=>any):void, function((prev:any)=>any):void]}
 *   tuple: [value, setValue, updateValue]
 */
export function useLocalStorage(key, initialValue) {
  const isFirstLoadRef = useRef(true);
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initialValue;
      return JSON.parse(raw);
    } catch {
      // If JSON parse fails or storage is unavailable, use initialValue
      return initialValue;
    }
  });

  // Persist to localStorage whenever value changes.
  useEffect(() => {
    // Skip persisting on the very first render if value equals the storage content;
    // but writing anyway is harmless; left as normal write for simplicity & reliability.
    try {
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
    } catch {
      // Gracefully ignore storage errors (quota/availability/privacy mode)
    }
  }, [key, value]);

  /**
   * PUBLIC_INTERFACE
   * updateValue supports functional updates similar to React's setState.
   * @param {(prev:any)=>any} updater - function receiving previous value and returning next.
   */
  const updateValue = (updater) => {
    setValue((prev) => {
      try {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        return next;
      } catch {
        // If updater throws, keep previous value.
        return prev;
      }
    });
  };

  return [value, setValue, updateValue];
}

export default useLocalStorage;
