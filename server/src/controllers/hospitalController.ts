import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { discoverNearbyHospitals, generateOsmDemoResources } from '../services/osmHospitalService.js';
import { formatHospitalPayload } from '../utils/formatHospital.js';

export { formatHospitalPayload } from '../utils/formatHospital.js';

/**
 * Dedicated Real Hospital Discovery Endpoint
 * GET /api/hospitals/nearby?lat=<lat>&lon=<lon>&radiusKm=5 (supports 5, 10, 15 km)
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

    const radiusParam = req.query.radiusKm || req.query.radius;
    const radiusKm = radiusParam !== undefined ? parseFloat(radiusParam as string) : 5;

    const supportedRadii = [5, 10, 15];
    if (!supportedRadii.includes(radiusKm)) {
      res.status(400).json({
        success: false,
        error: `Invalid radius: ${radiusKm} km is not supported. Supported radius values are strictly 5, 10, and 15 km.`,
      });
      return;
    }

    const discoveryResult = await discoverNearbyHospitals(lat, lng, radiusKm);

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

    const discoveryResult = await discoverNearbyHospitals(lat, lng, radius);
    let results = discoveryResult.hospitals;

    // Apply Service Filter
    if (serviceFilter !== 'ALL') {
      results = results.filter((hosp) => {
        if (serviceFilter === 'ICU') {
          const icu = hosp.beds.find((b: any) => b.category === 'EMERGENCY_ICU');
          return (icu?.availableBeds ?? 0) > 0;
        }
        if (serviceFilter === 'ER') {
          const er = hosp.beds.find((b: any) => b.category === 'EMERGENCY_GENERAL' || b.category === 'TRAUMA_RESUSCITATION');
          return (er?.availableBeds ?? 0) > 0;
        }
        if (serviceFilter === 'DOCTORS') {
          return (hosp.staffSummary?.doctorsAvailable ?? 0) > 0;
        }
        if (serviceFilter === 'NURSES') {
          return (hosp.staffSummary?.nursesAvailable ?? 0) > 0;
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

    // Support OSM or dynamic simulated IDs so facility profiles always return full resources
    const demoRes = generateOsmDemoResources(id, id);
    const fallbackHospital = {
      id,
      name: id.replace(/^osm-[a-z]+-/, '').replace(/^reg-/, '').replace(/-/g, ' ').toUpperCase(),
      slug: id.toLowerCase(),
      address: 'Bengaluru, Karnataka',
      area: 'Bengaluru Urban',
      city: 'Bengaluru',
      state: 'Karnataka',
      facilityType: 'Hospital',
      emergencyServices: ['24/7 Emergency Casualty', 'Trauma Resuscitation Bays', 'Critical Care ICU'],
      verificationStatus: 'VERIFIED_LOCATION_ONLY',
      operatingStatus: 'OPERATIONAL',
      isDemoData: true,
      dataSource: 'osm',
      dataProvenance: 'DEMO',
      provenanceNotice: 'Demonstration synthetic resource simulation. Provided for prototype evaluation — call facility directly to confirm.',
      capacityConnected: true,
      lastResourceUpdate: new Date().toISOString(),
      beds: demoRes.beds,
      staff: demoRes.staff,
      ambulances: demoRes.ambulances,
      ambulanceFleet: demoRes.ambulanceFleet,
      bedsSummary: demoRes.bedsSummary,
      staffSummary: demoRes.staffSummary,
      ambulanceSummary: demoRes.ambulanceSummary,
    };

    res.json({
      success: true,
      data: fallbackHospital,
    });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve hospital details.' });
  }
};
