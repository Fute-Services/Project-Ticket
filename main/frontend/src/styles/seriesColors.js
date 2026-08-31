/**
 * Chart and department accent colours, bound to the theme.
 *
 * These used to be literal hexes baked into components. That works in one
 * theme and fails in the other: the pale end of the ramp (#f7b08a, #bdbdbd)
 * is fine on a black page and effectively invisible on a white one. Reading
 * the tokens instead means the light theme can run a darker ramp than the
 * dark theme, which is what legibility actually requires.
 *
 * Values are `hsl(var(--chart-n))` strings so they drop straight into inline
 * `style` and into Recharts `fill`/`stroke` props.
 */

export const SERIES = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
];

/**
 * Faded version of a series colour, for tinted icon badges and stripes.
 *
 * Replaces the old `` `${hex}1a` `` trick, which only worked because the
 * colour was a hex string - appending two alpha digits to `hsl(var(--x))`
 * produces garbage. Swapping the closing paren for ` / alpha)` keeps the
 * inner `var()` intact and works for any theme value.
 */
export function tint(color, alpha) {
  if (typeof color !== 'string') return color;
  if (color.startsWith('hsl(')) return color.replace(/\)$/, ` / ${alpha})`);
  // Legacy hex fallback - 0.1 -> '1a'
  return `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}
