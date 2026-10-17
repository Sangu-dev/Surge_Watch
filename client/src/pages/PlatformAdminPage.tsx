import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type HospitalAccessApplication } from '../context/AuthContext';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Activity,
  LogOut,
  FileCheck,
  RefreshCw,
  AlertTriangle,
  Database,
  Building
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

  const [requests, setRequests] = useState<HospitalAccessApplication[]>([
    {
      id: 'req-101',
      hospitalName: 'Apollo Hospital (Jayanagar)',
      hospitalAddress: '21/2, 14th Cross Rd, 7th Block, Jayanagar',
      area: 'Jayanagar',
      officialEmail: 'admin.jayanagar@apollohospitals.com',
      emergencyPhone: '+91-80-46688888',
      regNumber: 'KPME/BLR/2022/4192',
      applicantName: 'Dr. Srinivasulu M.',
      applicantDesignation: 'Medical Superintendent',
      status: 'PENDING',
      submittedAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);

  const [freshnessMetrics, setFreshnessMetrics] = useState<{
    total: number;
    live: number;
    recent: number;
    stale: number;
    healthPercentage: number;
  }>({
    total: 5,
    live: 4,
    recent: 1,
    stale: 0,
    healthPercentage: 100,
  });

  const [hospitalRows, setHospitalRows] = useState<FreshnessHospitalRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isLiveDatabase, setIsLiveDatabase] = useState<boolean>(false);

  // Load live access requests and freshness overview from backend
  const loadPlatformData = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);

    try {
      // 1. Fetch live pending registration requests
      const remoteRequests = await fetchPlatformRequests(user.token);
      if (remoteRequests && Array.isArray(remoteRequests)) {
        setIsLiveDatabase(true);
        setRequests(
          remoteRequests.map((r: any) => ({
            id: r.id,
            hospitalName: r.hospitalName,
            hospitalAddress: r.hospitalAddress,
            area: r.area,
            officialEmail: r.officialEmail,
            emergencyPhone: r.contactPhone,
            regNumber: r.hospitalRegNumber,
            applicantName: r.user?.fullName || 'Hospital Applicant',
            applicantDesignation: 'Institutional Admin',
            status: r.status,
            submittedAt: r.createdAt,
          }))
        );
      }
    } catch (e) {
      console.warn('Failed to fetch platform requests:', e);
    }

    try {
      // 2. Fetch live system freshness overview
      const freshnessData = await fetchPlatformFreshness(user.token);
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

  // Connect to Socket.IO real-time availability broadcasts
  useEffect(() => {
    const socket = getSocket();

    const handleHospitalUpdate = (event: { hospitalId: string; updatedAt: string }) => {
      console.log('[PlatformAdmin] Live hospital broadcast received, refreshing health monitors:', event);
      loadPlatformData();
    };

    socket.on('hospital_resource_updated', handleHospitalUpdate);

    return () => {
      socket.off('hospital_resource_updated', handleHospitalUpdate);
    };
  }, [loadPlatformData]);

  const handleApprove = async (id: string) => {
    if (user?.token) {
      try {
        await approvePlatformRequest(id, user.token, 'Verified against Karnataka KPME medical registry.');
        setFeedbackMessage('Hospital access request approved! Administrator credentials active.');
        setTimeout(() => setFeedbackMessage(null), 4000);
      } catch (err: any) {
        setFeedbackMessage(`Approval note: ${err.message}`);
        setTimeout(() => setFeedbackMessage(null), 4000);
      }
    }

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'APPROVED' } : r))
    );
  };

  const handleReject = async (id: string) => {
    if (user?.token) {
      try {
        await rejectPlatformRequest(id, user.token, 'KPME registration could not be authenticated.');
        setFeedbackMessage('Hospital registration request rejected.');
        setTimeout(() => setFeedbackMessage(null), 4000);
      } catch (err: any) {
        setFeedbackMessage(`Rejection note: ${err.message}`);
        setTimeout(() => setFeedbackMessage(null), 4000);
      }
    }

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'REJECTED' } : r))
    );
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
            <div className="w-10 h-10 rounded-xl bg-purple-900/60 text-purple-400 flex items-center justify-center font-bold border border-purple-700/50">
              <ShieldAlert className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                  SurgeWatch Platform Governance & Verification
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
                  <span>{isLiveDatabase ? 'SQLite Live' : 'Demo Mode'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Logged in as <strong className="text-slate-200">{user?.fullName}</strong> ({user?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div className="bg-emerald-950/80 border border-emerald-700 rounded-xl p-4 text-xs sm:text-sm font-semibold text-emerald-200 flex items-center gap-2 shadow-md">
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

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Access Applications</span>
            <div className="text-3xl font-extrabold text-amber-400">{pendingCount}</div>
            <p className="text-xs text-amber-300 font-semibold">Requires KPME License Validation</p>
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
        <section className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">
                Hospital Administrator Registration &amp; KPME Verification Queue
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {pendingCount} Pending Review
            </span>
          </div>

          {requests.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No hospital registration requests currently in the queue.
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white">{req.hospitalName}</h3>
                      <span className="text-xs text-slate-400">({req.area})</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">{req.hospitalAddress}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300 pt-1">
                      <div>
                        <span className="block text-[10px] text-slate-500 font-semibold">KPME License:</span>
                        <span className="font-mono text-purple-300 font-semibold">{req.regNumber}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-semibold">Applicant:</span>
                        <span>{req.applicantName} ({req.applicantDesignation})</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 font-semibold">Emergency Phone:</span>
                        <span className="text-sky-300">{req.emergencyPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve &amp; Grant Access</span>
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-300 border border-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Decision Recorded</span>
                    )}
                  </div>
                </div>
              ))}
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
