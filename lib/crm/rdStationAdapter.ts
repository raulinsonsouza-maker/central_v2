import type { CrmAdapter, NormalizedLead, RdStationCredentials } from "./types";

const BASE_URL_V2 = "https://api.rd.services/crm/v2";
const BASE_URL_V1 = "https://api.rd.services/crm/v1";

interface RdDealV2 {
  id: string;
  name?: string;
  stage_id?: string | null;
  contact_ids?: string[] | null;
  total_price?: number | null;
  recurrence_price?: number | null;
  one_time_price?: number | null;
  created_at?: string;
  updated_at?: string;
  closed_at?: string | null;
  status?: string;
  pipeline_id?: string | null;
  // v1-embedded fields still returned by some accounts / backward-compat
  deal_stage?: {
    id?: string;
    name?: string;
    order?: number;
    nickname?: string;
  } | null;
  contacts?: Array<{
    id?: string;
    name?: string;
    emails?: Array<{ email?: string }>;
    phones?: Array<{ phone?: string; number?: string }>;
  }> | null;
  contact?: {
    id?: string;
    name?: string;
    emails?: Array<{ email?: string }>;
    phones?: Array<{ phone?: string; number?: string }>;
  } | null;
  // v1 field names kept for forward-compat with accounts on v1 endpoint
  amount_total?: number | null;
  amount?: number | null;
  value?: number | null;
}

interface RdContactV2 {
  id?: string;
  name?: string;
  emails?: Array<{ email?: string }>;
  phones?: Array<{ phone?: string; number?: string }>;
}

interface RdStageV1 {
  _id?: string;
  id?: string;
  name?: string;
  order?: number;
}

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function runBatched<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize = 10,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

export class RdStationCrmAdapter implements CrmAdapter {
  private accessToken: string;
  private stagesCache: Map<string, { name: string; order: number }> | null = null;

