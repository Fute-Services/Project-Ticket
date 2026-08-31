import { useId } from 'react';

/**
 * Labelled input with a leading icon - the Email/Password field pattern used
 * on both auth pages. `right` is an optional slot for a trailing control
 * (the password show/hide toggle).
 *
 * The label is tied to the input with a generated id. It used to be a bare
 * `<label>` sitting next to the field with no `htmlFor`, which looks correct
 * but associates nothing: screen readers announced the inputs unlabelled,
 * clicking the label didn't focus the field, and password managers had no
 * name to key off. An explicit id caller-side still wins.
 */
export default function IconField({ icon: Icon, label, right, className = '', id, ...inputProps }) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <Icon
            aria-hidden="true"
            size={18}
            className="absolute left-3.5 text-muted-foreground pointer-events-none shrink-0"
          />
        )}
        <input
          id={inputId}
          {...inputProps}
          className={`w-full bg-muted border border-border rounded-xl px-3.5 py-3 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors ${
            Icon ? 'pl-11' : ''
          } ${right ? 'pr-11' : ''} ${className}`}
        />
        {right}
      </div>
    </div>
  );
}
