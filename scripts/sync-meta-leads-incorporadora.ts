import { syncMetaLeadsCliente } from "../lib/sync/metaLeadsSync";
import { matchMetaCrmLeads } from "../lib/crm/metaCrmMatcher";

const clienteId = "cmp4fsgfm0001o33ngp93d5l1";

async function main() {
  console.log("=== Sync Meta Lead Forms — Incorporadora ===");
  const r1 = await syncMetaLeadsCliente(clienteId);
  console.log("Result:", JSON.stringify(r1, null, 2));

  console.log("\n=== Match CRM × Meta ===");
  const r2 = await matchMetaCrmLeads(clienteId);
  console.log("Result:", JSON.stringify(r2, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
