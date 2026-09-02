import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Apple-style Glassmorphism Custom Select Dropdown
 * Replaces ugly native browser <select> with a macOS/iOS frosted glass menu.
 */
export default function AppleSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  className = '',
  buttonClassName = '',
  ariaLabel,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Normalize options: can be array of strings or array of { value, label }
  const normalizedOptions = options.map((opt) =>
    typeof opt === 'object' && opt !== null ? opt : { value: opt, label: String(opt) }
  );

  const selectedOption = normalizedOptions.find((o) => String(o.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  function handleSelect(optValue) {
    onChange?.(optValue);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        className={`w-full min-h-[38px] bg-white/70 backdrop-blur-md hover:bg-white/85 border border-white/85 rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground flex items-center justify-between gap-2 shadow-sm transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
          isOpen ? 'ring-2 ring-primary/20 border-primary/40 bg-white/95 shadow-md' : ''
        } ${buttonClassName}`}
      >
        <span className="truncate text-left">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={`text-muted-foreground shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-foreground' : ''
          }`}
        />
      </button>

      {/* Floating Apple Glass Popup Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel || placeholder}
          className="absolute z-[100] top-full left-0 mt-1.5 w-full min-w-[180px] max-h-[260px] overflow-y-auto apple-glass border border-white/90 rounded-2xl shadow-2xl p-1.5 space-y-0.5 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between gap-2 text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[#180D0F] text-white font-bold shadow-md border border-white/15'
                    : 'text-foreground hover:bg-black/5 hover:text-foreground active:scale-[0.99]'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="text-rose-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
