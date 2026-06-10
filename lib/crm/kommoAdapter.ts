import type { CrmAdapter, NormalizedLead, KommoCredentials } from "./types";

interface KommoLead {
  id: number;
  name?: string;
  status_id?: number;
  pipeline_id?: number;
  created_at?: number;
  closed_at?: number | null;
  price?: number | null;
  _embedded?: {
    stages?: Array<{ id?: number; name?: string }>;
  };
  custom_fields_values?: Array<{ field_id: number; values: Array<{ value: unknown }> }>;
}

interface KommoStatus {
  id: number;
  name: string;
}

interface KommoPipeline {
  id: number;
  name: string;
  _embedded?: { statuses?: KommoStatus[] };
}

function parseUnixDate(v?: number | null): Date | null {
  if (v == null) return null;
  const d = new Date(v * 1000);
  return isNaN(d.getTime()) ? null : d;
}

export class KommoAdapter implements CrmAdapter {
  private subdomain: string;
  private token: string;
  private stageMap: Map<number, string> = new Map();

  constructor(subdomain: string, creds: KommoCredentials) {
    this.subdomain = subdomain.replace(/^https?:\/\//, "").replace(/\.kommo\.com.*$/, "");
    this.token = creds.token;
  }

  private get baseUrl() {
    return `https://${this.subdomain}.kommo.com/api/v4`;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async loadPipelines(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/leads/pipelines?limit=50`, {
        headers: this.headers(),
      });
      if (!res.ok) return;
      const data = await res.json() as {
        _embedded?: { pipelines?: KommoPipeline[] };
      };
      const pipelines = data._embedded?.pipelines ?? [];
      for (const pipeline of pipelines) {
        const statuses = pipeline._embedded?.statuses ?? [];
        for (const status of statuses) {
          this.stageMap.set(status.id, status.name);
        }
      }
    } catch {
      /* ignore — we'll fall back to status_id */
    }
  }

  async fetchLeads(opts?: { since?: Date }): Promise<NormalizedLead[]> {
    await this.loadPipelines();

    const leads: KommoLead[] = [];
    let page = 1;

    while (true) {
      const params = new URLSearchParams({
        limit: "250",
        page: String(page),
        order: "created_at",
      });
      if (opts?.since) {
        params.set("filter[created_at][from]", String(Math.floor(opts.since.getTime() / 1000)));
      }

      const res = await fetch(`${this.baseUrl}/leads?${params}`, {
        headers: this.headers(),
      });

      if (res.status === 204) break;

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Kommo API error ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = await res.json() as {
        _embedded?: { leads?: KommoLead[] };
        _page_count?: number;
        _links?: { next?: { href?: string } };
      };

      const batch = data._embedded?.leads ?? [];
      leads.push(...batch);

      if (!data._links?.next?.href || batch.length < 250) break;
      page++;
      if (page > 40) break;
    }

    const now = new Date();
    return leads.map((l): NormalizedLead => {
      const stageName =
        l.status_id != null ? (this.stageMap.get(l.status_id) ?? `Etapa ${l.status_id}`) : "Desconhecido";
      return {
        crmLeadId: String(l.id),
        etapa: stageName,
        dataEntrada: parseUnixDate(l.created_at) ?? now,
        dataFechamento: parseUnixDate(l.closed_at ?? null),
        valor: l.price ?? null,
      };
    });
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/leads?limit=1&page=1`, {
        headers: this.headers(),
      });
      if (res.status === 204 || res.ok) return { ok: true };
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Status ${res.status}: ${text.slice(0, 100)}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
