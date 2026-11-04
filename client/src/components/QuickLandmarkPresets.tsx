import React, { useState, useMemo } from 'react';
import { Building2, Compass, ChevronDown, ChevronUp, Search, Sparkles } from 'lucide-react';
import type { Hospital, LandmarkPreset } from '../types';

interface QuickLandmarkPresetsProps {
  currentLocationLabel: string;
  approvedHospitals: Hospital[];
  landmarks: LandmarkPreset[];
  onSelectHospital: (hospital: Hospital) => void;
  onSelectLandmark: (landmark: LandmarkPreset) => void;
  compact?: boolean;
}

interface ZoneFilter {
  id: string;
  label: string;
  landmarkIds: string[];
  hospitalKeywords: string[];
}

const ZONES: ZoneFilter[] = [
  {
    id: 'all',
    label: '⭐ All Key Hubs',
    landmarkIds: [
      'chandapura',
      'bommasandra',
      'electronic_city',
      'koramangala',
      'indiranagar',
      'majestic',
      'whitefield',
      'hebbal',
      'jayanagar',
    ],
    hospitalKeywords: ['victoria', 'narayana', 'sparsh-hospital-bommasandra', 'athreya'],
  },
  {
    id: 'south',
    label: 'Chandapura & South Corridor',
    landmarkIds: ['chandapura', 'bommasandra', 'electronic_city', 'anekal'],
    hospitalKeywords: [
      'athreya',
      'sparsh-hospital-bommasandra',
      'narayana-health-city',
      'kaveri-hospital-chandapura',
      'best-hospital-chandapura',
      'vimalalaya',
      'kauvery-hospital-electronic-city',
      'swastik',
    ],
  },
  {
    id: 'central',
    label: 'Central Bengaluru',
    landmarkIds: ['majestic', 'jayanagar', 'koramangala'],
    hospitalKeywords: [
      'victoria',
      'bowring',
      'st-marthas',
      'nimhans',
      'jayadeva',
      'apollo-bannerghatta',
    ],
  },
  {
    id: 'north',
    label: 'North (Hebbal / Yelahanka)',
    landmarkIds: ['hebbal', 'yelahanka'],
    hospitalKeywords: [
      'aster-cmi',
      'baptist',
      'manipal-hospital-yeshwanthpur',
      'kc-general',
      'ramaiah',
    ],
  },
  {
    id: 'east',
    label: 'East (Whitefield / Indiranagar)',
    landmarkIds: ['indiranagar', 'whitefield'],
    hospitalKeywords: [
      'manipal-hospital-old-airport',
      'manipal-hospital-whitefield',
      'vydehi',
      'sakra-world',
      'chinmaya',
      'manipal-hospital-sarjapur',
    ],
  },
  {
    id: 'west',
    label: 'West (Kengeri / Mysore Rd)',
    landmarkIds: ['kengeri'],
    hospitalKeywords: ['bgs-gleneagles', 'rajarajeshwari'],
  },
];

