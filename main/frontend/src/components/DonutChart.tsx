import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

type Slice = {
  label: string;
  value: number;
  /** Optional. Ignored for geometry - kept so existing callers still compile. */
  percent?: number;
  color: string;
};

type Props = {
  title: string;
  /** Shown in the centre. Defaults to the sum of the slices. */
  total?: number;
  data: Slice[];
};

/**
 * Donut + legend, backed by Recharts.
 *
 * Arc geometry is derived from `value`, never from a caller-supplied
 * `percent`. The previous hand-rolled SVG trusted `percent`, so a dataset
 * whose percentages summed to 174% silently drew arcs on top of each other.
 * Deriving from `value` makes that class of bug impossible.
 */
export default function DonutChart({ title, total, data }: Props) {
  const slices = (data || []).filter((d) => d && d.value > 0);
  const sum = slices.reduce((s, d) => s + d.value, 0);
  const centre = total ?? sum;

  return (
    <div className="bg-card border border-border rounded-lg shadow p-4 flex flex-col h-full">
      <h3 className="text-sm font-medium text-foreground mb-3">{title}</h3>

      {slices.length === 0 ? (
        <p className="text-xs text-muted-foreground py-10 text-center flex-1 flex items-center justify-center">
          No data to chart yet.
        </p>
      ) : (
        <div className="flex flex-row items-center gap-4 my-auto">
          <div className="relative w-28 h-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.label} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    color: 'hsl(var(--popover-foreground))',
                    boxShadow: 'var(--shadow)',
                  }}
                  labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  formatter={(value: number, name: string) => [
                    `${value} (${sum ? Math.round((value / sum) * 100) : 0}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centre total sits above the chart rather than inside the SVG so
                it stays crisp and selectable. */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-semibold text-foreground leading-none">{centre}</span>
              <span className="text-xs text-muted-foreground mt-0.5">Total</span>
            </div>
          </div>

          <ul className="flex flex-col gap-1.5 w-full min-w-0">
            {slices.map((s) => {
              const pct = sum ? Math.round((s.value / sum) * 100) : 0;
              return (
                <li key={s.label} className="flex items-center justify-between text-xs gap-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground truncate">{s.label}</span>
                  </span>
                  <span className="text-foreground font-medium shrink-0 tabular-nums">
                    {pct}% <span className="text-muted-foreground font-normal">({s.value})</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
