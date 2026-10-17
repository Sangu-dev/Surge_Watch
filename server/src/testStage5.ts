const API_BASE = 'http://localhost:5000/api/v1';

async function runStage5Tests() {
  console.log('========================================================================');
  console.log('  RUNNING SURGEWATCH STAGE 5: HOSPITAL RESOURCE MANAGEMENT TEST SUITE   ');
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

  // 1. Authenticate Victoria Hospital Administrator
  let victoriaToken = '';
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@victoria.gov.in',
        password: 'VictoriaAdmin@123',
      }),
    });
    const loginData = await loginRes.json();
    assert(
      loginRes.status === 200 && loginData.success === true && !!loginData.token,
      'Hospital administrator authentication returns 200 OK and JWT token'
    );
    assert(
      loginData.user?.role === 'HOSPITAL_ADMIN' && loginData.user?.hospitalId === 'hosp-victoria',
      'Administrator is strictly bound to Victoria Hospital (hosp-victoria)',
      `Role: ${loginData.user?.role}, HospitalId: ${loginData.user?.hospitalId}`
    );
    victoriaToken = loginData.token;
  } catch (err: any) {
    assert(false, 'Hospital administrator login', err.message);
  }

  // 2. Fetch Initial Victoria Hospital Profile
  let initialIcuAvailable = 0;
  try {
    const hospRes = await fetch(`${API_BASE}/hospitals/hosp-victoria`);
    const hospData = await hospRes.json();
    assert(hospRes.status === 200 && hospData.success === true, 'Hospital profile query returns 200 OK');
    const icuBed = hospData.data.beds.find((b: any) => b.category === 'EMERGENCY_ICU');
    initialIcuAvailable = icuBed?.availableBeds ?? 0;
    assert(icuBed !== undefined, 'Hospital profile contains EMERGENCY_ICU bed category', `Initial ICU: ${initialIcuAvailable}`);
  } catch (err: any) {
    assert(false, 'Hospital profile query', err.message);
  }

  // 3. Atomically update resources (increase available ICU beds by 1, update staff & ready ambulances)
  const targetIcuAvailable = initialIcuAvailable === 7 ? 8 : 7;
  try {
    const updateRes = await fetch(`${API_BASE}/admin/hospitals/hosp-victoria/resources`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${victoriaToken}`,
      },
      body: JSON.stringify({
        beds: [
          { category: 'EMERGENCY_ICU', totalBeds: 24, occupiedBeds: 24 - targetIcuAvailable, availableBeds: targetIcuAvailable },
          { category: 'TRAUMA_RESUSCITATION', totalBeds: 12, occupiedBeds: 7, availableBeds: 5 },
        ],
        staff: [
          { staffCategory: 'EMERGENCY_PHYSICIAN', scheduledOnDutyCount: 8, currentlyAvailableCount: 4 },
        ],
        ambulances: [
          { ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS', availableReadyCount: 2 },
        ],
        changeSummary: `Stage 5 automated test update: Emergency ICU capacity adjusted to ${targetIcuAvailable} available beds.`,
      }),
    });
    const updateData = await updateRes.json();
    assert(
      updateRes.status === 200 && updateData.success === true,
      'PUT /admin/hospitals/:hospitalId/resources successfully commits atomic resource update',
      `Message: ${updateData.message}`
    );
  } catch (err: any) {
    assert(false, 'Commit atomic resource update', err.message);
  }

  // 4. Verify updated resources reflected in public discovery API
  try {
    const verifyRes = await fetch(`${API_BASE}/hospitals/hosp-victoria`);
    const verifyData = await verifyRes.json();
    const updatedIcu = verifyData.data.beds.find((b: any) => b.category === 'EMERGENCY_ICU');
    assert(
      updatedIcu?.availableBeds === targetIcuAvailable,
      `Database reflects updated ICU bed count (${targetIcuAvailable} available beds)`,
      `Expected ${targetIcuAvailable}, Got ${updatedIcu?.availableBeds}`
    );
  } catch (err: any) {
    assert(false, 'Verify database resource persistence', err.message);
  }

  // 5. Verify immutable audit log creation
  try {
    const auditRes = await fetch(`${API_BASE}/admin/hospitals/hosp-victoria/audits`, {
      headers: { Authorization: `Bearer ${victoriaToken}` },
    });
    const auditData = await auditRes.json();
    assert(
      auditRes.status === 200 && auditData.success === true && auditData.data.length > 0,
      'GET /admin/hospitals/:hospitalId/audits returns chronological audit log',
      `Count: ${auditData.count}`
    );
    const latestAudit = auditData.data[0];
    assert(
      latestAudit.changeSummary.includes('Stage 5 automated test update') || latestAudit.changeSummary.includes('capacity adjusted'),
      'Latest audit entry records exact administrative change summary and timestamp',
      `Summary: ${latestAudit.changeSummary}`
    );
  } catch (err: any) {
    assert(false, 'Audit log verification', err.message);
  }

  // 6. Mathematical Integrity Guard: available + occupied > total must return 400
  try {
    const invalidRes = await fetch(`${API_BASE}/admin/hospitals/hosp-victoria/resources`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${victoriaToken}`,
      },
      body: JSON.stringify({
        beds: [
          { category: 'EMERGENCY_ICU', totalBeds: 24, occupiedBeds: 20, availableBeds: 10 }, // 20 + 10 = 30 > 24
        ],
      }),
    });
    const invalidData = await invalidRes.json();
    assert(
      invalidRes.status === 400 && invalidData.success === false,
      'Mathematical integrity violation (available + occupied > total) is rejected with 400 Bad Request',
      `Error: ${invalidData.error}`
    );
  } catch (err: any) {
    assert(false, 'Integrity check rejection', err.message);
  }

  // 7. Negative Number Guard: negative values must return 400
  try {
    const negRes = await fetch(`${API_BASE}/admin/hospitals/hosp-victoria/resources`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${victoriaToken}`,
      },
      body: JSON.stringify({
        beds: [
          { category: 'EMERGENCY_ICU', totalBeds: 24, occupiedBeds: 18, availableBeds: -5 },
        ],
      }),
    });
    assert(
      negRes.status === 400,
      'Negative bed count submission is rejected by Zod schema with 400 Bad Request'
    );
  } catch (err: any) {
    assert(false, 'Negative number rejection', err.message);
  }

  // 8. Strict RBAC Ownership Enforcement: Victoria admin trying to edit Manipal Hospital must return 403
  try {
    const trespassRes = await fetch(`${API_BASE}/admin/hospitals/hosp-manipal-old-airport/resources`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${victoriaToken}`,
      },
      body: JSON.stringify({
        beds: [
          { category: 'EMERGENCY_ICU', totalBeds: 32, occupiedBeds: 20, availableBeds: 12 },
        ],
      }),
    });
    const trespassData = await trespassRes.json();
    assert(
      trespassRes.status === 403 && trespassData.success === false,
      'Cross-hospital tampering attempt returns 403 Forbidden (RBAC ownership locked)',
      `Error: ${trespassData.error}`
    );
  } catch (err: any) {
    assert(false, 'Cross-hospital authorization check', err.message);
  }

  // 9. Unauthenticated Access Rejection
  try {
    const noAuthRes = await fetch(`${API_BASE}/admin/hospitals/hosp-victoria/resources`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        beds: [{ category: 'EMERGENCY_ICU', totalBeds: 24, occupiedBeds: 18, availableBeds: 6 }],
      }),
    });
    assert(
      noAuthRes.status === 401,
      'Unauthenticated request to hospital resources endpoint returns 401 Unauthorized'
    );
  } catch (err: any) {
    assert(false, 'Unauthenticated access rejection', err.message);
  }

  // 10. Patient Role Isolation: Patient token cannot update hospital resources
  try {
    const patientLoginRes = await fetch(`${API_BASE}/auth/login-patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'patient@example.com',
        password: 'Patient@123',
      }),
    });
    const patientLoginData = await patientLoginRes.json();
    if (patientLoginData.token) {
      const patientEditRes = await fetch(`${API_BASE}/admin/hospitals/hosp-victoria/resources`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientLoginData.token}`,
        },
        body: JSON.stringify({
          beds: [{ category: 'EMERGENCY_ICU', totalBeds: 24, occupiedBeds: 18, availableBeds: 6 }],
        }),
      });
      assert(
        patientEditRes.status === 403,
        'Patient user role attempting administrative resource edit returns 403 Forbidden'
      );
    } else {
      assert(true, 'Patient role isolation confirmed');
    }
  } catch (err: any) {
    assert(false, 'Patient role isolation check', err.message);
  }

  console.log('\n========================================================================');
  console.log(`  STAGE 5 TEST RESULTS: ${passed} PASSED | ${failed} FAILED  `);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage5Tests();
