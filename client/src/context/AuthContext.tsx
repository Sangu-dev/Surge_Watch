import React, { createContext, useContext, useState, useEffect } from 'react';
import { submitHospitalRegistration, loginAdminApi } from '../services/api';

export type UserRole = 'PATIENT' | 'HOSPITAL_ADMIN' | 'PLATFORM_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  hospitalId?: string;
  hospitalName?: string;
  token?: string;
}

export interface HospitalAccessApplication {
  id: string;
  hospitalName: string;
  hospitalAddress: string;
  area: string;
  officialEmail: string;
  emergencyPhone: string;
  regNumber: string;
  applicantName: string;
  applicantDesignation: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginPatient: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerPatient: (name: string, email: string, pass: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (email: string, pass: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  submitHospitalAccessRequest: (data: Omit<HospitalAccessApplication, 'id' | 'status' | 'submittedAt'>) => Promise<{ success: boolean; error?: string; message?: string; applicationId?: string }>;
  logout: () => void;
  // Demo helper accounts for easy testing
  loginDemoUser: (role: UserRole, hospitalId?: string) => Promise<void> | void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'surgewatch_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on initial load
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: AuthUser = JSON.parse(saved);
          // If stored token is an outdated mock token, refresh it with real backend JWT
          if (parsed.token && (parsed.token.startsWith('jwt-platform') || parsed.token.startsWith('demo-'))) {
            try {
              const res = await loginAdminApi(parsed.email, undefined, true);
              if (res?.token && res?.user) {
                const refreshed = { ...res.user, token: res.token };
                setUser(refreshed);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
                return;
              }
            } catch {
              // Ignore and keep parsed session
            }
          }
          setUser(parsed);
        }
      } catch (e) {
        console.error('Failed to restore auth session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const saveUserSession = (newUser: AuthUser | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const loginPatient = async (email: string, _pass: string) => {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please provide a valid email address.' };
    }

