import { io as ClientIO } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api/v1';
const SOCKET_URL = 'http://localhost:5000';

async function runResourceFeatureTests() {
  console.log('========================================================================');
  console.log('  SURGEWATCH RESOURCE AVAILABILITY, STAFFING & AMBULANCE FLEET TESTS   ');
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
    // ------------------------------------------------------------------------
    // SECTION 1: Bed Availability & Mathematical Integrity
    // ------------------------------------------------------------------------
    console.log('--- 1. Testing Bed Availability & Derived Mathematical Consistency ---');
    const hospRes = await fetch(`${API_BASE}/hospitals/hosp-victoria`);
    const hospJson = await hospRes.json();
    assert(hospRes.status === 200 && hospJson.success, 'Fetch hospital profile (Victoria)');

    const hospital = hospJson.data;
    assert(hospital.bedsSummary !== undefined, 'Hospital profile includes structured bedsSummary');
    assert(typeof hospital.bedsSummary.totalBeds === 'number' && hospital.bedsSummary.totalBeds > 0, `Total beds is positive number: ${hospital.bedsSummary.totalBeds}`);
    assert(typeof hospital.bedsSummary.availableBeds === 'number', `Available beds: ${hospital.bedsSummary.availableBeds}`);
    assert(typeof hospital.bedsSummary.occupiedBeds === 'number', `Occupied beds: ${hospital.bedsSummary.occupiedBeds}`);

    // Mathematical consistency check: occupied = total - available
    const expectedOccupied = hospital.bedsSummary.totalBeds - hospital.bedsSummary.availableBeds;
    assert(hospital.bedsSummary.occupiedBeds === expectedOccupied, `Bed math verified: occupied (${hospital.bedsSummary.occupiedBeds}) = total (${hospital.bedsSummary.totalBeds}) - available (${hospital.bedsSummary.availableBeds})`);

    // ICU & ER bed verification
    const icuAvail = hospital.bedsSummary.icuBedsAvailable ?? hospital.bedsSummary.icuBeds?.available;
    const erAvail = hospital.bedsSummary.emergencyBedsAvailable ?? hospital.bedsSummary.emergencyBeds?.available;
    assert(typeof icuAvail === 'number', `ICU beds available: ${icuAvail}`);
    assert(typeof erAvail === 'number', `Emergency/ER beds available: ${erAvail}`);

    // ------------------------------------------------------------------------
    // SECTION 2: Medical Staff Availability & Shift Tracking
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing Medical Staff Availability & Shift Information ---');
    assert(hospital.staffSummary !== undefined, 'Hospital profile includes structured staffSummary');
    assert(typeof hospital.staffSummary.doctorsOnDuty === 'number' && hospital.staffSummary.doctorsOnDuty > 0, `Doctors on duty: ${hospital.staffSummary.doctorsOnDuty}`);
    assert(typeof hospital.staffSummary.doctorsAvailable === 'number', `Doctors available: ${hospital.staffSummary.doctorsAvailable}`);
    assert(typeof hospital.staffSummary.nursesOnDuty === 'number' && hospital.staffSummary.nursesOnDuty > 0, `Nurses on duty: ${hospital.staffSummary.nursesOnDuty}`);
    assert(typeof hospital.staffSummary.nursesAvailable === 'number', `Nurses available: ${hospital.staffSummary.nursesAvailable}`);
    assert(!!hospital.staffSummary.doctorShiftStatus, `Doctor shift status: ${hospital.staffSummary.doctorShiftStatus}`);
    assert(!!hospital.staffSummary.nurseShiftStatus, `Nurse shift status: ${hospital.staffSummary.nurseShiftStatus}`);

    // Verify staff breakdown array has shiftStatus
    assert(Array.isArray(hospital.staff) && hospital.staff.length > 0, 'Hospital has detailed staff roster array');
    const sampleStaff = hospital.staff[0];
    assert(!!sampleStaff.shiftStatus, `Staff role "${sampleStaff.label}" has shift status: ${sampleStaff.shiftStatus}`);

    // ------------------------------------------------------------------------
    // SECTION 3: Ambulance Fleet & Vehicle Inventory
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing Ambulance Fleet & Status Tracking ---');
    assert(hospital.ambulanceSummary !== undefined, 'Hospital profile includes structured ambulanceSummary');
    assert(typeof hospital.ambulanceSummary.totalAmbulances === 'number', `Total ambulances: ${hospital.ambulanceSummary.totalAmbulances}`);
    assert(typeof hospital.ambulanceSummary.availableAmbulances === 'number', `Available ambulances: ${hospital.ambulanceSummary.availableAmbulances}`);
    assert(typeof hospital.ambulanceSummary.assignedAmbulances === 'number', `Assigned/in-transit ambulances: ${hospital.ambulanceSummary.assignedAmbulances}`);

    // Fetch dedicated ambulances endpoint
    const ambListRes = await fetch(`${API_BASE}/emergency/ambulances?hospitalId=hosp-victoria`);
    const ambListJson = await ambListRes.json();
    assert(ambListRes.status === 200 && ambListJson.success, 'GET /emergency/ambulances returns 200 OK');
    assert(Array.isArray(ambListJson.data) && ambListJson.data.length > 0, `Fleet contains ${ambListJson.data.length} vehicles with license plates`);

    const firstAmbulance = ambListJson.data[0];
    assert(!!firstAmbulance.vehicleNumber || !!firstAmbulance.registrationPlate, `Vehicle identifier recorded: ${firstAmbulance.vehicleNumber || firstAmbulance.registrationPlate}`);
    assert(['AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'AT_SCENE', 'COMPLETED', 'AVAILABLE_READY', 'DISPATCHED_IN_TRANSIT'].includes(firstAmbulance.status), `Vehicle status compliant: ${firstAmbulance.status}`);

    // ------------------------------------------------------------------------
    // SECTION 4: Data Provenance & Anti-Fabrication Safeguards
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Data Provenance Classification & Disclaimers ---');
    assert(['DEMO', 'MANUAL', 'LIVE_INTEGRATION'].includes(hospital.dataProvenance), `Victoria Hospital data provenance is explicitly labeled: ${hospital.dataProvenance}`);
    assert(typeof hospital.provenanceNotice === 'string' && hospital.provenanceNotice.length > 0, `Explicit provenance notice present: "${hospital.provenanceNotice}"`);

    // Check OSM unlinked hospital (e.g. from /hospitals/nearby)
    const nearbyRes = await fetch(`${API_BASE}/hospitals/nearby?lat=12.9352&lon=77.6245&radiusKm=15`);
    const nearbyJson = await nearbyRes.json();
    assert(nearbyRes.status === 200 && nearbyJson.success, 'Nearby query returns 200 OK');
    
    // Find an unlinked OSM hospital (dataSource === 'osm')
    const unlinkedOsmHospital = nearbyJson.data.find((h: any) => h.dataSource === 'osm' && h.capacityConnected === false);
    if (unlinkedOsmHospital) {
      assert(unlinkedOsmHospital.dataProvenance === 'OSM_UNCONNECTED', 'Unlinked OSM hospital tagged OSM_UNCONNECTED');
      assert(unlinkedOsmHospital.beds.length === 0, 'Unlinked OSM hospital does NOT fabricate bed array');
      assert(unlinkedOsmHospital.staff.length === 0, 'Unlinked OSM hospital does NOT fabricate staff array');
      assert(unlinkedOsmHospital.ambulances.length === 0, 'Unlinked OSM hospital does NOT fabricate ambulance fleet');
    } else {
      console.log('  [INFO] All discovered hospitals in 15km radius');
    }

    // ------------------------------------------------------------------------
    // SECTION 5: Filter Endpoints (ER, Doctors, Nurses, Ambulances, ICU)
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Service Filtering for Hospital Discovery ---');
    const erFilterRes = await fetch(`${API_BASE}/hospitals?service=ER`);
    const erFilterJson = await erFilterRes.json();
    assert(erFilterRes.status === 200 && erFilterJson.success, 'Filter by service=ER returns 200 OK');
    assert(erFilterJson.data.every((h: any) => (h.bedsSummary?.emergencyBedsAvailable > 0 || h.bedsSummary?.emergencyBeds?.available > 0) || (h.emergencyServices && h.emergencyServices.includes('24/7 Emergency Casualty'))), 'All filtered hospitals have active ER capacity');

    const doctorFilterRes = await fetch(`${API_BASE}/hospitals?service=DOCTORS`);
    const doctorFilterJson = await doctorFilterRes.json();
    assert(doctorFilterRes.status === 200 && doctorFilterJson.success, 'Filter by service=DOCTORS returns 200 OK');
    assert(doctorFilterJson.data.every((h: any) => h.staffSummary?.doctorsAvailable > 0), 'All filtered hospitals have available doctors');

    const nurseFilterRes = await fetch(`${API_BASE}/hospitals?service=NURSES`);
    const nurseFilterJson = await nurseFilterRes.json();
    assert(nurseFilterRes.status === 200 && nurseFilterJson.success, 'Filter by service=NURSES returns 200 OK');
    assert(nurseFilterJson.data.every((h: any) => h.staffSummary?.nursesAvailable > 0), 'All filtered hospitals have available nurses');

    // ------------------------------------------------------------------------
    // SECTION 6: Emergency Ambulance Dispatch & Lifecycle Workflow
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Testing Emergency Ambulance Dispatch & Release Lifecycle ---');
    // Connect Socket.IO to receive dispatch updates
    const socket = ClientIO(SOCKET_URL, { reconnection: false, timeout: 5000 });
    let socketReceivedDispatch = false;
    let socketReceivedRelease = false;

    await new Promise<void>((resolve) => {
      socket.on('connect', () => {
        resolve();
      });
      socket.on('emergency_dispatched', (payload: any) => {
        if (payload?.hospitalId === 'hosp-victoria' || payload?.ambulance?.hospitalId === 'hosp-victoria') {
          socketReceivedDispatch = true;
        }
      });
      socket.on('emergency_resolved', (payload: any) => {
        if (payload?.emergencyId) {
          socketReceivedRelease = true;
        }
      });
    });

    // Pick an available ambulance for Victoria
    const availableAmbulance = ambListJson.data.find((a: any) => a.status === 'AVAILABLE' || a.status === 'AVAILABLE_READY');
    assert(availableAmbulance !== undefined, `Found available ambulance: ${availableAmbulance?.registrationPlate || availableAmbulance?.vehicleNumber}`);

    if (availableAmbulance) {
      // 1. Dispatch ambulance for emergency
      const dispatchRes = await fetch(`${API_BASE}/emergency/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: 'hosp-victoria',
          ambulanceId: availableAmbulance.id,
          callerName: 'Test Emergency Incident',
          callerPhone: '+91 98888 77777',
          pickupAddress: 'Silk Board Junction, Hosur Road, Bengaluru',
          latitude: 12.9175,
          longitude: 77.6238,
          priority: 'CRITICAL',
          notes: 'Test dispatch execution'
        })
      });
      const dispatchJson = await dispatchRes.json();
      assert(dispatchRes.status === 200 && dispatchJson.success, `Ambulance dispatched via POST /emergency/dispatch`);
      const assignedVehicle = dispatchJson.assignedAmbulance || dispatchJson.data?.ambulance;
      assert(assignedVehicle.status === 'ASSIGNED' || assignedVehicle.status === 'EN_ROUTE', `Ambulance status updated to: ${assignedVehicle.status}`);
      assert(dispatchJson.disclaimer.includes('local software') || dispatchJson.disclaimer.includes('DEMONSTRATION') || dispatchJson.disclaimer.includes('SurgeWatch'), 'Dispatch response includes mandatory anti-fabrication safety disclaimer');

      // Wait 300ms for socket event
      await new Promise(r => setTimeout(r, 300));
      assert(socketReceivedDispatch, 'Socket.IO broadcast "emergency_dispatched" received by client');

      // 2. Transition ambulance status through operator workflow: EN_ROUTE -> AT_SCENE
      const statusUpdateRes = await fetch(`${API_BASE}/emergency/ambulances/${availableAmbulance.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'AT_SCENE',
          currentLocation: 'Silk Board Junction - On Site'
        })
      });
      const statusJson = await statusUpdateRes.json();
      assert(statusUpdateRes.status === 200 && statusJson.success, 'PATCH /emergency/ambulances/:id/status updated status to AT_SCENE');

      // 3. Complete emergency and release ambulance back to AVAILABLE
      const emergencyId = dispatchJson.emergencyRequest?.id || dispatchJson.data?.emergency?.id;
      const releaseRes = await fetch(`${API_BASE}/emergency/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergencyId: emergencyId,
          releaseStatus: 'COMPLETED',
          finalNotes: 'Patient safely admitted to Victoria Emergency Room'
        })
      });
      const releaseJson = await releaseRes.json();
      assert(releaseRes.status === 200 && releaseJson.success, 'POST /emergency/release returns ambulance to AVAILABLE and closes request');
      const releasedVehicle = releaseJson.data?.ambulance || releaseJson.assignedAmbulance;
      assert(releasedVehicle.status === 'AVAILABLE', `Ambulance restored to status: ${releasedVehicle.status}`);

      // Wait 300ms for release socket event
      await new Promise(r => setTimeout(r, 300));
      assert(socketReceivedRelease, 'Socket.IO broadcast "emergency_resolved" received by client');
    }

    socket.disconnect();

  } catch (err: any) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    console.log('\n========================================================================');
    console.log(`  FEATURE TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runResourceFeatureTests();
