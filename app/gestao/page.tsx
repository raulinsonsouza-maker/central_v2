"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, RefreshCw, Shield } from "lucide-react";

function fmtBrl(v: number | null) {
  if (v === null) return "—";
  return "R$\u00a0" + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FORMAS_PGTO = ["Nenhuma", "PIX", "Boleto", "Cartão"];

interface TabelaRow {
  id: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
  ativo: boolean;
  gestor: string | null;
  formaPagamentoMeta: string | null;
  formaPagamentoGoogle: string | null;
  orcamentoMeta: number | null;
  orcamentoGoogle: number | null;
  orcamentoTotal: number;
  saldoMeta: number | null;
  saldoGoogle: number | null;
  gastoMeta: number;
  gastoGoogle: number;
}

function SaldoCell({ valor }: { valor: number | null }) {
  if (valor === null)
    return <span className="text-neutral-600 tabular-nums">—</span>;
  const isNegativo = valor < 0;
  const isBaixo = valor >= 0 && valor < 200;
  const color = isNegativo
    ? "text-red-400"
    : isBaixo
    ? "text-amber-400"
    : "text-orange-300";
  return <span className={`tabular-nums font-semibold ${color}`}>{fmtBrl(valor)}</span>;
}

function InlineText({
  value,
  onSave,
  placeholder = "—",
  className = "",
}: {
  value: string | null;
  onSave: (v: string | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const v = draft.trim() || null;
    if (v !== (value ?? null)) onSave(v);
  }

  if (!editing) {
    return (
      <span
        onClick={() => { setDraft(value ?? ""); setEditing(true); }}
        className={`cursor-pointer rounded px-1 hover:bg-white/[0.06] transition-colors ${value ? "text-neutral-200" : "text-neutral-600"} ${className}`}
      >
        {value || placeholder}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      className="w-full rounded border border-[#ff6a00]/40 bg-neutral-900 px-1 py-0.5 text-[12px] text-white outline-none"
    />
  );
}

function InlineSelect({
  value,
  options,
  onSave,
}: {
  value: string | null;
  options: string[];
  onSave: (v: string | null) => void;
}) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value === "Nenhuma" ? null : e.target.value;
    onSave(v);
  }

  return (
    <select
      value={value ?? "Nenhuma"}
      onChange={handleChange}
      className="w-full cursor-pointer rounded bg-transparent px-1 py-0.5 text-[12px] text-neutral-300 hover:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-[#ff6a00]/40 transition-colors"
    >
      {options.map((o) => (
        <option key={o} value={o} className="bg-neutral-900 text-neutral-200">
          {o}
        </option>
      ))}
    </select>
  );
}

function InlineOrcamento({
  value,
  onSave,
}: {
  value: number | null;
  onSave: (v: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const num = parseFloat(draft.replace(/\./g, "").replace(",", "."));
    const v = isNaN(num) ? null : num;
    if (v !== value) onSave(v);
  }

  if (!editing) {
    return (
      <span
        onClick={() => { setDraft(String(value ?? "")); setEditing(true); }}
        className={`cursor-pointer rounded px-1 tabular-nums hover:bg-white/[0.06] transition-colors ${value ? "text-neutral-200" : "text-neutral-600"}`}
      >
        {value != null ? fmtBrl(value) : "R$ 0,00"}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      className="w-20 rounded border border-[#ff6a00]/40 bg-neutral-900 px-1 py-0.5 text-[12px] text-white outline-none tabular-nums"
    />
  );
}

type SortKey = "nome" | "gestor" | "orcamentoMeta" | "saldoMeta" | "orcamentoGoogle" | "saldoGoogle" | "orcamentoTotal";
type SortDir = "asc" | "desc";

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`whitespace-nowrap border-b border-neutral-800 bg-neutral-950 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function ThSort({
  children,
  sortKey,
  current,
  dir,
  onSort,
  right,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  current: SortKey | null;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  right?: boolean;
}) {
  const active = current === sortKey;
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`cursor-pointer select-none whitespace-nowrap border-b border-neutral-800 bg-neutral-950 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:text-neutral-300 ${active ? "text-[#ff6a00]" : "text-neutral-500"} ${right ? "text-right" : "text-left"}`}
    >
      <span className={`inline-flex items-center gap-1 ${right ? "flex-row-reverse" : ""}`}>
        {children}
        <Icon className={`h-3 w-3 shrink-0 ${active ? "text-[#ff6a00]" : "text-neutral-700"}`} />
      </span>
    </th>
  );
}

function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return (
    <td className={`border-b border-neutral-900 px-3 py-2 text-[12px] ${right ? "text-right" : "text-left"} ${className}`}>
      {children}
    </td>
  );
}

function GestaoTable({
  rows,
  adminToken,
  onRefresh,
}: {
  rows: TabelaRow[];
  adminToken: string;
  onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const [squadFiltro, setSquadFiltro] = useState<string>("todos");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function sortRows(list: TabelaRow[]) {
    if (!sortKey) return list;
    return [...list].sort((a, b) => {
      let av: string | number | null;
      let bv: string | number | null;
      if (sortKey === "nome") { av = a.nome.toLowerCase(); bv = b.nome.toLowerCase(); }
      else if (sortKey === "gestor") { av = (a.gestor ?? "").toLowerCase(); bv = (b.gestor ?? "").toLowerCase(); }
      else { av = a[sortKey]; bv = b[sortKey]; }
      // nulls last regardless of direction
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  const patch = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      await fetch("/api/gestao/tabela", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ id, ...data }),
      });
      qc.invalidateQueries({ queryKey: ["gestao-tabela"] });
    },
    [adminToken, qc]
  );

  const squadsDisponiveis = Array.from(
    new Set(rows.map((r) => r.gestor?.trim()).filter(Boolean) as string[])
  ).sort();

  const rowsFiltrados = squadFiltro === "todos"
    ? rows
    : rows.filter((r) => r.gestor?.trim() === squadFiltro);

  const ativos = sortRows(rowsFiltrados.filter((r) => r.ativo));
  const inativos = sortRows(rowsFiltrados.filter((r) => !r.ativo));

  const totalOrcMeta = ativos.reduce((s, r) => s + (r.orcamentoMeta ?? 0), 0);
  const totalOrcGoogle = ativos.reduce((s, r) => s + (r.orcamentoGoogle ?? 0), 0);
  const totalOrcTotal = ativos.reduce((s, r) => s + r.orcamentoTotal, 0);

  function renderRow(r: TabelaRow) {
    return (
      <tr key={r.id} className={`group hover:bg-white/[0.025] transition-colors ${!r.ativo ? "opacity-50" : ""}`}>
        <Td className="min-w-[180px]">
          <div className="flex items-center gap-2">
            {r.logoUrl ? (
              <Image src={r.logoUrl} alt={r.nome} width={20} height={20} className="h-5 w-5 shrink-0 rounded object-contain" unoptimized />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#ff6a00]/20">
                <span className="text-[8px] font-bold text-[#ff6a00]">{r.nome.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
            <span className="font-semibold text-neutral-200 truncate max-w-[140px]">{r.nome}</span>
            <Link href={`/clientes/${r.id}`} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="h-3 w-3 text-neutral-600 hover:text-[#ff6a00]" />
            </Link>
          </div>
        </Td>

        <Td className="min-w-[90px]">
          <InlineText value={r.gestor} onSave={(v) => patch(r.id, { gestor: v })} placeholder="—" />
        </Td>

        <Td>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.ativo ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
            {r.ativo ? "Ativa" : "Desativada"}
          </span>
        </Td>

        <Td right className="min-w-[110px]">
          <InlineOrcamento value={r.orcamentoMeta} onSave={(v) => patch(r.id, { orcamentoMeta: v })} />
        </Td>

        <Td className="min-w-[100px]">
          <InlineSelect
            value={r.formaPagamentoMeta}
            options={FORMAS_PGTO}
            onSave={(v) => patch(r.id, { formaPagamentoMeta: v })}
          />
        </Td>

        <Td right className="min-w-[110px]">
          <SaldoCell valor={r.saldoMeta} />
        </Td>

        <Td right className="min-w-[110px]">
          <InlineOrcamento value={r.orcamentoGoogle} onSave={(v) => patch(r.id, { orcamentoGoogle: v })} />
        </Td>

        <Td className="min-w-[100px]">
          <InlineSelect
            value={r.formaPagamentoGoogle}
            options={FORMAS_PGTO}
            onSave={(v) => patch(r.id, { formaPagamentoGoogle: v })}
          />
        </Td>

        <Td right className="min-w-[110px]">
          <SaldoCell valor={r.saldoGoogle} />
        </Td>

        <Td right className="min-w-[110px]">
          <span className="tabular-nums text-neutral-300 font-semibold">{fmtBrl(r.orcamentoTotal || null)}</span>
        </Td>
      </tr>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-neutral-800">
        <div>
          <h2 className="text-[13px] font-bold text-neutral-200">Gestão de Projetos</h2>
          <p className="text-[11px] text-neutral-600 mt-0.5">Clique em qualquer célula editável para alterar · Saldos via API</p>
        </div>
        <div className="flex items-center gap-2">
          {squadsDisponiveis.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Squad</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSquadFiltro("todos")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    squadFiltro === "todos"
                      ? "bg-[#ff6a00] text-white"
                      : "border border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300"
                  }`}
                >
                  Todos
                </button>
                {squadsDisponiveis.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSquadFiltro(s)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      squadFiltro === s
                        ? "bg-[#ff6a00] text-white"
                        : "border border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 px-3 py-1.5 text-[11px] text-neutral-500 hover:border-[#ff6a00]/30 hover:text-neutral-300 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Atualizar saldos
          </button>
        </div>
      </div>

      <table className="w-full border-collapse" style={{ minWidth: 1050 }}>
        <thead>
          <tr>
            <ThSort sortKey="nome" current={sortKey} dir={sortDir} onSort={handleSort}>Cliente</ThSort>
            <ThSort sortKey="gestor" current={sortKey} dir={sortDir} onSort={handleSort}>Squad</ThSort>
            <Th>Status</Th>
            <ThSort sortKey="orcamentoMeta" current={sortKey} dir={sortDir} onSort={handleSort} right>Orç. Meta</ThSort>
            <Th>Forma Pgto</Th>
            <ThSort sortKey="saldoMeta" current={sortKey} dir={sortDir} onSort={handleSort} right>Saldo Meta</ThSort>
            <ThSort sortKey="orcamentoGoogle" current={sortKey} dir={sortDir} onSort={handleSort} right>Orç. Google</ThSort>
            <Th>Forma Pgto Google</Th>
            <ThSort sortKey="saldoGoogle" current={sortKey} dir={sortDir} onSort={handleSort} right>Saldo Google</ThSort>
            <ThSort sortKey="orcamentoTotal" current={sortKey} dir={sortDir} onSort={handleSort} right>Orç. Total</ThSort>
          </tr>
        </thead>
        <tbody>
          {ativos.map(renderRow)}
        </tbody>
        <tfoot>
          <tr className="bg-neutral-900/60">
            <td colSpan={3} className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
              Totais (ativos)
            </td>
            <td className="px-3 py-3 text-right text-[12px] font-bold tabular-nums text-neutral-300">
              {fmtBrl(totalOrcMeta)}
            </td>
            <td />
            <td />
            <td className="px-3 py-3 text-right text-[12px] font-bold tabular-nums text-neutral-300">
              {fmtBrl(totalOrcGoogle)}
            </td>
            <td />
            <td />
            <td className="px-3 py-3 text-right text-[12px] font-bold tabular-nums text-[#ff6a00]">
              {fmtBrl(totalOrcTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function GestaoPage() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [inputToken, setInputToken] = useState("");
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const saved = localStorage.getItem("adminToken");
    if (!saved) { setTokenLoaded(true); return; }
    fetch("/api/admin/clientes", { headers: { "x-admin-token": saved } })
      .then((res) => {
        if (res.status === 401) localStorage.removeItem("adminToken");
        else setAdminToken(saved);
      })
      .catch(() => setAdminToken(saved))
      .finally(() => setTokenLoaded(true));
  }, []);

  const enabled = !!adminToken && tokenLoaded;

  const tabelaQ = useQuery({
    queryKey: ["gestao-tabela", adminToken],
    queryFn: async () => {
      const res = await fetch("/api/gestao/tabela", { headers: { "x-admin-token": adminToken! } });
      if (res.status === 401) { setAdminToken(null); localStorage.removeItem("adminToken"); throw new Error("Unauthorized"); }
      if (!res.ok) throw new Error("Erro ao carregar tabela");
      return res.json() as Promise<{ rows: TabelaRow[] }>;
    },
    enabled,
    staleTime: 3 * 60 * 1000,
  });

  function handleLogin() {
    if (!inputToken.trim()) return;
    localStorage.setItem("adminToken", inputToken.trim());
    setAdminToken(inputToken.trim());
  }

  if (!tokenLoaded) return null;

  if (!adminToken) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 p-8">
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff6a00]/10">
              <Shield className="h-6 w-6 text-[#ff6a00]" />
            </div>
            <div className="text-center">
              <h1 className="text-[15px] font-bold text-neutral-200">Painel de Gestão</h1>
              <p className="mt-1 text-[12px] text-neutral-500">Área restrita — insira a senha de administrador.</p>
            </div>
          </div>
          <input
            type="password"
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Senha de admin"
            autoFocus
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:border-[#ff6a00]/40 focus:outline-none"
          />
          <button
            onClick={handleLogin}
            className="mt-3 w-full rounded-xl bg-[#ff6a00] py-2.5 text-[13px] font-bold text-white hover:opacity-90 transition"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6">
          <h1 className="text-[20px] font-black text-neutral-100">Painel de Gestão</h1>
          <p className="text-[12px] text-neutral-600 mt-1">Visão geral de todos os projetos · saldos em tempo real via Meta e Google Ads API</p>
        </div>

        {tabelaQ.isLoading ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-12 text-center">
            <RefreshCw className="h-5 w-5 animate-spin text-[#ff6a00] mx-auto mb-3" />
            <p className="text-[12px] text-neutral-600">Carregando saldos via API... pode levar alguns segundos</p>
          </div>
        ) : tabelaQ.error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center text-[12px] text-red-400">
            Erro ao carregar dados.{" "}
            <button onClick={() => tabelaQ.refetch()} className="underline">
              Tentar novamente
            </button>
          </div>
        ) : tabelaQ.data ? (
          <GestaoTable
            rows={tabelaQ.data.rows}
            adminToken={adminToken}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["gestao-tabela"] })}
          />
        ) : null}
      </div>
    </div>
  );
}
