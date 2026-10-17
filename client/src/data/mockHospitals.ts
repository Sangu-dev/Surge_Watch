import type { Hospital, LandmarkPreset } from '../types';

export const BENGALURU_LANDMARKS: LandmarkPreset[] = [
  {
    id: 'majestic',
    name: 'Majestic / City Railway Station',
    area: 'Central Bengaluru',
    latitude: 12.9781,
    longitude: 77.5695,
    description: 'Central transit hub connecting KSR Station and Kempegowda Bus Station'
  },
  {
    id: 'koramangala',
    name: 'Koramangala Sony World Junction',
    area: 'South-East Bengaluru',
    latitude: 12.9352,
    longitude: 77.6245,
    description: '100ft Road intersection connecting Koramangala, Domlur, and HSR'
  },
  {
    id: 'indiranagar',
    name: 'Indiranagar 100ft Road Metro',
    area: 'East Bengaluru',
    latitude: 12.9784,
    longitude: 77.6408,
    description: 'High-density commercial corridor with direct CMH & Old Airport Road access'
  },
  {
    id: 'whitefield',
    name: 'Whitefield ITPL Main Gate',
    area: 'East Bengaluru (Tech Corridor)',
    latitude: 12.9856,
    longitude: 77.7319,
    description: 'ITPL junction serving Whitefield, Hoodi, and Kadugodi zones'
  },
  {
    id: 'hebbal',
    name: 'Hebbal Flyover Junction',
    area: 'North Bengaluru (Airport Highway)',
    latitude: 13.0358,
    longitude: 77.5970,
    description: 'Gateway junction linking Ring Road, Bellary Road, and Manyata Tech Park'
  },
  {
    id: 'jayanagar',
    name: 'Jayanagar 4th Block Complex',
    area: 'South Bengaluru',
    latitude: 12.9299,
    longitude: 77.5824,
    description: 'Residential and commercial hub connecting Basavanagudi and JP Nagar'
  },
  {
    id: 'electronic_city',
    name: 'Electronic City Toll Plaza (Phase 1)',
    area: 'South Bengaluru (Hosur Road)',
    latitude: 12.8452,
    longitude: 77.6602,
    description: 'Elevated highway landing junction connecting Hosur Road & Phase 1 IT campus'
  }
];

