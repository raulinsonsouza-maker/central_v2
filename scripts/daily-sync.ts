/**
 * Sincronização diária de TODAS as contas (Meta Ads, Google Ads, GA4) + alertas.
 *
 * Este script é o coração da atualização automática no Replit. Ele é executado
 * por um **Scheduled Deployment** (cron do Replit), rodando direto contra o banco
 * de produção — sem depender de HTTP, token, cold-start de autoscale ou do limite
 * de 300s das funções serverless.
 *
 * Uso manual:  npx tsx scripts/daily-sync.ts [dateFrom] [dateTo]
 *   - sem argumentos: cada plataforma faz sync incremental (última data - 3 dias)
 *   - com datas:      força re-sync do período informado (YYYY-MM-DD)
 *
 * Comando npm: npm run sync:daily
 *
 * Exit code:
 *   0 = job concluiu (mesmo com erros pontuais por cliente, que são apenas logados)
 *   1 = falha fatal/inesperada em alguma etapa (visível como deployment "failed")
 */
import { syncMetaTodosClientes } from "../lib/sync/metaApiSync";
import { syncGoogleAdsTodosClientes } from "../lib/sync/googleAdsApiSync";
import { syncAnalyticsTodosClientes } from "../lib/sync/analyticsApiSync";
import { runDailyAlerts } from "../lib/alerts/sendAlerts";
import { prisma } from "../lib/db";

type SyncResult = { clienteId: string; error?: string };

function ts() {
  return new Date().toISOString();
}

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
}

/**
 * Detecta erro de credencial global (token expirado/inválido), que afeta TODOS
 * os clientes de uma plataforma — diferente de um erro pontual de configuração
 * de um cliente isolado (ex.: "Sem conta Meta configurada").
 */
function isCredencialError(msg: string | undefined): boolean {
  if (!msg) return false;
  return /(access token|session has expired|invalid_grant|invalid_token|unauthorized|expired|credential|authenticat)/i.test(
    msg,
  );
}

/**
 * Executa uma etapa de sync isolando falhas: erros de uma plataforma NÃO
 * interrompem as demais. Retorna a contagem de ok/erros e se houve falha fatal.
 *
 * `fatal` é marcado quando a etapa lança exceção OU quando há sinal de falha
 * SISTÊMICA de credencial (a maioria dos clientes falhou por token expirado/
 * inválido). Isso faz o job sair com exit 1 e o Scheduled Deployment marcar a
 * execução como "failed", em vez de passar despercebido como sucesso vazio.
 */
async function runStage(
  nome: string,
  fn: () => Promise<SyncResult[]>,
): Promise<{ ok: number; erros: number; fatal: boolean }> {
  const inicio = Date.now();
  console.log(`\n[${ts()}] ▶️  ${nome}: iniciando...`);
  try {
    const results = await fn();
    const comErro = results.filter((r) => r.error);
    const ok = results.length - comErro.length;

    for (const r of comErro) {
      console.warn(`[${ts()}]   ⚠️  ${nome} · cliente ${r.clienteId}: ${r.error}`);
    }

    // Falha sistêmica de credencial: muitos clientes falhando por auth/token.
    const credErros = comErro.filter((r) => isCredencialError(r.error)).length;
    const sistemica = ok === 0 && credErros > 0 && results.length > 1;
    if (sistemica) {
      console.error(
        `[${ts()}] ❌ ${nome}: FALHA SISTÊMICA — ${credErros}/${results.length} clientes com erro de credencial/token. Renove as credenciais desta plataforma.`,
      );
    }

    console.log(
      `[${ts()}] ${sistemica ? "❌" : "✅"} ${nome}: ${ok} ok / ${comErro.length} com erro (${results.length} total) em ${fmtDuration(
        Date.now() - inicio,
      )}`,
    );
    return { ok, erros: comErro.length, fatal: sistemica };
  } catch (e) {
    const message = e instanceof Error ? e.stack || e.message : String(e);
    console.error(`[${ts()}] ❌ ${nome}: FALHA FATAL em ${fmtDuration(Date.now() - inicio)}\n${message}`);
    return { ok: 0, erros: 0, fatal: true };
  }
}

async function main() {
  const dateFrom = process.argv[2];
  const dateTo = process.argv[3];
  const options = {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };

  const inicioGeral = Date.now();
  console.log("============================================================");
  console.log(`[${ts()}] 🔄 SYNC DIÁRIO — Central de Clientes Inout`);
  console.log(
    `[${ts()}] Período: ${dateFrom ?? "incremental"}${dateTo ? ` → ${dateTo}` : ""}`,
  );
  console.log("============================================================");

  let fatalCount = 0;

  // Sequencial (não paralelo) para evitar estourar rate limits das APIs.
  const meta = await runStage("Meta Ads", () => syncMetaTodosClientes(options));
  const google = await runStage("Google Ads", () => syncGoogleAdsTodosClientes(options));
  const ga4 = await runStage("Google Analytics", () => syncAnalyticsTodosClientes(options));

  fatalCount += [meta, google, ga4].filter((r) => r.fatal).length;

  // Alertas rodam por último, após os dados estarem atualizados.
  console.log(`\n[${ts()}] ▶️  Alertas de gestão: iniciando...`);
  try {
    const alertas = await runDailyAlerts();
    console.log(
      `[${ts()}] ✅ Alertas: ${alertas.saldosBaixos.length} saldos baixos, ${alertas.anomalias.length} anomalias` +
        ` (email=${alertas.emailEnviado ? "sim" : "não"}, webhook=${alertas.webhookEnviado ? "sim" : "não"})`,
    );
    if (alertas.erros?.length) {
      for (const erro of alertas.erros) console.warn(`[${ts()}]   ⚠️  Alertas: ${erro}`);
    }
  } catch (e) {
    fatalCount++;
    const message = e instanceof Error ? e.stack || e.message : String(e);
    console.error(`[${ts()}] ❌ Alertas: FALHA FATAL\n${message}`);
  }

  console.log("\n============================================================");
  console.log(`[${ts()}] 📊 RESUMO`);
  console.log(`   Meta Ads:         ${meta.ok} ok / ${meta.erros} erros${meta.fatal ? " (FATAL)" : ""}`);
  console.log(`   Google Ads:       ${google.ok} ok / ${google.erros} erros${google.fatal ? " (FATAL)" : ""}`);
  console.log(`   Google Analytics: ${ga4.ok} ok / ${ga4.erros} erros${ga4.fatal ? " (FATAL)" : ""}`);
  console.log(`   Tempo total:      ${fmtDuration(Date.now() - inicioGeral)}`);
  console.log("============================================================");

  if (fatalCount > 0) {
    throw new Error(`${fatalCount} etapa(s) falharam de forma fatal — verifique os logs acima.`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect().catch(() => {});
    console.log(`[${ts()}] ✔️  Job concluído com sucesso.`);
    process.exit(0);
  })
  .catch(async (e) => {
    await prisma.$disconnect().catch(() => {});
    const message = e instanceof Error ? e.stack || e.message : String(e);
    console.error(`[${ts()}] 💥 Job finalizou com erro:\n${message}`);
    process.exit(1);
  });
