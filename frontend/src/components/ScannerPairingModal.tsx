import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Smartphone,
  CheckCircle2,
  Copy,
  ExternalLink,
  Radio,
  RefreshCw,
  Loader2,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useSocket } from '../context/SocketContext.js';
import { BarcodeRenderer } from './BarcodeRenderer.js';

interface ScannerPairingModalProps {
  deskNumber: number;
  onClose: () => void;
}

export const ScannerPairingModal: React.FC<ScannerPairingModalProps> = ({ deskNumber, onClose }) => {
  const { pairedScanner } = useSocket();

  const [loading, setLoading] = useState(true);
  const [pairingUrl, setPairingUrl] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [copied, setCopied] = useState(false);

  const generateSession = async () => {
    setLoading(true);
    try {
      const res = await api.post('/scanner/pair-session', { deskNumber });
      if (res.data.success) {
        setPairingUrl(res.data.pairingUrl);
        setPairingCode(res.data.pairingCode);
      }
    } catch (err) {
      console.error('Failed to generate pairing session', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateSession();
  }, [deskNumber]);

  const copyUrl = () => {
    navigator.clipboard.writeText(pairingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl backdrop-blur-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BarcodeIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">Pair Mobile Barcode Scanner</h3>
            <p className="text-xs text-slate-400">
              Registration Desk {deskNumber}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <p className="text-xs text-slate-400">Generating secure pairing token...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status indicator */}
            {pairedScanner ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 animate-in fade-in">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-sm text-emerald-200">Phone Connected!</div>
                  <div className="text-emerald-400/80">
                    Device: <strong>{pairedScanner.deviceId}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Waiting for phone scanner to connect...</span>
                </div>
                <button
                  onClick={generateSession}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                  title="Generate new pairing code"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
            )}

            {/* Pairing Barcode Visual Display */}
            {pairingCode && (
              <div className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="p-3 bg-white rounded-xl shadow-inner flex flex-col items-center justify-center">
                  <BarcodeRenderer
                    value={`PAIR-${pairingCode}`}
                    height={45}
                    width={1.8}
                    fontSize={13}
                    lineColor="#0f172a"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-2">Scan with camera or type numeric pairing code</span>
              </div>
            )}

            {/* Manual Code Option */}
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Pairing Code
                  </span>
                  <div className="font-mono text-xl font-bold tracking-widest text-emerald-400">
                    {pairingCode}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={copyUrl}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'Copied' : 'Copy URL'}
                  </button>
                  <a
                    href={pairingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center gap-1 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Tab
                  </a>
                </div>
              </div>
            </div>

            {/* Confirm / Done */}
            <div className="flex justify-end pt-1">
              <button onClick={onClose} className="btn-primary w-full text-xs">
                {pairedScanner ? 'Continue to Dashboard' : 'Done & Close'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
