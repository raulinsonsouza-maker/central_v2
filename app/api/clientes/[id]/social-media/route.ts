import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveMetaCredentials } from "@/lib/config/resolveIntegracao";

const GRAPH = "https://graph.facebook.com/v19.0";

interface CacheEntry {
  data: unknown;
  ts: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1h

function toUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function monthLabel(endTime: string): string {
  const d = new Date(endTime);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

function monthKey(endTime: string): string {
  const d = new Date(endTime);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

  const cacheKey = `${clienteId}|${dataInicio}|${dataFim}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const igConta = await prisma.conta.findFirst({
    where: { clienteId, plataforma: "INSTAGRAM" },
  });

  if (!igConta?.accountIdPlataforma) {
    return NextResponse.json({ configured: false });
  }

  const igId = igConta.accountIdPlataforma;

  const creds = await resolveMetaCredentials(clienteId);
  if (!creds?.token) {
    return NextResponse.json({ configured: true, error: "Sem credenciais Meta configuradas" }, { status: 401 });
  }
  const token = creds.token;

  try {
    const now = new Date();
    const since12 = new Date(now);
    since12.setMonth(since12.getMonth() - 12);
    since12.setDate(1);
    since12.setHours(0, 0, 0, 0);

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

    const reachArr = (insightsRaw.data?.find((d: { name: string }) => d.name === "reach")?.values ?? []) as Array<{ value: number; end_time: string }>;
    const interArr = (insightsRaw.data?.find((d: { name: string }) => d.name === "total_interactions")?.values ?? []) as Array<{ value: number; end_time: string }>;
    const followsArr = (followsRaw.data?.find((d: { name: string }) => d.name === "new_follows")?.values ?? []) as Array<{ value: number; end_time: string }>;

    const monthMap = new Map<string, { mes: string; label: string; alcance: number; engajamento: number; novosSeguidores: number }>();
    for (const r of reachArr) {
      const k = monthKey(r.end_time);
      const entry = monthMap.get(k) ?? { mes: k, label: monthLabel(r.end_time), alcance: 0, engajamento: 0, novosSeguidores: 0 };
      entry.alcance = r.value;
      monthMap.set(k, entry);
    }
    for (const r of interArr) {
      const k = monthKey(r.end_time);
      const entry = monthMap.get(k) ?? { mes: k, label: monthLabel(r.end_time), alcance: 0, engajamento: 0, novosSeguidores: 0 };
      entry.engajamento = r.value;
      monthMap.set(k, entry);
    }
    for (const r of followsArr) {
      const k = monthKey(r.end_time);
      const entry = monthMap.get(k) ?? { mes: k, label: monthLabel(r.end_time), alcance: 0, engajamento: 0, novosSeguidores: 0 };
      entry.novosSeguidores = r.value;
      monthMap.set(k, entry);
    }
    const monthly = [...monthMap.values()].sort((a, b) => a.mes.localeCompare(b.mes));

    const alcanceTotal = monthly.reduce((s, m) => s + m.alcance, 0);
    const engajamentoTotal = monthly.reduce((s, m) => s + m.engajamento, 0);
    const novosSeguidoresTotal = monthly.reduce((s, m) => s + m.novosSeguidores, 0);
    const taxaEngajamento = alcanceTotal > 0 ? (engajamentoTotal / alcanceTotal) * 100 : 0;

    const mediaStart = dataInicio ? dataInicio : since12.toISOString().slice(0, 10);
    const mediaEnd = dataFim ? dataFim : now.toISOString().slice(0, 10);

    const mediaRaw = await igGet(`${igId}/media`, token, {
      fields: "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count",
      limit: "50",
    });
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
      top20.map((m) =>
        igGet(`${m.id}/insights`, token, { metric: "reach,saved,shares" }),
      ),
    );

    const topPosts = top20.map((m, i) => {
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

    topPosts.sort((a, b) => b.taxaEngajamento - a.taxaEngajamento);

    const result = {
      configured: true,
      profile: {
        nome: profileRaw.name ?? "",
        followersTotal: profileRaw.followers_count ?? 0,
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

    cache.set(cacheKey, { data: result, ts: Date.now() });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao consultar Instagram API";
    return NextResponse.json({ configured: true, error: msg }, { status: 500 });
  }
}
