import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Shield, Users, Building2, Timer, ShieldAlert, BarChart3, ScrollText, History, Settings, LogOut, ChevronDown, ChevronsLeft, ChevronsRight } from 'lucide-react';
import GlobalSearchBar from './GlobalSearchBar';

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, path: '/superadmin/overview' },
  { label: 'Role Permissions', icon: Shield, path: '/superadmin/dashboard' },
  { label: 'Users', icon: Users, path: '/superadmin/users' },
  { label: 'Departments', icon: Building2, path: '/superadmin/departments' },
  { label: 'SLA Management', icon: Timer, path: '/superadmin/sla' },
  { label: 'Security Center', icon: ShieldAlert, path: '/superadmin/security' },
  { label: 'Analytics', icon: BarChart3, path: '/superadmin/analytics' },
  { label: 'Activity Timeline', icon: History, path: '/superadmin/activity' },
  { label: 'Audit Log', icon: ScrollText, path: '/superadmin/audit-log' },
  { label: 'Settings', icon: Settings, path: '/superadmin/settings' },
];

export default function SuperAdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const activeItem = NAV_ITEMS.find((item) => item.path === location.pathname) || NAV_ITEMS[0];

  function handleSignOut() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary/30 selection:text-primary">
      <aside
        className={`sticky top-3 left-3 ml-3 ${
          collapsed ? 'w-[64px]' : 'w-[195px] xl:w-[200px]'
        } h-[calc(100vh-1.5rem)] bg-card border border-border rounded-lg flex flex-col justify-between shrink-0 p-3 overflow-hidden transition-all duration-300`}
      >
        <div>
          {!collapsed && (
            <div className="px-3 py-2 mb-3 border-b border-border">
              <div className="font-bold text-sm tracking-tight text-foreground leading-none">Super Admin</div>
            </div>
          )}

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`mx-1 flex items-center py-1.5 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-colors text-left cursor-pointer ${
                    collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
                  } ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow border border-primary/40'
                      : 'bg-muted text-muted-foreground border border-border hover:border-muted-foreground/40 hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon size={14} className={`shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2 pt-3 border-t border-border">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((p) => !p)}
              title={collapsed ? user?.full_name || 'Account' : undefined}
              className={`w-full flex items-center rounded-xl bg-muted border border-border hover:border-muted-foreground/40 transition-colors text-left cursor-pointer ${
                collapsed ? 'justify-center p-1.5' : 'justify-between p-2.5'
              }`}
            >
              <div className={`flex items-center min-w-0 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-destructive/20 border border-destructive/40 flex items-center justify-center font-bold text-xs text-destructive">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary border-2 border-muted" />
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground truncate">{user?.full_name || 'Super Admin'}</div>
                    <div className="text-[10px] text-muted-foreground truncate">Super Admin</div>
                  </div>
                )}
              </div>
              {!collapsed && <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
            </button>

            {showProfileMenu && (
              <div className="absolute bottom-full left-0 min-w-[135px] mb-2 bg-muted border border-border rounded-xl p-1.5 shadow-2xl z-50">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-left cursor-pointer whitespace-nowrap"
                >
                  <LogOut size={14} className="shrink-0" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-full p-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 text-xs font-medium transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen max-h-screen overflow-hidden">
        <header className="h-14 border border-border/60 rounded-xl mx-3 mt-3 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-card/60 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10)] sticky top-3 z-20">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium shrink-0">
            <span>Super Admin</span>
            <span>/</span>
            <span>{activeItem.label}</span>
          </div>

          <div className="flex-1 flex justify-center px-4 min-w-0">
            <GlobalSearchBar />
          </div>

          <div className="h-9 flex items-center gap-2 px-2.5 rounded-xl bg-muted backdrop-blur-md border border-border shrink-0">
            <div className="w-6 h-6 rounded-full bg-destructive/20 border border-destructive/40 flex items-center justify-center font-bold text-[10px] text-destructive">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-[11px] font-semibold text-foreground leading-none">{user?.full_name || 'Super Admin'}</span>
              <span className="text-[9px] text-muted-foreground">Super Admin</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 lg:p-4 min-w-0 overflow-y-auto flex flex-col h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)]">{children}</main>
      </div>
    </div>
  );
}
