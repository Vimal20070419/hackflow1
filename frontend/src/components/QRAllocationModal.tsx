import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  AlertTriangle,
  CheckCircle,
  Barcode as BarcodeIcon,
  Users,
  Building,
  Crown,
  Check,
  Zap,
  Sparkles,
} from 'lucide-react';
import { ITeam } from '../types/index.js';
import { api } from '../services/api.js';
import { sound } from '../utils/sound.js';
import { BarcodeRenderer } from './BarcodeRenderer.js';
import { useBarcodeScanner } from '../utils/useBarcodeScanner.js';
import { extractSingleBarcode } from '../utils/barcodeUtils.js';

interface QRAllocationModalProps {
  team: ITeam | null;
  scannedQR: {
    qrId: string;
    status: 'UNUSED' | 'ALREADY_ALLOCATED' | 'INVALID_QR';
    allocatedTo?: {
      teamName: string;
      collegeName: string;
      teamLeader: string;
      allocatedAt: string;
      deskNumber: number;
    };
    message?: string;
  };
  deskNumber: number;
  onClose: () => void;
  onSuccess: (updatedTeam: ITeam) => void;
}

export const QRAllocationModal: React.FC<QRAllocationModalProps> = ({
  team,
  scannedQR,
  deskNumber,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successDone, setSuccessDone] = useState(false);

  // Editable Barcode ID for physical pre-printed wristband
  const [currentBarcode, setCurrentBarcode] = useState<string>(
    extractSingleBarcode(scannedQR.qrId || '')
  );
  const [unusedSuggestions, setUnusedSuggestions] = useState<string[]>([]);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Selected leader
  const [selectedLeader, setSelectedLeader] = useState<string>(
    team?.teamLeader?.name || team?.members?.[0]?.name || ''
  );

  const isAlreadyAllocated = scannedQR.status === 'ALREADY_ALLOCATED';

  // Hardware Barcode Scanner listener
  useBarcodeScanner({
    onScan: (cleanBarcode) => {
      sound.playSuccess();
      const singleCode = extractSingleBarcode(cleanBarcode);
      setCurrentBarcode(singleCode);
      setErrorMsg(null);
    },
    enabled: true,
  });

  // Sync if new scan comes in
  useEffect(() => {
    if (scannedQR.qrId) {
      setCurrentBarcode(extractSingleBarcode(scannedQR.qrId));
    }
  }, [scannedQR.qrId]);

  // Autofocus input and load next unused wristbands from physical pool
  useEffect(() => {
    const timer = setTimeout(() => {
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    }, 120);

    api.get('/qr/pool', { params: { status: 'UNUSED' } })
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.qrCodes)) {
          setUnusedSuggestions(res.data.qrCodes.slice(0, 5).map((q: any) => q.qrId));
        }
      })
      .catch(() => null);

    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = async () => {
    if (!team) {
      setErrorMsg('No team selected.');
      return;
    }

    if (!selectedLeader) {
      setErrorMsg('Please select a Team Leader before confirming check-in.');
      return;
    }

    const formattedCode = extractSingleBarcode(currentBarcode);
    if (!formattedCode) {
      setErrorMsg('Please scan with your external barcode scanner or type the wristband code.');
      barcodeInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Assign leader if needed
      if (selectedLeader !== team.teamLeader?.name) {
        await api.post(`/teams/${team._id}/leader`, { memberName: selectedLeader }).catch(() => null);
      }

      // 2. Allocate physical pre-printed Barcode wristband
      const res = await api.post('/qr/allocate', {
        qrId: formattedCode,
        teamId: team._id,
        deskNumber,
        allocatedBy: `Desk ${deskNumber}`,
      });

      if (res.data.success) {
        sound.playSuccess();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b'],
        });
        setSuccessDone(true);
        setTimeout(() => {
          onSuccess(res.data.team);
          onClose();
        }, 1000);
      } else {
        sound.playError();
        setErrorMsg(res.data.message || 'Could not allocate barcode');
      }
    } catch (err: any) {
      sound.playError();
      const msg = err.response?.data?.message || 'Server error allocating barcode';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <BarcodeIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">
              Check-In &amp; Assign Barcode Wristband
            </h3>
            <p className="text-xs text-slate-400">
              Registration Desk {deskNumber} Station
            </p>
          </div>
        </div>

        {/* Conflict Alert if Barcode is already used */}
        {isAlreadyAllocated && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-rose-200">Barcode Wristband Already Allocated!</strong>
              <span>
                Wristband <strong>{scannedQR.qrId}</strong> was already given to{' '}
                <strong>{scannedQR.allocatedTo?.teamName}</strong> ({scannedQR.allocatedTo?.collegeName}). Please scan a new wristband.
              </span>
            </div>
          </div>
        )}

        {/* Team & College Info Box */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              <span>{team?.collegeName || 'Selected College'}</span>
            </span>
            <span className="text-slate-400 font-mono">
              ID: {team?.registrationId || team?._id?.slice(-6)}
            </span>
          </div>

          <div className="text-xl font-black text-white font-['Outfit']">
            {team?.teamName || team?.name || 'Selected Team'}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Domain: <strong className="text-slate-300">{team?.domain || 'General'}</strong></span>
            <span>Members: <strong className="text-slate-300">{team?.members?.length ?? 0} participants</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Select Team Leader */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Select Team Leader:</span>
            </label>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {(team?.members || []).map((member) => {
                const isLead = selectedLeader === member.name;
                return (
                  <div
                    key={member.name}
                    onClick={() => setSelectedLeader(member.name)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                      isLead
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white font-semibold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={isLead}
                        onChange={() => setSelectedLeader(member.name)}
                        className="accent-emerald-500"
                      />
                      <span>{member.name}</span>
                      {member.phone && (
                        <span className="text-slate-400 font-mono text-[11px]">{member.phone}</span>
                      )}
                    </div>

                    {isLead && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        LEADER
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Wristband Barcode Code Input & Hardware Scanner Support */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <BarcodeIcon className="w-4 h-4 text-emerald-400" />
                <span>Wristband Barcode Scan</span>
              </label>

              {/* Hardware Scanner Status Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>USB / Bluetooth Scanner Ready</span>
              </div>
            </div>

            {/* Input Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Aim barcode scanner gun at wristband or enter code:</span>
              </div>
              <div className="relative">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={currentBarcode}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const rawVal = e.target.value.toUpperCase();
                    // If multiple scans accumulated or pasted, extract the single latest code
                    const cleaned = extractSingleBarcode(rawVal);
                    setCurrentBarcode(cleaned || rawVal);
                  }}
                  placeholder="Scan wristband with barcode gun or type (e.g. BC-00015)..."
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm tracking-wide focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                {currentBarcode && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentBarcode('');
                      barcodeInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer px-2 py-1 rounded bg-slate-800"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Live Barcode Graphic Preview */}
            {currentBarcode && (
              <div className="p-2 rounded-lg bg-white flex items-center justify-center border border-slate-700">
                <BarcodeRenderer
                  value={extractSingleBarcode(currentBarcode)}
                  height={28}
                  width={1.3}
                  fontSize={10}
                  lineColor="#0f172a"
                />
              </div>
            )}

            {/* Quick Suggestions from Physical Pool */}
            {unusedSuggestions.length > 0 && !currentBarcode && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-slate-400">Next unused in pool:</span>
                {unusedSuggestions.map((bc) => (
                  <button
                    key={bc}
                    type="button"
                    onClick={() => setCurrentBarcode(bc)}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-mono text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    {bc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || successDone}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                successDone
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 hover:shadow-emerald-500/40'
              } disabled:opacity-50`}
            >
              {submitting ? (
                <span>Assigning Barcode Wristband...</span>
              ) : successDone ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Barcode Assigned &amp; Checked In!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirm Check-In &amp; Assign Barcode</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
