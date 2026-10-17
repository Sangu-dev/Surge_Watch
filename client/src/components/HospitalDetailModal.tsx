import type { FC } from 'react';
import { X, Phone, Navigation, Bed, UserCheck, Truck, MapPin, AlertCircle } from 'lucide-react';
import type { Hospital } from '../types';
import { FreshnessIndicator } from './FreshnessIndicator';

interface HospitalDetailModalProps {
  hospital: Hospital | null;
  onClose: () => void;
}

export const HospitalDetailModal: FC<HospitalDetailModalProps> = ({ hospital, onClose }) => {
  if (!hospital) return null;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {hospital.isDemoData && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-900/80 text-purple-200 border border-purple-400/40">
                  DEMO DATA - Bengaluru
                </span>
              )}
              <span className="text-xs text-sky-400 font-semibold">{hospital.area}, Bengaluru</span>
            </div>
            <h2 id="modal-headline" className="text-xl sm:text-2xl font-bold tracking-tight">
              {hospital.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
              <span>{hospital.address}, Pincode: {hospital.pincode}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition-colors"
            aria-label="Close details modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Freshness & Audit Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Report Status:</span>
              <FreshnessIndicator lastUpdated={hospital.lastResourceUpdate} showDetails={true} />
            </div>
            <div className="text-slate-500 text-[11px]">
              Last updated by: <strong className="text-slate-800">{hospital.updatedBy}</strong>
            </div>
          </div>

          {/* Emergency Bed Capacity Breakdown */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Bed className="w-4 h-4 text-sky-600" />
              <span>Emergency Bed Availability Breakdown</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hospital.beds.map((bed, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>{bed.categoryLabel}</span>
                    <span className="text-emerald-700 font-extrabold text-sm">
                      {bed.availableBeds} Available
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (bed.availableBeds / (bed.totalBeds || 1)) * 100)}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                    <span>Occupied: {bed.occupiedBeds}</span>
                    <span>Total Licensed: {bed.totalBeds}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Doctor & Staff Availability Metrics */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Doctor & Medical Staff Availability</span>
            </h3>
            <div className="space-y-2">
              {hospital.staff.map((s, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                    <span>{s.label}</span>
                    <span className="text-emerald-700 font-bold">
                      {s.currentlyAvailableCount} Available for Intake
                      <span className="text-slate-400 font-normal ml-1">({s.scheduledOnDutyCount} on shift)</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    Metric: {s.metricDefinition}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Ambulance Fleet Readiness */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-600" />
              <span>Ambulance Readiness</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hospital.ambulances.map((amb, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                  <span className="font-semibold text-slate-800 block">{amb.label}</span>
                  <div className="flex justify-between text-slate-600">
                    <span className="text-emerald-700 font-bold">{amb.availableReadyCount} Ready at Station</span>
                    <span>{amb.inTransitCount} In Transit</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Verified Services */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Emergency Services & Facilities
            </h3>
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
          </section>

          {/* Safety Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Important Notice:</strong> Bed availability changes rapidly. Always call the emergency triage number before or during transit to confirm immediate admission capacity.
            </p>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap">
          <a
            href={`tel:${hospital.emergencyContactPhone}`}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
          >
            <Phone className="w-4 h-4" />
            <span>Call 24/7 Desk ({hospital.emergencyContactPhone})</span>
          </a>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all"
          >
            <Navigation className="w-4 h-4 text-sky-400" />
            <span>Open Navigation</span>
          </a>
        </div>
      </div>
    </div>
  );
};
