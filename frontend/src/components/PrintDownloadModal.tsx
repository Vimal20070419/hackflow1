import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  X,
  Building,
  Users,
  CheckCircle,
  Clock,
  Barcode as BarcodeIcon,
  Filter,
  Search,
  Layers,
  Crown,
  Check,
  Zap,
} from 'lucide-react';
import { ITeam } from '../types/index.js';
import { downloadTeamsCSV } from '../utils/exportUtils.js';
import { sound } from '../utils/sound.js';

interface PrintDownloadModalProps {
  teams: ITeam[];
  deskNumber: number;
  onClose: () => void;
  defaultStatus?: 'ALL' | 'CONFIRMED' | 'PENDING';
}

export const PrintDownloadModal: React.FC<PrintDownloadModalProps> = ({
  teams = [],
  deskNumber = 1,
  onClose,
  defaultStatus = 'ALL',
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'PENDING'>(defaultStatus);
  const [collegeFilter, setCollegeFilter] = useState<string>('ALL');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Extract distinct colleges from teams
  const collegesList = useMemo(() => {
    const set = new Set<string>();
    teams.forEach((t) => {
      if (t.collegeName) set.add(t.collegeName);
    });
    return Array.from(set).sort();
  }, [teams]);

  // Extract distinct domains
  const domainsList = useMemo(() => {
    const set = new Set<string>();
    teams.forEach((t) => {
      if (t.domain) set.add(t.domain);
    });
    return Array.from(set).sort();
  }, [teams]);

  // Filtered dataset
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      if (statusFilter !== 'ALL' && t.registrationStatus !== statusFilter) {
        return false;
      }
      if (collegeFilter !== 'ALL' && t.collegeName !== collegeFilter) {
        return false;
      }
      if (domainFilter !== 'ALL' && t.domain !== domainFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const teamNameMatch = (t.teamName || t.name || '').toLowerCase().includes(q);
        const collegeMatch = (t.collegeName || '').toLowerCase().includes(q);
        const leaderMatch = (t.teamLeader?.name || '').toLowerCase().includes(q);
        const barcodeMatch = (t.qrId || '').toLowerCase().includes(q);
        const memberMatch = (t.members || []).some((m) => m.name.toLowerCase().includes(q));
        if (!teamNameMatch && !collegeMatch && !leaderMatch && !barcodeMatch && !memberMatch) {
          return false;
        }
      }
      return true;
    });
  }, [teams, statusFilter, collegeFilter, domainFilter, searchQuery]);

  const confirmedCount = useMemo(() => {
    return filteredTeams.filter((t) => t.registrationStatus === 'CONFIRMED').length;
  }, [filteredTeams]);

  const pendingCount = filteredTeams.length - confirmedCount;

  // Handle Download CSV
  const handleDownload = () => {
    sound.playSuccess();
    const label = statusFilter === 'ALL' ? 'All_Teams' : statusFilter === 'CONFIRMED' ? 'CheckedIn_Teams' : 'Pending_Teams';
    downloadTeamsCSV(filteredTeams, label);
  };

  // Handle Print Action
  const handlePrint = () => {
    sound.playSuccess();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:p-0 print:border-none print:bg-white print:max-w-none print:max-h-none print:shadow-none print:overflow-visible">
        {/* Modal Header (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950">
              <Printer className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Print &amp; Download Registered Teams Directory</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Desk {deskNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Filter and export the complete team rosters, leader contacts, domains, and assigned barcodes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar (Hidden on print) */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 shrink-0 space-y-3 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search name, college, barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center p-0.5 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('CONFIRMED')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'CONFIRMED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Checked In
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pending
              </button>
            </div>

            {/* College Dropdown */}
            <div>
              <select
                value={collegeFilter}
                onChange={(e) => setCollegeFilter(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ALL">All Colleges ({collegesList.length})</option>
                {collegesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Domain Dropdown */}
            <div>
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ALL">All Domains ({domainsList.length})</option>
                {domainsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-mono">
            <div>
              Showing <strong className="text-white">{filteredTeams.length}</strong> teams matching filter
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{confirmedCount} Checked In</span>
              </span>
              <span>&bull;</span>
              <span className="text-amber-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingCount} Pending</span>
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Report Content Area (Print Friendly) */}
        <div
          ref={printAreaRef}
          className="flex-1 overflow-y-auto p-6 bg-slate-900 custom-scrollbar print:p-0 print:bg-white print:overflow-visible"
        >
          {/* Official Printable Header (Visible on print or preview) */}
          <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800 print:bg-white print:border-b-2 print:border-black print:p-0 print:mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-black text-white print:text-black tracking-tight font-['Outfit']">
                  HACKFLOW 2026 &bull; OFFICIAL TEAM DIRECTORY REPORT
                </h1>
                <p className="text-xs text-slate-400 print:text-gray-700">
                  Event Registration Desk Check-in &amp; Barcode Wristband Roster
                </p>
              </div>
              <div className="text-right text-xs font-mono text-slate-400 print:text-gray-700">
                <div>Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                <div>Station: Desk #{deskNumber} &bull; Total Filtered: {filteredTeams.length}</div>
              </div>
            </div>

            {/* Quick Metrics in Print View */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs print:border-gray-300 print:mt-2 print:pt-2">
              <div className="text-slate-300 print:text-black">
                Total Teams: <strong>{filteredTeams.length}</strong>
              </div>
              <div className="text-emerald-400 print:text-black">
                Checked In: <strong>{confirmedCount}</strong>
              </div>
              <div className="text-amber-400 print:text-black">
                Pending: <strong>{pendingCount}</strong>
              </div>
            </div>
          </div>

          {/* Teams Table */}
          {filteredTeams.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No teams found matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-black">
              <table className="w-full text-left text-xs text-slate-300 print:text-black border-collapse">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800 print:bg-gray-100 print:text-black print:border-black">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Team &amp; College</th>
                    <th className="py-2.5 px-3">Domain</th>
                    <th className="py-2.5 px-3">Team Leader</th>
                    <th className="py-2.5 px-3">Members ({'&'} Contact)</th>
                    <th className="py-2.5 px-3">Barcode Wristband</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 print:divide-gray-300">
                  {filteredTeams.map((team, idx) => {
                    const isConfirmed = team.registrationStatus === 'CONFIRMED';
                    const leader = team.teamLeader || team.members?.find((m) => m.isLeader) || team.members?.[0];

                    return (
                      <tr
                        key={team._id || idx}
                        className={`hover:bg-slate-800/40 print:hover:bg-transparent ${
                          isConfirmed ? 'bg-slate-900/40 print:bg-transparent' : 'bg-slate-950/40 print:bg-transparent'
                        }`}
                      >
                        {/* 1. S.No */}
                        <td className="py-2.5 px-3 font-mono text-slate-400 print:text-black font-semibold">
                          {idx + 1}
                        </td>

                        {/* 2. Team & College */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white print:text-black text-sm">
                            {team.teamName || team.name || 'Unnamed Team'}
                          </div>
                          <div className="text-[11px] text-slate-400 print:text-gray-700 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-500 print:hidden" />
                            <span>{team.collegeName || 'General College'}</span>
                          </div>
                        </td>

                        {/* 3. Domain */}
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono text-[10px] print:border-black print:text-black">
                            {team.domain || 'General'}
                          </span>
                        </td>

                        {/* 4. Leader */}
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-amber-300 print:text-black flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400 print:hidden" />
                            <span>{leader?.name || 'Not Designated'}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 print:text-gray-700 font-mono">
                            {leader?.phone || leader?.email || ''}
                          </div>
                        </td>

                        {/* 5. Members */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5 text-[11px]">
                            {(team.members || []).map((m, mIdx) => (
                              <div key={mIdx} className="truncate max-w-[200px]">
                                <span className="font-medium text-slate-200 print:text-black">{m.name}</span>
                                {m.phone && (
                                  <span className="text-slate-500 print:text-gray-600 font-mono text-[10px] ml-1">
                                    ({m.phone})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* 6. Barcode */}
                        <td className="py-2.5 px-3 font-mono">
                          {team.qrId ? (
                            <span className="font-bold text-cyan-300 print:text-black text-xs px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 print:border-none print:p-0">
                              {team.qrId}
                            </span>
                          ) : (
                            <span className="text-slate-500 print:text-gray-500 text-[11px] italic">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* 7. Status */}
                        <td className="py-2.5 px-3">
                          {isConfirmed ? (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 print:border-black print:text-black">
                              CHECKED IN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 print:border-gray-500 print:text-black">
                              PENDING
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Signature Sign-off footer (Visible on print) */}
          <div className="hidden print:flex justify-between items-end mt-12 pt-6 border-t border-gray-300 text-xs text-black">
            <div>
              <div>Desk Operator Name: _______________________</div>
              <div className="mt-2">Signature &amp; Date: _______________________</div>
            </div>
            <div className="text-right">
              <div>Organizing Committee Lead: _______________________</div>
              <div className="mt-2">Verified Stamp: [ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden on print) */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0 print:hidden text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Dataset Ready for Download / Print</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Page</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
