import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SurgeWatch Emergency Database with Bengaluru Hospitals...');

  // Clean existing records in correct relation order
  await prisma.resourceUpdateAudit.deleteMany({});
  await prisma.hospitalAccessRequest.deleteMany({});
  await prisma.ambulanceAvailability.deleteMany({});
  await prisma.staffAvailability.deleteMany({});
  await prisma.bedAvailability.deleteMany({});
  await prisma.hospitalMembership.deleteMany({});
  await prisma.hospital.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Core Platform Users
  const platAdminPass = await bcrypt.hash('SuperAdmin@123', 10);
  const platAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@surgewatch.in',
      passwordHash: platAdminPass,
      fullName: 'SurgeWatch Platform Operations Lead',
      role: 'PLATFORM_ADMIN',
    },
  });

  const victoriaAdminPass = await bcrypt.hash('VictoriaAdmin@123', 10);
  const victoriaAdmin = await prisma.user.create({
    data: {
      email: 'admin@victoria.gov.in',
      passwordHash: victoriaAdminPass,
      fullName: 'Dr. C. R. Shivananda (Chief Medical Officer)',
      role: 'HOSPITAL_ADMIN',
    },
  });

  const manipalAdminPass = await bcrypt.hash('ManipalAdmin@123', 10);
  const manipalAdmin = await prisma.user.create({
    data: {
      email: 'admin@manipal.org',
      passwordHash: manipalAdminPass,
      fullName: 'Dr. L. K. Mahesh (Emergency Services Lead)',
      role: 'HOSPITAL_ADMIN',
    },
  });

  const patientPass = await bcrypt.hash('Patient@123', 10);
  await prisma.user.create({
    data: {
      email: 'patient@example.com',
      passwordHash: patientPass,
      fullName: 'Arun Varma (Patient)',
      role: 'PATIENT',
      phone: '+91 98450 12345',
    },
  });

  // 2. Seed Bengaluru Emergency Hospitals
  // A. Victoria Hospital
  const victoria = await prisma.hospital.create({
    data: {
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
      emergencyServices: JSON.stringify([
        '24/7 Level 1 Trauma Care',
        'Burns Emergency Unit',
        'Multi-organ ICU',
        'Cardiac Resuscitation',
        'Emergency Blood Bank',
      ]),
      verificationStatus: 'VERIFIED',
      operatingStatus: 'OPERATIONAL',
      isDemoData: true,
      lastResourceUpdate: new Date(Date.now() - 12 * 60 * 1000), // 12 mins ago (LIVE)
    },
  });

  await prisma.hospitalMembership.create({
    data: {
      userId: victoriaAdmin.id,
      hospitalId: victoria.id,
      assignedRole: 'ADMIN',
    },
  });

  await prisma.bedAvailability.createMany({
    data: [
      { hospitalId: victoria.id, category: 'EMERGENCY_ICU', totalBeds: 24, occupiedBeds: 18, availableBeds: 6 },
      { hospitalId: victoria.id, category: 'TRAUMA_RESUSCITATION', totalBeds: 12, occupiedBeds: 8, availableBeds: 4 },
      { hospitalId: victoria.id, category: 'EMERGENCY_GENERAL', totalBeds: 50, occupiedBeds: 38, availableBeds: 12 },
      { hospitalId: victoria.id, category: 'OXYGEN_CRITICAL', totalBeds: 30, occupiedBeds: 21, availableBeds: 9 },
    ],
  });

  await prisma.staffAvailability.createMany({
    data: [
      {
        hospitalId: victoria.id,
        staffCategory: 'EMERGENCY_PHYSICIAN',
        scheduledOnDutyCount: 8,
        currentlyAvailableCount: 3,
        metricDefinition: 'Physicians currently unassigned and ready for immediate casualty triage',
      },
      {
        hospitalId: victoria.id,
        staffCategory: 'TRAUMA_SURGEON',
        scheduledOnDutyCount: 4,
        currentlyAvailableCount: 2,
        metricDefinition: 'Board-certified surgeons on-site and not in continuous operations',
      },
    ],
  });

  await prisma.ambulanceAvailability.createMany({
    data: [
      { hospitalId: victoria.id, ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS', status: 'AVAILABLE_READY', registrationPlate: 'KA-01-EA-108' },
      { hospitalId: victoria.id, ambulanceType: 'BASIC_LIFE_SUPPORT_BLS', status: 'AVAILABLE_READY', registrationPlate: 'KA-01-EA-112' },
      { hospitalId: victoria.id, ambulanceType: 'MOBILE_ICU', status: 'AVAILABLE_READY', registrationPlate: 'KA-01-EA-104' },
    ],
  });

  // B. Manipal Hospital (Old Airport Road)
  const manipal = await prisma.hospital.create({
    data: {
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
      emergencyServices: JSON.stringify([
        'Comprehensive Stroke Center',
        'Interventional Cath Lab (24/7)',
        'Pediatric Intensive Care',
        'Polytrauma Emergency',
        'Helipad Triage',
      ]),
      verificationStatus: 'VERIFIED',
      operatingStatus: 'OPERATIONAL',
      isDemoData: true,
      lastResourceUpdate: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago (LIVE)
    },
  });

  await prisma.hospitalMembership.create({
    data: {
      userId: manipalAdmin.id,
      hospitalId: manipal.id,
      assignedRole: 'ADMIN',
    },
  });

  await prisma.bedAvailability.createMany({
    data: [
      { hospitalId: manipal.id, category: 'EMERGENCY_ICU', totalBeds: 28, occupiedBeds: 23, availableBeds: 5 },
      { hospitalId: manipal.id, category: 'TRAUMA_RESUSCITATION', totalBeds: 8, occupiedBeds: 5, availableBeds: 3 },
      { hospitalId: manipal.id, category: 'EMERGENCY_GENERAL', totalBeds: 40, occupiedBeds: 31, availableBeds: 9 },
    ],
  });

  await prisma.staffAvailability.createMany({
    data: [
      {
        hospitalId: manipal.id,
        staffCategory: 'EMERGENCY_PHYSICIAN',
        scheduledOnDutyCount: 10,
        currentlyAvailableCount: 4,
        metricDefinition: 'Physicians currently unassigned and ready for immediate casualty triage',
      },
    ],
  });

  await prisma.ambulanceAvailability.createMany({
    data: [
      { hospitalId: manipal.id, ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS', status: 'AVAILABLE_READY', registrationPlate: 'KA-04-MH-901' },
      { hospitalId: manipal.id, ambulanceType: 'MOBILE_ICU', status: 'AVAILABLE_READY', registrationPlate: 'KA-04-MH-902' },
    ],
  });

  // C. St. John's Medical College Hospital
  await prisma.hospital.create({
    data: {
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
      emergencyServices: JSON.stringify([
        '24/7 Casualty & Triage',
        'Dedicated Cardiac ICU',
        'Snake Bite & Toxicology Center',
        'Orthopedic Trauma Unit',
      ]),
      verificationStatus: 'VERIFIED',
      operatingStatus: 'OPERATIONAL',
      isDemoData: true,
      lastResourceUpdate: new Date(Date.now() - 50 * 60 * 1000), // 50 mins ago (RECENT)
      beds: {
        create: [
          { category: 'EMERGENCY_ICU', totalBeds: 32, occupiedBeds: 27, availableBeds: 5 },
          { category: 'TRAUMA_RESUSCITATION', totalBeds: 10, occupiedBeds: 7, availableBeds: 3 },
          { category: 'EMERGENCY_GENERAL', totalBeds: 60, occupiedBeds: 48, availableBeds: 12 },
        ],
      },
      staff: {
        create: [
          {
            staffCategory: 'EMERGENCY_PHYSICIAN',
            scheduledOnDutyCount: 12,
            currentlyAvailableCount: 5,
            metricDefinition: 'Physicians currently unassigned and ready for immediate casualty triage',
          },
        ],
      },
      ambulances: {
        create: [
          { ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS', status: 'AVAILABLE_READY' },
          { ambulanceType: 'BASIC_LIFE_SUPPORT_BLS', status: 'AVAILABLE_READY' },
        ],
      },
    },
  });

  // D. Bowring & Lady Curzon Hospital (Stale Demonstration)
  await prisma.hospital.create({
    data: {
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
      emergencyServices: JSON.stringify([
        '24/7 Government Emergency Room',
        'Maternal Emergency',
        'Poison Triage Unit',
        'General Trauma Service',
      ]),
      verificationStatus: 'VERIFIED',
      operatingStatus: 'OPERATIONAL',
      isDemoData: true,
      lastResourceUpdate: new Date(Date.now() - 180 * 60 * 1000), // 3 hours ago (STALE)
      beds: {
        create: [
          { category: 'EMERGENCY_ICU', totalBeds: 18, occupiedBeds: 16, availableBeds: 2 },
          { category: 'TRAUMA_RESUSCITATION', totalBeds: 6, occupiedBeds: 4, availableBeds: 2 },
          { category: 'EMERGENCY_GENERAL', totalBeds: 45, occupiedBeds: 39, availableBeds: 6 },
        ],
      },
      staff: {
        create: [
          {
            staffCategory: 'EMERGENCY_PHYSICIAN',
            scheduledOnDutyCount: 6,
            currentlyAvailableCount: 2,
            metricDefinition: 'Physicians currently unassigned and ready for immediate casualty triage',
          },
        ],
      },
      ambulances: {
        create: [
          { ambulanceType: 'BASIC_LIFE_SUPPORT_BLS', status: 'AVAILABLE_READY' },
        ],
      },
    },
  });

  // E. Apollo Hospitals Bannerghatta Road
  await prisma.hospital.create({
    data: {
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
      emergencyServices: JSON.stringify([
        'National Emergency 1066 Hub',
        'Rapid Interventional Cardiology',
        'Neuro-trauma Emergency',
        'Advanced Critical Care',
      ]),
      verificationStatus: 'VERIFIED',
      operatingStatus: 'OPERATIONAL',
      isDemoData: true,
      lastResourceUpdate: new Date(Date.now() - 8 * 60 * 1000), // 8 mins ago (LIVE)
      beds: {
        create: [
          { category: 'EMERGENCY_ICU', totalBeds: 26, occupiedBeds: 19, availableBeds: 7 },
          { category: 'TRAUMA_RESUSCITATION', totalBeds: 8, occupiedBeds: 4, availableBeds: 4 },
        ],
      },
      staff: {
        create: [
          {
            staffCategory: 'EMERGENCY_PHYSICIAN',
            scheduledOnDutyCount: 9,
            currentlyAvailableCount: 4,
            metricDefinition: 'Physicians currently unassigned and ready for immediate casualty triage',
          },
        ],
      },
      ambulances: {
        create: [
          { ambulanceType: 'ADVANCED_LIFE_SUPPORT_ALS', status: 'AVAILABLE_READY' },
        ],
      },
    },
  });

  // 3. Create initial audit log
  await prisma.resourceUpdateAudit.create({
    data: {
      hospitalId: victoria.id,
      changedByUserId: victoriaAdmin.id,
      resourceCategory: 'BEDS',
      previousState: JSON.stringify({ availableBeds: 4 }),
      newState: JSON.stringify({ availableBeds: 6 }),
      changeSummary: 'Available ICU beds updated from 4 to 6 upon ward discharge.',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
