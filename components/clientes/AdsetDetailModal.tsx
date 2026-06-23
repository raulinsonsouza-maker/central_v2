"use client";

import React from "react";
import {
  X,
  Target,
  MapPin,
  Users,
  Calendar,
  DollarSign,
  Zap,
  Info,
  Settings2,
  TrendingUp,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeoLocation {
  key?: string;
  name: string;
  country?: string;
  region?: string;
}

interface Audience {
  id: string;
  name: string;
}

interface FlexSpec {
  interests?: Audience[];
  behaviors?: Audience[];
}

interface Targeting {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: {
    countries?: string[];
    regions?: GeoLocation[];
    cities?: GeoLocation[];
    location_types?: string[];
  };
  custom_audiences?: Audience[];
  excluded_custom_audiences?: Audience[];
  flexible_spec?: FlexSpec[];
  exclusions?: {
    custom_audiences?: Audience[];
    interests?: Audience[];
    behaviors?: Audience[];
  };
  targeting_automation?: { advantage_audience?: number };
}

interface Campaign {
  name: string;
  objective?: string;
  status?: string;
}

export interface AdsetDetail {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  optimization_goal?: string;
  billing_event?: string;
  bid_strategy?: string;
  bid_amount?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  end_time?: string;
  targeting?: Targeting;
  promoted_object?: { page_id?: string; pixel_id?: string; application_id?: string };
  campaign?: Campaign;
}

// ── Label maps ─────────────────────────────────────────────────────────────────

const OBJECTIVE_LABELS: Record<string, { label: string; color: string }> = {
  OUTCOME_LEADS:         { label: "Geração de Leads",    color: "bg-[var(--primary)]/20 text-[var(--primary)]" },
  OUTCOME_SALES:         { label: "Vendas",               color: "bg-emerald-500/20 text-emerald-400" },
  OUTCOME_AWARENESS:     { label: "Reconhecimento",       color: "bg-violet-500/20 text-violet-400" },
  OUTCOME_ENGAGEMENT:    { label: "Engajamento",          color: "bg-sky-500/20 text-sky-400" },
  OUTCOME_TRAFFIC:       { label: "Tráfego",              color: "bg-blue-500/20 text-blue-400" },
  OUTCOME_APP_PROMOTION: { label: "Promoção de App",      color: "bg-pink-500/20 text-pink-400" },
  LEAD_GENERATION:       { label: "Geração de Leads",    color: "bg-[var(--primary)]/20 text-[var(--primary)]" },
  CONVERSIONS:           { label: "Conversões",           color: "bg-emerald-500/20 text-emerald-400" },
  LINK_CLICKS:           { label: "Cliques no Link",     color: "bg-blue-500/20 text-blue-400" },
  BRAND_AWARENESS:       { label: "Reconhecimento de Marca", color: "bg-violet-500/20 text-violet-400" },
  REACH:                 { label: "Alcance",              color: "bg-slate-500/20 text-slate-400" },
  VIDEO_VIEWS:           { label: "Visualizações de Vídeo", color: "bg-sky-500/20 text-sky-400" },
  MESSAGES:              { label: "Mensagens",            color: "bg-sky-500/20 text-sky-300" },
  PAGE_LIKES:            { label: "Curtidas na Página",  color: "bg-blue-500/20 text-blue-400" },
};

const OPT_GOAL_LABELS: Record<string, string> = {
  LEAD_GENERATION:         "Leads",
  OFFSITE_CONVERSIONS:     "Conversões",
  LINK_CLICKS:             "Cliques no Link",
  IMPRESSIONS:             "Impressões",
  REACH:                   "Alcance",
  LANDING_PAGE_VIEWS:      "Visualizações da Página de Destino",
  VALUE:                   "Valor de Compra",
  PURCHASE_ROAS:           "ROAS de Compra",
  REPLIES:                 "Respostas",
  CONVERSATIONS:           "Conversas",
  POST_ENGAGEMENT:         "Engajamento com Post",
  VIDEO_VIEWS:             "Visualizações de Vídeo",
  THRUPLAY:                "ThruPlay (Vídeo)",
  APP_INSTALLS:            "Instalações de App",
  QUALITY_LEAD:            "Leads Qualificados",
  ENGAGED_USERS:           "Usuários Engajados",
  SUBSCRIBERS:             "Inscrições",
};

const BID_STRATEGY_LABELS: Record<string, string> = {
  LOWEST_COST_WITHOUT_CAP:  "Menor custo (sem limite)",
  COST_CAP:                 "Meta de custo",
  LOWEST_COST_WITH_BID_CAP: "Lance máximo",
  TARGET_COST:              "Custo alvo",
  MINIMUM_ROAS:             "ROAS mínimo",
};

const BILLING_EVENT_LABELS: Record<string, string> = {
  IMPRESSIONS:  "Impressões (CPM)",
  LINK_CLICKS:  "Cliques no link (CPC)",
  APP_INSTALLS: "Instalações de app",
  THRUPLAY:     "ThruPlay",
  NONE:         "—",
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:   "text-emerald-400 bg-emerald-400/10",
  PAUSED:   "text-amber-400 bg-amber-400/10",
  DELETED:  "text-red-400 bg-red-400/10",
  ARCHIVED: "text-slate-400 bg-slate-400/10",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:   "Ativo",
  PAUSED:   "Pausado",
  DELETED:  "Excluído",
  ARCHIVED: "Arquivado",
};

const GENDER_LABELS: Record<number, string> = { 1: "Masculino", 2: "Feminino" };

function fmtBrl(cents: string | number | undefined) {
  if (!cents) return "—";
  const v = Number(cents) / 100;
  return "R$\u00a0" + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function label(map: Record<string, string>, key?: string, fallback?: string) {
  if (!key) return fallback ?? "—";
  return map[key] ?? (fallback ?? key);
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--primary)]">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ label: lbl, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[12px] text-[var(--muted-foreground)] shrink-0">{lbl}</span>
      <span className={`text-[12px] font-medium text-right ${accent ? "text-[var(--foreground)]" : "text-[var(--foreground)]/80"}`}>
        {value}
      </span>
    </div>
  );
}

