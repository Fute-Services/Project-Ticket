import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import {
  getFounderComplaints,
  getHrComplaints,
  getItComplaints,
  getMyHrComplaints,
  getMyItComplaints,
  searchHrByToken,
  searchItByToken,
  updateHrStatus,
  updateItStatus,
} from '../utils/api';
import {
  STATUSES,
  countByStatus,
  exactTime,
  mergeByRecent,
  priorityToken,
  relativeTime,
  statusToken,
  tagDept,
} from '../utils/tickets';

// Roles that may change a ticket's status. Everyone else gets a read-only cell —
// the API would 403 them anyway, and offering a control that always fails is worse
// than not offering one.
const CAN_UPDATE = new Set(['hr', 'it', 'founder']);

const LOAD_ERROR = "We couldn't load your tickets. Please try again in a few moments.";

/**
 * Pull the queue this role is allowed to see. The founder endpoint already
 * merges and tags both departments; the others need tagging here so every row
 * downstream has the same shape.
 */
async function fetchForRole(role) {
  if (role === 'founder') {
    const { data } = await getFounderComplaints();
    return data;
  }
  if (role === 'hr') {
    const { data } = await getHrComplaints();
    return tagDept(data, 'HR');
  }
  if (role === 'it') {
    const { data } = await getItComplaints();
    return tagDept(data, 'IT');
  }
  // Employee — their own tickets live in two collections
  const [hr, it] = await Promise.all([getMyHrComplaints(), getMyItComplaints()]);
  return mergeByRecent(tagDept(hr.data, 'HR'), tagDept(it.data, 'IT'));
}

// A dot, always — status and priority are never colour alone.
function Dot({ color }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-[7px] h-[7px] shrink-0"
      style={{ background: color }}
    />
  );
}

function StatTile({ label, value, color }) {
  return (
    <div className="panel px-4 py-3.5">
      <div className="kicker flex items-center gap-1.5">
        {color && <Dot color={color} />}
        {label}
      </div>
      <div className="font-heading font-extrabold text-[32px] leading-none tracking-[-0.015em] mt-2">
        {value}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const canUpdate = CAN_UPDATE.has(role);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [match, setMatch] = useState(null); // result of a token lookup
  const [searchNote, setSearchNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTickets(await fetchForRole(role));
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => countByStatus(tickets), [tickets]);

  const visible = useMemo(() => {
    if (match) return [match];
    return filter === 'All' ? tickets : tickets.filter((t) => t.status === filter);
  }, [tickets, filter, match]);

  async function handleSearch(e) {
    e.preventDefault();
    const token = query.trim().toUpperCase();
    if (!token) return clearSearch();

    setSearchNote('');
    // The prefix tells us which collection to look in
    const search = token.startsWith('FT-IT-') ? searchItByToken : searchHrByToken;
    const dept = token.startsWith('FT-IT-') ? 'IT' : 'HR';
    try {
      const { data } = await search(token);
      setMatch({ ...data, dept_tag: data.dept_tag || dept });
    } catch (err) {
      setMatch(null);
      setSearchNote(
        err.response?.status === 404
          ? 'No ticket with that token.'
          : "We couldn't run that search. Please try again in a few moments."
      );
    }
  }

  function clearSearch() {
    setQuery('');
    setMatch(null);
    setSearchNote('');
  }

  async function changeStatus(ticket, status) {
    if (status === ticket.status) return;
    const previous = ticket.status;

    // Optimistic — a status change should feel immediate; we roll back if the
    // write fails.
    const apply = (next) => {
      setTickets((rows) => rows.map((r) => (r.id === ticket.id ? { ...r, status: next } : r)));
      setMatch((m) => (m && m.id === ticket.id ? { ...m, status: next } : m));
    };
    apply(status);
    setError('');

    const update = ticket.dept_tag === 'IT' ? updateItStatus : updateHrStatus;
    try {
      await update(ticket.id, status);
    } catch {
      apply(previous);
      setError("We couldn't save that change. Please try again in a few moments.");
    }
  }

  return (
    <DashboardLayout>
      <div className="kicker">
        {role === 'employee' ? 'Your tickets' : 'Ticket queue'}
      </div>
      <h1 className="text-[42px] leading-[1.02] tracking-[-0.015em] m-0 mt-1.5">
        Dashboard
      </h1>

      {error && (
        <p
          role="alert"
          className="text-[13px] m-0 mt-5 px-3 py-2.5 text-acc"
          style={{ background: 'color-mix(in srgb, var(--acc) 12%, transparent)' }}
        >
          {error}
        </p>
      )}

      {/* Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
        <StatTile label="Total" value={loading ? '—' : counts.total} />
        {STATUSES.map((s) => (
          <StatTile
            key={s}
            label={s}
            value={loading ? '—' : counts[s]}
            color={statusToken(s)}
          />
        ))}
      </div>

      <hr className="rule" />

      {/* Filter + token lookup */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {['All', ...STATUSES].map((s) => {
            const active = filter === s && !match;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  clearSearch();
                  setFilter(s);
                }}
                aria-pressed={active}
                className="btn btn-secondary text-[13px] py-1.5"
                style={
                  active
                    ? { background: 'color-mix(in srgb, var(--ink) 10%, transparent)', borderColor: 'var(--ink)' }
                    : undefined
                }
              >
                {s !== 'All' && (
                  <span
                    aria-hidden="true"
                    className="inline-block w-[7px] h-[7px]"
                    style={{ background: statusToken(s) }}
                  />
                )}
                {s}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearch} className="flex items-end gap-2">
          <label className="field">
            <span className="label">Find by token</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="FT-HR-8X2A7K"
              className="input w-[190px] font-heading font-extrabold tracking-[0.02em]"
            />
          </label>
          <button type="submit" className="btn btn-secondary py-2.5">
            Search
          </button>
          {(match || searchNote) && (
            <button type="button" onClick={clearSearch} className="btn btn-ghost py-2.5">
              Clear
            </button>
          )}
        </form>
      </div>

      {searchNote && <p className="text-[13px] text-mut mt-3 mb-0">{searchNote}</p>}

      {/* Queue */}
      <div className="panel mt-5 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-mut px-4 py-8 m-0">Loading your tickets…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-mut px-4 py-8 m-0">
            {tickets.length === 0
              ? "No tickets yet. Raise one and we'll track it for you."
              : 'Nothing matches that filter.'}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Dept</th>
                <th>Raised by</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Raised</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={`${t.dept_tag}-${t.id}`}>
                  <td className="font-heading font-extrabold whitespace-nowrap">{t.token}</td>
                  <td>
                    <span className="tag border border-line text-mut">{t.dept_tag}</span>
                  </td>
                  <td>
                    <div className="truncate max-w-[26ch]">{t.name}</div>
                    <div className="text-[12px] text-mut truncate max-w-[26ch]">
                      {t.department}
                    </div>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Dot color={priorityToken(t.priority)} />
                      {t.priority}
                    </span>
                  </td>
                  <td>
                    {canUpdate ? (
                      <span className="inline-flex items-center gap-2">
                        <Dot color={statusToken(t.status)} />
                        <select
                          value={t.status}
                          onChange={(e) => changeStatus(t, e.target.value)}
                          aria-label={`Status for ${t.token}`}
                          className="input py-1.5 px-2 text-[13px] w-auto"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <Dot color={statusToken(t.status)} />
                        {t.status}
                      </span>
                    )}
                  </td>
                  <td className="text-mut whitespace-nowrap" title={exactTime(t.submitted_at)}>
                    {relativeTime(t.submitted_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
