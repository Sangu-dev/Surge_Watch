import type { FC } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { EmergencyBanner } from './components/EmergencyBanner';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { PatientSearchPage } from './pages/PatientSearchPage';
import { PatientAuthPage } from './pages/PatientAuthPage';
import { HospitalAdminAuthPage } from './pages/HospitalAdminAuthPage';
import { HospitalDashboardPage } from './pages/HospitalDashboardPage';
import { PlatformAdminPage } from './pages/PlatformAdminPage';

// Landing Page Wrapper with standard Navbar and Footer
const LandingLayout: FC = () => {
  const navigate = useNavigate();

  const handleScrollToSearch = () => {
    navigate('/search');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <EmergencyBanner />
      <Navbar
        onNavigateToSearch={handleScrollToSearch}
        onNavigateToAdmin={() => navigate('/admin/login')}
        onNavigateToPatientLogin={() => navigate('/patient/login')}
      />
      <main className="flex-1">
        <LandingPage
          onNavigateToPatientLogin={() => navigate('/patient/login')}
          onNavigateToAdminLogin={() => navigate('/admin/login')}
        />
      </main>
      <Footer />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingLayout />} />

          {/* Dedicated Emergency Hospital Discovery & Map */}
          <Route path="/search" element={<PatientSearchPage />} />

          {/* Authentication Pages */}
          <Route path="/patient/login" element={<PatientAuthPage />} />
          <Route path="/patient/register" element={<PatientAuthPage />} />
          <Route path="/admin/login" element={<HospitalAdminAuthPage />} />
          <Route path="/admin/request-access" element={<HospitalAdminAuthPage />} />

          {/* Protected Hospital Administrator Dashboard */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN']}>
                <HospitalDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Platform Administrator Dashboard */}
          <Route
            path="/platform/dashboard"
            element={
              <ProtectedRoute allowedRoles={['PLATFORM_ADMIN']}>
                <PlatformAdminPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback to Home */}
          <Route path="*" element={<LandingLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