export const MOCK_HOSPITALS: Hospital[] = [
  {
    id: 'hosp-victoria',
    name: 'Victoria Hospital & Trauma Care Centre',
    slug: 'victoria-hospital-bengaluru',
    address: 'Fort Road, Near City Market, Kalasipalya',
    area: 'Kalasipalya / KR Market',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560002',
    latitude: 12.9634,
    longitude: 77.5750,
    emergencyContactPhone: '+91-80-26701150',
    secondaryContactPhone: '080-26702200',
    officialEmail: 'emergency@victoriahospital.kar.nic.in',
    emergencyServices: ['24/7 Level 1 Trauma Care', 'Burns Emergency Unit', 'Multi-organ ICU', 'Cardiac Resuscitation', 'Emergency Blood Bank'],
    verificationStatus: 'VERIFIED',
    operatingStatus: 'OPERATIONAL',
    isDemoData: true,
    lastResourceUpdate: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12 mins ago (LIVE)
    updatedBy: 'Dr. C. R. Shivananda (Chief Medical Officer)',
    beds: [
      { category: 'EMERGENCY_ICU', categoryLabel: 'Emergency ICU Beds', totalBeds: 24, occupiedBeds: 18, availableBeds: 6 },
      { category: 'TRAUMA_RESUSCITATION', categoryLabel: 'Trauma Resuscitation Bays', totalBeds: 12, occupiedBeds: 8, availableBeds: 4 },
      { category: 'EMERGENCY_GENERAL', categoryLabel: 'Acute Observation Beds', totalBeds: 50, occupiedBeds: 38, availableBeds: 12 },
      { category: 'OXYGEN_CRITICAL', categoryLabel: 'Oxygen Support Beds', totalBeds: 30, occupiedBeds: 21, availableBeds: 9 },
    ],
    staff: [
      {
        staffCategory: 'EMERGENCY_PHYSICIAN',
        label: 'Emergency Physicians',
        scheduledOnDutyCount: 8,
        currentlyAvailableCount: 3,
        metricDefinition: 'Physicians currently unassigned and ready for immediate casualty triage'
      },
      {
        staffCategory: 'TRAUMA_SURGEON',
        label: 'Trauma Surgeons',
        scheduledOnDutyCount: 4,
        currentlyAvailableCount: 2,
        metricDefinition: 'Board-certified surgeons on-site and not in continuous operations'
      },
      {
        staffCategory: 'ICU_TRIAGE_NURSE',
        label: 'Emergency Triage Nurses',
        scheduledOnDutyCount: 16,
        currentlyAvailableCount: 6,
        metricDefinition: 'Triage-certified emergency nurses ready to receive incoming ambulance intake'
      }
    ],
    ambulances: [
      { ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS', label: 'Advanced Life Support (ALS)', totalCount: 6, availableReadyCount: 3, inTransitCount: 3 },
      { ambulanceType: 'BASIC_LIFE_SUPPORT_BLS', label: 'Basic Life Support (BLS)', totalCount: 8, availableReadyCount: 4, inTransitCount: 4 },
      { ambulanceType: 'MOBILE_ICU', label: 'Mobile ICU Unit', totalCount: 2, availableReadyCount: 1, inTransitCount: 1 }
    ]
  },
  {
    id: 'hosp-manipal-old-airport',
    name: 'Manipal Hospital (Old Airport Road)',
    slug: 'manipal-hospital-old-airport-road',
    address: '98, HAL Old Airport Rd, Kodihalli',
    area: 'Kodihalli / Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560017',
    latitude: 12.9587,
    longitude: 77.6489,
    emergencyContactPhone: '+91-80-25024444',
    secondaryContactPhone: '080-25023333',
    officialEmail: 'emergency.oar@manipalhospitals.com',
    emergencyServices: ['Comprehensive Stroke Center', 'Interventional Cath Lab (24/7)', 'Pediatric Intensive Care', 'Polytrauma Emergency', 'Helipad Triage'],
    verificationStatus: 'VERIFIED',
    operatingStatus: 'OPERATIONAL',
    isDemoData: true,
    lastResourceUpdate: new Date(Date.now() - 22 * 60 * 1000).toISOString(), // 22 mins ago (LIVE)
    updatedBy: 'Dr. L. K. Mahesh (Emergency Services Lead)',
    beds: [
      { category: 'EMERGENCY_ICU', categoryLabel: 'Emergency ICU Beds', totalBeds: 28, occupiedBeds: 23, availableBeds: 5 },
      { category: 'TRAUMA_RESUSCITATION', categoryLabel: 'Trauma Resuscitation Bays', totalBeds: 8, occupiedBeds: 5, availableBeds: 3 },
      { category: 'EMERGENCY_GENERAL', categoryLabel: 'Acute Observation Beds', totalBeds: 40, occupiedBeds: 31, availableBeds: 9 },
      { category: 'PEDIATRIC_EMERGENCY', categoryLabel: 'Pediatric Emergency Beds', totalBeds: 10, occupiedBeds: 6, availableBeds: 4 },
    ],
    staff: [
      {
        staffCategory: 'EMERGENCY_PHYSICIAN',
        label: 'Emergency Physicians',
        scheduledOnDutyCount: 10,
        currentlyAvailableCount: 4,
        metricDefinition: 'Physicians currently unassigned and ready for immediate casualty triage'
      },
      {
        staffCategory: 'TRAUMA_SURGEON',
        label: 'Trauma Surgeons',
        scheduledOnDutyCount: 5,
        currentlyAvailableCount: 2,
        metricDefinition: 'On-site trauma team lead available for critical polytrauma intake'
      },
      {
        staffCategory: 'ANESTHESIOLOGIST',
        label: 'Emergency Anesthetists',
        scheduledOnDutyCount: 4,
        currentlyAvailableCount: 2,
        metricDefinition: 'Emergency airway & trauma resuscitation specialists on emergency standby'
      }
    ],
    ambulances: [
      { ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS', label: 'Advanced Life Support (ALS)', totalCount: 8, availableReadyCount: 4, inTransitCount: 4 },
      { ambulanceType: 'MOBILE_ICU', label: 'Mobile ICU Unit', totalCount: 3, availableReadyCount: 2, inTransitCount: 1 }
    ]
  },
  {
    id: 'hosp-st-johns',
    name: "St. John's Medical College Hospital",
    slug: 'st-johns-medical-college-hospital',
    address: 'Sarjapur Road, John Nagar, Koramangala',
    area: 'Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560034',
    latitude: 12.9322,
    longitude: 77.6202,
    emergencyContactPhone: '+91-80-22065000',
    secondaryContactPhone: '080-22065169',
    officialEmail: 'casualty@stjohns.in',
    emergencyServices: ['24/7 Casualty & Triage', 'Dedicated Cardiac ICU', 'Snake Bite & Toxicology Center', 'Orthopedic Trauma Unit'],
    verificationStatus: 'VERIFIED',
    operatingStatus: 'OPERATIONAL',
    isDemoData: true,
    lastResourceUpdate: new Date(Date.now() - 55 * 60 * 1000).toISOString(), // 55 mins ago (RECENT)
    updatedBy: 'Sister Mary Teresa (Emergency Administrator)',
    beds: [
      { category: 'EMERGENCY_ICU', categoryLabel: 'Emergency ICU Beds', totalBeds: 32, occupiedBeds: 27, availableBeds: 5 },
      { category: 'TRAUMA_RESUSCITATION', categoryLabel: 'Trauma Resuscitation Bays', totalBeds: 10, occupiedBeds: 7, availableBeds: 3 },
      { category: 'EMERGENCY_GENERAL', categoryLabel: 'Acute Observation Beds', totalBeds: 60, occupiedBeds: 48, availableBeds: 12 },
    ],
    staff: [
      {
        staffCategory: 'EMERGENCY_PHYSICIAN',
        label: 'Emergency Physicians',
        scheduledOnDutyCount: 12,
        currentlyAvailableCount: 5,
        metricDefinition: 'Physicians currently unassigned and ready for immediate casualty triage'
      },
      {
        staffCategory: 'DUTY_MEDICAL_OFFICER',
        label: 'Duty Medical Officers',
        scheduledOnDutyCount: 8,
        currentlyAvailableCount: 3,
        metricDefinition: 'General triage medical officers assisting emergency casualty stabilization'
      }
    ],
    ambulances: [
      { ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS', label: 'Advanced Life Support (ALS)', totalCount: 5, availableReadyCount: 2, inTransitCount: 3 },
      { ambulanceType: 'BASIC_LIFE_SUPPORT_BLS', label: 'Basic Life Support (BLS)', totalCount: 6, availableReadyCount: 3, inTransitCount: 3 }
    ]
  },
  {
    id: 'hosp-bowring',
    name: 'Bowring & Lady Curzon Hospital',
    slug: 'bowring-lady-curzon-hospital',
    address: 'Lady Curzon Road, Tasker Town, Shivaji Nagar',
    area: 'Shivajinagar / Commercial St',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    latitude: 12.9822,
    longitude: 77.6033,
    emergencyContactPhone: '+91-80-25591362',
    officialEmail: 'bowring.emergency@karnataka.gov.in',
    emergencyServices: ['24/7 Government Emergency Room', 'Maternal Emergency', 'Poison Triage Unit', 'General Trauma Service'],
    verificationStatus: 'VERIFIED',
    operatingStatus: 'OPERATIONAL',
    isDemoData: true,
    lastResourceUpdate: new Date(Date.now() - 170 * 60 * 1000).toISOString(), // ~2.8 hours ago (STALE)
    updatedBy: 'Dr. Venkatesh Murthy',
    beds: [
      { category: 'EMERGENCY_ICU', categoryLabel: 'Emergency ICU Beds', totalBeds: 18, occupiedBeds: 16, availableBeds: 2 },
      { category: 'TRAUMA_RESUSCITATION', categoryLabel: 'Trauma Resuscitation Bays', totalBeds: 6, occupiedBeds: 4, availableBeds: 2 },
      { category: 'EMERGENCY_GENERAL', categoryLabel: 'Acute Observation Beds', totalBeds: 45, occupiedBeds: 39, availableBeds: 6 },
    ],
    staff: [
      {
        staffCategory: 'EMERGENCY_PHYSICIAN',
        label: 'Emergency Physicians',
        scheduledOnDutyCount: 6,
        currentlyAvailableCount: 2,
        metricDefinition: 'Physicians currently unassigned and ready for immediate casualty triage'
      }
    ],
    ambulances: [
      { ambulanceType: 'BASIC_LIFE_SUPPORT_BLS', label: 'Basic Life Support (BLS)', totalCount: 4, availableReadyCount: 1, inTransitCount: 3 }
    ]
  },
  {
    id: 'hosp-apollo-bannerghatta',
    name: 'Apollo Hospitals (Bannerghatta Road)',
    slug: 'apollo-hospitals-bannerghatta-road',
    address: '154/11, Opp. IIM-B, Bannerghatta Main Rd',
    area: 'Bannerghatta Road / Bilekahalli',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560076',
    latitude: 12.8931,
    longitude: 77.5974,
    emergencyContactPhone: '+91-80-26304050',
    secondaryContactPhone: '1066',
    officialEmail: 'emergency_bg@apollohospitals.com',
    emergencyServices: ['National Emergency 1066 Hub', 'Rapid Interventional Cardiology', 'Neuro-trauma Emergency', 'Advanced Critical Care'],
    verificationStatus: 'VERIFIED',
    operatingStatus: 'OPERATIONAL',
    isDemoData: true,
    lastResourceUpdate: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 mins ago (LIVE)
    updatedBy: 'Dr. Anand Kumar (Head of Emergency Medicine)',
    beds: [
      { category: 'EMERGENCY_ICU', categoryLabel: 'Emergency ICU Beds', totalBeds: 26, occupiedBeds: 19, availableBeds: 7 },
      { category: 'TRAUMA_RESUSCITATION', categoryLabel: 'Trauma Resuscitation Bays', totalBeds: 8, occupiedBeds: 4, availableBeds: 4 },
      { category: 'EMERGENCY_GENERAL', categoryLabel: 'Acute Observation Beds', totalBeds: 35, occupiedBeds: 24, availableBeds: 11 },
    ],
    staff: [
      {
        staffCategory: 'EMERGENCY_PHYSICIAN',
        label: 'Emergency Physicians',
        scheduledOnDutyCount: 9,
        currentlyAvailableCount: 4,
        metricDefinition: 'Physicians currently unassigned and ready for immediate casualty triage'
      },
      {
        staffCategory: 'TRAUMA_SURGEON',
        label: 'Trauma Surgeons',
        scheduledOnDutyCount: 4,
        currentlyAvailableCount: 3,
        metricDefinition: 'On-site trauma team lead available for critical polytrauma intake'
      }
    ],
    ambulances: [
      { ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS', label: 'Advanced Life Support (ALS)', totalCount: 6, availableReadyCount: 3, inTransitCount: 3 },
      { ambulanceType: 'MOBILE_ICU', label: 'Mobile ICU Unit', totalCount: 2, availableReadyCount: 1, inTransitCount: 1 }
    ]
  },
  {
    id: 'hosp-nimhans',
    name: 'NIMHANS (Emergency Neuro-Trauma)',
    slug: 'nimhans-neuro-trauma-emergency',
    address: 'Hosur Road, Near Dairy Circle, Lakkasandra',
    area: 'Dairy Circle / Wilson Garden',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560029',
    latitude: 12.9388,
    longitude: 77.5959,
    emergencyContactPhone: '+91-80-26995530',
    officialEmail: 'casualty@nimhans.ac.in',
    emergencyServices: ['Specialized Neuro-Trauma Care', 'Emergency Neurosurgery OT', 'Pediatric Neuro-Emergency', 'Psychiatric Crisis Intervention'],
    verificationStatus: 'VERIFIED',
    operatingStatus: 'OPERATIONAL',
    isDemoData: true,
    lastResourceUpdate: new Date(Date.now() - 40 * 60 * 1000).toISOString(), // 40 mins ago (RECENT)
    updatedBy: 'Dr. Geetha S. (Neuro-Trauma Registrar)',
    beds: [
      { category: 'EMERGENCY_ICU', categoryLabel: 'Neuro-ICU Beds', totalBeds: 30, occupiedBeds: 24, availableBeds: 6 },
      { category: 'TRAUMA_RESUSCITATION', categoryLabel: 'Neuro-Trauma Resuscitation', totalBeds: 10, occupiedBeds: 7, availableBeds: 3 },
      { category: 'EMERGENCY_GENERAL', categoryLabel: 'Observation Beds', totalBeds: 40, occupiedBeds: 32, availableBeds: 8 },
    ],
    staff: [
      {
        staffCategory: 'TRAUMA_SURGEON',
        label: 'Neurosurgeons on Emergency Duty',
        scheduledOnDutyCount: 6,
        currentlyAvailableCount: 2,
        metricDefinition: 'Board-certified neurosurgeons ready for emergency cranial/spinal decompression'
      },
      {
        staffCategory: 'EMERGENCY_PHYSICIAN',
        label: 'Emergency Triage Doctors',
        scheduledOnDutyCount: 8,
        currentlyAvailableCount: 3,
        metricDefinition: 'Immediate triage doctors for Glasgow Coma Scale (GCS) assessment'
      }
    ],
    ambulances: [
      { ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS', label: 'Advanced Life Support (ALS)', totalCount: 4, availableReadyCount: 2, inTransitCount: 2 }
    ]
  },
  {
    id: 'hosp-columbia-asia-hebbal',
    name: 'Manipal Hospital Hebbal (formerly Columbia Asia)',
    slug: 'manipal-hospital-hebbal',
    address: 'Kirloskar Business Park, Bellary Rd, Hebbal',
    area: 'Hebbal / Bellary Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560024',
    latitude: 13.0450,
    longitude: 77.5890,
    emergencyContactPhone: '+91-80-66600000',
    secondaryContactPhone: '080-66600001',
    officialEmail: 'emergency.hebbal@manipalhospitals.com',
    emergencyServices: ['Airport Highway Trauma Care', '24/7 Cardiac Emergency Lab', 'Pediatric ICU', 'Comprehensive Emergency Unit'],
    verificationStatus: 'VERIFIED',
    operatingStatus: 'OPERATIONAL',
    isDemoData: true,
    lastResourceUpdate: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago (LIVE)
    updatedBy: 'Dr. Vivek Swamy (Triage Chief)',
    beds: [
      { category: 'EMERGENCY_ICU', categoryLabel: 'Emergency ICU Beds', totalBeds: 20, occupiedBeds: 15, availableBeds: 5 },
      { category: 'TRAUMA_RESUSCITATION', categoryLabel: 'Trauma Resuscitation Bays', totalBeds: 6, occupiedBeds: 3, availableBeds: 3 },
      { category: 'EMERGENCY_GENERAL', categoryLabel: 'Acute Observation Beds', totalBeds: 30, occupiedBeds: 22, availableBeds: 8 },
    ],
    staff: [
      {
        staffCategory: 'EMERGENCY_PHYSICIAN',
        label: 'Emergency Physicians',
        scheduledOnDutyCount: 7,
        currentlyAvailableCount: 3,
        metricDefinition: 'Physicians currently unassigned and ready for immediate casualty triage'
      }
    ],
    ambulances: [
      { ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS', label: 'Advanced Life Support (ALS)', totalCount: 5, availableReadyCount: 3, inTransitCount: 2 }
    ]
  }
];
