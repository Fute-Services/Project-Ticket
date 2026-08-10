import { createContext, useContext, useState } from 'react';

const RenderContext = createContext(null);

const SEED_RENDERS = [
  { id: 1, projectCode: 'PRJ-VFX-04', sequenceType: 'Steel', frameNo: '100-300', personName: 'Sameer Kulkarni', date: '2026-08-08', allocatedSystems: 4, status: 'Rendering' },
  { id: 2, projectCode: 'PRJ-VFX-04', sequenceType: 'Animal', frameNo: '1-150', personName: 'Priya Nair', date: '2026-08-07', allocatedSystems: 2, status: 'Completed' },
  { id: 3, projectCode: 'PRJ-AD-11', sequenceType: '360', frameNo: '1-72', personName: 'Sameer Kulkarni', date: '2026-08-09', allocatedSystems: 3, status: 'Rendering' },
  { id: 4, projectCode: 'PRJ-VFX-02', sequenceType: 'Steel', frameNo: '400-520', personName: 'Priya Nair', date: '2026-08-05', allocatedSystems: 2, status: 'Completed' },
];

// Shared between the Production Floor dashboard (which logs jobs and toggles
// their status) and the IT desk's read-only "Rendering Status" view — same
// pattern as TicketContext: one department produces the data, another
// department needs to see it live, so it can't be local state to either.
export function RenderProvider({ children }) {
  const [renders, setRenders] = useState(SEED_RENDERS);

  function addRender(job) {
    setRenders((prev) => [{ id: Date.now(), ...job, status: 'Rendering' }, ...prev]);
  }

  function toggleStatus(id) {
    setRenders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: r.status === 'Completed' ? 'Rendering' : 'Completed' } : r))
    );
  }

  return (
    <RenderContext.Provider value={{ renders, addRender, toggleStatus }}>
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
