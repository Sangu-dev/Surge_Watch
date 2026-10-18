import type { Hospital, BedBreakdown, StaffBreakdown, AmbulanceInfo, AmbulanceRecord, BedsSummary, StaffSummary, AmbulanceSummary } from '../types';

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateHospitalDemoResources(hospitalId: string, hospitalName: string): {
  beds: BedBreakdown[];
  bedsSummary: BedsSummary;
  staff: StaffBreakdown[];
  staffSummary: StaffSummary;
  ambulances: AmbulanceInfo[];
  ambulanceFleet: AmbulanceRecord[];
  ambulanceSummary: AmbulanceSummary;
} {
  const hash = hashString(`${hospitalName}:${hospitalId}`);

  // Beds breakdown
  const icuTotal = 8 + (hash % 16); // 8 - 23
  const icuAvail = 2 + (hash % Math.max(2, Math.floor(icuTotal * 0.4)));
  const icuOcc = icuTotal - icuAvail;

  const traumaTotal = 6 + ((hash >> 2) % 10); // 6 - 15
  const traumaAvail = 1 + ((hash >> 2) % Math.max(2, Math.floor(traumaTotal * 0.4)));
  const traumaOcc = traumaTotal - traumaAvail;

  const erTotal = 16 + ((hash >> 3) % 24); // 16 - 39
  const erAvail = 4 + ((hash >> 3) % Math.max(2, Math.floor(erTotal * 0.45)));
  const erOcc = erTotal - erAvail;

  const oxTotal = 14 + ((hash >> 4) % 18); // 14 - 31
  const oxAvail = 3 + ((hash >> 4) % Math.max(2, Math.floor(oxTotal * 0.4)));
  const oxOcc = oxTotal - oxAvail;

  const pedTotal = 8 + ((hash >> 5) % 12); // 8 - 19
  const pedAvail = 2 + ((hash >> 5) % Math.max(2, Math.floor(pedTotal * 0.4)));
  const pedOcc = pedTotal - pedAvail;

  const totalBeds = icuTotal + traumaTotal + erTotal + oxTotal + pedTotal;
  const availableBeds = icuAvail + traumaAvail + erAvail + oxAvail + pedAvail;
  const occupiedBeds = totalBeds - availableBeds;

  const beds: BedBreakdown[] = [
    {
      category: 'EMERGENCY_ICU',
      categoryLabel: 'Emergency ICU Beds',
      totalBeds: icuTotal,
      occupiedBeds: icuOcc,
      availableBeds: icuAvail,
      dataProvenance: 'DEMO',
    },
    {
      category: 'TRAUMA_RESUSCITATION',
      categoryLabel: 'Trauma Resuscitation Bays',
      totalBeds: traumaTotal,
      occupiedBeds: traumaOcc,
      availableBeds: traumaAvail,
      dataProvenance: 'DEMO',
    },
    {
      category: 'EMERGENCY_GENERAL',
      categoryLabel: 'General Emergency Beds',
      totalBeds: erTotal,
      occupiedBeds: erOcc,
      availableBeds: erAvail,
      dataProvenance: 'DEMO',
    },
    {
      category: 'OXYGEN_CRITICAL',
      categoryLabel: 'High-Flow Oxygen Beds',
      totalBeds: oxTotal,
      occupiedBeds: oxOcc,
      availableBeds: oxAvail,
      dataProvenance: 'DEMO',
    },
    {
      category: 'PEDIATRIC_EMERGENCY',
      categoryLabel: 'Pediatric Emergency Beds',
      totalBeds: pedTotal,
      occupiedBeds: pedOcc,
      availableBeds: pedAvail,
      dataProvenance: 'DEMO',
    },
  ];

  const bedsSummary: BedsSummary = {
    totalBeds,
    availableBeds,
    occupiedBeds,
    icuBeds: { total: icuTotal, available: icuAvail, occupied: icuOcc },
    emergencyBeds: { total: erTotal, available: erAvail, occupied: erOcc },
  };

  // Staff breakdown
  const docPhys = 6 + (hash % 8);
  const docPhysAvail = 2 + (hash % 3);
  const docSurg = 2 + ((hash >> 2) % 4);
  const docSurgAvail = 1 + ((hash >> 2) % 2);
  const docAnesth = 2 + ((hash >> 3) % 3);
  const docAnesthAvail = 1 + ((hash >> 3) % 2);

  const nurseDuty = 14 + ((hash >> 4) % 16);
  const nurseDutyAvail = 4 + ((hash >> 4) % 6);
  const nurseIcu = 6 + ((hash >> 5) % 8);
  const nurseIcuAvail = 2 + ((hash >> 5) % 3);

  const doctorsOnDuty = docPhys + docSurg + docAnesth;
  const doctorsAvailable = docPhysAvail + docSurgAvail + docAnesthAvail;
  const nursesOnDuty = nurseDuty + nurseIcu;
  const nursesAvailable = nurseDutyAvail + nurseIcuAvail;
  const shiftStatus = (hash % 3 === 0) ? 'NIGHT_SHIFT' : 'DAY_SHIFT';

  const staff: StaffBreakdown[] = [
    {
      staffCategory: 'EMERGENCY_PHYSICIAN',
      label: 'Emergency Physicians',
      scheduledOnDutyCount: docPhys,
      currentlyAvailableCount: docPhysAvail,
      shiftStatus,
      metricDefinition: 'Board-certified emergency physicians on casualty triage',
      dataProvenance: 'DEMO',
    },
    {
      staffCategory: 'TRAUMA_SURGEON',
      label: 'Trauma Surgeons',
      scheduledOnDutyCount: docSurg,
      currentlyAvailableCount: docSurgAvail,
      shiftStatus,
      metricDefinition: 'Trauma surgeons on-call and on-site for emergency operations',
      dataProvenance: 'DEMO',
    },
    {
      staffCategory: 'ANESTHESIOLOGIST',
      label: 'Anesthesiologists',
      scheduledOnDutyCount: docAnesth,
      currentlyAvailableCount: docAnesthAvail,
      shiftStatus,
      metricDefinition: 'Critical care anesthesiologists available on shift',
      dataProvenance: 'DEMO',
    },
    {
      staffCategory: 'EMERGENCY_NURSE',
      label: 'Emergency Nurses',
      scheduledOnDutyCount: nurseDuty,
      currentlyAvailableCount: nurseDutyAvail,
      shiftStatus,
      metricDefinition: 'Triage and acute casualty care nurses on shift',
      dataProvenance: 'DEMO',
    },
    {
      staffCategory: 'ICU_TRIAGE_NURSE',
      label: 'ICU Triage Nurses',
      scheduledOnDutyCount: nurseIcu,
      currentlyAvailableCount: nurseIcuAvail,
      shiftStatus,
      metricDefinition: 'Intensive care unit specialized triage nurses',
      dataProvenance: 'DEMO',
    },
  ];

  const staffSummary: StaffSummary = {
    doctorsOnDuty,
    doctorsAvailable,
    doctorShiftStatus: shiftStatus,
    nursesOnDuty,
    nursesAvailable,
    nurseShiftStatus: shiftStatus,
  };

  // Ambulance fleet
  const ambTotal = 3 + (hash % 3); // 3 to 5
  const ambAvail = 1 + (hash % Math.max(1, ambTotal - 1)); // 1 to 3 ready
  const ambActive = ambTotal - ambAvail;

  const fleetTypes = [
    { type: 'ADVANCED_LIFE_SUPPORT_ALS', label: 'ALS Ambulance (Advanced Life Support)' },
    { type: 'BASIC_LIFE_SUPPORT_BLS', label: 'BLS Ambulance (Basic Life Support)' },
    { type: 'MOBILE_ICU', label: 'Mobile ICU Unit' },
    { type: 'ADVANCED_LIFE_SUPPORT_ALS', label: 'ALS Ambulance (Advanced Life Support)' },
    { type: 'BASIC_LIFE_SUPPORT_BLS', label: 'BLS Ambulance (Basic Life Support)' },
  ];

  const prefixSeries = ['KA-01-EA', 'KA-05-MB', 'KA-51-EX', 'KA-03-HA', 'KA-04-TR'];

  const ambulanceFleet: AmbulanceRecord[] = [];
  for (let idx = 0; idx < ambTotal; idx++) {
    const isReady = idx < ambAvail;
    const plateNum = 100 + ((hash * (idx + 1) * 37) % 899);
    const series = prefixSeries[idx % prefixSeries.length];
    ambulanceFleet.push({
      id: `${hospitalId}-amb-${idx + 1}`,
      registrationPlate: `${series}-${plateNum}`,
      ambulanceType: fleetTypes[idx].type,
      typeLabel: fleetTypes[idx].label,
      status: isReady ? 'AVAILABLE' : (idx === ambAvail ? 'ASSIGNED' : 'EN_ROUTE'),
      currentLocation: isReady ? `${hospitalName} Base Station` : 'In Transit / Dispatched',
      dataProvenance: 'DEMO',
    });
  }

  const alsCount = ambulanceFleet.filter(a => a.ambulanceType === 'ADVANCED_LIFE_SUPPORT_ALS').length;
  const blsCount = ambulanceFleet.filter(a => a.ambulanceType === 'BASIC_LIFE_SUPPORT_BLS').length;
  const icuCount = ambulanceFleet.filter(a => a.ambulanceType === 'MOBILE_ICU').length;

  const ambulances: AmbulanceInfo[] = [
    {
      ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS',
      label: 'ALS Ambulance (Advanced Life Support)',
      totalCount: alsCount,
      availableReadyCount: ambulanceFleet.filter(a => a.ambulanceType === 'ADVANCED_LIFE_SUPPORT_ALS' && a.status === 'AVAILABLE').length,
      inTransitCount: ambulanceFleet.filter(a => a.ambulanceType === 'ADVANCED_LIFE_SUPPORT_ALS' && a.status !== 'AVAILABLE').length,
    },
    {
      ambulanceType: 'BASIC_LIFE_SUPPORT_BLS',
      label: 'BLS Ambulance (Basic Life Support)',
      totalCount: blsCount,
      availableReadyCount: ambulanceFleet.filter(a => a.ambulanceType === 'BASIC_LIFE_SUPPORT_BLS' && a.status === 'AVAILABLE').length,
      inTransitCount: ambulanceFleet.filter(a => a.ambulanceType === 'BASIC_LIFE_SUPPORT_BLS' && a.status !== 'AVAILABLE').length,
    },
  ];

  if (icuCount > 0) {
    ambulances.push({
      ambulanceType: 'MOBILE_ICU',
      label: 'Mobile ICU Unit',
      totalCount: icuCount,
      availableReadyCount: ambulanceFleet.filter(a => a.ambulanceType === 'MOBILE_ICU' && a.status === 'AVAILABLE').length,
      inTransitCount: ambulanceFleet.filter(a => a.ambulanceType === 'MOBILE_ICU' && a.status !== 'AVAILABLE').length,
    });
  }

  const ambulanceSummary: AmbulanceSummary = {
    totalAmbulances: ambTotal,
    availableAmbulances: ambAvail,
    assignedAmbulances: ambActive,
  };

  return {
    beds,
    bedsSummary,
    staff,
    staffSummary,
    ambulances,
    ambulanceFleet,
    ambulanceSummary,
  };
}

