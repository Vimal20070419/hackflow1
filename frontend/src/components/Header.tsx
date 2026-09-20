import React from 'react';
import { useAuth } from '../context/AuthContext.js';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenSearch?: () => void;
  onSelectView?: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery = '',
  onSearchChange,
  onOpenSearch,
  onSelectView,
}) => {
  const { user, deskNumber, logout } = useAuth();

  const currentDesk = deskNumber || 1;
  const operatorName = currentDesk === 1 ? 'Sarah Jenkins' : 'Alex Chen';
  const deskTitle = `DESK 0${currentDesk} LEAD`;

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-40 flex items-center justify-between px-space-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container-high/30">
      <div className="flex items-center gap-space-lg flex-1 max-w-2xl">
        {/* Hardware Barcode Scanner status telemetry pill */}
        <div
          className="flex items-center gap-2 px-space-md py-1.5 rounded-full bg-surface-container-low border border-surface-container-high/30"
          title="Hardware USB / Bluetooth Barcode Scanner Gun Ready"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
          </span>
          <span className="font-label-mono-sm text-label-mono-sm text-secondary truncate">
            External Barcode Gun Ready (USB / Bluetooth HID Active &bull; Desk 0{currentDesk})
          </span>
        </div>

        {/* Global Instant Search */}
        <div className="relative flex-1 hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            id="globalSearchInput"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full h-9 pl-9 pr-12 rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-label-code text-label-code focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high/40 shadow-inner"
            placeholder="Search college, team name or barcode..."
            type="text"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-mono-sm text-label-mono-sm">
            ⌘K
          </span>
        </div>
      </div>

      <div className="flex items-center gap-space-md">
        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
          type="button"
          onClick={() => onSelectView?.('live-activity-stream')}
          title="Live incident & activity stream"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-surface-container-lowest"></span>
        </button>

        {/* Dark Mode Icon */}
        <button
          aria-label="Toggle Theme"
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">dark_mode</span>
        </button>

        {/* Profile Avatar & Identity */}
        <div className="flex items-center gap-space-sm pl-space-sm border-l border-surface-container-high/50">
          <div className="w-8 h-8 rounded-full bg-surface-container-high ring-1 ring-outline-variant flex items-center justify-center font-label-code text-primary font-bold text-xs">
            {operatorName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="font-body-sm text-body-sm font-medium text-on-surface">
              {operatorName}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              {deskTitle}
            </span>
          </div>

          {/* Logout / Switch Terminal */}
          <button
            onClick={() => {
              logout();
              onSelectView?.('login');
            }}
            title="Log out from terminal"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container-low transition-colors ml-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
