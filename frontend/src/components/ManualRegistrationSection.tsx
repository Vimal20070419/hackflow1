import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building,
  Users,
  Crown,
  Sparkles,
  Barcode as BarcodeIcon,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Printer,
  Layers,
  Phone,
  Mail,
  Zap,
  ArrowRight,
  ShieldCheck,
  Award,
  Check,
  X,
  Info,
} from 'lucide-react';
import { ITeam, IDatasetParticipant, ITeamMember } from '../types/index.js';
import { api } from '../services/api.js';
import { sound } from '../utils/sound.js';
import { useBarcodeScanner } from '../utils/useBarcodeScanner.js';
import { extractSingleBarcode } from '../utils/barcodeUtils.js';
import { BarcodeRenderer } from './BarcodeRenderer.js';

interface ManualRegistrationSectionProps {
  deskNumber: number;
  onSuccessCheckin?: (team: ITeam) => void;
}

interface CollegeItem {
  collegeName: string;
  participantCount: number;
  teamCount: number;
  teamNames: string[];
}

export const ManualRegistrationSection: React.FC<ManualRegistrationSectionProps> = ({
  deskNumber = 1,
  onSuccessCheckin,
}) => {
  // Step / Form Data States
  const [colleges, setColleges] = useState<CollegeItem[]>([]);
  const [loadingColleges, setLoadingColleges] = useState<boolean>(true);
  const [selectedCollege, setSelectedCollege] = useState<string>('');
  const [collegeSearch, setCollegeSearch] = useState<string>('');

  // Participants & Teams data for selected college
  const [collegeParticipants, setCollegeParticipants] = useState<IDatasetParticipant[]>([]);
  const [existingTeams, setExistingTeams] = useState<ITeam[]>([]);
  const [loadingCollegeData, setLoadingCollegeData] = useState<boolean>(false);
  const [participantSearch, setParticipantSearch] = useState<string>('');

  // Form Fields
  const [teamName, setTeamName] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<
    Array<{ name: string; phone: string; email: string; isLeader: boolean; domain?: string }>
  >([]);
  const [selectedLeaderName, setSelectedLeaderName] = useState<string>('');
  const [computedDomain, setComputedDomain] = useState<string>('Gen AI & AI');
  const [barcodeInput, setBarcodeInput] = useState<string>('');

  // Barcode validation state
  const [barcodeStatus, setBarcodeStatus] = useState<{
    status: 'IDLE' | 'VALID' | 'WARNING' | 'ERROR';
    message: string;
  }>({ status: 'IDLE', message: '' });

  // Custom Member Modal
  const [showAddCustomModal, setShowAddCustomModal] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customEmail, setCustomEmail] = useState<string>('');

  // Submission & Result States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    team: ITeam;
    leaderDomain: string;
    message: string;
  } | null>(null);

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);

  // 1. Fetch initial colleges list on mount
  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    setLoadingColleges(true);
    try {
      const res = await api.get('/teams/dataset-participants');
      if (res.data.success) {
        setColleges(res.data.colleges || []);
      }
    } catch (err: any) {
      console.error('Failed to load dataset colleges:', err);
    } finally {
      setLoadingColleges(false);
    }
  };

  // 2. Fetch participants & existing teams when a college is chosen
  useEffect(() => {
    if (!selectedCollege) {
      setCollegeParticipants([]);
      setExistingTeams([]);
      return;
    }

    const fetchCollegeData = async () => {
      setLoadingCollegeData(true);
      try {
        const res = await api.get('/teams/dataset-participants', {
          params: { college: selectedCollege },
        });
        if (res.data.success) {
          setCollegeParticipants(res.data.participants || []);
          setExistingTeams(res.data.existingTeams || []);
        }
      } catch (err) {
        console.error('Failed to load college data:', err);
      } finally {
        setLoadingCollegeData(false);
      }
    };

    fetchCollegeData();
  }, [selectedCollege]);

  // 3. Automatically compute Team Domain when Leader changes (Locked to Leader's Domain in dataset!)
  useEffect(() => {
    if (!selectedLeaderName) {
      return;
    }

    // Look for leader in college dataset participants
    const match = collegeParticipants.find(
      (p) => p.name.trim().toLowerCase() === selectedLeaderName.trim().toLowerCase()
    );

    if (match && match.domain) {
      setComputedDomain(match.domain);
    } else {
      // Look in selected members if domain is attached
      const member = selectedMembers.find(
        (m) => m.name.trim().toLowerCase() === selectedLeaderName.trim().toLowerCase()
      );
      if (member?.domain) {
        setComputedDomain(member.domain);
      }
    }
  }, [selectedLeaderName, collegeParticipants, selectedMembers]);

  // 4. Barcode Verification Debounce
  useEffect(() => {
    if (!barcodeInput.trim()) {
      setBarcodeStatus({ status: 'IDLE', message: '' });
      return;
    }

    const clean = extractSingleBarcode(barcodeInput);
    const timer = setTimeout(async () => {
      try {
        const res = await api.post('/qr/verify', { qrId: clean });
        if (res.data.success) {
          setBarcodeStatus({
            status: 'VALID',
            message: `Barcode ${clean} is available and valid.`,
          });
        }
      } catch (err: any) {
        if (err.response?.data?.status === 'ALREADY_ALLOCATED') {
          setBarcodeStatus({
            status: 'WARNING',
            message: `Barcode ${clean} is currently assigned to "${err.response.data.allocatedTo?.teamName}". Re-assigning will transfer it.`,
          });
        } else {
          setBarcodeStatus({
            status: 'ERROR',
            message: err.response?.data?.message || `Barcode ${clean} is invalid.`,
          });
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [barcodeInput]);

  // 5. Hardware Barcode Scanner Hook
  useBarcodeScanner({
    onScan: (scannedCode) => {
      const clean = extractSingleBarcode(scannedCode);
      sound.playSuccess();
      setBarcodeInput(clean);
    },
  });

  // Filtered colleges by search
  const filteredColleges = useMemo(() => {
    if (!collegeSearch.trim()) return colleges;
    const q = collegeSearch.toLowerCase();
    return colleges.filter((c) => c.collegeName.toLowerCase().includes(q));
  }, [colleges, collegeSearch]);

  // Filtered participants by search
  const filteredParticipants = useMemo(() => {
    if (!participantSearch.trim()) return collegeParticipants;
    const q = participantSearch.toLowerCase();
    return collegeParticipants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.originalTeamName.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q)
    );
  }, [collegeParticipants, participantSearch]);

  // Action: Select / Autofill from Existing Team
  const handleSelectExistingTeam = (team: ITeam) => {
    sound.playClick();
    setTeamName(team.teamName);
    const members = (team.members || []).map((m, idx) => {
      // find participant in dataset to preserve domain
      const p = collegeParticipants.find((cp) => cp.name.toLowerCase() === m.name.toLowerCase());
      return {
        name: m.name,
        phone: m.phone || p?.phone || '',
        email: m.email || p?.email || '',
        isLeader: Boolean(m.isLeader || (team.teamLeader && team.teamLeader.name === m.name) || idx === 0),
        domain: p?.domain || team.domain,
      };
    });

    setSelectedMembers(members);
    const leader = members.find((m) => m.isLeader) || members[0];
    if (leader) {
      setSelectedLeaderName(leader.name);
      if (leader.domain) setComputedDomain(leader.domain);
    }
  };

  // Action: Toggle Member Checkbox
  const handleToggleMember = (participant: IDatasetParticipant) => {
    sound.playClick();
    const isSelected = selectedMembers.some(
      (m) => m.name.toLowerCase() === participant.name.toLowerCase()
    );

    if (isSelected) {
      // Remove member
      const updated = selectedMembers.filter(
        (m) => m.name.toLowerCase() !== participant.name.toLowerCase()
      );
      setSelectedMembers(updated);
      // If removed member was leader, reassign leader
      if (selectedLeaderName.toLowerCase() === participant.name.toLowerCase()) {
        if (updated.length > 0) {
          updated[0].isLeader = true;
          setSelectedLeaderName(updated[0].name);
          if (updated[0].domain) setComputedDomain(updated[0].domain);
        } else {
          setSelectedLeaderName('');
        }
      }
    } else {
      // Add member
      const isFirst = selectedMembers.length === 0;
      const newMember = {
        name: participant.name,
        phone: participant.phone,
        email: participant.email,
        isLeader: isFirst,
        domain: participant.domain,
      };

      const updated = [...selectedMembers, newMember];
      setSelectedMembers(updated);

      if (isFirst) {
        setSelectedLeaderName(participant.name);
        setComputedDomain(participant.domain);
      }

      // Auto set team name if empty
      if (!teamName && participant.originalTeamName) {
        setTeamName(participant.originalTeamName);
      }
    }
  };

  // Action: Change Team Leader
  const handleSetLeader = (memberName: string) => {
    sound.playClick();
    setSelectedLeaderName(memberName);
    const updated = selectedMembers.map((m) => ({
      ...m,
      isLeader: m.name.toLowerCase() === memberName.toLowerCase(),
    }));
    setSelectedMembers(updated);

    // Look up domain for this leader in the dataset
    const matched = collegeParticipants.find(
      (p) => p.name.toLowerCase() === memberName.toLowerCase()
    );
    if (matched && matched.domain) {
      setComputedDomain(matched.domain);
    }
  };

  // Action: Add Custom Walk-in Member
  const handleAddCustomMember = () => {
    if (!customName.trim()) return;
    const isFirst = selectedMembers.length === 0;
    const newMember = {
      name: customName.trim(),
      phone: customPhone.trim(),
      email: customEmail.trim().toLowerCase(),
      isLeader: isFirst,
      domain: computedDomain,
    };
    setSelectedMembers([...selectedMembers, newMember]);
    if (isFirst) {
      setSelectedLeaderName(customName.trim());
    }
    setCustomName('');
    setCustomPhone('');
    setCustomEmail('');
    setShowAddCustomModal(false);
    sound.playSuccess();
  };

  // Action: Submit Manual Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCollege) {
      setErrorMessage('Please select a college from the dataset.');
      return;
    }
    if (!teamName.trim()) {
      setErrorMessage('Please enter or select a team name.');
      return;
    }
    if (selectedMembers.length === 0) {
      setErrorMessage('Please select at least 1 team member.');
      return;
    }
    if (!selectedLeaderName) {
      setErrorMessage('Please designate a Team Leader from the selected members.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        collegeName: selectedCollege,
        teamName: teamName.trim(),
        members: selectedMembers,
        leaderName: selectedLeaderName,
        domain: computedDomain,
        barcode: barcodeInput ? extractSingleBarcode(barcodeInput) : undefined,
        deskNumber,
      };

      const res = await api.post('/teams/manual-register', payload);

      if (res.data.success) {
        sound.playSuccess();
        setSuccessResult({
          team: res.data.team,
          leaderDomain: res.data.leaderDomain || computedDomain,
          message: res.data.message,
        });
        if (onSuccessCheckin) {
          onSuccessCheckin(res.data.team);
        }
      } else {
        setErrorMessage(res.data.message || 'Registration failed.');
      }
    } catch (err: any) {
      console.error('Manual registration error:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to submit manual registration.');
      sound.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to register another team
  const handleResetForm = () => {
    setTeamName('');
    setSelectedMembers([]);
    setSelectedLeaderName('');
    setBarcodeInput('');
    setBarcodeStatus({ status: 'IDLE', message: '' });
    setSuccessResult(null);
    setErrorMessage(null);
    sound.playClick();
  };

  // Print confirmation badge/card
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/30 rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Registration Desk {deskNumber} &bull; Dataset Operations</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Manual Team Registration & Verification</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-medium">
                Live Dataset Mode
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Select college and participants from dataset. The team's domain is strictly locked to the designated Leader's registered domain in the dataset.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchColleges}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-2 text-xs font-semibold"
              title="Refresh dataset from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingColleges ? 'animate-spin' : ''}`} />
              <span>Sync Dataset</span>
            </button>
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Hardware Scanner Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success View after Registration */}
      {successResult ? (
        <div className="bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-8 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
              </div>
              <h2 className="text-2xl font-bold text-white">Manual Registration Confirmed!</h2>
              <p className="text-slate-300 text-sm">{successResult.message}</p>
            </div>

            {/* Printable Confirmation Card */}
            <div
              ref={printRef}
              className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-6 shadow-inner space-y-5 print:border-black print:text-black"
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">Team Name</span>
                  <h3 className="text-xl font-black text-white">{successResult.team.teamName}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>{successResult.team.collegeName}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-400">Desk Verified</span>
                  <div className="text-sm font-bold text-cyan-300 font-mono">Desk #{deskNumber}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Domain info */}
                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                  <div className="text-xs text-indigo-300 font-medium mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Locked Team Domain (by Leader)</span>
                  </div>
                  <div className="text-base font-bold text-white tracking-wide">
                    {successResult.leaderDomain}
                  </div>
                </div>

                {/* Barcode Wristband Info */}
                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col justify-between">
                  <div className="text-xs text-cyan-300 font-medium mb-1 flex items-center gap-1.5">
                    <BarcodeIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Assigned Barcode Wristband</span>
                  </div>
                  {successResult.team.qrId ? (
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-lg font-black text-cyan-300">
                        {successResult.team.qrId}
                      </span>
                      <div className="bg-white p-1 rounded">
                        <BarcodeRenderer value={successResult.team.qrId} height={28} displayValue={false} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No barcode assigned yet</span>
                  )}
                </div>
              </div>

              {/* Members Roster */}
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 block">
                  Registered Members ({successResult.team.members?.length || 0})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {successResult.team.members?.map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        m.isLeader
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-1.5">
                          {m.name}
                          {m.isLeader && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                              LEADER
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{m.phone || 'No phone'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition flex items-center gap-2 border border-slate-700"
              >
                <Printer className="w-4 h-4" />
                <span>Print Check-in Receipt</span>
              </button>
              <button
                onClick={handleResetForm}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm transition shadow-lg shadow-cyan-500/25 flex items-center gap-2"
              >
                <span>Register Next Team</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Main Registration Form Grid */
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: College & Participant Selector (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. College Selector Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-cyan-400" />
                    <span>Select College from Dataset</span>
                  </h2>
                </div>
                {selectedCollege && (
                  <span className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                    {collegeParticipants.length} students found
                  </span>
                )}
              </div>

              {/* College Search / Select input */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search or filter colleges (e.g., JJ College, Kamaraj, Nandha...)"
                    value={collegeSearch}
                    onChange={(e) => setCollegeSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-500 outline-none transition"
                  />
                  {collegeSearch && (
                    <button
                      type="button"
                      onClick={() => setCollegeSearch('')}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* College Selector Dropdown / Scroll List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {loadingColleges ? (
                    <div className="py-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Loading colleges from dataset...</span>
                    </div>
                  ) : filteredColleges.length === 0 ? (
                    <div className="py-4 text-center text-slate-500 text-xs">
                      No colleges matching "{collegeSearch}"
                    </div>
                  ) : (
                    filteredColleges.map((c) => {
                      const isSelected = selectedCollege === c.collegeName;
                      return (
                        <button
                          key={c.collegeName}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setSelectedCollege(c.collegeName);
                            // reset team state for fresh college
                            setSelectedMembers([]);
                            setSelectedLeaderName('');
                            setTeamName('');
                          }}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition flex items-center justify-between border ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-white font-semibold shadow-sm shadow-cyan-500/10'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/70 hover:border-slate-700'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="truncate font-medium">{c.collegeName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {c.teamCount} registered teams &bull; {c.participantCount} participants
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* 2. Participants Roster from Dataset for Selected College */}
            {selectedCollege && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span>Select Team Members from Dataset</span>
                      </h2>
                      <p className="text-slate-400 text-xs">
                        Check participants from this college to include in the team roster.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddCustomModal(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    <span>+ Custom Member</span>
                  </button>
                </div>

                {/* Quick Existing Team Pre-Sets */}
                {existingTeams.length > 0 && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Quick Load Existing Teams for this College:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {existingTeams.map((t) => (
                        <button
                          key={t._id}
                          type="button"
                          onClick={() => handleSelectExistingTeam(t)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition border flex items-center gap-1.5 ${
                            teamName.toLowerCase() === t.teamName.toLowerCase()
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <span>{t.teamName}</span>
                          <span className="text-[10px] text-slate-500">({t.members?.length || 0}m)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search in College Participants */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search member by name, phone, email, or domain..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-white placeholder-slate-500 outline-none transition"
                  />
                </div>

                {/* Participant List */}
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {loadingCollegeData ? (
                    <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Loading participants for {selectedCollege}...</span>
                    </div>
                  ) : filteredParticipants.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      No participants found in dataset matching criteria.
                    </div>
                  ) : (
                    filteredParticipants.map((p, idx) => {
                      const isSelected = selectedMembers.some(
                        (m) => m.name.toLowerCase() === p.name.toLowerCase()
                      );
                      const isLeader =
                        selectedLeaderName.toLowerCase() === p.name.toLowerCase();

                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleMember(p)}
                          className={`p-3 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm shadow-indigo-500/10'
                              : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by div click
                              className="w-4 h-4 rounded text-indigo-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 border-slate-700 cursor-pointer"
                            />
                            <div>
                              <div className="font-semibold text-white flex items-center gap-2">
                                <span>{p.name}</span>
                                {isLeader && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                                    <Crown className="w-3 h-3" />
                                    <span>LEADER</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                                {p.phone && (
                                  <span className="flex items-center gap-1 font-mono">
                                    <Phone className="w-2.5 h-2.5 text-slate-500" />
                                    {p.phone}
                                  </span>
                                )}
                                {p.email && (
                                  <span className="flex items-center gap-1 truncate max-w-[180px]">
                                    <Mail className="w-2.5 h-2.5 text-slate-500" />
                                    {p.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end gap-1">
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono">
                              {p.domain}
                            </span>
                            {p.originalTeamName && (
                              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                                Team: {p.originalTeamName}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Team Composition, Leader & Domain Lock, Barcode Check-in (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* 3. Team Name & Roster Summary */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>Designate Team Leader</span>
                  </h2>
                </div>
                <span className="text-xs text-amber-400 font-mono">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Team Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Team Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter team name (e.g. HackTitans, Zentech...)"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-white placeholder-slate-500 outline-none transition font-semibold"
                />
              </div>

              {/* Selected Members Roster with Leader Radio */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Selected Roster & Leader Selection</span>
                  <span className="text-[10px] text-slate-500">Click crown to pick Leader</span>
                </label>

                {selectedMembers.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 text-xs">
                    No members selected yet. Check participants from the left list.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedMembers.map((m, idx) => {
                      const isLeader = selectedLeaderName.toLowerCase() === m.name.toLowerCase();
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition ${
                            isLeader
                              ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-sm shadow-amber-500/10'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleSetLeader(m.name)}
                              className={`p-1.5 rounded-lg transition ${
                                isLeader
                                  ? 'bg-amber-400 text-slate-950 shadow-md'
                                  : 'bg-slate-800 text-slate-500 hover:text-amber-400 hover:bg-slate-700'
                              }`}
                              title="Set as Team Leader"
                            >
                              <Crown className="w-4 h-4" />
                            </button>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>{m.name}</span>
                                {isLeader && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">
                                    LEADER
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {m.phone || m.email || 'No contact'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {m.domain && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                {m.domain}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = selectedMembers.filter((sm) => sm.name !== m.name);
                                setSelectedMembers(updated);
                                if (isLeader && updated.length > 0) {
                                  setSelectedLeaderName(updated[0].name);
                                }
                              }}
                              className="p-1 rounded text-slate-600 hover:text-red-400 transition"
                              title="Remove member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. CRITICAL REQUIREMENT DISPLAY: Domain Locked to Leader's Domain in Dataset */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 font-bold">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Domain Auto-Assigned by Leader</span>
                  </span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.2 rounded-full font-mono">
                    Dataset Locked
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-base font-black text-white tracking-wide flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>{computedDomain}</span>
                    </div>
                    <div className="text-[11px] text-indigo-300/80 mt-0.5">
                      {selectedLeaderName ? (
                        <span>
                          Locked to Leader <strong className="text-white">{selectedLeaderName}</strong>'s dataset domain.
                        </span>
                      ) : (
                        <span>Select a team leader above to lock the domain.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Barcode Wristband Scanner & Assignment */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-bold">
                    <BarcodeIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Wristband Barcode ID</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Scan with hardware gun or type
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. BC-00042 or FOR-BC-001"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-cyan-300 font-mono tracking-wider placeholder-slate-600 outline-none transition"
                  />
                  <BarcodeIcon className="w-4 h-4 absolute right-3.5 top-3 text-cyan-500/60" />
                </div>

                {/* Barcode status feedback */}
                {barcodeStatus.status !== 'IDLE' && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                      barcodeStatus.status === 'VALID'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : barcodeStatus.status === 'WARNING'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    {barcodeStatus.status === 'VALID' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{barcodeStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm tracking-wide transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Registration & Check-in...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm Manual Registration & Check-in</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Modal: Add Custom Walk-in Member */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Add Walk-in / Custom Member</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. student@college.edu"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomMember}
                disabled={!customName.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-bold"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
