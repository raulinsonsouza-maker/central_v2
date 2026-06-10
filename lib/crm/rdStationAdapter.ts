import type { CrmAdapter, NormalizedLead, RdStationCredentials } from "./types";

// v2: OAuth Bearer — base para deals, pipelines, stages, contacts
const BASE_URL_V2 = "https://api.rd.services/crm/v2";
// v1: URL base correta (diferente da v2!)
const BASE_URL_V1 = "https://crm.rdstation.com/api/v1";

interface RdDealV2 {
  id: string;
  name?: string;
  stage_id?: string | null;
  pipeline_id?: string | null;
  contact_ids?: string[] | null;
  total_price?: number | null;
  created_at?: string;
  updated_at?: string;
  closed_at?: string | null;
  status?: string;
  // Alguns planos mais antigos ainda podem embutir deal_stage — mantemos como last resort
  deal_stage?: {
    id?: string;
    name?: string;
    order?: number;
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
}

interface RdContactV2 {
  id?: string;
  name?: string;
  emails?: Array<{ email?: string }>;
  phones?: Array<{ phone?: string; number?: string }>;
}

interface RdStageV2 {
  id?: string;
  _id?: string;
  name?: string;
  order?: number;
}

interface RdPipelineV2 {
  id?: string;
  name?: string;
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
   *
   * Fluxo correto conforme docs v2:
   *   1. GET /crm/v2/pipelines — lista todos os funis
   *   2. GET /crm/v2/pipelines/{pipeline_id}/stages — etapas de cada funil
   *   3. Fallback v1: GET https://crm.rdstation.com/api/v1/deal_stages?token=...
   *   4. Mapa vazio → usa deal_stage embutido ou "Desconhecido" como último recurso
   */
  private async fetchStagesMap(): Promise<Map<string, { name: string; order: number }>> {
    if (this.stagesCache !== null) return this.stagesCache;

    const map = new Map<string, { name: string; order: number }>();

    const addStage = (s: RdStageV2) => {
      const id = s.id ?? s._id;
      if (id && s.name) map.set(id, { name: s.name, order: s.order ?? 0 });
    };

    // ── 1) v2: lista pipelines → para cada um lista suas stages ──────────────
    try {
      const pipelinesRes = await fetch(`${BASE_URL_V2}/pipelines?page[size]=50`, {
        headers: this.headers(),
      });
      if (pipelinesRes.ok) {
        const body = await pipelinesRes.json() as {
          data?: RdPipelineV2[];
          pipelines?: RdPipelineV2[];
        };
        const pipelines: RdPipelineV2[] = body.data ?? body.pipelines ?? [];

        await Promise.all(
          pipelines.map(async (pipeline) => {
            const pid = pipeline.id;
            if (!pid) return;
            try {
              const stagesRes = await fetch(
                `${BASE_URL_V2}/pipelines/${pid}/stages?sort[order]=asc&page[size]=100`,
                { headers: this.headers() },
              );
              if (stagesRes.ok) {
                const sb = await stagesRes.json() as { data?: RdStageV2[] };
                (sb.data ?? []).forEach(addStage);
              }
            } catch { /* pula funil que falhou */ }
          }),
        );
      }
    } catch { /* continua para fallback */ }

    // ── 2) Fallback v1 (URL base diferente!) — tenta se v2 retornou vazio ────
    if (map.size === 0) {
      try {
        // v1 aceita token como query param
        const url = `${BASE_URL_V1}/deal_stages?token=${encodeURIComponent(this.accessToken)}&limit=12&page=1`;
        const res = await fetch(url);
        if (res.ok) {
          const body = await res.json() as { deal_stages?: RdStageV2[] };
          (body.deal_stages ?? []).forEach(addStage);
        }
      } catch { /* degrada graciosamente */ }
    }

    if (map.size === 0) {
      console.warn(
        "[RdStationCrmAdapter] Não foi possível carregar etapas — " +
        "negociações mostrarão 'Desconhecido' até o endpoint de stages responder.",
      );
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
      // Formato correto de ordenação v2: sort[campo]=direção
      params.set("sort[updated_at]", "desc");

      if (opts?.since) {
        // RDQL: DateTime entre aspas, formato "YYYY-MM-DD HH:MM:SS"
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
        // v2 usa links.next para paginação
        links?: {
          next?: string | null;
          prev?: string | null;
          self?: string | null;
          first?: string | null;
          last?: string | null;
        };
        // Manter suporte a campos legados de respostas v1-like
        meta?: { pagination?: { total_pages?: number; next_page?: number | null } };
        pagination?: { total_pages?: number; next_page?: string | number | null };
        has_more?: boolean;
      };

      const batch: RdDealV2[] = body.data ?? body.deals ?? [];
      deals.push(...batch);

      // v2 sinaliza "tem próxima página" via links.next (URL da próxima página ou null)
      const hasMoreV2 = !!body.links?.next;
      const hasMoreLegacy =
        body.has_more === true ||
        body.meta?.pagination?.next_page != null ||
        (body.pagination?.next_page != null && body.pagination.next_page !== "");

      if ((!hasMoreV2 && !hasMoreLegacy) || batch.length < pageSize) break;
      pageNumber++;
      if (pageNumber > 100) break;
    }

    // Coleta IDs de contato que precisam de lookup (quando não vêm embutidos)
    const contactIdsToFetch = new Set<string>();
    for (const deal of deals) {
      if (!deal.contacts?.length && !deal.contact) {
        const firstId = deal.contact_ids?.[0];
        if (firstId) contactIdsToFetch.add(firstId);
      }
    }

    // Busca contatos em lotes de 10 — limite de 200 para evitar hammering de rate limit
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
      // ── Etapa ──────────────────────────────────────────────────────────────
      // Prioridade: stage_id + stagesMap (v2) → deal_stage embutido (last resort)
      let etapa = "Desconhecido";
      let ordemEtapa: number | null = null;

      if (d.stage_id && stagesMap.has(d.stage_id)) {
        const s = stagesMap.get(d.stage_id)!;
        etapa = s.name;
        ordemEtapa = s.order;
      } else if (d.deal_stage?.name) {
        etapa = d.deal_stage.name;
        ordemEtapa = d.deal_stage.order ?? null;
      }

      // ── Contato ────────────────────────────────────────────────────────────
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
      const rawValor = d.total_price ?? null;

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
