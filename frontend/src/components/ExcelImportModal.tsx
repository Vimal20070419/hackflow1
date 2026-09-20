import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api.js';

interface ExcelImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg('Please select an Excel (.xlsx, .xls) or .csv file to import.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setResult(res.data);
        onSuccess();
      } else {
        setErrorMsg(res.data.message || 'Import failed');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error occurred while processing Excel file';
      setErrorMsg(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl backdrop-blur-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">Import Excel Dataset</h3>
          </div>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                <CheckCircle2 className="w-5 h-5" />
                IMPORT COMPLETED
              </div>
              <p className="text-xs text-emerald-300 mb-3">{result.message}</p>
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/70 p-3 rounded-lg">
                <div>
                  <span className="text-slate-400 block">Total Rows:</span>
                  <strong className="text-white text-base">{result.stats?.totalRows}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Distinct Teams:</span>
                  <strong className="text-emerald-400 text-base">{result.stats?.distinctTeams}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">New Teams:</span>
                  <strong className="text-cyan-400">{result.stats?.createdTeams}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Updated Teams:</span>
                  <strong className="text-amber-400">{result.stats?.updatedTeams}</strong>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="btn-primary w-full text-xs">
              Done & Refresh Teams
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-6 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl bg-slate-950/50 text-center cursor-pointer transition-colors relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <UploadCloud className="w-10 h-10 mx-auto text-emerald-400 mb-2 opacity-80" />
              <p className="text-xs font-semibold text-slate-200">
                {file ? file.name : 'Click or drag & drop Excel (.xlsx) file here'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="btn-primary text-xs"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Start Ingestion'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