  constructor(creds: RdStationCredentials) {
    const token = creds.accessToken ?? creds.token;
    if (!token) throw new Error("RD Station CRM requer accessToken ou token.");
    this.accessToken = token;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Carrega mapa de etapas { stage_id → {name, order} }.
   * Ordem de tentativas:
   *   1. API v2  GET /crm/v2/stages  (contrato oficial)
   *   2. API v1  GET /crm/v1/deal_stages  (fallback — aceita Bearer em muitas contas)
   *   3. Mapa vazio → adapter usa deal_stage embutido ou "Desconhecido" como último recurso
   */
  private async fetchStagesMap(): Promise<Map<string, { name: string; order: number }>> {
    if (this.stagesCache !== null) return this.stagesCache;

    const map = new Map<string, { name: string; order: number }>();

    const tryPopulate = (stages: RdStageV1[]) => {
      for (const s of stages) {
        const id = s._id ?? s.id;
        if (id && s.name) map.set(id, { name: s.name, order: s.order ?? 0 });
      }
    };

    // 1) v2 endpoint
    try {
      const res = await fetch(`${BASE_URL_V2}/stages`, { headers: this.headers() });
      if (res.ok) {
        const body = await res.json() as { data?: RdStageV1[]; stages?: RdStageV1[] };
        tryPopulate(body.data ?? body.stages ?? []);
      }
    } catch { /* continua para fallback */ }

    // 2) v1 endpoint (fallback quando v2 não existe ou retornou vazio)
    if (map.size === 0) {
      try {
        const res = await fetch(`${BASE_URL_V1}/deal_stages?limit=50&page=1`, {
          headers: this.headers(),
        });
        if (res.ok) {
          const body = await res.json() as { deal_stages?: RdStageV1[]; data?: RdStageV1[] };
          tryPopulate(body.deal_stages ?? body.data ?? []);
        }
      } catch { /* degrada graciosamente */ }
    }

    if (map.size === 0) {
      console.warn("[RdStationCrmAdapter] Não foi possível carregar etapas — as negociações mostrarão 'Desconhecido' até o endpoint de stages estar acessível.");
    }

    this.stagesCache = map;
    return map;
  }

  private async fetchContactById(id: string): Promise<RdContactV2 | null> {
    try {
      const res = await fetch(`${BASE_URL_V2}/contacts/${id}`, {
        headers: this.headers(),
      });
      if (!res.ok) return null;
      const body = await res.json() as { data?: RdContactV2 } | RdContactV2;
      return (body as { data?: RdContactV2 }).data ?? (body as RdContactV2) ?? null;
    } catch {
      return null;
    }
  }

  private parseContactInfo(c: {
    name?: string;
    emails?: Array<{ email?: string }>;
    phones?: Array<{ phone?: string; number?: string }>;
  }): { nome: string | null; email: string | null; telefone: string | null } {
    return {
      nome: c.name ?? null,
      email: c.emails?.[0]?.email ?? null,
      telefone: c.phones?.[0]?.phone ?? c.phones?.[0]?.number ?? null,
    };
  }

  async fetchLeads(opts?: { since?: Date }): Promise<NormalizedLead[]> {
    const stagesMap = await this.fetchStagesMap();
    const deals: RdDealV2[] = [];
    let pageNumber = 1;
    const pageSize = 25;

    while (true) {
      const params = new URLSearchParams();
      params.set("page[number]", String(pageNumber));
      params.set("page[size]", String(pageSize));
      params.set("sort[updated_at]", "desc");

      if (opts?.since) {
        // RDQL datetime format: "YYYY-MM-DD HH:MM:SS"
        const sinceStr = opts.since
          .toISOString()
          .replace("T", " ")
          .replace(/\.\d{3}Z$/, "");
        params.set("filter", `updated_at:>="${sinceStr}"`);
      }

      const res = await fetch(`${BASE_URL_V2}/deals?${params}`, {
        headers: this.headers(),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`RD Station CRM API error ${res.status}: ${text.slice(0, 200)}`);
      }

      const body = await res.json() as {
        data?: RdDealV2[];
        deals?: RdDealV2[];
        meta?: {
          pagination?: {
            total_pages?: number;
            next_page?: number | null;
            current_page?: number;
          };
        };
        pagination?: {
          total_pages?: number;
          next_page?: string | number | null;
        };
        has_more?: boolean;
      };

      const batch: RdDealV2[] = body.data ?? body.deals ?? [];
      deals.push(...batch);

      const totalPages =
        body.meta?.pagination?.total_pages ?? body.pagination?.total_pages;

      const hasMore =
        body.has_more === true ||
        (body.meta?.pagination?.next_page != null) ||
        (body.pagination?.next_page != null && body.pagination.next_page !== null) ||
        (typeof totalPages === "number" && pageNumber < totalPages);

      if (!hasMore || batch.length < pageSize) break;
      pageNumber++;
      if (pageNumber > 100) break;
    }

    // Collect unique contact IDs that need API lookup (when not embedded)
    const contactIdsToFetch = new Set<string>();
    for (const deal of deals) {
      if (!deal.contacts?.length && !deal.contact) {
        const firstId = deal.contact_ids?.[0];
        if (firstId) contactIdsToFetch.add(firstId);
      }
    }

    // Fetch contacts in batches of 10 — cap at 200 to avoid rate-limit hammering
    const contactMap = new Map<string, RdContactV2>();
    if (contactIdsToFetch.size > 0) {
      const ids = Array.from(contactIdsToFetch).slice(0, 200);
      await runBatched(ids, async (id) => {
        const c = await this.fetchContactById(id);
        if (c) contactMap.set(id, c);
      });
    }

    const now = new Date();
    return deals.map((d): NormalizedLead => {
      // ── Stage ──────────────────────────────────────────────────────────────
      // Priority: stage_id + stagesMap (v2 contract) → deal_stage embedded (legacy fallback)
      let etapa = "Desconhecido";
      let ordemEtapa: number | null = null;

      if (d.stage_id && stagesMap.has(d.stage_id)) {
        const s = stagesMap.get(d.stage_id)!;
        etapa = s.name;
        ordemEtapa = s.order;
      } else if (d.deal_stage?.name) {
        // Legacy fallback: some accounts return deal_stage embedded for backward compat
        etapa = d.deal_stage.name;
        ordemEtapa = d.deal_stage.order ?? null;
      }

      // ── Contact ────────────────────────────────────────────────────────────
      // Priority: v1 embedded contacts → v2 lookup by contact_ids[0]
      let nome: string | null = null;
      let email: string | null = null;
      let telefone: string | null = null;

      const embedded = d.contacts?.[0] ?? d.contact ?? null;
      if (embedded) {
        ({ nome, email, telefone } = this.parseContactInfo(embedded));
      } else {
        const firstId = d.contact_ids?.[0];
        if (firstId && contactMap.has(firstId)) {
          ({ nome, email, telefone } = this.parseContactInfo(contactMap.get(firstId)!));
        }
      }

      // ── Valor ──────────────────────────────────────────────────────────────
      // v2: total_price | v1 fallback: amount_total / amount / value
      const rawValor =
        d.total_price ??
        d.amount_total ??
        d.amount ??
        d.value ??
        null;

      return {
        crmLeadId: String(d.id),
        etapa,
        ordemEtapa,
        nome,
        email,
        telefone,
        dataEntrada: parseDate(d.created_at) ?? now,
        dataFechamento: parseDate(d.closed_at),
        valor: rawValor != null ? Number(rawValor) : null,
      };
    });
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const params = new URLSearchParams();
      params.set("page[number]", "1");
      params.set("page[size]", "1");
      const res = await fetch(`${BASE_URL_V2}/deals?${params}`, {
        headers: this.headers(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: `Status ${res.status}: ${text.slice(0, 100)}` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
