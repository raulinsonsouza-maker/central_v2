import { processScheduledExecutions } from "@/lib/instagram/automationEngine";

async function main() {
  const n = await processScheduledExecutions();
  console.log(`[symbius-cron] processed ${n} scheduled executions`);
}

main().catch(console.error);
