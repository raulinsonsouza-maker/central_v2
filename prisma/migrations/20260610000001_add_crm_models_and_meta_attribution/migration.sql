-- CreateEnum
CREATE TYPE "CrmTipo" AS ENUM ('CVCRM', 'RDSTATION_CRM', 'KOMMO');

-- DropForeignKey
ALTER TABLE "SheetsConfig" DROP CONSTRAINT "SheetsConfig_clienteId_fkey";

-- DropIndex
DROP INDEX "FatoMidiaDiario_clienteId_data_canal_key";

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "formaPagamentoGoogle" TEXT,
ADD COLUMN     "formaPagamentoMeta" TEXT,
ADD COLUMN     "gestor" TEXT,
ADD COLUMN     "leadScoringEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "perfilPanel" TEXT,
ADD COLUMN     "portalToken" TEXT DEFAULT (gen_random_uuid())::text,
ADD COLUMN     "squad" INTEGER,
ADD COLUMN     "ultimoSyncAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Conta" ADD COLUMN     "googleAdsLoginCustomerId" TEXT;

-- AlterTable
ALTER TABLE "FatoMidiaDiario" ADD COLUMN     "addToCart" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "alcance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "campaignId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "campaignName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "checkoutIniciado" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contacts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "costPerPurchase" DECIMAL(14,2),
ADD COLUMN     "landingPageViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "messagingConversationsStarted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onFacebookLeads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "profileVisits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "purchases" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "websiteLeads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "websitePurchaseRoas" DECIMAL(14,2),
ADD COLUMN     "websitePurchasesConversionValue" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MetaLeadIndividual" ADD COLUMN     "adId" TEXT,
ADD COLUMN     "adName" TEXT,
ADD COLUMN     "adsetId" TEXT,
ADD COLUMN     "adsetName" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "platform" TEXT,
ALTER COLUMN "formId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PautaReuniao" ADD COLUMN     "dataFim" TIMESTAMP(3),
ADD COLUMN     "prioridade" TEXT NOT NULL DEFAULT 'MEDIA';

-- DropTable
DROP TABLE "SheetsConfig";

-- CreateTable
CREATE TABLE "CrmConfig" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "CrmTipo" NOT NULL,
    "dominio" TEXT,
    "credenciais" JSONB NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCrm" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "crmConfigId" TEXT NOT NULL,
    "crmLeadId" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "ordemEtapa" INTEGER,
    "telefone" TEXT,
    "email" TEXT,
    "metaLeadId" TEXT,
    "dataEntrada" TIMESTAMP(3) NOT NULL,
    "dataFechamento" TIMESTAMP(3),
    "valor" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCrm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleAdsCriativo" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "contaId" TEXT,
    "adResourceName" TEXT NOT NULL,
    "campaignId" TEXT,
    "campaignName" TEXT,
    "adGroupId" TEXT,
    "adGroupName" TEXT,
    "headline1" TEXT,
    "headline2" TEXT,
    "description" TEXT,
    "finalUrls" TEXT,
    "data" DATE NOT NULL,
    "impressoes" INTEGER NOT NULL DEFAULT 0,
    "cliques" INTEGER NOT NULL DEFAULT 0,
    "custoMicros" BIGINT NOT NULL DEFAULT 0,
    "conversoes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "conversaoValorMicros" BIGINT NOT NULL DEFAULT 0,
    "campaignStatus" TEXT,

    CONSTRAINT "GoogleAdsCriativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleAdsCampanha" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "contaId" TEXT,
    "campaignId" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "campaignStatus" TEXT,
    "campaignType" TEXT,
    "data" DATE NOT NULL,
    "impressoes" INTEGER NOT NULL DEFAULT 0,
    "cliques" INTEGER NOT NULL DEFAULT 0,
    "custoMicros" BIGINT NOT NULL DEFAULT 0,
    "conversoes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversaoValorMicros" BIGINT NOT NULL DEFAULT 0,
    "alcance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAdsCampanha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdsCriativo" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "contaId" TEXT,
    "data" DATE NOT NULL,
    "adId" TEXT NOT NULL,
    "creativeId" TEXT,
    "adName" TEXT NOT NULL,
    "effectiveStatus" TEXT,
    "campaignObjective" TEXT,
    "mediaType" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageUrlFull" TEXT,
    "videoId" TEXT,
    "videoSourceUrl" TEXT,
    "videoPictureUrl" TEXT,
    "videoEmbedHtml" TEXT,
    "body" TEXT,
    "title" TEXT,
    "spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DECIMAL(8,4),
    "cpc" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adsetId" TEXT,
    "adsetName" TEXT,
    "campaignId" TEXT,
    "campaignName" TEXT,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "websitePurchasesConversionValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "messagingConversationsStarted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MetaAdsCriativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FatoAnalyticsDiario" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "contaId" TEXT,
    "data" DATE NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "engagedSessions" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DECIMAL(8,6) NOT NULL DEFAULT 0,
    "bounceRate" DECIMAL(8,6) NOT NULL DEFAULT 0,
    "averageSessionDuration" INTEGER NOT NULL DEFAULT 0,
    "newUsers" INTEGER NOT NULL DEFAULT 0,
    "screenPageViews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FatoAnalyticsDiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FatoAnalyticsPorCanal" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "canal" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FatoAnalyticsPorCanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL,
    "attemptAt" TIMESTAMP(3),
    "successAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segmento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#6b7280',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segmento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmConfig_clienteId_key" ON "CrmConfig"("clienteId");

