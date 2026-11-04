import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { generateRandomToken } from '../utils/token.js';

interface CliArgs {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  forceReset?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--email=')) {
      args.email = arg.split('=')[1].trim().toLowerCase();
    } else if (arg.startsWith('--password=')) {
      args.password = arg.split('=')[1].trim();
    } else if (arg.startsWith('--name=')) {
      args.name = arg.split('=')[1].trim();
    } else if (arg.startsWith('--phone=')) {
      args.phone = arg.split('=')[1].trim();
    } else if (arg === '--force-reset' || arg === '--force') {
      args.forceReset = true;
    }
  }

  // Fallback to environment variables if arguments are omitted
  if (!args.email && process.env.INITIAL_MASTER_ADMIN_EMAIL) {
    args.email = process.env.INITIAL_MASTER_ADMIN_EMAIL.trim().toLowerCase();
  }
  if (!args.password && process.env.INITIAL_MASTER_ADMIN_PASSWORD) {
    args.password = process.env.INITIAL_MASTER_ADMIN_PASSWORD.trim();
  }
  if (!args.name && process.env.INITIAL_MASTER_ADMIN_NAME) {
    args.name = process.env.INITIAL_MASTER_ADMIN_NAME.trim();
  }

  return args;
}

export async function bootstrapMasterAdmin(customArgs?: CliArgs) {
  const args = customArgs || parseArgs();

  console.log('========================================================================');
  console.log('      SURGEWATCH SECURE MASTER ADMINISTRATOR PROVISIONING TOOL          ');
  console.log('========================================================================\n');

  const email = args.email || 'masteradmin@surgewatch.in';
  const fullName = args.name || 'SurgeWatch Master Administrator';
  const phone = args.phone || '+91 80 2222 0000';

  if (!email || !email.includes('@')) {
    console.error('[ERROR] A valid email address is required.');
    process.exit(1);
  }

  // Auto-generate strong password if not supplied
  let password = args.password;
  let wasGenerated = false;
  if (!password) {
    password = `SW-Master-${generateRandomToken(8)}!`;
    wasGenerated = true;
  }

  if (password.length < 10) {
    console.error('[ERROR] Master Administrator password must be at least 10 characters long.');
    process.exit(1);
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const isSuperUser =
        existingUser.role === 'MASTER_ADMIN' || existingUser.role === 'PLATFORM_ADMIN';

      if (isSuperUser && !args.forceReset) {
        console.log(`[NOTICE] Administrator account (${email}) already exists with role: ${existingUser.role}.`);
        console.log('Duplicate bootstrap prevented. To rotate credentials, pass --force-reset.');
        return existingUser;
      }

      if (existingUser.role === 'PATIENT' && !args.forceReset) {
        console.error(`[SECURITY ERROR] An account with email (${email}) already exists as a PATIENT.`);
        console.error('Refusing to silently overwrite public patient account without --force-reset.');
        process.exit(1);
      }

      // If forceReset is explicitly requested
      console.log(`[UPDATE] Updating credentials for existing administrator: ${email}...`);
      const passwordHash = await bcrypt.hash(password, 12);
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          role: 'MASTER_ADMIN',
          fullName: fullName || existingUser.fullName,
          isActive: true,
        },
      });

      console.log(`[SUCCESS] Master Administrator updated successfully!`);
      console.log(`  User ID: ${updatedUser.id}`);
      console.log(`  Email:   ${updatedUser.email}`);
      console.log(`  Role:    ${updatedUser.role}`);
      if (wasGenerated) {
        console.log(`\n  GENERATED TEMPORARY PASSWORD: ${password}`);
        console.log('  Please store this password in a secure vault immediately.\n');
      }

      return updatedUser;
    }

    // Provision new MASTER_ADMIN
    console.log(`[PROVISION] Creating new Master Administrator (${email})...`);
    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        role: 'MASTER_ADMIN',
        isActive: true,
      },
    });

    console.log(`\n[SUCCESS] Master Administrator provisioned successfully!`);
    console.log(`  User ID: ${newUser.id}`);
    console.log(`  Email:   ${newUser.email}`);
    console.log(`  Role:    ${newUser.role}`);
    console.log(`  Name:    ${newUser.fullName}`);
    if (wasGenerated) {
      console.log(`\n  GENERATED CREDENTIALS:`);
      console.log(`  Password: ${password}`);
      console.log('  Please save this credential securely.\n');
    }

    return newUser;
  } catch (error) {
    console.error('[FATAL] Failed to provision Master Administrator:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly from CLI
if (process.argv[1]?.endsWith('createMasterAdmin.ts') || process.argv[1]?.endsWith('createMasterAdmin.js')) {
  bootstrapMasterAdmin();
}

