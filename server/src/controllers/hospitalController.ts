import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { calculateHaversineDistance, estimateEmergencyTravelTime } from '../utils/spatial.js';
import { computeDataFreshness } from '../utils/freshness.js';
import { discoverNearbyHospitals, NormalizedHospital } from '../services/osmHospitalService.js';

const BED_LABELS: Record<string, string> = {
  EMERGENCY_ICU: 'Emergency ICU Beds',
  TRAUMA_RESUSCITATION: 'Trauma Resuscitation Bays',
  EMERGENCY_GENERAL: 'General Emergency Beds',
  OXYGEN_CRITICAL: 'High-Flow Oxygen Beds',
  PEDIATRIC_EMERGENCY: 'Pediatric Emergency Beds',
};

const STAFF_LABELS: Record<string, string> = {
  EMERGENCY_PHYSICIAN: 'Emergency Physicians',
  TRAUMA_SURGEON: 'Trauma Surgeons',
  ANESTHESIOLOGIST: 'Anesthesiologists',
  ICU_TRIAGE_NURSE: 'ICU Triage Nurses',
  DUTY_MEDICAL_OFFICER: 'Duty Medical Officers',
};

const AMBULANCE_LABELS: Record<string, string> = {
  ADVANCED_LIFE_SUPPORT_ALS: 'ALS Ambulance (Advanced Life Support)',
  BASIC_LIFE_SUPPORT_BLS: 'BLS Ambulance (Basic Life Support)',
  MOBILE_ICU: 'Mobile ICU Unit',
  NEONATAL_AMBULANCE: 'Neonatal Care Ambulance',
};

function formatHospitalPayload(hosp: any, lat?: number, lng?: number): NormalizedHospital {
  let distanceKm = 0;
  let estimatedTravelTimeMins = 0;

  if (lat !== undefined && lng !== undefined) {
    distanceKm = calculateHaversineDistance(lat, lng, hosp.latitude, hosp.longitude);
    estimatedTravelTimeMins = estimateEmergencyTravelTime(distanceKm);
  }

  const freshness = computeDataFreshness(hosp.lastResourceUpdate);

  let parsedServices: string[] = [];
  try {
    parsedServices = typeof hosp.emergencyServices === 'string'
      ? JSON.parse(hosp.emergencyServices)
      : hosp.emergencyServices;
  } catch {
    parsedServices = [hosp.emergencyServices];
  }

  // Format beds with friendly labels
  const formattedBeds = (hosp.beds || []).map((b: any) => ({
    ...b,
    categoryLabel: BED_LABELS[b.category] || b.category.replace(/_/g, ' '),
  }));

  // Format staff with friendly labels
  const formattedStaff = (hosp.staff || []).map((s: any) => ({
    ...s,
    label: STAFF_LABELS[s.staffCategory] || s.staffCategory.replace(/_/g, ' '),
  }));

  // Aggregate ambulances by type for UI consumption
  const ambulanceTypes = ['ADVANCED_LIFE_SUPPORT_ALS', 'BASIC_LIFE_SUPPORT_BLS', 'MOBILE_ICU', 'NEONATAL_AMBULANCE'];
  const formattedAmbulances = ambulanceTypes.map((type) => {
    const matching = (hosp.ambulances || []).filter((a: any) => a.ambulanceType === type);
    const availableReadyCount = matching.filter((a: any) => a.status === 'AVAILABLE_READY').length;
    const inTransitCount = matching.filter((a: any) => a.status === 'DISPATCHED_IN_TRANSIT').length;
    return {
      ambulanceType: type,
      label: AMBULANCE_LABELS[type] || type,
      totalCount: matching.length,
      availableReadyCount,
      inTransitCount,
    };
  }).filter((a) => a.totalCount > 0);

  return {
    id: hosp.id,
    name: hosp.name,
    slug: hosp.slug,
    address: hosp.address,
    area: hosp.area,
    city: hosp.city,
    state: hosp.state,
    pincode: hosp.pincode,
    latitude: hosp.latitude,
    longitude: hosp.longitude,
    emergencyContactPhone: hosp.emergencyContactPhone,
    secondaryContactPhone: hosp.secondaryContactPhone,
    officialEmail: hosp.officialEmail,
    websiteUrl: hosp.websiteUrl,
    emergencyServices: parsedServices,
    verificationStatus: hosp.verificationStatus,
    operatingStatus: hosp.operatingStatus,
    isDemoData: hosp.isDemoData,
    dataSource: hosp.isDemoData ? 'demo' : 'local_registry',
    capacityConnected: true,
    capacityNotes: 'Live triage capacity feed connected.',
    lastResourceUpdate: hosp.lastResourceUpdate instanceof Date ? hosp.lastResourceUpdate.toISOString() : hosp.lastResourceUpdate,
    distanceKm,
    estimatedTravelTimeMins,
    freshness,
    beds: formattedBeds,
    staff: formattedStaff,
    ambulances: formattedAmbulances,
  };
}

