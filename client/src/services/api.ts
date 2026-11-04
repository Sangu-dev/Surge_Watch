// API client connecting frontend to backend server with resilient mock fallback

const rawApiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').trim().replace(/\/+$/, '');
export const API_BASE = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

export async function submitHospitalRegistration(payload: {
  hospitalName: string;
  hospitalAddress: string;
  area: string;
  officialEmail: string;
  emergencyPhone: string;
  regNumber: string;
  applicantName: string;
  applicantDesignation: string;
}) {
  const res = await fetch(`${API_BASE}/auth/request-hospital-access`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit hospital registration dossier.');
  }
  return data;
}

export async function loginAdminApi(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login-admin`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to authenticate administrator account.');
  }
  return data;
}

export async function loginPatientApi(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login-patient`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to authenticate patient account.');
  }
  return data;
}

export async function registerPatientApi(payload: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const res = await fetch(`${API_BASE}/auth/register-patient`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fullName: payload.fullName.trim(),
      email: payload.email.toLowerCase().trim(),
      password: payload.password,
      phone: payload.phone?.trim() || undefined,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to register patient account.');
  }
  return data;
}

export async function validateSessionApi(token: string) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Session validation failed.');
  }
  return data;
}

export async function refreshTokenApi() {
  const res = await fetch(`${API_BASE}/auth/refresh-token`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({}),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Session refresh failed.');
  }
  return data;
}

export async function logoutApi() {
  try {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({}),
    });
    return await res.json();
  } catch (err) {
    console.warn('[API Client] Logout server request failed:', err);
    return { success: true };
  }
}

export async function forgotPasswordApi(email: string) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.toLowerCase().trim() }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to initiate password reset.');
  }
  return data;
}

export async function resetPasswordApi(token: string, newPassword: string) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: token.trim(), newPassword }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to reset password.');
  }
  return data;
}

export async function activateHospitalAdminApi(token: string, newPassword: string) {
  const res = await fetch(`${API_BASE}/auth/activate-hospital-admin`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: token.trim(), newPassword }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to activate hospital administrator account.');
  }
  return data;
}

export async function inviteHospitalAdminApi(
  hospitalId: string,
  payload: {
    email: string;
    fullName?: string;
    phone?: string;
    confirmRoleUpgrade?: boolean;
  },
  token: string
) {
  const res = await fetch(`${API_BASE}/platform/hospitals/${hospitalId}/invite-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to provision hospital administrator.');
  }
  return data;
}

export async function toggleUserStatusApi(userId: string, isActive: boolean, token: string) {
  const res = await fetch(`${API_BASE}/platform/users/${userId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isActive }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update user account status.');
  }
  return data;
}

export async function fetchNearbyHospitals(
  lat: number,
  lng: number,
  radius: number = 5,
  service: string = 'ALL',
  sortBy: string = 'distance',
  signal?: AbortSignal
) {
  try {
    // 1. Try dedicated nearby hospital discovery endpoint (OpenStreetMap + Live Registry)
    const nearbyUrl = `${API_BASE}/hospitals/nearby?lat=${lat}&lon=${lng}&radius_km=${radius}&radiusKm=${radius}&radius=${radius}`;
    const res = await fetch(nearbyUrl, { signal });
    if (res.ok) {
      const json = await res.json();
      return {
        hospitals: json.data,
        metadata: json.metadata,
      };
    }

    // 2. Fallback to /search endpoint
    const searchUrl = `${API_BASE}/hospitals/search?lat=${lat}&lng=${lng}&radius_km=${radius}&radius=${radius}&service=${service}&sortBy=${sortBy}`;
    const searchRes = await fetch(searchUrl, { signal });
    if (searchRes.ok) {
      const searchJson = await searchRes.json();
      return {
        hospitals: searchJson.data,
        metadata: searchJson.metadata,
      };
    }

    throw new Error(`HTTP ${res.status}`);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }
    console.warn('[API Client] Backend unreachable, using client offline calculation:', err);
    return null;
  }
}

