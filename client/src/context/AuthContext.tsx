import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  submitHospitalRegistration,
  loginAdminApi,
  loginPatientApi,
  registerPatientApi,
  refreshTokenApi,
  logoutApi,
  forgotPasswordApi,
  resetPasswordApi,
  activateHospitalAdminApi,
} from '../services/api';

export type UserRole = 'PATIENT' | 'HOSPITAL_ADMIN' | 'PLATFORM_ADMIN' | 'MASTER_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  hospitalId?: string;
  hospitalName?: string;
  token?: string; // In-memory short-lived access token
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
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string; message?: string; resetToken?: string }>;
  resetPassword: (token: string, newPass: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  activateHospitalAdmin: (token: string, newPass: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore authenticated session on mount via HttpOnly cookie handshake
  // Access tokens remain strictly in-memory; refresh tokens are never stored in localStorage
  useEffect(() => {
    const restoreSession = async () => {
      // Purge any legacy tokens from localStorage to eliminate insecure persistence
      localStorage.removeItem('surgewatch_access_token');
      localStorage.removeItem('surgewatch_refresh_token');
      localStorage.removeItem('surgewatch_auth_session');
      localStorage.removeItem('surgewatch_user');

      try {
        // Attempt silent session restoration via HttpOnly cookie
        const res = await refreshTokenApi();
        if (res?.success && res.token && res.user) {
          setUser({
            ...res.user,
            token: res.token,
          });
        } else {
          setUser(null);
        }
      } catch {
        // Expected on fresh visit or when no active refresh session exists
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const loginPatient = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please provide a valid email address.' };
    }
    if (!pass) {
      return { success: false, error: 'Password is required.' };
    }

    try {
      const res = await loginPatientApi(email, pass);
      if (res?.success && res.token && res.user) {
        setUser({
          ...res.user,
          token: res.token,
        });
        return { success: true };
      }
      return { success: false, error: 'Invalid response from authentication server.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to authenticate patient account.' };
    }
  };

  const registerPatient = async (
    name: string,
    email: string,
    pass: string,
    phone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!name.trim()) return { success: false, error: 'Full name is required.' };
    if (!email || !email.includes('@')) return { success: false, error: 'Valid email is required.' };
    if (!pass || pass.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };

    try {
      const res = await registerPatientApi({
        fullName: name,
        email,
        password: pass,
        phone,
      });

      if (res?.success && res.token && res.user) {
        setUser({
          ...res.user,
          token: res.token,
        });
        return { success: true };
      }
      return { success: false, error: 'Registration completed but session initialization failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create patient account.' };
    }
  };

  const loginAdmin = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid administrator email.' };
    }
    if (!pass) {
      return { success: false, error: 'Password is required.' };
    }

    try {
      const res = await loginAdminApi(email, pass);
      if (res?.success && res.token && res.user) {
        const fullUser: AuthUser = {
          ...res.user,
          token: res.token,
        };
        setUser(fullUser);
        return { success: true, user: fullUser };
      }
      return { success: false, error: 'Authentication failed: Invalid credentials.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication failed: Invalid credentials.' };
    }
  };

  const submitHospitalAccessRequest = async (
    data: Omit<HospitalAccessApplication, 'id' | 'status' | 'submittedAt'>
  ): Promise<{ success: boolean; error?: string; message?: string; applicationId?: string }> => {
    try {
      const res = await submitHospitalRegistration(data);
      const newApp: HospitalAccessApplication = {
        ...data,
        id: res.applicationId || 'req-' + Date.now(),
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
      };

      const existing = JSON.parse(localStorage.getItem('surgewatch_pending_requests') || '[]');
      existing.unshift(newApp);
      localStorage.setItem('surgewatch_pending_requests', JSON.stringify(existing));

      return {
        success: true,
        message: res.message || 'Hospital registration request successfully submitted.',
        applicationId: res.applicationId,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to submit hospital registration dossier.',
      };
    }
  };

  const forgotPassword = async (
    email: string
  ): Promise<{ success: boolean; error?: string; message?: string; resetToken?: string }> => {
    try {
      const res = await forgotPasswordApi(email);
      return {
        success: true,
        message: res.message,
        resetToken: res.resetToken,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to initiate password reset.',
      };
    }
  };

  const resetPassword = async (
    token: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!token.trim()) return { success: false, error: 'Reset token is required.' };
    if (!newPass || newPass.length < 8) return { success: false, error: 'New password must be at least 8 characters.' };

    try {
      const res = await resetPasswordApi(token, newPass);
      return {
        success: true,
        message: res.message || 'Password successfully reset.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to reset password.',
      };
    }
  };

  const activateHospitalAdmin = async (
    token: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!token.trim()) return { success: false, error: 'Activation token is required.' };
    if (!newPass || newPass.length < 8) return { success: false, error: 'New password must be at least 8 characters.' };

    try {
      const res = await activateHospitalAdminApi(token, newPass);
      return {
        success: true,
        message: res.message || 'Hospital administrator account successfully activated.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to activate hospital administrator account.',
      };
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore network errors on logout
    }
    setUser(null);
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
        forgotPassword,
        resetPassword,
        activateHospitalAdmin,
        logout,
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
