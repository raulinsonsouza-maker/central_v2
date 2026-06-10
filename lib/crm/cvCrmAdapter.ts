import type { CrmAdapter, NormalizedLead, CvCrmCredentials } from "./types";

interface CvLead {
  id: number | string;
  etapa?: string;
  stage?: string;
  fase?: string;
  status?: string;
  created_at?: string;
  data_criacao?: string;
  data_entrada?: string;
  closed_at?: string;
  data_fechamento?: string;
  valor?: number | string | null;
}

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function parseValor(v?: number | string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function extractEtapa(lead: CvLead): string {
  return lead.etapa ?? lead.stage ?? lead.fase ?? lead.status ?? "Desconhecido";
}

export class CvCrmAdapter implements CrmAdapter {
  private domain: string;
  private email: string;
  private token: string;

  constructor(domain: string, creds: CvCrmCredentials) {
    this.domain = domain.replace(/^https?:\/\//, "").replace(/\.cvcrm\.com\.br.*$/, "");
    this.email = creds.email;
    this.token = creds.token;
  }

  private get baseUrl() {
    return `https://${this.domain}.cvcrm.com.br/api/v1`;
  }

  private headers(): HeadersInit {
    return {
      email: this.email,
      token: this.token,
      "Content-Type": "application/json",
    };
  }

  async fetchLeads(opts?: { since?: Date }): Promise<NormalizedLead[]> {
    const leads: CvLead[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const params = new URLSearchParams({
        limit: String(limit),
        page: String(page),
      });
      if (opts?.since) {
        params.set("data_inicio", opts.since.toISOString().slice(0, 10));
      }

      const res = await fetch(`${this.baseUrl}/comercial/leads?${params}`, {
        headers: this.headers(),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`CV CRM API error ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = await res.json() as { data?: CvLead[]; leads?: CvLead[] } | CvLead[];

      let batch: CvLead[] = [];
      if (Array.isArray(data)) {
        batch = data;
      } else if (Array.isArray((data as { data?: CvLead[] }).data)) {
        batch = (data as { data: CvLead[] }).data;
      } else if (Array.isArray((data as { leads?: CvLead[] }).leads)) {
        batch = (data as { leads: CvLead[] }).leads;
      }

      leads.push(...batch);

      if (batch.length < limit) break;
      page++;
      if (page > 50) break;
    }

    const now = new Date();
    return leads.map((l): NormalizedLead => ({
      crmLeadId: String(l.id),
      etapa: extractEtapa(l),
      dataEntrada: parseDate(l.created_at ?? l.data_criacao ?? l.data_entrada) ?? now,
      dataFechamento: parseDate(l.closed_at ?? l.data_fechamento ?? null),
      valor: parseValor(l.valor),
    }));
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/comercial/leads?limit=1&page=1`, {
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
