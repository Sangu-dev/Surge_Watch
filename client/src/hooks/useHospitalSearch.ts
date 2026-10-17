import { useState, useEffect, useCallback } from 'react';
import type { Hospital, DiscoveryMetadata } from '../types';
import { fetchNearbyHospitals } from '../services/api';
import { MOCK_HOSPITALS } from '../data/mockHospitals';
import { calculateHaversineDistance, estimateEmergencyTravelTime } from '../utils/distance';
import { getSocket } from '../services/socket';

interface UseHospitalSearchOptions {
  lat: number;
  lng: number;
  radius: number;
  limit?: number;
  service?: string;
  sortBy?: 'distance' | 'beds' | 'ambulances';
}

export function useHospitalSearch({
  lat,
  lng,
  radius,
  limit = 5,
  service = 'ALL',
  sortBy = 'distance',
}: UseHospitalSearchOptions) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [metadata, setMetadata] = useState<DiscoveryMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [realtimeNotification, setRealtimeNotification] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Attempt to fetch from real backend discovery service
      const remote = await fetchNearbyHospitals(lat, lng, radius, limit, service, sortBy);

      if (remote) {
        setIsBackendConnected(true);
        if (remote.hospitals && Array.isArray(remote.hospitals)) {
          setHospitals(remote.hospitals);
          setMetadata(remote.metadata || null);
          setLoading(false);
          return;
        } else if (Array.isArray(remote)) {
          setHospitals(remote.slice(0, limit));
          setLoading(false);
          return;
        }
      }
    } catch {
      // Network failure, fallback cleanly to local computation
    }

    // 2. Resilient local fallback using exact geodesic math
    setIsBackendConnected(false);
    const localFiltered = MOCK_HOSPITALS.map((hosp) => {
      const distance = calculateHaversineDistance(lat, lng, hosp.latitude, hosp.longitude);
      const travelTime = estimateEmergencyTravelTime(distance);
      return {
        ...hosp,
        distanceKm: distance,
        estimatedTravelTimeMins: travelTime,
        dataSource: 'local_registry' as const,
        capacityConnected: true,
      };
    })
      .filter((hosp) => hosp.distanceKm <= radius)
      .filter((hosp) => {
        if (service === 'ALL') return true;
        if (service === 'ICU') {
          const icu = hosp.beds.find((b) => b.category === 'EMERGENCY_ICU');
          return (icu?.availableBeds ?? 0) > 0;
        }
        if (service === 'TRAUMA') {
          return hosp.emergencyServices.some((s) => s.toLowerCase().includes('trauma'));
        }
        if (service === 'AMBULANCE') {
          const ready = hosp.ambulances.reduce((acc, a) => acc + a.availableReadyCount, 0);
          return ready > 0;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') return (a.distanceKm || 0) - (b.distanceKm || 0);
        if (sortBy === 'beds') {
          const aBeds = a.beds.reduce((acc, x) => acc + x.availableBeds, 0);
          const bBeds = b.beds.reduce((acc, x) => acc + x.availableBeds, 0);
          return bBeds - aBeds;
        }
        if (sortBy === 'ambulances') {
          const aAmb = a.ambulances.reduce((acc, x) => acc + x.availableReadyCount, 0);
          const bAmb = b.ambulances.reduce((acc, x) => acc + x.availableReadyCount, 0);
          return bAmb - aAmb;
        }
        return 0;
      })
      .slice(0, limit);

    setHospitals(localFiltered);
    setMetadata({
      requestedCoordinates: { lat, lng },
      requestedRadiusKm: radius,
      effectiveRadiusKm: radius,
      wasExpanded: false,
      expansionMessage: `Showing nearest hospitals within ${radius} km (Offline Geodesic Mode).`,
      totalCandidatesFound: localFiltered.length,
      returnedCount: localFiltered.length,
      dataSource: 'Local Emergency Registry (Offline Cache)',
      cached: false,
      timestamp: new Date().toISOString(),
    });
    setLoading(false);
  }, [lat, lng, radius, limit, service, sortBy]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Connect to Socket.IO real-time availability broadcasts
  useEffect(() => {
    const socket = getSocket();

    const handleHospitalUpdate = (event: { hospitalId: string; updatedAt: string; updatedBy?: string }) => {
      console.log('[Real-Time] Hospital availability broadcast received:', event);
      setRealtimeNotification(`Live capacity update received at ${new Date(event.updatedAt).toLocaleTimeString()}`);
      fetchResults();

      const timer = setTimeout(() => {
        setRealtimeNotification(null);
      }, 5000);

      return () => clearTimeout(timer);
    };

    socket.on('hospital_resource_updated', handleHospitalUpdate);

    return () => {
      socket.off('hospital_resource_updated', handleHospitalUpdate);
    };
  }, [fetchResults]);

  return {
    hospitals,
    metadata,
    loading,
    error,
    isBackendConnected,
    realtimeNotification,
    refetch: fetchResults,
  };
}
