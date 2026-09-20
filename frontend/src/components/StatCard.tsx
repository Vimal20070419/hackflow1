import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  subtext?: string;
  colorTheme?: 'emerald' | 'cyan' | 'amber' | 'indigo' | 'rose';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  subtext,
  colorTheme = 'emerald',
}) => {
  const themeStyles = {
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      textAccent: 'text-emerald-400',
      glow: 'group-hover:shadow-emerald-500/10',
    },
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400',
      textAccent: 'text-cyan-400',
      glow: 'group-hover:shadow-cyan-500/10',
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400',
      textAccent: 'text-amber-400',
      glow: 'group-hover:shadow-amber-500/10',
    },
    indigo: {
      border: 'border-indigo-500/20 hover:border-indigo-500/40',
      iconBg: 'bg-indigo-500/10 text-indigo-400',
      textAccent: 'text-indigo-400',
      glow: 'group-hover:shadow-indigo-500/10',
    },
    rose: {
      border: 'border-rose-500/20 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 text-rose-400',
      textAccent: 'text-rose-400',
      glow: 'group-hover:shadow-rose-500/10',
    },
  }[colorTheme];

  return (
    <div
      className={`group relative p-4 rounded-xl bg-slate-900/70 border ${themeStyles.border} backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${themeStyles.glow}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-2xl font-black font-['Outfit'] tracking-tight text-white mt-1">
            {value}
          </p>
          {subtext && <p className="text-[11px] text-slate-400 mt-0.5">{subtext}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${themeStyles.iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
