import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ItDatePicker from './ItDatePicker';
import DataTable from './DataTable';
import { Drawer } from './ui';
import { Search, X, Eye, CheckSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';

// Requests raised through NewHrTicketModal combine its separate Title +
// Description fields into one string ("Title: Description") before they
// ever reach the backend (TicketContext.addTicket — hr_complaints has no
// title column of its own). The Issue column shows only the title part for
// HR so the queue stays scannable; the drawer below still shows the full
// combined text via `description`.
function issueTitle(t) {
  const full = t.description || t.title || '';
  const sep = full.indexOf(': ');
  return sep === -1 ? full : full.slice(0, sep);
}

// Most recent approval record linked back to this ticket (approvals/{id}
// has complaintRef: { collection, id } — set automatically by
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

// Shared by every department's Tickets Queue (IT's DashboardPage, HR's
// pages/hr/Tickets.jsx) so they stay pixel-identical instead of drifting
// into slightly different tables. `deptLabel` only changes the status
// column's header text and whether the IT-only VPN ID column shows —
// everything else (search, filters, drawer) is department-agnostic since
// TicketContext already normalizes both collections to the same shape.
export default function TicketsQueueView({ tickets, onStatusChange, onFieldChange, deptLabel = 'IT', showVpnNo = deptLabel === 'IT', showOnlyTitle = deptLabel === 'HR', approvals, showApprovalsColumn = Boolean(approvals), hasMoreTickets, loadMoreTickets, loadingMoreTickets }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsTicket, setDetailsTicket] = useState(null);

  const visible = useMemo(() => {
    return tickets
      .filter((t) => filter === 'All' || t.status === filter)
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
              className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

          <div className="flex flex-wrap gap-1.5">
            {['All', ...TICKET_STATUSES].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
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
              key: 'date',
              label: 'Date',
              width: '80px',
              render: (t) => <span className="text-muted-foreground text-xs whitespace-nowrap">{t.date || '—'}</span>,
            },
            {
              key: 'username',
              label: 'Username',
              width: '90px',
              render: (t) => <span className="text-foreground font-medium text-xs truncate block">{t.username || t.user || '—'}</span>,
            },
            {
              key: 'employeeId',
              label: 'Employee ID',
              width: '90px',
              render: (t) => <span className="font-semibold text-primary text-xs">{t.employeeId || '—'}</span>,
            },
            ...(showVpnNo
              ? [
                  {
                    key: 'vpnNo',
                    label: 'VPN ID',
                    width: '80px',
                    render: (t) => <span className="text-muted-foreground font-mono text-[11px]">{t.vpnNo || '—'}</span>,
                  },
                ]
              : []),
            {
              key: 'role',
              label: 'Role',
              width: '85px',
              render: (t) => <span className="text-muted-foreground text-xs truncate block">{t.role || 'Employee'}</span>,
            },
            {
              key: 'title',
              label: 'Issue',
              width: '150px',
              render: (t) => (
                <span className="text-foreground text-xs font-medium block truncate" title={t.description || t.title}>
                  {showOnlyTitle ? issueTitle(t) : t.description || t.title}
                </span>
              ),
            },
            {
              key: 'status',
              label: `${deptLabel} Dept Status`,
              width: '135px',
              render: (t) => (
                <select
                  value={t.status}
                  onChange={(e) => onStatusChange(t.id, e.target.value)}
                  aria-label={`${deptLabel} Status for ticket ${t.token || t.id}`}
                  className="w-full bg-muted border border-border rounded-lg px-1.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
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
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : statusStr === 'Closed'
                    ? 'bg-muted text-muted-foreground border-border'
                    : statusStr === 'Pending'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20';

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
              render: (t) => (
                <select
                  value={t.solver || 'Team 1'}
                  onChange={(e) => onFieldChange && onFieldChange(t.id, 'solver', e.target.value)}
                  aria-label={`Resolved by for ticket ${t.token || t.id}`}
                  className="w-full bg-muted/70 border border-border rounded-lg px-1.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5', 'Unassigned'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ),
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
                      // local state before the request resolves) — using it here
                      // too means the button locks immediately, not only once the
                      // approvals list next polls, so a second click can't fire a
                      // duplicate "send for approval" request.
                      const status = approval?.status || (t.status === 'Waiting Approval' ? 'pending_founder' : null);

                      if (status === 'approved') {
                        return (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold whitespace-nowrap">
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-bold whitespace-nowrap">
                            <Clock size={13} /> Pending
                          </span>
                        );
                      }
                      // Not sent yet — clicking sends the ticket to the
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

      {/* Full record — Drawer showing Category, Subcategory, and all details */}
      <Drawer open={!!detailsTicket} onClose={() => setDetailsTicket(null)} title={detailsTicket ? `Ticket Details — ${detailsTicket.token}` : 'Ticket Details'}>
        {detailsTicket && (
          <div className="flex flex-col gap-4 text-xs font-sans">
            <div className="bg-muted/60 border border-border rounded-xl p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary font-mono">{detailsTicket.token}</span>
                <span className="px-2.5 py-0.5 rounded-full border font-semibold bg-primary/10 text-primary border-primary/20">
                  {detailsTicket.status}
                </span>
              </div>
              <div className="text-sm font-bold text-foreground mt-1">
                {detailsTicket.description || detailsTicket.title}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-muted-foreground font-semibold mb-0.5">Employee ID</div>
                <div className="font-bold text-primary text-sm">{detailsTicket.employeeId || '—'}</div>
              </div>

              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-muted-foreground font-semibold mb-0.5">Requester Name</div>
                <div className="font-semibold text-foreground">{detailsTicket.user || '—'}</div>
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
                <div className="font-semibold text-foreground">{detailsTicket.solver || 'Team 1'}</div>
              </div>

              {showVpnNo && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-muted-foreground font-semibold mb-0.5">VPN No</div>
                  <div className="font-mono text-foreground">{detailsTicket.vpnNo || '—'}</div>
                </div>
              )}

              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-muted-foreground font-semibold mb-0.5">Date</div>
                <div className="text-foreground">{detailsTicket.date || '—'}</div>
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
