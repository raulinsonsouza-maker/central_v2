import type { CrmAdapter, NormalizedLead, RdStationCredentials } from "./types";

interface RdDeal {
  id: string;
  name?: string;
  stage?: { name?: string } | null;
  deal_stage?: { name?: string } | null;
  created_at?: string;
  closed_at?: string | null;
  amount?: number | null;
  value?: number | null;
}

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export class RdStationCrmAdapter implements CrmAdapter {
  private token: string;
  private static BASE_URL = "https://api.rd.services/crm/v2";

  constructor(creds: RdStationCredentials) {
    this.token = creds.token;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async fetchLeads(opts?: { since?: Date }): Promise<NormalizedLead[]> {
    const deals: RdDeal[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        order: "created_at",
        direction: "desc",
      });
      if (opts?.since) {
        params.set("start_created_at", opts.since.toISOString());
      }

      const res = await fetch(`${RdStationCrmAdapter.BASE_URL}/deals?${params}`, {
        headers: this.headers(),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`RD Station CRM API error ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = await res.json() as {
        deals?: RdDeal[];
        data?: RdDeal[];
        pagination?: { total_pages?: number; next_page?: string | null };
        has_more?: boolean;
      };

      const batch: RdDeal[] = data.deals ?? data.data ?? [];
      deals.push(...batch);

      const hasMore =
        data.has_more === true ||
        (data.pagination?.next_page != null && data.pagination.next_page !== null) ||
        (typeof data.pagination?.total_pages === "number" && page < data.pagination.total_pages);

      if (!hasMore || batch.length < perPage) break;
      page++;
      if (page > 50) break;
    }

    const now = new Date();
    return deals.map((d): NormalizedLead => {
      const stage = d.stage ?? d.deal_stage;
      return {
        crmLeadId: String(d.id),
        etapa: stage?.name ?? "Desconhecido",
        dataEntrada: parseDate(d.created_at) ?? now,
        dataFechamento: parseDate(d.closed_at),
        valor: d.amount ?? d.value ?? null,
      };
    });
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${RdStationCrmAdapter.BASE_URL}/deals?page=1&per_page=1`, {
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
