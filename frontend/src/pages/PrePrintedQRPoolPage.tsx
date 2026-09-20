import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Sparkles,
  ExternalLink,
  Zap,
  ArrowLeft,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import { IBarcode } from '../types/index.js';
import { api } from '../services/api.js';
import { getSocket } from '../services/socket.js';
import { sound } from '../utils/sound.js';
import { BarcodeRenderer } from '../components/BarcodeRenderer.js';

interface PrePrintedBarcodePoolPageProps {
  onSelectView?: (view: string) => void;
  defaultDesk?: number;
}

export const PrePrintedQRPoolPage: React.FC<PrePrintedBarcodePoolPageProps> = ({
  onSelectView,
  defaultDesk = 1,
}) => {
  const [barcodes, setBarcodes] = useState<IBarcode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNUSED' | 'ALLOCATED'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [summary, setSummary] = useState<{ total: number; allocated: number; unused: number }>({
    total: 100,
    allocated: 0,
    unused: 100,
  });

  const fetchPool = async () => {
    setLoading(true);
    try {
      const res = await api.get('/qr/pool', {
        params: { status: statusFilter, search: search.trim() },
      });
      if (res.data.success) {
        setBarcodes(res.data.qrCodes);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (e) {
      console.error('Failed to fetch barcode pool', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPool();
  }, [statusFilter, search]);

  const handleSimulateScan = (codeId: string, deskNum: number) => {
    sound.playSuccess();
    const socket = getSocket();
    socket.emit('qr-scanned', {
      deskNumber: deskNum,
      rawScan: codeId,
      deviceId: `Simulated Barcode Reader (${codeId})`,
    });
    alert(`Simulated physical barcode scan of ${codeId} sent to Desk ${deskNum}! Check Desk ${deskNum} dashboard.`);
  };

  const printSheet = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => (onSelectView ? onSelectView(defaultDesk === 2 ? 'desk2' : 'desk1') : window.history.back())}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Back to Registration Desk {defaultDesk || 1}</span>
        </button>

        <span className="text-xs text-slate-400 font-semibold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
          Desk {defaultDesk || 1} Station
        </span>
      </div>

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel print:border-none print:shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BarcodeIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white font-['Outfit'] tracking-tight print:text-black">
              100 Barcode Wristband Pool
            </h2>
            <p className="text-xs text-slate-400 print:text-slate-700">Pre-printed physical 1D Code-128 wristbands</p>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={printSheet}
            className="btn-secondary text-xs !py-2 !px-3.5 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            Print Barcode Wristband Sheet
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 print:hidden">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Pre-Printed</span>
          <div className="text-2xl font-black text-white font-['Outfit'] mt-1">{summary.total}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30">
          <span className="text-[10px] uppercase font-bold text-emerald-400">Allocated to Teams</span>
          <div className="text-2xl font-black text-emerald-400 font-['Outfit'] mt-1">
            {summary.allocated}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30">
          <span className="text-[10px] uppercase font-bold text-cyan-400">Unused / Remaining</span>
          <div className="text-2xl font-black text-cyan-400 font-['Outfit'] mt-1">
            {summary.unused}
          </div>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between print:hidden">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Barcode (e.g. BC-00042) or Team..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold w-full sm:w-auto">
          {(['ALL', 'UNUSED', 'ALLOCATED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === tab
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'ALL' ? 'All (100)' : tab === 'UNUSED' ? `Unused (${summary.unused})` : `Allocated (${summary.allocated})`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of 100 Barcode Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 print:grid-cols-3 print:gap-2">
        {loading ? (
          <div className="col-span-full text-center py-12 text-xs text-slate-400">Loading pool...</div>
        ) : barcodes.length === 0 ? (
          <div className="col-span-full text-center py-12 text-xs text-slate-400">No barcodes found.</div>
        ) : (
          barcodes.map((item) => {
            const isAllocated = item.status === 'ALLOCATED' || item.status === 'ACTIVE';

            return (
              <div
                key={item._id}
                className={`p-3.5 rounded-xl border text-xs transition-all flex flex-col justify-between ${
                  isAllocated
                    ? 'bg-emerald-950/15 border-emerald-500/40 print:bg-white print:border-black'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 print:bg-white print:border-black'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-black text-sm text-white print:text-black">{item.qrId}</span>
                    <span
                      className={`badge text-[9px] ${
                        isAllocated ? 'badge-confirmed' : 'badge-pending'
                      }`}
                    >
                      {isAllocated ? 'ALLOCATED' : 'UNUSED'}
                    </span>
                  </div>

                  {/* Render 1D Barcode Graphic */}
                  <div className="bg-white p-2 rounded-lg my-2 flex items-center justify-center border border-slate-700 shadow-inner print:border-black">
                    <BarcodeRenderer
                      value={item.qrId}
                      height={32}
                      width={1.4}
                      fontSize={11}
                      lineColor="#0f172a"
                    />
                  </div>
                </div>

                {isAllocated ? (
                  <div className="space-y-1 text-[11px] text-slate-300 print:text-black">
                    <div className="font-bold text-emerald-300 print:text-black truncate">{item.teamName}</div>
                    <div className="text-slate-400 print:text-slate-700 truncate">{item.collegeName}</div>
                    {item.teamLeader && (
                      <div className="text-amber-400 print:text-black text-[10px]">Leader: {item.teamLeader}</div>
                    )}
                    <div className="text-[10px] text-slate-500 print:text-slate-600 pt-1">
                      Desk {item.deskNumber} &bull;{' '}
                      {item.allocatedAt ? new Date(item.allocatedAt).toLocaleTimeString() : ''}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 print:hidden">
                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => handleSimulateScan(item.qrId, 1)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-600/30 text-[10px] font-semibold text-slate-300 hover:text-emerald-300 transition-colors flex-1"
                        title="Simulate scan on Desk 1"
                      >
                        Scan Desk 1
                      </button>
                      <button
                        onClick={() => handleSimulateScan(item.qrId, 2)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-600/30 text-[10px] font-semibold text-slate-300 hover:text-cyan-300 transition-colors flex-1"
                        title="Simulate scan on Desk 2"
                      >
                        Scan Desk 2
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
