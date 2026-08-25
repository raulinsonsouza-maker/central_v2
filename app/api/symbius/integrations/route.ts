import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { isSession, requireApiSession } from "@/lib/symbius/apiHelpers";
import { ensureApiKey, getOrCreateOrgSettings } from "@/lib/symbius/integrations";

export async function GET() {
  const session = await requireApiSession("ADMIN");
  if (!isSession(session)) return session;

  const settings = await getOrCreateOrgSettings(session.organizationId);
  return NextResponse.json({
    settings: {
      webhookUrl: settings.webhookUrl,
      webhookEvents: settings.webhookEvents,
      googleSheetId: settings.googleSheetId,
      googleSheetTab: settings.googleSheetTab,
      syncCentralCrm: settings.syncCentralCrm,
      hasApiKey: Boolean(settings.apiKey),
    },
  });
}

const schema = z.object({
  webhookUrl: z.string().url().optional().nullable(),
  webhookEvents: z.array(z.string()).optional(),
  googleSheetId: z.string().optional().nullable(),
  googleSheetTab: z.string().optional().nullable(),
  syncCentralCrm: z.boolean().optional(),
  regenerateApiKey: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await requireApiSession("ADMIN");
  if (!isSession(session)) return session;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  let apiKey: string | undefined;
  if (parsed.data.regenerateApiKey) {
    apiKey = `sym_${crypto.randomBytes(24).toString("hex")}`;
  }

  const settings = await prisma.igOrgSettings.upsert({
    where: { organizationId: session.organizationId },
    create: {
      organizationId: session.organizationId,
      webhookUrl: parsed.data.webhookUrl ?? undefined,
      webhookEvents: parsed.data.webhookEvents ?? [],
      googleSheetId: parsed.data.googleSheetId ?? undefined,
      googleSheetTab: parsed.data.googleSheetTab ?? undefined,
      syncCentralCrm: parsed.data.syncCentralCrm ?? false,
      apiKey,
    },
    update: {
      webhookUrl: parsed.data.webhookUrl ?? undefined,
      webhookEvents: parsed.data.webhookEvents,
      googleSheetId: parsed.data.googleSheetId ?? undefined,
      googleSheetTab: parsed.data.googleSheetTab ?? undefined,
      syncCentralCrm: parsed.data.syncCentralCrm,
      ...(apiKey ? { apiKey } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    apiKey: parsed.data.regenerateApiKey ? settings.apiKey : undefined,
  });
}

export async function POST() {
  const session = await requireApiSession("ADMIN");
  if (!isSession(session)) return session;

  const apiKey = await ensureApiKey(session.organizationId);
  return NextResponse.json({ apiKey });
}
