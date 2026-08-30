import { PrismaClient } from '@prisma/client';
import { WORKFLOW_REGISTRY } from '../workflows';

const db = new PrismaClient();

async function seedWorkflows() {
  for (const workflow of Object.values(WORKFLOW_REGISTRY)) {
    await db.workflow.upsert({
      where: { id: workflow.id },
      update: { name: workflow.name, configJson: workflow as unknown as object },
      create: { id: workflow.id, name: workflow.name, configJson: workflow as unknown as object },
    });
  }
  console.log(`Seeded ${Object.keys(WORKFLOW_REGISTRY).length} workflows.`);
}

async function seedProviderConfigs() {
  // Zero-infra default: every capability points at the mock provider, primary=true.
  // A user (or a later real-provider phase) flips these in the Providers settings page.
  const defaults: { capability: 'LLM' | 'IMAGE' | 'VIDEO' | 'TTS'; providerId: string }[] = [
    { capability: 'LLM', providerId: 'mock' },
    { capability: 'IMAGE', providerId: 'mock' },
    { capability: 'VIDEO', providerId: 'mock' },
    { capability: 'TTS', providerId: 'mock' },
  ];
  for (const d of defaults) {
    await db.providerConfig.upsert({
      where: { capability_providerId: { capability: d.capability, providerId: d.providerId } },
      update: { isPrimary: true },
      create: { capability: d.capability, providerId: d.providerId, isPrimary: true, isFallback: false },
    });
  }
  console.log(`Seeded ${defaults.length} default (mock) provider configs.`);
}

async function main() {
  await seedWorkflows();
  await seedProviderConfigs();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
