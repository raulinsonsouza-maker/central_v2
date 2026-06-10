import type { CrmAdapter, NormalizedLead, CvCrmCredentials } from "./types";

interface CvLead {
  idlead: number | string;
  situacao?: string;
  idsituacao?: number | null;
  data_cad?: string | null;
  data_cancelamento?: string | null;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
}

interface CvDwResponse {
  dados?: CvLead[];
}

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
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
    // CVDW é a API analítica de leitura — /comercial/leads é só escrita (POST)
    return `https://${this.domain}.cvcrm.com.br/api/v1/cvdw`;
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
    let pagina = 1;
    const registrosPorPagina = 500; // máximo permitido pelo CVDW

    while (true) {
      const params = new URLSearchParams({
        pagina: String(pagina),
        registros_por_pagina: String(registrosPorPagina),
      });

      if (opts?.since) {
        // Filtro incremental correto: a_partir_data_referencia
        params.set("a_partir_data_referencia", opts.since.toISOString().slice(0, 10));
      }

      const res = await fetch(`${this.baseUrl}/leads?${params}`, {
        headers: this.headers(),
      });

      // 204 = sem dados para o filtro/página — fim da paginação
      if (res.status === 204) break;

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`CV CRM API error ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = await res.json() as CvDwResponse;
      const batch: CvLead[] = data.dados ?? [];

      leads.push(...batch);

      if (batch.length < registrosPorPagina) break;
      pagina++;
      if (pagina > 100) break;
    }

    const now = new Date();
    return leads.map((l): NormalizedLead => ({
      crmLeadId: String(l.idlead),
      etapa: l.situacao ?? "Desconhecido",
      // idsituacao é o ID numérico da etapa — funciona como proxy de ordenação
      ordemEtapa: l.idsituacao ?? null,
      nome: l.nome ?? null,
      email: l.email ?? null,
      telefone: l.telefone ?? null,
      dataEntrada: parseDate(l.data_cad) ?? now,
      dataFechamento: parseDate(l.data_cancelamento),
    }));
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/leads?pagina=1&registros_por_pagina=1`, {
        headers: this.headers(),
      });
      // 204 = autenticado mas sem dados — conexão válida
      if (res.status === 204 || res.ok) return { ok: true };
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Status ${res.status}: ${text.slice(0, 100)}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
