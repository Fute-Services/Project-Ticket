import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Light/dark switch for the dashboard headers. Renders the icon of the theme
 * you'd switch *to*, which is the convention users expect from this control.
 */
export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`w-9 h-9 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center transition-colors cursor-pointer shrink-0 ${className}`}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
