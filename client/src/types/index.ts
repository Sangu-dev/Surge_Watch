export type FreshnessStatus = 'LIVE' | 'RECENT' | 'STALE' | 'UNKNOWN';

export type OperatingStatus = 'OPERATIONAL' | 'DIVERTING_EMERGENCIES' | 'AT_CAPACITY' | 'CLOSED_TEMPORARY';

export type LocationSource = 'GPS_ACCURATE' | 'MANUAL_SELECTION' | 'IP_APPROXIMATE' | 'CACHED_LOCATION';

export interface BedBreakdown {
  category: 'EMERGENCY_ICU' | 'EMERGENCY_GENERAL' | 'TRAUMA_RESUSCITATION' | 'PEDIATRIC_EMERGENCY' | 'OXYGEN_CRITICAL';
  categoryLabel: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
}

export interface StaffBreakdown {
  staffCategory: 'EMERGENCY_PHYSICIAN' | 'TRAUMA_SURGEON' | 'ANESTHESIOLOGIST' | 'ICU_TRIAGE_NURSE' | 'DUTY_MEDICAL_OFFICER';
  label: string;
  scheduledOnDutyCount: number;
  currentlyAvailableCount: number;
  metricDefinition: string;
}

export interface AmbulanceInfo {
  ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS' | 'BASIC_LIFE_SUPPORT_BLS' | 'MOBILE_ICU' | 'NEONATAL_AMBULANCE';
  label: string;
  totalCount: number;
  availableReadyCount: number;
  inTransitCount: number;
}

export interface Hospital {
  id: string;
  name: string;
  slug: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  emergencyContactPhone?: string;
  secondaryContactPhone?: string;
  officialEmail?: string;
  websiteUrl?: string;
  facilityType?: string;
  emergencyServices: string[];
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'VERIFIED_LOCATION_ONLY';
  operatingStatus: OperatingStatus | string;
  isDemoData: boolean;
  dataSource?: 'osm' | 'local_registry' | 'demo';
  sourceIdentifier?: string;
  sourceAttribution?: string;
  capacityConnected?: boolean;
  capacityNotes?: string;
  lastResourceUpdate: string; // ISO date
  updatedBy?: string;

  // Resource breakdowns
  beds: BedBreakdown[];
  staff: StaffBreakdown[];
  ambulances: AmbulanceInfo[];

  // Computed for patient search
  distanceKm?: number;
  estimatedTravelTimeMins?: number;
  freshness?: {
    status: FreshnessStatus;
    label: string;
    minutesAgo: number;
    isStaleWarning: boolean;
  };
}

export interface LandmarkPreset {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  description: string;
}

export interface LocationState {
  lat: number;
  lng: number;
  label: string;
  source: LocationSource;
  accuracyMeters?: number;
  locality?: string;
  timestamp?: number;
}

export interface DiscoveryMetadata {
  requestedCoordinates: { lat: number; lng: number };
  requestedRadiusKm: number;
  selectedRadiusKm?: number;
  effectiveRadiusKm: number;
  wasExpanded?: boolean;
  expansionMessage?: string;
  totalCandidatesFound: number;
  returnedCount: number;
  dataSource: string;
  attribution?: string;
  disclaimer?: string;
  cached: boolean;
  timestamp: string;
}
