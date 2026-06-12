import { syncCrmCliente } from "@/lib/sync/crmSync";
import { prisma } from "@/lib/db";

async function main() {
  const result = await syncCrmCliente("cmp4fsgfm0001o33ngp93d5l1");
  console.log("RESULT:", JSON.stringify(result, null, 2));
}

main()
  .then(async () => { await prisma.$disconnect(); process.exit(0); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
