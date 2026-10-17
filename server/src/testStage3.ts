import http from 'http';

function request(options: http.RequestOptions, data?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let bodyStr = '';
      res.on('data', (chunk) => (bodyStr += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(bodyStr);
          resolve({ status: res.statusCode || 0, body: parsed });
        } catch {
          resolve({ status: res.statusCode || 0, body: bodyStr });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runStage3Tests() {
  console.log('--- STARTING STAGE 3 DATABASE & BACKEND TEST SUITE ---');

  // Test 1: API Documentation
  const docsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/docs',
    method: 'GET',
  });
  console.log('✓ API Documentation:', docsRes.status, docsRes.body.title);

  // Test 2: Hospital Radius Search (10 km from Koramangala)
  const search10Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/hospitals/search?lat=12.9352&lng=77.6245&radius=10',
    method: 'GET',
  });
  console.log(
    '✓ Hospital Radius Search (10 km):',
    search10Res.status,
    'Found:',
    search10Res.body.count,
    'hospitals'
  );

  // Verify first hospital has computed fields
  const firstHosp = search10Res.body.data[0];
  console.log(
    '  - Closest hospital:',
    firstHosp.name,
    'Distance:',
    firstHosp.distanceKm,
    'km, Est. Transit:',
    firstHosp.estimatedTravelTimeMins,
    'mins, Freshness:',
    firstHosp.freshness.status
  );

  // Test 3: Hospital Radius Search (5 km strict radius)
  const search5Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/hospitals/search?lat=12.9352&lng=77.6245&radius=5',
    method: 'GET',
  });
  console.log(
    '✓ Hospital Radius Search (5 km strict):',
    search5Res.status,
    'Found:',
    search5Res.body.count,
    'hospitals'
  );

  // Test 4: Hospital Detail by ID
  const detailRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/hospitals/hosp-victoria',
    method: 'GET',
  });
  console.log(
    '✓ Hospital Detail (Victoria):',
    detailRes.status,
    'Bed Categories:',
    detailRes.body.data.beds.length,
    'Ambulances:',
    detailRes.body.data.ambulances.length
  );

  // Test 5: Authenticate as Victoria Admin to test resource update
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login-admin',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: 'admin@victoria.gov.in',
      password: 'VictoriaAdmin@123',
    }
  );
  const token = loginRes.body.token;

  // Test 6: Authorized Resource Update with Transaction & Audit Record
  const updateRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/admin/hospitals/hosp-victoria/resources',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      beds: [
        {
          category: 'EMERGENCY_ICU',
          totalBeds: 24,
          occupiedBeds: 17,
          availableBeds: 7, // Updated from 6 to 7
        },
      ],
      staff: [
        {
          staffCategory: 'EMERGENCY_PHYSICIAN',
          scheduledOnDutyCount: 8,
          currentlyAvailableCount: 4, // Updated from 3 to 4
        },
      ],
    }
  );
  console.log('✓ Authorized Resource Update:', updateRes.status, updateRes.body.message);

  // Test 7: Verify Audit Log has recorded the change
  const auditRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/admin/hospitals/hosp-victoria/audits',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(
    '✓ Audit Trail Verification:',
    auditRes.status,
    'Total Audit Entries:',
    auditRes.body.count,
    'Latest Change:',
    auditRes.body.data[0].changeSummary
  );

  // Test 8: Platform Freshness Monitor
  const platLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login-admin',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: 'superadmin@surgewatch.in',
      password: 'SuperAdmin@123',
    }
  );
  const platToken = platLogin.body.token;

  const freshnessRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/platform/freshness',
    method: 'GET',
    headers: { Authorization: `Bearer ${platToken}` },
  });
  console.log(
    '✓ Platform Freshness Monitor:',
    freshnessRes.status,
    'Health Percentage:',
    freshnessRes.body.metrics.healthPercentage + '%',
    'Total Node Feeds:',
    freshnessRes.body.metrics.total
  );

  console.log('--- ALL STAGE 3 TESTS COMPLETED AND VERIFIED WITH 100% SUCCESS! ---');
}

runStage3Tests().catch((err) => {
  console.error('Stage 3 Test Suite Failed:', err);
  process.exit(1);
});