/**
 * Dedicated Real Hospital Discovery Endpoint
 * GET /api/v1/hospitals/nearby?lat=<lat>&lon=<lon>&radiusKm=5&limit=5&autoExpand=true
 */
export const getNearbyHospitals = async (req: Request, res: Response): Promise<void> => {
  try {
    const latStr = req.query.lat as string;
    const lngStr = (req.query.lon as string) || (req.query.lng as string);

    if (!latStr || !lngStr) {
      res.status(400).json({
        success: false,
        error: 'Missing required query parameters: lat and lon (or lng) must be provided.',
      });
      return;
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({
        success: false,
        error: 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180.',
      });
      return;
    }

    const radiusKm = parseFloat((req.query.radiusKm as string) || (req.query.radius as string)) || 5;
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 5, 25));
    const autoExpand = req.query.autoExpand !== 'false';

    const discoveryResult = await discoverNearbyHospitals(lat, lng, radiusKm, limit, autoExpand);

    res.json({
      success: true,
      metadata: discoveryResult.metadata,
      count: discoveryResult.hospitals.length,
      data: discoveryResult.hospitals,
    });
  } catch (error: any) {
    console.error('Nearby hospitals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve nearby emergency hospitals.',
      message: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
};

/**
 * Enhanced Search endpoint (maintains backwards compatibility for existing query structure)
 * GET /api/v1/hospitals/search?lat=<lat>&lng=<lng>&radius=10&service=ALL&sortBy=distance
 */
export const searchHospitals = async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string) || 12.9352;
    const lng = parseFloat((req.query.lng as string) || (req.query.lon as string)) || 77.6245;
    const radius = parseFloat((req.query.radius as string) || (req.query.radiusKm as string)) || 10;
    const serviceFilter = (req.query.service as string) || 'ALL';
    const sortBy = (req.query.sortBy as string) || 'distance';
    const limit = parseInt(req.query.limit as string) || 20;

    // Use discoverNearbyHospitals with autoExpand=false so requested radius is respected
    const discoveryResult = await discoverNearbyHospitals(lat, lng, radius, limit, false);
    let results = discoveryResult.hospitals;

    // Apply Service Filter
    if (serviceFilter !== 'ALL') {
      results = results.filter((hosp) => {
        if (serviceFilter === 'ICU') {
          const icu = hosp.beds.find((b: any) => b.category === 'EMERGENCY_ICU');
          return (icu?.availableBeds ?? 0) > 0;
        }
        if (serviceFilter === 'TRAUMA') {
          return hosp.emergencyServices.some((s: string) => s.toLowerCase().includes('trauma'));
        }
        if (serviceFilter === 'AMBULANCE') {
          const ready = hosp.ambulances.reduce((acc: number, a: any) => acc + (a.availableReadyCount ?? 0), 0);
          return ready > 0;
        }
        return true;
      });
    }

    // Apply Sort By
    results.sort((a, b) => {
      if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
      if (sortBy === 'beds') {
        const aBeds = a.beds.reduce((acc: number, x: any) => acc + (x.availableBeds || 0), 0);
        const bBeds = b.beds.reduce((acc: number, x: any) => acc + (x.availableBeds || 0), 0);
        return bBeds - aBeds;
      }
      if (sortBy === 'ambulances') {
        const aAmb = a.ambulances.reduce((acc: number, x: any) => acc + (x.availableReadyCount || 0), 0);
        const bAmb = b.ambulances.reduce((acc: number, x: any) => acc + (x.availableReadyCount || 0), 0);
        return bAmb - aAmb;
      }
      return 0;
    });

    res.json({
      success: true,
      metadata: discoveryResult.metadata,
      query: {
        latitude: lat,
        longitude: lng,
        searchRadiusKm: radius,
        serviceFilter,
        sortBy,
      },
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('Hospital search error:', error);
    res.status(500).json({ success: false, error: 'Failed to execute geographic hospital search query.' });
  }
};

/**
 * Hospital Profile Detail Endpoint
 * GET /api/v1/hospitals/:id
 */
export const getHospitalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    // If ID is from Prisma SQLite database
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: {
        beds: true,
        staff: true,
        ambulances: true,
      },
    });

    if (hospital) {
      const formatted = formatHospitalPayload(hospital);
      res.json({
        success: true,
        data: formatted,
      });
      return;
    }

    // If ID is an OpenStreetMap ID or synthetic registry ID
    // Look up via discovery service
    res.status(404).json({ success: false, error: 'Hospital not found in local registry.' });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve hospital details.' });
  }
};
