import type { CrmAdapter } from "./types";
import { CvCrmAdapter } from "./cvCrmAdapter";
import { RdStationCrmAdapter } from "./rdStationAdapter";
import { KommoAdapter } from "./kommoAdapter";

interface CrmConfigRecord {
  tipo: string;
  dominio?: string | null;
  credenciais: unknown;
}

export function getCrmAdapter(config: CrmConfigRecord): CrmAdapter {
  const creds = config.credenciais as Record<string, string>;

  switch (config.tipo) {
    case "CVCRM": {
      if (!config.dominio) throw new Error("CV CRM requer um domínio configurado.");
      if (!creds.email || !creds.token)
        throw new Error("CV CRM requer email e token nas credenciais.");
      return new CvCrmAdapter(config.dominio, { email: creds.email, token: creds.token });
    }
    case "RDSTATION_CRM": {
      if (!creds.token) throw new Error("RD Station CRM requer token nas credenciais.");
      return new RdStationCrmAdapter({ token: creds.token });
    }
    case "KOMMO": {
      if (!config.dominio) throw new Error("Kommo requer um subdomínio configurado.");
      if (!creds.token) throw new Error("Kommo requer token nas credenciais.");
      return new KommoAdapter(config.dominio, { token: creds.token });
    }
    default:
      throw new Error(`CRM tipo desconhecido: ${config.tipo}`);
  }
}