-- CreateIndex
CREATE INDEX "LeadCrm_clienteId_dataEntrada_idx" ON "LeadCrm"("clienteId", "dataEntrada");

-- CreateIndex
CREATE INDEX "LeadCrm_clienteId_etapa_idx" ON "LeadCrm"("clienteId", "etapa");

-- CreateIndex
CREATE INDEX "LeadCrm_clienteId_metaLeadId_idx" ON "LeadCrm"("clienteId", "metaLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadCrm_clienteId_crmLeadId_key" ON "LeadCrm"("clienteId", "crmLeadId");

-- CreateIndex
CREATE INDEX "GoogleAdsCriativo_clienteId_data_idx" ON "GoogleAdsCriativo"("clienteId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAdsCriativo_clienteId_adResourceName_data_key" ON "GoogleAdsCriativo"("clienteId", "adResourceName", "data");

-- CreateIndex
CREATE INDEX "GoogleAdsCampanha_clienteId_data_idx" ON "GoogleAdsCampanha"("clienteId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAdsCampanha_clienteId_campaignId_data_key" ON "GoogleAdsCampanha"("clienteId", "campaignId", "data");

-- CreateIndex
CREATE INDEX "MetaAdsCriativo_clienteId_data_idx" ON "MetaAdsCriativo"("clienteId", "data");

-- CreateIndex
CREATE INDEX "MetaAdsCriativo_clienteId_adId_data_idx" ON "MetaAdsCriativo"("clienteId", "adId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "MetaAdsCriativo_clienteId_adId_data_key" ON "MetaAdsCriativo"("clienteId", "adId", "data");

-- CreateIndex
CREATE INDEX "FatoAnalyticsDiario_clienteId_data_idx" ON "FatoAnalyticsDiario"("clienteId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "FatoAnalyticsDiario_clienteId_data_key" ON "FatoAnalyticsDiario"("clienteId", "data");

-- CreateIndex
CREATE INDEX "FatoAnalyticsPorCanal_clienteId_data_idx" ON "FatoAnalyticsPorCanal"("clienteId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "FatoAnalyticsPorCanal_clienteId_data_canal_key" ON "FatoAnalyticsPorCanal"("clienteId", "data", "canal");

-- CreateIndex
CREATE UNIQUE INDEX "Segmento_nome_key" ON "Segmento"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_portalToken_key" ON "Cliente"("portalToken");

-- CreateIndex
CREATE UNIQUE INDEX "Conta_clienteId_plataforma_key" ON "Conta"("clienteId", "plataforma");

-- CreateIndex
CREATE UNIQUE INDEX "FatoMidiaDiario_clienteId_data_canal_campaignName_key" ON "FatoMidiaDiario"("clienteId", "data", "canal", "campaignName");

-- CreateIndex
CREATE INDEX "MetaLeadIndividual_clienteId_tipoEmpresa_idx" ON "MetaLeadIndividual"("clienteId", "tipoEmpresa");

-- CreateIndex
CREATE INDEX "MetaLeadIndividual_clienteId_platform_idx" ON "MetaLeadIndividual"("clienteId", "platform");

-- CreateIndex
CREATE INDEX "PautaReuniao_clienteId_status_idx" ON "PautaReuniao"("clienteId", "status");

-- AddForeignKey
ALTER TABLE "CrmConfig" ADD CONSTRAINT "CrmConfig_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCrm" ADD CONSTRAINT "LeadCrm_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCrm" ADD CONSTRAINT "LeadCrm_crmConfigId_fkey" FOREIGN KEY ("crmConfigId") REFERENCES "CrmConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAdsCriativo" ADD CONSTRAINT "GoogleAdsCriativo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAdsCriativo" ADD CONSTRAINT "GoogleAdsCriativo_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAdsCampanha" ADD CONSTRAINT "GoogleAdsCampanha_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAdsCampanha" ADD CONSTRAINT "GoogleAdsCampanha_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsCriativo" ADD CONSTRAINT "MetaAdsCriativo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsCriativo" ADD CONSTRAINT "MetaAdsCriativo_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FatoAnalyticsDiario" ADD CONSTRAINT "FatoAnalyticsDiario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FatoAnalyticsDiario" ADD CONSTRAINT "FatoAnalyticsDiario_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FatoAnalyticsPorCanal" ADD CONSTRAINT "FatoAnalyticsPorCanal_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

