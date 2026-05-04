"use client";

import React from "react";
import Link from "next/link";

const RED = "#ff6a00";
const RED_SOFT = "#ff9a40";
const RED_DIM = "rgba(255,106,0,0.10)";
const RED_BORDER = "rgba(255,106,0,0.22)";
const GREEN = "#10b981";
const GREEN_DIM = "rgba(16,185,129,0.08)";
const GREEN_BORDER = "rgba(16,185,129,0.22)";

function SectionLabel({ label, color = RED }: { label: string; color?: string }) {
  return (
    <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] mb-3" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </p>
  );
}

function Tag({ children, color = RED }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
      style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}
    >
      {children}
    </span>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-neutral-300 leading-snug">
      <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {children}
    </li>
  );
}

function AlertItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-neutral-400 leading-snug">
      <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={RED_SOFT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
      {children}
    </li>
  );
}

function LockItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-neutral-300 leading-snug">
      <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      {children}
    </li>
  );
}

const EMPREENDIMENTOS = [
  { nome: "Luminare", unidades: 10, valorUnit: 480_000, status: "Estoque parado", cor: "#f59e0b" },
  { nome: "Kantoo", unidades: 48, valorUnit: 700_000, status: "Em andamento", cor: "#60a5fa" },
  { nome: "Sarandi", unidades: 240, valorUnit: 460_000, status: "Lançamento iminente", cor: GREEN },
];

