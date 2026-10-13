import React, { useEffect, useState } from 'react';
import { Clock, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { MarketSession } from '../types/trading';

export const SessionBar: React.FC = () => {
  const [utcTime, setUtcTime] = useState<string>('');
  const [currentUtcHour, setCurrentUtcHour] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
      setCurrentUtcHour(now.getUTCHours());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const sessions: MarketSession[] = [
    {
      name: 'ASIAN',
      label: 'Tokyo / Asian',
      city: 'Tokyo',
      utcHours: [0, 9],
      isActive: currentUtcHour >= 0 && currentUtcHour < 9,
      volatilityRating: 'LOW',
      recommendation: 'Range accumulation. Wait for liquidity sweep or avoid trading breakouts.',
    },
    {
      name: 'LONDON',
      label: 'London Core',
      city: 'London',
      utcHours: [7, 16],
      isActive: currentUtcHour >= 7 && currentUtcHour < 16,
      volatilityRating: 'HIGH',
      recommendation: 'Judas swing liquidity purge followed by clean trend expansion.',
    },
    {
      name: 'OVERLAP',
      label: 'London / NY Overlap',
      city: 'London + New York',
      utcHours: [12, 16],
      isActive: currentUtcHour >= 12 && currentUtcHour < 16,
      volatilityRating: 'EXTREME',
      recommendation: 'Maximum institutional gold liquidity & volume. Prime LuxAlgo confluence setups.',
    },
    {
      name: 'NEW_YORK',
      label: 'New York Session',
      city: 'New York',
      utcHours: [12, 21],
      isActive: currentUtcHour >= 12 && currentUtcHour < 21,
      volatilityRating: 'HIGH',
      recommendation: 'High impact US economic data releases (CPI, NFP, Fed). Follow order flow.',
    },
  ];

  const activeSession = sessions.find((s) => s.name === 'OVERLAP' && s.isActive) ||
    sessions.find((s) => s.isActive) || sessions[0];

  return (
    <div className="bg-[#0b0e14] border-b border-[#1b2230] px-4 lg:px-6 py-2 text-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Left: UTC Clock and Sessions strip */}
        <div className="flex items-center gap-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 font-mono text-slate-400 shrink-0 pr-3 border-r border-[#1f2838]">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="tabular-nums font-medium text-slate-200">{utcTime || '00:00:00 UTC'}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {sessions.map((sess) => (
              <div
                key={sess.name}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  sess.isActive
                    ? sess.name === 'OVERLAP'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-[#121722] text-slate-500 border border-[#1d2433]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    sess.isActive
                      ? sess.name === 'OVERLAP'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-emerald-400'
                      : 'bg-slate-600'
                  }`}
                />
                <span className="whitespace-nowrap">{sess.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Tactical Session Intelligence Notice */}
        <div className="flex items-center gap-2 text-slate-300 overflow-hidden text-[11px]">
          <div className="flex items-center gap-1 text-amber-400 font-semibold shrink-0">
            <Zap className="w-3.5 h-3.5" />
            <span>Session Edge:</span>
          </div>
          <span className="text-slate-400 truncate">
            {activeSession.recommendation}
          </span>
          <span className="shrink-0 text-slate-500">·</span>
          <span className="font-mono text-slate-400 shrink-0">
            Gold Volatility: <span className={activeSession.volatilityRating === 'EXTREME' ? 'text-amber-400 font-bold' : activeSession.volatilityRating === 'HIGH' ? 'text-emerald-400' : 'text-slate-400'}>{activeSession.volatilityRating}</span>
          </span>
        </div>

      </div>
    </div>
  );
};