export const QuickLandmarkPresets: React.FC<QuickLandmarkPresetsProps> = ({
  currentLocationLabel,
  approvedHospitals,
  landmarks,
  onSelectHospital,
  onSelectLandmark,
  compact = false,
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [isAllHospitalsExpanded, setIsAllHospitalsExpanded] = useState<boolean>(false);
  const [filterQuery, setFilterQuery] = useState<string>('');

  // Active zone definition
  const currentZone = useMemo(() => {
    return ZONES.find((z) => z.id === selectedZone) || ZONES[0];
  }, [selectedZone]);

  // Filtered landmarks for active zone
  const visibleLandmarks = useMemo(() => {
    return landmarks.filter((lm) => currentZone.landmarkIds.includes(lm.id));
  }, [landmarks, currentZone]);

  // Featured hospitals for active zone (curated 4 to 8 per zone instead of 213)
  const visibleHospitals = useMemo(() => {
    return approvedHospitals.filter((hosp) => {
      const slug = (hosp.slug || '').toLowerCase();
      const name = (hosp.name || '').toLowerCase();
      const area = (hosp.area || '').toLowerCase();

      return currentZone.hospitalKeywords.some((kw) => {
        const k = kw.toLowerCase();
        return slug.includes(k) || name.includes(k) || area.includes(k);
      });
    }).slice(0, 8);
  }, [approvedHospitals, currentZone]);

  // For the expandable full list: filtered all approved hospitals
  const searchFilteredAllHospitals = useMemo(() => {
    if (!filterQuery.trim()) return approvedHospitals;
    const q = filterQuery.toLowerCase().trim();
    return approvedHospitals.filter(
      (h) => (h.name || '').toLowerCase().includes(q) || (h.area && h.area.toLowerCase().includes(q))
    );
  }, [approvedHospitals, filterQuery]);

  const cleanHospitalLabel = (name: string) => {
    return (name || '').split('(')[0].replace('Hospital', 'Hosp.').trim();
  };

  const cleanLandmarkLabel = (name: string) => {
    return (name || '').split('(')[0].split('/')[0].trim();
  };

  return (
    <div className={`border-t border-slate-200/80 ${compact ? 'pt-1.5 space-y-1.5' : 'pt-2 space-y-2'}`}>
      {/* Header with Zone Chips and Expand Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Quick Emergency Landmarks & Corridors:</span>
        </div>

        {/* Toggle to browse all hospitals without screen overflow */}
        <button
          type="button"
          onClick={() => setIsAllHospitalsExpanded(!isAllHospitalsExpanded)}
          className="text-xs font-semibold text-sky-700 hover:text-sky-800 hover:bg-sky-50 px-2 py-0.5 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 self-start sm:self-auto"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>
            {isAllHospitalsExpanded
              ? 'Hide Full Hospital Directory'
              : `Browse All Approved Hospitals (${approvedHospitals.length})`}
          </span>
          {isAllHospitalsExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Corridor / Zone Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {ZONES.map((zone) => {
          const isActive = selectedZone === zone.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => setSelectedZone(zone.id)}
              className={`text-[11px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {zone.label}
            </button>
          );
        })}
      </div>

      {/* Curated Quick Shortcut Pills (Clean, compact 1-2 rows) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Landmarks */}
        {visibleLandmarks.map((preset) => {
          const isSelected = (currentLocationLabel || '').toLowerCase().includes((preset.name || '').toLowerCase());
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectLandmark(preset)}
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-slate-900 text-white ring-2 ring-sky-500 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
              }`}
              title={`${preset.name} (${preset.area})`}
            >
              <Compass className={`w-3 h-3 ${isSelected ? 'text-sky-300' : 'text-slate-500'}`} />
              <span>{cleanLandmarkLabel(preset.name)}</span>
            </button>
          );
        })}

        {/* Curated Major Hospitals in Zone */}
        {visibleHospitals.map((hosp) => {
          const isSelected = (currentLocationLabel || '').toLowerCase().includes((hosp.name || '').toLowerCase());
          return (
            <button
              key={hosp.id}
              type="button"
              onClick={() => onSelectHospital(hosp)}
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-sky-700 text-white ring-2 ring-sky-400 shadow-2xs'
                  : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200'
              }`}
              title={`${hosp.name} (${hosp.area})`}
            >
              <Building2 className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-sky-600'}`} />
              <span>{cleanHospitalLabel(hosp.name)}</span>
            </button>
          );
        })}
      </div>

      {/* Expandable Constrained Directory (Never blows up page height) */}
      {isAllHospitalsExpanded && (
        <div className="mt-2 bg-slate-50/90 rounded-xl p-3 border border-slate-200 shadow-inner space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              <span>Approved Hospital Directory ({approvedHospitals.length} Total)</span>
            </span>

            {/* Quick search inside directory */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter hospital by name or area..."
                className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          {/* Scrollable Container with max height (Strictly prevents large scrolling) */}
          <div className="max-h-48 overflow-y-auto pr-1 flex flex-wrap gap-1.5 scrollbar-thin scrollbar-thumb-slate-300">
            {searchFilteredAllHospitals.length === 0 ? (
              <span className="text-xs text-slate-500 py-2 italic">
                No hospitals matching &ldquo;{filterQuery}&rdquo;
              </span>
            ) : (
              searchFilteredAllHospitals.map((hosp) => {
                const isSelected = (currentLocationLabel || '').toLowerCase().includes((hosp.name || '').toLowerCase());
                return (
                  <button
                    key={hosp.id}
                    type="button"
                    onClick={() => {
                      onSelectHospital(hosp);
                      setIsAllHospitalsExpanded(false);
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer inline-flex items-center gap-1 ${
                      isSelected
                        ? 'bg-sky-700 text-white font-bold'
                        : 'bg-white hover:bg-sky-50 text-slate-700 border border-slate-200 hover:border-sky-300'
                    }`}
                    title={`${hosp.name} (${hosp.area || 'Bengaluru'})`}
                  >
                    <Building2 className="w-2.5 h-2.5 text-slate-400" />
                    <span>{cleanHospitalLabel(hosp.name)}</span>
                    <span className="text-[10px] text-slate-400">({(hosp.area || 'Bengaluru').split('/')[0].trim()})</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
