import type { FC, ReactNode } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, Building2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // If route requires admin roles, send to admin login, otherwise to patient login
    const requiresAdmin =
      allowedRoles?.includes('HOSPITAL_ADMIN') ||
      allowedRoles?.includes('PLATFORM_ADMIN') ||
      allowedRoles?.includes('MASTER_ADMIN');
    const target = requiresAdmin ? '/admin/login' : '/patient/login';
    return <Navigate to={target} replace />;
  }

  // Expand allowedRoles to treat MASTER_ADMIN and PLATFORM_ADMIN as equivalent super-admin roles
  const effectiveAllowedRoles = allowedRoles?.flatMap((r) =>
    r === 'PLATFORM_ADMIN' ? ['PLATFORM_ADMIN', 'MASTER_ADMIN'] : [r]
  );

  const isRoleAuthorized = !effectiveAllowedRoles || effectiveAllowedRoles.includes(user.role);

  if (!isRoleAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-16 px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-700 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Access Restricted (403)</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your current logged-in role (<strong className="text-slate-800">{user.role}</strong>) does not have authorization to access this portal.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Discovery</span>
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is a HOSPITAL_ADMIN accessing hospital management, verify active hospital assignment
  if (user.role === 'HOSPITAL_ADMIN' && allowedRoles?.includes('HOSPITAL_ADMIN') && !user.hospitalId) {
    return (
      <div className="max-w-xl mx-auto my-16 px-4">
        <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Hospital Assignment Pending</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your account is registered as a <strong className="text-slate-800">Hospital Administrator</strong>, but has not yet been assigned to an active hospital facility membership.
          </p>
          <p className="text-xs text-slate-500">
            Please ask your Platform Administrator to link your account to your hospital or submit a registration dossier.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Discovery</span>
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
