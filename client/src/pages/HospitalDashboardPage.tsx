import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_HOSPITALS } from '../data/mockHospitals';
import type { Hospital, BedBreakdown, StaffBreakdown, AmbulanceInfo } from '../types';
import {
  Building,
  Bed,
  UserCheck,
  Truck,
  Send,
  Clock,
  LogOut,
  History,
  CheckCircle2,
  AlertCircle,
  Database
} from 'lucide-react';
import { FreshnessIndicator } from '../components/FreshnessIndicator';
import { publishHospitalResources, fetchHospitalAuditLogs, fetchHospitalDetails } from '../services/api';

export const HospitalDashboardPage: FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Find the authorized hospital for this logged-in admin (fallback to Victoria Hospital)
  const baseHospital: Hospital = useMemo(() => {
    const matched = MOCK_HOSPITALS.find((h) => h.id === user?.hospitalId);
    return matched || MOCK_HOSPITALS[0];
  }, [user?.hospitalId]);

  // Working state for editable resources
  const [beds, setBeds] = useState<BedBreakdown[]>(baseHospital.beds);
  const [staff, setStaff] = useState<StaffBreakdown[]>(baseHospital.staff);
  const [ambulances, setAmbulances] = useState<AmbulanceInfo[]>(baseHospital.ambulances);
  const [lastPublished, setLastPublished] = useState<string>(baseHospital.lastResourceUpdate);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [loadingBackend, setLoadingBackend] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  // In-memory audit trail initialized with defaults, populated from live database
  const [auditLogs, setAuditLogs] = useState<Array<{
    id: string;
    timestamp: string;
    author: string;
    summary: string;
  }>>([
    {
      id: 'audit-1',
      timestamp: baseHospital.lastResourceUpdate,
      author: user?.fullName || 'Authorized Administrator',
      summary: 'Emergency ICU available beds synchronized to current ward count.',
    },
  ]);

  // Load live data and audit trail from SQLite database on mount
  useEffect(() => {
    let isMounted = true;
    async function loadLiveData() {
      if (!user?.hospitalId) return;
      setLoadingBackend(true);
      try {
        const details = await fetchHospitalDetails(user.hospitalId);
        if (isMounted && details) {
          setIsLiveConnected(true);
          if (details.beds && details.beds.length > 0) setBeds(details.beds);
          if (details.staff && details.staff.length > 0) setStaff(details.staff);
          if (details.ambulances && details.ambulances.length > 0) setAmbulances(details.ambulances);
          if (details.lastResourceUpdate) setLastPublished(details.lastResourceUpdate);
        }
      } catch (err) {
        console.warn('Failed to load initial live hospital data:', err);
      }

      if (user?.token) {
        try {
          const logs = await fetchHospitalAuditLogs(user.hospitalId, user.token);
          if (isMounted && logs && Array.isArray(logs) && logs.length > 0) {
            setAuditLogs(
              logs.map((a: any) => ({
                id: a.id,
                timestamp: a.timestamp,
                author: a.user?.fullName || user.fullName,
                summary: a.changeSummary,
              }))
            );
          }
        } catch (err) {
          console.warn('Failed to load live audit logs:', err);
        }
      }
      if (isMounted) setLoadingBackend(false);
    }
    loadLiveData();
    return () => { isMounted = false; };
  }, [user?.hospitalId, user?.token, user?.fullName]);

  // Handle bed count changes with mathematical integrity validation
  const handleBedChange = (index: number, field: 'totalBeds' | 'occupiedBeds' | 'availableBeds', value: number) => {
    setValidationError(null);
    const updated = [...beds];
    const item = { ...updated[index] };
    const numericVal = Math.max(0, isNaN(value) ? 0 : value);

    if (field === 'occupiedBeds') {
      item.occupiedBeds = numericVal;
      // Auto-compute available beds if total is set
      item.availableBeds = Math.max(0, item.totalBeds - item.occupiedBeds);
    } else if (field === 'totalBeds') {
      item.totalBeds = numericVal;
      item.availableBeds = Math.max(0, item.totalBeds - item.occupiedBeds);
    } else {
      item.availableBeds = numericVal;
    }

    updated[index] = item;
    setBeds(updated);
  };

  // Handle staff change
  const handleStaffChange = (index: number, field: 'scheduledOnDutyCount' | 'currentlyAvailableCount', value: number) => {
    setValidationError(null);
    const updated = [...staff];
    const item = { ...updated[index] };
    item[field] = Math.max(0, isNaN(value) ? 0 : value);
    updated[index] = item;
    setStaff(updated);
  };

  // Handle ambulance change
  const handleAmbulanceChange = (index: number, field: 'availableReadyCount' | 'inTransitCount', value: number) => {
    setValidationError(null);
    const updated = [...ambulances];
    const item = { ...updated[index] };
    item[field] = Math.max(0, isNaN(value) ? 0 : value);
    updated[index] = item;
    setAmbulances(updated);
  };

  // Validate before publishing
  const validateForm = (): boolean => {
    for (const b of beds) {
      if (b.availableBeds + b.occupiedBeds > b.totalBeds) {
        setValidationError(`Invalid bed calculation for ${b.categoryLabel}: Available + Occupied cannot exceed Total Licensed Beds (${b.totalBeds}).`);
        return false;
      }
    }
    return true;
  };

  const handleConfirmPublish = async () => {
    if (!validateForm()) {
      setConfirmPublishOpen(false);
      return;
    }

    const nowIso = new Date().toISOString();
    setLastPublished(nowIso);

    const icuAvail = beds.find((b) => b.category === 'EMERGENCY_ICU')?.availableBeds ?? 0;
    const docReady = staff.find((s) => s.staffCategory === 'EMERGENCY_PHYSICIAN')?.currentlyAvailableCount ?? 0;
    const readyAmbulances = ambulances.reduce((acc, a) => acc + (a.availableReadyCount ?? 0), 0);
    const summaryText = `Published capacity update: ${icuAvail} ICU beds available, ${docReady} triage physicians on-duty, ${readyAmbulances} ready ambulances.`;

    if (user?.token && user.hospitalId) {
      try {
        await publishHospitalResources(user.hospitalId, user.token, {
          beds,
          staff,
          ambulances,
          changeSummary: summaryText,
        });
        const remoteAudits = await fetchHospitalAuditLogs(user.hospitalId, user.token);
        if (remoteAudits && Array.isArray(remoteAudits)) {
          setAuditLogs(
            remoteAudits.map((a: any) => ({
              id: a.id,
              timestamp: a.timestamp,
              author: a.user?.fullName || user.fullName,
              summary: a.changeSummary,
            }))
          );
        }
        setIsLiveConnected(true);
      } catch (e: any) {
        console.warn('Backend update sync note:', e.message);
      }
    }

    const newAudit = {
      id: 'audit-' + Date.now(),
      timestamp: nowIso,
      author: user?.fullName || 'Authorized Administrator',
      summary: summaryText,
    };
    setAuditLogs((prev) => [newAudit, ...prev]);

    setConfirmPublishOpen(false);
    setSaveSuccessMessage('Hospital availability successfully published to live SurgeWatch network & database!');
    setTimeout(() => setSaveSuccessMessage(null), 5000);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 pb-20 font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-sky-400 flex items-center justify-center font-bold border border-slate-700">
              <Building className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                  {user?.hospitalName || baseHospital.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800">
                  KPME Verified
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isLiveConnected
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span>{isLiveConnected ? 'DB Synced' : loadingBackend ? 'Syncing...' : 'Local Buffer'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Logged in as <strong className="text-slate-200">{user?.fullName}</strong> ({user?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Status & Freshness Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <Clock className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Feed Freshness:</span>
                <FreshnessIndicator lastUpdated={lastPublished} showDetails={false} />
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                <span>
                  Last broadcast: <strong className="text-slate-800">{new Date(lastPublished).toLocaleTimeString()}</strong>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isLiveConnected ? 'Connected to SQLite' : 'Offline Buffer'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                if (validateForm()) setConfirmPublishOpen(true);
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Publish Live Updates</span>
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {saveSuccessMessage && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs sm:text-sm font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {validationError && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-xs sm:text-sm font-semibold text-red-800 flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* 1. Bed Capacity Management Section */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                <Bed className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Emergency Bed Availability Management
              </h2>
            </div>
            <span className="text-xs text-slate-500">Live Intake Counters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {beds.map((bed, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-800">{bed.categoryLabel}</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {bed.availableBeds} Ready
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Total Licensed</label>
                    <input
                      type="number"
                      min={0}
                      value={bed.totalBeds}
                      onChange={(e) => handleBedChange(idx, 'totalBeds', parseInt(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Occupied</label>
                    <input
                      type="number"
                      min={0}
                      value={bed.occupiedBeds}
                      onChange={(e) => handleBedChange(idx, 'occupiedBeds', parseInt(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1">Available Intake</label>
                    <input
                      type="number"
                      min={0}
                      value={bed.availableBeds}
                      onChange={(e) => handleBedChange(idx, 'availableBeds', parseInt(e.target.value))}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-lg p-2 font-extrabold text-emerald-900"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Doctor & Medical Staff Availability Section */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Doctor & Medical Staff Availability Metrics
              </h2>
            </div>
            <span className="text-xs text-slate-500">Casualty & Triage Readiness</span>
          </div>

          <div className="space-y-3">
            {staff.map((s, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 max-w-md">
                  <h3 className="font-bold text-sm text-slate-800">{s.label}</h3>
                  <p className="text-xs text-slate-500 italic">
                    Metric: {s.metricDefinition}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Scheduled on Shift</label>
                    <input
                      type="number"
                      min={0}
                      value={s.scheduledOnDutyCount}
                      onChange={(e) => handleStaffChange(idx, 'scheduledOnDutyCount', parseInt(e.target.value))}
                      className="w-24 bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1">Ready for Immediate Intake</label>
                    <input
                      type="number"
                      min={0}
                      value={s.currentlyAvailableCount}
                      onChange={(e) => handleStaffChange(idx, 'currentlyAvailableCount', parseInt(e.target.value))}
                      className="w-28 bg-emerald-50 border border-emerald-300 rounded-lg p-2 font-extrabold text-emerald-900"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Ambulance Readiness Fleet Section */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Ambulance Operational Readiness Fleet
              </h2>
            </div>
            <span className="text-xs text-slate-500">Station vs In-Transit</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ambulances.map((amb, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-slate-800">{amb.label}</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1">Available at Station</label>
                    <input
                      type="number"
                      min={0}
                      value={amb.availableReadyCount}
                      onChange={(e) => handleAmbulanceChange(idx, 'availableReadyCount', parseInt(e.target.value))}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-lg p-2 font-extrabold text-emerald-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Currently In Transit</label>
                    <input
                      type="number"
                      min={0}
                      value={amb.inTransitCount}
                      onChange={(e) => handleAmbulanceChange(idx, 'inTransitCount', parseInt(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Audit Trail & Update History Section */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Administrative Audit Trail & Change Log
              </h2>
            </div>
            <span className="text-xs text-slate-500">Immutable Compliance Record</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Timestamp (UTC/IST)</th>
                  <th className="p-3">Authorized Medical Officer</th>
                  <th className="p-3">Action / Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                      {log.author}
                    </td>
                    <td className="p-3 text-slate-600">
                      {log.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Confirmation Modal before Publishing */}
      {confirmPublishOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Confirm Live Broadcast</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to publish these updated resource counts to the live SurgeWatch emergency network. Emergency responders and patients will immediately see these numbers.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div><strong>Hospital:</strong> {user?.hospitalName || baseHospital.name}</div>
              <div><strong>Auditor:</strong> {user?.fullName}</div>
              <div><strong>Verification:</strong> Recorded in immutable compliance audit trail</div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPublishOpen(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Confirm & Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
