import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import surgeWatchLogo from '../assets/Surge_watch.png';
import {
  Lock,
  Mail,
  Building,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Loader2,
  Clock
} from 'lucide-react';

export const HospitalAdminAuthPage: FC = () => {
  const [tab, setTab] = useState<'LOGIN' | 'REQUEST_ACCESS' | 'PLATFORM_LOGIN'>('LOGIN');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Request Access form state
  const [hospName, setHospName] = useState('');
  const [hospAddress, setHospAddress] = useState('');
  const [area, setArea] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantDesignation, setApplicantDesignation] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDetails, setSubmittedDetails] = useState<{
    hospitalName: string;
    regNumber: string;
    area: string;
    officialEmail: string;
  } | null>(null);

  const { loginAdmin, submitHospitalAccessRequest, loginDemoUser } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const res = await loginAdmin(email, password);
    if (!res.success) {
      setLoginError(res.error || 'Failed to authenticate administrator account.');
      return;
    }

    if (res.user?.role === 'PLATFORM_ADMIN' || email.toLowerCase().includes('superadmin')) {
      navigate('/platform/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
  };

  const handleRequestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    setIsSubmitting(true);

    try {
      const res = await submitHospitalAccessRequest({
        hospitalName: hospName.trim(),
        hospitalAddress: hospAddress.trim(),
        area: area.trim(),
        officialEmail: officialEmail.trim(),
        emergencyPhone: emergencyPhone.trim(),
        regNumber: regNumber.trim(),
        applicantName: applicantName.trim(),
        applicantDesignation: applicantDesignation.trim(),
      });

      if (!res.success) {
        setRequestError(res.error || 'Failed to submit hospital registration request.');
        setIsSubmitting(false);
        return;
      }

      setSubmittedDetails({
        hospitalName: hospName.trim(),
        regNumber: regNumber.trim(),
        area: area.trim(),
        officialEmail: officialEmail.trim(),
      });
      setRequestSubmitted(true);
    } catch (err: any) {
      setRequestError(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetRequestForm = () => {
    setHospName('');
    setHospAddress('');
    setArea('');
    setOfficialEmail('');
    setEmergencyPhone('');
    setRegNumber('');
    setApplicantName('');
    setApplicantDesignation('');
    setRequestError(null);
    setRequestSubmitted(false);
  };

  const handleDemoHosp = async (hospitalId: 'hosp-victoria' | 'hosp-manipal-old-airport') => {
    await loginDemoUser('HOSPITAL_ADMIN', hospitalId);
    navigate('/admin/dashboard');
  };

  const handleDemoPlatform = async () => {
    await loginDemoUser('PLATFORM_ADMIN');
    navigate('/platform/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Back Link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4 mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-sky-400" />
          <span>Back to SurgeWatch Discovery</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
        {/* Brand Banner */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden mx-auto flex items-center justify-center p-1 shadow-md">
            <img src={surgeWatchLogo} alt="SurgeWatch Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            SurgeWatch Healthcare Portal
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Authorized portal for hospital administrators, emergency triage leads, and platform verifiers across Bengaluru.
          </p>
        </div>

        {/* Tab Header */}
        <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex text-xs font-bold text-slate-400 mb-6">
          <button
            type="button"
            onClick={() => {
              setTab('LOGIN');
              setLoginError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer text-center ${
              tab === 'LOGIN' ? 'bg-slate-800 text-white shadow-xs' : 'hover:text-slate-200'
            }`}
          >
            Hospital Admin Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('REQUEST_ACCESS');
              setLoginError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer text-center ${
              tab === 'REQUEST_ACCESS' ? 'bg-slate-800 text-white shadow-xs' : 'hover:text-slate-200'
            }`}
          >
            Register / Request Access
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('PLATFORM_LOGIN');
              setLoginError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer text-center ${
              tab === 'PLATFORM_LOGIN' ? 'bg-slate-800 text-sky-400 shadow-xs' : 'hover:text-slate-200'
            }`}
          >
            Platform Super Admin
          </button>
        </div>

        {/* Tab 1: Hospital Admin Login */}
        {tab === 'LOGIN' && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Authorized Hospital Administrator Login</h3>
              <p className="text-xs text-slate-400 mt-1">
                Access is restricted to medical personnel authorized to update live bed and staff availability.
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Official Hospital Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@victoria.gov.in"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
              >
                <span>Enter Hospital Resource Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Pre-fills for Testing */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Instant Demo Access (One-Click Testing):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleDemoHosp('hosp-victoria')}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition-colors cursor-pointer"
                >
                  <span className="font-bold text-sky-400 block">Victoria Hospital Admin</span>
                  <span className="text-[10px] text-slate-400">Government Level 1 Trauma</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoHosp('hosp-manipal-old-airport')}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition-colors cursor-pointer"
                >
                  <span className="font-bold text-emerald-400 block">Manipal Hospital Admin</span>
                  <span className="text-[10px] text-slate-400">Old Airport Road Hub</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hospital Access Request Form */}
        {tab === 'REQUEST_ACCESS' && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Hospital Registration & Access Request</h3>
              <p className="text-xs text-slate-400 mt-1">
                Hospital administrators must verify their institutional license under KPME (Karnataka Private Medical Establishments) or Government Medical Directorates before receiving update privileges.
              </p>
            </div>

            {requestError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{requestError}</span>
              </div>
            )}

            {requestSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Registration Request Submitted</h4>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-600 text-amber-300 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Status: Pending Approval</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-left text-slate-300 space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400 font-semibold">Hospital Name:</span>
                    <strong className="text-white">{submittedDetails?.hospitalName || hospName}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400 font-semibold">KPME License:</span>
                    <strong className="font-mono text-purple-300">{submittedDetails?.regNumber || regNumber}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400 font-semibold">Area / Locality:</span>
                    <span className="text-white">{submittedDetails?.area || area}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Official Email:</span>
                    <span className="text-sky-300">{submittedDetails?.officialEmail || officialEmail}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Your application has been stored in the database with <strong className="text-amber-400 font-semibold">Pending</strong> approval status. The Platform Administrator has received an automated alert to review and approve your registration.
                </p>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetRequestForm();
                      setTab('LOGIN');
                    }}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Go to Admin Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetRequestForm();
                    }}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Register Another Hospital
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Hospital Full Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={hospName}
                      onChange={(e) => setHospName(e.target.value)}
                      placeholder="e.g. Apollo Hospital Jayanagar"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Bengaluru Area / Locality
                    </label>
                    <input
                      type="text"
                      required
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Jayanagar 7th Block"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      KPME Registration Number
                    </label>
                    <input
                      type="text"
                      required
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="e.g. KPME/BLR/2024/9182"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Complete Address
                  </label>
                  <input
                    type="text"
                    required
                    value={hospAddress}
                    onChange={(e) => setHospAddress(e.target.value)}
                    placeholder="Street, Landmark, Pincode"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Official Institutional Email
                    </label>
                    <input
                      type="email"
                      required
                      value={officialEmail}
                      onChange={(e) => setOfficialEmail(e.target.value)}
                      placeholder="admin@hospital.org"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      24/7 Emergency Line
                    </label>
                    <input
                      type="tel"
                      required
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="080-26701150"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Authorized Applicant Name
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="Dr. Ramesh Prasad"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Official Designation
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantDesignation}
                      onChange={(e) => setApplicantDesignation(e.target.value)}
                      placeholder="Medical Superintendent / Lead"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Registration Dossier...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Submit Institutional Registration</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: Platform Super Administrator Login */}
        {tab === 'PLATFORM_LOGIN' && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-700/80 text-[10px] font-semibold uppercase tracking-wider mb-2 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Operational Governance</span>
              </div>
              <h3 className="text-lg font-bold text-white">Platform Administrator Portal</h3>
              <p className="text-xs text-slate-400 mt-1">
                Review pending hospital verification requests, inspect platform-wide stale data thresholds, and monitor immutable audit trails.
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Platform Operator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@surgewatch.in"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-slate-400 outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-slate-400 outline-hidden transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-100 text-slate-950 rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer"
              >
                <span>Enter Platform Governance Console</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Instant Demo for Platform Auditor */}
            <div className="pt-4 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={handleDemoPlatform}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Instant Sign In as Platform Auditor</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