export async function fetchApprovedLocations(): Promise<{
  hospitals: any[];
  areas: Array<{ name: string; area: string; latitude: number; longitude: number }>;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/hospitals/approved-locations`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return {
      hospitals: json.data || [],
      areas: json.areas || [],
    };
  } catch (err) {
    console.warn('[API Client] Failed to fetch approved locations:', err);
    return null;
  }
}

export async function reverseGeocodeLocation(lat: number, lng: number) {
  try {
    const res = await fetch(`${API_BASE}/location/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.warn('[API Client] Reverse geocoding failed, using local display:', err);
    return null;
  }
}

export async function geocodeLocationQuery(query: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/location/geocode?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success && data.data && typeof data.data.latitude === 'number' && typeof data.data.longitude === 'number') {
      return { latitude: data.data.latitude, longitude: data.data.longitude };
    }
    return null;
  } catch (err) {
    console.warn('[API Client] Forward geocoding failed, using local landmark fallback:', err);
    return null;
  }
}

export async function fetchIpLocation() {
  try {
    const res = await fetch(`${API_BASE}/location/ip-lookup`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.warn('[API Client] IP location lookup failed:', err);
    return null;
  }
}

export async function fetchHospitalDetails(id: string) {
  try {
    const res = await fetch(`${API_BASE}/hospitals/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.warn('[API Client] Failed to fetch hospital details:', err);
    return null;
  }
}

export async function publishHospitalResources(
  hospitalId: string,
  token: string,
  payload: {
    beds?: any[];
    staff?: any[];
    ambulances?: any[];
    changeSummary?: string;
  }
) {
  const res = await fetch(`${API_BASE}/admin/hospitals/${hospitalId}/resources`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update hospital resources.');
  }
  return data;
}

export async function fetchHospitalAuditLogs(hospitalId: string, token: string) {
  try {
    const res = await fetch(`${API_BASE}/admin/hospitals/${hospitalId}/audits`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.warn('[API Client] Failed to fetch audit logs from backend:', err);
    return null;
  }
}

export async function fetchPlatformRequests(token: string) {
  try {
    const res = await fetch(`${API_BASE}/platform/requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.warn('[API Client] Failed to fetch platform requests:', err);
    return null;
  }
}

export async function approvePlatformRequest(id: string, token: string, notes?: string) {
  const res = await fetch(`${API_BASE}/platform/requests/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ notes }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to approve request');
  return data;
}

export async function rejectPlatformRequest(id: string, token: string, reason?: string) {
  const res = await fetch(`${API_BASE}/platform/requests/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reject request');
  return data;
}

export async function fetchPlatformFreshness(token: string) {
  try {
    const res = await fetch(`${API_BASE}/platform/freshness`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[API Client] Failed to fetch freshness overview:', err);
    return null;
  }
}

export async function fetchAmbulances() {
  try {
    const res = await fetch(`${API_BASE}/ambulances`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[API Client] Failed to fetch ambulances:', err);
    return null;
  }
}

export async function fetchHospitalAmbulances(hospitalId: string) {
  try {
    const res = await fetch(`${API_BASE}/hospitals/${hospitalId}/ambulances`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[API Client] Failed to fetch hospital ambulances:', err);
    return null;
  }
}

export async function updateAmbulanceStatus(
  ambulanceId: string,
  payload: {
    status?: string;
    currentLocation?: string;
    dispatchNotes?: string;
  },
  token?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/admin/ambulances/${ambulanceId}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update ambulance status');
  return data;
}

export async function dispatchEmergencyAmbulance(payload: {
  hospitalId?: string;
  patientName?: string;
  contactPhone?: string;
  emergencyType: string;
  severity: string;
  latitude: number;
  longitude: number;
  pickupAddress?: string;
  dispatchNotes?: string;
}) {
  const res = await fetch(`${API_BASE}/emergency/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to dispatch emergency ambulance');
  return data;
}

export async function releaseEmergencyAmbulance(emergencyId: string) {
  const res = await fetch(`${API_BASE}/emergency/${emergencyId}/release`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to release emergency ambulance');
  return data;
}

export async function fetchEmergencyRequests() {
  try {
    const res = await fetch(`${API_BASE}/emergency/requests`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.warn('[API Client] Failed to fetch emergency requests:', err);
    return [];
  }
}
