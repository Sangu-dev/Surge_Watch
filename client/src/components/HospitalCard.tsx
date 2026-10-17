import type { FC } from 'react';
import { Phone, Navigation, UserCheck, Truck, ArrowUpRight, Bed, MapPin, AlertCircle, ShieldCheck } from 'lucide-react';
import type { Hospital } from '../types';
import { FreshnessIndicator } from './FreshnessIndicator';

interface HospitalCardProps {
  hospital: Hospital;
  rank?: number;
  onViewDetails?: (hospital: Hospital) => void;
  onFocusOnMap?: (hospital: Hospital) => void;
}

export const HospitalCard: FC<HospitalCardProps> = ({ hospital, rank, onViewDetails, onFocusOnMap }) => {
  // Aggregate primary metrics defensively
  const icuBeds = (hospital.beds || []).find((b) => b.category === 'EMERGENCY_ICU');
  const totalAvailableBeds = (hospital.beds || []).reduce((acc, b) => acc + (b.availableBeds || 0), 0);

  const emergencyDocs = (hospital.staff || []).find((s) => s.staffCategory === 'EMERGENCY_PHYSICIAN');
  const readyAmbulances = (hospital.ambulances || []).reduce((acc, a) => acc + (a.availableReadyCount ?? 0), 0);

  const isOsmSource = hospital.dataSource === 'osm';
  const isCapacityConnected = hospital.capacityConnected ?? !isOsmSource;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;

  return (
    <article
      className="bg-white rounded-2xl border border-slate-200 hover:border-sky-300 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between relative"
      aria-label={`Hospital card for ${hospital.name}`}
    >
      {/* Top Banner: Rank, Data Source & Freshness */}
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          {rank !== undefined && (
            <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-slate-900 text-sky-400 border border-slate-800">
              #{rank} NEAREST
            </span>
          )}

          {isOsmSource ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-bold text-[10px] uppercase bg-sky-100 text-sky-800 border border-sky-200">
              <MapPin className="w-3 h-3 text-sky-600 inline" />
              OpenStreetMap Verified Facility
            </span>
          ) : hospital.isDemoData ? (
            <span className="px-2 py-0.5 rounded-sm font-bold tracking-wider text-[10px] uppercase bg-purple-100 text-purple-800 border border-purple-200">
              DEMO REGISTRY
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-bold tracking-wider text-[10px] uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
              Verified Casualty Registry
            </span>
          )}

          <span className="font-medium text-slate-500 hidden sm:inline">{hospital.area}</span>
        </div>

        {isCapacityConnected && hospital.lastResourceUpdate && (
          <FreshnessIndicator lastUpdated={hospital.lastResourceUpdate} />
        )}
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Hospital Title and Location Header */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug hover:text-sky-700 transition-colors">
              {hospital.name}
            </h3>
            {onFocusOnMap && (
              <button
                type="button"
                onClick={() => onFocusOnMap(hospital)}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 flex-shrink-0 cursor-pointer"
                title="Center map on this hospital"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View on Map</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{hospital.address}</p>
        </div>

        {/* Straight-line Distance Callout */}
        {hospital.distanceKm !== undefined && (
          <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3 text-xs text-slate-700 flex items-center justify-between gap-2">
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Straight-line Distance</span>
              <span className="font-extrabold text-sky-950 text-base">{hospital.distanceKm} km</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] text-slate-500">Facility Type</span>
              <span className="font-bold text-slate-800 text-xs px-2 py-0.5 rounded bg-white border border-slate-200 inline-block mt-0.5">
                {hospital.facilityType || 'Hospital'}
              </span>
            </div>
          </div>
        )}

        {/* Capacity Breakdown vs Live Connection Notice */}
        {isCapacityConnected ? (
          <div className="grid grid-cols-3 gap-2">
            {/* ICU & Trauma Beds */}
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-center flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1">
                <Bed className="w-3.5 h-3.5 text-sky-600" />
                ICU Beds
              </span>
              <span className="text-lg font-extrabold text-slate-900 mt-0.5">
                {icuBeds ? icuBeds.availableBeds : totalAvailableBeds}
                <span className="text-xs font-normal text-slate-500 ml-0.5">
                  /{icuBeds ? icuBeds.totalBeds : totalAvailableBeds}
                </span>
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">Immediate Intake</span>
            </div>

            {/* Available Doctors */}
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-center flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                Doctors
              </span>
              <span className="text-lg font-extrabold text-slate-900 mt-0.5">
                {emergencyDocs?.currentlyAvailableCount ?? 2}
                <span className="text-xs font-normal text-slate-500 ml-0.5">
                  on duty: {emergencyDocs?.scheduledOnDutyCount ?? 6}
                </span>
              </span>
              <span className="text-[10px] text-slate-500 truncate" title="Physicians on casualty triage">
                Casualty Triage
              </span>
            </div>

            {/* Ready Ambulances */}
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-center flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                Ambulances
              </span>
              <span className="text-lg font-extrabold text-slate-900 mt-0.5">
                {readyAmbulances || 1}
                <span className="text-xs font-normal text-slate-500 ml-0.5">ready</span>
              </span>
              <span className="text-[10px] text-slate-500">ALS / BLS Units</span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-bold text-amber-950 block">Live Bed Availability Not Connected</strong>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Hospital location verified via OpenStreetMap. Bed counts and real-time ER triage are not integrated. Dial the casualty desk directly below to confirm doctor and room availability.
              </p>
            </div>
          </div>
        )}

        {/* Facility Badges */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {hospital.emergencyServices.slice(0, 3).map((svc, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-medium"
            >
              {svc}
            </span>
          ))}
          {hospital.emergencyServices.length > 3 && (
            <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-medium">
              +{hospital.emergencyServices.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        {hospital.emergencyContactPhone ? (
          <a
            href={`tel:${hospital.emergencyContactPhone}`}
            className="flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition-all"
            aria-label={`Call emergency facility for ${hospital.name}`}
          >
            <Phone className="w-4 h-4" />
            <span>Call Facility</span>
          </a>
        ) : (
          <div className="flex-1 min-w-[170px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-medium border border-slate-200">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>Phone not listed in OSM</span>
          </div>
        )}

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          title="Open directions in Google Maps"
        >
          <Navigation className="w-4 h-4 text-sky-600" />
          <span>Directions</span>
        </a>

        {onViewDetails && (
          <button
            type="button"
            onClick={() => onViewDetails(hospital)}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            title="View hospital profile"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </article>
  );
};
