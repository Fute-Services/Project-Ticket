import { useState } from 'react';
import { Server, ChevronDown } from 'lucide-react';
import ItDatePicker from './ItDatePicker';

export default function DataRequestsView({ requests, onNewRequest }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5">Data Requests</h1>
          <p className="text-xs text-muted-foreground">{requests.length} transfer requests</p>
        </div>
        <div className="flex items-center gap-2.5">
          <ItDatePicker />
          <button
            type="button"
            onClick={onNewRequest}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
          >
            <Server size={15} />
            <span>New Data Request</span>
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        {requests.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No data transfer requests yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {requests.map((d) => {
              const expanded = expandedId === d.id;
              const hasDetails = d.requesterName || d.requesterNumber || d.backupName || d.priority || d.targetApprover || d.serverTag;
              return (
                <div key={d.id} className="rounded-lg bg-muted border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => hasDetails && setExpandedId(expanded ? null : d.id)}
                    aria-expanded={expanded}
                    className={`w-full p-3.5 flex items-center justify-between gap-3 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shrink-0">
                        <Server size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{d.path}</div>
                        <div className="text-xs text-muted-foreground truncate">{d.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                          d.status === 'Completed'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : d.status === 'In Progress'
                            ? 'bg-muted/10 text-muted-foreground border-muted/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                        }`}
                      >
                        {d.status}
                      </span>
                      {hasDetails && (
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </button>

                  {expanded && hasDetails && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                      {d.requesterName && (
                        <div>
                          <div className="text-xs text-muted-foreground">Requester Contact</div>
                          <div className="text-xs font-semibold text-foreground">{d.requesterName}{d.requesterNumber ? ` · ${d.requesterNumber}` : ''}</div>
                        </div>
                      )}
                      {d.backupName && (
                        <div>
                          <div className="text-xs text-muted-foreground">Backup Name</div>
                          <div className="text-xs font-semibold text-foreground">{d.backupName}</div>
                        </div>
                      )}
                      {d.priority && (
                        <div>
                          <div className="text-xs text-muted-foreground">Priority</div>
                          <div className="text-xs font-semibold text-foreground">{d.priority}</div>
                        </div>
                      )}
                      {d.targetApprover && (
                        <div>
                          <div className="text-xs text-muted-foreground">Target Approver</div>
                          <div className="text-xs font-semibold text-foreground">{d.targetApprover}</div>
                        </div>
                      )}
                      {d.serverTag && (
                        <div>
                          <div className="text-xs text-muted-foreground">Tag</div>
                          <div className="text-xs font-semibold text-foreground">{d.serverTag}</div>
                        </div>
                      )}
                      {d.purpose && (
                        <div className="col-span-2 sm:col-span-3">
                          <div className="text-xs text-muted-foreground">Purpose</div>
                          <div className="text-xs text-foreground">{d.purpose}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
