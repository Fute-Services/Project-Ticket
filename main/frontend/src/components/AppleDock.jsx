import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Crown,
  Users,
  Cpu,
  TrendingUp,
  Code2,
  Megaphone,
  Palette,
  MessageSquareCode,
  LogOut,
  CheckCircle,
  Plane,
  FolderKanban,
  BarChart2,
  Factory,
  Sparkles,
} from 'lucide-react';

export default function AppleDock({ onOpenChat, onSelectDept, activeDept }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [activeTooltip, setActiveTooltip] = useState(null);

  const handleSignOut = () => {
    logout();
    navigate('/', { replace: true });
  };

  const dockApps = [
    {
      id: 'overview',
      label: 'Founder Overview',
      icon: Crown,
      deptId: 'overview',
      gradient: 'from-warning via-primary to-destructive',
    },
    {
      id: 'approvals',
      label: 'Approval System',
      icon: CheckCircle,
      deptId: 'approvals',
      gradient: 'from-muted via-muted to-muted',
    },
    {
      id: 'projects',
      label: 'Project Details',
      icon: FolderKanban,
      deptId: 'projects',
      gradient: 'from-muted via-muted to-muted',
    },
    {
      id: 'ai-agents',
      label: 'AI Agent Hub',
      icon: Sparkles,
      deptId: 'ai-agents',
      gradient: 'from-primary via-purple-500 to-indigo-500',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart2,
      deptId: 'reports',
      gradient: 'from-muted via-muted to-muted',
    },
    {
      id: 'hr',
      label: 'HR Department',
      icon: Users,
      deptId: 'hr',
      gradient: 'from-muted via-muted to-muted',
    },
    {
      id: 'it',
      label: 'IT Service Desk',
      icon: Cpu,
      deptId: 'it',
      gradient: 'from-muted via-primary to-primary',
    },
    {
      id: 'sales',
      label: 'Sales Operations',
      icon: TrendingUp,
      deptId: 'sales',
      gradient: 'from-primary via-primary to-primary',
    },
    {
      id: 'developers',
      label: 'Developer Portal',
      icon: Code2,
      deptId: 'developers',
      gradient: 'from-muted via-muted to-muted',
    },
    {
      id: 'marketing',
      label: 'Marketing Suite',
      icon: Megaphone,
      deptId: 'marketing',
      gradient: 'from-primary via-warning to-warning',
    },
    {
      id: 'branding',
      label: 'Branding Hub',
      icon: Palette,
      deptId: 'branding',
      gradient: 'from-muted via-destructive to-destructive',
    },
    {
      id: 'production',
      label: 'Production',
      icon: Factory,
      deptId: 'production',
      gradient: 'from-muted via-muted to-muted',
    },
    { type: 'divider' },
    {
      id: 'chat',
      label: 'Team Chat Hub',
      icon: MessageSquareCode,
      deptId: 'chat',
      gradient: '',
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: LogOut,
      action: handleSignOut,
      gradient: 'from-destructive via-destructive to-primary',
    },
  ];

  const handleAppClick = (app) => {
    if (app.action) {
      app.action();
    } else if (app.deptId && onSelectDept) {
      onSelectDept(app.deptId);
    } else if (app.path) {
      navigate(app.path);
    }
  };

  return (
    <div className="fixed top-1/2 left-3.5 -translate-y-1/2 z-50 flex flex-col items-center pointer-events-auto">
      {/* Vertical Floating Left-Side Apple Dock */}
      <nav className="bg-background/90 backdrop-blur-2xl border border-border shadow-[0_15px_40px_rgba(0,0,0,0.85)] rounded-full px-1.5 py-2.5 flex flex-col items-center gap-2 transition-all">
        {dockApps.map((app, index) => {
          if (app.type === 'divider') {
            return (
              <div
                key={`divider-${index}`}
                className="w-4 h-[1px] bg-white/20 my-0"
              />
            );
          }

          const IconComponent = app.icon;
          const isActive = activeDept ? activeDept === app.deptId : (app.path && location.pathname.startsWith(app.path));

          return (
            <div
              key={app.id}
              className="relative group flex items-center"
              onMouseEnter={() => setActiveTooltip(app.id)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              {/* Right-side Tooltip Label */}
              <div
                className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-muted/95 backdrop-blur-md border border-border text-[10px] font-bold text-foreground rounded-lg shadow-xl pointer-events-none whitespace-nowrap transition-all duration-150 transform ${
                  activeTooltip === app.id
                    ? 'opacity-100 translate-x-0 scale-100'
                    : 'opacity-0 -translate-x-1 scale-95'
                }`}
              >
                {app.label}
                {/* Tooltip triangle on left edge */}
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 bg-muted border-l border-b border-border rotate-45" />
              </div>

              {/* Compact Dock Icon Button */}
              <button
                type="button"
                onClick={() => handleAppClick(app)}
                // The visible label is a hover tooltip, so the button itself
                // carried no accessible name at all — every dock item was
                // announced as just "button".
                aria-label={app.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-8 h-8 rounded-full flex items-center justify-center shadow-md cursor-pointer transform transition-all duration-200 ease-out group-hover:translate-x-1.5 group-hover:scale-125 group-active:scale-90 ${
                  isActive
                    ? 'bg-black border-2 border-border text-foreground shadow-[0_0_12px_rgba(255,255,255,0.2)] scale-[1.05]'
                    : 'bg-black border border-border text-muted-foreground hover:text-foreground hover:bg-accent hover:border-muted-foreground/40'
                }`}
              >
                <IconComponent size={14} />
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
