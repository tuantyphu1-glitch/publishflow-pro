import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { UpdateProviderConfigRequestSchema } from '@/lib/validation/schemas';

export async function GET() {
  const configs = await db.providerConfig.findMany({ orderBy: [{ capability: 'asc' }, { providerId: 'asc' }] });
  return NextResponse.json(configs);
}

/** Upserts a ProviderConfig row. Setting isPrimary:true demotes any other primary for the same capability. */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = UpdateProviderConfigRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }
  const { capability, providerId, isPrimary, isFallback, config } = parsed.data;

  await db.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.providerConfig.updateMany({ where: { capability, isPrimary: true }, data: { isPrimary: false } });
    }
    if (isFallback) {
      await tx.providerConfig.updateMany({ where: { capability, isFallback: true }, data: { isFallback: false } });
    }
    const configJson = config as Prisma.InputJsonValue | undefined;
    await tx.providerConfig.upsert({
      where: { capability_providerId: { capability, providerId } },
      update: { isPrimary: isPrimary ?? undefined, isFallback: isFallback ?? undefined, config: configJson },
      create: { capability, providerId, isPrimary: isPrimary ?? false, isFallback: isFallback ?? false, config: configJson },
    });
  });

  const updated = await db.providerConfig.findMany({ orderBy: [{ capability: 'asc' }, { providerId: 'asc' }] });
  return NextResponse.json(updated);
}
