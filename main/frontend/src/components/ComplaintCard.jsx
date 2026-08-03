import { motion } from 'framer-motion';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { Clock, Calendar, Tag } from 'lucide-react';

// Reusable card for displaying a single complaint (used in all dashboards)
export default function ComplaintCard({ complaint, deptTag, onStatusChange, canUpdateStatus }) {
  const isIT = deptTag === 'IT' || !!complaint.category;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5 flex flex-col gap-3 hover:border-brand-500/30 transition-colors"
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
        <span className="text-xs text-white/30">{new Date(complaint.submitted_at).toLocaleDateString()}</span>
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

      {/* Duration + Date */}
      <div className="flex items-center gap-4 text-xs text-white/30 flex-wrap">
        <span className="flex items-center gap-1"><Clock size={11} /> {complaint.duration}</span>
        <span className="flex items-center gap-1"><Calendar size={11} /> {complaint.complaint_date}</span>
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
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      )}
    </motion.div>
  );
}
