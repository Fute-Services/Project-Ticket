import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

// Generic hook for fetching a list of complaints via a given API function
export function useComplaints(fetchFn, deps = []) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchFn();
      setComplaints(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { refetch(); }, [refetch]);

  return { complaints, setComplaints, loading, refetch };
}
