"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentoManagerModal, fetchSegmentos, type Segmento } from "./SegmentoManagerModal";
import { LogoUploadField } from "./LogoUploadField";

interface ContaAdmin {
  id: string;
  plataforma: string;
  accountIdPlataforma: string | null;
  googleAdsLoginCustomerId?: string | null;
  nomeConta: string | null;
}

interface ClienteAdmin {
  id: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
  segmento: string | null;
  ativo: boolean;
  orcamentoMidiaGoogleMensal?: number | null;
  orcamentoMidiaMetaMensal?: number | null;
  portalToken?: string | null;
  leadScoringEnabled?: boolean;
  perfilPanel?: string | null;
  contas: ContaAdmin[];
}

interface ClientePayload {
  nome: string;
  slug?: string;
  logoUrl?: string;
  segmento?: string;
  ativo?: boolean;
  syncAfterCreate?: boolean;
  syncNow?: boolean;
  orcamentoMidiaGoogleMensal?: number | null;
  orcamentoMidiaMetaMensal?: number | null;
  googleAdsAccountId?: string | null;
  googleAdsLoginCustomerId?: string | null;
  metaAdsAccountId?: string | null;
  ga4PropertyId?: string | null;
  leadScoringEnabled?: boolean;
  perfilPanel?: string | null;
}

function getHeaders(token?: string, includeJson = false): HeadersInit {
  const headers: HeadersInit = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  if (token) headers["x-admin-token"] = token;
  return headers;
}

async function fetchAdminClientes(token?: string): Promise<ClienteAdmin[]> {
  const res = await fetch("/api/admin/clientes", { headers: getHeaders(token) });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Falha ao carregar clientes");
  return res.json();
}

