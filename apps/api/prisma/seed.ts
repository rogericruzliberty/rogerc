/**
 * Liberty Field App — Database Seed
 *
 * Creates the initial admin user and a sample project.
 * Run: npx tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('LibertyAdmin2024!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'roger.i.cruz@libertycd.com' },
    update: {},
    create: {
      email: 'roger.i.cruz@libertycd.com',
      name: 'Roger Cruz',
      role: 'ADMIN',
      passwordHash,
    },
  });

  console.log(`Admin user created: ${admin.email} (${admin.id})`);

  // Create a sample project
  const project = await prisma.project.upsert({
    where: { id: 'sample-project-001' },
    update: {},
    create: {
      id: 'sample-project-001',
      name: 'Sample Medical Office Buildout',
      address: '123 Main Street',
      suiteNumber: '200',
      clientName: 'Dr. Smith',
      createdBy: admin.id,
    },
  });

  console.log(`Sample project created: ${project.name} (${project.id})`);

  console.log('\nSeed complete!');
  console.log('Login with: roger.i.cruz@libertycd.com / LibertyAdmin2024!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
