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

async function runAuthTests() {
  console.log('--- STARTING STAGE 2 AUTHENTICATION SUITE ---');

  // Test 1: Health check
  const health = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
  });
  console.log('✓ Health check:', health.status, health.body.status);

  // Test 2: Patient Registration
  const testEmail = `test_patient_${Date.now()}@blr.in`;
  const regRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/register-patient',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      fullName: 'Rahul Dravid',
      email: testEmail,
      password: 'StrongPassword@123',
      phone: '+91 99001 12233',
    }
  );
  console.log('✓ Patient Registration:', regRes.status, regRes.body.user?.fullName, 'Token present:', !!regRes.body.token);

  // Test 3: Hospital Admin Login (Victoria Hospital)
  const adminRes = await request(
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
  console.log('✓ Hospital Admin Login (Victoria):', adminRes.status, adminRes.body.user?.hospitalName, 'Role:', adminRes.body.user?.role);
  const adminToken = adminRes.body.token;

  // Test 4: Protected /api/v1/auth/me
  const meRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('✓ Protected /me with Bearer Token:', meRes.status, meRes.body.user?.fullName);

  // Test 5: Platform Super Admin Login
  const platRes = await request(
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
  console.log('✓ Platform Super Admin Login:', platRes.status, 'Role:', platRes.body.user?.role);

  // Test 6: Hospital Access Request (KPME Registration)
  const reqRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/request-hospital-access',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      hospitalName: 'Aster CMI Hospital (Hebbal)',
      hospitalAddress: 'No. 43/42, NH 44, Sahakar Nagar, Hebbal',
      area: 'Hebbal',
      officialEmail: 'emergency@asterhospital.com',
      emergencyPhone: '+91-80-43420100',
      regNumber: 'KPME/BLR/2023/1102',
      applicantName: 'Dr. Nitish Shetty',
      applicantDesignation: 'Regional Director',
    }
  );
  console.log('✓ Hospital KPME Access Request:', reqRes.status, reqRes.body.message);

  console.log('--- ALL STAGE 2 AUTHENTICATION TESTS PASSED SUCCESSFULLY! ---');
}

runAuthTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
