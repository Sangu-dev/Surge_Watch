import type { FC } from 'react';
import {
  X,
  Phone,
  Navigation,
  Bed,
  Users,
  Truck,
  MapPin,
  AlertCircle,
  AlertTriangle,
  Activity,
  Heart,
  Clock,
  ExternalLink
} from 'lucide-react';
import type { Hospital } from '../types';
import { FreshnessIndicator } from './FreshnessIndicator';
import { getHospitalWithResources } from '../utils/dummyResources';

interface HospitalDetailModalProps {
  hospital: Hospital | null;
  onClose: () => void;
  onRequestAmbulance?: (hospital: Hospital) => void;
}

export const HospitalDetailModal: FC<HospitalDetailModalProps> = ({
  hospital: rawHospital,
  onClose,
  onRequestAmbulance,
}) => {
  if (!rawHospital) return null;

  // Hydrate with deterministic simulation resources if any clinical telemetry is unlinked
  const hospital = getHospitalWithResources(rawHospital);

  const isOsmSource = hospital.dataSource === 'osm';
  const isCapacityConnected = true;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;

  // Bed metrics
  const icuBed = (hospital.beds || []).find((b) => b.category === 'EMERGENCY_ICU');
  const erBed = (hospital.beds || []).find(
    (b) => b.category === 'EMERGENCY_GENERAL' || b.category === 'TRAUMA_RESUSCITATION'
  );

  const totalBeds = hospital.bedsSummary?.totalBeds ?? (hospital.beds && hospital.beds.length > 0 ? hospital.beds.reduce((acc, b) => acc + (b.totalBeds || 0), 0) : null);
  const availableBeds = hospital.bedsSummary?.availableBeds ?? (hospital.beds && hospital.beds.length > 0 ? hospital.beds.reduce((acc, b) => acc + (b.availableBeds || 0), 0) : null);
  const occupiedBeds = hospital.bedsSummary?.occupiedBeds ?? (totalBeds !== null && availableBeds !== null ? Math.max(0, totalBeds - availableBeds) : null);

  const totalIcuBeds = hospital.bedsSummary?.icuBeds?.total ?? (icuBed ? icuBed.totalBeds : null);
  const availableIcuBeds = hospital.bedsSummary?.icuBeds?.available ?? (icuBed ? icuBed.availableBeds : null);
  const occupiedIcuBeds = hospital.bedsSummary?.icuBeds?.occupied ?? (totalIcuBeds !== null && availableIcuBeds !== null ? Math.max(0, totalIcuBeds - availableIcuBeds) : null);

  const totalErBeds = hospital.bedsSummary?.emergencyBeds?.total ?? (erBed ? erBed.totalBeds : null);
  const availableErBeds = hospital.bedsSummary?.emergencyBeds?.available ?? (erBed ? erBed.availableBeds : null);
  const occupiedErBeds = hospital.bedsSummary?.emergencyBeds?.occupied ?? (totalErBeds !== null && availableErBeds !== null ? Math.max(0, totalErBeds - availableErBeds) : null);

  const hasBedData = (hospital.beds && hospital.beds.length > 0) || totalBeds !== null;

  // Staff metrics
  const doctorStaff = (hospital.staff || []).filter((s) =>
    ['EMERGENCY_PHYSICIAN', 'TRAUMA_SURGEON', 'ANESTHESIOLOGIST', 'DUTY_MEDICAL_OFFICER'].includes(s.staffCategory)
  );
  const nurseStaff = (hospital.staff || []).filter((s) =>
    ['EMERGENCY_NURSE', 'ICU_TRIAGE_NURSE', 'GENERAL_DUTY_NURSE'].includes(s.staffCategory)
  );

  const doctorsOnDuty = hospital.staffSummary?.doctorsOnDuty ?? (doctorStaff.length > 0 ? doctorStaff.reduce((acc, s) => acc + (s.scheduledOnDutyCount || 0), 0) : null);
  const doctorsAvailable = hospital.staffSummary?.doctorsAvailable ?? (doctorStaff.length > 0 ? doctorStaff.reduce((acc, s) => acc + (s.currentlyAvailableCount || 0), 0) : null);
  const doctorShift = hospital.staffSummary?.doctorShiftStatus ?? doctorStaff[0]?.shiftStatus ?? null;

  const nursesOnDuty = hospital.staffSummary?.nursesOnDuty ?? (nurseStaff.length > 0 ? nurseStaff.reduce((acc, s) => acc + (s.scheduledOnDutyCount || 0), 0) : null);
  const nursesAvailable = hospital.staffSummary?.nursesAvailable ?? (nurseStaff.length > 0 ? nurseStaff.reduce((acc, s) => acc + (s.currentlyAvailableCount || 0), 0) : null);
  const nurseShift = hospital.staffSummary?.nurseShiftStatus ?? nurseStaff[0]?.shiftStatus ?? null;

  const hasStaffData = (hospital.staff && hospital.staff.length > 0) || doctorsOnDuty !== null || nursesOnDuty !== null;

  // Ambulance metrics & fleet
  const fleet = hospital.ambulanceFleet || [];
  const totalAmbulances = hospital.ambulanceSummary?.totalAmbulances ?? (
    fleet.length > 0
      ? fleet.length
      : hospital.ambulances && hospital.ambulances.length > 0
      ? hospital.ambulances.reduce((acc, a) => acc + (a.totalCount || 0), 0)
      : null
  );

  const availableAmbulances = hospital.ambulanceSummary?.availableAmbulances ?? (
    fleet.length > 0
      ? fleet.filter((a) => a.status === 'AVAILABLE' || a.status === 'AVAILABLE_READY').length
      : hospital.ambulances && hospital.ambulances.length > 0
      ? hospital.ambulances.reduce((acc, a) => acc + (a.availableReadyCount || 0), 0)
      : null
  );

  const activeAmbulances = hospital.ambulanceSummary?.assignedAmbulances ?? (
    fleet.length > 0
      ? fleet.filter((a) => ['ASSIGNED', 'EN_ROUTE', 'AT_SCENE', 'DISPATCHED_IN_TRANSIT'].includes(a.status)).length
      : hospital.ambulances && hospital.ambulances.length > 0
      ? hospital.ambulances.reduce((acc, a) => acc + (a.inTransitCount || 0), 0)
      : null
  );

  const hasAmbulanceData = fleet.length > 0 || (hospital.ambulances && hospital.ambulances.length > 0) || totalAmbulances !== null;

  const provenance = hospital.dataProvenance || (hospital.isDemoData ? 'DEMO' : isOsmSource ? 'OSM_UNCONNECTED' : 'MANUAL');

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header (Matching Reference Image 1) */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-sky-50/30 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Operating status indicator */}
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                  hospital.operatingStatus === 'OPERATIONAL'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hospital.operatingStatus === 'OPERATIONAL'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500'
                  }`}
                />
                {hospital.operatingStatus === 'OPERATIONAL' ? 'Available' : hospital.operatingStatus}
              </span>

              {/* Data provenance & OSM tag */}
              {isOsmSource && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <MapPin size={11} className="text-amber-600" />
                  OpenStreetMap Facility
                </span>
              )}

              {provenance === 'DEMO' || hospital.isDemoData ? (
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Activity size={11} className="text-purple-600" />
                  DEMO SIMULATION
                </span>
              ) : provenance === 'MANUAL' ? (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  MANUAL ADMIN ENTRY
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  VERIFIED CLINICAL TELEMETRY
                </span>
              )}

              {hospital.facilityType && (
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  {hospital.facilityType}
                </span>
              )}

              {hospital.area && (
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  📍 {hospital.area} {hospital.pincode ? `(${hospital.pincode})` : ''}
                </span>
              )}
            </div>

            <h2 id="modal-headline" className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {hospital.name}
            </h2>

            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <MapPin size={13} className="text-sky-600 shrink-0" />
              <span>{hospital.address}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Close details modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Distance & Routing Banner */}
        <div className="px-5 sm:px-6 py-2.5 bg-sky-50/50 border-b border-sky-100/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            {hospital.distanceKm !== undefined && (
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Navigation size={13} className="text-sky-600" />
                <span>Distance: <strong>{hospital.distanceKm} km away</strong></span>
              </span>
            )}
            {hospital.estimatedTravelTimeMins !== undefined && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock size={13} className="text-sky-600" />
                  <span>Estimated ETA: <strong>~{hospital.estimatedTravelTimeMins} min travel</strong></span>
                </span>
              </>
            )}
          </div>

          {hospital.lastResourceUpdate && (
            <div className="flex items-center gap-1.5">
              <FreshnessIndicator lastUpdated={hospital.lastResourceUpdate} showDetails={true} />
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Synthetic Demo or Simulation Transparency Warning */}
          {provenance === 'DEMO' || hospital.isDemoData ? (
            <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3 text-xs text-purple-900 flex items-start gap-2.5">
              <Activity className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="font-bold text-purple-950 block">Demonstration Resource Simulation Feed</strong>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Real-time bed counts, on-shift clinical staff rosters, and ambulance fleet status shown below are generated for prototype evaluation. Call the casualty desk directly to confirm emergency intake.
                </p>
              </div>
            </div>
          ) : null}

          {/* SECTION 1: HOSPITAL BED AVAILABILITY (Matching Reference Image 1) */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/60 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Bed size={15} className="text-sky-600 shrink-0" />
                <span>HOSPITAL BED AVAILABILITY</span>
              </h3>
              {hasBedData && totalBeds !== null ? (
                <span className="text-xs font-bold text-slate-600">
                  Total Capacity: <strong className="text-slate-900">{totalBeds}</strong> beds (
                  <strong className="text-emerald-700">{availableBeds}</strong> available,{' '}
                  <strong className="text-slate-700">{occupiedBeds}</strong> occupied)
                </span>
              ) : null}
            </div>

            {hasBedData ? (
              <div className="space-y-3">
                {/* General Beds Overview Boxes */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Capacity</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{totalBeds}</p>
                    <p className="text-[10px] text-slate-400">licensed beds</p>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <p className="text-[10px] uppercase font-bold text-emerald-700">Available Beds</p>
                    <p className="text-xl font-black text-emerald-700 mt-0.5">{availableBeds}</p>
                    <p className="text-[10px] text-emerald-600 font-medium">ready for admission</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Occupied Beds</p>
                    <p className="text-xl font-black text-slate-700 mt-0.5">{occupiedBeds}</p>
                    <p className="text-[10px] text-slate-400">currently admitted</p>
                  </div>
                </div>

                {/* Specific Critical Care: Emergency Ward & ICU Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Emergency Ward Bed Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                          <AlertTriangle size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Emergency / ER Ward</h4>
                          <span
                            className={`text-[10px] font-black uppercase ${
                              (availableErBeds ?? 0) > 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {(availableErBeds ?? 0) > 0 ? '✓ Available' : '⚠ Full'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900">{availableErBeds ?? 0}</span>
                        <span className="text-xs text-slate-400 font-bold"> / {totalErBeds ?? 0}</span>
                        <p className="text-[10px] text-slate-400">Available Beds</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((availableErBeds ?? 0) / (totalErBeds || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="pt-1.5 border-t border-slate-200/60 flex justify-between text-[11px] text-slate-600">
                      <span>Occupied: <strong>{occupiedErBeds ?? ((totalErBeds ?? 0) - (availableErBeds ?? 0))} beds</strong></span>
                      <span>Total ER: <strong>{totalErBeds ?? 0} beds</strong></span>
                    </div>
                  </div>

                  {/* ICU / Critical Trauma Bed Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                          <Heart size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">ICU / Critical Trauma</h4>
                          <span
                            className={`text-[10px] font-black uppercase ${
                              (availableIcuBeds ?? 0) > 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {(availableIcuBeds ?? 0) > 0 ? '✓ Available' : '⚠ Full'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900">{availableIcuBeds ?? 0}</span>
                        <span className="text-xs text-slate-400 font-bold"> / {totalIcuBeds ?? 0}</span>
                        <p className="text-[10px] text-slate-400">Available Beds</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((availableIcuBeds ?? 0) / (totalIcuBeds || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="pt-1.5 border-t border-slate-200/60 flex justify-between text-[11px] text-slate-600">
                      <span>Occupied: <strong>{occupiedIcuBeds ?? ((totalIcuBeds ?? 0) - (availableIcuBeds ?? 0))} beds</strong></span>
                      <span>Total ICU: <strong>{totalIcuBeds ?? 0} beds</strong></span>
                    </div>
                  </div>
                </div>

                {/* Additional Bed Categories if present */}
                {hospital.beds && hospital.beds.length > 2 && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Department Bed Census Breakdown
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {hospital.beds
                        .filter((b) => b.category !== 'EMERGENCY_ICU' && b.category !== 'EMERGENCY_GENERAL')
                        .map((b, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                            <div className="font-bold text-slate-800">{b.categoryLabel}</div>
                            <div className="flex justify-between items-center text-[11px] text-slate-600 mt-1">
                              <span>Avail: <strong className="text-emerald-700">{b.availableBeds}</strong></span>
                              <span>Total: {b.totalBeds}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-xs text-slate-500 space-y-1">
                <AlertCircle size={20} className="text-slate-400 mx-auto mb-1" />
                <p className="font-bold text-slate-700">Bed census records are currently not integrated for this facility.</p>
                <p className="text-[11px] text-slate-400">Live ward occupancy is not connected to SurgeWatch. Call casualty desk to confirm intake.</p>
              </div>
            )}
          </section>

          {/* SECTION 2: MEDICAL STAFF AVAILABILITY (Matching Reference Image 1) */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/60 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Users size={15} className="text-emerald-600 shrink-0" />
                <span>MEDICAL STAFF AVAILABILITY</span>
              </h3>
              {hasStaffData && (
                <div className="flex items-center gap-2 text-xs text-slate-600 font-bold flex-wrap">
                  {doctorsOnDuty !== null && (
                    <span>Docs on duty: <strong className="text-emerald-700">{doctorsOnDuty}</strong></span>
                  )}
                  {nursesOnDuty !== null && (
                    <span>• Nurses on duty: <strong className="text-sky-700">{nursesOnDuty}</strong></span>
                  )}
                  {(doctorShift || nurseShift) && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {doctorShift || nurseShift}
                    </span>
                  )}
                </div>
              )}
            </div>

            {hasStaffData ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Doctors on Duty Card */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Emergency Doctors</span>
                      <span className="text-lg font-black text-slate-900 mt-0.5 block">
                        {doctorsOnDuty ?? 0} on duty
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {doctorsAvailable !== null
                          ? `${doctorsAvailable} available for immediate triage`
                          : 'Active Casualty Coverage'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {doctorShift || 'ON_DUTY'}
                      </span>
                    </div>
                  </div>

                  {/* Nurses on Duty Card */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Trauma & ICU Nurses</span>
                      <span className="text-lg font-black text-slate-900 mt-0.5 block">
                        {nursesOnDuty ?? 0} on duty
                      </span>
                      <span className="text-[10px] text-sky-700 font-bold">
                        {nursesAvailable !== null
                          ? `${nursesAvailable} available on current shift`
                          : 'Critical Care Shift Coverage'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {nurseShift || 'ON_DUTY'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Staff Roster Details if present */}
                {hospital.staff && hospital.staff.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Duty Roster Breakdown
                    </p>
                    <div className="space-y-1.5">
                      {hospital.staff.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-white rounded-xl border border-slate-200/60 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{s.label}</span>
                              {s.shiftStatus && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {s.shiftStatus}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{s.metricDefinition}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-emerald-700 block">
                              {s.currentlyAvailableCount} Available
                            </span>
                            <span className="text-[10px] text-slate-400">{s.scheduledOnDutyCount} on shift</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-xs text-slate-500 space-y-1">
                <AlertCircle size={20} className="text-slate-400 mx-auto mb-1" />
                <p className="font-bold text-slate-700">Staff duty rosters are not connected to this facility profile.</p>
                <p className="text-[11px] text-slate-400">Clinical shift staffing records are unlinked. Missing data does not indicate zero staff.</p>
              </div>
            )}
          </section>

          {/* SECTION 3: AMBULANCE FLEET STATUS (Matching Reference Image 1) */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/60 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Truck size={15} className="text-amber-600 shrink-0" />
                <span>AMBULANCE FLEET STATUS</span>
              </h3>
              {hasAmbulanceData && totalAmbulances !== null ? (
                <span className="text-xs font-bold text-slate-600">
                  Total Fleet: <strong className="text-slate-900">{totalAmbulances}</strong> (
                  <strong className="text-emerald-700">{availableAmbulances ?? 0}</strong> ready,{' '}
                  <strong className="text-amber-700">{activeAmbulances ?? 0}</strong> active)
                </span>
              ) : null}
            </div>

            {hasAmbulanceData ? (
              <div className="space-y-3">
                {/* Individual Ambulance Records or Fleet Summary */}
                {fleet.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {fleet.map((amb, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {amb.registrationPlate}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                amb.status === 'AVAILABLE' || amb.status === 'AVAILABLE_READY'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {amb.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-600 block mt-1 font-medium">
                            {amb.typeLabel || amb.ambulanceType}
                          </span>
                          {amb.currentLocation && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Location: {amb.currentLocation}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : hospital.ambulances && hospital.ambulances.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {hospital.ambulances.map((amb, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1">
                        <span className="font-bold text-slate-900 block">{amb.label}</span>
                        <div className="flex justify-between text-slate-600">
                          <span className="text-emerald-700 font-bold">{amb.availableReadyCount} Ready at Station</span>
                          <span>{amb.inTransitCount} In Transit</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-xs text-slate-500 space-y-1">
                <AlertCircle size={20} className="text-slate-400 mx-auto mb-1" />
                <p className="font-bold text-slate-700">Ambulance vehicle records are not connected to this facility profile.</p>
                <p className="text-[11px] text-slate-400">Emergency vehicle records are unlinked. No vehicles are fabricated.</p>
              </div>
            )}
          </section>

          {/* SECTION 4: EMERGENCY SERVICES & SPECIALTY DEPARTMENTS */}
          <section className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              EMERGENCY SERVICES & SPECIALTY DEPARTMENTS
            </h3>
            {hospital.emergencyServices && hospital.emergencyServices.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {hospital.emergencyServices.map((svc, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-sky-50 text-sky-900 border border-sky-200 rounded-full text-xs font-semibold"
                  >
                    {svc}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No specific specialty departments listed in facility registry.</p>
            )}
          </section>

          {/* Verified Registry / OpenStreetMap Attribution Banner */}
          <div className="p-2.5 bg-slate-100 rounded-xl text-center text-[11px] text-slate-500 font-medium">
            Facility coordinates, address & contact channels ©{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700"
            >
              OpenStreetMap contributors
            </a>{' '}
            (ODbL).
            {hospital.sourceIdentifier && (
              <span className="ml-1 text-slate-400 font-mono">[{hospital.sourceIdentifier}]</span>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap">
          {hospital.emergencyContactPhone ? (
            <a
              href={`tel:${hospital.emergencyContactPhone}`}
              className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-98"
            >
              <Phone className="w-4 h-4" />
              <span>Call Emergency Desk</span>
            </a>
          ) : (
            <div className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-medium border border-slate-200">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Phone not in OSM</span>
            </div>
          )}

          {isCapacityConnected && onRequestAmbulance && (availableAmbulances ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestAmbulance(hospital);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-98"
            >
              <Truck className="w-4 h-4" />
              <span>Request Ambulance</span>
            </button>
          )}

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <Navigation className="w-4 h-4 text-sky-400" />
            <span>Navigate (Google Maps)</span>
            <ExternalLink size={12} className="opacity-70" />
          </a>
        </div>
      </div>
    </div>
  );
};
