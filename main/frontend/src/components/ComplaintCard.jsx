import { motion } from 'framer-motion';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { STATUSES } from '../utils/constants';
import { timeAgo, formatDateTime } from '../utils/duration';
import { Clock, RefreshCw, Tag } from 'lucide-react';
import { useTilt } from '../hooks/useTilt';

// Reusable card for displaying a single complaint (used in all dashboards).
// Entrance animation and tilt sit on separate elements — framer-motion's inline
// transform would otherwise clobber the tilt once the entrance finishes.
export default function ComplaintCard({ complaint, deptTag, onStatusChange, canUpdateStatus }) {
  const isIT = deptTag === 'IT' || !!complaint.category;
  const tilt = useTilt({ max: 4, lift: 3 });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="h-full">
    <div
      {...tilt}
      className="surface tilt lift rounded-2xl p-5 flex flex-col gap-3 h-full hover:border-brand-500/30"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-lg">
            {complaint.token}
          </span>
          {deptTag && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
              deptTag === 'HR'
                ? 'bg-purple-500/15 text-purple-400'
                : 'bg-cyan-500/15 text-cyan-400'
            }`}>
              {deptTag}
            </span>
          )}
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
        </div>
        <span className="text-xs text-white/30" title={formatDateTime(complaint.submitted_at)}>
          {timeAgo(complaint.submitted_at)}
        </span>
      </div>

      {/* Name + Department */}
      <div>
        <p className="font-semibold text-white">{complaint.name}</p>
        <p className="text-sm text-white/40">{complaint.department}</p>
      </div>

      {/* IT-specific fields */}
      {isIT && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-white/40">
            <Tag size={11} /> {complaint.category}
          </span>
          {complaint.sub_category && (
            <span className="text-xs text-white/30">→ {complaint.sub_category}</span>
          )}
          {complaint.approval !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              complaint.approval ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              Approval: {complaint.approval ? 'Yes' : 'No'}
            </span>
          )}
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-white/60 line-clamp-2">{complaint.description}</p>

      {/* Relative timestamps — humans read "2 hours ago", not an ISO string */}
      <div className="flex items-center gap-4 text-xs text-white/30 flex-wrap">
        <span className="flex items-center gap-1" title={formatDateTime(complaint.submitted_at)}>
          <Clock size={11} /> Raised {timeAgo(complaint.submitted_at)}
        </span>
        {complaint.updated_at && complaint.updated_at !== complaint.submitted_at && (
          <span className="flex items-center gap-1" title={formatDateTime(complaint.updated_at)}>
            <RefreshCw size={11} /> Updated {timeAgo(complaint.updated_at)}
          </span>
        )}
      </div>

      {/* Status update (HR/IT/Founder only) */}
      {canUpdateStatus && (
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <span className="text-xs text-white/30">Update Status:</span>
          <select
            value={complaint.status}
            onChange={(e) => onStatusChange(complaint.id, e.target.value, isIT ? 'IT' : 'HR')}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-brand-500"
          >
            {STATUSES.map(s => (
              <option key={s} value={s} className="bg-[#1e1e2e]">{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
    </motion.div>
  );
}
