"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Facebook,
  Instagram,
  Loader2,
  MessageCircle,
} from "lucide-react";

type PageOption = {
  pageId: string;
  pageName: string;
  igUserId: string | null;
  pictureUrl?: string;
};

const STEPS = [
  "Entrar com Meta",
  "Escolher Page",
  "Confirmar IG",
  "Ativar mensagens",
  "Conectado",
];

function ConnectWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const stepParam = Number(searchParams.get("step") ?? "1");
  const [step, setStep] = useState(stepParam);
  const [pages, setPages] = useState<PageOption[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<{
    igUsername?: string | null;
    messagesEnabled?: boolean;
  } | null>(null);

  const loadPages = useCallback(async () => {
    const res = await fetch("/api/symbius/connect/pages");
    const data = await res.json();
    setPages(data.pages ?? []);
  }, []);

  useEffect(() => {
    if (step >= 2) loadPages();
  }, [step, loadPages]);

  useEffect(() => {
    if (stepParam >= 2) setStep(stepParam);
  }, [stepParam]);

  async function connectPage(page: PageOption) {
    setLoading(true);
    setSelectedPage(page);
    setStep(3);
    const res = await fetch("/api/symbius/connect/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: page.pageId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      alert(data.error ?? "Erro ao conectar");
      setStep(2);
      return;
    }
    setConnected(data.account);
    setStep(4);
    setTimeout(() => setStep(5), 800);
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold">Conectar Instagram</h1>
      <p className="mt-1 text-[var(--symbius-muted)]">
        Vincule sua conta Professional em poucos passos
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                active
                  ? "bg-[var(--symbius-primary)] text-white"
                  : done
                    ? "bg-[var(--symbius-accent)]/20 text-[var(--symbius-accent)]"
                    : "bg-[var(--symbius-surface)] text-[var(--symbius-muted)]"
              }`}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
              <span className="hidden sm:inline">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="symbius-card mt-8 max-w-2xl">
        {step === 1 && (
          <div className="text-center">
            <Facebook className="mx-auto h-12 w-12 text-[#1877F2]" />
            <h2 className="mt-4 text-lg font-semibold">Continuar com Meta</h2>
            <p className="mt-2 text-sm text-[var(--symbius-muted)]">
              Você precisa ser admin da Página do Facebook vinculada ao seu
              Instagram Professional.
            </p>
            <a
              href="/api/symbius/auth/meta/start"
              className="symbius-btn-primary mt-8 inline-flex gap-2"
            >
              <Facebook className="h-4 w-4" />
              Continuar com Facebook
            </a>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-semibold">Escolha sua Página</h2>
            <p className="mt-1 text-sm text-[var(--symbius-muted)]">
              Só aparecem Pages com Instagram vinculado
            </p>
            <div className="mt-6 grid gap-3">
              {pages.length === 0 && (
                <p className="text-sm text-[var(--symbius-muted)]">
                  Nenhuma Page encontrada.{" "}
                  <Link href="/api/symbius/auth/meta/start" className="text-[var(--symbius-primary)]">
                    Tentar novamente
                  </Link>
                </p>
              )}
              {pages.map((p) => (
                <button
                  key={p.pageId}
                  type="button"
                  disabled={loading}
                  onClick={() => connectPage(p)}
                  className="flex items-center gap-4 rounded-xl border border-[var(--symbius-border)] p-4 text-left transition-colors hover:border-[var(--symbius-primary)] hover:bg-[var(--symbius-surface-hover)]"
                >
                  {p.pictureUrl ? (
                    <Image
                      src={p.pictureUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--symbius-primary)]/20">
                      <Instagram className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{p.pageName}</p>
                    <p className="text-xs text-[var(--symbius-muted)]">Page vinculada</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--symbius-muted)]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {(step === 3 || step === 4) && selectedPage && (
          <div className="text-center">
            {loading ? (
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-[var(--symbius-primary)]" />
            ) : (
              <>
                <Instagram className="mx-auto h-12 w-12 text-pink-500" />
                <h2 className="mt-4 text-lg font-semibold">
                  @{connected?.igUsername ?? "instagram"}
                </h2>
                <p className="mt-2 text-sm text-[var(--symbius-muted)]">
                  Esta conta receberá automações
                </p>
                {step === 4 && (
                  <ul className="mt-6 space-y-2 text-left text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--symbius-accent)]" />
                      Conta Professional
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--symbius-accent)]" />
                      Page vinculada
                    </li>
                    <li className="flex items-center gap-2">
                      {connected?.messagesEnabled ? (
                        <CheckCircle2 className="h-4 w-4 text-[var(--symbius-accent)]" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-amber-400" />
                      )}
                      Acesso a mensagens{" "}
                      {!connected?.messagesEnabled && (
                        <span className="text-amber-400">
                          — ative em Configurações → Mensagens no Instagram
                        </span>
                      )}
                    </li>
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-[var(--symbius-accent)]" />
            <h2 className="mt-4 text-xl font-bold">Conectado com sucesso!</h2>
            <p className="mt-2 text-sm text-[var(--symbius-muted)]">
              Sua conta está pronta para automações
            </p>
            <button
              type="button"
              onClick={() => router.push("/app/flows/new")}
              className="symbius-btn-primary mt-8 inline-flex gap-2"
            >
              Criar meu primeiro fluxo
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense>
      <ConnectWizard />
    </Suspense>
  );
}
