"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { FunilCrmSection } from "@/components/clientes/FunilCrmSection";
import {
  RefreshCw, Inbox, Search, X,
  ChevronLeft, ChevronRight,
  BarChart3, MapPin, Layers,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  crmLeadId: string;
  etapa: string;
  valor: number | null;
  dataEntrada: string;
  dataFechamento: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  contato: string | null;
  fonte: string | null;
  rating: number | null;
  status: string | null;
  dadosMarketing?: {
    faturamento?: string | null;
    segmento?: string | null;
    investimento?: string | null;
    interesse?: string | null;
    cargo?: string | null;
    origemMarketing?: string | null;
    eventoConversao?: string | null;
    empresa?: string | null;
    lifecycleStage?: string | null;
    metaAdId?: string | null;
    metaAdName?: string | null;
    metaAdsetId?: string | null;
    metaAdsetName?: string | null;
    metaCampaignId?: string | null;
    metaCampaignName?: string | null;
    metaFormId?: string | null;
    metaFormName?: string | null;
  } | null;
  dadosCv?: {
    origem?: string | null;
    origemUltimo?: string | null;
    midiaOriginal?: string | null;
    midiaUltimo?: string | null;
    conversaoOriginal?: string | null;
    conversaoUltimo?: string | null;
    empreendimento?: string | null;
    empreendimentoPrimeiro?: string | null;
    empreendimentoUltimo?: string | null;
    score?: number | null;
    possibilidadeVenda?: string | null;
    profissao?: string | null;
    rendaFamiliar?: string | null;
    feedback?: string | null;
    motivoCancelamento?: string | null;
    descricaoCancelamento?: string | null;
    submotivoCancelamento?: string | null;
    corretor?: string | null;
    corretorUltimo?: string | null;
    gestor?: string | null;
    imobiliaria?: string | null;
    pontoVenda?: string | null;
    regiao?: string | null;
    cidade?: string | null;
    estado?: string | null;
    tags?: string[] | null;
    reserva?: string | null;
  } | null;
}

interface LeadsApiResponse {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
}

interface PorFonte {
  fonte: string;
  canal: string;
  leads: number;
  ganhos: number;
  perdidos: number;
  andamento: number;
  visitou: number;
  valor: number;
  taxaGanho: number;
  taxaPerda: number;
  ratingMedio: number | null;
  investCanal: number | null;
}

interface PorCanal {
  canal: string;
  leads: number;
  ganhos: number;
  perdidos: number;
  ratingMedio: number | null;
  investCanal: number | null;
}

interface PorEstado {
  estado: string;
  leads: number;
  ratingMedio: number | null;
}

interface PorConversao {
  conversao: string;
  leads: number;
  ratingMedio: number | null;
}

interface PorCampanha {
  campanha: string;
  canal: string;
  leads: number;
  ganhos: number;
  perdidos: number;
  andamento: number;
  visitou: number;
  valor: number;
  taxaGanho: number;
  investCanal: number | null;
}

interface PorCriativo {
  adName: string;
  adId: string | null;
  adsetName: string | null;
  campaignName: string | null;
  leads: number;
  ganhos: number;
  perdidos: number;
  andamento: number;
  visitou: number;
  valor: number;
  taxaGanho: number;
}

interface PorCampanhaConfirmada {
  campaignName: string;
  leads: number;
  ganhos: number;
  perdidos: number;
  andamento: number;
  visitou: number;
  valor: number;
  taxaGanho: number;
}

interface AtribuicaoData {
  configured: boolean;
  totalLeads: number;
  totalGanhos: number;
  totalPerdidos: number;
  totalAndamento: number;
  totalValor: number;
  investMeta: number;
  investGoogle: number;
  leadsMeta: number;
  leadsGoogle: number;
  metaCrmLeads: number;
  googleCrmLeads: number;
  metaLeadsConfirmados: number;
  cplMetaCampanha: number | null;
  cplGoogleCampanha: number | null;
  cplMetaCrm: number | null;
  cplGoogleCrm: number | null;
  cplMetaConfirmado: number | null;
  cacMetaCrm: number | null;
  cacGoogleCrm: number | null;
  porFonte: PorFonte[];
  porCanal: PorCanal[];
  porEstado: PorEstado[];
  porConversao: PorConversao[];
  porCampanha: PorCampanha[];
  porCriativo: PorCriativo[];
  porCampanhaConfirmada: PorCampanhaConfirmada[];
  leadsComEstado: number;
  leadsComConversao: number;
  ultimoSyncAt?: string | null;
}

// ─── Filter type ──────────────────────────────────────────────────────────────

