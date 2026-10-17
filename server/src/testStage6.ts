import { io as ClientIO } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api/v1';
const SOCKET_URL = 'http://localhost:5000';

async function runStage6Tests() {
  console.log('========================================================================');
  console.log('  RUNNING SURGEWATCH STAGE 6: REAL-TIME & PLATFORM GOVERNANCE TESTS     ');
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

  // 1. Authenticate Platform Administrator
  let platformToken = '';
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@surgewatch.in',
        password: 'SuperAdmin@123',
      }),
    });
    const loginData = await loginRes.json();
    assert(
      loginRes.status === 200 && loginData.success === true && !!loginData.token,
      'Platform administrator authentication returns 200 OK and JWT token'
    );
    assert(
      loginData.user?.role === 'PLATFORM_ADMIN',
      'Authenticated user is verified PLATFORM_ADMIN',
      `Role: ${loginData.user?.role}`
    );
    platformToken = loginData.token;
  } catch (err: any) {
    assert(false, 'Platform administrator login', err.message);
  }

  // 2. Submit Hospital Registration Application (KPME License Application)
  let createdRequestId = '';
  try {
    const regRes = await fetch(`${API_BASE}/auth/request-hospital-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalName: 'Aster CMI Hospital (Hebbal)',
        hospitalAddress: 'No. 43/42, NH 44, Sahakar Nagar, Hebbal',
        area: 'Hebbal',
        officialEmail: 'emergency.hebbal@asterhospital.com',
        emergencyPhone: '+91-80-43444444',
        regNumber: 'KPME/BLR/2023/9102',
        applicantName: 'Dr. Nitish Shetty',
        applicantDesignation: 'Chief of Medical Operations',
      }),
    });
    const regData = await regRes.json();
    assert(
      (regRes.status === 200 || regRes.status === 202) && regData.success === true,
      'Institutional KPME registration request submitted successfully',
      `Status: ${regRes.status}, Message: ${regData.message}`
    );
    createdRequestId = regData.applicationId;
  } catch (err: any) {
    assert(false, 'Submit hospital registration application', err.message);
  }

  // 3. List Access Requests as Platform Administrator
  try {
    const listRes = await fetch(`${API_BASE}/platform/requests`, {
      headers: { Authorization: `Bearer ${platformToken}` },
    });
    const listData = await listRes.json();
    assert(
      listRes.status === 200 && listData.success === true && Array.isArray(listData.data),
      'GET /platform/requests returns pending institutional verification queue',
      `Count: ${listData.count}`
    );
    const found = listData.data.find((r: any) => r.id === createdRequestId || r.hospitalName.includes('Aster CMI'));
    assert(found !== undefined, 'Newly submitted Aster CMI application appears in verification queue');
    if (!createdRequestId && found) {
      createdRequestId = found.id;
    }
  } catch (err: any) {
    assert(false, 'List platform requests query', err.message);
  }

  // 4. Approve Hospital Access Request
  if (createdRequestId) {
    try {
      const approveRes = await fetch(`${API_BASE}/platform/requests/${createdRequestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${platformToken}`,
        },
        body: JSON.stringify({
          notes: 'KPME license authenticated with Karnataka Directorate of Health Services.',
        }),
      });
      const approveData = await approveRes.json();
      assert(
        approveRes.status === 200 && approveData.success === true,
        'POST /platform/requests/:id/approve approves request and activates administrator credentials',
        `Message: ${approveData.message}`
      );
    } catch (err: any) {
      assert(false, 'Approve platform request', err.message);
    }
  }

  // 5. Submit second request and Reject with Reason
  try {
    const regRes2 = await fetch(`${API_BASE}/auth/request-hospital-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalName: 'Unverified Nursing Home Test',
        hospitalAddress: 'Old Airport Road, Bengaluru',
        area: 'Domlur',
        officialEmail: 'unverified@fakehospital.org',
        emergencyPhone: '+91-80-11112222',
        regNumber: 'INVALID/KPME/0000',
        applicantName: 'Unknown Applicant',
        applicantDesignation: 'Staff',
      }),
    });
    const regData2 = await regRes2.json();
    const req2Id = regData2.applicationId;

    if (req2Id) {
      const rejectRes = await fetch(`${API_BASE}/platform/requests/${req2Id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${platformToken}`,
        },
        body: JSON.stringify({
          reason: 'Invalid KPME license number. Facility not listed on Karnataka medical registry.',
        }),
      });
      const rejectData = await rejectRes.json();
      assert(
        rejectRes.status === 200 && rejectData.success === true,
        'POST /platform/requests/:id/reject rejects invalid application with reason',
        `Message: ${rejectData.message}`
      );
    }
  } catch (err: any) {
    assert(false, 'Reject platform request test', err.message);
  }

  // 6. System Freshness Overview Telemetry
  try {
    const freshRes = await fetch(`${API_BASE}/platform/freshness`, {
      headers: { Authorization: `Bearer ${platformToken}` },
    });
    const freshData = await freshRes.json();
    assert(
      freshRes.status === 200 && freshData.success === true && !!freshData.metrics,
      'GET /platform/freshness returns platform-wide data freshness telemetry'
    );
    assert(
      freshData.metrics.total >= 4 && typeof freshData.metrics.healthPercentage === 'number',
      `Freshness health metrics computed: ${freshData.metrics.healthPercentage}% health across ${freshData.metrics.total} hospitals`,
      `Live: ${freshData.metrics.live}, Recent: ${freshData.metrics.recent}, Stale: ${freshData.metrics.stale}`
    );
    assert(
      freshData.data.every((h: any) => h.availableIcuBeds !== undefined && h.freshnessStatus !== undefined),
      'All hospital telemetry rows include ICU availability and freshness classification'
    );
  } catch (err: any) {
    assert(false, 'System freshness overview query', err.message);
  }

  // 7. Role Isolation: Hospital Admin cannot access platform governance endpoints
  try {
    const vicLogin = await fetch(`${API_BASE}/auth/login-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@victoria.gov.in',
        password: 'VictoriaAdmin@123',
      }),
    });
    const vicData = await vicLogin.json();
    const trespassRes = await fetch(`${API_BASE}/platform/requests`, {
      headers: { Authorization: `Bearer ${vicData.token}` },
    });
    assert(
      trespassRes.status === 403,
      'Hospital administrator attempting platform governance access returns 403 Forbidden'
    );
  } catch (err: any) {
    assert(false, 'Platform role isolation check', err.message);
  }

  // 8. Real-Time Socket.IO Availability Event Broadcast Test
  try {
    const socketClient = ClientIO(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    const socketPromise = new Promise<{ hospitalId: string; updatedAt: string }>((resolve, reject) => {
      const timer = setTimeout(() => {
        socketClient.disconnect();
        reject(new Error('Timed out waiting for Socket.IO event hospital_resource_updated'));
      }, 5000);

      socketClient.on('connect', () => {
        console.log('    [Socket.IO Client] Connected to backend on port 5000');
      });

      socketClient.on('hospital_resource_updated', (data) => {
        clearTimeout(timer);
        socketClient.disconnect();
        resolve(data);
      });
    });

    // Authenticate Victoria Admin and commit a live resource update to trigger Socket.IO
    const vicLogin = await fetch(`${API_BASE}/auth/login-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@victoria.gov.in',
        password: 'VictoriaAdmin@123',
      }),
    });
    const vicData = await vicLogin.json();

    // Trigger resource update
    await fetch(`${API_BASE}/admin/hospitals/hosp-victoria/resources`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vicData.token}`,
      },
      body: JSON.stringify({
        beds: [
          { category: 'EMERGENCY_ICU', totalBeds: 24, occupiedBeds: 16, availableBeds: 8 },
        ],
        changeSummary: 'Socket.IO live broadcast verification pulse.',
      }),
    });

    const receivedEvent = await socketPromise;
    assert(
      receivedEvent.hospitalId === 'hosp-victoria' && !!receivedEvent.updatedAt,
      'Socket.IO broadcasts hospital_resource_updated event in real-time across connected discovery clients',
      `Received event for hospital: ${receivedEvent.hospitalId} at ${receivedEvent.updatedAt}`
    );
  } catch (err: any) {
    assert(false, 'Socket.IO broadcast verification', err.message);
  }

  console.log('\n========================================================================');
  console.log(`  STAGE 6 TEST RESULTS: ${passed} PASSED | ${failed} FAILED  `);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage6Tests();