async function createCliente(body: ClientePayload, token?: string) {
  const res = await fetch("/api/admin/clientes", {
    method: "POST",
    headers: getHeaders(token, true),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function updateCliente(id: string, body: ClientePayload, token?: string) {
  const res = await fetch(`/api/admin/clientes/${id}`, {
    method: "PATCH",
    headers: getHeaders(token, true),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function syncCliente(clienteId: string) {
  const res = await fetch(`/api/clientes/${clienteId}/sync`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function syncLeadsCliente(clienteId: string, token?: string) {
  const res = await fetch("/api/admin/sync-leads", {
    method: "POST",
    headers: { ...getHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ clienteId }),
  });
  const data = await res.json().catch(() => ({})) as { ok: boolean; error?: string; results?: Array<{ clienteId: string; leadsCreated: number; leadsFailed: number; formsProcessed: number; error?: string }> };
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const errMsg = data.results?.[0]?.error ?? data.error ?? res.statusText;
    throw new Error(errMsg);
  }
  return data;
}

async function syncAll(token?: string) {
  const res = await fetch("/api/admin/sync-all", {
    method: "POST",
    headers: getHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data as {
    ok: boolean;
    metaResults?: { clienteId: string; daysProcessed: number; error?: string }[];
    googleAdsResults?: { clienteId: string; daysProcessed: number; error?: string }[];
  };
}


function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
        {required && <span className="ml-1 text-[var(--primary)]">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none";

function getConta(cliente: ClienteAdmin, plataforma: "GOOGLE_ADS" | "META" | "GOOGLE_ANALYTICS") {
  return cliente.contas.find((conta) => conta.plataforma === plataforma);
}

function SegmentoCombobox({
  value,
  onChange,
  segmentos,
  onOpenManager,
}: {
  value: string;
  onChange: (v: string) => void;
  segmentos: Segmento[];
  onOpenManager: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputVal(value); }, [value]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = segmentos.filter((s) =>
    s.nome.toLowerCase().includes(inputVal.toLowerCase())
  );

  const selectedSegmento = segmentos.find((s) => s.nome === value);

  function select(nome: string) {
    onChange(nome);
    setInputVal(nome);
    setOpen(false);
  }

  function handleInput(v: string) {
    setInputVal(v);
    onChange(v);
    setOpen(true);
  }

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <div className="relative flex-1">
        {selectedSegmento && !open && (
          <span
            className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-sm"
            style={{ backgroundColor: selectedSegmento.cor }}
          />
        )}
        <input
          value={inputVal}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Selecionar ou digitar segmento..."
          className={`${inputClass} ${selectedSegmento && !open ? "pl-8" : ""} pr-8`}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={onOpenManager}
        title="Gerenciar segmentos"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]"
      >
        <Plus className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-[calc(100%-2.75rem)] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
              {inputVal ? `Pressione + para criar "${inputVal}"` : "Nenhum segmento cadastrado"}
            </div>
          )}
          {value && (
            <button
              type="button"
              onMouseDown={() => select("")}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]"
            >
              <X className="h-3 w-3" /> Limpar seleção
            </button>
          )}
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => select(s.nome)}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition hover:bg-[var(--muted)] ${
                value === s.nome ? "bg-[var(--primary)]/5 font-semibold" : ""
              }`}
            >
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.cor }} />
              {s.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ClienteForm({
  title,
  submitLabel,
  initialValues,
  segmentos,
  adminToken,
  pending,
  error,
  success,
  onClose,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initialValues: ClientePayload;
  segmentos: Segmento[];
  adminToken: string;
  pending: boolean;
  error: string;
  success: string;
  onClose: () => void;
  onSubmit: (body: ClientePayload) => void;
}) {
  const [nome, setNome] = useState(initialValues.nome ?? "");
  const [logoUrl, setLogoUrl] = useState(initialValues.logoUrl ?? "");
  const [segmento, setSegmento] = useState(initialValues.segmento ?? "");
  const [ativo, setAtivo] = useState(initialValues.ativo ?? true);
  const [googleAdsAccountId, setGoogleAdsAccountId] = useState(initialValues.googleAdsAccountId ?? "");
  const [googleAdsLoginCustomerId, setGoogleAdsLoginCustomerId] = useState(
    initialValues.googleAdsLoginCustomerId ?? ""
  );
  const [metaAdsAccountId, setMetaAdsAccountId] = useState(initialValues.metaAdsAccountId ?? "");
  const [ga4PropertyId, setGa4PropertyId] = useState(initialValues.ga4PropertyId ?? "");
  const [orcamentoGoogle, setOrcamentoGoogle] = useState(
    initialValues.orcamentoMidiaGoogleMensal != null ? String(initialValues.orcamentoMidiaGoogleMensal) : ""
  );
  const [orcamentoMeta, setOrcamentoMeta] = useState(
    initialValues.orcamentoMidiaMetaMensal != null ? String(initialValues.orcamentoMidiaMetaMensal) : ""
  );
  const [syncAfterSave, setSyncAfterSave] = useState(
    initialValues.syncAfterCreate ?? initialValues.syncNow ?? true
  );
  const [leadScoringEnabled, setLeadScoringEnabled] = useState(
    initialValues.leadScoringEnabled ?? false
  );
  const [perfilPanel, setPerfilPanel] = useState(initialValues.perfilPanel ?? "");
  const [showSegmentoManager, setShowSegmentoManager] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <Card className="w-full max-w-2xl overflow-hidden rounded-2xl border-[var(--border)]">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--border)] bg-gradient-to-b from-[var(--primary)]/[0.03] to-transparent pb-5">
            <div>
              <CardTitle>{title}</CardTitle>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Configure os IDs de conta que alimentam o dashboard.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="max-h-[75vh] space-y-5 overflow-y-auto pt-5">
            <FormField label="Nome" required>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="ID conta Google Ads" hint="Pode colar com ou sem hífens.">
                <input
                  value={googleAdsAccountId}
                  onChange={(e) => setGoogleAdsAccountId(e.target.value)}
                  placeholder="299-043-1301"
                  className={inputClass}
                />
              </FormField>
              <FormField label="MCC Google (login-customer-id)" hint="Ex.: 3830547260 ou 4896650578">
                <input
                  value={googleAdsLoginCustomerId}
                  onChange={(e) => setGoogleAdsLoginCustomerId(e.target.value)}
                  placeholder="3830547260"
                  className={inputClass}
                />
              </FormField>
              <FormField label="ID conta Meta Ads" hint="Pode colar com ou sem act_.">
                <input
                  value={metaAdsAccountId}
                  onChange={(e) => setMetaAdsAccountId(e.target.value)}
                  placeholder="320901911416777"
                  className={inputClass}
                />
              </FormField>
              <FormField label="GA4 Property ID" hint="ID numérico da propriedade GA4 (Admin > Propriedade).">
                <input
                  value={ga4PropertyId}
                  onChange={(e) => setGa4PropertyId(e.target.value)}
                  placeholder="456789012"
                  className={inputClass}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Logo do cliente">
                <LogoUploadField
                  value={logoUrl}
                  onChange={setLogoUrl}
                  adminToken={adminToken}
                />
              </FormField>
              <FormField label="Segmento">
                <SegmentoCombobox
                  value={segmento}
                  onChange={setSegmento}
                  segmentos={segmentos}
                  onOpenManager={() => setShowSegmentoManager(true)}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Orçamento mensal Google (R$)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={orcamentoGoogle}
                  onChange={(e) => setOrcamentoGoogle(e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Orçamento mensal Meta (R$)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={orcamentoMeta}
                  onChange={(e) => setOrcamentoMeta(e.target.value)}
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField label="Perfil de painel especial" hint="Define o tipo de dashboard customizado. Imune a mudanças de nome ou slug.">
              <select
                value={perfilPanel}
                onChange={(e) => setPerfilPanel(e.target.value)}
                className={inputClass}
              >
                <option value="">(padrão — detecta por slug/nome)</option>
                <optgroup label="▸ Modelos padrão (novos clientes)">
                  <option value="ecommerce">E-commerce</option>
                  <option value="hotel">Hotel / Resort</option>
                  <option value="restaurante">Restaurante / Bar</option>
                  <option value="clinica">Clínica &amp; Saúde</option>
                  <option value="medico">Médico / Especialista</option>
                  <option value="imoveis">Imobiliária</option>
                  <option value="academia">Escola / Academia</option>
                  <option value="concessionaria">Concessionária / Motos</option>
                  <option value="instagram-visitas">Visitas ao Perfil (Instagram)</option>
                </optgroup>
                <optgroup label="▸ Clientes configurados">
                  <option value="d-or">E-commerce — D&apos;or</option>
                  <option value="granarolo">E-commerce — Granarolo</option>
                  <option value="vito-balducci">E-commerce — Vito Balducci</option>
                  <option value="tertulia">Tertúlia</option>
                  <option value="varella">Varella Motos</option>
                  <option value="florien">Florien FitoAtivos</option>
                  <option value="clinica-e-spa">Clínica e Spa Vida Natural</option>
                  <option value="dr-fernando-guena">Dr. Fernando Guena</option>
                  <option value="miguel-imoveis">Miguel Imóveis</option>
                  <option value="academy-americana">Academy Americana</option>
                </optgroup>
              </select>
            </FormField>

            <div className="flex flex-wrap items-center gap-5 rounded-xl bg-[var(--muted)]/30 px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                />
                <span className="text-sm text-[var(--foreground)]">{ativo ? "Ativo" : "Churn"}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={syncAfterSave}
                  onChange={(e) => setSyncAfterSave(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                />
                <span className="text-sm text-[var(--foreground)]">Sincronizar após salvar</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={leadScoringEnabled}
                  onChange={(e) => setLeadScoringEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                />
                <span className="text-sm text-[var(--foreground)]">Lead Scoring ativado</span>
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--accent)]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {success}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
              <button
                onClick={onClose}
                className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  onSubmit({
                    nome: nome.trim(),
                    logoUrl: logoUrl.trim() || undefined,
                    segmento: segmento.trim() || undefined,
                    ativo,
                    orcamentoMidiaGoogleMensal: orcamentoGoogle ? Number(orcamentoGoogle) : null,
                    orcamentoMidiaMetaMensal: orcamentoMeta ? Number(orcamentoMeta) : null,
                    googleAdsAccountId: googleAdsAccountId.trim() || null,
                    googleAdsLoginCustomerId: googleAdsLoginCustomerId.trim() || null,
                    metaAdsAccountId: metaAdsAccountId.trim() || null,
                    ga4PropertyId: ga4PropertyId.trim() || null,
                    syncAfterCreate: syncAfterSave,
                    syncNow: syncAfterSave,
                    leadScoringEnabled,
                    perfilPanel: perfilPanel || null,
                  })
                }
                disabled={pending}
                className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Salvando..." : submitLabel}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showSegmentoManager && (
        <SegmentoManagerModal
          adminToken={adminToken}
          onClose={() => setShowSegmentoManager(false)}
        />
      )}
    </>
  );
}

export default function AdminClientesPage() {
  const [adminToken, setAdminToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editing, setEditing] = useState<ClienteAdmin | null>(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ativos" | "churn">("ativos");
  const [copiedPortalId, setCopiedPortalId] = useState<string | null>(null);
  const [confirmRegenId, setConfirmRegenId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ["admin", "clientes", adminToken],
    queryFn: () => fetchAdminClientes(adminToken || undefined),
    retry: (_, err) => (err instanceof Error && err.message === "Unauthorized" ? false : true),
  });

  const { data: segmentos = [] } = useQuery({
    queryKey: ["segmentos"],
    queryFn: fetchSegmentos,
  });

  const segmentoMap = useMemo(() => {
    const map: Record<string, Segmento> = {};
    for (const s of segmentos) map[s.nome] = s;
    return map;
  }, [segmentos]);

  const createMutation = useMutation({
    mutationFn: (body: ClientePayload) => createCliente(body, adminToken || undefined),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setFormError("");
      setFormSuccess(data.sync ? "" : "Cliente criado.");
      setShowCreateForm(false);
    },
    onError: (e: Error) => {
      setFormError(e.message);
      setFormSuccess("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; body: ClientePayload }) =>
      updateCliente(payload.id, payload.body, adminToken || undefined),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setEditError("");
      setEditSuccess(data.sync ? "Cliente atualizado e sincronizado." : "Cliente atualizado.");
      setTimeout(() => setEditing(null), 700);
    },
    onError: (e: Error) => setEditError(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: (clienteId: string) => syncCliente(clienteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setFormError("");
      setFormSuccess("Sincronização concluída.");
    },
    onError: (e: Error) => {
      setFormError(e.message);
      setFormSuccess("");
    },
  });

  const syncLeadsMutation = useMutation({
    mutationFn: (clienteId: string) => syncLeadsCliente(clienteId, adminToken || undefined),
    onSuccess: (data) => {
      const r = data.results?.[0];
      const failMsg = r?.leadsFailed ? ` (${r.leadsFailed} falhas)` : "";
      setFormSuccess(`Leads sincronizados: ${r?.leadsCreated ?? 0} novos de ${r?.formsProcessed ?? 0} formulário(s).${failMsg}`);
      setFormError("");
    },
    onError: (e: Error) => {
      setFormError(e.message);
      setFormSuccess("");
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: () => syncAll(adminToken || undefined),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      const metaCount = data.metaResults?.length ?? 0;
      const googleCount = data.googleAdsResults?.length ?? 0;
      setFormError("");
      setFormSuccess(`Atualização concluída. Google Ads: ${googleCount} cliente(s); Meta: ${metaCount} cliente(s).`);
    },
    onError: (e: Error) => {
      setFormError(e.message);
      setFormSuccess("");
    },
  });


  const regenTokenMutation = useMutation({
    mutationFn: async (clienteId: string) => {
      const r = await fetch(`/api/admin/clientes/${clienteId}/regenerate-token`, {
        method: "POST",
        headers: getHeaders(adminToken || undefined),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? `Erro ${r.status} ao gerar novo link`);
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "clientes"] });
      setConfirmRegenId(null);
    },
    onError: (e: Error) => {
      setFormError(e.message);
      setConfirmRegenId(null);
    },
  });

  const unauthorized = error instanceof Error && error.message === "Unauthorized";

  const filteredClientes = useMemo(() => {
    if (!clientes) return [];
    const base =
      filterStatus === "ativos"
        ? clientes.filter((c) => c.ativo)
        : clientes.filter((c) => !c.ativo);
    return [...base].sort((a, b) => {
      if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [clientes, filterStatus]);

  if (!adminToken || unauthorized) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-sm overflow-hidden rounded-2xl border-[var(--border)]">
          <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-[var(--primary)]/5 to-transparent px-6 pt-8 pb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Acesso restrito</h2>
            <p className="text-center text-xs text-[var(--muted-foreground)]">
              Informe a senha para acessar a administração de clientes.
            </p>
          </div>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="password"
                  placeholder="Senha"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setAdminToken(tokenInput)}
                />
              </div>
              <button
                className="w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90"
                onClick={() => setAdminToken(tokenInput)}
              >
                Entrar
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const total = clientes?.length ?? 0;
  const ativos = clientes?.filter((c) => c.ativo).length ?? 0;
  const churn = total - ativos;

  return (
    <main className="space-y-8 pb-12">
      <section className="space-y-5">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Central de clientes
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              Painel administrativo
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Administração de Clientes
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Cada cliente agora aponta para as contas Google Ads e Meta que alimentam o painel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => syncAllMutation.mutate()}
              disabled={syncAllMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] transition-all hover:border-[var(--primary)]/30 hover:text-[var(--primary)] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
              {syncAllMutation.isPending ? "Atualizando..." : "Atualizar todos"}
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/20 transition-all hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo cliente
            </button>
          </div>
        </div>
      </section>

      {clientes && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Total", value: total },
            { label: "Ativos", value: ativos },
            { label: "Churn", value: churn },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {item.label}
              </p>
              <p className="text-lg font-bold tabular-nums text-[var(--foreground)]">{item.value}</p>
            </div>
          ))}
        </section>
      )}

      {formError && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-5 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <span className="text-[var(--accent)]">{formError}</span>
        </div>
      )}
      {formSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/5 px-5 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
          <span className="text-[var(--success)]">{formSuccess}</span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="h-px flex-1 min-w-[60px] bg-[var(--border)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Clientes cadastrados ({filteredClientes.length})
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-0.5">
          {(["ativos", "churn"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                filterStatus === f
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {f === "ativos" ? "Ativos" : "Churn"}
            </button>
          ))}
        </div>
        <div className="h-px flex-1 min-w-[60px] bg-[var(--border)]" />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
          ))}
        </div>
      )}

      {clientes && (
        <ul className="space-y-3">
          {filteredClientes.map((cliente) => {
            const googleConta = getConta(cliente, "GOOGLE_ADS");
            const metaConta = getConta(cliente, "META");
            const analyticsConta = getConta(cliente, "GOOGLE_ANALYTICS");
            const initials = cliente.nome
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase();
            const seg = cliente.segmento ? segmentoMap[cliente.segmento] : null;
            const segCor = seg?.cor ?? "#6b7280";

            return (
              <li
                key={cliente.id}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition-all hover:border-[color-mix(in_srgb,var(--primary)_15%,var(--border))] hover:bg-[var(--card-hover)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    {cliente.logoUrl ? (
                      <Image
                        src={cliente.logoUrl}
                        alt={cliente.nome}
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded-xl object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--muted)] to-[var(--border)] text-sm font-bold text-[var(--muted-foreground)]">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 space-y-1.5">
                      <div>
                        <p className="text-sm font-bold text-[var(--foreground)]">{cliente.nome}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          {cliente.slug} · {cliente.ativo ? "Ativo" : "Churn"}
                        </p>
                      </div>

                      {cliente.segmento && (
                        <div>
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                            style={{ backgroundColor: segCor }}
                          >
                            {cliente.segmento}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        {googleConta ? (
                          <>
                            <span className="inline-flex items-center rounded-full bg-[var(--success)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--success)]">
                              Google: {googleConta.accountIdPlataforma}
                            </span>
                            {googleConta.googleAdsLoginCustomerId ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                MCC: {googleConta.googleAdsLoginCustomerId}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                            Sem Google
                          </span>
                        )}
                        {metaConta ? (
                          <span className="inline-flex items-center rounded-full bg-[var(--primary)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">
                            Meta: {metaConta.accountIdPlataforma}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                            Sem Meta
                          </span>
                        )}
                        {analyticsConta ? (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            GA4: {analyticsConta.accountIdPlataforma}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => syncMutation.mutate(cliente.id)}
                      disabled={!cliente.ativo || (syncMutation.isPending && syncMutation.variables === cliente.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-all hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending && syncMutation.variables === cliente.id ? "animate-spin" : ""}`} />
                      Sync
                    </button>
                    {metaConta && (
                      <button
                        onClick={() => syncLeadsMutation.mutate(cliente.id)}
                        disabled={!cliente.ativo || (syncLeadsMutation.isPending && syncLeadsMutation.variables === cliente.id)}
                        title="Sincronizar leads individuais do Meta Lead Gen"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-all hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${syncLeadsMutation.isPending && syncLeadsMutation.variables === cliente.id ? "animate-spin" : ""}`} />
                        Leads
                      </button>
                    )}
                    {confirmRegenId !== cliente.id && (
                      <button
                        onClick={() => {
                          const origin = window.location.origin;
                          navigator.clipboard.writeText(`${origin}/portal/${cliente.portalToken}`);
                          setCopiedPortalId(cliente.id);
                          setTimeout(() => setCopiedPortalId(null), 2000);
                        }}
                        title="Copiar link exclusivo do portal do cliente"
                        disabled={!cliente.portalToken}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-all hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {copiedPortalId === cliente.id ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Link do Portal
                          </>
                        )}
                      </button>
                    )}
                    {confirmRegenId === cliente.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-amber-400">Substituir link?</span>
                        <button
                          onClick={() => regenTokenMutation.mutate(cliente.id)}
                          disabled={regenTokenMutation.isPending}
                          className="rounded-lg bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          {regenTokenMutation.isPending ? "..." : "Confirmar"}
                        </button>
                        <button
                          onClick={() => setConfirmRegenId(null)}
                          className="rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRegenId(cliente.id)}
                        title="Gerar novo link (o link atual deixará de funcionar)"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-all hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Novo link
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditing(cliente);
                        setEditError("");
                        setEditSuccess("");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-all hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-all hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showCreateForm && (
        <ClienteForm
          title="Novo cliente"
          submitLabel="Criar cliente"
          initialValues={{ nome: "", ativo: true, syncAfterCreate: true }}
          segmentos={segmentos}
          adminToken={adminToken}
          pending={createMutation.isPending}
          error={formError}
          success=""
          onClose={() => setShowCreateForm(false)}
          onSubmit={(body) => {
            if (!body.nome?.trim()) {
              setFormError("Nome é obrigatório.");
              return;
            }
            setFormError("");
            createMutation.mutate(body);
          }}
        />
      )}

      {editing && (
        <ClienteForm
          title={`Editar cliente · ${editing.nome}`}
          submitLabel="Salvar alterações"
          initialValues={{
            nome: editing.nome,
            logoUrl: editing.logoUrl ?? undefined,
            segmento: editing.segmento ?? undefined,
            ativo: editing.ativo,
            syncNow: true,
            googleAdsAccountId: getConta(editing, "GOOGLE_ADS")?.accountIdPlataforma ?? null,
            googleAdsLoginCustomerId:
              getConta(editing, "GOOGLE_ADS")?.googleAdsLoginCustomerId ?? null,
            metaAdsAccountId: getConta(editing, "META")?.accountIdPlataforma ?? null,
            ga4PropertyId: getConta(editing, "GOOGLE_ANALYTICS")?.accountIdPlataforma ?? null,
            orcamentoMidiaGoogleMensal: editing.orcamentoMidiaGoogleMensal ?? null,
            orcamentoMidiaMetaMensal: editing.orcamentoMidiaMetaMensal ?? null,
            leadScoringEnabled: editing.leadScoringEnabled ?? false,
            perfilPanel: editing.perfilPanel ?? null,
          }}
          segmentos={segmentos}
          adminToken={adminToken}
          pending={updateMutation.isPending}
          error={editError}
          success={editSuccess}
          onClose={() => setEditing(null)}
          onSubmit={(body) => {
            if (!body.nome?.trim()) {
              setEditError("Nome é obrigatório.");
              return;
            }
            setEditError("");
            updateMutation.mutate({ id: editing.id, body });
          }}
        />
      )}
    </main>
  );
}
