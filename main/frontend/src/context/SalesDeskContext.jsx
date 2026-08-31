import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { salesLeadsApi, salesCampaignsApi, getSalesSettings } from '../utils/api';

const SalesDeskContext = createContext(null);

const DEFAULT_SETTINGS = { monthlyRevenueTarget: 0, dailyCallTargetPerRep: 0 };

// Single shared fetch of sales_leads/sales_campaigns/sales_settings on
// mount, same reasoning as HrDeskContext: every Sales screen reads the same
// data instead of each firing its own GETs.
export function SalesDeskProvider({ children }) {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  const canSeeSales = Boolean(user) && ['sales', 'founder'].includes(user.role);

  const refreshLeads = useCallback(async () => {
    if (!canSeeSales) return setLeads([]);
    try {
      const { data } = await salesLeadsApi.list();
      setLeads(data);
    } catch (e) {
      console.error('Failed to load sales leads:', e.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeSales]);

  const refreshCampaigns = useCallback(async () => {
    if (!canSeeSales) return setCampaigns([]);
    try {
      const { data } = await salesCampaignsApi.list();
      setCampaigns(data);
    } catch (e) {
      console.error('Failed to load sales campaigns:', e.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeSales]);

  const refreshSettings = useCallback(async () => {
    if (!canSeeSales) return setSettings(DEFAULT_SETTINGS);
    try {
      const { data } = await getSalesSettings();
      setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch (e) {
      console.error('Failed to load sales settings:', e.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeSales]);

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshLeads(), refreshCampaigns(), refreshSettings()]).finally(() => setLoading(false));
  }, [refreshLeads, refreshCampaigns, refreshSettings]);

  // Live "N follow-ups need attention" badge count - same query Follow-ups
  // itself runs, computed once here from the already-loaded list so
  // SalesLayout's sidebar badge doesn't need its own request.
  const followUpCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return leads.filter((l) => l.nextCallDate && l.nextCallDate <= today).length;
  }, [leads]);

  return (
    <SalesDeskContext.Provider
      value={{
        leads, setLeads, refreshLeads,
        campaigns, setCampaigns, refreshCampaigns,
        settings, setSettings, refreshSettings,
        followUpCount,
        loading,
      }}
    >
      {children}
    </SalesDeskContext.Provider>
  );
}

export function useSalesDesk() {
  return useContext(SalesDeskContext);
}
