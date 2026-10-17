import type { FC } from 'react';
import { Target, Compass } from 'lucide-react';

interface RadiusSelectorProps {
  selectedRadius: number; // 5, 10, 15
  onChangeRadius: (radius: number) => void;
  hospitalCount: number;
}

export const RadiusSelector: FC<RadiusSelectorProps> = ({
  selectedRadius,
  onChangeRadius,
  hospitalCount,
}) => {
  const radii = [5, 10, 15];

  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Target className="w-4 h-4 text-sky-600" />
          <span>Geographic Search Radius</span>
        </div>
        <span className="text-xs font-semibold text-slate-600 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
          <strong className="font-extrabold text-sky-950">{hospitalCount}</strong> {hospitalCount === 1 ? 'hospital' : 'hospitals'} found within <strong className="font-bold text-slate-900">{selectedRadius} km</strong>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {radii.map((r) => {
          const isActive = selectedRadius === r;
          return (
            <button
              key={r}
              type="button"
              id={`radius-btn-${r}km`}
              onClick={() => onChangeRadius(r)}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer flex flex-col items-center justify-center border ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md border-slate-900 ring-2 ring-sky-500/60'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span className="text-sm sm:text-base font-extrabold">{r} km</span>
              <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-sky-300' : 'text-slate-500'}`}>
                {r === 5 ? 'Immediate (5 km)' : r === 10 ? 'Urban (10 km)' : 'Extended (15 km)'}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
        <Compass className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span>Straight-line geodesic distance calculated via Haversine formula. Displays all available records without limit.</span>
      </p>
    </div>
  );
};
