export interface NormalizedLead {
  crmLeadId: string;
  etapa: string;
  ordemEtapa?: number | null;
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
  fonte?: string | null;
  rating?: number | null;
  /** won | lost | ongoing | paused */
  status?: string | null;
  /** UUID do contato no RD Station Marketing (para enriquecimento) */
  rdContactId?: string | null;
  dataEntrada: Date;
  dataFechamento?: Date | null;
  valor?: number | null;
  /** Temperatura de engajamento do lead: "Lead Frio", "Lead Morno", "Lead Quente", etc. */
  momentoLead?: string | null;
  /** Campos adicionais do CV CRM (origem, mídia, empreendimento, score, etc.) */
  dadosCv?: Record<string, unknown> | null;
}

export interface CrmAdapter {
  fetchLeads(opts?: { since?: Date }): Promise<NormalizedLead[]>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
}

export interface CvCrmCredentials {
  email: string;
  token: string;
}

export interface RdStationCredentials {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  token?: string;
}

export interface KommoCredentials {
  token: string;
}
