import type { FC, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // If route requires admin roles, send to admin login, otherwise to patient login
    const target = allowedRoles?.includes('HOSPITAL_ADMIN') || allowedRoles?.includes('PLATFORM_ADMIN')
      ? '/admin/login'
      : '/patient/login';
    return <Navigate to={target} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-xl mx-auto my-16 px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-700 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Access Restricted (403)</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your current logged-in role (<strong className="text-slate-800">{user.role}</strong>) does not have authorization to access this medical management portal.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Discovery</span>
            </a>
            <a
              href="/admin/login"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              <span>Switch to Hospital Admin</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
