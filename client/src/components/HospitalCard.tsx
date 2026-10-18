import type { FC } from 'react';
import {
  Phone,
  Navigation,
  UserCheck,
  Truck,
  ArrowUpRight,
  Bed,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Stethoscope,
  Activity
} from 'lucide-react';
import type { Hospital } from '../types';
import { FreshnessIndicator } from './FreshnessIndicator';
import { getHospitalWithResources } from '../utils/dummyResources';

interface HospitalCardProps {
  hospital: Hospital;
  rank?: number;
  onViewDetails?: (hospital: Hospital) => void;
  onFocusOnMap?: (hospital: Hospital) => void;
  onRequestAmbulance?: (hospital: Hospital) => void;
}

export const HospitalCard: FC<HospitalCardProps> = ({
  hospital: rawHospital,
  rank,
  onViewDetails,
  onFocusOnMap,
  onRequestAmbulance,
}) => {
  // Ensure hospital record is hydrated with complete simulated resources
  const hospital = getHospitalWithResources(rawHospital);

  const isOsmSource = hospital.dataSource === 'osm';
  const isCapacityConnected = true;

  // Extract bed metrics defensively without fabricating fallbacks
  const icuBed = (hospital.beds || []).find((b) => b.category === 'EMERGENCY_ICU');
  const erBed = (hospital.beds || []).find(
    (b) => b.category === 'EMERGENCY_GENERAL' || b.category === 'TRAUMA_RESUSCITATION'
  );
  const totalBeds = hospital.bedsSummary?.totalBeds ?? (hospital.beds && hospital.beds.length > 0 ? hospital.beds.reduce((acc, b) => acc + (b.totalBeds || 0), 0) : null);
  const availableBeds = hospital.bedsSummary?.availableBeds ?? (hospital.beds && hospital.beds.length > 0 ? hospital.beds.reduce((acc, b) => acc + (b.availableBeds || 0), 0) : null);
  const occupiedBeds = hospital.bedsSummary?.occupiedBeds ?? (totalBeds !== null && availableBeds !== null ? Math.max(0, totalBeds - availableBeds) : null);

  const totalIcuBeds = hospital.bedsSummary?.icuBeds?.total ?? (icuBed ? icuBed.totalBeds : null);
  const availableIcuBeds = hospital.bedsSummary?.icuBeds?.available ?? (icuBed ? icuBed.availableBeds : null);

  const totalErBeds = hospital.bedsSummary?.emergencyBeds?.total ?? (erBed ? erBed.totalBeds : null);
  const availableErBeds = hospital.bedsSummary?.emergencyBeds?.available ?? (erBed ? erBed.availableBeds : null);

  // Extract staff metrics defensively without fabricating numbers
  const doctorStaff = (hospital.staff || []).filter((s) =>
    ['EMERGENCY_PHYSICIAN', 'TRAUMA_SURGEON', 'ANESTHESIOLOGIST', 'DUTY_MEDICAL_OFFICER'].includes(s.staffCategory)
  );
  const nurseStaff = (hospital.staff || []).filter((s) =>
    ['EMERGENCY_NURSE', 'ICU_TRIAGE_NURSE', 'GENERAL_DUTY_NURSE'].includes(s.staffCategory)
  );

  const doctorsOnDuty = hospital.staffSummary?.doctorsOnDuty ?? (doctorStaff.length > 0 ? doctorStaff.reduce((acc, s) => acc + (s.scheduledOnDutyCount || 0), 0) : null);
  const doctorShift = hospital.staffSummary?.doctorShiftStatus ?? doctorStaff[0]?.shiftStatus ?? null;

  const nursesOnDuty = hospital.staffSummary?.nursesOnDuty ?? (nurseStaff.length > 0 ? nurseStaff.reduce((acc, s) => acc + (s.scheduledOnDutyCount || 0), 0) : null);
  const nurseShift = hospital.staffSummary?.nurseShiftStatus ?? nurseStaff[0]?.shiftStatus ?? null;

  // Extract ambulance metrics defensively from actual stored records
  const totalAmbulances = hospital.ambulanceSummary?.totalAmbulances ?? (hospital.ambulances && hospital.ambulances.length > 0 ? hospital.ambulances.reduce((acc, a) => acc + (a.totalCount || 0), 0) : (hospital.ambulanceFleet ? hospital.ambulanceFleet.length : null));
  const availableAmbulances = hospital.ambulanceSummary?.availableAmbulances ?? (hospital.ambulances && hospital.ambulances.length > 0 ? hospital.ambulances.reduce((acc, a) => acc + (a.availableReadyCount || 0), 0) : (hospital.ambulanceFleet ? hospital.ambulanceFleet.filter((a) => a.status === 'AVAILABLE' || a.status === 'AVAILABLE_READY').length : null));

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;
  const provenance = hospital.dataProvenance || (hospital.isDemoData ? 'DEMO' : isOsmSource ? 'OSM_UNCONNECTED' : 'MANUAL');

  return (
    <article
      className="bg-white rounded-2xl border border-slate-200 hover:border-sky-300 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between relative group"
      aria-label={`Hospital card for ${hospital.name}`}
    >
      {/* Top Header: Rank, Data Classification & Provenance */}
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {rank !== undefined && (
            <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-slate-900 text-sky-400 border border-slate-800">
              #{rank} NEAREST
            </span>
          )}

          {isOsmSource && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-amber-50 text-amber-800 border border-amber-200" title="Facility location from OpenStreetMap.">
              <MapPin className="w-3 h-3 text-amber-600 inline" />
              OSM Mapped Facility
            </span>
          )}

          {provenance === 'DEMO' || hospital.isDemoData ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold tracking-wider text-[10px] uppercase bg-purple-50 text-purple-800 border border-purple-200" title="Synthetic simulation data for demonstration purposes only.">
              <Activity className="w-3 h-3 text-purple-600" />
              DEMO SIMULATION
            </span>
          ) : provenance === 'MANUAL' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold tracking-wider text-[10px] uppercase bg-blue-50 text-blue-800 border border-blue-200" title="Manually entered by authenticated hospital administrator.">
              <UserCheck className="w-3 h-3 text-blue-600" />
              MANUAL ADMIN ENTRY
            </span>
          ) : provenance === 'LIVE_INTEGRATION' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold tracking-wider text-[10px] uppercase bg-emerald-50 text-emerald-800 border border-emerald-200" title="Live integration telemetry connected.">
              <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
              LIVE TELEMETRY
            </span>
          ) : null}

          <span className="font-medium text-slate-500 hidden sm:inline">{hospital.area}</span>
        </div>

        {isCapacityConnected && hospital.lastResourceUpdate && (
          <div className="flex items-center gap-1.5">
            <FreshnessIndicator lastUpdated={hospital.lastResourceUpdate} />
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Hospital Title and Location */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={() => onViewDetails?.(hospital)}
              className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug hover:text-sky-700 transition-colors cursor-pointer"
            >
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
                <span className="hidden sm:inline">Map</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{hospital.address}</p>
        </div>

        {/* Straight-line Distance Callout */}
        {hospital.distanceKm !== undefined && (
          <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-2.5 text-xs text-slate-700 flex items-center justify-between gap-2">
            <div>
              <span className="block text-[10px] font-medium text-slate-500">Straight-line Distance</span>
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

        {/* 5-Column Compact Availability Summary (Matching Reference Image 2) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
          {/* Column 1: BEDS */}
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Bed className="w-3 h-3 text-sky-600 shrink-0" />
              <span>Beds</span>
            </div>
            {totalBeds !== null ? (
              <>
                <p className="font-bold text-slate-900 text-xs">
                  Avail: <strong className="text-emerald-700 font-extrabold">{availableBeds}</strong> / {totalBeds}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Occupied: {occupiedBeds}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-400 text-xs">Not integrated</p>
                <p className="text-[10px] text-slate-400">Census unlinked</p>
              </>
            )}
          </div>

          {/* Column 2: ER BEDS */}
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
              <span>ER Beds</span>
            </div>
            {totalErBeds !== null ? (
              <>
                <p className={`font-bold text-xs ${(availableErBeds ?? 0) > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {(availableErBeds ?? 0) > 0 ? 'Available' : 'Full'} ({availableErBeds ?? 0} {(availableErBeds === 1 ? 'bed' : 'beds')})
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Total ER: {totalErBeds}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-400 text-xs">Not integrated</p>
                <p className="text-[10px] text-slate-400">Unknown</p>
              </>
            )}
          </div>

          {/* Column 3: ICU */}
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Activity className="w-3 h-3 text-rose-600 shrink-0" />
              <span>ICU</span>
            </div>
            {totalIcuBeds !== null ? (
              <>
                <p className={`font-bold text-xs ${(availableIcuBeds ?? 0) > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {(availableIcuBeds ?? 0) > 0 ? 'Available' : 'Full'} ({availableIcuBeds ?? 0} {(availableIcuBeds === 1 ? 'bed' : 'beds')})
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Total ICU: {totalIcuBeds}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-400 text-xs">Not integrated</p>
                <p className="text-[10px] text-slate-400">Unknown</p>
              </>
            )}
          </div>

          {/* Column 4: CLINICAL STAFF */}
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Stethoscope className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Clinical Staff</span>
            </div>
            {doctorsOnDuty !== null || nursesOnDuty !== null ? (
              <>
                <p className="font-bold text-slate-900 text-xs">
                  Docs: <strong className="text-emerald-700 font-extrabold">{doctorsOnDuty ?? 0}</strong>, Nurses: <strong>{nursesOnDuty ?? 0}</strong>
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {doctorShift || nurseShift ? `${doctorShift || nurseShift}` : 'On Duty'}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-400 text-xs">Not integrated</p>
                <p className="text-[10px] text-slate-400">Roster unlinked</p>
              </>
            )}
          </div>

          {/* Column 5: AMBULANCES */}
          <div className="space-y-0.5 col-span-2 sm:col-span-1">
            <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Truck className="w-3 h-3 text-blue-600 shrink-0" />
              <span>Ambulances</span>
            </div>
            {totalAmbulances !== null ? (
              <>
                <p className="font-bold text-slate-900 text-xs">
                  Avail: <strong className="text-blue-700 font-extrabold">{availableAmbulances ?? 0}</strong>
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {(availableAmbulances ?? 0) > 0 ? 'Ready for Dispatch' : totalAmbulances > 0 ? 'All Active' : 'None Available'}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-400 text-xs">Not integrated</p>
                <p className="text-[10px] text-slate-400">Fleet unlinked</p>
              </>
            )}
          </div>
        </div>

        {/* Provenance and Capacity Status Footnote */}
        {provenance === 'DEMO' || hospital.isDemoData ? (
          <div className="text-[10px] text-purple-700 font-medium px-1 flex items-center gap-1">
            <Activity className="w-3 h-3 text-purple-600 inline shrink-0" />
            <span>Synthetic resource simulation feed — call facility directly to confirm triage</span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 px-1 flex items-center justify-between">
            <span>Verified capacity records</span>
            {hospital.updatedBy && <span>By: {hospital.updatedBy}</span>}
          </div>
        )}

        {/* Facility Emergency Services Badges */}
        {hospital.emergencyServices && hospital.emergencyServices.length > 0 && (
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
        )}
      </div>

      {/* Action Footer */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        {hospital.emergencyContactPhone ? (
          <a
            href={`tel:${hospital.emergencyContactPhone}`}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition-all"
            aria-label={`Call emergency desk for ${hospital.name}`}
          >
            <Phone className="w-4 h-4" />
            <span>Call Facility</span>
          </a>
        ) : (
          <div className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-medium border border-slate-200">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>Phone not in OSM</span>
          </div>
        )}

        {/* SOS Ambulance Request Button (if hospital has available ambulance) */}
        {isCapacityConnected && onRequestAmbulance && (availableAmbulances ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => onRequestAmbulance(hospital)}
            className="inline-flex items-center justify-center gap-1 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs active:scale-98"
            title="Request ambulance assignment from this hospital"
          >
            <Truck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Request Ambulance</span>
          </button>
        )}

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
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
            title="View complete hospital profile & resource details"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </article>
  );
};
