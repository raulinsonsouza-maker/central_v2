export interface NormalizedLead {
  crmLeadId: string;
  etapa: string;
  ordemEtapa?: number | null;
  telefone?: string | null;
  email?: string | null;
  dataEntrada: Date;
  dataFechamento?: Date | null;
  valor?: number | null;
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
  token: string;
}

export interface KommoCredentials {
  token: string;
}
