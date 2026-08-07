import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Shared chart chrome. Every value here reads from a CSS variable, so charts
 * re-theme with the rest of the app instead of carrying baked-in colours.
 */
const axisProps = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipProps = {
  cursor: { fill: 'hsl(var(--muted))' },
  contentStyle: {
    background: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    color: 'hsl(var(--popover-foreground))',
    boxShadow: 'var(--shadow)',
  },
  labelStyle: { color: 'hsl(var(--popover-foreground))', fontWeight: 500 },
} as const;

type Series = { key: string; label: string; color: string };

function ChartFrame({
  title,
  subtitle,
  children,
  empty,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg shadow p-4 flex flex-col h-full">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {empty ? (
        <p className="text-xs text-muted-foreground flex-1 flex items-center justify-center py-10">
          Nothing to chart for this period yet.
        </p>
      ) : (
        <div className="flex-1 min-h-[180px]">{children}</div>
      )}
    </div>
  );
}

/**
 * Grouped or stacked bars. `stacked` is what the SLA view wants (met vs
 * breached inside one column); leave it off for side-by-side comparison.
 */
export function BarChartCard({
  title,
  subtitle,
  data,
  xKey,
  series,
  stacked = false,
}: {
  title: string;
  subtitle?: string;
  data: any[];
  xKey: string;
  series: Series[];
  stacked?: boolean;
}) {
  return (
    <ChartFrame title={title} subtitle={subtitle} empty={!data?.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} width={38} allowDecimals={false} />
          <Tooltip {...tooltipProps} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? 'a' : undefined}
              // Only the top bar of a stack gets rounded corners.
              radius={stacked && i < series.length - 1 ? 0 : [4, 4, 0, 0]}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Trend over time. */
export function LineChartCard({
  title,
  subtitle,
  data,
  xKey,
  series,
  unit = '',
}: {
  title: string;
  subtitle?: string;
  data: any[];
  xKey: string;
  series: Series[];
  unit?: string;
}) {
  return (
    <ChartFrame title={title} subtitle={subtitle} empty={!data?.length}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} width={38} />
          <Tooltip {...tooltipProps} formatter={(v: number) => `${v}${unit}`} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: s.color }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
