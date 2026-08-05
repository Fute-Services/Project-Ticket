import { PAGE_SIZE } from './constants';

export function byRecent(a, b) {
  return new Date(b.submitted_at) - new Date(a.submitted_at);
}

/**
 * Merge one page from each of two complaint sources into a single page.
 *
 * Both sides are asked for their newest `limit` rows after the same cursor, so
 * the globally newest `limit` rows are guaranteed to be inside the union — the
 * same reasoning the founder endpoint uses on the server.
 *
 * @param {Array<{page: {items: object[], hasMore: boolean}, tag: string}>} sources
 * @returns {{items: object[], hasMore: boolean, nextCursor: string|null}}
 */
export function mergePages(sources, limit = PAGE_SIZE) {
  const merged = sources
    .flatMap(({ page, tag }) => page.items.map(c => ({ ...c, dept_tag: tag })))
    .sort(byRecent);

  const hasMore = merged.length > limit || sources.some(s => s.page.hasMore);
  const items = merged.slice(0, limit);

  return {
    items,
    hasMore,
    nextCursor: hasMore && items.length ? items[items.length - 1].submitted_at : null,
  };
}
