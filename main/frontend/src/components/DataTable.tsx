import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export type Column<T = any> = {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right';
  width?: string;
  render?: (row: T, index?: number) => React.ReactNode;
  /** Not shown on small screens - the row card shows it instead. */
  hideOnMobile?: boolean;
};

type Props<T = any> = {
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  getRowKey?: (row: T, i: number) => string | number;
  maxHeight?: string;
  /** Renders a built-in search box filtering across `searchKeys`. */
  searchable?: boolean;
  searchKeys?: string[];
  searchPlaceholder?: string;
  /** Shows skeleton rows instead of data. */
  loading?: boolean;
};

/**
 * The one table used across the dashboards - sortable headers, sticky header
 * row, paging, search, a real empty state, skeleton loading, and a card
 * layout on narrow screens instead of a horizontal scrollbar.
 *
 * `render` is for cell markup (badges, selects). Sorting always uses the raw
 * `row[key]`, so a column can look however it likes and still sort correctly.
 */
export default function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  pageSize = 10,
  emptyMessage = 'Nothing to show yet.',
  emptyAction = null,
  getRowKey = (row: any, i: number) => row?.id ?? i,
  maxHeight = '460px',
  searchable = false,
  searchKeys,
  searchPlaceholder = 'Search…',
  loading = false,
}: Props<T>) {
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' }>({ key: null, dir: 'asc' });
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');

  const searched = useMemo(() => {
    if (!searchable || !query.trim()) return rows;
    const q = query.trim().toLowerCase();
    const keys = searchKeys?.length ? searchKeys : columns.map((c) => c.key);
    return rows.filter((r) => keys.some((k) => String(r?.[k] ?? '').toLowerCase().includes(q)));
  }, [rows, query, searchable, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sort.key) return searched;
    const copy = [...searched];
    copy.sort((a, b) => {
      const av = a[sort.key as string];
      const bv = b[sort.key as string];
      if (av == null) return 1;
      if (bv == null) return -1;
      // Numbers compare numerically, everything else as case-insensitive text
      // - otherwise "10" sorts before "9" and dates sort by first digit.
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [searched, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Filtering can shrink the list under the current page - clamp rather than
  // stranding the user on an empty page they can't navigate out of.
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleSort(key: string) {
    setPage(0);
    // Same column toggles direction; a new column always starts ascending.
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  const searchBox = searchable ? (
    <div className="relative mb-3">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(0);
        }}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="flex h-9 w-full rounded-xl border border-white/85 bg-white/70 backdrop-blur-md pl-9 pr-3 py-1 text-xs text-foreground shadow-sm transition-all placeholder:text-muted-foreground hover:bg-white/85 focus-visible:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50"
      />
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {searchBox}
        <div className="rounded-2xl border border-white/80 bg-white/40 backdrop-blur-md overflow-hidden shadow-sm">
          {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-3 py-3 border-b border-black/5 last:border-0">
              {columns.map((c) => (
                <Skeleton key={c.key} className="h-4 flex-1" style={c.width ? { width: c.width, flex: 'none' } : undefined} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0 || sorted.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {searchBox}
        <div className="py-12 flex flex-col items-center justify-center text-center gap-2 rounded-2xl border border-white/70 bg-white/30 backdrop-blur-md">
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed font-medium">
            {query.trim() ? `Nothing matches “${query.trim()}”.` : emptyMessage}
          </p>
          {!query.trim() && emptyAction}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {searchBox}

      <div className="hidden md:block overflow-auto rounded-2xl border border-white/80 bg-white/45 backdrop-blur-md shadow-sm" style={{ maxHeight }}>
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl">
            <tr className="text-muted-foreground text-[11px] font-semibold">
              {columns.map((col) => {
                const isSorted = sort.key === col.key;
                const SortIcon = !isSorted ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    aria-sort={isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`py-2.5 px-3 font-semibold border-b border-black/5 ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.sortable === false ? (
                      col.label
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1.5 font-semibold rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                          isSorted ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {col.label}
                        <SortIcon size={11} className={isSorted ? 'text-primary' : 'text-muted-foreground/60'} />
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={getRowKey(row, i)}
                className="border-b border-black/5 last:border-0 hover:bg-white/60 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`py-2.5 px-3 align-middle ${col.align === 'right' ? 'text-right' : ''}`}>
                    {col.render ? col.render(row, safePage * pageSize + i) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards below md */}
      <ul className="md:hidden flex flex-col gap-2">
        {pageRows.map((row, i) => (
          <li key={getRowKey(row, i)} className="rounded-2xl border border-white/80 bg-white/65 backdrop-blur-md p-3.5 flex flex-col gap-1.5 shadow-sm">
            {columns.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-3 text-xs">
                <span className="text-[11px] text-muted-foreground shrink-0 font-medium">{col.label}</span>
                <span className="text-right min-w-0 font-medium">{col.render ? col.render(row) : row[col.key]}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>

      {/* Paging */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>
            Page {safePage + 1} of {pageCount} ({sorted.length} total)
          </span>
          <div className="flex items-center gap-1 bg-white/60 backdrop-blur-md p-1 rounded-xl border border-white/80 shadow-sm">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              aria-label="Previous page"
              className="p-1 rounded-lg hover:bg-white/80 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs text-muted-foreground tabular-nums px-2 font-medium">
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              aria-label="Next page"
              className="p-1 rounded-lg hover:bg-white/80 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
