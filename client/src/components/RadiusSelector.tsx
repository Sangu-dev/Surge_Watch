import type { FC } from 'react';
import { Target, Compass } from 'lucide-react';

interface RadiusSelectorProps {
  selectedRadius: number; // 5, 10, 15, 20
  onChangeRadius: (radius: number) => void;
  hospitalCount: number;
}

export const RadiusSelector: FC<RadiusSelectorProps> = ({
  selectedRadius,
  onChangeRadius,
  hospitalCount,
}) => {
  const radii = [5, 10, 15, 20];

  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Target className="w-4 h-4 text-sky-600" />
          <span>Emergency Search Radius</span>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Found <span className="font-extrabold text-slate-900">{hospitalCount}</span> hospitals
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {radii.map((r) => {
          const isActive = selectedRadius === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChangeRadius(r)}
              className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all text-center cursor-pointer flex flex-col items-center justify-center ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm ring-2 ring-sky-500/50'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{r} km</span>
              <span className={`text-[10px] font-normal mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                {r <= 5 ? 'Immediate' : r <= 10 ? 'Urban Zone' : r <= 15 ? 'Extended' : 'Greater BLR'}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
        <Compass className="w-3 h-3 text-slate-400" />
        <span>Radius represents straight-line aerial search perimeter from selected accident location.</span>
      </p>
    </div>
  );
};
