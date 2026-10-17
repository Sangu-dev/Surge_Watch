import { calculateHaversineDistance, estimateEmergencyTravelTime } from './utils/spatial.js';

const API_BASE = 'http://localhost:5000/api/v1';

async function runStage4Tests() {
  console.log('===============================================================');
  console.log('  RUNNING SURGEWATCH STAGE 4: GEOGRAPHIC DISCOVERY TEST SUITE  ');
  console.log('===============================================================\n');

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

  // 1. Math Unit Test: Haversine distance Koramangala to Victoria Hospital
  // Koramangala (12.9352, 77.6245) to Victoria (12.9634, 77.5750) is ~6.2 km
  const testDist = calculateHaversineDistance(12.9352, 77.6245, 12.9634, 77.5750);
  assert(
    testDist >= 6.0 && testDist <= 6.5,
    'Haversine distance math (Koramangala to Victoria Hospital is ~6.2 km)',
    `Calculated ${testDist} km`
  );

  // 2. Road Transit estimation test
  const estTime = estimateEmergencyTravelTime(testDist);
  assert(
    estTime >= 15 && estTime <= 30,
    'Calibrated Bengaluru emergency road transit model (~21 mins for 6.2 km)',
    `Calculated ${estTime} mins`
  );

  // 3. API Test: Koramangala search within 5 km
  try {
    const res5km = await fetch(`${API_BASE}/hospitals/search?lat=12.9352&lng=77.6245&radius=5`);
    const data5km = await res5km.json();
    assert(
      res5km.status === 200 && data5km.success === true,
      'Search API responds 200 OK with success=true for 5 km query',
      `Status: ${res5km.status}`
    );
    assert(
      data5km.data.every((h: any) => h.distanceKm <= 5.0),
      'All returned hospitals in 5 km radius strictly have distanceKm <= 5.0 km',
      `Distances: ${data5km.data.map((h: any) => h.distanceKm).join(', ')}`
    );
  } catch (err: any) {
    assert(false, 'Search API 5 km query', err.message);
  }

  // 4. API Test: Koramangala search within 10 km (should include Victoria Hospital ~6.2 km, St. John's, Manipal)
  try {
    const res10km = await fetch(`${API_BASE}/hospitals/search?lat=12.9352&lng=77.6245&radius=10`);
    const data10km = await res10km.json();
    assert(
      data10km.count >= 2,
      'Search within 10 km returns multiple Bengaluru emergency hospitals',
      `Count: ${data10km.count}`
    );
    assert(
      data10km.data.some((h: any) => h.slug.includes('victoria') || h.name.includes('Victoria')),
      'Search results include Victoria Hospital & Trauma Care Centre within 10 km'
    );
  } catch (err: any) {
    assert(false, 'Search API 10 km query', err.message);
  }

  // 5. API Test: Facility Filtering (ICU available beds > 0)
  try {
    const resIcu = await fetch(`${API_BASE}/hospitals/search?lat=12.9352&lng=77.6245&radius=15&service=ICU`);
    const dataIcu = await resIcu.json();
    const allHaveIcu = dataIcu.data.every((h: any) => {
      const icu = h.beds.find((b: any) => b.category === 'EMERGENCY_ICU');
      return (icu?.availableBeds ?? 0) > 0;
    });
    assert(
      allHaveIcu && dataIcu.count > 0,
      'Facility filter service=ICU returns only hospitals with active emergency ICU capacity',
      `Count: ${dataIcu.count}`
    );
  } catch (err: any) {
    assert(false, 'Facility filter ICU query', err.message);
  }

  // 6. API Test: Facility Filtering (Ready ambulances > 0)
  try {
    const resAmb = await fetch(`${API_BASE}/hospitals/search?lat=12.9352&lng=77.6245&radius=15&service=AMBULANCE`);
    const dataAmb = await resAmb.json();
    const allHaveAmb = dataAmb.data.every((h: any) => {
      const ready = h.ambulances.reduce((acc: number, a: any) => acc + a.availableReadyCount, 0);
      return ready > 0;
    });
    assert(
      allHaveAmb && dataAmb.count > 0,
      'Facility filter service=AMBULANCE returns only hospitals with ready ALS/BLS fleet',
      `Count: ${dataAmb.count}`
    );
  } catch (err: any) {
    assert(false, 'Facility filter AMBULANCE query', err.message);
  }

  // 7. API Test: Sorting Order (sortBy=beds)
  try {
    const resBeds = await fetch(`${API_BASE}/hospitals/search?lat=12.9352&lng=77.6245&radius=20&sortBy=beds`);
    const dataBeds = await resBeds.json();
    let isSortedDescending = true;
    for (let i = 0; i < dataBeds.data.length - 1; i++) {
      const currentBeds = dataBeds.data[i].beds.reduce((acc: number, b: any) => acc + b.availableBeds, 0);
      const nextBeds = dataBeds.data[i + 1].beds.reduce((acc: number, b: any) => acc + b.availableBeds, 0);
      if (currentBeds < nextBeds) {
        isSortedDescending = false;
        break;
      }
    }
    assert(
      isSortedDescending,
      'Sorting by beds strictly orders hospitals in descending order of total available capacity'
    );
  } catch (err: any) {
    assert(false, 'Sorting by beds query', err.message);
  }

  // 8. API Test: Single Hospital Profile (GET /hospitals/:id) with data freshness indicator
  try {
    const resSingle = await fetch(`${API_BASE}/hospitals/hosp-victoria`);
    const dataSingle = await resSingle.json();
    assert(
      resSingle.status === 200 && dataSingle.success === true,
      'Single hospital profile endpoint returns 200 OK for Victoria Hospital',
      `Status: ${resSingle.status}`
    );
    assert(
      dataSingle.data.freshness && ['LIVE', 'RECENT', 'STALE'].includes(dataSingle.data.freshness.status),
      'Single hospital profile computes accurate real-time data freshness status',
      `Status: ${dataSingle.data.freshness?.status}`
    );
    assert(
      Array.isArray(dataSingle.data.emergencyServices) && dataSingle.data.emergencyServices.length > 0,
      'Single hospital profile parses emergency services as array',
      `Services count: ${dataSingle.data.emergencyServices?.length}`
    );
  } catch (err: any) {
    assert(false, 'Single hospital profile query', err.message);
  }

  console.log('\n===============================================================');
  console.log(`  STAGE 4 TEST RESULTS: ${passed} PASSED | ${failed} FAILED  `);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage4Tests();
