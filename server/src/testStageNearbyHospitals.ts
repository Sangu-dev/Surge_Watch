const PORT = 5000;
const API_BASE = `http://localhost:${PORT}/api/v1`;
const API_BASE_ALT = `http://localhost:${PORT}/api`;

async function runNearbyVerification() {
  console.log('========================================================================');
  console.log('  RUNNING SURGEWATCH NEARBY HOSPITAL DISCOVERY & RADIUS TEST SUITE      ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Test Input Validation for Coordinates
    console.log('--- Test 1: Coordinate Validation ---');
    const missingCoordsRes = await fetch(`${API_BASE}/hospitals/nearby`);
    assert(missingCoordsRes.status === 400, 'Nearby discovery requires lat and lon coordinates (400 Bad Request)');

    const invalidCoordsRes = await fetch(`${API_BASE}/hospitals/nearby?lat=999&lon=77.6245`);
    assert(invalidCoordsRes.status === 400, 'Invalid coordinate bounds rejected (lat > 90 -> 400 Bad Request)');

    // 2. Test Radius Validation (Only 5, 10, 15 km allowed)
    console.log('\n--- Test 2: Radius Validation (Only 5, 10, 15 km Accepted) ---');
    const invalidRadiusRes = await fetch(`${API_BASE}/hospitals/nearby?lat=12.9352&lon=77.6245&radiusKm=7`);
    assert(invalidRadiusRes.status === 400, 'Rejects unsupported radius (7 km -> 400 Bad Request)');

    const invalidRadius20Res = await fetch(`${API_BASE}/hospitals/nearby?lat=12.9352&lon=77.6245&radiusKm=20`);
    assert(invalidRadius20Res.status === 400, 'Rejects radius 20 km (400 Bad Request - strictly 5, 10, 15 allowed)');

    // 3. Test Alternative Route /api/hospitals/nearby
    console.log('\n--- Test 3: Endpoint Routing Convention ---');
    const altRouteRes = await fetch(`${API_BASE_ALT}/hospitals/nearby?lat=12.9352&lon=77.6245&radiusKm=5`);
    assert(altRouteRes.status === 200, 'Endpoint accessible at /api/hospitals/nearby (200 OK)');

    // 4. Test 5 km Radius Discovery
    console.log('\n--- Test 4: 5 km Radius Selection (All matching facilities, no 5 limit) ---');
    const res5km = await fetch(`${API_BASE}/hospitals/nearby?lat=12.9352&lon=77.6245&radiusKm=5`);
    const data5km = await res5km.json();
    assert(res5km.status === 200 && data5km.success === true, '5 km query returns 200 OK');
    assert(Array.isArray(data5km.data), 'Returns hospital array');
    const count5km = data5km.data.length;
    console.log(`    Total hospitals found within 5 km: ${count5km}`);
    assert(count5km > 0, `Discovered matching hospitals within 5 km (Found: ${count5km})`);
    assert(data5km.metadata.selectedRadiusKm === 5, 'Metadata confirms selected radius is 5 km');
    assert(data5km.count === count5km, 'Response count matches data array length');

    // Confirm no records exceed 5 km (with floating point boundary tolerance)
    const outOfBounds5km = data5km.data.filter((h: any) => h.distanceKm > 5.05);
    assert(outOfBounds5km.length === 0, `No records exceed 5 km radius perimeter (Violations: ${outOfBounds5km.length})`);

    // Verify distance sorting (nearest to farthest)
    let isSorted5km = true;
    for (let i = 0; i < data5km.data.length - 1; i++) {
      if (data5km.data[i].distanceKm > data5km.data[i + 1].distanceKm) {
        isSorted5km = false;
        break;
      }
    }
    assert(isSorted5km, 'Results strictly sorted by straight-line distance in ascending order (nearest first)');
    console.log(`    Nearest hospital: "${data5km.data[0]?.name}" at ${data5km.data[0]?.distanceKm} km straight-line`);
    console.log(`    Farthest in 5 km: "${data5km.data[count5km - 1]?.name}" at ${data5km.data[count5km - 1]?.distanceKm} km straight-line`);

    // 5. Test 10 km Radius Discovery
    console.log('\n--- Test 5: 10 km Radius Selection (Superset of 5 km, all matching facilities) ---');
    const res10km = await fetch(`${API_BASE}/hospitals/nearby?lat=12.9352&lon=77.6245&radiusKm=10`);
    const data10km = await res10km.json();
    assert(res10km.status === 200 && data10km.success === true, '10 km query returns 200 OK');
    const count10km = data10km.data.length;
    console.log(`    Total hospitals found within 10 km: ${count10km}`);
    assert(count10km >= count5km, `10 km returns >= 5 km count (${count10km} >= ${count5km})`);

    // Confirm all 5 km hospitals are included in 10 km
    const ids10km = new Set(data10km.data.map((h: any) => h.id));
    const missing5kmIn10km = data5km.data.filter((h: any) => !ids10km.has(h.id));
    assert(missing5kmIn10km.length === 0, `All 5 km hospitals are present in 10 km results (Missing: ${missing5kmIn10km.length})`);

    // Confirm no records exceed 10 km
    const outOfBounds10km = data10km.data.filter((h: any) => h.distanceKm > 10.05);
    assert(outOfBounds10km.length === 0, `No records exceed 10 km radius perimeter (Violations: ${outOfBounds10km.length})`);

    // 6. Test 15 km Radius Discovery
    console.log('\n--- Test 6: 15 km Radius Selection (Superset of 10 km, all matching facilities) ---');
    const res15km = await fetch(`${API_BASE}/hospitals/nearby?lat=12.9352&lon=77.6245&radiusKm=15`);
    const data15km = await res15km.json();
    assert(res15km.status === 200 && data15km.success === true, '15 km query returns 200 OK');
    const count15km = data15km.data.length;
    console.log(`    Total hospitals found within 15 km: ${count15km}`);
    assert(count15km >= count10km, `15 km returns >= 10 km count (${count15km} >= ${count10km})`);

    // Confirm all 10 km hospitals are included in 15 km
    const ids15km = new Set(data15km.data.map((h: any) => h.id));
    const missing10kmIn15km = data10km.data.filter((h: any) => !ids15km.has(h.id));
    assert(missing10kmIn15km.length === 0, `All 10 km hospitals are present in 15 km results (Missing: ${missing10kmIn15km.length})`);

    // Confirm no records exceed 15 km
    const outOfBounds15km = data15km.data.filter((h: any) => h.distanceKm > 15.05);
    assert(outOfBounds15km.length === 0, `No records exceed 15 km radius perimeter (Violations: ${outOfBounds15km.length})`);

    // 7. Verify NO Arbitrary 5-Hospital Limit
    console.log('\n--- Test 7: Verify Absence of Arbitrary 5-Record Limit ---');
    assert(count10km > 5 || count15km > 5, `Confirmed no 5-hospital cap: returned ${count10km} in 10 km and ${count15km} in 15 km`);

    // 8. Test Data Quality, Attribution & Non-Fabrication
    console.log('\n--- Test 8: Data Integrity, Transparency & Attribution ---');
    assert(typeof data5km.metadata.attribution === 'string' && data5km.metadata.attribution.includes('OpenStreetMap'), 'OpenStreetMap attribution clearly provided');
    assert(typeof data5km.metadata.disclaimer === 'string' && data5km.metadata.disclaimer.includes('incomplete'), 'Disclaimer about OSM coverage limits provided');

    // Check that phone numbers are not fabricated
    const fakePhoneHospitals = data5km.data.filter((h: any) => h.emergencyContactPhone === '+91-80-22222222 (Casualty Enquiries)');
    assert(fakePhoneHospitals.length === 0, 'No fake or fabricated default phone numbers present in results');

    // Verify coordinates validity for directions navigation
    const invalidCoordHospitals = data5km.data.filter((h: any) => isNaN(h.latitude) || isNaN(h.longitude) || h.latitude < 12 || h.latitude > 14 || h.longitude < 76 || h.longitude > 78);
    assert(invalidCoordHospitals.length === 0, 'All hospitals have verified valid geographic coordinates');

    // 9. Reverse Geocoding
    console.log('\n--- Test 9: Reverse Geocoding Service ---');
    const geocodeRes = await fetch(`${API_BASE}/location/reverse-geocode?lat=12.9352&lng=77.6245`);
    const geocodeData = await geocodeRes.json();
    assert(geocodeRes.status === 200 && geocodeData.success === true, 'Reverse geocode returns 200 OK');
    assert(typeof geocodeData.data.locality === 'string' && geocodeData.data.locality.length > 0, `Locality resolved: "${geocodeData.data.locality}"`);

    // 10. IP Geolocation Lookup Fallback
    console.log('\n--- Test 10: Approximate IP Geolocation Fallback ---');
    const ipRes = await fetch(`${API_BASE}/location/ip-lookup`);
    const ipData = await ipRes.json();
    assert(ipRes.status === 200 && ipData.success === true, 'IP lookup returns 200 OK');
    assert(ipData.data.isGpsAccurate === false, 'Explicitly flags isGpsAccurate: false');
    assert(ipData.data.source === 'IP_APPROXIMATE', 'Source tagged as IP_APPROXIMATE');
    assert(typeof ipData.data.warning === 'string', 'Transparent user warning disclaimer included');

  } catch (err: any) {
    console.error('Fatal test execution error:', err);
    failed++;
  } finally {
    console.log('\n========================================================================');
    console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runNearbyVerification();
