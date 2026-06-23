import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveMetaCredentials } from "@/lib/config/resolveIntegracao";
import { discoverInstagramId } from "@/lib/sync/discoverInstagramId";

const GRAPH = "https://graph.facebook.com/v19.0";

interface CacheEntry {
  data: unknown;
  ts: number;
}
const postCache = new Map<string, CacheEntry>();
const POST_CACHE_TTL = 60 * 60 * 1000; // 1h — top posts still fetched live

function toUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function monthLabel(ano: number, mes: number): string {
  const d = new Date(ano, mes - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

function monthKey(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function endTimeToYearMonth(endTime: string): { ano: number; mes: number } {
  const d = new Date(endTime);
  d.setDate(d.getDate() - 1);
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

async function igGet(path: string, token: string, params: Record<string, string> = {}) {
  const sp = new URLSearchParams({ access_token: token, ...params });
  const res = await fetch(`${GRAPH}/${path}?${sp}`);
  const json = await res.json();
  if (json.error) throw new Error(`IG API: ${json.error.message}`);
  return json;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clienteId } = await params;
  const sp = new URL(req.url).searchParams;
  const dataInicio = sp.get("dataInicio");
  const dataFim = sp.get("dataFim");

  const igId = await discoverInstagramId(clienteId);

  if (!igId) {
    return NextResponse.json({ configured: false });
  }

  // --- Monthly insights: try DB first ---
  const now = new Date();
  const since12 = new Date(now);
  since12.setMonth(since12.getMonth() - 12);
  since12.setDate(1);
  since12.setHours(0, 0, 0, 0);

  const dbInsights = await prisma.instagramInsightMensal.findMany({
    where: {
      clienteId,
      OR: [
        { ano: { gt: since12.getFullYear() } },
        { ano: since12.getFullYear(), mes: { gte: since12.getMonth() + 1 } },
      ],
    },
    orderBy: [{ ano: "asc" }, { mes: "asc" }],
  });

  // Build monthly array from DB rows (prefer DB if we have at least 3 months of data)
  let monthly: Array<{ mes: string; label: string; alcance: number; engajamento: number; novosSeguidores: number }> = [];
  let followersTotal = 0;

  if (dbInsights.length >= 3) {
    monthly = dbInsights.map((row) => ({
      mes: monthKey(row.ano, row.mes),
      label: monthLabel(row.ano, row.mes),
      alcance: row.alcance,
      engajamento: row.engajamento,
      novosSeguidores: row.novosSeguidores,
    }));
    // Use the latest snapshot for followers count
    const latest = dbInsights[dbInsights.length - 1];
    followersTotal = latest.followersTotal;
  } else {
    // Fallback: fetch monthly insights live from the Graph API
    const creds = await resolveMetaCredentials(clienteId);
    if (!creds?.token) {
      return NextResponse.json(
        { configured: true, error: "Sem credenciais Meta configuradas" },
        { status: 401 },
      );
    }
    const token = creds.token;

    try {
      const [profileRaw, insightsRaw, followsRaw] = await Promise.all([
        igGet(`${igId}`, token, { fields: "followers_count,name" }),
        igGet(`${igId}/insights`, token, {
          metric: "reach,total_interactions",
          period: "month",
          since: String(toUnix(since12)),
          until: String(toUnix(now)),
        }),
        igGet(`${igId}/insights`, token, {
          metric: "new_follows",
          period: "month",
          since: String(toUnix(since12)),
          until: String(toUnix(now)),
        }),
      ]);

      followersTotal = profileRaw.followers_count ?? 0;

      const reachArr = (insightsRaw.data?.find((d: { name: string }) => d.name === "reach")?.values ?? []) as Array<{ value: number; end_time: string }>;
      const interArr = (insightsRaw.data?.find((d: { name: string }) => d.name === "total_interactions")?.values ?? []) as Array<{ value: number; end_time: string }>;
      const followsArr = (followsRaw.data?.find((d: { name: string }) => d.name === "new_follows")?.values ?? []) as Array<{ value: number; end_time: string }>;

      const monthMap = new Map<string, { mes: string; label: string; alcance: number; engajamento: number; novosSeguidores: number }>();
      for (const r of reachArr) {
        const { ano, mes } = endTimeToYearMonth(r.end_time);
        const k = monthKey(ano, mes);
        const entry = monthMap.get(k) ?? { mes: k, label: monthLabel(ano, mes), alcance: 0, engajamento: 0, novosSeguidores: 0 };
        entry.alcance = r.value;
        monthMap.set(k, entry);
      }
      for (const r of interArr) {
        const { ano, mes } = endTimeToYearMonth(r.end_time);
        const k = monthKey(ano, mes);
        const entry = monthMap.get(k) ?? { mes: k, label: monthLabel(ano, mes), alcance: 0, engajamento: 0, novosSeguidores: 0 };
        entry.engajamento = r.value;
        monthMap.set(k, entry);
      }
      for (const r of followsArr) {
        const { ano, mes } = endTimeToYearMonth(r.end_time);
        const k = monthKey(ano, mes);
        const entry = monthMap.get(k) ?? { mes: k, label: monthLabel(ano, mes), alcance: 0, engajamento: 0, novosSeguidores: 0 };
        entry.novosSeguidores = r.value;
        monthMap.set(k, entry);
      }
      monthly = [...monthMap.values()].sort((a, b) => a.mes.localeCompare(b.mes));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao consultar Instagram API";
      return NextResponse.json({ configured: true, error: msg }, { status: 500 });
    }
  }

  // For followers total when served from DB: try to get fresh count from DB profile snapshot,
  // but if it's zero fall back to last known.
  const alcanceTotal = monthly.reduce((s, m) => s + m.alcance, 0);
  const engajamentoTotal = monthly.reduce((s, m) => s + m.engajamento, 0);
  const novosSeguidoresTotal = monthly.reduce((s, m) => s + m.novosSeguidores, 0);
  const taxaEngajamento = alcanceTotal > 0 ? (engajamentoTotal / alcanceTotal) * 100 : 0;

  // --- Top posts: still fetched live (parameterized by date range, not cacheable in DB easily) ---
  const mediaStart = dataInicio ?? since12.toISOString().slice(0, 10);
  const mediaEnd = dataFim ?? now.toISOString().slice(0, 10);
  const postCacheKey = `${clienteId}|${mediaStart}|${mediaEnd}`;
  const cachedPosts = postCache.get(postCacheKey);

  let topPosts: unknown[] = [];
  let profileNome = "";

  if (cachedPosts && Date.now() - cachedPosts.ts < POST_CACHE_TTL) {
    const cached = cachedPosts.data as { topPosts: unknown[]; nome: string };
    topPosts = cached.topPosts;
    profileNome = cached.nome;
  } else {
    const creds = await resolveMetaCredentials(clienteId);
    if (creds?.token) {
      const token = creds.token;
      try {
        const [profileRaw, mediaRaw] = await Promise.all([
          igGet(`${igId}`, token, { fields: "followers_count,name" }),
          igGet(`${igId}/media`, token, {
            fields: "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count",
            limit: "50",
          }),
        ]);

        profileNome = profileRaw.name ?? "";
        if (profileRaw.followers_count && !followersTotal) {
          followersTotal = profileRaw.followers_count;
        }

        const allMedia = (mediaRaw.data ?? []) as Array<{
          id: string;
          caption?: string;
          media_type: string;
          media_url?: string;
          thumbnail_url?: string;
          timestamp: string;
          like_count: number;
          comments_count: number;
        }>;

        const filtered = allMedia.filter((m) => {
          const t = m.timestamp.slice(0, 10);
          return t >= mediaStart && t <= mediaEnd;
        });

        const top20 = filtered
          .sort((a, b) => (b.like_count + b.comments_count) - (a.like_count + a.comments_count))
          .slice(0, 20);

        const insightResults = await Promise.allSettled(
          top20.map((m) => igGet(`${m.id}/insights`, token, { metric: "reach,saved,shares" })),
        );

        topPosts = top20.map((m, i) => {
          const insightData = insightResults[i].status === "fulfilled"
            ? (insightResults[i] as PromiseFulfilledResult<{ data?: Array<{ name: string; values?: Array<{ value: number }> }> }>).value.data ?? []
            : [];
          const getMetric = (name: string) =>
            insightData.find((d: { name: string }) => d.name === name)?.values?.[0]?.value ?? 0;
          const alcance = getMetric("reach");
          const salvos = getMetric("saved");
          const compartilhamentos = getMetric("shares");
          const curtidas = m.like_count;
          const comentarios = m.comments_count;
          const totalInteracoes = curtidas + comentarios + salvos + compartilhamentos;
          const taxaPost = alcance > 0 ? (totalInteracoes / alcance) * 100 : 0;
          const thumbnailUrl = m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url;
          return {
            id: m.id,
            caption: m.caption ?? "",
            thumbnailUrl: thumbnailUrl ?? null,
            timestamp: m.timestamp,
            alcance,
            curtidas,
            comentarios,
            salvos,
            compartilhamentos,
            taxaEngajamento: Math.round(taxaPost * 100) / 100,
          };
        });

        (topPosts as Array<{ taxaEngajamento: number }>).sort((a, b) => b.taxaEngajamento - a.taxaEngajamento);

        postCache.set(postCacheKey, { data: { topPosts, nome: profileNome }, ts: Date.now() });
      } catch {
        // Top posts unavailable — return monthly data from DB without posts
      }
    }
  }

  const result = {
    configured: true,
    source: dbInsights.length >= 3 ? "db" : "live",
    profile: {
      nome: profileNome,
      followersTotal,
    },
    period: {
      alcanceTotal,
      engajamentoTotal,
      novosSeguidores: novosSeguidoresTotal,
      taxaEngajamento: Math.round(taxaEngajamento * 100) / 100,
    },
    monthly,
    topPosts,
  };

  return NextResponse.json(result);
}
