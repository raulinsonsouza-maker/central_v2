"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, CheckCircle2, AlertCircle, Wifi, Globe, X } from "lucide-react";

interface Conexao {
  id: string;
  nome: string;
  plataforma: "META" | "GOOGLE_ADS";
  ativo: boolean;
  contasCount: number;
  hasMetaAccessToken: boolean;
  hasGoogleClientId: boolean;
  hasGoogleRefreshToken: boolean;
  googleLoginCustomerId: string | null;
  createdAt: string;
}

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40";

function getHeaders(token: string, json = false): HeadersInit {
  const h: HeadersInit = {};
  if (token) h["x-admin-token"] = token;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export default function ConexoesPage() {
  const [adminToken, setAdminToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const qc = useQueryClient();

  const { data: conexoes = [], isLoading, error } = useQuery<Conexao[]>({
    queryKey: ["admin-conexoes", adminToken],
    queryFn: async () => {
      const r = await fetch("/api/admin/conexoes", { headers: getHeaders(adminToken) });
      if (r.status === 401) throw new Error("Unauthorized");
      if (!r.ok) throw new Error("Falha ao carregar conexões");
      return r.json();
    },
    retry: (_, err) => !(err instanceof Error && err.message === "Unauthorized"),
  });

  const [modal, setModal] = useState<"new" | { id: string } | null>(null);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/conexoes/${id}`, {
        method: "DELETE",
        headers: getHeaders(adminToken),
      });
      if (!r.ok) throw new Error("Falha ao remover");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-conexoes"] }),
  });

  const isUnauthorized = error instanceof Error && error.message === "Unauthorized";

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Administração</p>
            <h1 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">Conexões de Integração</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Tokens e credenciais por BM (Meta) ou MCC (Google Ads). Clientes sem conexão vinculada usam as credenciais globais.
            </p>
          </div>
        </div>
        <button
          onClick={() => setModal("new")}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Nova conexão
        </button>
      </div>

      {(isUnauthorized || !adminToken) && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
          <p className="text-sm font-medium text-[var(--foreground)]">Token de administrador</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setAdminToken(tokenInput); }}
              placeholder="••••••••"
              className={inputClass}
            />
            <button
              onClick={() => setAdminToken(tokenInput)}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Entrar
            </button>
          </div>
          {isUnauthorized && <p className="text-sm text-red-500">Token inválido.</p>}
        </div>
      )}

      {adminToken && !isUnauthorized && (
        isLoading ? (
          <div className="text-sm text-[var(--muted-foreground)]">Carregando…</div>
        ) : conexoes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center">
            <Wifi className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/50" />
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Nenhuma conexão cadastrada</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]/70">
              Todos os clientes usam as credenciais globais (Administração → Integrações).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conexoes.map((c) => (
              <div
                key={c.id}
                className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-[color-mix(in_srgb,var(--primary)_25%,var(--border))]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)]/40">
                  <Globe className="h-5 w-5 text-[var(--muted-foreground)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--foreground)]">{c.nome}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        c.plataforma === "META"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-green-500/10 text-green-600"
                      }`}
                    >
                      {c.plataforma === "META" ? "Meta" : "Google Ads"}
                    </span>
                    {!c.ativo && (
                      <span className="rounded-full bg-[var(--muted)]/50 px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                        Inativa
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--muted-foreground)]">
                    {c.plataforma === "META" ? (
                      <span className="flex items-center gap-1">
                        {c.hasMetaAccessToken ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                        )}
                        Token Meta {c.hasMetaAccessToken ? "configurado" : "ausente"}
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center gap-1">
                          {c.hasGoogleRefreshToken ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                          )}
                          OAuth {c.hasGoogleRefreshToken ? "configurado" : "ausente"}
                        </span>
                        {c.googleLoginCustomerId && (
                          <span>MCC: {c.googleLoginCustomerId}</span>
                        )}
                      </>
                    )}
                    <span className="text-[var(--muted-foreground)]/50">·</span>
                    <span>{c.contasCount} conta{c.contasCount !== 1 ? "s" : ""} vinculada{c.contasCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setModal({ id: c.id })}
                    className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (c.contasCount > 0) {
                        alert(`Esta conexão está vinculada a ${c.contasCount} conta(s). Desvincule-as primeiro em cada cliente.`);
                        return;
                      }
                      if (confirm(`Remover conexão "${c.nome}"?`)) deleteMut.mutate(c.id);
                    }}
                    className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {modal !== null && (
        <ConexaoModal
          mode={modal === "new" ? "new" : "edit"}
          id={modal === "new" ? undefined : (modal as { id: string }).id}
          token={adminToken}
          onClose={() => setModal(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-conexoes"] });
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function ConexaoModal({
  mode,
  id,
  token,
  onClose,
  onSaved,
}: {
  mode: "new" | "edit";
  id?: string;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: existing } = useQuery({
    queryKey: ["admin-conexao-detail", id],
    enabled: mode === "edit" && !!id,
    queryFn: async () => {
      const r = await fetch(`/api/admin/conexoes/${id}`, {
        headers: { "x-admin-token": token },
      });
      if (!r.ok) throw new Error("Falha ao carregar");
      return r.json() as Promise<{
        id: string;
        nome: string;
        plataforma: "META" | "GOOGLE_ADS";
        ativo: boolean;
        hasMetaAccessToken: boolean;
        hasGoogleClientId: boolean;
        hasGoogleClientSecret: boolean;
        hasGoogleDeveloperToken: boolean;
        hasGoogleRefreshToken: boolean;
        googleLoginCustomerId: string | null;
      }>;
    },
  });

  const [nome, setNome] = useState("");
  const [plataforma, setPlataforma] = useState<"META" | "GOOGLE_ADS">("META");
  const [ativo, setAtivo] = useState(true);
  const [metaToken, setMetaToken] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [googleDeveloperToken, setGoogleDeveloperToken] = useState("");
  const [googleRefreshToken, setGoogleRefreshToken] = useState("");
  const [googleLoginCustomerId, setGoogleLoginCustomerId] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existing && !initialized) {
    setNome(existing.nome);
    setPlataforma(existing.plataforma);
    setAtivo(existing.ativo);
    if (existing.plataforma === "META") {
      setMetaToken(existing.hasMetaAccessToken ? "••••••••••••••••" : "");
    } else {
      setGoogleClientId(existing.hasGoogleClientId ? "••••••••••••••••" : "");
      setGoogleClientSecret(existing.hasGoogleClientSecret ? "••••••••••••••••" : "");
      setGoogleDeveloperToken(existing.hasGoogleDeveloperToken ? "••••••••••••••••" : "");
      setGoogleRefreshToken(existing.hasGoogleRefreshToken ? "••••••••••••••••" : "");
      setGoogleLoginCustomerId(existing.googleLoginCustomerId ?? "");
    }
    setInitialized(true);
  }

  const effectivePlataforma = mode === "edit" ? (existing?.plataforma ?? plataforma) : plataforma;

  async function handleSave() {
    if (!nome.trim()) { setError("Nome obrigatório"); return; }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { nome, ativo };
      if (mode === "new") body.plataforma = plataforma;
      if (effectivePlataforma === "META") {
        if (metaToken && !metaToken.startsWith("•")) body.metaAccessToken = metaToken;
      } else {
        if (googleClientId && !googleClientId.startsWith("•")) body.googleClientId = googleClientId;
        if (googleClientSecret && !googleClientSecret.startsWith("•")) body.googleClientSecret = googleClientSecret;
        if (googleDeveloperToken && !googleDeveloperToken.startsWith("•")) body.googleDeveloperToken = googleDeveloperToken;
        if (googleRefreshToken && !googleRefreshToken.startsWith("•")) body.googleRefreshToken = googleRefreshToken;
        body.googleLoginCustomerId = googleLoginCustomerId;
      }

      const url = mode === "new" ? "/api/admin/conexoes" : `/api/admin/conexoes/${id}`;
      const method = mode === "new" ? "POST" : "PATCH";
      const r = await fetch(url, {
        method,
        headers: { "x-admin-token": token, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Erro ao salvar"); }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-bold text-[var(--foreground)]">
            {mode === "new" ? "Nova conexão" : `Editar: ${existing?.nome ?? "…"}`}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Nome da conexão</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder='Ex.: "Inout Principal", "Bruno Reis BM"'
              className={inputClass}
            />
          </div>

          {mode === "new" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">Plataforma</label>
              <div className="flex gap-2">
                {(["META", "GOOGLE_ADS"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlataforma(p)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      plataforma === p
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40"
                    }`}
                  >
                    {p === "META" ? "Meta Ads" : "Google Ads"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {effectivePlataforma === "META" ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                Meta Access Token{" "}
                <span className="font-normal text-[var(--muted-foreground)]/70">(do Business Manager)</span>
              </label>
              <input
                type="password"
                value={metaToken}
                onChange={(e) => setMetaToken(e.target.value)}
                placeholder="••••••••••••••••"
                className={inputClass}
              />
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Credenciais OAuth Google Ads
              </p>
              {[
                { label: "Client ID", val: googleClientId, set: setGoogleClientId },
                { label: "Client Secret", val: googleClientSecret, set: setGoogleClientSecret },
                { label: "Developer Token", val: googleDeveloperToken, set: setGoogleDeveloperToken },
                { label: "Refresh Token", val: googleRefreshToken, set: setGoogleRefreshToken },
              ].map(({ label, val, set }) => (
                <div key={label} className="space-y-1">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">{label}</label>
                  <input
                    type="password"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder="••••••••••••••••"
                    className={inputClass}
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-foreground)]">
                  Login Customer ID (MCC){" "}
                  <span className="font-normal text-[var(--muted-foreground)]/70">opcional</span>
                </label>
                <input
                  type="text"
                  value={googleLoginCustomerId}
                  onChange={(e) => setGoogleLoginCustomerId(e.target.value)}
                  placeholder="Ex.: 123-456-7890"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              id="con-ativo"
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            <label htmlFor="con-ativo" className="text-sm text-[var(--foreground)]">Conexão ativa</label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
