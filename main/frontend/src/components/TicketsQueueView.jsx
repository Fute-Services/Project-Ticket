import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ItDatePicker from './ItDatePicker';
import DataTable from './DataTable';
import { Drawer } from './ui';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { Search, X, Eye, CheckSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getHrStaff, getItStaff } from '../utils/api';

// Requests raised through NewHrTicketModal combine its separate Title +
// Description fields into one string ("Title: Description") before they
// ever reach the backend (TicketContext.addTicket - hr_complaints has no
// title column of its own). The Issue column shows only the title part for
// HR so the queue stays scannable; the drawer below still shows the full
// combined text via `description`.
export function issueTitle(t) {
  const full = t.description || t.title || '';
  const sep = full.indexOf(': ');
  return sep === -1 ? full : full.slice(0, sep);
}

// Most recent approval record linked back to this ticket (approvals/{id}
// has complaintRef: { collection, id } - set automatically by
// itController.js/hrController.js when a ticket's status is set to
// "Waiting Approval"). A ticket can only be sent for approval once at a
// time, but sort by createdAt anyway in case a rejected-then-resent ticket
// left more than one record behind.
function findApproval(approvals, ticketId) {
  const matches = (approvals || []).filter((a) => a.complaintRef?.id === ticketId);
  if (!matches.length) return null;
  return matches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

export const TICKET_STATUSES = ['Open', 'In Progress', 'Waiting Approval', 'Resolved', 'Closed'];

const DEFAULT_SOLVER = 'Unassigned';

// The "Resolved By" dropdown used to be a hardcoded name/team list per
// department - someone newly given the hr/it role never showed up until a
// developer edited this file. Now it's whoever currently holds that role,
// fetched from GET /api/{hr,it}/staff (staffController.js) - same source of
// truth the Founder's Role Permissions page uses to grant the role itself.
function useSolverOptions(deptLabel) {
  const [names, setNames] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const fetchStaff = deptLabel === 'HR' ? getHrStaff : getItStaff;
    fetchStaff()
      .then(({ data }) => {
        if (!cancelled) setNames((data || []).map((u) => u.full_name).filter(Boolean));
      })
      .catch(() => {
        // Queue still works with just "Unassigned" if this fails - not
        // worth surfacing a toast for a dropdown's option list.
      });
    return () => {
      cancelled = true;
    };
  }, [deptLabel]);

  return useMemo(() => [DEFAULT_SOLVER, ...names], [names]);
}

// A Radix Select (not a native `<select>`) so the OPEN dropdown panel can be
// fully skinned too - a native `<option>` list ignores almost all CSS, so
// getting a matching popover (rounded corners, shadow, hover/selected
// highlight) needs a real custom listbox, not just a styled trigger. The
// panel below picks up the same token palette as the trigger.
const DEFAULT_TEXT_COLOR = 'text-primary hover:text-primary-hover [&>svg]:text-primary';

