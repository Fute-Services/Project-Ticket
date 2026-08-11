import { createContext, useContext, useState } from 'react';

const RenderContext = createContext(null);

const SEED_RENDERS = [
  { id: 1, date: '2026-08-09', sequence: '', frameNo: '', personName: 'Sameer Kulkarni', endDate: '', status: 'Pending' },
  { id: 2, date: '2026-08-08', sequence: '', frameNo: '', personName: 'Priya Nair', endDate: '', status: 'Completed' },
  { id: 3, date: '2026-08-09', sequence: '', frameNo: '', personName: 'John Doe', endDate: '', status: 'On Hold' },
  { id: 4, date: '2026-08-10', sequence: '', frameNo: '', personName: 'Jane Smith', endDate: '', status: 'Queue' },
];

export function RenderProvider({ children }) {
  const [renders, setRenders] = useState(SEED_RENDERS);

  function addRender(job) {
    setRenders((prev) => [{ id: Date.now(), sequence: '', frameNo: '', status: 'Queue', ...job }, ...prev]);
  }

  function toggleStatus(id) {
    setRenders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: r.status === 'Completed' ? 'Pending' : 'Completed' } : r))
    );
  }

  function updateRenderField(id, field, value) {
    setRenders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  return (
    <RenderContext.Provider value={{ renders, addRender, toggleStatus, updateRenderField }}>
      {children}
    </RenderContext.Provider>
  );
}

export function useRenders() {
  return useContext(RenderContext);
}

// "100-300" -> 201 frames. Falls back to counting the job as a single frame
// if someone types something that isn't a range, rather than throwing. Used
// by both the Production dashboard and IT's read-only Rendering Status view,
// so it lives with the data shape rather than being copied into each.
export function frameCount(frameNo) {
  const m = String(frameNo).match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
  if (!m) return 1;
  return Math.max(0, parseInt(m[2], 10) - parseInt(m[1], 10) + 1);
}
