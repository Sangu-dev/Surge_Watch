import { useState, useEffect, useRef, useCallback } from 'react';
import type { LocationState } from '../types';
import { reverseGeocodeLocation, fetchIpLocation } from '../services/api';
import { getSocket } from '../services/socket';

const SESSION_CACHE_KEY = 'surgewatch_last_location';

const DEFAULT_BENGALURU_LOCATION: LocationState = {
  lat: 12.9352,
  lng: 77.6245,
  label: 'Koramangala Sony World Junction, Bengaluru',
  locality: 'Koramangala',
  source: 'MANUAL_SELECTION',
  accuracyMeters: 50,
};

export function useDeviceLocation() {
  // Initialize with cached session location if available, otherwise default
  const [location, setLocation] = useState<LocationState>(() => {
    try {
      const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          source: 'CACHED_LOCATION',
        };
      }
    } catch {
      // Ignore sessionStorage errors
    }
    return DEFAULT_BENGALURU_LOCATION;
  });

  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isTrackingLive, setIsTrackingLive] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);
  const lastDispatchedRef = useRef<{ lat: number; lng: number; time: number }>({
    lat: location.lat,
    lng: location.lng,
    time: 0,
  });

  // Acquire one-shot device GPS location
  const acquireGpsLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Reverse geocode to get real road / neighborhood in Bengaluru
        let addressLabel = `Accident Coordinates [${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E]`;
        let resolvedLocality = 'Bengaluru';

        try {
          const geo = await reverseGeocodeLocation(latitude, longitude);
          if (geo && geo.locality) {
            addressLabel = `${geo.locality} (GPS Accurate)`;
            resolvedLocality = geo.locality;
          }
        } catch {
          // Use coordinate label if reverse geocode is offline
        }

        const newLoc: LocationState = {
          lat: latitude,
          lng: longitude,
          label: addressLabel,
          locality: resolvedLocality,
          source: 'GPS_ACCURATE',
          accuracyMeters: Math.round(accuracy),
          timestamp: Date.now(),
        };

        setLocation(newLoc);
        setGpsLoading(false);
        setGpsError(null);

        try {
          sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(newLoc));
        } catch {
          // Ignore
        }
      },
      (error) => {
        setGpsLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('GPS permission was denied by browser. You can select an accident junction below or use IP fallback.');
        } else if (error.code === error.TIMEOUT) {
          setGpsError('GPS location request timed out. Please retry or choose your accident location manually.');
        } else {
          setGpsError('Unable to detect current GPS satellite position. Please select a Bengaluru landmark.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  // Continuous Live GPS tracking for active emergency
  const startLiveTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setIsTrackingLive(true);
    setGpsError(null);

    const socket = getSocket();
    socket.emit('emergency_track_start', {
      startedAt: new Date().toISOString(),
      initialCoordinates: { lat: location.lat, lng: location.lng },
    });

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const now = Date.now();

        // Throttle updates: only dispatch if > 10m or > 3.5s elapsed
        const timeDiff = now - lastDispatchedRef.current.time;
        const latDiff = Math.abs(latitude - lastDispatchedRef.current.lat);
        const lngDiff = Math.abs(longitude - lastDispatchedRef.current.lng);

        if (timeDiff > 3500 || latDiff > 0.0001 || lngDiff > 0.0001) {
          lastDispatchedRef.current = { lat: latitude, lng: longitude, time: now };

          setLocation((prev) => ({
            ...prev,
            lat: latitude,
            lng: longitude,
            source: 'GPS_ACCURATE',
            accuracyMeters: Math.round(accuracy),
            timestamp: now,
            label: `Live GPS Tracking [${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E]`,
          }));

          // Stream position to server / dispatchers via Socket.IO
          socket.emit('emergency_location_update', {
            lat: latitude,
            lng: longitude,
            accuracyMeters: Math.round(accuracy),
            timestamp: now,
          });
        }
      },
      (error) => {
        console.warn('[Live Tracking] Watch error:', error);
        setGpsError('Live tracking encountered a GPS reading error.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 12000,
      }
    );

    watchIdRef.current = watchId;
  }, [location.lat, location.lng]);

  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingLive(false);

    const socket = getSocket();
    socket.emit('emergency_track_stop');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Approximate IP-based Fallback
  const fallbackToIp = useCallback(async () => {
    setGpsLoading(true);
    setGpsError(null);

    const ipData = await fetchIpLocation();
    setGpsLoading(false);

    if (ipData) {
      setLocation({
        lat: ipData.lat,
        lng: ipData.lng,
        label: ipData.label,
        locality: 'Bengaluru Central',
        source: 'IP_APPROXIMATE',
        accuracyMeters: ipData.accuracyMeters || 5000,
        timestamp: Date.now(),
      });
      setGpsError('Approximate IP location applied (not GPS accurate). For exact response, pick on the map.');
    } else {
      setGpsError('Unable to resolve IP location. Please choose a landmark below.');
    }
  }, []);

  // Set Manual Location (landmark, map click, or search query)
  const selectManualLocation = useCallback(async (lat: number, lng: number, labelName?: string) => {
    stopLiveTracking();
    setGpsError(null);

    let finalLabel = labelName;
    let locality = labelName;

    if (!finalLabel) {
      finalLabel = `Accident Point [${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E]`;
      // Try to reverse geocode in background
      try {
        const geo = await reverseGeocodeLocation(lat, lng);
        if (geo && geo.locality) {
          finalLabel = `${geo.locality} (Selected Accident Point)`;
          locality = geo.locality;
        }
      } catch {
        // Keep coordinate label
      }
    }

    const newLoc: LocationState = {
      lat,
      lng,
      label: finalLabel,
      locality,
      source: 'MANUAL_SELECTION',
      accuracyMeters: 10,
      timestamp: Date.now(),
    };

    setLocation(newLoc);

    try {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(newLoc));
    } catch {
      // Ignore
    }
  }, [stopLiveTracking]);

  return {
    location,
    gpsLoading,
    gpsError,
    isTrackingLive,
    acquireGpsLocation,
    startLiveTracking,
    stopLiveTracking,
    fallbackToIp,
    selectManualLocation,
    refreshLocation: acquireGpsLocation,
  };
}
