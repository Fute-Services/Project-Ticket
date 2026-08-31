import React from 'react';
import { DEPT_DEMO } from '../data/deptDemoData';

/**
 * Renders any of the demo departments (Sales, Developers, Marketing, Branding,
 * Production) from `deptDemoData`.
 *
 * One component for five departments because the *layout* question is the same
 * for all of them - four headline numbers, a breakdown, what needs attention,
 * what just finished. The content differs per department and lives in the data
 * file, so this stays a renderer with no department knowledge in it.
 *
 * The "Demo data" badge is not decoration: these five have no backend, and a
 * founder looking at ₹42.8L of pipeline needs to know it isn't real.
 */

const TONE = {
  primary: 'bg-primary/10 border-primary/30 text-primary',
  warning: 'bg-warning/15 border-warning/30 text-warning',
  destructive: 'bg-destructive/15 border-destructive/30 text-destructive',
  muted: 'bg-muted border-border text-muted-foreground',
};

// Log rows carry a plain-word outcome; anything that reads as a miss gets the
// destructive tone so a bad week can't hide inside a wall of neutral chips.
const MISS = ['Lost', 'Late', 'Under target'];

function logTone(status) {
  if (MISS.includes(status)) return TONE.destructive;
  if (status === 'Staging') return TONE.warning;
  return TONE.primary;
}

export default function FounderDeptView({ dept }) {
  const data = DEPT_DEMO[dept.id];
  if (!data) return null;

  const Icon = dept.icon;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
            <Icon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">{dept.label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{data.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-muted border border-border text-muted-foreground">
            {data.badge}
          </span>
          <span
            className="text-xs font-semibold uppercase px-3 py-1.5 rounded-xl bg-warning/15 border border-warning/30 text-warning"
            title="This department has no live data source connected yet"
          >
            Demo data
          </span>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {data.kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-card border border-border hover:border-muted-foreground/40 rounded-2xl p-4 flex flex-col justify-between transition-all"
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
            <div className="mt-3 flex items-baseline gap-2 flex-wrap">
              <span className={`text-2xl font-semibold ${kpi.tone === 'primary' ? 'text-primary' : 'text-foreground'}`}>
                {kpi.value}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{kpi.note}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown - meters, not a chart: these are parts of one known total */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3.5">
        <div className="flex items-center justify-between border-b border-border pb-2.5 gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{data.breakdownTitle}</h3>
            <p className="text-xs text-muted-foreground">{data.breakdownNote}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {data.breakdown.map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-44 shrink-0 truncate font-semibold">{row.label}</span>
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground w-28 text-right shrink-0">
                {row.count} {data.breakdownUnit} ({row.pct}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Needs attention + recently finished */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="border-b border-border pb-2.5">
            <h3 className="text-sm font-semibold text-foreground">{data.itemsTitle}</h3>
            <p className="text-xs text-muted-foreground">{data.itemsNote}</p>
          </div>

          <div className="flex flex-col gap-3">
            {data.items.map((item) => (
              <div key={item.id} className="bg-muted border border-border rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-foreground">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{item.meta}</p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg border ${TONE[item.tone] || TONE.muted}`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border gap-2">
                  <span className="truncate">
                    <strong>{item.id}</strong> · {item.owner}
                  </span>
                  <span className="shrink-0">{item.age}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="border-b border-border pb-2.5">
            <h3 className="text-sm font-semibold text-foreground">{data.logTitle}</h3>
            <p className="text-xs text-muted-foreground">Closed out in the last few weeks</p>
          </div>

          <div className="flex flex-col gap-3">
            {data.log.map((entry) => (
              <div
                key={entry.title}
                className="bg-muted border border-border rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-foreground truncate">{entry.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.detail}</p>
                  <span className="text-xs text-muted-foreground block mt-1">
                    {entry.by} · {entry.when}
                  </span>
                </div>

                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border shrink-0 ${logTone(entry.status)}`}>
                  {entry.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
