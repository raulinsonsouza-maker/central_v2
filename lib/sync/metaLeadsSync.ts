import { fetchLeadGenFormsWithDiag, fetchLeadsFromForm } from "@/lib/meta/metaClient";
import { prisma } from "@/lib/db";
import { getIntegrationsConfig } from "@/lib/config/integrations";
import { dddToEstado } from "@/lib/utils/dddToEstado";

function getFieldValue(
  fieldData: Array<{ name: string; values: string[] }>,
  ...names: string[]
): string | null {
  for (const name of names) {
    const field = fieldData.find((f) =>
      f.name.toLowerCase().includes(name.toLowerCase())
    );
    if (field?.values?.[0]) return field.values[0];
  }
  return null;
}

export interface MetaLeadsSyncResult {
  leadsProcessed: number;
  leadsCreated: number;
  leadsFailed: number;
  formsFound: number;
  formsProcessed: number;
  formsSummary: Array<{ formId: string; formName: string; leadsFound: number }>;
  error?: string;
  /**
   * Non-fatal diagnostic: set when the sync technically succeeded but found
   * zero lead-gen forms to read. This is almost always a Meta *Page-access*
   * gap (the token can read ads/insights but is not assigned to the Page that
   * owns the forms, so leadgen_forms/leads return empty/forbidden) rather than
   * a code error. Surfaced so a 0-leads outcome is distinguishable from a
   * healthy "no new leads" run.
   */
  warning?: string;
}

export async function syncMetaLeadsCliente(
  clienteId: string,
  options?: { dateFrom?: string }
): Promise<MetaLeadsSyncResult> {
  const config = await getIntegrationsConfig();
  const token = config.metaAccessToken ?? process.env.META_ACCESS_TOKEN;

  if (!token) {
    return { leadsProcessed: 0, leadsCreated: 0, leadsFailed: 0, formsFound: 0, formsProcessed: 0, formsSummary: [], error: "META_ACCESS_TOKEN não configurado" };
  }

  const conta = await prisma.conta.findFirst({
    where: { clienteId, plataforma: "META" },
  });

  if (!conta?.accountIdPlataforma) {
    return { leadsProcessed: 0, leadsCreated: 0, leadsFailed: 0, formsFound: 0, formsProcessed: 0, formsSummary: [], error: "Cliente sem conta Meta configurada" };
  }

  const accountId = conta.accountIdPlataforma;
  const contaId = conta.id;

  try {
    const { forms: allForms, permissionError } = await fetchLeadGenFormsWithDiag(accountId, token);
    // Include all forms regardless of status — archived/draft forms still have historical leads.
    const forms = allForms;

    console.log(`[metaLeadsSync] clienteId=${clienteId} accountId=${accountId} formsFound=${forms.length}`, forms.map(f => `${f.id}(${f.status ?? 'no-status'})`));

    if (forms.length === 0 && permissionError) {
      const isAccountNotAccessible = permissionError.includes("ACCOUNT_NOT_ACCESSIBLE:");
      const errorMsg = isAccountNotAccessible
        ? permissionError.replace("ACCOUNT_NOT_ACCESSIBLE:", "").trim()
        : `Permissão insuficiente para acessar formulários de lead. O token Meta precisa da permissão leads_retrieval aprovada no Meta App Review. Detalhes: ${permissionError}`;
      return {
        leadsProcessed: 0,
        leadsCreated: 0,
        leadsFailed: 0,
        formsFound: 0,
        formsProcessed: 0,
        formsSummary: [],
        error: errorMsg,
        accountNotAccessible: isAccountNotAccessible,
      } as MetaLeadsSyncResult & { accountNotAccessible?: boolean };
    }

    let leadsProcessed = 0;
    let leadsCreated = 0;
    let leadsFailed = 0;
    const formsSummary: Array<{ formId: string; formName: string; leadsFound: number }> = [];

    for (const form of forms) {
      const leads = await fetchLeadsFromForm(form.id, token, {
        dateFrom: options?.dateFrom,
      });

      formsSummary.push({ formId: form.id, formName: form.name, leadsFound: leads.length });
      console.log(`[metaLeadsSync] form=${form.name}(${form.id}) status=${form.status} leadsFound=${leads.length}`);

      for (const lead of leads) {
        leadsProcessed++;
        const fd = lead.field_data ?? [];

        const fullName = getFieldValue(fd, "full_name", "nome completo", "nome", "name");
        const nomeEmpresa = getFieldValue(fd, "empresa", "company", "nome_empresa", "razao_social");
        const telefone = getFieldValue(fd, "phone", "telefone", "celular", "whatsapp");
        const emailLead = getFieldValue(fd, "email");
        const tipoEmpresa = getFieldValue(fd, "tipo_empresa", "tipo", "segmento", "ramo");
        const faixaFaturamento = getFieldValue(fd, "faturamento", "receita", "faixa", "faturamento_anual", "faturamento_mensal");
        const statusCrm = getFieldValue(fd, "status_crm", "status", "crm_status", "etapa", "fase", "pipeline");

        const estado = dddToEstado(telefone);

        const createdTime = new Date(lead.created_time);

        try {
          const existing = await prisma.metaLeadIndividual.findUnique({
            where: { clienteId_metaLeadId: { clienteId, metaLeadId: lead.id } },
            select: { id: true },
          });
          const isNew = !existing;
          await prisma.metaLeadIndividual.upsert({
            where: {
              clienteId_metaLeadId: {
                clienteId,
                metaLeadId: lead.id,
              },
            },
            create: {
              clienteId,
              contaId,
              metaLeadId: lead.id,
              formId: form.id,
              formName: form.name,
              campaignId: lead.campaign_id ?? null,
              campaignName: lead.campaign_name ?? null,
              adId: lead.ad_id ?? null,
              adName: lead.ad_name ?? null,
              adsetId: lead.adset_id ?? null,
              adsetName: lead.adset_name ?? null,
              fullName,
              createdTime,
              nomeEmpresa,
              telefone,
              estado,
              tipoEmpresa,
              faixaFaturamento,
              emailLead,
              statusCrm,
              rawFieldData: fd as object,
            },
            update: {
              campaignId: lead.campaign_id ?? null,
              campaignName: lead.campaign_name ?? null,
              adId: lead.ad_id ?? null,
              adName: lead.ad_name ?? null,
              adsetId: lead.adset_id ?? null,
              adsetName: lead.adset_name ?? null,
              fullName,
              nomeEmpresa,
              telefone,
              estado,
              tipoEmpresa,
              faixaFaturamento,
              emailLead,
              ...(statusCrm !== null ? { statusCrm } : {}),
              rawFieldData: fd as object,
            },
          });
          if (isNew) leadsCreated++;
        } catch (e) {
          leadsFailed++;
          console.error(`[metaLeadsSync] Failed to upsert lead ${lead.id} for client ${clienteId}:`, e instanceof Error ? e.message : e);
        }
      }
    }

    const warning =
      allForms.length === 0
        ? "Nenhum formulário de lead acessível. O token Meta consegue ler anúncios/investimento, mas não tem acesso de Página aos formulários (o system user precisa estar atribuído à Página com pages_manage_ads/pages_read_engagement). Sem isso, os leads de formulário não são sincronizados."
        : undefined;
    return { leadsProcessed, leadsCreated, leadsFailed, formsFound: allForms.length, formsProcessed: forms.length, formsSummary, warning };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { leadsProcessed: 0, leadsCreated: 0, leadsFailed: 0, formsFound: 0, formsProcessed: 0, formsSummary: [], error: message };
  }
}
