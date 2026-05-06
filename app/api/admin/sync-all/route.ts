import { NextRequest, NextResponse } from "next/server";
import { syncMetaTodosClientes } from "@/lib/sync/metaApiSync";
import { syncGoogleAdsTodosClientes } from "@/lib/sync/googleAdsApiSync";
import { syncAnalyticsTodosClientes } from "@/lib/sync/analyticsApiSync";

function isAdminAuthorized(request: NextRequest): boolean {
  const token = request.headers.get("x-admin-token") ?? request.nextUrl.searchParams.get("token");
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return true;
  return token === expected;
}

/**
 * Sincroniza Meta API, Google Ads API e GA4 para todos os clientes.
 * Protegido por token de admin. Usado pelo botão "Atualizar todos" no painel.
 * Aceita dateFrom/dateTo no body para forçar re-sync de um período específico.
 */
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const dateFrom = body?.dateFrom as string | undefined;
  const dateTo = body?.dateTo as string | undefined;

  try {
    const [metaResults, googleAdsResults, analyticsResults] = await Promise.all([
      syncMetaTodosClientes({ ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) }),
      syncGoogleAdsTodosClientes({ ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) }),
      syncAnalyticsTodosClientes({ ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) }),
    ]);

    const metaErrors = metaResults.filter((r) => r.error);
    const googleErrors = googleAdsResults.filter((r) => r.error);
    const analyticsErrors = analyticsResults.filter((r) => r.error);

    console.log(`[sync-all] meta=${metaResults.length} ok / ${metaErrors.length} erros | google=${googleAdsResults.length} ok / ${googleErrors.length} erros | analytics=${analyticsResults.length} ok / ${analyticsErrors.length} erros`);

    return NextResponse.json({
      ok: true,
      metaResults,
      googleAdsResults,
      analyticsResults,
      summary: {
        metaOk: metaResults.length - metaErrors.length,
        metaErros: metaErrors.length,
        googleOk: googleAdsResults.length - googleErrors.length,
        googleErros: googleErrors.length,
        analyticsOk: analyticsResults.length - analyticsErrors.length,
        analyticsErros: analyticsErrors.length,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const maxDuration = 300;
