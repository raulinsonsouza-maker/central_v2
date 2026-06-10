import type { CrmAdapter } from "./types";
import { CvCrmAdapter } from "./cvCrmAdapter";
import { RdStationCrmAdapter } from "./rdStationAdapter";
import { KommoAdapter } from "./kommoAdapter";
import { prisma } from "@/lib/db";

interface CrmConfigRecord {
  id?: string;
  tipo: string;
  dominio?: string | null;
  credenciais: unknown;
}

interface RdTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

async function refreshRdStationToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  const clientId = process.env.RD_STATION_CLIENT_ID;
  const clientSecret = process.env.RD_STATION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("RD_STATION_CLIENT_ID ou RD_STATION_CLIENT_SECRET não configurados");
  }

  const res = await fetch("https://api.rd.services/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao renovar token RD Station: HTTP ${res.status} — ${text.slice(0, 100)}`);
  }

  const data: RdTokenResponse = await res.json();
  if (!data.access_token) {
    throw new Error("Resposta de refresh inválida do RD Station");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 86400) * 1000,
  };
}

export async function getCrmAdapter(config: CrmConfigRecord): Promise<CrmAdapter> {
  const creds = config.credenciais as Record<string, unknown>;

  switch (config.tipo) {
    case "CVCRM": {
      if (!config.dominio) throw new Error("CV CRM requer um domínio configurado.");
      const email = creds.email as string | undefined;
      const token = creds.token as string | undefined;
      if (!email || !token) throw new Error("CV CRM requer email e token nas credenciais.");
      return new CvCrmAdapter(config.dominio, { email, token });
    }

    case "RDSTATION_CRM": {
      const accessToken = creds.accessToken as string | undefined;
      const refreshToken = creds.refreshToken as string | undefined;
      const expiresAt = creds.expiresAt as number | undefined;
      const legacyToken = creds.token as string | undefined;

      if (accessToken) {
        const needsRefresh =
          !!expiresAt &&
          !!refreshToken &&
          Date.now() > expiresAt - 5 * 60 * 1000;

        if (needsRefresh) {
          try {
            const newCreds = await refreshRdStationToken(refreshToken!);
            if (config.id) {
              await prisma.crmConfig.update({
                where: { id: config.id },
                data: { credenciais: newCreds },
              });
            }
            return new RdStationCrmAdapter({ accessToken: newCreds.accessToken });
          } catch {
            return new RdStationCrmAdapter({ accessToken });
          }
        }

        return new RdStationCrmAdapter({ accessToken });
      }

      if (legacyToken) {
        return new RdStationCrmAdapter({ token: legacyToken });
      }

      throw new Error(
        "RD Station CRM não está conectado via OAuth. Acesse Administração → editar cliente → Integração CRM → Conectar via RD Station."
      );
    }

    case "KOMMO": {
      if (!config.dominio) throw new Error("Kommo requer um subdomínio configurado.");
      const token = creds.token as string | undefined;
      if (!token) throw new Error("Kommo requer token nas credenciais.");
      return new KommoAdapter(config.dominio, { token });
    }

    default:
      throw new Error(`CRM tipo desconhecido: ${config.tipo}`);
  }
}
