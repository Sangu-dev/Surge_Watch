import { prisma } from './prisma.js';
import { requestHospitalAccess } from './controllers/authController.js';
import { approveAccessRequest, rejectAccessRequest } from './controllers/platformController.js';
import { getApprovedLocations, getNearbyHospitals } from './controllers/hospitalController.js';

// Helper to mock Express Request & Response objects
function createMockReqRes(body: any = {}, params: any = {}, query: any = {}) {
  let statusCode = 200;
  let responseData: any = null;

  const req: any = {
    body,
    params,
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

async function runDirectWorkflowTests() {
  console.log('========================================================================');
  console.log('  TEST SUITE: APPROVED HOSPITAL VISIBILITY DIRECT IN-PROCESS WORKFLOW   ');
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
    // Scenario 1: Register New Hospital in Jayanagar
    // -------------------------------------------------------------
    console.log('--- Step 1: Register New Hospital (Apollo Cradle Jayanagar) ---');
    const hospitalName = `Apollo Cradle Jayanagar (${Math.floor(1000 + Math.random() * 9000)})`;
    const regPayload = {
      hospitalName,
      hospitalAddress: '25, 4th T Block, Jayanagar, Bengaluru, Karnataka 560041',
      area: 'Jayanagar',
      officialEmail: `admin.${Date.now()}@apollocradle.org`,
      emergencyPhone: '+91 80 4668 8000',
      regNumber: `KPME/BLR/${Date.now().toString().slice(-6)}`,
      applicantName: 'Dr. Meera Nambiar',
      applicantDesignation: 'Medical Superintendent',
    };

    const { req: regReq, res: regRes } = createMockReqRes(regPayload);
    await requestHospitalAccess(regReq, regRes);
    assert(regRes.getStatusCode() === 201, 'Hospital registration returns 201 Created');
    const applicationId = regRes.getData()?.applicationId;
    assert(!!applicationId, 'Registration returns an applicationId', `ID: ${applicationId}`);

    // -------------------------------------------------------------
    // Scenario 2: Confirm Pending Status in Database
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Confirm Pending Status in Database ---');
    const reqInDb = await prisma.hospitalAccessRequest.findUnique({
      where: { id: applicationId },
      include: { hospital: true },
    });
    assert(reqInDb?.status === 'PENDING', 'HospitalAccessRequest status is PENDING', `Status: ${reqInDb?.status}`);
    assert(reqInDb?.hospital?.verificationStatus === 'PENDING', 'Linked Hospital record verificationStatus is PENDING', `Status: ${reqInDb?.hospital?.verificationStatus}`);

    // -------------------------------------------------------------
    // Scenario 3: Verify PENDING Hospital does NOT appear in Home Page Approved Locations
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Verify PENDING Hospital is NOT Visible in Approved Locations ---');
    const { req: locReq1, res: locRes1 } = createMockReqRes();
    await getApprovedLocations(locReq1, locRes1);
    assert(locRes1.getStatusCode() === 200, 'Approved locations returns 200 OK');
    const pendingInApproved = locRes1.getData()?.data?.find((h: any) => h.name === hospitalName);
    assert(!pendingInApproved, 'PENDING hospital is NOT included in approved locations for Home Page selection');

    // Also verify PENDING hospital is NOT returned by nearby discovery
    const { req: nearReq1, res: nearRes1 } = createMockReqRes({}, {}, { lat: '12.9250', lon: '77.5938', radiusKm: '5' });
    await getNearbyHospitals(nearReq1, nearRes1);
    assert(nearRes1.getStatusCode() === 200, 'Nearby discovery returns 200 OK');
    const pendingInNearby = nearRes1.getData()?.data?.find((h: any) => h.name === hospitalName);
    assert(!pendingInNearby, 'PENDING hospital is NOT included in nearby discovery search results');

    // -------------------------------------------------------------
    // Scenario 4: Admin Approves the Hospital
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Platform Admin Approves Hospital Request ---');
    const { req: appReq, res: appRes } = createMockReqRes(
      { notes: 'Verified KPME registration with Karnataka Medical Directorate.' },
      { id: applicationId }
    );
    await approveAccessRequest(appReq, appRes);
    assert(appRes.getStatusCode() === 200, 'Approve request returns 200 OK');
    assert(appRes.getData()?.success === true, 'Approve response confirms success');

    // -------------------------------------------------------------
    // Scenario 5: Confirm Database Status Updated to APPROVED / VERIFIED with Valid Coordinates
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Confirm Database Status Updated to VERIFIED with Valid Coordinates ---');
    const approvedInDb = await prisma.hospitalAccessRequest.findUnique({
      where: { id: applicationId },
      include: { hospital: true },
    });
    assert(approvedInDb?.status === 'APPROVED', 'Request status updated to APPROVED in DB', `Status: ${approvedInDb?.status}`);
    assert(approvedInDb?.hospital?.verificationStatus === 'VERIFIED', 'Hospital verificationStatus updated to VERIFIED in DB', `Status: ${approvedInDb?.hospital?.verificationStatus}`);
    assert(
      Math.abs((approvedInDb?.hospital?.latitude || 0) - 12.9250) < 0.05,
      'Hospital coordinates accurately resolved to Jayanagar zone (lat ~12.9250)',
      `Actual coordinates: lat=${approvedInDb?.hospital?.latitude}, lng=${approvedInDb?.hospital?.longitude}`
    );

    // -------------------------------------------------------------
    // Scenario 6: Verify Approved Hospital Automatically Appears in Approved Locations (Home Page Selection)
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Verify Approved Hospital is Now in Approved Locations (Home Page Selection) ---');
    const { req: locReq2, res: locRes2 } = createMockReqRes();
    await getApprovedLocations(locReq2, locRes2);
    assert(locRes2.getStatusCode() === 200, 'Approved locations returns 200 OK');
    const approvedInLocations = locRes2.getData()?.data?.find((h: any) => h.name === hospitalName);
    assert(!!approvedInLocations, 'Approved hospital is now automatically returned for Home Page location selection!');
    assert(approvedInLocations?.verificationStatus === 'VERIFIED', 'Returned hospital verificationStatus is VERIFIED');
    assert(approvedInLocations?.area === 'Jayanagar', 'Returned hospital area is Jayanagar');

    // Confirm Jayanagar area is also in the areas list
    const jayanagarArea = locRes2.getData()?.areas?.find((a: any) => a.name.toLowerCase().includes('jayanagar'));
    assert(!!jayanagarArea, 'Hospital area (Jayanagar) is included in the available localities list for Home Page dropdown');

    // -------------------------------------------------------------
    // Scenario 7: Verify Approved Hospital Appears in Location Search Results (around Jayanagar)
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Verify Approved Hospital Appears in Location Search Results ---');
    const { req: nearReq2, res: nearRes2 } = createMockReqRes({}, {}, { lat: '12.9250', lon: '77.5938', radiusKm: '5' });
    await getNearbyHospitals(nearReq2, nearRes2);
    assert(nearRes2.getStatusCode() === 200, 'Nearby discovery returns 200 OK');
    const approvedInNearby = nearRes2.getData()?.data?.find((h: any) => h.name === hospitalName);
    assert(!!approvedInNearby, 'Approved hospital appears in nearby search results for Jayanagar!');
    assert(approvedInNearby?.distanceKm <= 5.0, `Calculated distance is within 5 km perimeter (Distance: ${approvedInNearby?.distanceKm?.toFixed(2)} km)`);
    assert(approvedInNearby?.beds?.length > 0, 'Hospital has emergency bed availability categories');

    // -------------------------------------------------------------
    // Scenario 8 & 9: Register another hospital and Reject it
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Register Second Hospital and Reject it ---');
    const rejectedHospName = `Unlicensed Clinic (${Math.floor(1000 + Math.random() * 9000)})`;
    const { req: regReq2, res: regRes2 } = createMockReqRes({
      hospitalName: rejectedHospName,
      hospitalAddress: '99 Shady Lane, Koramangala',
      area: 'Koramangala',
      officialEmail: `fake.${Date.now()}@unlicensed.org`,
      emergencyPhone: '+91 80 1111 2222',
      regNumber: 'FAKE-KPME-999',
      applicantName: 'Anonymous',
      applicantDesignation: 'Unknown',
    });
    await requestHospitalAccess(regReq2, regRes2);
    const rejectedAppId = regRes2.getData()?.applicationId;
    assert(regRes2.getStatusCode() === 201 && !!rejectedAppId, 'Second hospital registration submitted for rejection test');

    const { req: rejReq, res: rejRes } = createMockReqRes(
      { reason: 'Failed KPME authentication. Fake registration details.' },
      { id: rejectedAppId }
    );
    await rejectAccessRequest(rejReq, rejRes);
    assert(rejRes.getStatusCode() === 200, 'Admin reject request returns 200 OK');

    // -------------------------------------------------------------
    // Scenario 10: Confirm Database Status Updated to REJECTED
    // -------------------------------------------------------------
    console.log('\n--- Step 9: Confirm Database Status is REJECTED ---');
    const rejectedInDb = await prisma.hospitalAccessRequest.findUnique({
      where: { id: rejectedAppId },
      include: { hospital: true },
    });
    assert(rejectedInDb?.status === 'REJECTED', 'HospitalAccessRequest status is REJECTED in DB', `Status: ${rejectedInDb?.status}`);
    assert(rejectedInDb?.hospital?.verificationStatus === 'REJECTED', 'Linked hospital verificationStatus is REJECTED in DB', `Status: ${rejectedInDb?.hospital?.verificationStatus}`);

    // -------------------------------------------------------------
    // Scenario 11: Verify Rejected Hospital NEVER appears in Approved Locations or Search Results
    // -------------------------------------------------------------
    console.log('\n--- Step 10: Verify Rejected Hospital NEVER Appears Publicly ---');
    const { req: locReq3, res: locRes3 } = createMockReqRes();
    await getApprovedLocations(locReq3, locRes3);
    const rejectedInLoc = locRes3.getData()?.data?.find((h: any) => h.name === rejectedHospName);
    assert(!rejectedInLoc, 'Rejected hospital does NOT appear in approved locations for Home Page');

    const { req: nearReq3, res: nearRes3 } = createMockReqRes({}, {}, { lat: '12.9352', lon: '77.6245', radiusKm: '5' });
    await getNearbyHospitals(nearReq3, nearRes3);
    const rejectedInSearch = nearRes3.getData()?.data?.find((h: any) => h.name === rejectedHospName);
    assert(!rejectedInSearch, 'Rejected hospital does NOT appear in nearby search results');

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`  WORKFLOW TEST RESULTS: ${passed} PASSED, ${failed} FAILED             `);
    console.log('========================================================================\n');
  } catch (error: any) {
    console.error('Test execution failed with error:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runDirectWorkflowTests();

