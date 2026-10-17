const PORT = 5000;
const API_BASE = `http://localhost:${PORT}/api/v1`;

async function runNearbyVerification() {
  console.log('========================================================================');
  console.log('  RUNNING SURGEWATCH REAL HOSPITAL DISCOVERY & LOCATION TEST SUITE      ');
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
    // 1. Test Input Validation for /hospitals/nearby
    const missingCoordsRes = await fetch(`${API_BASE}/hospitals/nearby`);
    assert(missingCoordsRes.status === 400, 'Nearby discovery requires lat and lon coordinates (400 Bad Request)');

    const invalidCoordsRes = await fetch(`${API_BASE}/hospitals/nearby?lat=999&lon=77.6245`);
    assert(invalidCoordsRes.status === 400, 'Invalid coordinate bounds rejected (lat > 90 -> 400 Bad Request)');

    // 2. Discover hospitals near Koramangala (South-Central BLR)
    console.log('\n--- Test 1: Discover nearest hospitals near Koramangala (12.9352, 77.6245) ---');
    const koraRes = await fetch(`${API_BASE}/hospitals/nearby?lat=12.9352&lon=77.6245&radiusKm=5&limit=5`);
    const koraData = await koraRes.json();
    assert(koraRes.status === 200 && koraData.success === true, 'Koramangala hospital discovery returns 200 OK');
    assert(Array.isArray(koraData.data), 'Returns hospital data array');
    assert(koraData.data.length > 0 && koraData.data.length <= 5, `Returns between 1 and 5 nearest hospitals (Received: ${koraData.data.length})`);

    // Verify distance sorting
    let isSorted = true;
    for (let i = 0; i < koraData.data.length - 1; i++) {
      if (koraData.data[i].distanceKm > koraData.data[i + 1].distanceKm) {
        isSorted = false;
        break;
      }
    }
    assert(isSorted, 'Hospitals are strictly sorted by Haversine distance in ascending order (nearest first)');
    console.log(`    Nearest hospital: "${koraData.data[0]?.name}" at ${koraData.data[0]?.distanceKm} km (Est. ${koraData.data[0]?.estimatedTravelTimeMins} mins)`);

    // Verify metadata presence
    assert(koraData.metadata !== undefined, 'Response includes comprehensive discovery metadata');
    assert(koraData.metadata.requestedRadiusKm === 5, 'Metadata specifies requested radius');
    assert(typeof koraData.metadata.dataSource === 'string', `Identifies data source (${koraData.metadata.dataSource})`);

    // 3. Discover hospitals in North Bengaluru (Hebbal: 13.0562, 77.5921)
    console.log('\n--- Test 2: Search around distinct location: Hebbal, North Bengaluru (13.0562, 77.5921) ---');
    const hebbalRes = await fetch(`${API_BASE}/hospitals/nearby?lat=13.0562&lon=77.5921&radiusKm=5&limit=5`);
    const hebbalData = await hebbalRes.json();
    assert(hebbalRes.status === 200 && hebbalData.success === true, 'Hebbal search returns 200 OK');
    assert(hebbalData.data.length > 0, `Discovers facilities around North Bengaluru (Found: ${hebbalData.data.length})`);
    
    // Verify results are local to Hebbal, not Koramangala
    const firstHebbalHosp = hebbalData.data[0];
    assert(firstHebbalHosp.distanceKm < 5, `Nearest facility is local to Hebbal (${firstHebbalHosp.name} at ${firstHebbalHosp.distanceKm} km)`);
    console.log(`    Nearest North BLR hospital: "${firstHebbalHosp.name}" at ${firstHebbalHosp.distanceKm} km`);

    // 4. Test Search Radius Expansion
    console.log('\n--- Test 3: Radius Expansion for sparse or tight perimeter (1 km radius) ---');
    const expandRes = await fetch(`${API_BASE}/hospitals/nearby?lat=13.0800&lon=77.5000&radiusKm=1&limit=5&autoExpand=true`);
    const expandData = await expandRes.json();
    assert(expandRes.status === 200 && expandData.success === true, 'Radius expansion endpoint returns 200 OK');
    assert(expandData.metadata.effectiveRadiusKm >= 1, `Effective radius expanded or retained appropriately (${expandData.metadata.effectiveRadiusKm} km)`);
    assert(typeof expandData.metadata.expansionMessage === 'string', `Expansion message provided: "${expandData.metadata.expansionMessage}"`);

    // 5. Reverse Geocoding
    console.log('\n--- Test 4: Reverse Geocoding API ---');
    const geocodeRes = await fetch(`${API_BASE}/location/reverse-geocode?lat=12.9352&lng=77.6245`);
    const geocodeData = await geocodeRes.json();
    assert(geocodeRes.status === 200 && geocodeData.success === true, 'Reverse geocode returns 200 OK');
    assert(typeof geocodeData.data.locality === 'string' && geocodeData.data.locality.length > 0, `Locality resolved: "${geocodeData.data.locality}"`);
    assert(geocodeData.data.city === 'Bengaluru', `City confirmed: "${geocodeData.data.city}"`);

    // 6. IP Geolocation Lookup Fallback
    console.log('\n--- Test 5: IP Geolocation Fallback ---');
    const ipRes = await fetch(`${API_BASE}/location/ip-lookup`);
    const ipData = await ipRes.json();
    assert(ipRes.status === 200 && ipData.success === true, 'IP lookup returns 200 OK');
    assert(ipData.data.isGpsAccurate === false, 'Explicitly flags isGpsAccurate: false');
    assert(ipData.data.source === 'IP_APPROXIMATE', 'Source tagged as IP_APPROXIMATE');
    assert(typeof ipData.data.warning === 'string', 'Prominently provides disclaimer warning to user');

    // 7. Verify capacity transparency
    console.log('\n--- Test 6: Capacity Transparency & Verified vs OSM Status ---');
    const sampleHosp = koraData.data[0];
    if (sampleHosp.capacityConnected) {
      assert(sampleHosp.beds.length > 0, 'Capacity connected hospitals have bed availability breakdown');
      console.log(`    Capacity connected hospital "${sampleHosp.name}" has verified bed telemetry.`);
    } else {
      assert(sampleHosp.capacityNotes.includes('not connected'), 'OSM hospitals explicitly declare live capacity not connected');
      console.log(`    OSM hospital "${sampleHosp.name}" explicitly transparent: "${sampleHosp.capacityNotes}"`);
    }

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
