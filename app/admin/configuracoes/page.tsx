"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bell, CheckCircle2, FileSpreadsheet, KeyRound, RefreshCw, Shield, Upload } from "lucide-react";

function getHeaders(token?: string, includeJson = false): HeadersInit {
  const headers: HeadersInit = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  if (token) headers["x-admin-token"] = token;
  return headers;
}

async function fetchIntegrationsConfig(token?: string) {
  const res = await fetch("/api/admin/config/integracoes", {
    headers: getHeaders(token),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Falha ao carregar configurações");
  return res.json() as Promise<{
    metaAdAccountId: string;
    hasMetaAccessToken: boolean;
    hasGoogleDeveloperToken: boolean;
    hasGoogleRefreshToken: boolean;
    hasGoogleClientId: boolean;
    hasGoogleClientSecret: boolean;
    googleLoginCustomerId: string;
    alertNotificationEmail: string;
    alertWebhookUrl: string;
    alertSmtpHost: string;
    alertSmtpPort: string;
    alertSmtpUser: string;
    hasAlertSmtpPass: boolean;
    alertSmtpFrom: string;
    alertBalanceThresholdDays: string;
    alertSpendGapDays: string;
  }>;
}

async function updateIntegrationsConfigApi(
  body: {
    metaAccessToken?: string;
    metaAdAccountId?: string;
    googleDeveloperToken?: string;
    googleRefreshToken?: string;
    googleClientId?: string;
    googleClientSecret?: string;
    googleLoginCustomerId?: string;
    alertNotificationEmail?: string;
    alertWebhookUrl?: string;
    alertSmtpHost?: string;
    alertSmtpPort?: string;
    alertSmtpUser?: string;
    alertSmtpPass?: string;
    alertSmtpFrom?: string;
    alertBalanceThresholdDays?: string;
    alertSpendGapDays?: string;
  },
  token?: string
) {
  const res = await fetch("/api/admin/config/integracoes", {
    method: "PATCH",
    headers: getHeaders(token, true),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return data as {
    metaAdAccountId: string;
    hasMetaAccessToken: boolean;
    hasGoogleDeveloperToken: boolean;
    hasGoogleRefreshToken: boolean;
    hasGoogleClientId: boolean;
    hasGoogleClientSecret: boolean;
    googleLoginCustomerId: string;
    alertNotificationEmail: string;
    alertWebhookUrl: string;
    alertSmtpHost: string;
    alertSmtpPort: string;
    alertSmtpUser: string;
    hasAlertSmtpPass: boolean;
    alertSmtpFrom: string;
    alertBalanceThresholdDays: string;
    alertSpendGapDays: string;
  };
}

type ImportResult = {
  ok: boolean;
  source: "upload" | "sheets";
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors?: string[];
  colunasDetectadas?: string[];
};

export default function AdminIntegrationsConfigPage() {
  const queryClient = useQueryClient();
  const [adminToken, setAdminToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaAdAccountId, setMetaAdAccountId] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [googleDeveloperToken, setGoogleDeveloperToken] = useState("");
  const [googleRefreshToken, setGoogleRefreshToken] = useState("");
  const [googleLoginCustomerId, setGoogleLoginCustomerId] = useState("");
  const [alertNotificationEmail, setAlertNotificationEmail] = useState("");
  const [alertWebhookUrl, setAlertWebhookUrl] = useState("");
  const [alertSmtpHost, setAlertSmtpHost] = useState("");
  const [alertSmtpPort, setAlertSmtpPort] = useState("");
  const [alertSmtpUser, setAlertSmtpUser] = useState("");
  const [alertSmtpPass, setAlertSmtpPass] = useState("");
  const [alertSmtpFrom, setAlertSmtpFrom] = useState("");
  const [alertBalanceThresholdDays, setAlertBalanceThresholdDays] = useState("");
  const [alertSpendGapDays, setAlertSpendGapDays] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [testAlertLoading, setTestAlertLoading] = useState(false);
  const [testAlertResult, setTestAlertResult] = useState<{ ok: boolean; message: string } | null>(null);

  // CSV Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState("");

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "config", "integracoes", adminToken],
    queryFn: () => fetchIntegrationsConfig(adminToken || undefined),
    enabled: !!adminToken,
  });

  const mutation = useMutation({
    mutationFn: (body: {
      metaAccessToken?: string;
      metaAdAccountId?: string;
      googleDeveloperToken?: string;
      googleRefreshToken?: string;
      googleClientId?: string;
      googleClientSecret?: string;
      googleLoginCustomerId?: string;
      alertNotificationEmail?: string;
      alertWebhookUrl?: string;
      alertSmtpHost?: string;
      alertSmtpPort?: string;
      alertSmtpUser?: string;
      alertSmtpPass?: string;
      alertSmtpFrom?: string;
      alertBalanceThresholdDays?: string;
      alertSpendGapDays?: string;
    }) => updateIntegrationsConfigApi(body, adminToken || undefined),
    onSuccess: () => {
      setFormError("");
      setFormSuccess("Configurações atualizadas com sucesso.");
      setMetaAccessToken("");
      setGoogleClientId("");
      setGoogleClientSecret("");
      setGoogleDeveloperToken("");
      setGoogleRefreshToken("");
      setGoogleLoginCustomerId("");
      setAlertSmtpPass("");
      setAlertBalanceThresholdDays("");
      setAlertSpendGapDays("");
      queryClient.invalidateQueries({ queryKey: ["admin", "config", "integracoes"] });
    },
    onError: (e: Error) => {
      setFormError(e.message);
      setFormSuccess("");
    },
  });

  const unauthorized = error instanceof Error && error.message === "Unauthorized";

  async function handleTestAlert() {
    setTestAlertLoading(true);
    setTestAlertResult(null);
    try {
      const res = await fetch("/api/gestao/alertas", {
        headers: getHeaders(adminToken || undefined),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      const msg = `${json.saldosBaixosCount} saldo(s) baixo(s), ${json.anomaliasCount} anomalia(s). Email: ${json.emailEnviado ? "enviado" : "não enviado"}. Webhook: ${json.webhookEnviado ? "enviado" : "não enviado"}.${json.erros?.length ? " Erros: " + json.erros.join("; ") : ""}`;
      setTestAlertResult({ ok: true, message: msg });
    } catch (e) {
      setTestAlertResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setTestAlertLoading(false);
    }
  }

  async function handleImportFile() {
    if (!selectedFile) return;
    setImportLoading(true);
    setImportError("");
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      const res = await fetch("/api/admin/import-leads-csv", {
        method: "POST",
        headers: { "x-admin-token": adminToken },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setImportResult(json as ImportResult);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setImportLoading(false);
    }
  }

  async function handleSyncSheets() {
    setImportLoading(true);
    setImportError("");
    setImportResult(null);
    try {
      const body: Record<string, string> = {};
      if (sheetsUrl.trim()) body.sheetsUrl = sheetsUrl.trim();
      const res = await fetch("/api/admin/import-leads-csv", {
        method: "POST",
        headers: { "x-admin-token": adminToken, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setImportResult(json as ImportResult);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setImportLoading(false);
    }
  }

  if (!adminToken || unauthorized) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-sm overflow-hidden rounded-2xl border-[var(--border)]">
          <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-[var(--primary)]/5 to-transparent px-6 pt-8 pb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Configurações protegidas</h2>
            <p className="text-center text-xs text-[var(--muted-foreground)]">
              Informe a senha para acessar as configurações de integração.
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

  return (
    <main className="space-y-8 pb-12">
      <section className="space-y-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Configurações de integrações
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Gerencie os tokens de API utilizados para sincronizar dados do Meta Ads e Google Ads.
        </p>
      </section>

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

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-base">Meta Ads</CardTitle>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Token de acesso e conta padrão utilizados na sincronização da API de Marketing do Meta.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Token de acesso (Meta)
              </label>
              <input
                type="password"
                value={metaAccessToken}
                onChange={(e) => setMetaAccessToken(e.target.value)}
                placeholder={data?.hasMetaAccessToken ? "••••••••••••••••••••" : "Cole o token de acesso do Meta"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Por segurança, o valor atual não é exibido. Preencha apenas se quiser atualizar.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                ID da conta padrão (Meta Ads)
              </label>
              <input
                value={metaAdAccountId}
                onChange={(e) => setMetaAdAccountId(e.target.value)}
                placeholder={data?.metaAdAccountId || "act_123456789012345"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-base">Google Ads</CardTitle>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Credenciais OAuth e tokens para autenticar a API do Google Ads. Os IDs de conta continuam sendo
              configurados por cliente.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Client ID
              </label>
              <input
                type="password"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder={data?.hasGoogleClientId ? "••••••••••••••••••••" : "Cole o client ID OAuth do Google Ads"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Por segurança, o valor atual não é exibido. Preencha apenas se quiser atualizar.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Client Secret
              </label>
              <input
                type="password"
                value={googleClientSecret}
                onChange={(e) => setGoogleClientSecret(e.target.value)}
                placeholder={data?.hasGoogleClientSecret ? "••••••••••••••••••••" : "Cole o client secret OAuth do Google Ads"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Por segurança, o valor atual não é exibido. Preencha apenas se quiser atualizar.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Developer token
              </label>
              <input
                type="password"
                value={googleDeveloperToken}
                onChange={(e) => setGoogleDeveloperToken(e.target.value)}
                placeholder={data?.hasGoogleDeveloperToken ? "••••••••••••••••••••" : "Cole o developer token do Google Ads"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Por segurança, o valor atual não é exibido. Preencha apenas se quiser atualizar.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Refresh token
              </label>
              <input
                type="password"
                value={googleRefreshToken}
                onChange={(e) => setGoogleRefreshToken(e.target.value)}
                placeholder={data?.hasGoogleRefreshToken ? "••••••••••••••••••••" : "Cole o refresh token do Google Ads"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Por segurança, o valor atual não é exibido. Preencha apenas se quiser atualizar.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Login Customer ID (MCC)
              </label>
              <input
                type="text"
                value={googleLoginCustomerId}
                onChange={(e) => setGoogleLoginCustomerId(e.target.value)}
                placeholder={data?.googleLoginCustomerId ? data.googleLoginCustomerId : "Ex: 3830547260"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                ID da conta MCC (gerenciadora). Necessário quando o acesso é feito via conta mãe.
                {data?.googleLoginCustomerId && (
                  <span className="ml-1 text-[var(--primary)]">Atual: {data.googleLoginCustomerId}</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Alertas automáticos ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
          Alertas automáticos
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Configure como o sistema deve notificar a equipe quando houver contas com saldo baixo ou anomalias de gasto.
          O endpoint <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-xs">/api/gestao/alertas</code> pode ser chamado por um agendador diário (cron).
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-[var(--border)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-[var(--primary)]" />
              Destino das notificações
            </CardTitle>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              E-mail de destino e URL de webhook (Slack, Google Chat, Zapier, etc.).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                E-mail de notificação
              </label>
              <input
                type="email"
                value={alertNotificationEmail}
                onChange={(e) => setAlertNotificationEmail(e.target.value)}
                placeholder={data?.alertNotificationEmail || "equipe@empresa.com.br"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              {data?.alertNotificationEmail && (
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Atual: <span className="text-[var(--primary)]">{data.alertNotificationEmail}</span>
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                URL do webhook
              </label>
              <input
                type="url"
                value={alertWebhookUrl}
                onChange={(e) => setAlertWebhookUrl(e.target.value)}
                placeholder={data?.alertWebhookUrl || "https://hooks.slack.com/services/..."}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              {data?.alertWebhookUrl && (
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Atual: <span className="text-[var(--primary)]">{data.alertWebhookUrl.slice(0, 40)}…</span>
                </p>
              )}
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Compatível com Slack Incoming Webhooks, Google Chat, Discord e qualquer serviço que aceite JSON.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-base">Configuração SMTP (e-mail)</CardTitle>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Servidor de envio de e-mail. Obrigatório para envio de alertas por e-mail.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Host SMTP
                </label>
                <input
                  value={alertSmtpHost}
                  onChange={(e) => setAlertSmtpHost(e.target.value)}
                  placeholder={data?.alertSmtpHost || "smtp.gmail.com"}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Porta
                </label>
                <input
                  value={alertSmtpPort}
                  onChange={(e) => setAlertSmtpPort(e.target.value)}
                  placeholder={data?.alertSmtpPort || "587"}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Usuário SMTP
              </label>
              <input
                value={alertSmtpUser}
                onChange={(e) => setAlertSmtpUser(e.target.value)}
                placeholder={data?.alertSmtpUser || "remetente@empresa.com.br"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Senha SMTP
              </label>
              <input
                type="password"
                value={alertSmtpPass}
                onChange={(e) => setAlertSmtpPass(e.target.value)}
                placeholder={data?.hasAlertSmtpPass ? "••••••••••••••••••••" : "Senha ou app password"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Por segurança, o valor atual não é exibido. Preencha apenas se quiser atualizar.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                E-mail remetente (From)
              </label>
              <input
                value={alertSmtpFrom}
                onChange={(e) => setAlertSmtpFrom(e.target.value)}
                placeholder={data?.alertSmtpFrom || "Alertas Inout <alertas@empresa.com.br>"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl border-[var(--border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-[var(--primary)]" />
            Limiares de alerta
          </CardTitle>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Defina quando o sistema deve disparar cada tipo de alerta. Os padrões são 7 dias de saldo restante e 2 dias sem gasto.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Saldo mínimo (dias restantes)
            </label>
            <input
              type="number"
              min="1"
              value={alertBalanceThresholdDays}
              onChange={(e) => setAlertBalanceThresholdDays(e.target.value)}
              placeholder={data?.alertBalanceThresholdDays || "7"}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              Atual: <span className="text-[var(--primary)]">{data?.alertBalanceThresholdDays || "7"} dias</span>
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Gap de gasto (dias sem gasto)
            </label>
            <input
              type="number"
              min="1"
              value={alertSpendGapDays}
              onChange={(e) => setAlertSpendGapDays(e.target.value)}
              placeholder={data?.alertSpendGapDays || "2"}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              Atual: <span className="text-[var(--primary)]">{data?.alertSpendGapDays || "2"} dia(s)</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="flex justify-end">
        <button
          disabled={mutation.isPending || isLoading}
          onClick={() => {
            const body: {
              metaAccessToken?: string;
              metaAdAccountId?: string;
              googleDeveloperToken?: string;
              googleRefreshToken?: string;
              googleClientId?: string;
              googleClientSecret?: string;
              googleLoginCustomerId?: string;
              alertNotificationEmail?: string;
              alertWebhookUrl?: string;
              alertSmtpHost?: string;
              alertSmtpPort?: string;
              alertSmtpUser?: string;
              alertSmtpPass?: string;
              alertSmtpFrom?: string;
              alertBalanceThresholdDays?: string;
              alertSpendGapDays?: string;
            } = {};

            if (metaAccessToken.trim()) body.metaAccessToken = metaAccessToken.trim();
            if (metaAdAccountId.trim()) body.metaAdAccountId = metaAdAccountId.trim();
            if (googleClientId.trim()) body.googleClientId = googleClientId.trim();
            if (googleClientSecret.trim()) body.googleClientSecret = googleClientSecret.trim();
            if (googleDeveloperToken.trim()) body.googleDeveloperToken = googleDeveloperToken.trim();
            if (googleRefreshToken.trim()) body.googleRefreshToken = googleRefreshToken.trim();
            if (googleLoginCustomerId.trim()) body.googleLoginCustomerId = googleLoginCustomerId.trim();
            if (alertNotificationEmail.trim()) body.alertNotificationEmail = alertNotificationEmail.trim();
            if (alertWebhookUrl.trim()) body.alertWebhookUrl = alertWebhookUrl.trim();
            if (alertSmtpHost.trim()) body.alertSmtpHost = alertSmtpHost.trim();
            if (alertSmtpPort.trim()) body.alertSmtpPort = alertSmtpPort.trim();
            if (alertSmtpUser.trim()) body.alertSmtpUser = alertSmtpUser.trim();
            if (alertSmtpPass.trim()) body.alertSmtpPass = alertSmtpPass.trim();
            if (alertSmtpFrom.trim()) body.alertSmtpFrom = alertSmtpFrom.trim();
            if (alertBalanceThresholdDays.trim()) body.alertBalanceThresholdDays = alertBalanceThresholdDays.trim();
            if (alertSpendGapDays.trim()) body.alertSpendGapDays = alertSpendGapDays.trim();

            if (Object.keys(body).length === 0) {
              setFormError("Preencha ao menos um campo para atualizar.");
              setFormSuccess("");
              return;
            }

            setFormError("");
            mutation.mutate(body);
          }}
          className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Salvando..." : "Salvar alterações"}
        </button>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-[var(--muted-foreground)]">
            Dispare um alerta agora para testar as configurações.
          </p>
          {testAlertResult && (
            <div className={`flex items-center gap-2 text-xs ${testAlertResult.ok ? "text-[var(--success)]" : "text-red-400"}`}>
              {testAlertResult.ok
                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
              {testAlertResult.message}
            </div>
          )}
        </div>
        <button
          disabled={testAlertLoading}
          onClick={handleTestAlert}
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white/[0.06] disabled:opacity-40"
        >
          {testAlertLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          {testAlertLoading ? "Executando..." : "Disparar alerta agora"}
        </button>
      </section>

      {/* ── Importação de Leads (CSV) ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
          Importação de Leads — Inout
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Faça o upload de um arquivo CSV exportado da planilha de leads, ou sincronize diretamente
          da planilha do Google Sheets. Novos leads são criados; existentes são atualizados.
        </p>
      </section>

      <Card className="rounded-2xl border-[var(--border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4 text-[var(--primary)]" />
            Upload de arquivo CSV
          </CardTitle>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Selecione o arquivo <code className="rounded bg-white/5 px-1 py-0.5">.csv</code> exportado da planilha de leads da InOut.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone / file selector */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-white/[0.02] px-6 py-10 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] transition-transform group-hover:scale-105">
              <Upload className="h-6 w-6" />
            </div>
            {selectedFile ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-[var(--foreground)]">{selectedFile.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {(selectedFile.size / 1024).toFixed(1)} KB · Clique para trocar
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--foreground)]">Clique para selecionar o arquivo</p>
                <p className="text-xs text-[var(--muted-foreground)]">ou arraste e solte aqui · CSV</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setSelectedFile(f); setImportResult(null); setImportError(""); }
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={!selectedFile || importLoading}
              onClick={handleImportFile}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90 disabled:opacity-40"
            >
              {importLoading && !selectedFile ? null : importLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {importLoading ? "Importando..." : "Importar CSV"}
            </button>
          </div>

          {/* Google Sheets URL + sync */}
          <div className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                URL do Google Sheets
              </label>
              <input
                type="url"
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Cole o link de compartilhamento da planilha. URLs normais (/edit, /view) são convertidas automaticamente.
                Se deixar em branco, usa a planilha padrão da Inout.
              </p>
            </div>
            <button
              disabled={importLoading}
              onClick={handleSyncSheets}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white/[0.06] disabled:opacity-40"
            >
              {importLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sincronizar Google Sheets
            </button>
          </div>

          {/* Error */}
          {importError && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span className="text-red-400">{importError}</span>
            </div>
          )}

          {/* Result */}
          {importResult && (
            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Importação concluída
                  <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
                    via {importResult.source === "upload" ? "arquivo enviado" : "Google Sheets"}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Total", value: importResult.total, color: "text-[var(--foreground)]" },
                  { label: "Criados", value: importResult.created, color: "text-emerald-400" },
                  { label: "Atualizados", value: importResult.updated, color: "text-cyan-400" },
                  { label: "Falhas", value: importResult.failed, color: importResult.failed > 0 ? "text-red-400" : "text-[var(--muted-foreground)]" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-[var(--border)] bg-white/[0.03] px-4 py-3 text-center">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{s.label}</p>
                  </div>
                ))}
              </div>
              {importResult.failed > 0 && importResult.total > 0 && importResult.failed === importResult.total && importResult.colunasDetectadas && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs font-semibold text-amber-400">Todos os leads falharam — verifique se as colunas do CSV estão corretas.</p>
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Colunas detectadas no arquivo:</p>
                  <p className="mt-1 font-mono text-[10px] text-amber-300 break-all">{importResult.colunasDetectadas.join(", ")}</p>
                  <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">Colunas obrigatórias: <span className="font-mono text-amber-300">id, created_time</span></p>
                </div>
              )}
              {importResult.errors && importResult.errors.length > 0 && (
                <details className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-red-400">
                    {importResult.errors.length} erro(s) detalhados
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {importResult.errors.map((e, i) => (
                      <li key={i} className="font-mono text-[10px] text-red-300">{e}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

