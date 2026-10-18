import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { loadDemoCsvDataIntoDatabase } from '../src/services/csvResourceLoader.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SurgeWatch Emergency Database with Bengaluru Hospitals and Resources...');

  // Clean existing records in correct relation order
  await prisma.resourceUpdateAudit.deleteMany({});
  await prisma.emergencyRequest.deleteMany({});
  await prisma.hospitalAccessRequest.deleteMany({});
  await prisma.ambulanceAvailability.deleteMany({});
  await prisma.staffAvailability.deleteMany({});
  await prisma.bedAvailability.deleteMany({});
  await prisma.hospitalMembership.deleteMany({});
  await prisma.hospital.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Core Platform Users
  const platAdminPass = await bcrypt.hash('SuperAdmin@123', 10);
  await prisma.user.create({
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

  // 2. Load and Seed Hospitals from Demonstration Resource CSV
  const { loaded } = await loadDemoCsvDataIntoDatabase(prisma);
  console.log(`Successfully seeded ${loaded} hospitals with bed, staff, and ambulance availability.`);

  // 3. Establish Hospital Memberships for Admins
  await prisma.hospitalMembership.create({
    data: {
      userId: victoriaAdmin.id,
      hospitalId: 'hosp-victoria',
      assignedRole: 'ADMIN',
    },
  });

  await prisma.hospitalMembership.create({
    data: {
      userId: manipalAdmin.id,
      hospitalId: 'hosp-manipal-old-airport',
      assignedRole: 'ADMIN',
    },
  });

  // 4. Create Initial Audit Logs
  await prisma.resourceUpdateAudit.create({
    data: {
      hospitalId: 'hosp-victoria',
      changedByUserId: victoriaAdmin.id,
      resourceCategory: 'BEDS',
      previousState: JSON.stringify({ availableBeds: 4 }),
      newState: JSON.stringify({ availableBeds: 6 }),
      changeSummary: 'Available ICU beds updated from 4 to 6 upon ward discharge.',
      ipAddress: '127.0.0.1',
    },
  });

  // 5. Create Sample Emergency Request
  const victoriaAmbulance = await prisma.ambulanceAvailability.findFirst({
    where: { hospitalId: 'hosp-victoria', status: 'AVAILABLE' },
  });

  if (victoriaAmbulance) {
    const emergency = await prisma.emergencyRequest.create({
      data: {
        hospitalId: 'hosp-victoria',
        patientName: 'Demo Casualty Case (Corporation Circle RTA)',
        contactPhone: '+91 98450 99999',
        emergencyType: 'TRAUMA_ACCIDENT',
        severity: 'CRITICAL',
        latitude: 12.9667,
        longitude: 77.5855,
        pickupAddress: 'Corporation Circle, Nrupathunga Road, Bengaluru',
        status: 'PENDING',
        dispatchNotes: 'Two-wheeler collision with traumatic head injury signaling.',
      },
    });
    console.log(`Created demonstration emergency request: ${emergency.id}`);
  }

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