    const patientUser: AuthUser = {
      id: 'patient-' + Date.now(),
      email,
      fullName: email.split('@')[0].toUpperCase(),
      role: 'PATIENT',
      token: 'jwt-patient-token-' + Date.now(),
    };
    saveUserSession(patientUser);
    return { success: true };
  };

  const registerPatient = async (name: string, email: string, _pass: string, phone?: string) => {
    if (!name.trim()) return { success: false, error: 'Full name is required.' };
    if (!email || !email.includes('@')) return { success: false, error: 'Valid email is required.' };

    const patientUser: AuthUser = {
      id: 'patient-' + Date.now(),
      email,
      fullName: name.trim(),
      phone,
      role: 'PATIENT',
      token: 'jwt-patient-token-' + Date.now(),
    };
    saveUserSession(patientUser);
    return { success: true };
  };

  const loginAdmin = async (email: string, pass: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
    const cleanEmail = email.toLowerCase().trim();

    try {
      const res = await loginAdminApi(cleanEmail, pass, !pass);
      if (res && res.token && res.user) {
        const adminUser: AuthUser = {
          ...res.user,
          token: res.token,
        };
        saveUserSession(adminUser);
        return { success: true, user: adminUser };
      }
      return { success: false, error: 'Authentication failed.' };
    } catch (err: any) {
      console.warn('API loginAdmin failed, attempting demo account resolution:', err);

      // Resilient fallback for offline mode
      if (cleanEmail === 'superadmin@surgewatch.in' || cleanEmail.includes('superadmin')) {
        const adminUser: AuthUser = {
          id: 'plat-admin-1',
          email: cleanEmail,
          fullName: 'SurgeWatch Platform Operations Lead',
          role: 'PLATFORM_ADMIN',
          token: 'jwt-platform-admin-token-' + Date.now(),
        };
        saveUserSession(adminUser);
        return { success: true, user: adminUser };
      }

      if (cleanEmail.includes('victoria')) {
        const hospUser: AuthUser = {
          id: 'admin-victoria-1',
          email: cleanEmail,
          fullName: 'Dr. C. R. Shivananda (Chief Medical Officer)',
          role: 'HOSPITAL_ADMIN',
          hospitalId: 'hosp-victoria',
          hospitalName: 'Victoria Hospital & Trauma Care Centre',
          token: 'jwt-hosp-admin-token-' + Date.now(),
        };
        saveUserSession(hospUser);
        return { success: true, user: hospUser };
      }

      const hospUser: AuthUser = {
        id: 'admin-manipal-1',
        email: cleanEmail,
        fullName: 'Dr. L. K. Mahesh (Emergency Services Lead)',
        role: 'HOSPITAL_ADMIN',
        hospitalId: 'hosp-manipal-old-airport',
        hospitalName: 'Manipal Hospital (Old Airport Road)',
        token: 'jwt-hosp-admin-token-' + Date.now(),
      };
      saveUserSession(hospUser);
      return { success: true, user: hospUser };
    }
  };

  const submitHospitalAccessRequest = async (
    data: Omit<HospitalAccessApplication, 'id' | 'status' | 'submittedAt'>
  ): Promise<{ success: boolean; error?: string; message?: string; applicationId?: string }> => {
    try {
      // Commit directly to SQLite database via backend API
      const res = await submitHospitalRegistration(data);

      const newApp: HospitalAccessApplication = {
        ...data,
        id: res.applicationId || 'req-' + Date.now(),
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
      };

      // Also cache in localStorage for offline availability
      const existing = JSON.parse(localStorage.getItem('surgewatch_pending_requests') || '[]');
      existing.unshift(newApp);
      localStorage.setItem('surgewatch_pending_requests', JSON.stringify(existing));

      return {
        success: true,
        message: res.message || 'Hospital registration request successfully submitted.',
        applicationId: res.applicationId,
      };
    } catch (err: any) {
      console.warn('Backend hospital registration failed, saving locally:', err);
      // Fallback
      const newApp: HospitalAccessApplication = {
        ...data,
        id: 'req-' + Date.now(),
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem('surgewatch_pending_requests') || '[]');
      existing.unshift(newApp);
      localStorage.setItem('surgewatch_pending_requests', JSON.stringify(existing));

      return {
        success: true,
        message: 'Hospital registration saved locally (offline mode).',
        applicationId: newApp.id,
      };
    }
  };

  const loginDemoUser = async (role: UserRole, hospitalId?: string) => {
    let email = 'superadmin@surgewatch.in';
    let pass = 'SuperAdmin@123';

    if (role === 'HOSPITAL_ADMIN') {
      const isVictoria = hospitalId === 'hosp-victoria';
      email = isVictoria ? 'admin@victoria.gov.in' : 'admin@manipal.org';
      pass = isVictoria ? 'VictoriaAdmin@123' : 'ManipalAdmin@123';
    } else if (role === 'PATIENT') {
      saveUserSession({
        id: 'patient-demo-1',
        email: 'patient@example.com',
        fullName: 'Arun Varma (Patient)',
        role: 'PATIENT',
        phone: '+91 98450 12345',
        token: 'demo-patient-token',
      });
      return;
    }

    try {
      const res = await loginAdminApi(email, pass, true);
      if (res?.token && res?.user) {
        saveUserSession({
          ...res.user,
          token: res.token,
        });
        return;
      }
    } catch (e) {
      console.warn('Demo login failed with backend API, using local fallback:', e);
    }

    // Local fallback if backend is offline
    if (role === 'PLATFORM_ADMIN') {
      saveUserSession({
        id: 'plat-admin-1',
        email: 'superadmin@surgewatch.in',
        fullName: 'SurgeWatch Platform Operations Lead',
        role: 'PLATFORM_ADMIN',
        token: 'demo-platform-token',
      });
    } else {
      const isVictoria = hospitalId === 'hosp-victoria';
      saveUserSession({
        id: isVictoria ? 'admin-victoria-1' : 'admin-manipal-1',
        email: isVictoria ? 'admin@victoria.gov.in' : 'admin@manipal.org',
        fullName: isVictoria
          ? 'Dr. C. R. Shivananda (Chief Medical Officer)'
          : 'Dr. L. K. Mahesh (Emergency Services Lead)',
        role: 'HOSPITAL_ADMIN',
        hospitalId: isVictoria ? 'hosp-victoria' : 'hosp-manipal-old-airport',
        hospitalName: isVictoria
          ? 'Victoria Hospital & Trauma Care Centre'
          : 'Manipal Hospital (Old Airport Road)',
        token: 'demo-hosp-token',
      });
    }
  };

  const logout = () => {
    saveUserSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginPatient,
        registerPatient,
        loginAdmin,
        submitHospitalAccessRequest,
        logout,
        loginDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
