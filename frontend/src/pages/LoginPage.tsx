import React, { useState } from 'react';
import {
  Barcode as BarcodeIcon,
  Users,
  Smartphone,
  CheckCircle,
  Eye,
  EyeOff,
  LogIn,
  Layers,
  Sparkles,
  Shield,
  ArrowRight,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface LoginPageProps {
  onSelectView: (view: string) => void;
  defaultDesk?: number;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSelectView, defaultDesk = 1 }) => {
  const { login, loginDemo } = useAuth();
  const [selectedDesk, setSelectedDesk] = useState<number>(defaultDesk === 2 ? 2 : 1);
  const [email, setEmail] = useState<string>(
    defaultDesk === 2 ? 'desk2@hackathon.org' : 'desk1@hackathon.org'
  );
  const [password, setPassword] = useState<string>(
    defaultDesk === 2 ? 'desk2pass123' : 'desk1pass123'
  );
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDeskSelect = (deskNum: number) => {
    setSelectedDesk(deskNum);
    setErrorMsg(null);
    if (deskNum === 1) {
      setEmail('desk1@hackathon.org');
      setPassword('desk1pass123');
    } else {
      setEmail('desk2@hackathon.org');
      setPassword('desk2pass123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      onSelectView(selectedDesk === 2 ? 'desk2' : 'desk1');
    } else {
      setErrorMsg(res.message || 'Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="w-full border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BarcodeIcon className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white font-['Outfit']">
                HACK<span className="text-emerald-400">FLOW</span>
              </span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                Staff Check-In
              </span>
            </div>
          </div>

          {/* Header Action: Participant Portal Link & System Status */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              id="header-participant-portal-btn"
              onClick={() => onSelectView('portal')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 text-xs font-bold text-slate-200 hover:text-emerald-400 transition-all cursor-pointer shadow-sm"
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Participant Portal</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-70" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-400 font-medium">System Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Info Column */}
          <div className="md:col-span-6 space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-['Outfit']">
                Registration Desk
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Offline digital check-in terminal with instant 1D barcode wristband assignment and mobile camera pairing.
              </p>
            </div>

            {/* Quick Feature Points */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <BarcodeIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Pre-Printed Barcode Wristbands</h4>
                  <p className="text-[11px] text-slate-400">
                    Atomic allocation prevents duplicate wristband assignment across desks.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Wireless Phone Barcode Scanner</h4>
                  <p className="text-[11px] text-slate-400">
                    Pair your phone camera instantly to scan wristbands directly to desk.
                  </p>
                </div>
              </div>
            </div>

            {/* Prominent Participant Portal Card */}
            <div className="p-4.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/40 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Are you a Participant?</h3>
                    <p className="text-[11px] text-slate-300">
                      Access team details and lock your problem statement.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="participant-portal-card-btn"
                onClick={() => onSelectView('portal')}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <UserCheck className="w-4 h-4" />
                <span>Open Participant Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Login Card */}
          <div className="md:col-span-6 p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white font-['Outfit']">Select Desk Station</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose your registration desk to auto-fill credentials
              </p>
            </div>

            {/* Desk Selection Toggle */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDeskSelect(1)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedDesk === 1
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Desk 1</span>
                  {selectedDesk === 1 && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Station Alpha</div>
              </button>

              <button
                type="button"
                onClick={() => handleDeskSelect(2)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedDesk === 2
                    ? 'bg-cyan-500/15 border-cyan-500/60 text-white shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Desk 2</span>
                  {selectedDesk === 2 && <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Station Beta</div>
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Staff Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
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

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                  <div>{errorMsg}</div>
                  <button
                    type="button"
                    onClick={() => {
                      loginDemo(selectedDesk);
                      onSelectView(selectedDesk === 2 ? 'desk2' : 'desk1');
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Continue in Demo / Offline Mode (Desk {selectedDesk})</span>
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : `Launch Desk ${selectedDesk} Dashboard`}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  loginDemo(selectedDesk);
                  onSelectView(selectedDesk === 2 ? 'desk2' : 'desk1');
                }}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Demo Access (Desk {selectedDesk})</span>
              </button>

              {/* Extra Participant Portal text link */}
              <div className="pt-2 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={() => onSelectView('portal')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer py-1"
                >
                  <BarcodeIcon className="w-3.5 h-3.5" />
                  <span>Participant Wristband Portal</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 py-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
        <span>HackFlow &bull; Digital Barcode Registration System</span>
        <button
          type="button"
          onClick={() => onSelectView('portal')}
          className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer font-medium"
        >
          Participant Portal &rarr;
        </button>
      </footer>
    </div>
  );
};
