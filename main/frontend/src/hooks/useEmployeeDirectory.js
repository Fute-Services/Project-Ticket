import { useEffect, useMemo, useState } from 'react';
import { getAssignableEmployees } from '../utils/api';

// projects now tag their team by employee id (memberIds), not display name -
// any screen that needs to *show* a member (an avatar, a name chip) has to
// resolve that id back to a name itself. This is the one shared fetch/lookup
// for that, instead of every project-rendering screen (Founder Dashboard,
// AI Advisor, Coordinator Overview/Projects/ProjectDetail/Layout) hitting
// GET /coordinator/employees and rebuilding its own id->name map.
//
// coordinator/founder only - GET /coordinator/employees 403s for any other
// role (see coordinatorRoutes.js), which is fine: nothing on the employee
// side renders a project's member list by name today.
export function useEmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssignableEmployees()
      .then(({ data }) => setEmployees(data || []))
      .catch((e) => console.error('Failed to load employee directory:', e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  // `nameOf`/`namesOf` are handed to consumers' own useMemo/useCallback
  // dependency arrays (see ProjectDetail.jsx's tasksByMember) - recreating
  // them on every render, even though `employees` itself only changes once
  // (on load), would make every downstream memo see a "changed" dependency
  // and recompute on every render, silently defeating the memoization.
  const byId = useMemo(() => new Map(employees.map((e) => [e.id, e.full_name])), [employees]);
  const nameOf = useMemo(() => (id) => byId.get(id) || 'Unknown', [byId]);
  const namesOf = useMemo(() => (ids) => (ids || []).map(nameOf), [nameOf]);

  return { employees, loading, nameOf, namesOf };
}
