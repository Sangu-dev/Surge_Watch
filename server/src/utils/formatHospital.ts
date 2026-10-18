import { calculateHaversineDistance, estimateEmergencyTravelTime } from './spatial.js';
import { computeDataFreshness } from './freshness.js';

export const BED_LABELS: Record<string, string> = {
  EMERGENCY_ICU: 'Emergency ICU Beds',
  TRAUMA_RESUSCITATION: 'Trauma Resuscitation Bays',
  EMERGENCY_GENERAL: 'General Emergency Beds',
  OXYGEN_CRITICAL: 'High-Flow Oxygen Beds',
  PEDIATRIC_EMERGENCY: 'Pediatric Emergency Beds',
};

export const STAFF_LABELS: Record<string, string> = {
  EMERGENCY_PHYSICIAN: 'Emergency Physicians',
  TRAUMA_SURGEON: 'Trauma Surgeons',
  ANESTHESIOLOGIST: 'Anesthesiologists',
  ICU_TRIAGE_NURSE: 'ICU Triage Nurses',
  DUTY_MEDICAL_OFFICER: 'Duty Medical Officers',
  EMERGENCY_NURSE: 'Emergency Nurses',
  GENERAL_DUTY_NURSE: 'General Duty Nurses',
};

export const AMBULANCE_LABELS: Record<string, string> = {
  ADVANCED_LIFE_SUPPORT_ALS: 'ALS Ambulance (Advanced Life Support)',
  BASIC_LIFE_SUPPORT_BLS: 'BLS Ambulance (Basic Life Support)',
  MOBILE_ICU: 'Mobile ICU Unit',
  NEONATAL_AMBULANCE: 'Neonatal Care Ambulance',
};