/**
 * Ensures any hospital record (including unintegrated OpenStreetMap nodes)
 * has populated bed, staff, and ambulance availability simulation data
 * with transparent DEMO provenance labeling.
 */
export function getHospitalWithResources(hospital: Hospital): Hospital {
  const hasExistingBeds = hospital.beds && hospital.beds.length > 0;
  const hasExistingStaff = hospital.staff && hospital.staff.length > 0;
  const hasExistingAmb = (hospital.ambulanceFleet && hospital.ambulanceFleet.length > 0) || (hospital.ambulances && hospital.ambulances.length > 0);

  if (hasExistingBeds && hasExistingStaff && hasExistingAmb && hospital.bedsSummary) {
    return hospital;
  }

  const generated = generateHospitalDemoResources(hospital.id, hospital.name);

  return {
    ...hospital,
    beds: hasExistingBeds ? hospital.beds : generated.beds,
    bedsSummary: hospital.bedsSummary || generated.bedsSummary,
    staff: hasExistingStaff ? hospital.staff : generated.staff,
    staffSummary: hospital.staffSummary || generated.staffSummary,
    ambulances: (hospital.ambulances && hospital.ambulances.length > 0) ? hospital.ambulances : generated.ambulances,
    ambulanceFleet: (hospital.ambulanceFleet && hospital.ambulanceFleet.length > 0) ? hospital.ambulanceFleet : generated.ambulanceFleet,
    ambulanceSummary: hospital.ambulanceSummary || generated.ambulanceSummary,
    capacityConnected: true,
    dataProvenance: hospital.dataProvenance === 'MANUAL' || hospital.dataProvenance === 'LIVE_INTEGRATION' ? hospital.dataProvenance : 'DEMO',
    isDemoData: hospital.dataProvenance === 'MANUAL' || hospital.dataProvenance === 'LIVE_INTEGRATION' ? false : true,
    provenanceNotice: hospital.dataProvenance === 'MANUAL' || hospital.dataProvenance === 'LIVE_INTEGRATION'
      ? hospital.provenanceNotice
      : 'Demonstration synthetic resource simulation. Provided for prototype evaluation — call facility directly to confirm.',
  };
}
