import type { FC } from 'react';
import { Clock, ShieldCheck, AlertTriangle, HelpCircle } from 'lucide-react';
import { getFreshnessInfo } from '../utils/freshness';

interface FreshnessIndicatorProps {
  lastUpdated: string;
  showDetails?: boolean;
}

export const FreshnessIndicator: FC<FreshnessIndicatorProps> = ({ lastUpdated, showDetails = false }) => {
  const info = getFreshnessInfo(lastUpdated);

  const getIcon = () => {
    switch (info.status) {
      case 'LIVE':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
      case 'RECENT':
        return <Clock className="w-3.5 h-3.5 text-sky-600" />;
      case 'STALE':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${info.badgeColor} shadow-2xs transition-all`}
        title={info.bannerText || `Data updated ${info.badgeLabel}`}
      >
        {info.status === 'LIVE' && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
        )}
        {getIcon()}
        <span>{info.badgeLabel}</span>
      </span>
      {showDetails && info.bannerText && (
        <p className="text-xs text-amber-700 bg-amber-50/80 border border-amber-200/80 rounded px-2 py-1 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
          <span>{info.bannerText}</span>
        </p>
      )}
    </div>
  );
};