function fmtBRL(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

export default function PropostaConstrutora() {
  return (
    <main className="space-y-8 pb-16">

      {/* ── Header ── */}
      <section className="relative overflow-hidden rounded-[2rem] border border-neutral-800 bg-[linear-gradient(160deg,rgba(22,23,28,0.99)_0%,rgba(12,12,16,1)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#ff6a00] opacity-[0.05] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-[#ff6a00] opacity-[0.03] blur-3xl" />
        <div className="relative px-8 pb-8 pt-8 sm:px-10 sm:pt-10">
          <div className="mb-3">
            <Link href="/planejamento" className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Planejamento
            </Link>
          </div>
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: RED }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: RED }} />
            Parceria imobiliária · Maringá
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="text-white">Proposta Comercial </span>
            <span className="bg-gradient-to-r from-[#ff6a00] to-[#ff9a40] bg-clip-text text-transparent">
              2025
            </span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-400">
            Dois modelos de parceria para gestão de mídia paga, CRM e performance de vendas — apresentados hoje para alinhamento e decisão.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Tag color={RED}>Luminare · Kantoo · Sarandi</Tag>
            <Tag color="#60a5fa">Maringá – PR</Tag>
            <Tag color={GREEN}>VGV Total R$ 148,8M</Tag>
          </div>
        </div>
      </section>

      {/* ── Empreendimentos ── */}
      <section className="space-y-4">
        <SectionLabel label="Empreendimentos contemplados" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {EMPREENDIMENTOS.map((e) => {
            const vgv = e.unidades * e.valorUnit;
            const pctVgv = (vgv / 148_800_000) * 100;
            const comissao = vgv * 0.01;
            return (
              <div key={e.nome} className="rounded-2xl border border-neutral-800 bg-[#18181b] p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-extrabold text-white">{e.nome}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{e.unidades} unidades · {fmtBRL(e.valorUnit)} cada</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: `${e.cor}18`, border: `1px solid ${e.cor}30`, color: e.cor }}>
                    {e.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pctVgv}%`, background: e.cor }} />
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>VGV {fmtBRL(vgv)}</span>
                    <span>{pctVgv.toFixed(0)}% do total</span>
                  </div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: RED_DIM, border: `1px solid ${RED_BORDER}` }}>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-0.5">Comissão 1% se vender tudo</p>
                  <p className="text-xl font-extrabold" style={{ color: RED_SOFT }}>{fmtBRL(comissao)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* totals */}
        <div className="rounded-2xl border border-neutral-800 bg-[#18181b] p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1">VGV Total</p>
              <p className="text-2xl font-extrabold text-white">R$ 148,8M</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1">Unidades</p>
              <p className="text-2xl font-extrabold text-white">298</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1">Investimento mídia/mês</p>
              <p className="text-2xl font-extrabold text-white">R$ 8k</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1">Comissão total (1% VGV)</p>
              <p className="text-2xl font-extrabold" style={{ color: RED_SOFT }}>R$ 1,488M</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Propostas lado a lado ── */}
      <section className="space-y-4">
        <SectionLabel label="Modelos propostos" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* ── Proposta 1: Híbrido ── */}
          <div className="rounded-2xl border border-neutral-700 bg-[#18181b] flex flex-col overflow-hidden">
            <div className="px-6 pt-6 pb-5 border-b border-neutral-800">
              <div className="flex items-start justify-between mb-3">
                <Tag color="#a78bfa">Modelo A</Tag>
                <Tag color="#60a5fa">Recomendado</Tag>
              </div>
              <h2 className="text-2xl font-extrabold text-white">Híbrido</h2>
              <p className="text-sm text-neutral-400 mt-1">Fee fixo + performance sobre VGV</p>
              <div className="mt-5 flex items-end gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-0.5">Fee mensal</p>
                  <p className="text-4xl font-extrabold text-white">R$ 2.000</p>
                  <p className="text-xs text-neutral-500 mt-0.5">+ 1% sobre VGV das vendas atribuídas</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5 flex-1">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-3">O que está incluso</p>
                <ul className="space-y-2.5">
                  <CheckItem>Gestão completa de tráfego pago (Meta Ads + Google Ads)</CheckItem>
                  <CheckItem>Definição da estratégia de distribuição de verba entre canais</CheckItem>
                  <CheckItem>Implementação e gestão de CRM com funil estruturado</CheckItem>
                  <CheckItem>Integração com equipe comercial e corretor dedicado</CheckItem>
                  <CheckItem>Rastreamento completo de leads e atribuição de vendas</CheckItem>
                  <CheckItem>Análise de performance com relatórios mensais</CheckItem>
                </ul>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-3">O que o fee cobre</p>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    O valor de R$ 2.000 cobre os custos operacionais mínimos da equipe dedicada à conta — não representa margem.
                    É o custo compartilhado de estruturar um processo que beneficia os dois lados.
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-3">Lógica financeira</p>
                <div className="space-y-2">
                  {[
                    { label: "Custo anual máximo (fee)", value: "R$ 24.000" },
                    { label: "Comissão se vender apenas Sarandi", value: "R$ 1.104.000" },
                    { label: "Comissão sobre VGV total", value: "R$ 1.488.000" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center text-sm">
                      <span className="text-neutral-400">{label}</span>
                      <span className="font-bold text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="rounded-xl p-4" style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.18)" }}>
                <p className="text-xs font-bold text-[#a78bfa] uppercase tracking-widest mb-1">Por que faz sentido</p>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Distribui o risco entre as duas partes. A agência garante custo mínimo de operação;
                  o cliente garante skin in the game da agência desde o primeiro dia.
                  Os dois ganham se as vendas acontecerem.
                </p>
              </div>
            </div>
          </div>

          {/* ── Proposta 2: Zero Fee ── */}
          <div className="rounded-2xl border flex flex-col overflow-hidden" style={{ borderColor: RED_BORDER, background: "#18181b" }}>
            <div className="px-6 pt-6 pb-5 border-b" style={{ borderColor: "rgba(255,106,0,0.12)" }}>
              <div className="flex items-start justify-between mb-3">
                <Tag color={RED}>Modelo B</Tag>
                <Tag color="#f59e0b">Risco maior</Tag>
              </div>
              <h2 className="text-2xl font-extrabold text-white">Performance</h2>
              <p className="text-sm text-neutral-400 mt-1">Zero fee · 100% orientado a resultado</p>
              <div className="mt-5 flex items-end gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-0.5">Fee mensal</p>
                  <p className="text-4xl font-extrabold" style={{ color: RED }}>R$ 0</p>
                  <p className="text-xs text-neutral-500 mt-0.5">+ 1% sobre VGV das vendas atribuídas</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5 flex-1">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-3">O que está incluso</p>
                <ul className="space-y-2.5">
                  <CheckItem>Gestão completa de tráfego pago (Meta Ads + Google Ads)</CheckItem>
                  <CheckItem>Planejamento e otimização contínua da verba de mídia</CheckItem>
                  <CheckItem>Implementação e gestão de CRM</CheckItem>
                  <CheckItem>Acompanhamento do funil de vendas end-to-end</CheckItem>
                  <CheckItem>Integração com equipe comercial</CheckItem>
                  <CheckItem>Rastreamento completo de leads</CheckItem>
                </ul>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-3">O que muda para funcionar</p>
                <ul className="space-y-2.5">
                  <AlertItem>Sem fee, a agência opera sem receita garantida — o resultado precisa chegar rápido</AlertItem>
                  <AlertItem>Qualquer venda fora do CRM não é atribuível e não gera comissão</AlertItem>
                  <AlertItem>O dono e o corretor precisam registrar todos os atendimentos no processo</AlertItem>
                </ul>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-widest text-neutral-500 mb-3">Lógica financeira</p>
                <div className="space-y-2">
                  {[
                    { label: "Custo anual para o cliente (fee)", value: "R$ 0" },
                    { label: "Comissão se vender apenas Sarandi", value: "R$ 1.104.000" },
                    { label: "Comissão sobre VGV total", value: "R$ 1.488.000" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center text-sm">
                      <span className="text-neutral-400">{label}</span>
                      <span className="font-bold text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="rounded-xl p-4" style={{ background: RED_DIM, border: `1px solid ${RED_BORDER}` }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: RED }}>O risco real</p>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  A agência investe tempo e operação sem receita garantida. Se o processo de atribuição
                  não for seguido à risca, vendas acontecem fora do funil e a comissão não é devida.
                  Exige comprometimento total do cliente com o processo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Termos não negociáveis (ambos modelos) ── */}
      <section className="space-y-4">
        <SectionLabel label="Termos não negociáveis — válidos nos dois modelos" color="#a78bfa" />
        <div className="rounded-2xl border border-neutral-800 bg-[#18181b] p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-bold text-white">Atribuição de vendas</p>
              <ul className="space-y-2.5">
                <LockItem>Somente leads originados nos canais gerenciados pela agência (Meta Ads, Google Ads) e registrados no CRM contam para comissão</LockItem>
                <LockItem>O dono ou corretor que fechar venda por WhatsApp direto, indicação ou canal próprio não gera comissão — a menos que o lead esteja no CRM</LockItem>
                <LockItem>Definição do CRM e onboarding devem ocorrer na primeira semana do contrato</LockItem>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-white">Processo e transparência</p>
              <ul className="space-y-2.5">
                <LockItem>Registro obrigatório de todos os atendimentos no CRM — sem exceção</LockItem>
                <LockItem>Reunião quinzenal de alinhamento com time comercial e dados de performance</LockItem>
                <LockItem>Acesso completo às plataformas de mídia para acompanhamento em tempo real</LockItem>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Vigência e revisão ── */}
      <section className="space-y-4">
        <SectionLabel label="Vigência e revisão" color="#60a5fa" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              ),
              titulo: "Duração mínima",
              corpo: "12 meses — tempo necessário para estruturar o funil, consolidar o CRM e colher resultado real do Sarandi.",
            },
            {
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                </svg>
              ),
              titulo: "Revisão em 90 dias",
              corpo: "Avaliamos juntos volume de trabalho, atribuição de vendas e resultados. Se o escopo mudou, o modelo é revisado sem rescindir.",
            },
            {
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={RED_SOFT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ),
              titulo: "Pagamento da comissão",
              corpo: "Modelo A: fee até 5º dia útil. Comissão: até 5º dia útil após confirmação da venda e registro em contrato.",
            },
          ].map(({ icon, titulo, corpo }) => (
            <div key={titulo} className="rounded-2xl border border-neutral-800 bg-[#18181b] p-5 space-y-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04]">
                {icon}
              </div>
              <p className="font-bold text-white text-sm">{titulo}</p>
              <p className="text-sm text-neutral-400 leading-relaxed">{corpo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comparativo rápido ── */}
      <section className="space-y-4">
        <SectionLabel label="Comparativo direto" />
        <div className="rounded-2xl border border-neutral-800 bg-[#18181b] overflow-hidden">
          <div className="grid grid-cols-3 text-xs font-bold uppercase tracking-widest text-neutral-500 px-6 py-3 border-b border-neutral-800">
            <span>Critério</span>
            <span className="text-center" style={{ color: "#a78bfa" }}>Modelo A — Híbrido</span>
            <span className="text-center" style={{ color: RED }}>Modelo B — Performance</span>
          </div>
          {[
            ["Fee mensal", "R$ 2.000", "R$ 0"],
            ["Comissão", "1% do VGV atribuído", "1% do VGV atribuído"],
            ["Risco da agência", "Baixo", "Alto"],
            ["Risco do cliente", "Baixo", "Zero custo fixo"],
            ["Previsibilidade", "Sim — fee garante operação", "Não — 100% variável"],
            ["Comprometimento mútuo", "Equilibrado", "Exige mais do cliente"],
            ["Revisão", "90 dias", "90 dias"],
            ["Vigência mínima", "12 meses", "12 meses"],
          ].map(([criterio, a, b], i) => (
            <div key={i} className={`grid grid-cols-3 px-6 py-3.5 text-sm ${i % 2 === 0 ? "bg-white/[0.015]" : ""} border-b border-neutral-800/50 last:border-0`}>
              <span className="text-neutral-400 font-medium">{criterio}</span>
              <span className="text-center text-white font-semibold">{a}</span>
              <span className="text-center font-semibold" style={{ color: RED_SOFT }}>{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contexto para a call ── */}
      <section className="space-y-4">
        <SectionLabel label="Contexto para a call" color={GREEN} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl p-5 space-y-3" style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BORDER}` }}>
            <p className="text-sm font-bold text-white">O que favorece a parceria</p>
            <ul className="space-y-2.5">
              <CheckItem>Faturamento acima de R$ 1M/mês mesmo sem processo definido — já tem tração</CheckItem>
              <CheckItem>Sarandi com 240 unidades em lançamento iminente — janela crítica de marketing</CheckItem>
              <CheckItem>Criativos já produzidos por profissional que atende a conta — custo incremental baixo</CheckItem>
              <CheckItem>Cliente com corredor de vendas próprio — agência estrutura, não substitui</CheckItem>
            </ul>
          </div>
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
            <p className="text-sm font-bold text-white">O que precisa ficar claro na call</p>
            <ul className="space-y-2.5">
              <AlertItem>Vendas fora do CRM não são atribuíveis — essa regra é inegociável nos dois modelos</AlertItem>
              <AlertItem>Dono e corretor precisam registrar todos os contatos no processo</AlertItem>
              <AlertItem>O Modelo B exige comprometimento total com o CRM para proteger a agência</AlertItem>
              <AlertItem>A revisão de 90 dias existe para ajustar volume de trabalho se o escopo crescer</AlertItem>
            </ul>
          </div>
        </div>
      </section>

    </main>
  );
}
