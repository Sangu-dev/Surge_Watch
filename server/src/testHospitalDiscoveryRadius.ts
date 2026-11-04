import { prisma } from './prisma.js';
import { getNearbyHospitals } from './controllers/hospitalController.js';

function createMockReqRes(query: any = {}) {
  let statusCode = 200;
  let responseData: any = null;

  const req: any = {
    body: {},
    params: {},
    query,
    headers: {},
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    getStatusCode() {
      return statusCode;
    },
    getData() {
      return responseData;
    },
  };

  return { req, res };
}

async function runHospitalDiscoveryRadiusTests() {
  console.log('========================================================================');
  console.log('  SURGEWATCH: MULTI-HOSPITAL RADIUS DISCOVERY VERIFICATION TEST SUITE  ');
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
    // -------------------------------------------------------------
    // 1. Validation Tests: Coordinates & Radius Parameters
    // -------------------------------------------------------------
    console.log('--- Suite 1: Input Validation & Parameter Compatibility ---');

    // Missing lat/lon
    {
      const { req, res } = createMockReqRes({ radius_km: '5' });
      await getNearbyHospitals(req, res);
      assert(res.getStatusCode() === 400, 'Rejects missing coordinates with 400 Bad Request');
    }

    // Invalid coordinate values (out of bounds)
    {
      const { req, res } = createMockReqRes({ lat: '999', lon: '77.62', radius_km: '5' });
      await getNearbyHospitals(req, res);
      assert(res.getStatusCode() === 400, 'Rejects invalid lat > 90 with 400 Bad Request');
    }

    // Non-supported radius (e.g., 7 km)
    {
      const { req, res } = createMockReqRes({ lat: '12.9352', lon: '77.6245', radius_km: '7' });
      await getNearbyHospitals(req, res);
      assert(res.getStatusCode() === 400, 'Rejects non-standard radius (7 km -> 400 Bad Request)');
    }

    // Non-supported radius 20 km (only 5, 10, 15 allowed)
    {
      const { req, res } = createMockReqRes({ lat: '12.9352', lon: '77.6245', radius_km: '20' });
      await getNearbyHospitals(req, res);
      assert(res.getStatusCode() === 400, 'Rejects radius 20 km (strictly 5, 10, 15 allowed -> 400 Bad Request)');
    }

    // Parameter compatibility: radius_km vs radiusKm vs radius
    {
      const { req: req1, res: res1 } = createMockReqRes({ lat: '12.9352', lon: '77.6245', radius_km: '10' });
      await getNearbyHospitals(req1, res1);
      const data1 = res1.getData();

      const { req: req2, res: res2 } = createMockReqRes({ latitude: '12.9352', longitude: '77.6245', radiusKm: '10' });
      await getNearbyHospitals(req2, res2);
      const data2 = res2.getData();

      const { req: req3, res: res3 } = createMockReqRes({ lat: '12.9352', lon: '77.6245', radius: '10' });
      await getNearbyHospitals(req3, res3);
      const data3 = res3.getData();

      assert(res1.getStatusCode() === 200 && data1.success, 'Query with radius_km parameter succeeds');
      assert(res2.getStatusCode() === 200 && data2.success, 'Query with radiusKm & latitude/longitude succeeds');
      assert(res3.getStatusCode() === 200 && data3.success, 'Query with radius parameter succeeds');
      assert(data1.count === data2.count && data1.count === data3.count, `All parameter aliases return identical result counts (${data1.count})`);
    }

    // -------------------------------------------------------------
    // 2. Multi-Hospital Discovery across 5 km, 10 km, and 15 km
    // -------------------------------------------------------------
    console.log('\n--- Suite 2: Multi-Hospital Discovery & Radius Progression (Koramangala Hub) ---');
    const koramangalaLat = 12.9352;
    const koramangalaLon = 77.6245;

    // 5 KM
    const { req: req5, res: res5 } = createMockReqRes({ lat: koramangalaLat, lon: koramangalaLon, radius_km: '5' });
    await getNearbyHospitals(req5, res5);
    const data5 = res5.getData();
    assert(res5.getStatusCode() === 200 && data5.success, '5 km query returns 200 OK');
    const count5 = data5.data.length;
    console.log(`    Hospitals found within 5 km: ${count5}`);
    assert(count5 > 1, `Multiple hospitals discovered within 5 km (Found: ${count5} > 1)`);

    // 10 KM
    const { req: req10, res: res10 } = createMockReqRes({ lat: koramangalaLat, lon: koramangalaLon, radius_km: '10' });
    await getNearbyHospitals(req10, res10);
    const data10 = res10.getData();
    assert(res10.getStatusCode() === 200 && data10.success, '10 km query returns 200 OK');
    const count10 = data10.data.length;
    console.log(`    Hospitals found within 10 km: ${count10}`);
    assert(count10 > count5, `10 km radius expands discovery count (${count10} > ${count5})`);

    // 15 KM
    const { req: req15, res: res15 } = createMockReqRes({ lat: koramangalaLat, lon: koramangalaLon, radius_km: '15' });
    await getNearbyHospitals(req15, res15);
    const data15 = res15.getData();
    assert(res15.getStatusCode() === 200 && data15.success, '15 km query returns 200 OK');
    const count15 = data15.data.length;
    console.log(`    Hospitals found within 15 km: ${count15}`);
    assert(count15 >= count10, `15 km radius discovers equal or greater hospitals (${count15} >= ${count10})`);

    // Superset checks
    const ids5 = new Set(data5.data.map((h: any) => h.id));
    const ids10 = new Set(data10.data.map((h: any) => h.id));
    const ids15 = new Set(data15.data.map((h: any) => h.id));

    const missingIn10 = data5.data.filter((h: any) => !ids10.has(h.id));
    assert(missingIn10.length === 0, 'Every hospital in 5 km results is included in 10 km results');

    const missingIn15 = data10.data.filter((h: any) => !ids15.has(h.id));
    assert(missingIn15.length === 0, 'Every hospital in 10 km results is included in 15 km results');

    // -------------------------------------------------------------
    // 3. Distance Calculations & Perimeter Boundaries
    // -------------------------------------------------------------
    console.log('\n--- Suite 3: Geodesic Haversine Distance & Perimeter Adherence ---');

    // Bounds check
    const violations5 = data5.data.filter((h: any) => h.distanceKm > 5.05);
    assert(violations5.length === 0, `No hospital exceeds 5 km perimeter (Violations: ${violations5.length})`);

    const violations10 = data10.data.filter((h: any) => h.distanceKm > 10.05);
    assert(violations10.length === 0, `No hospital exceeds 10 km perimeter (Violations: ${violations10.length})`);

    const violations15 = data15.data.filter((h: any) => h.distanceKm > 15.05);
    assert(violations15.length === 0, `No hospital exceeds 15 km perimeter (Violations: ${violations15.length})`);

    // Strictly ascending sort order
    let sortedAsc = true;
    for (let i = 0; i < data15.data.length - 1; i++) {
      if (data15.data[i].distanceKm > data15.data[i + 1].distanceKm) {
        sortedAsc = false;
        break;
      }
    }
    assert(sortedAsc, 'Results strictly sorted in ascending order of distance (nearest hospital first)');

    // -------------------------------------------------------------
    // 4. Data Completeness & Schema Contract
    // -------------------------------------------------------------
    console.log('\n--- Suite 4: Data Completeness & Schema Integrity ---');
    const sample = data5.data[0];
    assert(typeof sample.id === 'string' && sample.id.length > 0, 'Hospital has valid ID string');
    assert(typeof sample.name === 'string' && sample.name.length > 0, 'Hospital has valid Name string');
    assert(typeof sample.address === 'string' && sample.address.length > 0, 'Hospital has valid Address');
    assert(typeof sample.latitude === 'number' && !isNaN(sample.latitude), 'Hospital has numeric Latitude');
    assert(typeof sample.longitude === 'number' && !isNaN(sample.longitude), 'Hospital has numeric Longitude');
    assert(typeof sample.distanceKm === 'number' && sample.distanceKm >= 0, 'Hospital has numeric distanceKm >= 0');
    assert(sample.bedsSummary && typeof sample.bedsSummary.totalBeds === 'number' && typeof sample.bedsSummary.availableBeds === 'number', 'Hospital has bedsSummary with totalBeds and availableBeds');
    assert(sample.bedsSummary && typeof sample.bedsSummary.icuBedsAvailable === 'number', 'Hospital has ICU bed summary fields');
    assert(sample.bedsSummary && typeof sample.bedsSummary.emergencyBedsAvailable === 'number', 'Hospital has emergency bed summary fields');
    assert(sample.ambulanceSummary && typeof sample.ambulanceSummary.totalAmbulances === 'number' && typeof sample.ambulanceSummary.availableAmbulances === 'number', 'Hospital has ambulance tracking summary fields');
    assert(sample.staffSummary && typeof sample.staffSummary.doctorsOnDuty === 'number' && typeof sample.staffSummary.nursesOnDuty === 'number', 'Hospital has clinical staffing summary fields');
    assert(Array.isArray(sample.beds) && sample.beds.length > 0, 'Hospital includes beds breakdown array');
    assert(Array.isArray(sample.staff) && sample.staff.length > 0, 'Hospital includes staff breakdown array');
    assert(Array.isArray(sample.ambulances) && sample.ambulances.length > 0, 'Hospital includes ambulances breakdown array');

    // -------------------------------------------------------------
    // 5. Geographic Zone Coverage Across Bengaluru (Including Chandapura)
    // -------------------------------------------------------------
    console.log('\n--- Suite 5: Geographic Zone Coverage Across Bengaluru (Including Chandapura) ---');
    const testZones = [
      { name: 'Chandapura (South Highway Corridor)', lat: 12.7938, lon: 77.6972 },
      { name: 'Koramangala (South-East)', lat: 12.9352, lon: 77.6245 },
      { name: 'Hebbal (North)', lat: 13.0358, lon: 77.5970 },
      { name: 'Bannerghatta Road (South)', lat: 12.8988, lon: 77.5996 },
      { name: 'Whitefield (East)', lat: 12.9698, lon: 77.7499 },
      { name: 'Majestic / Central', lat: 12.9767, lon: 77.5713 },
      { name: 'Jayanagar (South)', lat: 12.9250, lon: 77.5938 },
      { name: 'Yeshwanthpur (North-West)', lat: 13.0238, lon: 77.5529 },
    ];

    for (const zone of testZones) {
      const { req, res } = createMockReqRes({ lat: String(zone.lat), lon: String(zone.lon), radius_km: '10' });
      await getNearbyHospitals(req, res);
      const data = res.getData();
      const count = data?.data?.length || 0;
      assert(count >= 2, `Zone "${zone.name}" discovers multiple hospitals within 10 km (Found: ${count})`);
    }

    // Dedicated Chandapura Radius Progression Test
    console.log('\n--- Dedicated Test: Chandapura Radius Progression (5, 10, 15 km) ---');
    {
      const { req: r5, res: s5 } = createMockReqRes({ lat: '12.7938', lon: '77.6972', radius_km: '5' });
      await getNearbyHospitals(r5, s5);
      const d5 = s5.getData();
      assert(d5.count >= 5, `Chandapura discovers >= 5 hospitals within 5 km (Found: ${d5.count})`);

      const { req: r10, res: s10 } = createMockReqRes({ lat: '12.7938', lon: '77.6972', radius_km: '10' });
      await getNearbyHospitals(r10, s10);
      const d10 = s10.getData();
      assert(d10.count >= 10, `Chandapura discovers >= 10 hospitals within 10 km (Found: ${d10.count})`);

      const { req: r15, res: s15 } = createMockReqRes({ lat: '12.7938', lon: '77.6972', radius_km: '15' });
      await getNearbyHospitals(r15, s15);
      const d15 = s15.getData();
      assert(d15.count >= 12, `Chandapura discovers >= 12 hospitals within 15 km (Found: ${d15.count})`);
    }

    // -------------------------------------------------------------
    // 6. Remote Location (Zero Results / Empty State Handling)
    // -------------------------------------------------------------
    console.log('\n--- Suite 6: Edge Case - Remote Coordinates (Empty Results) ---');
    // Middle of Indian Ocean (0, 77)
    {
      const { req, res } = createMockReqRes({ lat: '0.0', lon: '77.0', radius_km: '5' });
      await getNearbyHospitals(req, res);
      const data = res.getData();
      assert(res.getStatusCode() === 200 && data.success, 'Remote location query returns 200 OK without crashing');
      assert(Array.isArray(data.data) && data.data.length === 0, 'Returns empty array [] when no hospitals exist within radius');
      assert(data.count === 0, 'Metadata count is 0');
    }

  } catch (err: any) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    console.log('\n========================================================================');
    console.log(`  DISCOVERY TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================================\n');
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runHospitalDiscoveryRadiusTests();
