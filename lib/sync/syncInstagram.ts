/**
 * Sincronização de insights mensais do Instagram para o banco de dados.
 * Busca os últimos 13 meses de alcance, engajamento e novos seguidores
 * via Instagram Graph API e persiste em InstagramInsightMensal (upsert).
 *
 * Chamado pelo runDailySync após o sync Meta Ads.
 */
import { prisma } from "@/lib/db";
import { resolveMetaCredentials } from "@/lib/config/resolveIntegracao";
import { discoverInstagramId } from "@/lib/sync/discoverInstagramId";

const GRAPH = "https://graph.facebook.com/v19.0";

export interface InstagramSyncResult {
  clienteId: string;
  monthsProcessed?: number;
  error?: string;
}

function toUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

async function igGet(
  path: string,
  token: string,
  params: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const sp = new URLSearchParams({ access_token: token, ...params });
  const res = await fetch(`${GRAPH}/${path}?${sp}`);
  const json = (await res.json()) as Record<string, unknown>;
  if (json.error) {
    const err = json.error as { message?: string };
    throw new Error(`IG API: ${err.message ?? String(json.error)}`);
  }
  return json;
}

/**
 * Sincroniza insights mensais do Instagram de um único cliente.
 */
export async function syncInstagramCliente(
  clienteId: string,
): Promise<InstagramSyncResult> {
  const igId = await discoverInstagramId(clienteId);
  if (!igId) {
    return { clienteId, error: "Sem conta Instagram configurada" };
  }

  const creds = await resolveMetaCredentials(clienteId);
  if (!creds?.token) {
    return { clienteId, error: "Sem credenciais Meta configuradas" };
  }
  const token = creds.token;

  try {
    const now = new Date();
    const since13 = new Date(now);
    since13.setMonth(since13.getMonth() - 13);
    since13.setDate(1);
    since13.setHours(0, 0, 0, 0);

    const [profileRaw, insightsRaw, followsRaw] = await Promise.all([
      igGet(igId, token, { fields: "followers_count,name" }),
      igGet(`${igId}/insights`, token, {
        metric: "reach,total_interactions",
        period: "month",
        since: String(toUnix(since13)),
        until: String(toUnix(now)),
      }),
      igGet(`${igId}/insights`, token, {
        metric: "new_follows",
        period: "month",
        since: String(toUnix(since13)),
        until: String(toUnix(now)),
      }),
    ]);

    const followersTotal = (profileRaw.followers_count as number) ?? 0;

    type InsightValue = { value: number; end_time: string };
    type InsightSeries = { name: string; values?: InsightValue[] };

    const insightsData = (insightsRaw.data as InsightSeries[]) ?? [];
    const followsData = (followsRaw.data as InsightSeries[]) ?? [];

    const reachArr =
      (insightsData.find((d) => d.name === "reach")?.values ?? []);
    const interArr =
      (insightsData.find((d) => d.name === "total_interactions")?.values ?? []);
    const followsArr =
      (followsData.find((d) => d.name === "new_follows")?.values ?? []);

    type MonthBucket = {
      ano: number;
      mes: number;
      alcance: number;
      engajamento: number;
      novosSeguidores: number;
    };

    const monthMap = new Map<string, MonthBucket>();

    function endTimeToYearMonth(endTime: string): { ano: number; mes: number; key: string } {
      const d = new Date(endTime);
      d.setDate(d.getDate() - 1);
      const ano = d.getFullYear();
      const mes = d.getMonth() + 1;
      return { ano, mes, key: `${ano}-${String(mes).padStart(2, "0")}` };
    }

    for (const r of reachArr) {
      const { ano, mes, key } = endTimeToYearMonth(r.end_time);
      const entry = monthMap.get(key) ?? { ano, mes, alcance: 0, engajamento: 0, novosSeguidores: 0 };
      entry.alcance = r.value;
      monthMap.set(key, entry);
    }
    for (const r of interArr) {
      const { ano, mes, key } = endTimeToYearMonth(r.end_time);
      const entry = monthMap.get(key) ?? { ano, mes, alcance: 0, engajamento: 0, novosSeguidores: 0 };
      entry.engajamento = r.value;
      monthMap.set(key, entry);
    }
    for (const r of followsArr) {
      const { ano, mes, key } = endTimeToYearMonth(r.end_time);
      const entry = monthMap.get(key) ?? { ano, mes, alcance: 0, engajamento: 0, novosSeguidores: 0 };
      entry.novosSeguidores = r.value;
      monthMap.set(key, entry);
    }

    const syncedAt = new Date();
    const upserts = [...monthMap.values()].map((bucket) =>
      prisma.instagramInsightMensal.upsert({
        where: { clienteId_ano_mes: { clienteId, ano: bucket.ano, mes: bucket.mes } },
        create: {
          clienteId,
          ano: bucket.ano,
          mes: bucket.mes,
          alcance: bucket.alcance,
          engajamento: bucket.engajamento,
          novosSeguidores: bucket.novosSeguidores,
          followersTotal,
          syncedAt,
        },
        update: {
          alcance: bucket.alcance,
          engajamento: bucket.engajamento,
          novosSeguidores: bucket.novosSeguidores,
          followersTotal,
          syncedAt,
        },
      }),
    );

    await Promise.all(upserts);

    return { clienteId, monthsProcessed: monthMap.size };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { clienteId, error: msg };
  }
}

/**
 * Sincroniza Instagram de todos os clientes que têm conta INSTAGRAM configurada.
 */
export async function syncInstagramTodosClientes(): Promise<
  InstagramSyncResult[]
> {
  const contas = await prisma.conta.findMany({
    where: { plataforma: "INSTAGRAM", accountIdPlataforma: { not: null } },
    select: { clienteId: true },
    distinct: ["clienteId"],
  });

  const results: InstagramSyncResult[] = [];
  for (const { clienteId } of contas) {
    const result = await syncInstagramCliente(clienteId);
    results.push(result);
  }
  return results;
}