export function formatHospitalPayload(hosp: any, lat?: number, lng?: number): any {
  let distanceKm = 0;
  let estimatedTravelTimeMins = 0;

  if (lat !== undefined && lng !== undefined) {
    distanceKm = calculateHaversineDistance(lat, lng, hosp.latitude, hosp.longitude);
    estimatedTravelTimeMins = estimateEmergencyTravelTime(distanceKm);
  }

  const freshness = computeDataFreshness(hosp.lastResourceUpdate);

  let parsedServices: string[] = [];
  try {
    parsedServices = typeof hosp.emergencyServices === 'string'
      ? JSON.parse(hosp.emergencyServices)
      : hosp.emergencyServices;
  } catch {
    parsedServices = [hosp.emergencyServices];
  }

  // Format beds with friendly labels and ensure consistency
  const formattedBeds = (hosp.beds || []).map((b: any) => {
    const totalBeds = b.totalBeds || 0;
    const availableBeds = b.availableBeds || 0;
    const occupiedBeds = b.occupiedBeds !== undefined ? b.occupiedBeds : Math.max(0, totalBeds - availableBeds);
    return {
      id: b.id,
      category: b.category,
      categoryLabel: BED_LABELS[b.category] || b.category.replace(/_/g, ' '),
      totalBeds,
      occupiedBeds,
      availableBeds,
      dataProvenance: b.dataProvenance || hosp.dataProvenance || 'DEMO',
    };
  });

  // Calculate Bed Summary
  const icuBed = formattedBeds.find((b: any) => b.category === 'EMERGENCY_ICU');
  const erBed = formattedBeds.find((b: any) => b.category === 'EMERGENCY_GENERAL' || b.category === 'TRAUMA_RESUSCITATION');
  const totalBedsCount = formattedBeds.reduce((acc: number, b: any) => acc + b.totalBeds, 0);
  const totalAvailableBedsCount = formattedBeds.reduce((acc: number, b: any) => acc + b.availableBeds, 0);
  const totalOccupiedBedsCount = formattedBeds.reduce((acc: number, b: any) => acc + b.occupiedBeds, 0);

  const bedsSummary = formattedBeds.length > 0 ? {
    totalBeds: totalBedsCount,
    availableBeds: totalAvailableBedsCount,
    occupiedBeds: totalOccupiedBedsCount,
    icuBedsAvailable: icuBed?.availableBeds || 0,
    emergencyBedsAvailable: erBed?.availableBeds || 0,
    icuBeds: {
      total: icuBed?.totalBeds || 0,
      available: icuBed?.availableBeds || 0,
      occupied: icuBed?.occupiedBeds || 0,
    },
    emergencyBeds: {
      total: erBed?.totalBeds || 0,
      available: erBed?.availableBeds || 0,
      occupied: erBed?.occupiedBeds || 0,
    },
  } : undefined;

  // Format staff with friendly labels
  const formattedStaff = (hosp.staff || []).map((s: any) => ({
    id: s.id,
    staffCategory: s.staffCategory,
    label: STAFF_LABELS[s.staffCategory] || s.staffCategory.replace(/_/g, ' '),
    scheduledOnDutyCount: s.scheduledOnDutyCount || 0,
    currentlyAvailableCount: s.currentlyAvailableCount || 0,
    shiftStatus: s.shiftStatus || 'ON_DUTY',
    metricDefinition: s.metricDefinition || 'Medical staff on shift',
    dataProvenance: s.dataProvenance || hosp.dataProvenance || 'DEMO',
  }));

  // Calculate Staff Summary (Separating Doctors and Nurses)
  const doctorCategories = ['EMERGENCY_PHYSICIAN', 'TRAUMA_SURGEON', 'ANESTHESIOLOGIST', 'DUTY_MEDICAL_OFFICER'];
  const nurseCategories = ['EMERGENCY_NURSE', 'ICU_TRIAGE_NURSE', 'GENERAL_DUTY_NURSE'];

  const doctorStaff = formattedStaff.filter((s: any) => doctorCategories.includes(s.staffCategory));
  const nurseStaff = formattedStaff.filter((s: any) => nurseCategories.includes(s.staffCategory));

  const doctorsOnDuty = doctorStaff.reduce((acc: number, s: any) => acc + s.scheduledOnDutyCount, 0);
  const doctorsAvailable = doctorStaff.reduce((acc: number, s: any) => acc + s.currentlyAvailableCount, 0);
  const doctorShiftStatus = doctorStaff[0]?.shiftStatus || 'DAY_SHIFT';

  const nursesOnDuty = nurseStaff.reduce((acc: number, s: any) => acc + s.scheduledOnDutyCount, 0);
  const nursesAvailable = nurseStaff.reduce((acc: number, s: any) => acc + s.currentlyAvailableCount, 0);
  const nurseShiftStatus = nurseStaff[0]?.shiftStatus || 'DAY_SHIFT';

  const staffSummary = formattedStaff.length > 0 ? {
    doctorsOnDuty,
    doctorsAvailable,
    doctorShiftStatus,
    nursesOnDuty,
    nursesAvailable,
    nurseShiftStatus,
  } : undefined;

  // Aggregate ambulances by type for summary UI
  const ambulanceTypes = ['ADVANCED_LIFE_SUPPORT_ALS', 'BASIC_LIFE_SUPPORT_BLS', 'MOBILE_ICU', 'NEONATAL_AMBULANCE'];
  const formattedAmbulances = ambulanceTypes.map((type) => {
    const matching = (hosp.ambulances || []).filter((a: any) => a.ambulanceType === type);
    const availableReadyCount = matching.filter(
      (a: any) => a.status === 'AVAILABLE_READY' || a.status === 'AVAILABLE'
    ).length;
    const inTransitCount = matching.filter(
      (a: any) =>
        a.status === 'DISPATCHED_IN_TRANSIT' ||
        a.status === 'ASSIGNED' ||
        a.status === 'EN_ROUTE' ||
        a.status === 'AT_SCENE'
    ).length;
    return {
      ambulanceType: type,
      label: AMBULANCE_LABELS[type] || type,
      totalCount: matching.length,
      availableReadyCount,
      inTransitCount,
    };
  }).filter((a) => a.totalCount > 0);

  // Raw fleet list with individual vehicle identifiers and statuses
  const rawAmbulances = (hosp.ambulances || []).map((a: any) => ({
    id: a.id,
    registrationPlate: a.registrationPlate || 'AMB-UNIT',
    ambulanceType: a.ambulanceType,
    typeLabel: AMBULANCE_LABELS[a.ambulanceType] || a.ambulanceType,
    status: a.status,
    currentLocation: a.currentLocation || `${hosp.name} Base Station`,
    assignedEmergencyId: a.assignedEmergencyId,
    lastUpdated: a.lastUpdated instanceof Date ? a.lastUpdated.toISOString() : a.lastUpdated,
    dataProvenance: a.dataProvenance || hosp.dataProvenance || 'DEMO',
  }));

  const totalAmbulanceCount = rawAmbulances.length;
  const availableAmbulanceCount = rawAmbulances.filter(
    (a: any) => a.status === 'AVAILABLE' || a.status === 'AVAILABLE_READY'
  ).length;
  const assignedAmbulanceCount = rawAmbulances.filter(
    (a: any) =>
      a.status === 'ASSIGNED' ||
      a.status === 'EN_ROUTE' ||
      a.status === 'AT_SCENE' ||
      a.status === 'DISPATCHED_IN_TRANSIT'
  ).length;

  const ambulanceSummary = (rawAmbulances.length > 0 || formattedAmbulances.length > 0) ? {
    totalAmbulances: totalAmbulanceCount,
    availableAmbulances: availableAmbulanceCount,
    assignedAmbulances: assignedAmbulanceCount,
  } : undefined;

  const dataProvenance = hosp.dataProvenance || (hosp.isDemoData ? 'DEMO' : 'MANUAL');
  const provenanceNotice =
    dataProvenance === 'LIVE_INTEGRATION'
      ? 'Verified Hospital Integration Feed'
      : dataProvenance === 'MANUAL'
      ? 'Manually Entered by Hospital Administrator (Unverified telemetry)'
      : 'Demonstration synthetic resource metrics for project evaluation. Not verified live hospital telemetry.';

  return {
    id: hosp.id,
    name: hosp.name,
    slug: hosp.slug,
    address: hosp.address,
    area: hosp.area,
    city: hosp.city,
    state: hosp.state,
    pincode: hosp.pincode,
    latitude: hosp.latitude,
    longitude: hosp.longitude,
    emergencyContactPhone: hosp.emergencyContactPhone,
    secondaryContactPhone: hosp.secondaryContactPhone,
    officialEmail: hosp.officialEmail,
    websiteUrl: hosp.websiteUrl,
    emergencyServices: parsedServices,
    verificationStatus: hosp.verificationStatus,
    operatingStatus: hosp.operatingStatus,
    isDemoData: hosp.isDemoData,
    dataSource: hosp.isDemoData ? 'demo' : 'local_registry',
    dataProvenance,
    provenanceNotice,
    isVerifiedLive: dataProvenance === 'LIVE_INTEGRATION',
    capacityConnected: true,
    capacityNotes: 'Live triage capacity feed connected to persistent database records.',
    lastResourceUpdate: hosp.lastResourceUpdate instanceof Date ? hosp.lastResourceUpdate.toISOString() : hosp.lastResourceUpdate,
    distanceKm,
    estimatedTravelTimeMins,
    freshness,
    beds: formattedBeds,
    staff: formattedStaff,
    ambulances: formattedAmbulances,
    ambulanceFleet: rawAmbulances,
    bedsSummary,
    staffSummary,
    ambulanceSummary,
  };
}
