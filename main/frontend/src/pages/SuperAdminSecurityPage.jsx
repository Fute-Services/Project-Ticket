import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldAlert, Monitor, LogOut, Lock, Unlock, AlertOctagon } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { Card, SectionHeader, EmptyState } from '../components/ui';
import ConfirmDangerousAction from '../components/ConfirmDangerousAction';
import { getSessions, revokeSession, forceLogoutUser, getFailedLogins, getLockedAccounts, unlockAccount } from '../utils/api';

function timeAgo(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SuperAdminSecurityPage() {
  const [sessions, setSessions] = useState([]);
  const [failedLogins, setFailedLogins] = useState([]);
  const [lockedAccounts, setLockedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [forceLogoutTarget, setForceLogoutTarget] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([getSessions(), getFailedLogins(50), getLockedAccounts()])
      .then(([s, f, l]) => {
        setSessions(s.data);
        setFailedLogins(f.data);
        setLockedAccounts(l.data);
      })
      .catch(() => toast.error('Could not load security data'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function confirmRevoke(reason) {
    const session = revokeTarget;
    return revokeSession(session.id, reason).then(() => {
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      toast.success('Session revoked');
    });
  }

  function confirmForceLogout(reason) {
    const { uid, label } = forceLogoutTarget;
    return forceLogoutUser(uid, reason).then(({ data }) => {
      setSessions((prev) => prev.filter((s) => s.uid !== uid));
      toast.success(`${data.revokedCount} session(s) revoked for ${label}`);
    });
  }

  function handleUnlock(account) {
    unlockAccount(account.id)
      .then(() => {
        setLockedAccounts((prev) => prev.filter((a) => a.id !== account.id));
        toast.success(`${account.full_name || account.email} unlocked`);
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not unlock account'));
  }

  return (
    <SuperAdminLayout>
      <div className="w-full flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-2">
            <ShieldAlert size={20} className="text-primary" />
            Security Center
          </h1>
          <p className="text-xs text-muted-foreground">
            Active sessions, failed login attempts, and locked accounts. MFA and break-glass access aren't built yet.
          </p>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground py-4">Loading…</p>
        ) : (
          <>
            <Card>
              <SectionHeader title="Locked accounts" subtitle={`${lockedAccounts.length} account(s) locked after too many failed attempts`} />
              {lockedAccounts.length === 0 ? (
                <EmptyState text="No locked accounts." />
              ) : (
                <div className="flex flex-col gap-1">
                  {lockedAccounts.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-destructive/20 bg-destructive/5">
                      <Lock size={15} className="shrink-0 text-destructive" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">{a.full_name || a.email}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{a.email} · {a.failedLoginAttempts} failed attempts · locked {timeAgo(a.lockedAt)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnlock(a)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-primary-foreground transition-colors cursor-pointer shrink-0"
                      >
                        <Unlock size={13} /> Unlock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionHeader title="Active sessions" subtitle={`${sessions.length} session(s)`} />
              {sessions.length === 0 ? (
                <EmptyState text="No active sessions." />
              ) : (
                <div className="flex flex-col gap-1">
                  {sessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 px-3.5 py-3 rounded-lg hover:bg-accent transition-colors">
                      <Monitor size={15} className="shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">{s.full_name || s.email || s.uid}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {s.ip || 'unknown IP'} · logged in {timeAgo(s.loginAt)}
                          {s.userAgent && <span className="hidden sm:inline"> · {s.userAgent.slice(0, 60)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" title="Revoke this session" onClick={() => setRevokeTarget(s)} className="p-1.5 rounded-lg text-warning hover:bg-warning/10 transition-colors cursor-pointer">
                          <LogOut size={13} />
                        </button>
                        <button
                          type="button"
                          title="Force logout everywhere"
                          onClick={() => setForceLogoutTarget({ uid: s.uid, label: s.full_name || s.email || s.uid })}
                          className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                          <AlertOctagon size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionHeader title="Failed login attempts" subtitle={`Last ${failedLogins.length} attempt(s)`} />
              {failedLogins.length === 0 ? (
                <EmptyState text="No failed login attempts recorded." />
              ) : (
                <div className="flex flex-col gap-1">
                  {failedLogins.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg hover:bg-accent transition-colors">
                      <AlertOctagon size={14} className="shrink-0 text-warning" />
                      <span className="text-sm text-foreground flex-1 truncate">{f.email}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{f.ip || 'unknown IP'}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(f.at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        <ConfirmDangerousAction
          open={Boolean(revokeTarget)}
          onClose={() => setRevokeTarget(null)}
          title="Revoke session"
          description={revokeTarget ? `Sign out this session for ${revokeTarget.email || revokeTarget.uid}.` : undefined}
          requirePassword={false}
          onConfirm={confirmRevoke}
        />
        <ConfirmDangerousAction
          open={Boolean(forceLogoutTarget)}
          onClose={() => setForceLogoutTarget(null)}
          title="Force logout everywhere"
          description={forceLogoutTarget ? `Every active session for ${forceLogoutTarget.label} will be signed out immediately.` : undefined}
          requirePassword
          onConfirm={confirmForceLogout}
        />
      </div>
    </SuperAdminLayout>
  );
}
