"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/symbius/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Credenciais inválidas");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="symbius-card w-full max-w-md">
        <h1 className="text-2xl font-bold">Entrar</h1>
        <p className="mt-2 text-sm text-[var(--symbius-muted)]">
          Acesse sua conta Symbius Flow
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm">E-mail</label>
            <input name="email" type="email" required className="symbius-input" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Senha</label>
            <input name="password" type="password" required className="symbius-input" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="symbius-btn-primary w-full">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--symbius-muted)]">
          Não tem conta?{" "}
          <Link href="/signup" className="text-[var(--symbius-primary)] hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
