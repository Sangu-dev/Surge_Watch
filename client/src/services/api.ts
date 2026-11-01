// API client connecting frontend to backend server on port 5000 with resilient mock fallback

export const API_BASE = 'http://localhost:5000/api/v1';

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

export async function loginAdminApi(email: string, password?: string, isDemo?: boolean) {
  const res = await fetch(`${API_BASE}/auth/login-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, isDemo }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to authenticate administrator account.');
  }
  return data;
}

export async function fetchNearbyHospitals(
  lat: number,
  lng: number,
  radius: number = 5,
  service: string = 'ALL',
  sortBy: string = 'distance'
) {
  try {
    // 1. Try dedicated nearby hospital discovery endpoint (OpenStreetMap + Live Registry)
    const nearbyUrl = `${API_BASE}/hospitals/nearby?lat=${lat}&lon=${lng}&radiusKm=${radius}`;
    const res = await fetch(nearbyUrl);
    if (res.ok) {
      const json = await res.json();
      return {
        hospitals: json.data,
        metadata: json.metadata,
      };
    }

    // 2. Fallback to /search endpoint
    const searchUrl = `${API_BASE}/hospitals/search?lat=${lat}&lng=${lng}&radius=${radius}&service=${service}&sortBy=${sortBy}`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchJson = await searchRes.json();
      return {
        hospitals: searchJson.data,
        metadata: searchJson.metadata,
      };
    }

    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
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
  }
) {
  const res = await fetch(`${API_BASE}/admin/ambulances/${ambulanceId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
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
