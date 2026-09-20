import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Smartphone,
  Camera,
  CheckCircle,
  ArrowLeft,
  Barcode as BarcodeIcon,
  Radio,
  Send,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { getSocket } from '../services/socket.js';
import { sound } from '../utils/sound.js';

interface MobileScannerPageProps {
  onSelectView: (view: string) => void;
  defaultDesk?: number;
}

export const MobileScannerPage: React.FC<MobileScannerPageProps> = ({
  onSelectView,
  defaultDesk = 1,
}) => {
  const [deskNumber, setDeskNumber] = useState<number>(defaultDesk);
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'PAIR_PHONE'>('CAMERA');
  const [manualCode, setManualCode] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deskParam = params.get('desk');
    if (deskParam) {
      setDeskNumber(Number(deskParam) || 1);
    }
  }, []);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const qrScannerId = 'mobile-barcode-reader';
      if (!document.getElementById(qrScannerId)) return;

      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode(qrScannerId, {
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

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 280, height: 180 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // scanning frames
        }
      );
      setCameraActive(true);
    } catch (err) {
      console.error('Camera start failed', err);
      setCameraError('Camera access not granted or unavailable on this device.');
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (activeTab === 'CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  // Transmit scan to desk via socket
  const handleScanSuccess = (code: string) => {
    let cleanCode = code.trim().toUpperCase();
    if (/^\d{1,5}$/.test(cleanCode)) {
      cleanCode = `BC-${cleanCode.padStart(5, '0')}`;
    }
    sound.playSuccess();
    setLastScanned(cleanCode);
    setScanCount((prev) => prev + 1);

    const socket = getSocket();
    socket.emit('qr-scanned', {
      deskNumber,
      rawScan: cleanCode,
      deviceId: `Phone Barcode Scanner (Desk ${deskNumber})`,
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode);
    setManualCode('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onSelectView(deskNumber === 2 ? 'desk2' : 'desk1')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Desk {deskNumber}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-400">
              Desk {deskNumber} Connected
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 my-auto space-y-5">
        {/* Toggle Mode: Camera vs Pair Instructions */}
        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('CAMERA')}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'CAMERA'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Camera Barcode Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PAIR_PHONE')}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'PAIR_PHONE'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Pair Another Phone</span>
          </button>
        </div>

        {/* TAB 1: Camera Scanner */}
        {activeTab === 'CAMERA' && (
          <div className="space-y-4">
            {/* Live Camera Viewfinder Box */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-emerald-500/40 shadow-2xl aspect-[4/3] flex flex-col items-center justify-center">
              <div id="mobile-barcode-reader" className="w-full h-full object-cover"></div>

              {/* Target Square Indicator */}
              <div className="absolute inset-8 border-2 border-dashed border-emerald-400/60 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-slate-950/80 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <BarcodeIcon className="w-3.5 h-3.5" />
                  POINT AT WRISTBAND BARCODE
                </span>
              </div>
            </div>

            {/* Success Feedback Card */}
            {lastScanned && (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[11px] text-emerald-400 block font-semibold">
                      Sent to Desk {deskNumber}
                    </span>
                    <strong className="text-base text-white font-mono">{lastScanned}</strong>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                  #{scanCount}
                </span>
              </div>
            )}

            {/* Error or Fallback Input */}
            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                {cameraError} You can type the barcode below.
              </div>
            )}

            {/* Manual Entry Fallback */}
            <form onSubmit={handleManualSubmit} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Manual Barcode Code Entry
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. BC-00042 or 42"
                  className="flex-1 h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  Send to Desk
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Pair Another Phone Instructions */}
        {activeTab === 'PAIR_PHONE' && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-center">
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">
                Pair Phone Camera with Desk {deskNumber}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Open this address on any mobile browser on the same Wi-Fi
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-emerald-400 flex items-center justify-center gap-2">
              <span>Station ID:</span>
              <strong className="text-base text-white">DSK-0{deskNumber}-4829</strong>
            </div>

            <div className="text-left space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">1</span>
                <span>Open your phone's browser (Safari or Chrome).</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">2</span>
                <span>Go to <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400">localhost:5173/scanner?desk={deskNumber}</code></span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0">3</span>
                <span>Allow camera permission. Every barcode you scan will automatically appear on Desk {deskNumber}'s screen!</span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('CAMERA')}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
            >
              Start Scanning on This Device
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 py-3 text-center text-xs text-slate-500">
        HackFlow Barcode Engine
      </footer>
    </div>
  );
};