function Pill({ text, color }: { text: string; color?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${color ?? "bg-white/[0.08] text-white/60"}`}>
      {text}
    </span>
  );
}

function ChipList({ items, empty = "Nenhum" }: { items: string[]; empty?: string }) {
  if (!items.length) return <span className="text-[12px] text-white/30 italic">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5 mt-0.5">
      {items.map((t, i) => (
        <span key={i} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-[var(--foreground)]/70">
          {t}
        </span>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AdsetDetailModal({
  adsetId,
  adsetName,
  clienteId,
  onClose,
}: {
  adsetId: string;
  adsetName: string;
  clienteId: string;
  onClose: () => void;
}) {
  const [data, setData] = React.useState<AdsetDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/clientes/${clienteId}/meta-adset/${adsetId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setError("Erro ao carregar detalhes"); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [adsetId, clienteId]);

  const t = data?.targeting;
  const isAdvantage = (t?.targeting_automation?.advantage_audience ?? 0) === 1;

  // Locations
  const regions = (t?.geo_locations?.regions ?? []).map((r) => r.name);
  const cities = (t?.geo_locations?.cities ?? []).map((c) => c.name + (c.region ? `, ${c.region}` : ""));
  const countries = (t?.geo_locations?.countries ?? []);
  const locationTypes = t?.geo_locations?.location_types ?? [];

  // Gender
  const genders = t?.genders ?? [];
  const genderLabel = genders.length === 0 || genders.length === 2
    ? "Todos"
    : genders.map((g) => GENDER_LABELS[g] ?? g).join(", ");

  // Ages
  const ageMin = t?.age_min ?? 18;
  const ageMax = t?.age_max;
  const ageLabel = ageMax ? `${ageMin}–${ageMax}` : `${ageMin}+`;

  // Custom audiences
  const inclAudiences = (t?.custom_audiences ?? []).map((a) => a.name);
  const exclAudiences = (t?.excluded_custom_audiences ?? []).map((a) => a.name);

  // Interests & behaviors from flexible_spec
  const interests = (t?.flexible_spec ?? []).flatMap((s) => (s.interests ?? []).map((i) => i.name));
  const behaviors = (t?.flexible_spec ?? []).flatMap((s) => (s.behaviors ?? []).map((b) => b.name));

  const objInfo = OBJECTIVE_LABELS[data?.campaign?.objective ?? ""] ?? null;
  const effStatus = data?.effective_status ?? data?.status;

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto h-full w-full max-w-[480px] bg-[var(--card)] border-l border-[var(--border)] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-start gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Target className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Conjunto de Anúncios</p>
            <h2 className="text-[14px] font-bold text-[var(--foreground)] leading-snug mt-0.5 line-clamp-2">
              {adsetName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--muted-foreground)]">
              <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Buscando dados na Meta API…</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <Info className="w-8 h-8 text-red-400 opacity-50" />
              <p className="text-sm font-medium text-[var(--foreground)]">Erro ao carregar detalhes</p>
              <p className="text-[12px] text-[var(--muted-foreground)] max-w-[280px]">{error}</p>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Campanha */}
              <Section icon={TrendingUp} title="Campanha">
                <Row label="Nome" value={data.campaign?.name ?? "—"} accent />
                {objInfo && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--muted-foreground)]">Objetivo</span>
                    <Pill text={objInfo.label} color={objInfo.color} />
                  </div>
                )}
                {data.campaign?.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--muted-foreground)]">Status</span>
                    <Pill
                      text={STATUS_LABELS[data.campaign.status] ?? data.campaign.status}
                      color={STATUS_STYLE[data.campaign.status] ?? "bg-white/[0.08] text-white/60"}
                    />
                  </div>
                )}
              </Section>

              {/* Conjunto */}
              <Section icon={Target} title="Conjunto">
                {effStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--muted-foreground)]">Status</span>
                    <Pill
                      text={STATUS_LABELS[effStatus] ?? effStatus}
                      color={STATUS_STYLE[effStatus] ?? "bg-white/[0.08] text-white/60"}
                    />
                  </div>
                )}
                {data.optimization_goal && (
                  <Row
                    label="Meta de otimização"
                    value={label(OPT_GOAL_LABELS, data.optimization_goal)}
                    accent
                  />
                )}
                {data.billing_event && (
                  <Row
                    label="Cobrança"
                    value={label(BILLING_EVENT_LABELS, data.billing_event)}
                  />
                )}
                {data.promoted_object?.pixel_id && (
                  <Row label="Pixel" value={`ID: ${data.promoted_object.pixel_id}`} />
                )}
              </Section>

              {/* Orçamento */}
              <Section icon={DollarSign} title="Orçamento e Lance">
                {data.daily_budget && (
                  <Row label="Orçamento diário" value={fmtBrl(data.daily_budget)} accent />
                )}
                {data.lifetime_budget && (
                  <Row label="Orçamento total" value={fmtBrl(data.lifetime_budget)} accent />
                )}
                {data.bid_strategy && (
                  <Row
                    label="Estratégia de lance"
                    value={label(BID_STRATEGY_LABELS, data.bid_strategy)}
                  />
                )}
                {data.bid_amount && Number(data.bid_amount) > 0 && (
                  <Row label="Valor do lance" value={fmtBrl(data.bid_amount)} />
                )}
                {!data.daily_budget && !data.lifetime_budget && (
                  <p className="text-[12px] text-white/30 italic">Orçamento definido na campanha</p>
                )}
              </Section>

              {/* Período */}
              <Section icon={Calendar} title="Período">
                <Row label="Início" value={fmtDate(data.start_time)} accent />
                <Row
                  label="Término"
                  value={data.end_time ? fmtDate(data.end_time) : <span className="text-white/30 italic">Sem data de encerramento</span>}
                />
              </Section>

              {/* Público */}
              <Section icon={Users} title="Público">

                {/* Advantage+ indicator */}
                {isAdvantage ? (
                  <div className="flex items-center gap-2 rounded-xl bg-[var(--primary)]/8 border border-[var(--primary)]/20 px-3 py-2">
                    <Zap className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0" />
                    <div>
                      <p className="text-[12px] font-semibold text-[var(--primary)]">Advantage+ Audience ativado</p>
                      <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                        A Meta expande automaticamente o público para encontrar mais resultados.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                    <Settings2 className="w-3.5 h-3.5 text-[var(--muted-foreground)] flex-shrink-0" />
                    <p className="text-[12px] text-[var(--muted-foreground)]">Segmentação manual (controles definidos)</p>
                  </div>
                )}

                {/* Faixa etária + Gênero */}
                <Row label="Faixa etária" value={ageLabel} accent />
                <Row label="Gênero" value={genderLabel} />
              </Section>

              {/* Localizações */}
              {(countries.length > 0 || regions.length > 0 || cities.length > 0) && (
                <Section icon={MapPin} title="Localizações">
                  {countries.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Países</p>
                      <ChipList items={countries} />
                    </div>
                  )}
                  {regions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Estados</p>
                      <ChipList items={regions} />
                    </div>
                  )}
                  {cities.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Cidades</p>
                      <ChipList items={cities} />
                    </div>
                  )}
                  {locationTypes.length > 0 && (
                    <Row
                      label="Tipo de presença"
                      value={locationTypes
                        .map((t) => ({ home: "Moradores", recent: "Visitantes recentes", travel_in: "Viajando para" }[t] ?? t))
                        .join(", ")}
                    />
                  )}
                </Section>
              )}

              {/* Públicos personalizados */}
              {(inclAudiences.length > 0 || exclAudiences.length > 0) && (
                <Section icon={Users} title="Públicos Personalizados">
                  {inclAudiences.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/70 mb-1.5">Incluir</p>
                      <ChipList items={inclAudiences} />
                    </div>
                  )}
                  {exclAudiences.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400/70 mb-1.5">Excluir</p>
                      <ChipList items={exclAudiences} />
                    </div>
                  )}
                </Section>
              )}

              {/* Interesses e comportamentos */}
              {(interests.length > 0 || behaviors.length > 0) && (
                <Section icon={Target} title="Interesses e Comportamentos">
                  {interests.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Interesses</p>
                      <ChipList items={interests} />
                    </div>
                  )}
                  {behaviors.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1.5">Comportamentos</p>
                      <ChipList items={behaviors} />
                    </div>
                  )}
                </Section>
              )}

              {/* ID */}
              <p className="text-center text-[10px] text-white/20 pb-2">ID do conjunto: {data.id}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
