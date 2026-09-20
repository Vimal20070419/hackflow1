import React from 'react';
import { Activity, CheckCircle2, Barcode as BarcodeIcon, AlertCircle, Clock } from 'lucide-react';
import { IScanLog } from '../types/index.js';

interface LiveActivityFeedProps {
  logs: IScanLog[];
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ logs }) => {
  return (
    <div className="glass-panel p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Live Activity Stream
          </h4>
        </div>
        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          REAL-TIME
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
            No registration activities logged yet.
          </div>
        ) : (
          logs.map((log) => {
            const isSuccess = log.status === 'SUCCESS';
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={log._id}
                className={`p-2.5 rounded-lg border text-xs transition-all ${
                  isSuccess
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    {isSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    )}
                    <span className="font-mono font-bold text-[11px] text-slate-200">
                      {log.qrId}
                    </span>
                    {log.deskNumber && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        Desk {log.deskNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{timeStr}</span>
                </div>

                <div className="text-[11px] text-slate-300 font-medium truncate">
                  {log.teamName ? `${log.teamName} — ${log.collegeName}` : log.message}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
