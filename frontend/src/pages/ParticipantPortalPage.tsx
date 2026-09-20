import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Barcode as BarcodeIcon,
  Building,
  Users,
  Crown,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Loader2,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  LogOut,
  Phone,
  Zap,
} from 'lucide-react';
import { ITeam, IProblemStatement } from '../types/index.js';
import { api } from '../services/api.js';
import { sound } from '../utils/sound.js';
import { BarcodeRenderer } from '../components/BarcodeRenderer.js';
import { useBarcodeScanner } from '../utils/useBarcodeScanner.js';

interface ParticipantPortalPageProps {
  onSelectView?: (view: string) => void;
}

export const ParticipantPortalPage: React.FC<ParticipantPortalPageProps> = ({ onSelectView }) => {
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [team, setTeam] = useState<ITeam | null>(null);

  // Password Protection State (Team Leader Phone Number)
  const [teamBrief, setTeamBrief] = useState<{
    teamName: string;
    collegeName: string;
    leaderName?: string;
    qrId: string;
  } | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [savedPassword, setSavedPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  // Problem statement selection state
  const [selectedProblem, setSelectedProblem] = useState<IProblemStatement | null>(null);
  const [confirmingProblem, setConfirmingProblem] = useState<IProblemStatement | null>(null);
  const [submittingProblem, setSubmittingProblem] = useState<boolean>(false);

  // Normalizes input or URLs: "1" -> "BC-00001", "http://.../?barcode=BC-00001" -> "BC-00001"
  const normalizeBarcode = (val: string): string => {
    let text = val.trim();
    if (text.includes('barcode=')) {
      try {
        const u = new URL(text);
        text = u.searchParams.get('barcode') || text;
      } catch (e) {
        const match = text.match(/barcode=([^&]+)/);
        if (match) text = match[1];
      }
    } else if (text.includes('qr=')) {
      try {
        const u = new URL(text);
        text = u.searchParams.get('qr') || text;
      } catch (e) {
        const match = text.match(/qr=([^&]+)/);
        if (match) text = match[1];
      }
    }
    const clean = text.trim().toUpperCase();
    if (/^\d{1,5}$/.test(clean)) {
      return `BC-${clean.padStart(5, '0')}`;
    }
    if (clean.startsWith('QR-')) {
      return `BC-${clean.slice(3)}`;
    }
    return clean;
  };

  // External Hardware Barcode Scanner Listener
  useBarcodeScanner({
    onScan: (scannedText) => {
      const formatted = normalizeBarcode(scannedText);
      sound.playSuccess();
      setBarcodeInput(formatted);
      fetchTeamByBarcode(formatted);
    },
    enabled: !isUnlocked,
  });

  // Auto-fetch if ?barcode= or ?qr= in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('barcode') || urlParams.get('qr');
    if (codeParam) {
      const formatted = normalizeBarcode(codeParam);
      setBarcodeInput(formatted);
      const cachedPwd = sessionStorage.getItem(`portal_pwd_${formatted}`) || '';
      if (cachedPwd) {
        setSavedPassword(cachedPwd);
        setPasswordInput(cachedPwd);
      }
      fetchTeamByBarcode(formatted, cachedPwd);
    }
  }, []);

  const fetchTeamByBarcode = async (code: string, pwd?: string) => {
    const targetCode = normalizeBarcode(code);
    if (!targetCode) return;
    setLoading(true);
    setErrorMsg(null);
    setPasswordError(null);

    const activePassword = pwd !== undefined ? pwd : savedPassword;

    try {
      const res = await api.get(`/portal/${targetCode}`, {
        params: activePassword ? { password: activePassword } : {},
      });

      if (res.data.success) {
        sound.playSuccess();
        setTeam(res.data.team);
        setSelectedProblem(res.data.team.selectedProblemStatement);
        setIsUnlocked(true);
        setTeamBrief(null);
        if (activePassword) {
          setSavedPassword(activePassword);
          sessionStorage.setItem(`portal_pwd_${targetCode}`, activePassword);
        }
      }
    } catch (err: any) {
      sound.playError();
      const data = err.response?.data;
      if (data?.requiresPassword) {
        setTeamBrief(data.teamBrief || { qrId: targetCode, teamName: 'Team', collegeName: '' });
        setIsUnlocked(false);
        setPasswordError(data.message || "Please enter the Team Leader's phone number.");
      } else {
        setErrorMsg(
          data?.message ||
            'Could not verify wristband barcode. Ensure this wristband was activated at Registration Desk.'
        );
        setTeam(null);
        setTeamBrief(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setPasswordError("Please enter the Team Leader's registered phone number.");
      return;
    }
    const currentCode = teamBrief?.qrId || barcodeInput;
    await fetchTeamByBarcode(currentCode, passwordInput.trim());
  };

  const handleResetSession = () => {
    setTeam(null);
    setTeamBrief(null);
    setSavedPassword('');
    setPasswordInput('');
    setIsUnlocked(false);
    setErrorMsg(null);
    setPasswordError(null);
  };

  const handleSelectProblem = async (problem: IProblemStatement) => {
    if (!team) return;
    if (selectedProblem) {
      alert('Problem statement is already locked and cannot be changed.');
      setConfirmingProblem(null);
      return;
    }
    setSubmittingProblem(true);

    try {
      const res = await api.post(
        `/portal/${team.qrId}/problem`,
        {
          problemId: problem.id,
          password: savedPassword,
        },
        {
          headers: {
            'x-portal-password': savedPassword,
          },
        }
      );

      if (res.data.success) {
        sound.playSuccess();
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#10b981', '#06b6d4', '#6366f1'],
        });
        setSelectedProblem(res.data.selectedProblemStatement);
        setConfirmingProblem(null);
      } else {
        sound.playError();
        alert(res.data.message || 'Failed to lock problem statement');
      }
    } catch (err: any) {
      sound.playError();
      alert(err.response?.data?.message || 'Error selecting problem statement');
    } finally {
      setSubmittingProblem(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => (onSelectView ? onSelectView('desk1') : window.history.back())}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Back to Registration Desk</span>
        </button>

        {team && isUnlocked && (
          <button
            onClick={handleResetSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Wristband</span>
          </button>
        )}
      </div>

      {/* Brand Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-white font-['Outfit'] tracking-tight">
          Participant Portal
        </h1>
      </div>

      {/* STEP 1: Barcode Input Card (If not unlocked) */}
      {!isUnlocked && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl max-w-lg mx-auto space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchTeamByBarcode(barcodeInput);
            }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <BarcodeIcon className="w-4 h-4 text-emerald-400" />
                <span>Wristband Barcode Scan</span>
              </label>

              {/* Hardware Scanner Status Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Scanner Gun Active</span>
              </div>
            </div>

            {/* Barcode Input and Submit Button */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="wristband-barcode-input"
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value.toUpperCase())}
                  placeholder="Scan wristband with gun or type (e.g. BC-00001)..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs uppercase text-emerald-400 outline-none focus:border-emerald-500"
                />
              </div>
              <button
                id="btn-access-wristband"
                type="submit"
                disabled={loading || !barcodeInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enter Portal'}
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 2: Password Prompt (Team Leader's Phone Number) */}
          {teamBrief && !isUnlocked && (
            <div className="pt-4 border-t border-slate-800 space-y-4 animate-in fade-in slide-in-from-bottom-2">
              {/* Team Identified Card */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white text-sm">{teamBrief.teamName}</span>
                  <span className="font-mono text-emerald-400 text-xs font-semibold">
                    {teamBrief.qrId}
                  </span>
                </div>
                <div className="text-xs text-slate-400 truncate">{teamBrief.collegeName}</div>
                {teamBrief.leaderName && (
                  <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1 pt-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>Team Leader: {teamBrief.leaderName}</span>
                  </div>
                )}
              </div>

              {/* Password Form */}
              <form onSubmit={handleVerifyPassword} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Password (Team Leader's Phone Number):</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setPasswordError(null);
                      }}
                      placeholder="Enter 10-digit mobile number"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !passwordInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Unlock Portal</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Full Team Dashboard (Unlocked after Password Verification) */}
      {team && isUnlocked && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Team Identity Banner */}
          <div className="p-6 rounded-2xl bg-slate-900 relative overflow-hidden border border-emerald-500/40 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Wristband: {team.qrId}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">{team.domain}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] tracking-tight">
                  {team.teamName}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium mt-1">
                  <Building className="w-4 h-4 text-emerald-400" />
                  <span>{team.collegeName}</span>
                </div>
              </div>

              {/* Barcode Graphic & Team Leader Card */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-700 shadow-inner flex items-center justify-center">
                  <BarcodeRenderer
                    value={team.qrId || 'BC-00000'}
                    height={30}
                    width={1.2}
                    fontSize={10}
                    lineColor="#0f172a"
                  />
                </div>

                {team.teamLeader && (
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/40 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                        Team Leader
                      </span>
                      <div className="text-sm font-bold text-white">{team.teamLeader.name}</div>
                      <div className="text-[11px] text-slate-400">{team.teamLeader.phone}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Members Roster */}
            <div className="mt-5 pt-4 border-t border-slate-800/80">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Team Roster ({team.members.length} Members)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
                {team.members.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs ${
                      m.name === team.teamLeader?.name
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-950/50 border-slate-800'
                    }`}
                  >
                    <div className="font-bold text-slate-200 truncate">{m.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {m.phone || m.email || 'Member'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Locked Problem Statement (If Already Chosen) */}
          {selectedProblem && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/50 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                    Selected Problem Statement (Locked)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  ID: {selectedProblem.id}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white font-['Outfit']">
                {selectedProblem.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedProblem.description}
              </p>

              {selectedProblem.tags && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {selectedProblem.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono text-cyan-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Available Problem Statements for Domain */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit'] tracking-tight flex items-center gap-2">
                Problem Statements &bull; {team.domain}
              </h3>
            </div>

            <div className="space-y-3">
              {(team.availableProblemStatements || []).map((prob) => {
                const isSelected = selectedProblem?.id === prob.id;

                return (
                  <div
                    key={prob.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-emerald-950/30 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                            {prob.id}
                          </span>
                          {prob.category && (
                            <span className="text-[11px] text-slate-400 font-semibold">
                              {prob.category}
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-white font-['Outfit']">
                          {prob.title}
                        </h4>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {prob.description}
                        </p>

                        {prob.tags && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {prob.tags.map((t, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <span className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Locked Selection</span>
                          </span>
                        ) : selectedProblem ? (
                          <span className="text-xs text-slate-500 font-medium px-3 py-2 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-600" />
                            <span>Locked</span>
                          </span>
                        ) : (
                          <button
                            id={`btn-select-problem-${prob.id}`}
                            onClick={() => setConfirmingProblem(prob)}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 transition-all"
                          >
                            <span>Select Problem</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmingProblem && (
        <div className="modal-overlay">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-black text-white font-['Outfit']">
              Confirm Problem Statement
            </h3>
            <p className="text-xs text-rose-300 font-medium mt-1">
              Warning: Once locked, this selection is final and cannot be changed.
            </p>

            <div className="p-4 my-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="font-mono text-[11px] font-bold text-emerald-400">
                {confirmingProblem.id}
              </span>
              <h4 className="text-sm font-bold text-white font-['Outfit']">
                {confirmingProblem.title}
              </h4>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmingProblem(null)}
                disabled={submittingProblem}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-problem-lock"
                onClick={() => handleSelectProblem(confirmingProblem)}
                disabled={submittingProblem}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 transition-all"
              >
                {submittingProblem ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirm & Lock Problem'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