// `textColorClass` lets a caller override just the value/icon color (e.g.
// Attendance.jsx wants a distinct accent for "Present" and red for "Absent") while
// keeping the shared graphite surface, border, and shadows identical.
// `options` accepts plain strings (value === label, e.g. ticket statuses) or
// `{ value, label }` objects for when the id shown to the backend isn't what
// should render (e.g. an employee's id vs. their name).
export function ColorSelect({ value, onChange, options, ariaLabel, textColorClass = DEFAULT_TEXT_COLOR }) {
  const normalized = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={`h-auto w-full pl-3 pr-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wide bg-white/70 backdrop-blur-md border border-white/85 shadow-sm transition-all cursor-pointer hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-primary/20 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-100 ${textColorClass}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[--radix-select-trigger-width] apple-glass border border-white/90 shadow-2xl rounded-2xl p-1.5">
        {normalized.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            className="text-foreground text-xs font-semibold uppercase tracking-wide rounded-lg py-1.5 pl-2.5 cursor-pointer focus:bg-[#180D0F] focus:text-white data-[state=checked]:bg-[#180D0F] data-[state=checked]:text-white"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Shared by every department's Tickets Queue (IT's DashboardPage, HR's
// pages/hr/Tickets.jsx) so they stay pixel-identical instead of drifting
// into slightly different tables. `deptLabel` only changes the status
// column's header text and whether the IT-only VPN ID column shows -
// everything else (search, filters, drawer) is department-agnostic since
// TicketContext already normalizes both collections to the same shape.
// A ticket already marked Resolved/Closed sitting in the default queue view
// forever was the complaint - this is the "history" it moves into instead:
// still fully there, just not cluttering the active worklist. Picking the
// Resolved or Closed filter tab explicitly still shows it.
const HISTORY_STATUSES = ['Resolved', 'Closed'];

export default function TicketsQueueView({ tickets, onStatusChange, onFieldChange, deptLabel = 'IT', showVpnNo = deptLabel === 'IT', showOnlyTitle = deptLabel === 'HR', approvals, showApprovalsColumn = Boolean(approvals), hasMoreTickets, loadMoreTickets, loadingMoreTickets }) {
  const solverOptions = useSolverOptions(deptLabel);
  const defaultSolver = DEFAULT_SOLVER;
  const { user } = useAuth();
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsTicket, setDetailsTicket] = useState(null);

  const statusCounts = useMemo(() => {
    const counts = { All: tickets.filter((t) => !HISTORY_STATUSES.includes(t.status)).length };
    TICKET_STATUSES.forEach((s) => {
      counts[s] = tickets.filter((t) => t.status === s).length;
    });
    return counts;
  }, [tickets]);

  const visible = useMemo(() => {
    return tickets
      .filter((t) => (filter === 'All' ? !HISTORY_STATUSES.includes(t.status) : t.status === filter))
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        return (
          (t.token && t.token.toLowerCase().includes(q)) ||
          (t.id && String(t.id).toLowerCase().includes(q)) ||
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.user && t.user.toLowerCase().includes(q)) ||
          (t.username && t.username.toLowerCase().includes(q)) ||
          (t.employeeId && t.employeeId.toLowerCase().includes(q)) ||
          (t.vpnNo && t.vpnNo.toLowerCase().includes(q)) ||
          (t.dept && t.dept.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.status && t.status.toLowerCase().includes(q)) ||
          (t.employeeStatus && t.employeeStatus.toLowerCase().includes(q)) ||
          (t.solver && t.solver.toLowerCase().includes(q)) ||
          (t.remarks && t.remarks.toLowerCase().includes(q)) ||
          (t.priority && t.priority.toLowerCase().includes(q)) ||
          (t.date && t.date.toLowerCase().includes(q))
        );
      });
  }, [tickets, filter, searchQuery]);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Tickets Queue</h1>
          <p className="text-xs text-muted-foreground">{tickets.length} total tickets</p>
        </div>
        <ItDatePicker />
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket ID, user, issue, dept, status, resolved by..."
              aria-label="Search tickets queue"
              className="w-full bg-white/65 backdrop-blur-md border border-white/85 rounded-xl pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground hover:bg-white/80 focus-visible:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-white/60 backdrop-blur-md p-1 rounded-xl border border-white/80 shadow-sm">
            {['All', ...TICKET_STATUSES].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filter === s
                    ? 'bg-[#180D0F] text-white shadow-md border border-white/15 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-black/5'
                }`}
              >
                {s}
                <span
                  className={`min-w-[18px] px-1 rounded-full text-[10px] leading-[18px] text-center font-bold ${
                    filter === s ? 'bg-white/20 text-white' : 'bg-black/10 text-muted-foreground'
                  }`}
                >
                  {statusCounts[s] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        <DataTable
          rows={visible}
          pageSize={12}
          emptyMessage={
            searchQuery
              ? `No tickets found matching "${searchQuery}".`
              : filter === 'All'
              ? 'No tickets have been raised yet. They appear here as employees submit them.'
              : `No tickets are currently ${filter.toLowerCase()}.`
          }
          columns={[
            {
              key: 'sno',
              label: 'S.No.',
              width: '40px',
              sortable: false,
              render: (_, index) => <span className="text-muted-foreground font-semibold text-xs">{(index ?? 0) + 1}</span>,
            },
            {
              key: 'token',
              label: 'Ticket ID',
              width: '95px',
              render: (t) => <span className="font-bold text-primary text-xs font-mono">{t.token || '-'}</span>,
            },
            {
              key: 'date',
              label: 'Date',
              width: '80px',
              render: (t) => <span className="text-muted-foreground text-xs whitespace-nowrap">{t.date || '-'}</span>,
            },
            {
              key: 'username',
              label: 'Username',
              width: '90px',
              render: (t) => <span className="text-foreground font-medium text-xs truncate block">{t.username || t.user || '-'}</span>,
            },
            {
              key: 'employeeId',
              label: 'Employee ID',
              width: '90px',
              render: (t) => <span className="font-semibold text-primary text-xs">{t.employeeId || '-'}</span>,
            },
            ...(showVpnNo
              ? [
                  {
                    key: 'vpnNo',
                    label: 'VPN ID',
                    width: '80px',
                    render: (t) => <span className="text-muted-foreground font-mono text-[11px]">{t.vpnNo || '-'}</span>,
                  },
                ]
              : []),
            {
              key: 'title',
              label: 'Issue',
              width: '150px',
              render: (t) => (
                // max-w pinned to the column's own width, not just `truncate`
                // alone - an unbroken string with no spaces (no wrap point at
                // all) otherwise forces the column - and the whole table -
                // wider than its declared width instead of actually
                // truncating, since the header's `width` is only a layout
                // hint here, not a hard cap on the cell's content.
                <span className="text-foreground text-xs font-medium block truncate max-w-[150px]" title={t.description || t.title}>
                  {showOnlyTitle ? issueTitle(t) : t.description || t.title}
                </span>
              ),
            },
            {
              key: 'status',
              label: `${deptLabel} Dept Status`,
              width: '135px',
              render: (t) => (
                <ColorSelect
                  value={t.status}
                  onChange={(value) => onStatusChange(t.id, value)}
                  options={TICKET_STATUSES}
                  ariaLabel={`${deptLabel} Status for ticket ${t.token || t.id}`}
                />
              ),
            },
            {
              key: 'employeeStatus',
              label: 'Employee Status',
              width: '120px',
              render: (t) => {
                const statusStr = t.employeeStatus || 'Active';
                const badgeColor =
                  statusStr === 'Satisfied'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : statusStr === 'Closed'
                    ? 'bg-muted text-muted-foreground border-border'
                    : statusStr === 'Pending'
                    ? 'bg-[#A76C76]/15 text-[#671421] border-[#A76C76]/40'
                    : 'bg-[#671421]/10 text-[#671421] border-[#671421]/20';

                return (
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold whitespace-nowrap ${badgeColor}`}
                    title="Only the employee who raised this ticket can edit Employee Status"
                  >
                    {statusStr}
                  </span>
                );
              },
            },
            {
              key: 'solver',
              label: 'Resolved By',
              width: '110px',
              render: (t) => {
                const currentSolver = t.solver || defaultSolver;
                // A ticket resolved before this dropdown went dynamic can
                // carry a value (e.g. a retired "Team 1") that's no longer in
                // the live staff list - keep it selectable so the trigger
                // doesn't just render blank.
                const options = solverOptions.includes(currentSolver) ? solverOptions : [currentSolver, ...solverOptions];
                return (
                  <ColorSelect
                    value={currentSolver}
                    onChange={(value) => onFieldChange && onFieldChange(t.id, 'solver', value)}
                    options={options}
                    ariaLabel={`Resolved by for ticket ${t.token || t.id}`}
                  />
                );
              },
            },
            {
              key: 'remarks',
              label: 'Remarks',
              sortable: false,
              width: '130px',
              render: (t) => (
                <input
                  type="text"
                  value={t.remarks || ''}
                  onChange={(e) => onFieldChange && onFieldChange(t.id, 'remarks', e.target.value)}
                  placeholder="Type remarks..."
                  className="w-full bg-background border border-input rounded-md px-2 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60"
                />
              ),
            },
            {
              key: 'actions',
              label: 'View',
              width: '55px',
              sortable: false,
              render: (t) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailsTicket(t);
                  }}
                  title="View All Ticket Details"
                  aria-label={`View details for ticket ${t.token || t.id}`}
                  className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Eye size={15} />
                </button>
              ),
            },
            ...(showApprovalsColumn
              ? [
                  {
                    key: 'approvals',
                    label: 'Approvals',
                    width: '110px',
                    sortable: false,
                    render: (t) => {
                      const approval = findApproval(approvals, t.id);
                      // t.status flips to 'Waiting Approval' optimistically the
                      // instant onStatusChange is called (TicketContext updates
                      // local state before the request resolves) - using it here
                      // too means the button locks immediately, not only once the
                      // approvals list next polls, so a second click can't fire a
                      // duplicate "send for approval" request.
                      const status = approval?.status || (t.status === 'Waiting Approval' ? 'pending_founder' : null);

                      if (status === 'approved') {
                        return (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold whitespace-nowrap">
                            <CheckCircle2 size={13} /> Approved
                          </span>
                        );
                      }
                      if (status === 'rejected') {
                        return (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-xs font-bold whitespace-nowrap">
                            <XCircle size={13} /> Not Approved
                          </span>
                        );
                      }
                      if (status === 'pending_founder') {
                        return (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#A76C76]/15 text-[#671421] border border-[#A76C76]/40 text-xs font-bold whitespace-nowrap">
                            <Clock size={13} /> Pending
                          </span>
                        );
                      }
                      // Not sent yet - clicking sends the ticket to the
                      // Founder's Approval Center, same as picking "Waiting
                      // Approval" from the status dropdown above (backend
                      // creates the approvals/{id} record either way).
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(t.id, 'Waiting Approval');
                          }}
                          title="Send this ticket to the Founder's Approval Center"
                          aria-label={`Send ticket ${t.token || t.id} for approval`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-accent text-foreground border border-border transition-colors cursor-pointer text-xs font-semibold whitespace-nowrap"
                        >
                          <CheckSquare size={13} />
                          Approvals
                        </button>
                      );
                    },
                  },
                ]
              : []),
          ]}
        />
        {hasMoreTickets && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={loadMoreTickets}
              disabled={loadingMoreTickets}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMoreTickets ? 'Loading…' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Full record - Drawer showing Category, Subcategory, and all details */}
      <Drawer open={!!detailsTicket} onClose={() => setDetailsTicket(null)} title={detailsTicket ? `Ticket Details - ${detailsTicket.token}` : 'Ticket Details'}>
        {detailsTicket && (
          <div className="flex flex-col gap-4 text-xs font-sans">
            <div className="bg-muted/60 border border-border rounded-xl p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary font-mono">{detailsTicket.token}</span>
                <span className="px-2.5 py-0.5 rounded-full border font-semibold bg-primary/10 text-primary border-primary/20">
                  {detailsTicket.status}
                </span>
              </div>
              <div className="text-sm font-bold text-foreground mt-1 break-words">
                {detailsTicket.description || detailsTicket.title}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-muted-foreground font-semibold mb-0.5">Employee ID</div>
                <div className="font-bold text-primary text-sm">{detailsTicket.employeeId || '-'}</div>
              </div>

              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-muted-foreground font-semibold mb-0.5">Requester Name</div>
                <div className="font-semibold text-foreground">{detailsTicket.user || '-'}</div>
              </div>

              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-muted-foreground font-semibold mb-0.5">Role</div>
                <div className="font-semibold text-foreground">{detailsTicket.role || 'Employee'}</div>
              </div>

              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-muted-foreground font-semibold mb-0.5">Category</div>
                <div className="font-semibold text-foreground">{detailsTicket.category || 'N/A'}</div>
              </div>

              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-muted-foreground font-semibold mb-0.5">Subcategory</div>
                <div className="font-semibold text-foreground">{detailsTicket.subcategory || detailsTicket.sub_category || 'N/A'}</div>
              </div>

              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-muted-foreground font-semibold mb-0.5">Priority</div>
                <div className="font-semibold text-foreground">{detailsTicket.priority || 'Medium'}</div>
              </div>

              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-muted-foreground font-semibold mb-0.5">Employee Status</div>
                <div className="font-semibold text-primary">{detailsTicket.employeeStatus || 'Active'}</div>
              </div>

              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-muted-foreground font-semibold mb-0.5">Resolved By</div>
                <div className="font-semibold text-foreground">{detailsTicket.solver || defaultSolver}</div>
              </div>

              {showVpnNo && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-muted-foreground font-semibold mb-0.5">VPN No</div>
                  <div className="font-mono text-foreground">{detailsTicket.vpnNo || '-'}</div>
                </div>
              )}

              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-muted-foreground font-semibold mb-0.5">Date</div>
                <div className="text-foreground">{detailsTicket.date || '-'}</div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-muted-foreground font-semibold mb-0.5">Remarks</div>
              <div className="text-foreground">{detailsTicket.remarks || 'No remarks yet'}</div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
