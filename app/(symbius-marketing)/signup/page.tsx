"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      nome: fd.get("nome"),
      email: fd.get("email"),
      password: fd.get("password"),
      orgNome: fd.get("orgNome"),
    };
    const res = await fetch("/api/symbius/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erro ao criar conta");
      return;
    }
    router.push("/app/onboarding");
    router.refresh();
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="symbius-card w-full max-w-md">
        <h1 className="text-2xl font-bold">Criar conta</h1>
        <p className="mt-2 text-sm text-[var(--symbius-muted)]">
          Comece grátis no Symbius Flow
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm">Seu nome</label>
            <input name="nome" required className="symbius-input" />
          </div>
          <div>
            <label className="mb-1 block text-sm">E-mail</label>
            <input name="email" type="email" required className="symbius-input" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Senha</label>
            <input name="password" type="password" required minLength={8} className="symbius-input" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Nome da empresa</label>
            <input name="orgNome" required className="symbius-input" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="symbius-btn-primary w-full">
            {loading ? "Criando..." : "Criar conta grátis"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--symbius-muted)]">
          Já tem conta?{" "}
          <Link href="/login" className="text-[var(--symbius-primary)] hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
