import { useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Shield, LogOut, LayoutDashboard, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import surgeWatchLogo from '../assets/Surge_watch.png';

interface NavbarProps {
  onNavigateToSearch?: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToPatientLogin?: () => void;
}

export const Navbar: FC<NavbarProps> = ({
  onNavigateToSearch,
  onNavigateToAdmin,
  onNavigateToPatientLogin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleDashboardClick = () => {
    if (!user) return;
    if (user.role === 'PLATFORM_ADMIN' || user.role === 'MASTER_ADMIN') {
      navigate('/platform/dashboard');
    } else if (user.role === 'HOSPITAL_ADMIN') {
      navigate('/admin/dashboard');
    } else {
      navigate('/search');
    }
  };

  const roleLabel =
    user?.role === 'MASTER_ADMIN'
      ? 'Master Super Admin'
      : user?.role === 'PLATFORM_ADMIN'
      ? 'Platform Admin'
      : user?.role === 'HOSPITAL_ADMIN'
      ? 'Hospital Admin'
      : 'Patient';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="group flex items-center gap-3 focus:outline-hidden focus:ring-2 focus:ring-sky-500 rounded-lg p-1"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center shadow-md group-hover:scale-105 transition-transform p-1">
                <img src={surgeWatchLogo} alt="SurgeWatch Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
                    Surge<span className="text-sky-600">Watch</span>
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-sky-100 text-sky-800 rounded">
                    BLR
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase hidden sm:block">
                  Emergency Hospital Discovery
                </span>
              </div>
            </a>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <button
              onClick={onNavigateToSearch}
              className="text-slate-800 hover:text-sky-600 transition-colors cursor-pointer"
            >
              Find Hospitals
            </button>
            <a
              href="#how-it-works"
              className="hover:text-sky-600 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#data-freshness"
              className="hover:text-sky-600 transition-colors"
            >
              Data Freshness
            </a>
            <a
              href="#safety"
              className="hover:text-sky-600 transition-colors"
            >
              Safety Guidelines
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {/* User Info Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-left">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-sky-400 flex items-center justify-center font-bold text-xs">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 leading-tight max-w-[140px] truncate">
                      {user.fullName || user.email}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-wider ${
                        user.role === 'MASTER_ADMIN' || user.role === 'PLATFORM_ADMIN'
                          ? 'text-purple-600'
                          : user.role === 'HOSPITAL_ADMIN'
                          ? 'text-sky-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {roleLabel}
                    </span>
                  </div>
                </div>

                {/* Dashboard Link */}
                <button
                  type="button"
                  onClick={handleDashboardClick}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {user.role === 'MASTER_ADMIN' || user.role === 'PLATFORM_ADMIN'
                      ? 'Platform Console'
                      : user.role === 'HOSPITAL_ADMIN'
                      ? 'Hospital Dashboard'
                      : 'Hospital Search'}
                  </span>
                </button>

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={onNavigateToPatientLogin}
                  className="px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Patient Sign In
                </button>

                <button
                  onClick={onNavigateToAdmin}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
                >
                  <Shield className="w-4 h-4 text-sky-400" />
                  <span>Hospital Admin</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col space-y-2 text-base font-semibold text-slate-700">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateToSearch?.();
              }}
              className="text-left py-2 px-3 rounded-md hover:bg-slate-50 text-sky-600 font-bold"
            >
              Find Hospitals Nearby
            </button>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-md hover:bg-slate-50"
            >
              How It Works
            </a>
            <a
              href="#data-freshness"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-md hover:bg-slate-50"
            >
              Data Freshness
            </a>
            <a
              href="#safety"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-md hover:bg-slate-50"
            >
              Emergency Disclaimer
            </a>
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">{user.fullName || user.email}</span>
                    <span className="text-[10px] text-sky-700 font-bold">{roleLabel}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleDashboardClick();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 rounded-lg shadow-sm"
                >
                  <LayoutDashboard className="w-4 h-4 text-sky-400" />
                  <span>Open Management Console</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    navigate('/');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigateToPatientLogin?.();
                  }}
                  className="w-full text-center py-2.5 px-4 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Patient Sign In
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigateToAdmin?.();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 rounded-lg shadow-sm"
                >
                  <Shield className="w-4 h-4 text-sky-400" />
                  <span>Hospital Admin Portal</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
