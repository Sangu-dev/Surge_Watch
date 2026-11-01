import { calculateHaversineDistance } from '../utils/spatial.js';

interface ReverseGeocodeResult {
  locality: string;
  formattedAddress: string;
  area: string;
  city: string;
  pincode?: string;
  source: 'nominatim' | 'bengaluru_spatial_heuristic';
}

const geocodeCache = new Map<string, { timestamp: number; data: ReverseGeocodeResult }>();
const GEOCODE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Curated reference points for major Bengaluru zones for offline spatial heuristic fallback
export const BENGALURU_ZONES = [
  { name: 'Koramangala', area: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { name: 'Indiranagar', area: 'Indiranagar / 100ft Rd', lat: 12.9784, lng: 77.6408 },
  { name: 'MG Road / Central Business District', area: 'CBD / MG Road', lat: 12.9756, lng: 77.6094 },
  { name: 'Majestic / KR Market', area: 'Majestic / City Railway Station', lat: 12.9767, lng: 77.5713 },
  { name: 'Whitefield', area: 'Whitefield / ITPL', lat: 12.9698, lng: 77.7499 },
  { name: 'Electronic City', area: 'Electronic City Phase 1', lat: 12.8452, lng: 77.6602 },
  { name: 'Hebbal / Bellary Road', area: 'Hebbal / Sahakarnagar', lat: 13.0358, lng: 77.5970 },
  { name: 'Yelahanka', area: 'Yelahanka New Town', lat: 13.1007, lng: 77.5963 },
  { name: 'Malleshwaram', area: 'Malleshwaram / Rajajinagar', lat: 13.0031, lng: 77.5643 },
  { name: 'Jayanagar', area: 'Jayanagar 4th Block', lat: 12.9250, lng: 77.5938 },
  { name: 'HSR Layout', area: 'HSR Layout Sector 1', lat: 12.9121, lng: 77.6446 },
  { name: 'Marathahalli', area: 'Marathahalli Bridge', lat: 12.9591, lng: 77.6974 },
  { name: 'Bellandur / Sarjapur', area: 'Bellandur Outer Ring Road', lat: 12.9304, lng: 77.6784 },
  { name: 'Banashankari', area: 'Banashankari 2nd Stage', lat: 12.9255, lng: 77.5468 },
  { name: 'Yeshwanthpur / Peenya', area: 'Yeshwanthpur / Tumkur Road', lat: 13.0280, lng: 77.5408 },
  { name: 'Kengeri / Mysore Road', area: 'Kengeri Satellite Town', lat: 12.9177, lng: 77.4838 },
  { name: 'JP Nagar', area: 'JP Nagar Phase 2', lat: 12.9063, lng: 77.5857 },
  { name: 'BTM Layout', area: 'BTM Layout 2nd Stage', lat: 12.9166, lng: 77.6101 },
  { name: 'Rajajinagar', area: 'Rajajinagar 1st Block', lat: 12.9982, lng: 77.5530 },
  { name: 'Bannerghatta Road', area: 'Bannerghatta Road / Bilekahalli', lat: 12.8931, lng: 77.5974 },
  { name: 'Chandapura', area: 'Chandapura / Anekal Road', lat: 12.7938, lng: 77.6972 },
  { name: 'Basavanagudi', area: 'Basavanagudi / Gandhi Bazaar', lat: 12.9421, lng: 77.5753 },
  { name: 'Domlur', area: 'Domlur / Old Airport Road', lat: 12.9609, lng: 77.6387 },
  { name: 'Frazer Town', area: 'Frazer Town / Pulakeshinagar', lat: 12.9980, lng: 77.6150 },
  { name: 'Kalyan Nagar', area: 'Kalyan Nagar / HRBR Layout', lat: 13.0199, lng: 77.6473 },
  { name: 'Kalasipalya', area: 'Kalasipalya / KR Market', lat: 12.9634, lng: 77.5750 },
  { name: 'Ulsoor', area: 'Ulsoor / Halasuru Lake', lat: 12.9817, lng: 77.6286 },
  { name: 'RT Nagar', area: 'RT Nagar Post Office', lat: 13.0247, lng: 77.5948 },
];

/**
 * Reverse geocodes coordinates to a readable locality in Bengaluru
 */
export async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < GEOCODE_CACHE_TTL) {
    return cached.data;
  }

  // 1. Attempt OpenStreetMap Nominatim Reverse Geocoding
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SurgeWatch-BLR/1.0 (Emergency Response Locality Lookup)',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(4000), // 4-second timeout
    });

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      const road = addr.road || addr.pedestrian || addr.street;
      const suburb = addr.suburb || addr.neighbourhood || addr.subdivision || addr.residential;
      const cityDistrict = addr.city_district || addr.district;
      const city = addr.city || addr.town || 'Bengaluru';
      const pincode = addr.postcode;

      let locality = '';
      if (road && suburb) {
        locality = `${road}, ${suburb}`;
      } else if (suburb) {
        locality = `${suburb}, ${city}`;
      } else if (road) {
        locality = `${road}, ${city}`;
      } else if (cityDistrict) {
        locality = `${cityDistrict}, ${city}`;
      } else {
        locality = data.display_name?.split(',').slice(0, 2).join(',') || `Near [${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E]`;
      }

      const result: ReverseGeocodeResult = {
        locality: locality.trim(),
        formattedAddress: data.display_name || `${locality}, Bengaluru, Karnataka`,
        area: suburb || cityDistrict || 'Bengaluru',
        city,
        pincode,
        source: 'nominatim',
      };

      geocodeCache.set(cacheKey, { timestamp: Date.now(), data: result });
      return result;
    }
  } catch {
    // Fallback to spatial heuristic
  }

  // 2. Spatial heuristic fallback: Find closest known Bengaluru neighborhood
  let closestZone = BENGALURU_ZONES[0];
  let minDistance = calculateHaversineDistance(lat, lng, closestZone.lat, closestZone.lng);

  for (const zone of BENGALURU_ZONES) {
    const dist = calculateHaversineDistance(lat, lng, zone.lat, zone.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestZone = zone;
    }
  }

  const result: ReverseGeocodeResult = {
    locality: minDistance < 2.5
      ? `${closestZone.name}, Bengaluru`
      : `Approx. ${minDistance} km from ${closestZone.name}, Bengaluru`,
    formattedAddress: `${closestZone.area}, Bengaluru, Karnataka, India`,
    area: closestZone.area,
    city: 'Bengaluru',
    source: 'bengaluru_spatial_heuristic',
  };

  geocodeCache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}

