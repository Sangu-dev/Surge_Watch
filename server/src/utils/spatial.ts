/**
 * Geodesic (great-circle) distance in kilometers between two lat/lng pairs
 * using the Haversine formula (Earth's radius R = 6371 km).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
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
  return Math.round(distance * 10) / 10;
}

/**
 * Estimates emergency road transit time in minutes in Bengaluru.
 * Takes straight-line aerial distance, applies urban road network winding factor (1.35x),
 * and calibrated emergency vehicle traffic speed (24 km/h with sirens/clearance).
 */
export function estimateEmergencyTravelTime(straightLineKm: number): number {
  const estimatedRoadKm = straightLineKm * 1.35;
  const averageSpeedKmH = 24;
  const timeHours = estimatedRoadKm / averageSpeedKmH;
  const minutes = Math.round(timeHours * 60);
  return Math.max(3, minutes);
}
