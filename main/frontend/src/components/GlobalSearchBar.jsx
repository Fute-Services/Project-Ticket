import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserRound, Ticket, HardDrive, Building2, X } from 'lucide-react';
import { globalSearch } from '../utils/api';

const TYPE_ICON = { user: UserRound, ticket: Ticket, asset: HardDrive, department: Building2 };
// Only these two types have a real page to land on - tickets/assets have no
// dedicated Super Admin detail view yet, so those results show as
// informational rows only, not fabricated links to nowhere.
const TYPE_ROUTE = { user: '/superadmin/users', department: '/superadmin/departments' };

export default function GlobalSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      globalSearch(query.trim())
        .then(({ data }) => setResults(data))
        .catch(() => setResults(null));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const flatResults = results ? [...results.users, ...results.tickets, ...results.assets, ...results.departments] : [];

  function handleSelect(item) {
    setOpen(false);
    setQuery('');
    setResults(null);
    const route = TYPE_ROUTE[item.type];
    if (route) navigate(route);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="h-9 flex items-center gap-2 px-3 rounded-xl bg-muted border border-border focus-within:border-primary/40 transition-colors">
        <Search size={14} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search users, tickets, assets, departments…"
          className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-full"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setResults(null); }} className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer">
            <X size={13} />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute top-full left-0 mt-1.5 w-full max-h-96 overflow-y-auto bg-card border border-border rounded-xl shadow-2xl z-50 p-1.5">
          {!results ? (
            <p className="text-xs text-muted-foreground px-3 py-3">Searching…</p>
          ) : flatResults.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-3">No matches for "{query}".</p>
          ) : (
            flatResults.map((item) => {
              const Icon = TYPE_ICON[item.type];
              const clickable = Boolean(TYPE_ROUTE[item.type]);
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  disabled={!clickable}
                  onClick={() => handleSelect(item)}
                  title={clickable ? undefined : 'No detail page for this type yet'}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                    clickable ? 'hover:bg-accent cursor-pointer' : 'cursor-default opacity-70'
                  }`}
                >
                  <Icon size={14} className="shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground truncate">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{item.sublabel}</div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                    {item.type}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
