import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type HospitalAccessApplication } from '../context/AuthContext';
import surgeWatchLogo from '../assets/Surge_watch.png';
import {
  CheckCircle,
  XCircle,
  Activity,
  LogOut,
  FileCheck,
  RefreshCw,
  AlertTriangle,
  Database,
  Building,
  Bell,
  AlertCircle,
  Loader2,
  Clock
} from 'lucide-react';
import { FreshnessIndicator } from '../components/FreshnessIndicator';
import {
  fetchPlatformRequests,
  approvePlatformRequest,
  rejectPlatformRequest,
  fetchPlatformFreshness
} from '../services/api';
import { getSocket } from '../services/socket';

interface FreshnessHospitalRow {
  id: string;
  name: string;
  area: string;
  operatingStatus: string;
  verificationStatus: string;
  lastResourceUpdate: string;
  freshnessStatus: string;
  label: string;
  minutesAgo: number;
  availableIcuBeds: number;
  totalAvailableBeds: number;
  readyAmbulances: number;
  readyDocs: number;
  updatedBy: string;
}

export const PlatformAdminPage: FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<HospitalAccessApplication[]>([]);
  const [freshnessMetrics, setFreshnessMetrics] = useState<{
    total: number;
    live: number;
    recent: number;
    stale: number;
    healthPercentage: number;
  }>({
    total: 0,
    live: 0,
    recent: 0,
    stale: 0,
    healthPercentage: 100,
  });

  const [hospitalRows, setHospitalRows] = useState<FreshnessHospitalRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [realtimeAlert, setRealtimeAlert] = useState<string | null>(null);
  const [isLiveDatabase, setIsLiveDatabase] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load live access requests and freshness overview from backend
  const loadPlatformData = useCallback(async () => {
    setLoading(true);

    try {
      // 1. Fetch live pending registration requests
      const token = user?.token || '';
      const remoteRequests = await fetchPlatformRequests(token);

      if (remoteRequests && Array.isArray(remoteRequests)) {
        setIsLiveDatabase(true);
        setRequests(
          remoteRequests.map((r: any) => {
            let parsedApplicant = r.user?.fullName || 'Hospital Applicant';
            let parsedDesignation = 'Institutional Administrator';

            if (r.reviewNotes && r.reviewNotes.includes('Applicant:')) {
              const match = r.reviewNotes.match(/Applicant:\s*([^()]+)\s*(?:\(([^()]+)\))?/);
              if (match) {
                if (match[1]) parsedApplicant = match[1].trim();
                if (match[2]) parsedDesignation = match[2].trim();
              }
            }

            return {
              id: r.id,
              hospitalName: r.hospitalName,
              hospitalAddress: r.hospitalAddress,
              area: r.area,
              officialEmail: r.officialEmail,
              emergencyPhone: r.contactPhone,
              regNumber: r.hospitalRegNumber,
              applicantName: parsedApplicant,
              applicantDesignation: parsedDesignation,
              status: (r.status || 'PENDING').toUpperCase() as 'PENDING' | 'APPROVED' | 'REJECTED',
              submittedAt: r.createdAt,
            };
          })
        );
      } else {
        // Fallback to local storage cache if backend is unreachable
        const cached = localStorage.getItem('surgewatch_pending_requests');
        if (cached) {
          try {
            setRequests(JSON.parse(cached));
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch platform requests:', e);
    }

    try {
      // 2. Fetch live system freshness overview
      const token = user?.token || '';
      const freshnessData = await fetchPlatformFreshness(token);
      if (freshnessData) {
        setIsLiveDatabase(true);
        if (freshnessData.metrics) {
          setFreshnessMetrics(freshnessData.metrics);
        }
        if (freshnessData.data && Array.isArray(freshnessData.data)) {
          setHospitalRows(freshnessData.data);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch freshness overview:', e);
    }

    setLoading(false);
  }, [user?.token]);

  useEffect(() => {
    loadPlatformData();
  }, [loadPlatformData]);

  // Connect to Socket.IO real-time availability and registration broadcasts
  useEffect(() => {
    const socket = getSocket();

    const handleHospitalUpdate = (event: { hospitalId: string; updatedAt: string }) => {
      console.log('[PlatformAdmin] Live hospital broadcast received, refreshing health monitors:', event);
      loadPlatformData();
    };

    const handleNewRegistration = (event: any) => {
      console.log('[PlatformAdmin] Real-time hospital registration notification received:', event);
      setRealtimeAlert(`New Registration: ${event.hospitalName} (${event.area || 'Bengaluru'}) has been submitted with Pending status.`);
      loadPlatformData();
    };

    const handleRegistrationUpdated = (event: any) => {
      console.log('[PlatformAdmin] Hospital registration status update broadcast received:', event);
      loadPlatformData();
    };

    socket.on('hospital_resource_updated', handleHospitalUpdate);
    socket.on('new_hospital_registration', handleNewRegistration);
    socket.on('hospital_registration_updated', handleRegistrationUpdated);

    return () => {
      socket.off('hospital_resource_updated', handleHospitalUpdate);
      socket.off('new_hospital_registration', handleNewRegistration);
      socket.off('hospital_registration_updated', handleRegistrationUpdated);
    };
  }, [loadPlatformData]);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      const token = user?.token || '';
      await approvePlatformRequest(id, token, 'Verified against Karnataka KPME medical registry.');
      setFeedbackMessage('Hospital registration approved successfully! Hospital verification status updated to Approved.');
      await loadPlatformData();
    } catch (err: any) {
      setFeedbackMessage(`Approval error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoadingId(id);
    try {
      const token = user?.token || '';
      await rejectPlatformRequest(id, token, 'KPME registration could not be authenticated against the Karnataka Medical Directorate.');
      setFeedbackMessage('Hospital registration rejected. Status set to Rejected.');
      await loadPlatformData();
    } catch (err: any) {
      setFeedbackMessage(`Rejection error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20 font-sans">
      {/* Top Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center p-0.5 shadow-md">
              <img src={surgeWatchLogo} alt="SurgeWatch Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                  SurgeWatch Platform Governance &amp; Verification
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-900 text-purple-200 border border-purple-700">
                  Platform Admin
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isLiveDatabase
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span>{isLiveDatabase ? 'SQLite Live' : 'Offline Mode'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Logged in as <strong className="text-slate-200">{user?.fullName || 'Super Admin'}</strong> ({user?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Indicator Bell */}
            <button
              onClick={() => {
                const el = document.getElementById('pending-queue-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="relative inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Hospital Approval Notifications"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Approvals</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-extrabold bg-amber-500 text-slate-950 rounded-full animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => loadPlatformData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh platform telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Telemetry</span>
            </button>

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Real-Time Live Registration Notification Banner */}
        {realtimeAlert && (
          <div className="bg-amber-950/90 border border-amber-500/80 rounded-xl p-4 text-xs sm:text-sm font-semibold text-amber-200 flex items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span>{realtimeAlert}</span>
            </div>
            <button
              onClick={() => setRealtimeAlert(null)}
              className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-xs rounded-md transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action Feedback Alert Toast */}
        {feedbackMessage && (
          <div className="bg-emerald-950/90 border border-emerald-600 rounded-xl p-4 text-xs sm:text-sm font-semibold text-emerald-200 flex items-center gap-2 shadow-md animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Global Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Verified Hospitals</span>
            <div className="text-3xl font-extrabold text-white">{freshnessMetrics.total}</div>
            <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <Building className="w-3.5 h-3.5" />
              <span>Bengaluru Network Nodes Active</span>
            </p>
          </div>

          <div className={`bg-slate-950/80 border rounded-2xl p-5 space-y-2 transition-colors ${
            pendingCount > 0 ? 'border-amber-600/80 shadow-md shadow-amber-950/50' : 'border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Registrations</span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950">
                  Action Needed
                </span>
              )}
            </div>
            <div className="text-3xl font-extrabold text-amber-400">{pendingCount}</div>
            <p className="text-xs text-amber-300 font-semibold">
              {pendingCount === 1 ? '1 Registration requires approval' : `${pendingCount} Registrations require approval`}
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live &amp; Recent Feeds</span>
            <div className="text-3xl font-extrabold text-emerald-400">
              {freshnessMetrics.live + freshnessMetrics.recent}
              <span className="text-sm font-normal text-slate-400 ml-1">/ {freshnessMetrics.total}</span>
            </div>
            <p className="text-xs text-emerald-300 font-semibold">Updated within &lt;2 hour threshold</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Freshness Health</span>
            <div className="text-3xl font-extrabold text-sky-400">{freshnessMetrics.healthPercentage}%</div>
            <p className="text-xs text-sky-300 font-semibold">Real-Time Data Health Rating</p>
          </div>
        </div>

        {/* 1. Review Hospital Registration Requests */}
        <section id="pending-queue-section" className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">
                Hospital Administrator Registration &amp; KPME Verification Queue
              </h2>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              pendingCount > 0 ? 'bg-amber-950 text-amber-300 border border-amber-700' : 'text-slate-400'
            }`}>
              {pendingCount} Pending Review
            </span>
          </div>

          {/* Pending Alert Notice when items require attention */}
          {pendingCount > 0 && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Action Required:</strong> There are <strong>{pendingCount}</strong> newly submitted hospital registration(s) awaiting your KPME authentication review and approval.
              </span>
            </div>
          )}

          {requests.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <FileCheck className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-400">No hospital registration requests in the queue.</p>
              <p className="text-slate-500">Newly submitted hospital registrations will appear here automatically in real time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const isPending = req.status === 'PENDING';
                const isApproved = req.status === 'APPROVED';
                const isRejected = req.status === 'REJECTED';
                const isLoadingAction = actionLoadingId === req.id;

                return (
                  <div
                    key={req.id}
                    className={`bg-slate-900 border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      isPending
                        ? 'border-amber-700/80 shadow-xs shadow-amber-950/30'
                        : isApproved
                        ? 'border-emerald-900/60 bg-slate-900/80'
                        : 'border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="space-y-2 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white">{req.hospitalName}</h3>
                        <span className="text-xs text-slate-400">({req.area})</span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : isRejected
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-600 animate-pulse'
                          }`}
                        >
                          {req.status}
                        </span>
                        {isPending && (
                          <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Awaiting Approval</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400">{req.hospitalAddress}</p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300 pt-1">
                        <div>
                          <span className="block text-[10px] text-slate-500 font-semibold">KPME License:</span>
                          <span className="font-mono text-purple-300 font-semibold">{req.regNumber}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500 font-semibold">Applicant:</span>
                          <span className="text-slate-200">{req.applicantName}</span>
                          <span className="block text-[10px] text-slate-400">{req.applicantDesignation}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500 font-semibold">Emergency Phone:</span>
                          <span className="text-sky-300 font-mono">{req.emergencyPhone}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500 font-semibold">Official Email:</span>
                          <span className="text-slate-300 truncate block">{req.officialEmail}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={isLoadingAction}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            {isLoadingAction ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            <span>Approve &amp; Grant Access</span>
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={isLoadingAction}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-red-900/60 disabled:opacity-50 text-slate-300 hover:text-red-300 border border-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-400">
                          {isApproved ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                          )}
                          <span>Decision Recorded ({req.status})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. Global Hospital Freshness & Status Monitor */}
        <section className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-bold text-white">
                Live Data Freshness Monitor Across Bengaluru
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Auto-Synchronized via Real-Time Socket.IO
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Hospital Name</th>
                  <th className="p-3">Area</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Data Freshness</th>
                  <th className="p-3">ICU Available</th>
                  <th className="p-3">Ready Ambulances</th>
                  <th className="p-3">Triage Doctors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {hospitalRows.map((hosp) => (
                  <tr key={hosp.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3 font-bold text-white">{hosp.name}</td>
                    <td className="p-3 text-slate-400">{hosp.area}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                        {hosp.operatingStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      <FreshnessIndicator lastUpdated={hosp.lastResourceUpdate} />
                    </td>
                    <td className="p-3 font-extrabold text-emerald-400">
                      {hosp.availableIcuBeds} Beds
                    </td>
                    <td className="p-3 font-semibold text-amber-400">
                      {hosp.readyAmbulances} Units
                    </td>
                    <td className="p-3 text-slate-300">
                      {hosp.readyDocs} on shift
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {freshnessMetrics.stale > 0 && (
            <div className="bg-amber-950/60 border border-amber-800 rounded-xl p-3.5 text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Attention: {freshnessMetrics.stale} hospital listing(s) have not broadcast capacity updates within the last 2 hours. Administrative reminder triggered.
              </span>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
