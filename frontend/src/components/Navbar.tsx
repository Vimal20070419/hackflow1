import {
  Barcode as BarcodeIcon,
  Users,
  Layers,
  FileSpreadsheet,
  LogOut,
  Wifi,
  WifiOff,
  Sparkles,
  Zap,
  Printer,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';

interface NavbarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  onOpenScannerPairing?: () => void;
  onOpenExcelImport?: () => void;
  onOpenPrintReport?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  onOpenExcelImport,
  onOpenPrintReport,
}) => {
  const { user, logout, deskNumber } = useAuth();
  const { isConnected } = useSocket();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Hackathon Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectView('desk1')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
              <BarcodeIcon className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white font-['Outfit']">
                  HACK<span className="text-emerald-400">FLOW</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  v2.6
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Digital Barcode Check-In</p>
            </div>
          </div>

          {/* Nav Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {/* Desk 1 button */}
            <button
              id="nav-desk1-btn"
              onClick={() => onSelectView('desk1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentView === 'desk1'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Registration Desk 1
            </button>

            {/* Desk 2 button */}
            <button
              id="nav-desk2-btn"
              onClick={() => onSelectView('desk2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentView === 'desk2'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Registration Desk 2
            </button>

            {/* Participant Portal */}
            <button
              id="nav-portal-btn"
              onClick={() => onSelectView('portal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentView === 'portal'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Participant Wristband
            </button>

            {/* 100 Barcode Pool */}
            <button
              id="nav-pool-btn"
              onClick={() => onSelectView('pool')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentView === 'pool'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              100 Barcode Pool
            </button>
          </nav>

          {/* Right Status & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Hardware Scanner Indicator */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Scanner Gun: <strong>HID Active</strong></span>
            </div>

            {/* Print & Download Report Button */}
            {onOpenPrintReport && (
              <button
                id="nav-print-report-btn"
                onClick={onOpenPrintReport}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
                title="Print or export registered team report"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Print Teams</span>
              </button>
            )}

            {/* Excel Import button */}
            {onOpenExcelImport && (
              <button
                id="nav-excel-import-btn"
                onClick={onOpenExcelImport}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all"
                title="Import registration Excel dataset"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Import Excel
              </button>
            )}

            {/* Socket Live Indicator */}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-medium ${
                isConnected
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
              }`}
              title={isConnected ? 'Live Socket.IO Connected' : 'Socket Disconnected'}
            >
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
            </div>

            {/* User Profile / Logout */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden xl:block text-right">
                  <div className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">{user.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {deskNumber ? `Desk #${deskNumber}` : user.role}
                  </div>
                </div>
                <button
                  id="nav-logout-btn"
                  onClick={logout}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="nav-login-btn"
                onClick={() => onSelectView('login')}
                className="btn-primary text-xs !py-1.5 !px-3"
              >
                Desk Login
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
