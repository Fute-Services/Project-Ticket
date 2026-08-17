import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ScrollText } from 'lucide-react';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { Card, SectionHeader, EmptyState } from '../components/ui';
import { getAuditLogs } from '../utils/api';

const ACTION_LABEL = {
  create_user: 'Created user',
  update_user: 'Updated user',
  update_user_permissions: 'Changed user permissions',
  deactivate_user: 'Deactivated user',
  reactivate_user: 'Reactivated user',
  delete_user: 'Deleted user',
  reset_user_password: 'Reset password',
  update_role_permissions: 'Changed role permissions',
  update_system_settings: 'Updated system settings',
};

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function SuperAdminAuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLogs(200)
      .then(({ data }) => setLogs(data))
      .catch(() => toast.error('Could not load the audit log'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SuperAdminLayout>
      <div className="w-full flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-2">
            <ScrollText size={20} className="text-primary" />
            Audit Log
          </h1>
          <p className="text-xs text-muted-foreground">Every Super Admin action — who, what, and when.</p>
        </div>

        <Card>
          <SectionHeader title="Recent activity" subtitle={`${logs.length} entries`} />

          {loading ? (
            <p className="text-xs text-muted-foreground py-4">Loading…</p>
          ) : logs.length === 0 ? (
            <EmptyState text="No actions logged yet." />
          ) : (
            <div className="flex flex-col gap-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-3.5 py-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground">
                      <span className="font-semibold">{log.actor_name || log.actor_email || 'Unknown'}</span>{' '}
                      <span className="text-muted-foreground">{ACTION_LABEL[log.action] || log.action}</span>
                      {log.target?.email && <span className="font-medium"> — {log.target.email}</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{formatWhen(log.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
