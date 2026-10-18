import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CsvHospitalRow {
  hospital_id: string;
  name: string;
  slug: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  emergency_contact_phone: string;
  secondary_contact_phone?: string;
  official_email: string;
  website_url?: string;
  emergency_services: string[];
  operating_status: string;
  verification_status: string;
  data_provenance: string;
  is_demo_data: boolean;
  provenance_notice: string;
  // Beds
  icu_total: number;
  icu_occupied: number;
  icu_available: number;
  trauma_total: number;
  trauma_occupied: number;
  trauma_available: number;
  er_general_total: number;
  er_general_occupied: number;
  er_general_available: number;
  oxygen_total: number;
  oxygen_occupied: number;
  oxygen_available: number;
  pediatric_total: number;
  pediatric_occupied: number;
  pediatric_available: number;
  // Staff
  doctors_on_duty: number;
  doctors_available: number;
  doctor_shift_status: string;
  nurses_on_duty: number;
  nurses_available: number;
  nurse_shift_status: string;
  surgeons_on_duty: number;
  surgeons_available: number;
  anesthesiologists_on_duty: number;
  anesthesiologists_available: number;
  // Ambulance fleet
  ambulances: Array<{
    registrationPlate: string;
    ambulanceType: string;
    status: string;
    currentLocation?: string;
  }>;
}

/**
 * Robust CSV parser that handles double-quoted fields containing commas and brackets
 */
