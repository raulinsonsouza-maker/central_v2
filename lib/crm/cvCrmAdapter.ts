import type { CrmAdapter, NormalizedLead, CvCrmCredentials } from "./types";

interface CvLead {
  idlead: number | string;
  situacao?: string;
  idsituacao?: number | null;
  data_cad?: string | null;
  data_cancelamento?: string | null;
  data_ultima_interacao?: string | null;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  // Origem / mídia
  origem_nome?: string | null;
  origem_ultimo_nome?: string | null;
  midia_original?: string | null;
  midia_ultimo?: string | null;
  conversao_original?: string | null;
  conversao_ultimo?: string | null;
  // Empreendimento
  empreendimento?: string | null;
  empreendimento_primeiro?: string | null;
  empreendimento_ultimo?: string | null;
  // Valor e qualificação
  valor?: number | string | null;
  score?: number | null;
  possibilidade_venda?: string | null;
  profissao?: string | null;
  renda_familiar?: string | null;
  // Cancelamento / perda
  motivo_cancelamento?: string | null;
  descricao_motivo_cancelamento?: string | null;
  submotivo_cancelamento?: string | null;
  // Atribuição comercial
  corretor?: string | null;
  corretor_ultimo?: string | null;
  gestor?: string | null;
  imobiliaria?: string | null;
  ponto_venda?: string | null;
  // Extras
  tags?: string[] | null;
  campos_adicionais?: Array<{ idcampo: string; idcampo_valores: string }> | null;
  reserva?: string | number | null;
  feedback?: string | null;
  regiao?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

interface CvDwResponse {
  dados?: CvLead[];
}

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function parseValor(v?: number | string | null): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
}

/** Extract UTM params from campos_adicionais (custom fields from landing page) */
function extractUtmsFromCampos(
  campos: Array<{ idcampo: string; idcampo_valores: string }> | null | undefined
): Record<string, string> | null {
  if (!campos?.length) return null;
  const UTM_KEYS: Record<string, string> = {
    utm_source: "utmSource",
    utm_medium: "utmMedium",
    utm_campaign: "utmCampaign",
    utm_content: "utmContent",
    utm_term: "utmTerm",
    fbclid: "fbclid",
    gclid: "gclid",
  };
  const result: Record<string, string> = {};
  for (const campo of campos) {
    const key = (campo.idcampo ?? "").toLowerCase().trim();
    const mapped = UTM_KEYS[key];
    if (mapped && campo.idcampo_valores) {
      result[mapped] = campo.idcampo_valores;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function inferStatus(l: CvLead): string {
  // Priority 1: explicit cancellation signals → lost
  if (l.motivo_cancelamento || l.descricao_motivo_cancelamento) return "lost";
  if (l.data_cancelamento) return "lost";

  // Priority 2: explicit reservation/contract number → won
  if (l.reserva) return "won";

  // Priority 3: derive from stage name (situacao)
  // Covers cases where the API does not fill reserva/motivo_cancelamento
  const s = (l.situacao ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    s.includes("venda realizada") ||
    s.includes("contrato") ||
    s.includes("assinado") ||
    s.includes("com reserva") ||
    s.includes("reservado")
  ) return "won";

  if (
    s.includes("perdido") ||
    s.includes("cancelado") ||
    s.includes("descartado") ||
    s.includes("desistiu") ||
    s.includes("sem interesse") ||
    s.includes("nao tem interesse")
  ) return "lost";

  return "ongoing";
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
    const registrosPorPagina = 500;

    while (true) {
      const params = new URLSearchParams({
        pagina: String(pagina),
        registros_por_pagina: String(registrosPorPagina),
      });

      if (opts?.since) {
        params.set("a_partir_data_referencia", opts.since.toISOString().slice(0, 10));
      }

      const res = await fetch(`${this.baseUrl}/leads?${params}`, {
        headers: this.headers(),
      });

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
    return leads.map((l): NormalizedLead => {
      const dadosCv: Record<string, unknown> = {};

      // Origem e mídia
      if (l.origem_nome) dadosCv.origem = l.origem_nome;
      if (l.origem_ultimo_nome) dadosCv.origemUltimo = l.origem_ultimo_nome;
      if (l.midia_original) dadosCv.midiaOriginal = l.midia_original;
      if (l.midia_ultimo) dadosCv.midiaUltimo = l.midia_ultimo;
      if (l.conversao_original) dadosCv.conversaoOriginal = l.conversao_original;
      if (l.conversao_ultimo) dadosCv.conversaoUltimo = l.conversao_ultimo;

      // Empreendimento de interesse
      if (l.empreendimento) dadosCv.empreendimento = l.empreendimento;
      if (l.empreendimento_primeiro) dadosCv.empreendimentoPrimeiro = l.empreendimento_primeiro;
      if (l.empreendimento_ultimo) dadosCv.empreendimentoUltimo = l.empreendimento_ultimo;

      // Qualificação
      if (l.score !== null && l.score !== undefined) dadosCv.score = l.score;
      if (l.possibilidade_venda) dadosCv.possibilidadeVenda = l.possibilidade_venda;
      if (l.profissao) dadosCv.profissao = l.profissao;
      if (l.renda_familiar) dadosCv.rendaFamiliar = l.renda_familiar;
      if (l.feedback) dadosCv.feedback = l.feedback;

      // Cancelamento / perda
      if (l.motivo_cancelamento) dadosCv.motivoCancelamento = l.motivo_cancelamento;
      if (l.descricao_motivo_cancelamento) dadosCv.descricaoCancelamento = l.descricao_motivo_cancelamento;
      if (l.submotivo_cancelamento) dadosCv.submotivoCancelamento = l.submotivo_cancelamento;

      // Atribuição comercial
      if (l.corretor) dadosCv.corretor = l.corretor;
      if (l.corretor_ultimo) dadosCv.corretorUltimo = l.corretor_ultimo;
      if (l.gestor) dadosCv.gestor = l.gestor;
      if (l.imobiliaria) dadosCv.imobiliaria = l.imobiliaria;
      if (l.ponto_venda) dadosCv.pontoVenda = l.ponto_venda;

      // Localização
      if (l.regiao) dadosCv.regiao = l.regiao;
      if (l.cidade) dadosCv.cidade = l.cidade;
      if (l.estado) dadosCv.estado = l.estado;

      // Extras
      if (l.tags?.length) dadosCv.tags = l.tags;
      if (l.campos_adicionais?.length) {
        dadosCv.camposAdicionais = l.campos_adicionais;
        // Parse UTM parameters from campos_adicionais when present
        const utms = extractUtmsFromCampos(l.campos_adicionais);
        if (utms) Object.assign(dadosCv, utms);
      }
      if (l.reserva) dadosCv.reserva = l.reserva;

      return {
        crmLeadId: String(l.idlead),
        etapa: l.situacao ?? "Desconhecido",
        ordemEtapa: l.idsituacao ?? null,
        nome: l.nome ?? null,
        email: l.email ?? null,
        telefone: l.telefone ?? null,
        dataEntrada: parseDate(l.data_cad) ?? now,
        dataFechamento: parseDate(l.data_cancelamento),
        // Campos diretos mapeados para campos de 1ª classe
        fonte: l.origem_nome ?? null,
        valor: parseValor(l.valor),
        rating: l.score ?? null,
        status: inferStatus(l),
        dadosCv: Object.keys(dadosCv).length > 0 ? dadosCv : null,
      };
    });
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/leads?pagina=1&registros_por_pagina=1`, {
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
