/**
 * Calculates geodesic (great-circle) distance in kilometers between two lat/lng pairs
 * using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
    isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2) ||
    lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90 ||
    lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180
  ) {
    return Infinity;
  }
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Estimates emergency road transit time in minutes based on distance in Bengaluru.
 * Accounts for typical urban corridor speeds (~22-25 km/h for ambulances with sirens/traffic clearance).
 */
export function estimateEmergencyTravelTime(straightLineKm: number): number {
  // Road curvature factor in Bengaluru road network ~ 1.35x
  const estimatedRoadKm = straightLineKm * 1.35;
  const averageSpeedKmH = 24; // Emergency transit average speed
  const timeHours = estimatedRoadKm / averageSpeedKmH;
  const minutes = Math.round(timeHours * 60);
  return Math.max(3, minutes); // Minimum 3 minutes dispatch/intake buffer
}
