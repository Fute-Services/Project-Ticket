import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getAssets, createAsset as createAssetApi, updateAsset as updateAssetApi, deleteAsset as deleteAssetApi } from '../utils/api';
import { useVisibilityAwarePolling } from '../hooks/useVisibilityAwarePolling';

const AssetContext = createContext(null);

// Own writes already update local state optimistically (create/update/
// delete below) — this interval only exists to pick up changes made by
// *other* sessions. Asset inventory changes far less often minute-to-minute
// than tickets/approvals do, so this can afford to be looser (5min).
const POLL_MS = 300000;

// IT's Asset Management inventory — previously local state inside
// AssetsView (DashboardPage.jsx), now a shared context so an asset added
// from one session is visible to any other IT/founder session too.
export function AssetProvider({ children }) {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const canSeeAssets = Boolean(user) && (user.role === 'it' || user.role === 'founder');

  const refresh = useCallback(async () => {
    if (!user || (user.role !== 'it' && user.role !== 'founder')) {
      setAssets([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getAssets();
      setAssets(data);
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      console.error('Failed to load assets:', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on
    // id/role (stable primitives), not the `user` object itself, which
    // AuthContext replaces with a new reference on every login-state
    // refresh even when the actual user hasn't changed — depending on the
    // object caused this refresh to needlessly refire and duplicate reads.
  }, [user?.id, user?.role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useVisibilityAwarePolling(refresh, POLL_MS, canSeeAssets);

  async function addOrUpdateAsset(asset, isEdit) {
    try {
      if (isEdit) {
        const { data } = await updateAssetApi(asset.id, asset);
        setAssets((prev) => prev.map((a) => (a.id === asset.id ? data : a)));
      } else {
        const { data } = await createAssetApi(asset);
        setAssets((prev) => [data, ...prev]);
      }
    } catch (e) {
      console.error('Failed to save asset:', e.response?.data?.error || e.message);
      throw e;
    }
  }

  async function patchAsset(id, fields) {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...fields } : a)));
    try {
      const { data } = await updateAssetApi(id, fields);
      setAssets((prev) => prev.map((a) => (a.id === id ? data : a)));
    } catch (e) {
      console.error('Failed to update asset:', e.response?.data?.error || e.message);
      refresh();
    }
  }

  async function removeAsset(id) {
    const removed = assets.find((a) => a.id === id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteAssetApi(id);
    } catch (e) {
      console.error('Failed to delete asset:', e.response?.data?.error || e.message);
      if (removed) setAssets((prev) => (prev.some((a) => a.id === id) ? prev : [removed, ...prev]));
    }
    return removed;
  }

  async function restoreAsset(asset) {
    if (!asset) return;
    try {
      const { data } = await createAssetApi(asset);
      setAssets((prev) => (prev.some((a) => a.id === asset.id) ? prev : [data, ...prev]));
    } catch (e) {
      console.error('Failed to restore asset:', e.response?.data?.error || e.message);
    }
  }

  return (
    <AssetContext.Provider value={{ assets, loading, addOrUpdateAsset, patchAsset, removeAsset, restoreAsset, refresh, lastUpdated }}>
      {children}
    </AssetContext.Provider>
  );
}

export function useAssets() {
  return useContext(AssetContext);
}
