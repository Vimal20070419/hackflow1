import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Users,
  Building,
  Crown,
  Barcode as BarcodeIcon,
  CheckCircle,
  Clock,
  Layers,
  Filter,
  Check,
  AlertTriangle,
  Radio,
  RefreshCw,
  LogOut,
  Sparkles,
  ArrowRight,
  Printer,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { ITeam, IDashboardStats, IScanLog } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { QRAllocationModal } from '../components/QRAllocationModal.js';
import { sound } from '../utils/sound.js';
import { useBarcodeScanner } from '../utils/useBarcodeScanner.js';
import { extractSingleBarcode } from '../utils/barcodeUtils.js';
import { ManualRegistrationSection } from '../components/ManualRegistrationSection.js';
import { PrintDownloadModal } from '../components/PrintDownloadModal.js';
import { downloadTeamsCSV } from '../utils/exportUtils.js';
import { UserPlus, PlusCircle, Download, FileSpreadsheet } from 'lucide-react';

interface RegistrationDeskPageProps {
  deskNumber: number;
  onOpenScannerPairing?: () => void;
  onSelectView: (view: string) => void;
  initialSubView?: string;
}

export const RegistrationDeskPage: React.FC<RegistrationDeskPageProps> = ({
  deskNumber = 1,
  onSelectView,
  initialSubView = 'TEAMS',
}) => {
  const { user, token, logout } = useAuth();
  const { socket } = useSocket();

  // Active view tab inside Registration Desk
  const [activeTab, setActiveTab] = useState<'TEAMS' | 'MANUAL_REG' | 'LOGS' | 'STATS'>(
    initialSubView === 'MANUAL_REG' ? 'MANUAL_REG' : initialSubView === 'LOGS' ? 'LOGS' : initialSubView === 'STATS' ? 'STATS' : 'TEAMS'
  );

  // Data states
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<ITeam | null>(null);
  const [colleges, setColleges] = useState<Array<{ collegeName: string; teamCount?: number; confirmedCount?: number } | string>>([]);
  const [stats, setStats] = useState<IDashboardStats>({
    totalTeams: 137,
    confirmedTeams: 0,
    pendingTeams: 137,
    qrsAllocated: 0,
    qrsRemaining: 200,
    desk1Confirmed: 0,
    desk2Confirmed: 0,
  });
  const [recentLogs, setRecentLogs] = useState<IScanLog[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED'>('ALL');
  const [selectedCollege, setSelectedCollege] = useState<string>('ALL');

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastHardwareScan, setLastHardwareScan] = useState<string | null>(null);

  // Barcode Check-in modal state
  const [activeBarcodeScan, setActiveBarcodeScan] = useState<{
    qrId: string;
    status: 'UNUSED' | 'ALREADY_ALLOCATED' | 'INVALID_QR';
    allocatedTo?: any;
    message?: string;
  } | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState<boolean>(false);

  // Print & Download Report Modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printModalStatus, setPrintModalStatus] = useState<'ALL' | 'CONFIRMED' | 'PENDING'>('ALL');

  // Replace/upsert log in recentActivity without accumulating duplicate records
  const updateOrReplaceLog = (newLog: IScanLog) => {
    setRecentLogs((prevLogs) => {
      const filtered = prevLogs.filter(
        (l) =>
          (!newLog.teamId || !l.teamId || l.teamId !== newLog.teamId) &&
          l.qrId !== newLog.qrId &&
          (!newLog.teamName || !l.teamName || l.teamName !== newLog.teamName)
      );
      return [newLog, ...filtered].slice(0, 10);
    });
  };

  // Global External Hardware Barcode Scanner Listener
  useBarcodeScanner({
    onScan: (scannedText) => {
      const code = extractSingleBarcode(scannedText);
      sound.playSuccess();
      setLastHardwareScan(code);
      setToastMessage(`Hardware Scanner Scanned: ${code}`);
      setTimeout(() => setToastMessage(null), 3000);

      // Check if this barcode is already allocated to a team in the current list
      const existingTeamWithBarcode = (teams || []).find((t) => t.qrId === code);
      if (existingTeamWithBarcode) {
        setSelectedTeam(existingTeamWithBarcode);
      }

      // Replace previously scanned barcode with the single clean active code
      setActiveBarcodeScan({
        qrId: code,
        status: 'UNUSED',
        message: `External Scanner: ${code}`,
      });
      setIsBarcodeModalOpen(true);
    },
    enabled: true,
  });

  // Fetch initial data safely
  const fetchData = async () => {
    try {
      const [statsRes, collegesRes] = await Promise.all([
        api.get('/stats').catch(() => null),
        api.get('/teams/colleges').catch(() => null),
      ]);

      if (statsRes?.data?.success && statsRes.data.stats) {
        setStats(statsRes.data.stats);
        if (Array.isArray(statsRes.data.recentActivity) && statsRes.data.recentActivity.length > 0) {
          // Deduplicate recentActivity so only the latest scan per team/wristband is kept
          const seenTeams = new Set<string>();
          const seenBarcodes = new Set<string>();
          const uniqueLogs: IScanLog[] = [];

          for (const log of statsRes.data.recentActivity) {
            const teamKey = log.teamId || log.teamName;
            const barcodeKey = log.qrId;
            if (teamKey && seenTeams.has(teamKey)) continue;
            if (barcodeKey && seenBarcodes.has(barcodeKey)) continue;

            if (teamKey) seenTeams.add(teamKey);
            if (barcodeKey) seenBarcodes.add(barcodeKey);
            uniqueLogs.push(log);
          }
          setRecentLogs(uniqueLogs);
        }
      }

      if (collegesRes?.data?.success && Array.isArray(collegesRes.data.colleges)) {
        setColleges(collegesRes.data.colleges);
      }
    } catch (e) {
      console.warn('Error fetching stats / colleges', e);
    }
  };

  // Search teams safely
  const fetchTeams = async () => {
    try {
      const params: any = { limit: 500 };
      if (searchQuery.trim()) params.query = searchQuery.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (selectedCollege !== 'ALL') params.college = selectedCollege;

      const res = await api.get('/teams/search', { params }).catch(() => null);
      if (res?.data?.success && Array.isArray(res.data.teams)) {
        setTeams(res.data.teams);
        if (selectedTeam) {
          const updated = res.data.teams.find((t: ITeam) => t._id === selectedTeam._id);
          if (updated) setSelectedTeam(updated);
        } else if (res.data.teams.length > 0) {
          setSelectedTeam(res.data.teams[0]);
        }
      }
    } catch (e) {
      console.warn('Error fetching teams', e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTeams();
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeams();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, selectedCollege]);

  // Real-time socket listener for registration confirmation / replacement
  useEffect(() => {
    if (!socket) return;

    const handleRegistrationConfirmed = (data: any) => {
      fetchData();
      fetchTeams();

      if (data.teamName && data.qrId) {
        updateOrReplaceLog({
          _id: `live-${Date.now()}`,
          qrId: data.qrId,
          teamId: data.teamId,
          teamName: data.teamName,
          collegeName: data.collegeName,
          deskNumber: data.deskNumber,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'SUCCESS',
        });
      }
    };

    socket.on('registration-confirmed', handleRegistrationConfirmed);
    return () => {
      socket.off('registration-confirmed', handleRegistrationConfirmed);
    };
  }, [socket]);

  // Open check-in modal for a specific team
  const handleCheckInTeam = (team: ITeam) => {
    setSelectedTeam(team);
    setActiveBarcodeScan({
      qrId: team.qrId || '',
      status: 'UNUSED',
      message: 'Aim your barcode scanner gun at wristband',
    });
    setIsBarcodeModalOpen(true);
  };

  // Count colleges with identical team names for collision alerts
  const getCollisionCount = (name: string) => {
    if (!Array.isArray(teams)) return 0;
    return teams.filter((t) => (t?.teamName || t?.name) === name).length;
  };

  const totalTeamsCount = stats?.totalTeams ?? (Array.isArray(teams) ? teams.length : 56);
  const confirmedCount = stats?.confirmedTeams ?? 12;
  const pendingCount = stats?.pendingTeams ?? 44;
  const barcodesRemainingCount = stats?.qrsRemaining ?? 88;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Desk Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BarcodeIcon className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white font-['Outfit']">
                  HACK<span className="text-emerald-400">FLOW</span>
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  deskNumber === 1
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                }`}>
                  Desk {deskNumber} Active
                </span>
              </div>
            </div>
          </div>

          {/* Center / Right Station Controls */}
          <div className="flex items-center gap-2.5">
            {/* Header Print & Download Actions */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                id="header-download-btn"
                onClick={() => {
                  sound.playSuccess();
                  downloadTeamsCSV(
                    teams,
                    statusFilter === 'ALL'
                      ? 'All_Teams'
                      : statusFilter === 'CONFIRMED'
                      ? 'CheckedIn_Teams'
                      : 'Pending_Teams'
                  );
                  setToastMessage(`Exported ${teams.length} teams as CSV`);
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer shadow-sm"
                title="Download teams spreadsheet (CSV/Excel)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>

              <button
                id="header-print-btn"
                onClick={() => {
                  sound.playClick();
                  setPrintModalStatus(statusFilter);
                  setIsPrintModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer shadow-sm"
                title="Print registered teams report preview"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print List</span>
              </button>
            </div>

            {/* Hardware Scanner Status Pill */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Scanner Gun: Ready</span>
            </div>

            {/* Switch Desk Button */}
            <button
              onClick={() => onSelectView(deskNumber === 1 ? 'desk2' : 'desk1')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Quickly switch station"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Desk {deskNumber === 1 ? 2 : 1}</span>
            </button>

            {/* Navigation Links */}
            <button
              onClick={() => onSelectView('pool')}
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>100 Barcode Pool</span>
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                logout();
                onSelectView('login');
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Log out from desk"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* External Barcode Scanner Ready Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BarcodeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">External USB / Wireless Barcode Scanner Active</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  PLUG &amp; PLAY HID
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Aim your handheld laser/CCD barcode reader gun at any wristband to scan or replace instantly.
              </p>
            </div>
          </div>

          {lastHardwareScan && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs">
              <span className="text-slate-400 text-[11px]">Latest Active Barcode:</span>
              <span className="font-mono font-bold text-emerald-400">{lastHardwareScan}</span>
            </div>
          )}
        </div>

        {/* 4 Clear Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* 1. Total Registered Teams */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>TOTAL REGISTERED</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] mt-2">
              {totalTeamsCount}
            </div>
          </div>

          {/* 2. Checked-In Teams */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
              <span>CHECKED IN</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-['Outfit'] mt-2">
              {confirmedCount}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((confirmedCount / (totalTeamsCount || 1)) * 100))}%` }}
              ></div>
            </div>
          </div>

          {/* 3. Pending Check-In */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
              <span>PENDING CHECK-IN</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-['Outfit'] mt-2">
              {pendingCount}
            </div>
          </div>

          {/* 4. Barcodes Remaining */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-cyan-400 text-xs font-semibold">
              <span>BARCODES READY</span>
              <BarcodeIcon className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-['Outfit'] mt-2">
              {barcodesRemainingCount} <span className="text-sm font-normal text-slate-400">/ 100</span>
            </div>
          </div>
        </div>

        {/* Station Navigation Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('TEAMS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'TEAMS'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Teams Directory ({totalTeamsCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('MANUAL_REG')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'MANUAL_REG'
                  ? 'bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/10 font-black'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Manual Registration Section</span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                Dataset Domain Lock
              </span>
            </button>

            <button
              onClick={() => setActiveTab('LOGS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'LOGS'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Scan Logs &amp; Activity</span>
            </button>
          </div>

          <button
            onClick={() => setActiveTab('MANUAL_REG')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
            <span>+ Register Team Manually</span>
          </button>
        </div>

        {/* Tab 1: MANUAL REGISTRATION SECTION */}
        {activeTab === 'MANUAL_REG' && (
          <ManualRegistrationSection
            deskNumber={deskNumber}
            onSuccessCheckin={(_team) => {
              fetchData();
              fetchTeams();
            }}
          />
        )}

        {/* Tab 2: TEAMS DIRECTORY & SEARCH */}
        {activeTab === 'TEAMS' && (
          <>
            {/* Search, Filter Tabs & College Selector */}
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="teamSearchInput"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by team name, college, barcode or member name (e.g. Team Alpha, Vimal)..."
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* College Dropdown */}
                <div className="w-full md:w-64">
                  <select
                    value={selectedCollege}
                    onChange={(e) => setSelectedCollege(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ALL">All Colleges ({colleges?.length ?? 0})</option>
                    {(colleges || []).map((c: any, idx: number) => {
                      const collegeTitle = typeof c === 'string' ? c : (c?.collegeName || `College ${idx + 1}`);
                      const countLabel = typeof c === 'object' && c?.teamCount ? ` (${c.teamCount} teams)` : '';
                      return (
                        <option key={`${collegeTitle}-${idx}`} value={collegeTitle}>
                          {collegeTitle}{countLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === 'ALL'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({totalTeamsCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('PENDING')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === 'PENDING'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pending ({pendingCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('CONFIRMED')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === 'CONFIRMED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Checked In ({confirmedCount})
                  </button>
                </div>
              </div>
            </div>

        {/* Teams List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing <strong>{(teams || []).length}</strong> matching teams</span>
          </div>

          {(teams || []).length === 0 ? (
            <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
              <Users className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No teams found</p>
              <p className="text-xs text-slate-500 mt-1">Try searching with a different college or team name</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {(teams || []).map((team) => {
                const teamName = team?.teamName || team?.name || 'Unnamed Team';
                const isConfirmed = team?.registrationStatus === 'CONFIRMED';
                const collisionCount = getCollisionCount(teamName);

                return (
                  <div
                    key={team._id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isConfirmed
                        ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                        : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 shadow-md'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: College & Team Identity */}
                      <div className="space-y-2 flex-1">
                        {/* Prominent College Name Tag */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-cyan-300 border border-slate-700 flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{team?.collegeName || 'General College'}</span>
                          </span>

                          <span className="text-xs text-slate-400 font-mono">
                            ID: {team?.registrationId || team?._id?.slice(-6)}
                          </span>

                          {team?.domain && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {team.domain}
                            </span>
                          )}

                          {/* Friendly Collision Note if same name exists in other college */}
                          {collisionCount > 1 && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Duplicate Name</span>
                            </span>
                          )}
                        </div>

                        {/* Team Name */}
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-white font-['Outfit']">
                            {teamName}
                          </h3>
                        </div>

                        {/* Members List */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-xs text-slate-400">Members:</span>
                          {(team?.members || []).map((m, idx) => {
                            const isLead = team?.teamLeader?.name === m.name;
                            return (
                              <span
                                key={idx}
                                className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                                  isLead
                                    ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                                    : 'bg-slate-950 text-slate-300 border border-slate-800'
                                }`}
                              >
                                {isLead && <Crown className="w-3 h-3 text-amber-400" />}
                                <span>{m.name}</span>
                                {isLead && <span className="text-[10px] text-emerald-400 font-bold">(Leader)</span>}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Status & Action Button */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                        <div>
                          {isConfirmed ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                              <span>Active: {team.qrId}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                              <Clock className="w-4 h-4 text-amber-400" />
                              <span>Pending Verification</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isConfirmed ? (
                            <>
                              <button
                                onClick={() => handleCheckInTeam(team)}
                                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                                title="Scan a new wristband to replace current barcode"
                              >
                                <BarcodeIcon className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Replace Barcode</span>
                              </button>
                              <button
                                onClick={() => {
                                  sound.playSuccess();
                                  alert(`Reprinting barcode wristband for ${teamName} (${team.qrId})`);
                                }}
                                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-400" />
                                <span>Reprint</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleCheckInTeam(team)}
                              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all cursor-pointer"
                            >
                              <BarcodeIcon className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                              <span>Check-In &amp; Assign Barcode</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </>
        )}

        {/* Tab 3: FULL LOGS & ACTIVITY FEED */}
        {activeTab === 'LOGS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span>Active Barcode Wristband Check-in Logs</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">Desk {deskNumber} &bull; {recentLogs.length} Active Records</span>
            </div>

            {recentLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No check-in logs recorded yet. Scans from external barcode gun will appear here live.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentLogs.map((log, idx) => (
                  <div
                    key={log._id || idx}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-white text-sm">
                        <span>{log.teamName}</span>
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono text-xs border border-cyan-500/20">
                          {log.qrId}
                        </span>
                      </div>
                      <div className="text-slate-400 text-xs flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        <span>{log.collegeName || 'General College'}</span>
                        <span>&bull;</span>
                        <span className="text-emerald-400">Desk {log.deskNumber || deskNumber}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 font-bold font-mono">CHECKED IN</div>
                      <div className="text-slate-500 text-[11px] font-mono">{log.timestamp || 'Just now'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Check-In Activity Feed at Bottom (Visible in TEAMS tab) */}
        {activeTab === 'TEAMS' && (
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Recent Check-In Activity (Active Wristbands)</span>
              </h3>
              <span className="text-xs text-slate-400">Desk {deskNumber} Live</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {(recentLogs || []).slice(0, 3).map((log, idx) => (
                <div key={log._id || idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>{log.timestamp?.split(' ')[0] || 'Just now'}</span>
                    <span className="text-emerald-400 font-mono font-bold">#{log.qrId}</span>
                  </div>
                  <div className="font-semibold text-white truncate">{log.teamName}</div>
                  <div className="text-[11px] text-slate-400 truncate">{log.collegeName}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Barcode Allocation / Check-In Modal */}
      {isBarcodeModalOpen && (
        <QRAllocationModal
          team={selectedTeam}
          scannedQR={
            activeBarcodeScan || {
              qrId: 'BC-00042',
              status: 'UNUSED',
              message: 'Pre-printed barcode wristband ready for assignment',
            }
          }
          deskNumber={deskNumber}
          onClose={() => setIsBarcodeModalOpen(false)}
          onSuccess={(updatedTeam) => {
            setSelectedTeam(updatedTeam);
            fetchTeams();
            fetchData();
            if (updatedTeam.qrId) {
              updateOrReplaceLog({
                _id: `alloc-${Date.now()}`,
                qrId: updatedTeam.qrId,
                teamId: updatedTeam._id,
                teamName: updatedTeam.teamName,
                collegeName: updatedTeam.collegeName,
                deskNumber,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'SUCCESS',
              });
            }
          }}
        />
      )}

      {/* Print & Download Registered Teams Modal */}
      {isPrintModalOpen && (
        <PrintDownloadModal
          teams={teams}
          deskNumber={deskNumber}
          defaultStatus={printModalStatus}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
