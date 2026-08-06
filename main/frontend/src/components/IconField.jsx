/**
 * Labelled input with a leading icon — the Email/Password field pattern used
 * on both auth pages. `right` is an optional slot for a trailing control
 * (the password show/hide toggle).
 */
export default function IconField({ icon: Icon, label, right, className = '', ...inputProps }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase select-none">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <Icon
            aria-hidden="true"
            size={18}
            className="absolute left-3.5 text-gray-400 pointer-events-none shrink-0"
          />
        )}
        <input
          {...inputProps}
          className={`w-full bg-[#18181c] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors ${
            Icon ? 'pl-11' : ''
          } ${right ? 'pr-11' : ''} ${className}`}
        />
        {right}
      </div>
    </div>
  );
}
