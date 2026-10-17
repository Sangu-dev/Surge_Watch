import React, { createContext, useContext, useState, useEffect } from 'react';

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
  loginAdmin: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  submitHospitalAccessRequest: (data: Omit<HospitalAccessApplication, 'id' | 'status' | 'submittedAt'>) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  // Demo helper accounts for easy testing
  loginDemoUser: (role: UserRole, hospitalId?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'surgewatch_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on initial load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to restore auth session:', e);
    } finally {
      setIsLoading(false);
    }
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
    // Stage 2 client validation & demo authentication
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

  const loginAdmin = async (email: string, _pass: string) => {
    const cleanEmail = email.toLowerCase().trim();

    // Platform Super Admin
    if (cleanEmail === 'superadmin@surgewatch.in' || cleanEmail.includes('superadmin')) {
      const adminUser: AuthUser = {
        id: 'plat-admin-1',
        email: cleanEmail,
        fullName: 'SurgeWatch Platform Operations Lead',
        role: 'PLATFORM_ADMIN',
        token: 'jwt-platform-admin-token-' + Date.now(),
      };
      saveUserSession(adminUser);
      return { success: true };
    }

    // Victoria Hospital Admin
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
      return { success: true };
    }

    // Default to Manipal Hospital Admin
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
    return { success: true };
  };

  const submitHospitalAccessRequest = async (
    data: Omit<HospitalAccessApplication, 'id' | 'status' | 'submittedAt'>
  ) => {
    const newApp: HospitalAccessApplication = {
      ...data,
      id: 'req-' + Date.now(),
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    // Store in localStorage for platform admin review demo
    const existing = JSON.parse(localStorage.getItem('surgewatch_pending_requests') || '[]');
    existing.push(newApp);
    localStorage.setItem('surgewatch_pending_requests', JSON.stringify(existing));

    return { success: true };
  };

  const loginDemoUser = (role: UserRole, hospitalId?: string) => {
    if (role === 'PLATFORM_ADMIN') {
      saveUserSession({
        id: 'plat-admin-1',
        email: 'superadmin@surgewatch.in',
        fullName: 'SurgeWatch Platform Auditor',
        role: 'PLATFORM_ADMIN',
        token: 'demo-platform-token',
      });
    } else if (role === 'HOSPITAL_ADMIN') {
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
    } else {
      saveUserSession({
        id: 'patient-demo-1',
        email: 'patient@bengaluru.in',
        fullName: 'Arun Varma (Patient)',
        role: 'PATIENT',
        phone: '+91 98450 12345',
        token: 'demo-patient-token',
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
