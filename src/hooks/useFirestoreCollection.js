import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const buildCollectionQuery = (collectionName, queryFilters = []) => {
  const col = collection(db, collectionName);
  if (!queryFilters.length) return col;
  const constraints = queryFilters.map(([field, op, value]) => where(field, op, value));
  return query(col, ...constraints);
};

/**
 * @param {string} collectionName
 * @param {{ realtime?: boolean, queryFilters?: [string, string, unknown][], enabled?: boolean }} [options]
 */
export const useFirestoreCollection = (collectionName, options = {}) => {
  const {
    realtime = false,
    queryFilters = [],
    enabled = true,
  } = options;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const collectionQuery = useMemo(
    () => buildCollectionQuery(collectionName, queryFilters),
    [collectionName, JSON.stringify(queryFilters)]
  );

  const load = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collectionQuery);
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setItems(list);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [collectionQuery, enabled]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      return undefined;
    }

    if (!realtime) {
      load();
      return undefined;
    }

    setLoading(true);
    setError(null);
    const unsub = onSnapshot(
      collectionQuery,
      (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message || 'Failed to load data');
        setLoading(false);
      }
    );
    return unsub;
  }, [collectionQuery, realtime, enabled, load]);

  const save = async (item, idField = 'id') => {
    const id = item[idField] || item.id || `${collectionName}-${Date.now()}`;
    await setDoc(doc(db, collectionName, id), { ...item, id }, { merge: true });
    if (!realtime) await load();
  };

  const remove = async (id) => {
    await deleteDoc(doc(db, collectionName, id));
    if (!realtime) await load();
  };

  return { items, loading, error, load, save, remove };
};
