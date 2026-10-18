export type FreshnessStatus = 'LIVE' | 'RECENT' | 'STALE' | 'UNKNOWN';

export type OperatingStatus = 'OPERATIONAL' | 'DIVERTING_EMERGENCIES' | 'AT_CAPACITY' | 'CLOSED_TEMPORARY';

export type LocationSource = 'GPS_ACCURATE' | 'MANUAL_SELECTION' | 'IP_APPROXIMATE' | 'CACHED_LOCATION';

export interface BedBreakdown {
  id?: string;
  category: 'EMERGENCY_ICU' | 'EMERGENCY_GENERAL' | 'TRAUMA_RESUSCITATION' | 'PEDIATRIC_EMERGENCY' | 'OXYGEN_CRITICAL' | string;
  categoryLabel: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  dataProvenance?: string;
}

export interface StaffBreakdown {
  id?: string;
  staffCategory: 'EMERGENCY_PHYSICIAN' | 'TRAUMA_SURGEON' | 'ANESTHESIOLOGIST' | 'ICU_TRIAGE_NURSE' | 'DUTY_MEDICAL_OFFICER' | 'EMERGENCY_NURSE' | 'GENERAL_DUTY_NURSE' | string;
  label: string;
  scheduledOnDutyCount: number;
  currentlyAvailableCount: number;
  shiftStatus?: string;
  metricDefinition: string;
  dataProvenance?: string;
}

export interface AmbulanceInfo {
  ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS' | 'BASIC_LIFE_SUPPORT_BLS' | 'MOBILE_ICU' | 'NEONATAL_AMBULANCE' | string;
  label: string;
  totalCount: number;
  availableReadyCount: number;
  inTransitCount: number;
}

export interface AmbulanceRecord {
  id: string;
  registrationPlate: string;
  ambulanceType: string;
  typeLabel?: string;
  status: string; // AVAILABLE, ASSIGNED, EN_ROUTE, AT_SCENE, COMPLETED, MAINTENANCE
  currentLocation?: string;
  assignedEmergencyId?: string | null;
  lastUpdated?: string;
  dataProvenance?: string;
}

export interface BedsSummary {
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  icuBeds: { total: number; available: number; occupied: number };
  emergencyBeds: { total: number; available: number; occupied: number };
}

export interface StaffSummary {
  doctorsOnDuty: number;
  doctorsAvailable: number;
  doctorShiftStatus?: string;
  nursesOnDuty: number;
  nursesAvailable: number;
  nurseShiftStatus?: string;
}

export interface AmbulanceSummary {
  totalAmbulances: number;
  availableAmbulances: number;
  assignedAmbulances: number;
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
  dataProvenance?: 'DEMO' | 'MANUAL' | 'LIVE_INTEGRATION' | 'OSM_UNCONNECTED' | string;
  provenanceNotice?: string;
  isVerifiedLive?: boolean;
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
  ambulanceFleet?: AmbulanceRecord[];

  // Resource summaries
  bedsSummary?: BedsSummary;
  staffSummary?: StaffSummary;
  ambulanceSummary?: AmbulanceSummary;

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

export interface EmergencyRequest {
  id: string;
  hospitalId?: string | null;
  patientName?: string | null;
  contactPhone?: string | null;
  emergencyType: string;
  severity: string;
  latitude: number;
  longitude: number;
  pickupAddress?: string | null;
  status: string; // PENDING, ASSIGNED, EN_ROUTE, AT_SCENE, COMPLETED, CANCELLED
  assignedAmbulanceId?: string | null;
  dispatchNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  hospital?: {
    id: string;
    name: string;
    emergencyContactPhone?: string;
  } | null;
  assignedAmbulances?: AmbulanceRecord[];
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
