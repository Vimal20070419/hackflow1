import React from 'react';
import { useAuth } from '../context/AuthContext.js';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  onSwitchDesk: (desk: number) => void;
  registeredCount: number;
  totalQRs: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  onSwitchDesk,
  registeredCount,
  totalQRs,
}) => {
  const { deskNumber } = useAuth();
  const currentDesk = deskNumber || 1;
  const otherDesk = currentDesk === 1 ? 2 : 1;

  const navItems = [
    { id: 'overview-dashboard', label: 'Overview', icon: 'dashboard', badge: null },
    { id: 'register-team', label: 'Register Team', icon: 'person_add', badge: 'FAST 5' },
    { id: 'registered-teams', label: 'Registered Teams', icon: 'groups', badge: `${registeredCount}` },
    { id: 'qr-allocation', label: 'Barcode Allocation', icon: 'barcode_scanner', badge: null },
    { id: 'live-activity-stream', label: 'Live Activity Feed', icon: 'stream', badge: null },
    { id: 'qr-inventory', label: 'Barcode Inventory', icon: 'inventory_2', badge: `${totalQRs}` },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.2)] border-r border-surface-container-high/40">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="h-16 px-space-md flex items-center justify-between bg-surface-container-lowest border-b border-surface-container-high/30">
          <div className="flex items-center gap-space-sm cursor-pointer" onClick={() => onSelectView('overview-dashboard')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-surface-container-lowest text-xl font-bold">
                barcode
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface uppercase font-bold">
                HAKTRAK
              </span>
              <span className="font-label-caps text-label-caps text-primary tracking-wider">
                BARCODE OPS
              </span>
            </div>
          </div>
          <span className="px-1.5 py-0.5 rounded font-label-mono-sm text-label-mono-sm bg-surface-container-high text-on-surface-variant">
            v2.6
          </span>
        </div>

        {/* Workspace Station Pill */}
        <div className="px-space-md py-space-sm">
          <div
            onClick={() => onSwitchDesk(otherDesk)}
            className="relative flex items-center justify-between px-space-sm py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer border border-surface-container-high/30"
          >
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[16px]">desktop_windows</span>
              <div className="flex flex-col">
                <span className="font-label-caps text-label-caps text-on-surface-variant">WORKSPACE</span>
                <span className="font-body-sm text-body-sm text-on-surface font-medium">
                  Registration Desk 0{currentDesk}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">unfold_more</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-space-sm py-space-xs space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-space-sm py-2 rounded-lg transition-all text-left ${
                  isActive
                    ? 'bg-surface-container-high text-primary font-medium shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-space-sm">
                  <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {item.icon}
                  </span>
                  <span className="font-body-sm text-body-sm">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`px-1.5 py-0.2 rounded font-label-mono-sm text-label-mono-sm ${
                    isActive ? 'bg-primary/10 text-primary' : 'text-on-surface-variant'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Quick Desk Shift & Hardware Scanner Status */}
      <div className="p-space-md space-y-space-sm bg-surface-container-lowest border-t border-surface-container-high/30">
        <div className="p-space-sm rounded-lg bg-surface-container-low space-y-space-xs border border-surface-container-high/20">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant">QUICK DESK SHIFT</span>
            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">sync_alt</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-label-code text-label-code text-on-surface font-semibold">Desk 0{currentDesk}</span>
            <button
              id="btn-switch-desk-quick"
              onClick={() => onSwitchDesk(otherDesk)}
              className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-mono-sm text-label-mono-sm transition-colors cursor-pointer"
              type="button"
            >
              Switch to Desk 0{otherDesk}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-space-xs px-1 text-on-surface-variant">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary"></span>
          <span className="font-label-mono-sm text-label-mono-sm truncate">
            USB Barcode Gun: Ready (HID)
          </span>
        </div>
      </div>
    </aside>
  );
};
