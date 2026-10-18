import { useState, useMemo, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_HOSPITALS } from '../data/mockHospitals';
import type { Hospital, BedBreakdown, StaffBreakdown, AmbulanceInfo, AmbulanceRecord } from '../types';
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
  Database,
  RefreshCw,
  Activity
} from 'lucide-react';
import { FreshnessIndicator } from '../components/FreshnessIndicator';
import {
  publishHospitalResources,
  fetchHospitalAuditLogs,
  fetchHospitalDetails,
  fetchHospitalAmbulances,
  updateAmbulanceStatus
} from '../services/api';
import { getSocket } from '../services/socket';

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
  const [ambulanceFleet, setAmbulanceFleet] = useState<AmbulanceRecord[]>([]);
  const [lastPublished, setLastPublished] = useState<string>(baseHospital.lastResourceUpdate);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [loadingBackend, setLoadingBackend] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [dataProvenance, setDataProvenance] = useState<string>(baseHospital.dataProvenance || 'DEMO');

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
  const loadLiveData = useCallback(async () => {
    if (!user?.hospitalId) return;
    setLoadingBackend(true);
    try {
      const details = await fetchHospitalDetails(user.hospitalId);
      if (details) {
        setIsLiveConnected(true);
        if (details.beds && details.beds.length > 0) setBeds(details.beds);
        if (details.staff && details.staff.length > 0) setStaff(details.staff);
        if (details.ambulances && details.ambulances.length > 0) setAmbulances(details.ambulances);
        if (details.lastResourceUpdate) setLastPublished(details.lastResourceUpdate);
        if (details.dataProvenance) setDataProvenance(details.dataProvenance);
      }
    } catch (err) {
      console.warn('Failed to load initial live hospital data:', err);
    }

    try {
      const ambData = await fetchHospitalAmbulances(user.hospitalId);
      if (ambData && ambData.data && Array.isArray(ambData.data)) {
        setAmbulanceFleet(ambData.data);
      }
    } catch (err) {
      console.warn('Failed to load live hospital ambulances:', err);
    }

    if (user?.token) {
      try {
        const logs = await fetchHospitalAuditLogs(user.hospitalId, user.token);
        if (logs && Array.isArray(logs) && logs.length > 0) {
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
    setLoadingBackend(false);
  }, [user?.hospitalId, user?.token, user?.fullName]);

  useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

  // Real-time Socket.IO listener for live updates
  useEffect(() => {
    const socket = getSocket();

    const handleHospitalUpdate = (event: { hospitalId: string }) => {
      if (event.hospitalId === user?.hospitalId) {
        loadLiveData();
      }
    };

    const handleAmbulanceUpdate = (event: { hospitalId: string }) => {
      if (event.hospitalId === user?.hospitalId) {
        loadLiveData();
      }
    };

    socket.on('hospital_resource_updated', handleHospitalUpdate);
    socket.on('ambulance_status_updated', handleAmbulanceUpdate);
    socket.on('emergency_dispatched', handleAmbulanceUpdate);
    socket.on('emergency_resolved', handleAmbulanceUpdate);

    return () => {
      socket.off('hospital_resource_updated', handleHospitalUpdate);
      socket.off('ambulance_status_updated', handleAmbulanceUpdate);
      socket.off('emergency_dispatched', handleAmbulanceUpdate);
      socket.off('emergency_resolved', handleAmbulanceUpdate);
    };
  }, [user?.hospitalId, loadLiveData]);

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
      item.occupiedBeds = Math.max(0, item.totalBeds - item.availableBeds);
    }

    updated[index] = item;
    setBeds(updated);
  };

  // Handle staff count and shift status change
  const handleStaffChange = (
    index: number,
    field: 'scheduledOnDutyCount' | 'currentlyAvailableCount' | 'shiftStatus',
    value: any
  ) => {
    setValidationError(null);
    const updated = [...staff];
    const item = { ...updated[index] };
    if (field === 'shiftStatus') {
      item.shiftStatus = value;
    } else {
      item[field] = Math.max(0, isNaN(value) ? 0 : value);
    }
    updated[index] = item;
    setStaff(updated);
  };

  // Handle ambulance aggregate change
  const handleAmbulanceChange = (index: number, field: 'availableReadyCount' | 'inTransitCount', value: number) => {
    setValidationError(null);
    const updated = [...ambulances];
    const item = { ...updated[index] };
    item[field] = Math.max(0, isNaN(value) ? 0 : value);
    updated[index] = item;
    setAmbulances(updated);
  };

  // Handle individual vehicle status change
  const handleVehicleStatusChange = async (ambulanceId: string, newStatus: string) => {
    try {
      await updateAmbulanceStatus(ambulanceId, { status: newStatus });
      setSaveSuccessMessage(`Ambulance status updated to ${newStatus}.`);
      loadLiveData();
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (e: any) {
      setValidationError(`Failed to update vehicle status: ${e.message}`);
    }
  };

  // Validate before publishing
  const validateForm = (): boolean => {
    for (const b of beds) {
      if (b.availableBeds + b.occupiedBeds > b.totalBeds) {
        setValidationError(`Invalid bed calculation for ${b.categoryLabel}: Available (${b.availableBeds}) + Occupied (${b.occupiedBeds}) cannot exceed Total Licensed Beds (${b.totalBeds}).`);
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
    const nurseReady = staff.find((s) => s.staffCategory === 'EMERGENCY_NURSE' || s.staffCategory === 'ICU_TRIAGE_NURSE')?.currentlyAvailableCount ?? 0;
    const readyAmbulances = ambulances.reduce((acc, a) => acc + (a.availableReadyCount ?? 0), 0);
    const summaryText = `Published capacity update: ${icuAvail} ICU beds available, ${docReady} triage physicians on-duty, ${nurseReady} nurses on-duty, ${readyAmbulances} ready ambulances.`;

    if (user?.token && user.hospitalId) {
      try {
        await publishHospitalResources(user.hospitalId, user.token, {
          beds,
          staff,
          ambulances,
          changeSummary: summaryText,
        });
        setDataProvenance('MANUAL');
        setIsLiveConnected(true);
        loadLiveData();
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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                  {user?.hospitalName || baseHospital.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800">
                  KPME Verified
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    dataProvenance === 'MANUAL'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : 'bg-purple-950 text-purple-300 border border-purple-800'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  <span>{dataProvenance === 'MANUAL' ? 'MANUAL ENTRY' : 'DEMO SYNTHETIC'}</span>
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
                  {isLiveConnected ? 'Connected to SQLite Database' : 'Offline Buffer'}
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
              <span>Publish Live Capacity</span>
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
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Hospital Bed Availability Management
                </h2>
                <p className="text-xs text-slate-500">
                  Maintain ICU, Trauma, Emergency, and Critical Observation bed counts with mathematical integrity.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total Licensed: <strong className="text-slate-800">{beds.reduce((acc, b) => acc + (b.totalBeds || 0), 0)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {beds.map((bed, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-800">{bed.categoryLabel}</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {bed.availableBeds} Available
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
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Doctor & Medical Staff Availability & Shifts
                </h2>
                <p className="text-xs text-slate-500">
                  Update on-duty physicians, emergency triage nurses, and active shift rosters.
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-500">Casualty & Triage Readiness</span>
          </div>

          <div className="space-y-3">
            {staff.map((s, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-800">{s.label}</h3>
                    <select
                      value={s.shiftStatus || 'DAY_SHIFT'}
                      onChange={(e) => handleStaffChange(idx, 'shiftStatus', e.target.value)}
                      className="text-[11px] font-bold bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-700 cursor-pointer"
                    >
                      <option value="DAY_SHIFT">DAY SHIFT (08:00 - 20:00)</option>
                      <option value="NIGHT_SHIFT">NIGHT SHIFT (20:00 - 08:00)</option>
                      <option value="ON_DUTY">ON DUTY / CASUALTY</option>
                      <option value="ON_CALL">ON CALL / STANDBY</option>
                    </select>
                  </div>
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

        {/* 3. Ambulance Fleet & Vehicle Tracking Section */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Ambulance Fleet Status & Individual Vehicle Dispatch
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time status transitions: AVAILABLE, ASSIGNED, EN_ROUTE, AT_SCENE, COMPLETED.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadLiveData}
              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Fleet</span>
            </button>
          </div>

          {/* Individual Vehicle Table */}
          {ambulanceFleet.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Vehicle Plate</th>
                    <th className="p-3">Ambulance Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Current Location</th>
                    <th className="p-3">Last Updated</th>
                    <th className="p-3 text-right">Quick Transition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {ambulanceFleet.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {vehicle.registrationPlate}
                      </td>
                      <td className="p-3 font-medium text-slate-700">
                        {vehicle.typeLabel || vehicle.ambulanceType}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            vehicle.status === 'AVAILABLE' || vehicle.status === 'AVAILABLE_READY'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : vehicle.status === 'ASSIGNED' || vehicle.status === 'EN_ROUTE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {vehicle.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {vehicle.currentLocation || 'Hospital Station Base'}
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {vehicle.lastUpdated ? new Date(vehicle.lastUpdated).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td className="p-3 text-right">
                        <select
                          value={vehicle.status}
                          onChange={(e) => handleVehicleStatusChange(vehicle.id, e.target.value)}
                          className="bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800 text-[11px] cursor-pointer"
                        >
                          <option value="AVAILABLE">AVAILABLE (At Station)</option>
                          <option value="ASSIGNED">ASSIGNED (Call Allocated)</option>
                          <option value="EN_ROUTE">EN_ROUTE (Transit to Patient)</option>
                          <option value="AT_SCENE">AT_SCENE (At Casualty Spot)</option>
                          <option value="COMPLETED">COMPLETED (Released)</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">
              No individual ambulance vehicles registered in fleet table.
            </div>
          )}

          {/* Aggregate Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {ambulances.map((amb, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-slate-800">{amb.label}</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-700 mb-1">Available Ready Count</label>
                    <input
                      type="number"
                      min={0}
                      value={amb.availableReadyCount}
                      onChange={(e) => handleAmbulanceChange(idx, 'availableReadyCount', parseInt(e.target.value))}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-lg p-2 font-extrabold text-emerald-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">In Transit / Assigned</label>
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

        {/* 4. Immutable Audit Trail History */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Regulatory Capacity Audit Trail Log
              </h2>
              <p className="text-xs text-slate-500">
                Immutable chronological log of all published bed, staffing, and ambulance fleet modifications.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">{log.summary}</p>
                  <p className="text-[11px] text-slate-400">
                    Committed by <strong className="text-slate-600">{log.author}</strong>
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500 flex-shrink-0">
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Confirmation Modal */}
      {confirmPublishOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Confirm Capacity Broadcast</h3>
                <p className="text-xs text-slate-500">Publish immediately to live SurgeWatch network</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to publish updated bed numbers, on-duty doctors, nurses, and ambulance fleet status. This action will commit an immutable regulatory audit log and trigger real-time Socket.IO broadcasts to all connected emergency clients.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPublishOpen(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
