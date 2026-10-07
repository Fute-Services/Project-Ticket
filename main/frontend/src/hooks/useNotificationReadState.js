import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Which notification ids this person has already opened, kept in this
// browser's localStorage per user (there's no backend "read" model for
// notifications - they're derived live from tickets/approvals - so this is
// what makes the bell's dot and count actually go away once you've looked,
// instead of staying lit until the underlying ticket changes state).
// Notification ids that embed a timestamp (e.g. a chat message's
// `lastMessageAt`) become "new" again automatically when that value changes.
const MAX_STORED = 500;
const CHANGE_EVENT = 'notif-read-changed';

function storageKey(userId) {
  return `notif-read:${userId || 'anon'}`;
}

function readIds(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function writeIds(userId, ids) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...ids].slice(-MAX_STORED)));
  } catch {
    // Private mode / storage blocked - read state just won't persist.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { userId } }));
}

export function useNotificationReadState() {
  const { user } = useAuth();
  const userId = user?.id;
  const [ids, setIds] = useState(() => readIds(userId));

  useEffect(() => {
    setIds(readIds(userId));
    const sync = () => setIds(readIds(userId));
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [userId]);

  const isRead = useCallback((id) => ids.has(id), [ids]);

  const markRead = useCallback(
    (id) => {
      const next = readIds(userId);
      if (next.has(id)) return;
      next.add(id);
      writeIds(userId, next);
    },
    [userId]
  );

  const markAllRead = useCallback(
    (list) => {
      const next = readIds(userId);
      list.forEach((n) => next.add(n.id));
      writeIds(userId, next);
    },
    [userId]
  );

  return { isRead, markRead, markAllRead };
}
