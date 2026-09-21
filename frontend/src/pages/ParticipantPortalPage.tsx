import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Barcode as BarcodeIcon,
  Building,
  Users,
  Crown,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
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
  Sparkles,
  Keyboard,
  RefreshCw,
} from 'lucide-react';
import { ITeam, IProblemStatement } from '../types/index.js';
import { api } from '../services/api.js';
import { sound } from '../utils/sound.js';
import { BarcodeRenderer } from '../components/BarcodeRenderer.js';

interface ParticipantPortalPageProps {
  onSelectView?: (view: string) => void;
}

export const ParticipantPortalPage: React.FC<ParticipantPortalPageProps> = () => {
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [team, setTeam] = useState<ITeam | null>(null);

  // Device Camera States
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);

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
    let text = (val || '').trim();
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

  // Start Built-in Device Camera (Mobile back camera / Laptop webcam)
  const startCameraScanner = async () => {
    if (isUnlocked) return;
    setCameraLoading(true);
    setCameraError(null);

    try {
      const qrScannerElementId = 'participant-device-camera-reader';
      const el = document.getElementById(qrScannerElementId);
      if (!el) {
        setCameraLoading(false);
        return;
      }

      // Stop any existing instance
      if (html5QrCodeRef.current) {
        try {
          if (isScanningRef.current) {
            await html5QrCodeRef.current.stop();
          }
        } catch (e) {
          // ignore
        }
        html5QrCodeRef.current = null;
        isScanningRef.current = false;
      }

      // Discover camera devices
      let cameras: any[] = [];
      try {
        cameras = await Html5Qrcode.getCameras();
        setAvailableCameras(cameras || []);
      } catch (e) {
        // ignore device listing error
      }

      const html5QrCode = new Html5Qrcode(qrScannerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      // Select camera: preferred camera ID if available, otherwise environment facing mode
      let cameraConfig: any = { facingMode: 'environment' };
      if (cameras && cameras.length > 0) {
        const chosen = cameras[selectedCameraIndex] || cameras[0];
        if (chosen?.id) {
          cameraConfig = chosen.id;
        }
      }

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => ({
            width: Math.min(viewfinderWidth - 30, 320),
            height: Math.min(viewfinderHeight - 30, 200),
          }),
        },
        (decodedText) => {
          handleCameraScanSuccess(decodedText);
        },
        () => {
          // scanning frame
        }
      );

      isScanningRef.current = true;
      setCameraActive(true);
    } catch (err: any) {
      console.warn('[Camera] Device camera error:', err);
      setCameraError(
        'Camera permission was not granted or no built-in camera was found. Please allow camera permissions in your browser or enter your barcode manually below.'
      );
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current && isScanningRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        // ignore
      }
      isScanningRef.current = false;
    }
    setCameraActive(false);
  };

  const handleToggleCamera = async () => {
    if (cameraActive) {
      await stopCameraScanner();
    } else {
      await startCameraScanner();
    }
  };

  const handleSwitchCameraFacing = async () => {
    if (availableCameras.length <= 1) return;
    const nextIndex = (selectedCameraIndex + 1) % availableCameras.length;
    setSelectedCameraIndex(nextIndex);
    await stopCameraScanner();
    setTimeout(() => {
      startCameraScanner();
    }, 200);
  };

  // Start camera on mount when portal is locked
  useEffect(() => {
    if (!isUnlocked && !team) {
      const timer = setTimeout(() => {
        startCameraScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCameraScanner();
      };
    } else {
      stopCameraScanner();
    }
  }, [isUnlocked, team, selectedCameraIndex]);

  // Handle successful camera barcode/QR detection
  const handleCameraScanSuccess = async (rawCode: string) => {
    if (loading) return;
    const clean = normalizeBarcode(rawCode);
    if (!clean) return;

    sound.playSuccess();
    setLastScannedCode(clean);
    setBarcodeInput(clean);

    // Stop camera so it doesn't keep scanning in background
    await stopCameraScanner();

    // Fetch team
    await fetchTeamByBarcode(clean);
  };

  // Disable and lock browser "Go Back" action while in Participant Portal
  useEffect(() => {
    // Push current portal state to prevent back navigation out of portal
    window.history.pushState(null, '', window.location.href);

    const handlePreventGoBack = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePreventGoBack);
    return () => {
      window.removeEventListener('popstate', handlePreventGoBack);
    };
  }, []);

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
            'Could not verify wristband barcode. Ensure this wristband was assigned at Registration Desk.'
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
    const currentCode = teamBrief?.qrId || barcodeInput || lastScannedCode || '';
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
    setLastScannedCode(null);
    setBarcodeInput('');
    setTimeout(() => {
      startCameraScanner();
    }, 200);
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
      {/* Top Header Navigation (Switch Wristband if unlocked) */}
      {team && isUnlocked && (
        <div className="flex items-center justify-end">
          <button
            onClick={handleResetSession}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-rose-400 transition-colors cursor-pointer shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Scan Another Wristband</span>
          </button>
        </div>
      )}

      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>HackFlow Participant Portal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white font-['Outfit'] tracking-tight">
          Wristband Scanner
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Scan your wristband barcode using your mobile or laptop camera to verify your team and lock your problem statement.
        </p>
      </div>

      {/* STEP 1: Built-in Device Camera Scanner (If not unlocked) */}
      {!isUnlocked && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl max-w-lg mx-auto space-y-5">
          {/* Camera Scanner Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Device Camera Scanner</span>
            </div>

            {/* Camera Controls */}
            <div className="flex items-center gap-2">
              {availableCameras.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchCameraFacing}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition cursor-pointer"
                  title="Switch Camera (Front/Back)"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px]">Switch</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleCamera}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer border ${
                  cameraActive
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title={cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {cameraActive ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{cameraActive ? 'Live' : 'Off'}</span>
              </button>
            </div>
          </div>

          {/* Live Camera Viewfinder Box */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-emerald-500/40 shadow-inner aspect-[4/3] flex flex-col items-center justify-center">
            {/* HTML5 QR Code Container */}
            <div id="participant-device-camera-reader" className="w-full h-full object-cover"></div>

            {/* Overlay Target Framing */}
            {cameraActive && !loading && (
              <div className="absolute inset-6 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-3">
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-slate-950/80 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 shadow">
                  <BarcodeIcon className="w-3 h-3 text-emerald-400" />
                  POINT CAMERA AT WRISTBAND
                </span>

                {/* Laser scan line animation */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-sm shadow-emerald-400"></div>

                <span className="text-[9px] text-slate-400 font-mono bg-slate-950/80 px-2 py-0.5 rounded">
                  Supports 1D Barcodes & QR Codes
                </span>
              </div>
            )}

            {/* Camera Loading Overlay */}
            {cameraLoading && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span>Opening device camera...</span>
              </div>
            )}

            {/* Inactive Camera State */}
            {!cameraActive && !cameraLoading && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <CameraOff className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400 max-w-xs">
                  Camera is paused or access was not granted.
                </p>
                <button
                  type="button"
                  onClick={startCameraScanner}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera</span>
                </button>
              </div>
            )}
          </div>

          {/* Camera Error Alert */}
          {cameraError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Verifying wristband #{barcodeInput || lastScannedCode}...</span>
            </div>
          )}

          {/* General Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Manual Input Fallback Accordion */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="w-full text-center text-xs font-semibold text-slate-400 hover:text-emerald-400 flex items-center justify-center gap-1.5 py-1 transition cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>{showManualInput ? 'Hide Manual Entry' : 'Or Type Barcode Manually'}</span>
            </button>

            {showManualInput && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchTeamByBarcode(barcodeInput);
                }}
                className="mt-3 flex gap-2"
              >
                <div className="relative flex-1">
                  <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. BC-00042 or 42..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs uppercase text-emerald-400 outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !barcodeInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <span>Submit</span>
                </button>
              </form>
            )}
          </div>

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
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                    {team.domain}
                  </span>
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
                    {m.collegeName && (
                      <div className="text-[10px] text-cyan-400 truncate mt-0.5">
                        {m.collegeName}
                      </div>
                    )}
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

                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
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
