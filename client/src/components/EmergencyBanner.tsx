import type { FC } from 'react';
import { AlertCircle, PhoneCall } from 'lucide-react';

export const EmergencyBanner: FC = () => {
  return (
    <aside aria-label="Emergency Notice" className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white text-xs sm:text-sm font-medium py-2.5 px-4 shadow-sm border-b border-red-800/20">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <span className="p-1 bg-white/20 rounded-full flex-shrink-0 animate-pulse">
            <AlertCircle className="w-4 h-4 text-white" />
          </span>
          <p>
            <strong className="font-bold tracking-wide uppercase mr-1">Medical Emergency?</strong>
            SurgeWatch provides discovery only. For critical life-saving emergencies, dial government hotlines immediately:
          </p>
        </div>
        <div className="flex items-center gap-3 font-semibold text-xs flex-wrap justify-center">
          <a
            href="tel:112"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-red-700 rounded-full hover:bg-red-50 transition-colors shadow-xs active:scale-95"
            aria-label="Call 112 National Emergency"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call 112 (National)</span>
          </a>
          <a
            href="tel:108"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-900/40 text-white border border-white/30 rounded-full hover:bg-red-900/60 transition-colors active:scale-95"
            aria-label="Call 108 Ambulance Dispatch"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call 108 (Ambulance)</span>
          </a>
        </div>
      </div>
    </aside>
  );
};
