import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { createDemoData } from "../src/lib/demo-data";

const prisma = new PrismaClient({ datasources: { db: { url: "file:./dev.db" } } });

async function main() {
  const hash = await bcrypt.hash("Admin@123", 10);
  for (const center of [
    { id: "c1", code: "CTR-001", name: "Sunshine Anganwadi Center", village: "Rajpur", district: "Pune", state: "Maharashtra" },
    { id: "c2", code: "CTR-002", name: "Rainbow Learning Center", village: "Khandala", district: "Satara", state: "Maharashtra" },
  ]) {
    await prisma.center.upsert({ where: { id: center.id }, update: {}, create: center });
  }
  for (const user of [
    { id: "da1", name: "Priya Sharma", email: "district@demo.balsathi", role: "DISTRICT_ADMIN", phone: "9000000001", centerIds: [], passwordHash: hash },
    { id: "ca1", name: "Meena Patil", email: "admin@demo.balsathi", role: "CENTER_ADMIN", phone: "9000000002", centerIds: ["c1"], passwordHash: hash },
    { id: "w1", name: "Anjali Singh", email: "worker@demo.balsathi", role: "WORKER", phone: "9000000003", centerIds: ["c1"], passwordHash: hash },
    { id: "p1", name: "Ravi Kumar", email: "parent@demo.balsathi", role: "PARENT", phone: "9000000004", centerIds: [], passwordHash: hash },
  ] as const) {
    await prisma.user.upsert({ where: { id: user.id }, update: {}, create: user });
  }
  // Create guardian and link to parent user
  await prisma.guardian.upsert({
    where: { id: "g1" },
    update: {},
    create: { id: "g1", name: "Ravi Kumar", phone: "9000000004", address: "Rajpur Village", linkedUserId: "p1" },
  });
  // Create children
  await prisma.child.upsert({
    where: { id: "ch1" },
    update: {},
    create: {
      id: "ch1", internalId: "BAL-001", fullName: "Aryan Kumar", dateOfBirth: new Date("2022-03-15"), gender: "MALE",
      centerId: "c1", assignedWorkerId: "w1", primaryLanguage: "hi",
      emergencyContactName: "Ravi Kumar", emergencyContactPhone: "9000000004",
      siblingIds: [],
      guardianLinks: { create: { guardianId: "g1", relationship: "FATHER", isPrimary: true } },
    },
  });
  await prisma.child.upsert({
    where: { id: "ch2" },
    update: {},
    create: {
      id: "ch2", internalId: "BAL-002", fullName: "Neha Sharma", dateOfBirth: new Date("2021-07-20"), gender: "FEMALE",
      centerId: "c1", assignedWorkerId: "w1", primaryLanguage: "en",
      emergencyContactName: "Sunita Sharma", emergencyContactPhone: "9000000005",
      siblingIds: [],
    },
  });
  const milestones = createDemoData().milestoneDefinitions;
  for (const milestone of milestones) {
    const definition = {
      domain: milestone.domain,
      titleEn: milestone.title.en,
      titleHi: milestone.title.hi,
      titleMr: milestone.title.mr,
      descriptionEn: milestone.description.en,
      descriptionHi: milestone.description.hi,
      descriptionMr: milestone.description.mr,
      minAgeMonths: milestone.minAgeMonths,
      maxAgeMonths: milestone.maxAgeMonths,
      reviewAfterMonths: milestone.reviewAfterMonths,
      activitiesEn: milestone.activities.en,
      activitiesHi: milestone.activities.hi,
      activitiesMr: milestone.activities.mr,
      active: milestone.active,
    };
    await prisma.milestoneDefinition.upsert({
      where: { slug: milestone.slug },
      update: definition,
      create: { id: milestone.id, slug: milestone.slug, ...definition },
    });
  }
  console.log(`Seeded dev.db successfully. Milestone definitions: ${milestones.length}`);
  console.log("Accounts created:");
  console.log("  district@demo.balsathi / Admin@123  — District Admin");
  console.log("  admin@demo.balsathi    / Admin@123  — Center Admin (Sunshine)");
  console.log("  worker@demo.balsathi   / Admin@123  — Worker (Sunshine)");
  console.log("  parent@demo.balsathi   / Admin@123  — Parent (linked to Aryan Kumar)");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