type LeadFilter = {
  type: "canal" | "estado" | "conversao";
  value: string;
  label: string;
} | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrencyBR(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(iso: string | Date | null) {
  if (!iso) return "—";
  const d = new Date(iso as string);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function canalFromMidia(
  fonte: string | null,
  midiaOriginal?: string | null,
): "META" | "GOOGLE" | "ORGANICO" | "INDICACAO" | "DIRETO" | "OUTRO" {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Primary: midiaOriginal (real paid media channel)
  if (midiaOriginal) {
    const m = norm(midiaOriginal);
    if (m.includes("facebook") || m.includes("meta") || m.includes("instagram") || m.includes("fb ads") || /\bfb\b/.test(m)) return "META";
    if (m.includes("google") || m.includes("youtube") || m.includes("pmax") || m.includes("busca paga")) return "GOOGLE";
    if (m.includes("indica") || m.includes("referral") || m.includes("amigo") || m.includes("parceiro")) return "INDICACAO";
    if (m.includes("organic") || m.includes("organico") || m.includes("seo")) return "ORGANICO";
    if (m.includes("email") || m.includes("whatsapp")) return "DIRETO";
  }

  // Fallback: fonte
  if (!fonte) return "OUTRO";
  const f = norm(fonte);
  if (f.includes("facebook") || f.includes("meta") || f.includes("instagram") || /\bfb\b/.test(f)) return "META";
  if (f.includes("google") || f.includes("busca paga") || f.includes("youtube") || f.includes("pmax")) return "GOOGLE";
  if (f.includes("organic") || f.includes("organico") || f.includes("seo")) return "ORGANICO";
  if (f.includes("indica") || f.includes("referral") || f.includes("referencia")) return "INDICACAO";
  if (f.includes("direto") || f.includes("direct") || f.includes("whatsapp") || f.includes("site") || f.includes("email")) return "DIRETO";
  return "OUTRO";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  won:     { label: "Ganho",        cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  lost:    { label: "Perdido",      cls: "bg-red-500/10 text-red-400 border border-red-500/20" },
  ongoing: { label: "Em andamento", cls: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  paused:  { label: "Pausado",      cls: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" },
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[var(--border)]">—</span>;
  const cfg = STATUS_CFG[status] ?? { label: status, cls: "bg-[var(--muted)] text-[var(--muted-foreground)]" };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

const CANAL_CFG: Record<string, { label: string; color: string; hex: string }> = {
  META:      { label: "Meta",      color: "text-blue-400",                  hex: "#3b82f6" },
  GOOGLE:    { label: "Google",    color: "text-red-400",                   hex: "#ef4444" },
  ORGANICO:  { label: "Orgânico",  color: "text-emerald-400",               hex: "#10b981" },
  INDICACAO: { label: "Indicação", color: "text-purple-400",                hex: "#a855f7" },
  DIRETO:    { label: "Direto",    color: "text-amber-500",                 hex: "#f59e0b" },
  OUTRO:     { label: "Outro",     color: "text-[var(--muted-foreground)]", hex: "#6b7280" },
};


function HorizontalBar({
  label, value, total, color, onClick, isActive,
}: {
  label: string;
  value: number;
  total: number;
  color?: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
        onClick ? "cursor-pointer hover:bg-[var(--primary)]/8" : ""
      } ${isActive ? "bg-[var(--primary)]/10 ring-1 ring-inset ring-[var(--primary)]/20" : ""}`}
    >
      <span className={`w-28 shrink-0 truncate text-[11px] font-medium ${isActive ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`} title={label}>
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(pct, 0.5)}%`,
              backgroundColor: color ?? "var(--primary)",
              opacity: isActive ? 1 : 0.7,
            }}
          />
        </div>
      </div>
      <span className="w-10 shrink-0 text-right tabular-nums text-[10px] text-[var(--muted-foreground)]">
        {pct.toFixed(1)}%
      </span>
      <span className={`w-8 shrink-0 text-right tabular-nums text-[11px] font-bold ${isActive ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Lead Detail Drawer ───────────────────────────────────────────────────────

function DField({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">{label}</span>
      <span className="text-sm text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function DSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">{title}</p>
      <div className="grid grid-cols-2 gap-x-5 gap-y-3">{children}</div>
    </div>
  );
}

function LeadDetailDrawer({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  React.useEffect(() => {
    if (!lead) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [lead, onClose]);

  const cv = lead?.dadosCv ?? null;
  const cvTags: string[] = Array.isArray(cv?.tags) ? (cv.tags as string[]) : [];
  const mkt = lead?.dadosMarketing ?? null;
  // Use midiaOriginal as primary signal for canal display
  const canal = canalFromMidia(lead?.fonte ?? null, cv?.midiaOriginal ?? null);
  const canalCfg = CANAL_CFG[canal] ?? CANAL_CFG.OUTRO;
  const isOpen = lead !== null;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-[500px] overflow-y-auto border-l border-[var(--border)] bg-[var(--background)] shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {lead && (
          <div className="flex flex-col gap-6 p-6 pb-12">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={lead.status} />
                  <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)]">
                    {lead.etapa}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold leading-tight text-[var(--foreground)]">
                  {lead.nome ?? lead.email ?? lead.telefone ?? "Sem identificação"}
                </h2>
                {lead.nome && (lead.email ?? lead.telefone) && (
                  <p className="text-sm text-[var(--muted-foreground)]">{lead.email ?? lead.telefone}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-px bg-[var(--border)]" />

            {/* Contato */}
            <DSection title="Contato">
              {lead.email && <DField label="E-mail" value={lead.email} />}
              {lead.telefone && <DField label="Telefone" value={lead.telefone} />}
              <DField label="Data de entrada" value={formatDateBR(lead.dataEntrada)} />
              {lead.dataFechamento && <DField label="Fechamento" value={formatDateBR(lead.dataFechamento)} />}
              {lead.valor != null && (
                <DField label="Valor" value={
                  <span className="font-bold text-emerald-400">{formatCurrencyBR(lead.valor)}</span>
                } />
              )}
              {cv?.score != null && (
                <DField label="Score CV" value={
                  <span className="font-bold text-[var(--primary)]">{cv.score}</span>
                } />
              )}
            </DSection>

            <div className="h-px bg-[var(--border)]" />

            {/* Origem */}
            <DSection title="Origem & Mídia">
              {lead.fonte && <DField label="Fonte" value={lead.fonte} />}
              <DField label="Canal" value={
                <span className={`font-semibold ${canalCfg.color}`}>{canalCfg.label}</span>
              } />
              {cv?.midiaOriginal && <DField label="Mídia original" value={cv.midiaOriginal} />}
              {cv?.midiaUltimo && cv.midiaUltimo !== cv.midiaOriginal && (
                <DField label="Mídia último toque" value={cv.midiaUltimo} />
              )}
              {cv?.conversaoOriginal && (
                <div className="col-span-2">
                  <DField label="Conversão original" value={cv.conversaoOriginal} />
                </div>
              )}
              {cv?.conversaoUltimo && cv.conversaoUltimo !== cv.conversaoOriginal && (
                <div className="col-span-2">
                  <DField label="Conversão último" value={cv.conversaoUltimo} />
                </div>
              )}
              {cv?.pontoVenda && <DField label="Ponto de venda" value={cv.pontoVenda} />}
              {cv?.estado && (
                <DField label="Localização" value={
                  [cv.cidade, cv.estado].filter(Boolean).join(" / ")
                } />
              )}
              {!cv?.estado && cv?.regiao && <DField label="Região" value={cv.regiao} />}
            </DSection>

            {/* Empreendimento */}
            {(cv?.empreendimento || cv?.corretor || cv?.gestor || cv?.imobiliaria) && (
              <>
                <div className="h-px bg-[var(--border)]" />
                <DSection title="Empreendimento">
                  {cv.empreendimento && (
                    <div className="col-span-2">
                      <DField label="Empreendimento" value={cv.empreendimento} />
                    </div>
                  )}
                  {cv.empreendimentoPrimeiro && cv.empreendimentoPrimeiro !== cv.empreendimento && (
                    <DField label="1º interesse" value={cv.empreendimentoPrimeiro} />
                  )}
                  {cv.empreendimentoUltimo && cv.empreendimentoUltimo !== cv.empreendimento && (
                    <DField label="Último interesse" value={cv.empreendimentoUltimo} />
                  )}
                  {cv.corretor && <DField label="Corretor" value={cv.corretor} />}
                  {cv.corretorUltimo && cv.corretorUltimo !== cv.corretor && (
                    <DField label="Último corretor" value={cv.corretorUltimo} />
                  )}
                  {cv.gestor && <DField label="Gestor" value={cv.gestor} />}
                  {cv.imobiliaria && (
                    <div className="col-span-2">
                      <DField label="Imobiliária" value={cv.imobiliaria} />
                    </div>
                  )}
                </DSection>
              </>
            )}

            {/* Perfil */}
            {(cv?.profissao || cv?.rendaFamiliar || cv?.possibilidadeVenda || cv?.feedback || cv?.reserva) && (
              <>
                <div className="h-px bg-[var(--border)]" />
                <DSection title="Perfil do Lead">
                  {cv.profissao && <DField label="Profissão" value={cv.profissao} />}
                  {cv.rendaFamiliar && <DField label="Renda familiar" value={cv.rendaFamiliar} />}
                  {cv.possibilidadeVenda && <DField label="Possib. de venda" value={cv.possibilidadeVenda} />}
                  {cv.reserva && <DField label="Reserva" value={cv.reserva} />}
                  {cv.feedback && (
                    <div className="col-span-2">
                      <DField label="Feedback" value={cv.feedback} />
                    </div>
                  )}
                </DSection>
              </>
            )}

            {/* Tags */}
            {cvTags.length > 0 && (
              <>
                <div className="h-px bg-[var(--border)]" />
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cvTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-2.5 py-0.5 text-[11px] text-[var(--foreground)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Motivo de perda */}
            {lead.status === "lost" && cv?.motivoCancelamento && (
              <>
                <div className="h-px bg-[var(--border)]" />
                <div className="space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">Motivo de Perda</p>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                    <DField label="Motivo" value={<span className="text-red-400">{cv.motivoCancelamento}</span>} />
                    {cv.submotivoCancelamento && (
                      <DField label="Submotivo" value={<span className="text-red-400">{cv.submotivoCancelamento}</span>} />
                    )}
                    {cv.descricaoCancelamento && (
                      <div className="col-span-2">
                        <DField label="Descrição" value={<span className="text-red-400">{cv.descricaoCancelamento}</span>} />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Marketing (non-CV) */}
            {mkt && !cv && (mkt.faturamento || mkt.segmento || mkt.cargo || mkt.empresa) && (
              <>
                <div className="h-px bg-[var(--border)]" />
                <DSection title="Dados de Marketing">
                  {mkt.empresa && <DField label="Empresa" value={mkt.empresa} />}
                  {mkt.faturamento && <DField label="Faturamento" value={mkt.faturamento} />}
                  {mkt.segmento && <DField label="Segmento" value={mkt.segmento} />}
                  {mkt.cargo && <DField label="Cargo" value={mkt.cargo} />}
                  {mkt.origemMarketing && <DField label="Origem marketing" value={mkt.origemMarketing} />}
                  {mkt.eventoConversao && <DField label="Evento de conversão" value={mkt.eventoConversao} />}
                  {mkt.lifecycleStage && <DField label="Lifecycle stage" value={mkt.lifecycleStage} />}
                </DSection>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Campaign Section ─────────────────────────────────────────────────────────

function CampanhaSection({ data }: { data: AtribuicaoData }) {
  const porCampanha = data.porCampanha ?? [];
  const metaCampanhas = porCampanha.filter((m) => m.canal === "META").sort((a, b) => b.leads - a.leads);
  const googleCampanhas = porCampanha.filter((m) => m.canal === "GOOGLE").sort((a, b) => b.leads - a.leads);

  if (metaCampanhas.length === 0 && googleCampanhas.length === 0) return null;

  const CampanhaTable = ({
    rows,
    canal,
    investCanal,
  }: {
    rows: PorCampanha[];
    canal: "META" | "GOOGLE";
    investCanal: number;
  }) => {
    const cfg = CANAL_CFG[canal];
    const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full`} style={{ backgroundColor: cfg.hex }} />
          <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
          <span className="text-xs text-[var(--muted-foreground)]">· {totalLeads} leads</span>
          {investCanal > 0 && (
            <span className="text-xs text-[var(--muted-foreground)]">
              · {formatCurrencyBR(investCanal)} investidos
            </span>
          )}
        </div>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="min-w-[600px] w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                {["Campanha / Mídia", "Leads", "Visitou", "Em aberto", "Ganhos", "Conv%"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.campanha}
                  className={`border-b border-[var(--border)]/50 transition-colors hover:bg-[var(--muted)]/20 ${
                    i % 2 === 0 ? "" : "bg-[var(--muted)]/10"
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span className="max-w-[200px] block truncate font-medium text-[var(--foreground)]" title={row.campanha}>
                      {row.campanha}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-[var(--foreground)]">{row.leads}</td>
                  <td className="px-4 py-2.5 tabular-nums text-[var(--muted-foreground)]">
                    {row.visitou > 0 ? row.visitou : <span className="opacity-40">—</span>}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-blue-400">{row.andamento}</td>
                  <td className="px-4 py-2.5 tabular-nums font-bold text-emerald-400">
                    {row.ganhos > 0 ? row.ganhos : <span className="font-normal opacity-40">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.leads > 0 ? (
                      <span className={`tabular-nums font-semibold ${row.taxaGanho > 0 ? "text-emerald-400" : "text-[var(--muted-foreground)]"}`}>
                        {row.taxaGanho}%
                      </span>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">CRM</p>
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">Por Campanha</h2>
        </div>
      </div>
      <div className="space-y-6">
        {metaCampanhas.length > 0 && (
          <CampanhaTable rows={metaCampanhas} canal="META" investCanal={data.investMeta ?? 0} />
        )}
        {googleCampanhas.length > 0 && (
          <CampanhaTable rows={googleCampanhas} canal="GOOGLE" investCanal={data.investGoogle ?? 0} />
        )}
      </div>
    </div>
  );
}

// ─── Criativo Section (Meta Lead ID matching) ─────────────────────────────────

function CriativoSection({ data }: { data: AtribuicaoData }) {
  const rows = (data.porCriativo ?? []).sort((a, b) => b.leads - a.leads);
  if (rows.length === 0) return null;

  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const totalGanhos = rows.reduce((s, r) => s + r.ganhos, 0);
  const metaHex = "#3b82f6";

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">CRM × Meta</p>
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">Por Criativo</h2>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: metaHex }} />
          <span className="text-xs font-semibold text-[var(--foreground)]">{totalLeads} leads identificados</span>
          <span className="text-xs text-[var(--muted-foreground)]">via Meta Lead Forms</span>
        </div>
        {totalGanhos > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
            <span className="text-xs font-semibold text-emerald-400">{totalGanhos} vendas atribuídas</span>
            <span className="text-xs text-emerald-400/60">· {((totalGanhos / totalLeads) * 100).toFixed(1)}% conv.</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
              {["Criativo (Anúncio)", "Conjunto", "Leads", "Visitou", "Em aberto", "Ganhos", "Conv%", "Valor"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.adName}
                className={`border-b border-[var(--border)]/50 transition-colors hover:bg-[var(--muted)]/20 ${
                  i % 2 === 0 ? "" : "bg-[var(--muted)]/10"
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: metaHex }} />
                    <span className="max-w-[180px] block truncate font-medium text-[var(--foreground)]" title={row.adName}>
                      {row.adName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {row.adsetName ? (
                    <span className="max-w-[140px] block truncate text-xs text-[var(--muted-foreground)]" title={row.adsetName}>
                      {row.adsetName}
                    </span>
                  ) : (
                    <span className="opacity-30 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-semibold text-[var(--foreground)]">{row.leads}</span>
                    {totalLeads > 0 && (
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--muted)]/40">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(row.leads / totalLeads) * 100}%`, backgroundColor: metaHex, opacity: 0.7 }}
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 tabular-nums text-[var(--muted-foreground)]">
                  {row.visitou > 0 ? row.visitou : <span className="opacity-40">—</span>}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-blue-400">{row.andamento}</td>
                <td className="px-4 py-2.5 tabular-nums font-bold text-emerald-400">
                  {row.ganhos > 0 ? row.ganhos : <span className="font-normal opacity-40">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  {row.leads > 0 ? (
                    <span className={`tabular-nums font-semibold ${row.taxaGanho > 0 ? "text-emerald-400" : "text-[var(--muted-foreground)]"}`}>
                      {row.taxaGanho}%
                    </span>
                  ) : (
                    <span className="opacity-40">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-emerald-400/80">
                  {row.valor > 0 ? formatCurrencyBR(row.valor) : <span className="opacity-40">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[var(--muted-foreground)]">
        Atribuição via cruzamento MetaLeadForms × CRM por e-mail e telefone.
        Leads sem correspondência no CRM não aparecem aqui.
      </p>
    </div>
  );
}

// ─── Análise de Origem Section ────────────────────────────────────────────────

function AtribuicaoSection({
  clienteId,
  dateRange,
  activeFilter,
  onFilter,
}: {
  clienteId: string;
  dateRange: { from: string; to: string };
  activeFilter: LeadFilter;
  onFilter: (f: LeadFilter) => void;
}) {
  const [convSearch, setConvSearch] = React.useState("");

  const { data, isLoading } = useQuery<AtribuicaoData>({
    queryKey: ["crm-atribuicao", clienteId, dateRange.from, dateRange.to],
    queryFn: () =>
      fetch(`/api/clientes/${clienteId}/crm/atribuicao?from=${dateRange.from}&to=${dateRange.to}`)
        .then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (!data?.configured) return null;

  const totalLeads = data.totalLeads ?? 0;
  const porCanal = data.porCanal ?? [];
  const porEstado = data.porEstado ?? [];
  const porConversao = (data.porConversao ?? []).filter((c) =>
    !convSearch || c.conversao.toLowerCase().includes(convSearch.toLowerCase())
  );
  const leadsComEstado = data.leadsComEstado ?? 0;
  const leadsComConversao = data.leadsComConversao ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">CRM</p>
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">Análise de Origem</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <RefreshCw className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : (
        <>
          {/* KPI Cards — Valor Vendido em destaque */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Valor Vendido — destaque principal */}
            <div className="group relative col-span-2 overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:col-span-2">
              <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-500 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.08]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400/70">Valor Vendido</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-400">
                {data.totalValor > 0 ? formatCurrencyBR(data.totalValor) : "—"}
              </p>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-emerald-400/60">
                <span>{data.totalGanhos} unidade{data.totalGanhos !== 1 ? "s" : ""} vendida{data.totalGanhos !== 1 ? "s" : ""}</span>
                {data.totalGanhos > 0 && data.totalValor > 0 && (
                  <span>· ticket médio {formatCurrencyBR(data.totalValor / data.totalGanhos)}</span>
                )}
              </div>
            </div>
            {/* Leads */}
            <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--primary)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.05]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">Leads CRM</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-[var(--foreground)]">{totalLeads.toLocaleString("pt-BR")}</p>
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                {((data.totalGanhos / Math.max(totalLeads, 1)) * 100).toFixed(1)}% conv. geral
              </p>
            </div>
            {/* Em aberto */}
            <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.07]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">Em aberto</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-blue-400">{data.totalAndamento}</p>
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                {data.totalPerdidos} perdidos · {((data.totalPerdidos / Math.max(totalLeads, 1)) * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* 2-column visual grid */}
          {totalLeads > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Canais de Origem */}
              <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                  <p className="text-sm font-bold text-[var(--foreground)]">Canais de Origem</p>
                  {activeFilter?.type === "canal" && (
                    <span className="ml-auto text-[10px] text-[var(--primary)] opacity-70">· clique novamente para limpar</span>
                  )}
                </div>
                {porCanal.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[var(--muted-foreground)]">Sem dados</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          {["Canal", "Leads", "Vendas", "Conv%"].map((h) => (
                            <th key={h} className={`pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)] ${h === "Canal" ? "text-left" : "text-right"}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {porCanal.map((c) => {
                          const cfg = CANAL_CFG[c.canal] ?? CANAL_CFG.OUTRO;
                          const taxaGanho = c.leads > 0 ? ((c.ganhos / c.leads) * 100) : 0;
                          const isActive = activeFilter?.type === "canal" && activeFilter.value === c.canal;
                          const handleClick = () => {
                            if (isActive) onFilter(null);
                            else onFilter({ type: "canal", value: c.canal, label: `Canal: ${cfg.label}` });
                          };
                          // Meta sub-data
                          const metaConfirmados = c.canal === "META" ? (data.metaLeadsConfirmados ?? 0) : 0;
                          const metaCrm = c.canal === "META" ? ((data.metaCrmLeads ?? 0) - metaConfirmados) : 0;
                          return (
                            <React.Fragment key={c.canal}>
                              <tr
                                onClick={handleClick}
                                className={`cursor-pointer border-b border-[var(--border)]/40 transition-colors hover:bg-[var(--primary)]/5 ${
                                  isActive ? "bg-[var(--primary)]/8" : ""
                                } ${c.canal === "META" && metaConfirmados > 0 ? "" : "last:border-0"}`}
                              >
                                <td className="py-2 pr-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cfg.hex }} />
                                    <span className={`text-[12px] font-semibold ${isActive ? "text-[var(--primary)]" : cfg.color}`}>{cfg.label}</span>
                                    {isActive && <span className="text-[9px] text-[var(--primary)]/60">✓ filtrado</span>}
                                  </div>
                                </td>
                                <td className={`py-2 text-right tabular-nums text-[12px] ${isActive ? "font-bold text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
                                  {c.leads.toLocaleString("pt-BR")}
                                </td>
                                <td className="py-2 text-right tabular-nums text-[12px] font-bold text-emerald-400">
                                  {c.ganhos > 0 ? c.ganhos : <span className="font-normal text-[var(--muted-foreground)]">—</span>}
                                </td>
                                <td className="py-2 text-right tabular-nums text-[12px]">
                                  {taxaGanho > 0 ? (
                                    <span className="font-semibold text-emerald-400">{taxaGanho.toFixed(1)}%</span>
                                  ) : (
                                    <span className="text-[var(--muted-foreground)]">—</span>
                                  )}
                                </td>
                              </tr>
                              {/* Meta sub-rows: confirmed vs CRM-only */}
                              {c.canal === "META" && metaConfirmados > 0 && (
                                <>
                                  <tr
                                    onClick={() => {
                                      const isSubActive = activeFilter?.type === "canal" && activeFilter.value === "META_CONFIRMED";
                                      onFilter(isSubActive ? null : { type: "canal", value: "META_CONFIRMED", label: "Meta — Confirmados" });
                                    }}
                                    className={`cursor-pointer border-b border-[var(--border)]/20 transition-colors hover:bg-emerald-500/5 ${
                                      activeFilter?.type === "canal" && activeFilter.value === "META_CONFIRMED" ? "bg-emerald-500/8" : ""
                                    }`}
                                  >
                                    <td className="py-1.5 pl-5 pr-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-emerald-400/60">└</span>
                                        <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                                        <span className="text-[11px] font-medium text-emerald-400">✓ Campanha</span>
                                      </div>
                                    </td>
                                    <td className="py-1.5 text-right tabular-nums text-[11px] font-semibold text-emerald-400">{metaConfirmados}</td>
                                    <td colSpan={2} className="py-1.5 text-right text-[10px] text-emerald-400/50">confirmados</td>
                                  </tr>
                                  {metaCrm > 0 && (
                                    <tr
                                      onClick={() => {
                                        const isSubActive = activeFilter?.type === "canal" && activeFilter.value === "META_CRM";
                                        onFilter(isSubActive ? null : { type: "canal", value: "META_CRM", label: "Meta — Só CRM" });
                                      }}
                                      className={`cursor-pointer border-b border-[var(--border)]/40 last:border-0 transition-colors hover:bg-amber-500/5 ${
                                        activeFilter?.type === "canal" && activeFilter.value === "META_CRM" ? "bg-amber-500/8" : ""
                                      }`}
                                    >
                                      <td className="py-1.5 pl-5 pr-3">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] text-amber-400/60">└</span>
                                          <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-amber-400/60" />
                                          <span className="text-[11px] font-medium text-amber-400/80">CRM</span>
                                        </div>
                                      </td>
                                      <td className="py-1.5 text-right tabular-nums text-[11px] font-semibold text-amber-400/80">{metaCrm}</td>
                                      <td colSpan={2} className="py-1.5 text-right text-[10px] text-amber-400/40">sem confirmação</td>
                                    </tr>
                                  )}
                                </>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="mt-3 text-[10px] text-[var(--muted-foreground)]">Clique em um canal para filtrar as negociações</p>
              </div>

              {/* Fonte de Conversão */}
              <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                    <p className="text-sm font-bold text-[var(--foreground)]">Fonte de Conversão</p>
                  </div>
                  {leadsComConversao > 0 && (
                    <span className="shrink-0 text-[10px] text-[var(--muted-foreground)]">
                      {leadsComConversao.toLocaleString("pt-BR")} de {totalLeads.toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
                {(data.porConversao ?? []).length > 0 ? (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      <input
                        value={convSearch}
                        onChange={(e) => setConvSearch(e.target.value)}
                        placeholder="Buscar fonte de conversão…"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 py-1.5 pl-8 pr-3 text-[11px] placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none"
                      />
                    </div>
                    <div className="max-h-[240px] flex-1 space-y-0.5 overflow-y-auto">
                      {porConversao.length === 0 ? (
                        <p className="py-4 text-center text-xs text-[var(--muted-foreground)]">Nenhum resultado</p>
                      ) : (
                        porConversao.map((c) => {
                          const isActive = activeFilter?.type === "conversao" && activeFilter.value === c.conversao;
                          return (
                            <HorizontalBar
                              key={c.conversao}
                              label={c.conversao}
                              value={c.leads}
                              total={leadsComConversao}
                              isActive={isActive}
                              onClick={() => onFilter(isActive ? null : { type: "conversao", value: c.conversao, label: `Conversão: ${c.conversao}` })}
                            />
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center py-8">
                    <p className="max-w-[180px] text-center text-xs text-[var(--muted-foreground)]">
                      Dados de conversão não disponíveis para este CRM
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CPL cards */}
          {(data.cplMetaCrm != null || data.cplGoogleCrm != null) && (
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                CPL Real por Canal
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.cplMetaCrm != null && (
                  <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">Meta — Custo por Lead / Venda</p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">CPL Real</p>
                        <p className="mt-0.5 text-lg font-extrabold tabular-nums text-blue-400">{formatCurrencyBR(data.cplMetaCrm)}</p>
                        <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{data.metaCrmLeads} leads CRM</p>
                      </div>
                      {data.cacMetaCrm != null && (
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">CAC Real</p>
                          <p className="mt-0.5 text-lg font-extrabold tabular-nums text-blue-300">{formatCurrencyBR(data.cacMetaCrm)}</p>
                          <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                            {(data.porCanal ?? []).find(c => c.canal === "META")?.ganhos ?? 0} vendas
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">
                      {formatCurrencyBR(data.investMeta)} investidos
                      {data.cplMetaCampanha != null && (
                        <span className="ml-1 opacity-60">· plataforma: {formatCurrencyBR(data.cplMetaCampanha)}</span>
                      )}
                    </p>
                  </div>
                )}
                {data.cplGoogleCrm != null && (
                  <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">Google — Custo por Lead / Venda</p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">CPL Real</p>
                        <p className="mt-0.5 text-lg font-extrabold tabular-nums text-red-400">{formatCurrencyBR(data.cplGoogleCrm)}</p>
                        <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{data.googleCrmLeads} leads CRM</p>
                      </div>
                      {data.cacGoogleCrm != null && (
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">CAC Real</p>
                          <p className="mt-0.5 text-lg font-extrabold tabular-nums text-red-300">{formatCurrencyBR(data.cacGoogleCrm)}</p>
                          <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                            {(data.porCanal ?? []).find(c => c.canal === "GOOGLE")?.ganhos ?? 0} vendas
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">
                      {formatCurrencyBR(data.investGoogle)} investidos
                      {data.cplGoogleCampanha != null && (
                        <span className="ml-1 opacity-60">· plataforma: {formatCurrencyBR(data.cplGoogleCampanha)}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* [Leads Confirmados por Campanha removed] */}
          {false && (data.metaLeadsConfirmados ?? 0) > 0 && (
            <div className="space-y-3">
              {/* Title */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                    Leads Confirmados por Campanha
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                  <span className="font-semibold text-emerald-400">{data.metaLeadsConfirmados}</span>
                  <span>confirmados</span>
                  {data.metaCrmLeads > 0 && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="text-amber-400/80">{data.metaCrmLeads - data.metaLeadsConfirmados} só CRM</span>
                      <span className="opacity-40">·</span>
                      <span>{data.metaCrmLeads} total Meta CRM</span>
                    </>
                  )}
                </div>
              </div>

              {/* Explainer */}
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-400/60">
                      Confirmados (formulário Meta)
                    </p>
                    <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-emerald-400">
                      {data.metaLeadsConfirmados}
                    </p>
                    <p className="text-[10px] text-emerald-400/60">
                      cruzamento e-mail / telefone com Meta Lead Ads
                    </p>
                  </div>
                  {data.metaCrmLeads > 0 && (
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-400/60">
                        Atribuídos no CRM (sem confirmação)
                      </p>
                      <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-amber-400/80">
                        {data.metaCrmLeads - data.metaLeadsConfirmados}
                      </p>
                      <p className="text-[10px] text-amber-400/50">
                        mídia original = Facebook Ads, sem match de formulário
                      </p>
                    </div>
                  )}
                  {data.cplMetaConfirmado != null && (
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                        CPL (leads confirmados)
                      </p>
                      <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-[var(--foreground)]">
                        {formatCurrencyBR(data.cplMetaConfirmado)}
                      </p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        {formatCurrencyBR(data.investMeta)} investidos
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Table by confirmed campaign */}
              {(data.porCampanhaConfirmada?.length ?? 0) > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                  <table className="min-w-[640px] w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-emerald-500/5">
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400/70">
                          Campanha Meta (confirmada)
                        </th>
                        {["Leads", "Em aberto", "Vendas", "Conv%", "Valor"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.porCampanhaConfirmada.map((row, i) => (
                        <tr
                          key={row.campaignName}
                          className={`border-b border-[var(--border)]/50 last:border-0 ${i % 2 === 0 ? "" : "bg-[var(--muted)]/10"}`}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                              <span className="max-w-[260px] truncate text-[12px] font-medium text-[var(--foreground)]" title={row.campaignName}>
                                {row.campaignName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[12px] font-semibold text-emerald-400">
                            {row.leads}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[12px] text-blue-400">
                            {row.andamento > 0 ? row.andamento : <span className="opacity-40">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[12px] font-bold text-emerald-400">
                            {row.ganhos > 0 ? row.ganhos : <span className="font-normal opacity-40">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[12px]">
                            {row.taxaGanho > 0 ? (
                              <span className="font-semibold text-emerald-400">{row.taxaGanho}%</span>
                            ) : (
                              <span className="opacity-40">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[12px] text-emerald-400/80">
                            {row.valor > 0 ? formatCurrencyBR(row.valor) : <span className="opacity-40">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[10px] text-[var(--muted-foreground)]">
                Leads confirmados = cruzamento por e-mail e telefone com Meta Lead Ads. Leads &quot;só CRM&quot; foram
                atribuídos ao Meta no CV CRM por mídia de origem, sem correspondência no formulário.
              </p>
            </div>
          )}

          {/* Campaign breakdown (porMidia) */}
          <CampanhaSection data={data} />
        </>
      )}

      {/* Creative attribution via Meta Lead ID matching */}
      {!isLoading && data?.configured && (data.porCriativo?.length ?? 0) > 0 && (
        <CriativoSection data={data} />
      )}
    </div>
  );
}

// ─── CrmTab ───────────────────────────────────────────────────────────────────

export function CrmTab({
  clienteId,
  dateRange,
}: {
  clienteId: string;
  dateRange: { from: string; to: string };
}) {
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 15;
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [leadFilter, setLeadFilter] = React.useState<LeadFilter>(null);
  const queryClient = useQueryClient();

  // Debounce search 300ms
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 on dateRange, search, or filter change
  React.useEffect(() => {
    setPage(1);
  }, [dateRange.from, dateRange.to, debouncedSearch, leadFilter?.type, leadFilter?.value]);

  const filterQs = leadFilter
    ? `&filterType=${encodeURIComponent(leadFilter.type)}&filterValue=${encodeURIComponent(leadFilter.value)}`
    : "";

  const { data: leadsData, isLoading: leadsLoading } = useQuery<LeadsApiResponse>({
    queryKey: ["crm-leads", clienteId, dateRange.from, dateRange.to, page, PAGE_SIZE, debouncedSearch, leadFilter?.type, leadFilter?.value],
    queryFn: () =>
      fetch(
        `/api/clientes/${clienteId}/crm/leads?from=${dateRange.from}&to=${dateRange.to}&page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(debouncedSearch)}${filterQs}`
      ).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/clientes/${clienteId}/sync`, { method: "POST" });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error ?? "Erro ao sincronizar");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-funil", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["crm-atribuicao", clienteId] });
    },
  });

  const leads = leadsData?.leads ?? [];
  const total = leadsData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const isEmptyNoSearch = !leadsLoading && total === 0 && !debouncedSearch;

  function pageNumbers(current: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
    if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "…", current - 1, current, current + 1, "…", total];
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">CRM</p>
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">Negociações & Funil</h2>
        </div>
      </div>

      {syncMutation.isError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          Erro ao sincronizar. Tente novamente.
        </div>
      )}

      {/* Funil */}
      <FunilCrmSection clienteId={clienteId} dateRange={dateRange} />

      {/* Análise de Origem */}
      <AtribuicaoSection
        clienteId={clienteId}
        dateRange={dateRange}
        activeFilter={leadFilter}
        onFilter={setLeadFilter}
      />

      {/* Negociações */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">CRM</p>
            <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">Negociações</h2>
          </div>
        </div>

        {/* Active filter chip */}
        {leadFilter && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[var(--muted-foreground)]">Filtro ativo:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 py-1 pl-3 pr-2 text-[11px] font-semibold text-[var(--primary)]">
              {leadFilter.label}
              <button
                onClick={() => setLeadFilter(null)}
                className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--primary)]/20 transition-colors"
                title="Limpar filtro"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)] opacity-60">
              {total.toLocaleString("pt-BR")} resultado{total !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 pl-10 pr-10 text-sm placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Count line */}
        {!leadsLoading && total > 0 && (
          <p className="text-[11px] text-[var(--muted-foreground)]">
            <span className="font-semibold text-[var(--foreground)]">{total.toLocaleString("pt-BR")}</span> negociações
            {debouncedSearch && <span className="italic"> · buscando "{debouncedSearch}"</span>}
            {totalPages > 1 && ` · página ${page} de ${totalPages}`}
            {!leadsLoading && <span className="ml-1 opacity-60">· clique para ver detalhes</span>}
          </p>
        )}

        {/* Table */}
        {leadsLoading ? (
          <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
            <CardContent className="flex h-24 items-center justify-center">
              <RefreshCw className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
            </CardContent>
          </Card>
        ) : isEmptyNoSearch ? (
          <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted)]">
                <Inbox className="h-5 w-5 text-[var(--muted-foreground)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Nenhuma negociação encontrada</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Clique em Sincronizar para importar as negociações do CRM.
                </p>
              </div>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] transition-opacity disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                {syncMutation.isPending ? "Sincronizando…" : "Sincronizar agora"}
              </button>
            </CardContent>
          </Card>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] py-10">
            <Search className="h-6 w-6 text-[var(--muted-foreground)]" />
            <p className="text-sm text-[var(--muted-foreground)]">Nenhum resultado para &quot;{debouncedSearch}&quot;</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-[1040px] w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                    {["Status", "Etapa", "Contato", "Origem", "Qualificação", "Entrada", "Fechamento", "Valor"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => {
                    const cv = lead.dadosCv ?? null;
                    const mkt = lead.dadosMarketing ?? null;
                    const canal = canalFromMidia(lead.fonte, cv?.midiaOriginal);
                    const canalCfg = CANAL_CFG[canal] ?? CANAL_CFG.OUTRO;
                    const displayOrigem = cv?.midiaOriginal ?? lead.fonte ?? "—";
                    const confirmedCampaign = mkt?.metaCampaignName ?? null;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className={`cursor-pointer border-b border-[var(--border)]/50 transition-colors hover:bg-[var(--primary)]/5 ${
                          i % 2 === 0 ? "" : "bg-[var(--muted)]/10"
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="max-w-[160px] block truncate rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)]">
                            {lead.etapa}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="max-w-[160px]">
                            <p className="truncate font-medium text-[var(--foreground)]">
                              {lead.nome ?? lead.email ?? lead.telefone ?? "—"}
                            </p>
                            {lead.nome && lead.email && (
                              <p className="truncate text-[11px] text-[var(--muted-foreground)]">{lead.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="max-w-[170px]">
                            <div className="flex items-center gap-1">
                              <p className={`truncate text-[11px] font-semibold ${canalCfg.color}`}>{canalCfg.label}</p>
                              {confirmedCampaign ? (
                                <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                                  ✓ confirmado
                                </span>
                              ) : canal === "META" || canal === "GOOGLE" ? (
                                <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400/80">
                                  CRM
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-[11px] text-[var(--muted-foreground)]" title={displayOrigem}>
                              {displayOrigem}
                            </p>
                            {confirmedCampaign && (
                              <p className="truncate text-[10px] text-emerald-400/70" title={confirmedCampaign}>
                                {confirmedCampaign}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-[var(--muted-foreground)]">
                          {cv?.possibilidadeVenda ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-[12px] text-[var(--muted-foreground)]">
                          {formatDateBR(lead.dataEntrada)}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-[12px] text-[var(--muted-foreground)]">
                          {formatDateBR(lead.dataFechamento)}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums font-semibold text-emerald-400">
                          {lead.valor != null ? formatCurrencyBR(lead.valor) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {pageNumbers(page, totalPages).map((n, idx) =>
                  n === "…" ? (
                    <span key={`e-${idx}`} className="flex h-7 w-7 items-center justify-center text-xs text-[var(--muted-foreground)]">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-semibold transition-all ${
                        page === n
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                          : "border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lead Drawer */}
      <LeadDetailDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}