export function parseDemoCsv(csvContent: string): CsvHospitalRow[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: CsvHospitalRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = parseCsvLine(lines[i]);
    if (rawCols.length === 0) continue;

    const colMap: Record<string, string> = {};
    headers.forEach((h, idx) => {
      colMap[h.trim()] = rawCols[idx] !== undefined ? rawCols[idx].trim() : '';
    });

    let emergencyServices: string[] = [];
    try {
      emergencyServices = JSON.parse(colMap.emergency_services || '[]');
    } catch {
      emergencyServices = (colMap.emergency_services || '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    let ambulances: any[] = [];
    try {
      ambulances = JSON.parse(colMap.ambulances_json || '[]');
    } catch {
      ambulances = [];
    }

    const icuTotal = parseInt(colMap.icu_total || '0', 10);
    const icuAvail = parseInt(colMap.icu_available || '0', 10);
    const icuOcc = colMap.icu_occupied ? parseInt(colMap.icu_occupied, 10) : Math.max(0, icuTotal - icuAvail);

    const traumaTotal = parseInt(colMap.trauma_total || '0', 10);
    const traumaAvail = parseInt(colMap.trauma_available || '0', 10);
    const traumaOcc = colMap.trauma_occupied ? parseInt(colMap.trauma_occupied, 10) : Math.max(0, traumaTotal - traumaAvail);

    const erTotal = parseInt(colMap.er_general_total || '0', 10);
    const erAvail = parseInt(colMap.er_general_available || '0', 10);
    const erOcc = colMap.er_general_occupied ? parseInt(colMap.er_general_occupied, 10) : Math.max(0, erTotal - erAvail);

    const oxTotal = parseInt(colMap.oxygen_total || '0', 10);
    const oxAvail = parseInt(colMap.oxygen_available || '0', 10);
    const oxOcc = colMap.oxygen_occupied ? parseInt(colMap.oxygen_occupied, 10) : Math.max(0, oxTotal - oxAvail);

    const pedTotal = parseInt(colMap.pediatric_total || '0', 10);
    const pedAvail = parseInt(colMap.pediatric_available || '0', 10);
    const pedOcc = colMap.pediatric_occupied ? parseInt(colMap.pediatric_occupied, 10) : Math.max(0, pedTotal - pedAvail);

    rows.push({
      hospital_id: colMap.hospital_id,
      name: colMap.name,
      slug: colMap.slug,
      address: colMap.address,
      area: colMap.area,
      city: colMap.city || 'Bengaluru',
      state: colMap.state || 'Karnataka',
      pincode: colMap.pincode,
      latitude: parseFloat(colMap.latitude),
      longitude: parseFloat(colMap.longitude),
      emergency_contact_phone: colMap.emergency_contact_phone,
      secondary_contact_phone: colMap.secondary_contact_phone || undefined,
      official_email: colMap.official_email,
      website_url: colMap.website_url || undefined,
      emergency_services: emergencyServices,
      operating_status: colMap.operating_status || 'OPERATIONAL',
      verification_status: colMap.verification_status || 'VERIFIED',
      data_provenance: colMap.data_provenance || 'DEMO',
      is_demo_data: colMap.is_demo_data === 'true',
      provenance_notice: colMap.provenance_notice || 'SYNTHETIC DEMONSTRATION RECORD - NOT VERIFIED CLINICAL AVAILABILITY',
      icu_total: icuTotal,
      icu_occupied: icuOcc,
      icu_available: icuAvail,
      trauma_total: traumaTotal,
      trauma_occupied: traumaOcc,
      trauma_available: traumaAvail,
      er_general_total: erTotal,
      er_general_occupied: erOcc,
      er_general_available: erAvail,
      oxygen_total: oxTotal,
      oxygen_occupied: oxOcc,
      oxygen_available: oxAvail,
      pediatric_total: pedTotal,
      pediatric_occupied: pedOcc,
      pediatric_available: pedAvail,
      doctors_on_duty: parseInt(colMap.doctors_on_duty || '0', 10),
      doctors_available: parseInt(colMap.doctors_available || '0', 10),
      doctor_shift_status: colMap.doctor_shift_status || 'DAY_SHIFT',
      nurses_on_duty: parseInt(colMap.nurses_on_duty || '0', 10),
      nurses_available: parseInt(colMap.nurses_available || '0', 10),
      nurse_shift_status: colMap.nurse_shift_status || 'DAY_SHIFT',
      surgeons_on_duty: parseInt(colMap.surgeons_on_duty || '0', 10),
      surgeons_available: parseInt(colMap.surgeons_available || '0', 10),
      anesthesiologists_on_duty: parseInt(colMap.anesthesiologists_on_duty || '0', 10),
      anesthesiologists_available: parseInt(colMap.anesthesiologists_available || '0', 10),
      ambulances,
    });
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Loads and seeds records from CSV into Prisma database
 */
export async function loadDemoCsvDataIntoDatabase(prisma: PrismaClient, csvPath?: string): Promise<{ loaded: number }> {
  const targetPath = csvPath || path.resolve(__dirname, '../data/bengaluru_hospitals_resource_demo.csv');
  if (!fs.existsSync(targetPath)) {
    console.warn(`[CSV Loader] File not found at ${targetPath}`);
    return { loaded: 0 };
  }

  const content = fs.readFileSync(targetPath, 'utf8');
  const rows = parseDemoCsv(content);
  console.log(`[CSV Loader] Parsed ${rows.length} hospital resource records from ${targetPath}`);

  for (const row of rows) {
    // 1. Upsert Hospital
    await prisma.hospital.upsert({
      where: { id: row.hospital_id },
      update: {
        name: row.name,
        slug: row.slug,
        address: row.address,
        area: row.area,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        latitude: row.latitude,
        longitude: row.longitude,
        emergencyContactPhone: row.emergency_contact_phone,
        secondaryContactPhone: row.secondary_contact_phone,
        officialEmail: row.official_email,
        websiteUrl: row.website_url,
        emergencyServices: JSON.stringify(row.emergency_services),
        operatingStatus: row.operating_status,
        verificationStatus: row.verification_status,
        isDemoData: row.is_demo_data,
        dataProvenance: row.data_provenance,
        lastResourceUpdate: new Date(),
      },
      create: {
        id: row.hospital_id,
        name: row.name,
        slug: row.slug,
        address: row.address,
        area: row.area,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        latitude: row.latitude,
        longitude: row.longitude,
        emergencyContactPhone: row.emergency_contact_phone,
        secondaryContactPhone: row.secondary_contact_phone,
        officialEmail: row.official_email,
        websiteUrl: row.website_url,
        emergencyServices: JSON.stringify(row.emergency_services),
        operatingStatus: row.operating_status,
        verificationStatus: row.verification_status,
        isDemoData: row.is_demo_data,
        dataProvenance: row.data_provenance,
        lastResourceUpdate: new Date(),
      },
    });

    // 2. Refresh Beds
    await prisma.bedAvailability.deleteMany({ where: { hospitalId: row.hospital_id } });
    await prisma.bedAvailability.createMany({
      data: [
        {
          hospitalId: row.hospital_id,
          category: 'EMERGENCY_ICU',
          totalBeds: row.icu_total,
          occupiedBeds: row.icu_occupied,
          availableBeds: row.icu_available,
          dataProvenance: row.data_provenance,
        },
        {
          hospitalId: row.hospital_id,
          category: 'TRAUMA_RESUSCITATION',
          totalBeds: row.trauma_total,
          occupiedBeds: row.trauma_occupied,
          availableBeds: row.trauma_available,
          dataProvenance: row.data_provenance,
        },
        {
          hospitalId: row.hospital_id,
          category: 'EMERGENCY_GENERAL',
          totalBeds: row.er_general_total,
          occupiedBeds: row.er_general_occupied,
          availableBeds: row.er_general_available,
          dataProvenance: row.data_provenance,
        },
        {
          hospitalId: row.hospital_id,
          category: 'OXYGEN_CRITICAL',
          totalBeds: row.oxygen_total,
          occupiedBeds: row.oxygen_occupied,
          availableBeds: row.oxygen_available,
          dataProvenance: row.data_provenance,
        },
        {
          hospitalId: row.hospital_id,
          category: 'PEDIATRIC_EMERGENCY',
          totalBeds: row.pediatric_total,
          occupiedBeds: row.pediatric_occupied,
          availableBeds: row.pediatric_available,
          dataProvenance: row.data_provenance,
        },
      ],
    });

    // 3. Refresh Staff
    await prisma.staffAvailability.deleteMany({ where: { hospitalId: row.hospital_id } });
    await prisma.staffAvailability.createMany({
      data: [
        {
          hospitalId: row.hospital_id,
          staffCategory: 'EMERGENCY_PHYSICIAN',
          scheduledOnDutyCount: row.doctors_on_duty,
          currentlyAvailableCount: row.doctors_available,
          shiftStatus: row.doctor_shift_status,
          metricDefinition: 'Board-certified emergency physicians on casualty triage',
          dataProvenance: row.data_provenance,
        },
        {
          hospitalId: row.hospital_id,
          staffCategory: 'EMERGENCY_NURSE',
          scheduledOnDutyCount: row.nurses_on_duty,
          currentlyAvailableCount: row.nurses_available,
          shiftStatus: row.nurse_shift_status,
          metricDefinition: 'Triage and critical care nurses on shift',
          dataProvenance: row.data_provenance,
        },
        {
          hospitalId: row.hospital_id,
          staffCategory: 'TRAUMA_SURGEON',
          scheduledOnDutyCount: row.surgeons_on_duty,
          currentlyAvailableCount: row.surgeons_available,
          shiftStatus: row.doctor_shift_status,
          metricDefinition: 'Trauma surgeons on-call and on-site for emergency operations',
          dataProvenance: row.data_provenance,
        },
        {
          hospitalId: row.hospital_id,
          staffCategory: 'ANESTHESIOLOGIST',
          scheduledOnDutyCount: row.anesthesiologists_on_duty,
          currentlyAvailableCount: row.anesthesiologists_available,
          shiftStatus: row.doctor_shift_status,
          metricDefinition: 'Critical care anesthesiologists available for immediate resuscitation',
          dataProvenance: row.data_provenance,
        },
      ],
    });

    // 4. Refresh Ambulances
    await prisma.ambulanceAvailability.deleteMany({ where: { hospitalId: row.hospital_id } });
    if (row.ambulances && row.ambulances.length > 0) {
      await prisma.ambulanceAvailability.createMany({
        data: row.ambulances.map((a) => ({
          hospitalId: row.hospital_id,
          registrationPlate: a.registrationPlate,
          ambulanceType: a.ambulanceType,
          status: a.status,
          currentLocation: a.currentLocation || `${row.name} Base Station`,
          dataProvenance: row.data_provenance,
        })),
      });
    }
  }

  return { loaded: rows.length };
}