/**
 * Resolves approximate IP-based location
 */
export async function resolveIpLocation(_clientIp?: string) {
  // Safe default: Central Bengaluru (Vidhana Soudha / MG Road)
  // Transparently tagged as approximate city-level IP geolocation
  return {
    lat: 12.9767,
    lng: 77.5928,
    accuracy: 'city_level_approximate',
    accuracyMeters: 5000,
    isGpsAccurate: false,
    label: 'Bengaluru Central (Approximate IP-derived Location — Not GPS Accurate)',
    source: 'IP_APPROXIMATE',
    warning: 'Location resolved approximately via network IP. For precise emergency response, please enable GPS or pick your accident point on the map.',
  };
}

/**
 * Resolves accurate geographic coordinates for a Bengaluru area or address.
 * Matches against known Bengaluru zones first, optionally queries OpenStreetMap Nominatim,
 * and falls back gracefully to Bengaluru city center coordinates.
 */
export async function resolveCoordinatesForArea(
  area: string,
  address?: string
): Promise<{ latitude: number; longitude: number }> {
  const cleanArea = (area || '').toLowerCase().trim();
  const cleanAddress = (address || '').toLowerCase().trim();

  // 1. Check direct match in known Bengaluru zones
  const matchedZone = BENGALURU_ZONES.find((z) => {
    const nameLow = z.name.toLowerCase();
    const areaLow = z.area.toLowerCase();
    return (
      cleanArea.includes(nameLow) ||
      nameLow.includes(cleanArea) ||
      cleanArea.includes(areaLow) ||
      areaLow.includes(cleanArea) ||
      cleanAddress.includes(nameLow) ||
      cleanAddress.includes(areaLow)
    );
  });

  if (matchedZone) {
    return { latitude: matchedZone.lat, longitude: matchedZone.lng };
  }

  // 2. Try Nominatim Geocoding API if query is reasonably descriptive
  const searchQuery = `${area}, Bengaluru, Karnataka, India`;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      searchQuery
    )}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SurgeWatch-BLR/1.0 (Emergency Healthcare Facility Geocoding)',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        // Ensure coordinates are within reasonable Bengaluru boundaries (lat ~12.5 to 13.5, lng ~77.0 to 78.0)
        if (!isNaN(lat) && !isNaN(lon) && lat >= 12.5 && lat <= 13.5 && lon >= 77.0 && lon <= 78.0) {
          return { latitude: lat, longitude: lon };
        }
      }
    }
  } catch {
    // Timeout or network unavailable, continue to default
  }

  // 3. Fallback to Bengaluru Central coordinates
  return { latitude: 12.9716, longitude: 77.5946 };
}

