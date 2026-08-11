// Discord-style pill toggle — no radix-switch dependency installed, and
// every other interactive control in this app (ItDeskLayout nav buttons,
// FounderHrView, etc.) is a plain styled element rather than a shadcn
// primitive, so this matches that convention instead of introducing one.
export function Switch({ checked, onCheckedChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${checked ? 'bg-primary shadow-inner' : 'bg-muted-foreground/25 hover:bg-muted-foreground/35 shadow-inner'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200 ease-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
