import { motion } from 'framer-motion';
import { useTilt } from '../hooks/useTilt';

/**
 * A single headline number on a dashboard — the thing someone reads before
 * they read any table.
 *
 * The entrance animation and the tilt live on different elements on purpose:
 * framer-motion writes an inline `transform`, which would otherwise overwrite
 * the tilt's transform the moment the entrance finishes.
 */
export default function StatTile({ label, value, hint, icon: Icon, accent = 'text-white', loading }) {
  const tilt = useTilt({ max: 7, lift: 5 });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div {...tilt} className="surface tilt lift rounded-2xl p-5 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">{label}</span>
          {Icon && <Icon size={15} className={accent} />}
        </div>
        <span className={`text-3xl font-bold tabular-nums ${accent}`}>
          {loading ? <span className="text-white/20">—</span> : value}
        </span>
        {hint && <span className="text-xs text-white/30">{hint}</span>}
      </div>
    </motion.div>
  );
}
