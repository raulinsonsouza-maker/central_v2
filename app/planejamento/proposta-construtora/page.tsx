"use client";

import React, { useState } from "react";
import Link from "next/link";

const ORANGE = "#ff6a00";
const ORANGE_SOFT = "#ff9a40";
const ORANGE_DIM = "rgba(255,106,0,0.10)";
const ORANGE_BORDER = "rgba(255,106,0,0.22)";
const GREEN = "#10b981";
const GREEN_DIM = "rgba(16,185,129,0.08)";
const GREEN_BORDER = "rgba(16,185,129,0.22)";
const BLUE = "#60a5fa";
const PURPLE = "#a78bfa";

function Check({ color = GREEN }: { color?: string }) {
  return (
    <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ServiceItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] text-neutral-200 leading-snug py-2.5 border-b border-neutral-800/60 last:border-0">
      <Check />
      {children}
    </li>
  );
}

function RuleItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-neutral-300 leading-snug">
      <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      {children}
    </li>
  );
}

function StatBox({ label, value, sub, accent = ORANGE }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-[#111113] p-5 text-center space-y-1">
      <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">{label}</p>
      <p className="text-3xl font-extrabold" style={{ color: accent }}>{value}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

function PropostaHibrido() {
  return (
    <div className="space-y-6">

      {/* hero */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#111113] px-8 py-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#ff6a00] opacity-[0.06] blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: ORANGE }}>
            Proposta · Modelo Híbrido
          </p>
          <h2 className="text-3xl font-extrabold text-white leading-tight">
            Parceria de mídia e performance<br />
            <span style={{ color: ORANGE_SOFT }}>com custo compartilhado</span>
          </h2>
          <p className="mt-3 text-sm text-neutral-400 max-w-xl leading-relaxed">
            A agência entra com operação, estratégia e rastreamento. O cliente entra com a mídia e um fee mensal que cobre os custos reais de estruturar o processo. Os dois lados ganham quando as vendas acontecem.
          </p>
        </div>
      </div>

      {/* numeros-chave */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Fee mensal" value="R$ 2.000" sub="custo operacional fixo" accent={ORANGE} />
        <StatBox label="Comissão sobre vendas" value="1%" sub="do VGV atribuído" accent={ORANGE_SOFT} />
        <StatBox label="Investimento em mídia" value="R$ 8k/mês" sub="pago diretamente às plataformas" accent={BLUE} />
        <StatBox label="Vigência mínima" value="12 meses" sub="revisão em 90 dias" accent={GREEN} />
      </div>

      {/* o que a agencia faz */}
      <div className="rounded-2xl border border-neutral-800 bg-[#111113] p-6">
        <p className="text-[11px] uppercase tracking-widest font-black text-neutral-500 mb-1">O que a agência entrega</p>
        <p className="text-xs text-neutral-600 mb-4">Tudo incluído no fee mensal</p>
        <ul className="divide-y-0">
          <ServiceItem>Gestão completa de Meta Ads e Google Ads — estratégia, segmentação, criativos e otimização contínua</ServiceItem>
          <ServiceItem>Distribuição inteligente da verba de R$ 8k entre canais e empreendimentos conforme momento de cada lançamento</ServiceItem>
          <ServiceItem>Implementação e gestão do CRM com funil estruturado por empreendimento (Luminare, Kantoo, Sarandi)</ServiceItem>
          <ServiceItem>Integração com equipe comercial — treinamento do processo de registro de atendimentos</ServiceItem>
          <ServiceItem>Rastreamento completo de leads do clique até a venda confirmada</ServiceItem>
          <ServiceItem>Relatório mensal de performance com custo por lead, taxa de conversão e ROI por empreendimento</ServiceItem>
        </ul>
      </div>

      {/* potencial financeiro */}
      <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: ORANGE_BORDER, background: ORANGE_DIM }}>
        <p className="text-[11px] uppercase tracking-widest font-black" style={{ color: ORANGE }}>Potencial financeiro — Empreendimentos</p>
        <div className="space-y-3">
          {[
            { nome: "Luminare", un: 10, vgv: "R$ 4,8M", comissao: "R$ 48k", cor: "#f59e0b" },
            { nome: "Kantoo", un: 48, vgv: "R$ 33,6M", comissao: "R$ 336k", cor: BLUE },
            { nome: "Sarandi", un: 240, vgv: "R$ 110,4M", comissao: "R$ 1,1M", cor: GREEN },
          ].map((e) => (
            <div key={e.nome} className="flex items-center justify-between rounded-xl border border-neutral-800 bg-[#18181b] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.cor }} />
                <div>
                  <p className="text-sm font-bold text-white">{e.nome}</p>
                  <p className="text-xs text-neutral-500">{e.un} unidades · VGV {e.vgv}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">Comissão 1%</p>
                <p className="text-base font-extrabold" style={{ color: ORANGE_SOFT }}>{e.comissao}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-orange-900/30">
          <p className="text-sm font-bold text-white">Total se vender tudo</p>
          <p className="text-2xl font-extrabold" style={{ color: ORANGE_SOFT }}>R$ 1,488M</p>
        </div>
        <p className="text-xs text-neutral-500 -mt-1">Custo máximo de fee no período: R$ 24k/ano — menos de 2% da comissão total</p>
      </div>

      {/* regras de atribuição */}
      <div className="rounded-2xl border border-neutral-800 bg-[#111113] p-6 space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-black text-neutral-500 mb-1">Como funciona a atribuição</p>
          <p className="text-xs text-neutral-600">Para garantir transparência nos dois lados</p>
        </div>
        <ul className="space-y-3">
          <RuleItem>Apenas leads originados nos canais gerenciados pela agência e registrados no CRM geram comissão</RuleItem>
          <RuleItem>Vendas fechadas por indicação, WhatsApp direto do dono ou canal próprio não geram comissão — a menos que o lead esteja registrado</RuleItem>
          <RuleItem>CRM é implementado na primeira semana. Todos os atendimentos precisam ser registrados — sem exceção</RuleItem>
          <RuleItem>Comissão é paga até o 5º dia útil após confirmação da venda com contrato assinado</RuleItem>
        </ul>
      </div>

      {/* vigência */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            titulo: "Contrato de 12 meses",
            texto: "Tempo real para estruturar, testar e escalar. Lançamentos imobiliários precisam de consistência — não de trocas mensais de estratégia.",
            cor: BLUE,
          },
          {
            titulo: "Revisão obrigatória em 90 dias",
            texto: "Se o volume de trabalho crescer ou o escopo mudar, sentamos juntos para ajustar. Nenhum dos dois lados fica preso a uma estrutura que não faz sentido.",
            cor: PURPLE,
          },
          {
            titulo: "Fee até o 5º dia útil",
            texto: "Pagamento mensal simples. A comissão de vendas é paga separadamente após confirmação por contrato.",
            cor: ORANGE,
          },
        ].map(({ titulo, texto, cor }) => (
          <div key={titulo} className="rounded-2xl border border-neutral-800 bg-[#111113] p-5 space-y-2">
            <p className="text-sm font-bold text-white">{titulo}</p>
            <p className="text-sm text-neutral-400 leading-relaxed">{texto}</p>
          </div>
        ))}
      </div>

      {/* fechamento */}
      <div className="rounded-2xl border p-6 space-y-2" style={{ borderColor: GREEN_BORDER, background: GREEN_DIM }}>
        <p className="text-[11px] uppercase tracking-widest font-black" style={{ color: GREEN }}>Por que faz sentido</p>
        <p className="text-base text-neutral-200 leading-relaxed">
          O fee de R$ 2k não é lucro da agência — é o custo de ter uma equipe dedicada à conta. A comissão de 1% é o que alinha os dois lados: quanto mais você vende, mais a agência ganha. E com R$ 110M de VGV só no Sarandi, o upside é real.
        </p>
      </div>

    </div>
  );
}

function PropostaPerformance() {
  return (
    <div className="space-y-6">

      {/* hero */}
      <div className="relative overflow-hidden rounded-2xl border p-8" style={{ borderColor: ORANGE_BORDER, background: "#111113" }}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#ff6a00] opacity-[0.06] blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: ORANGE }}>
            Proposta · Modelo Performance
          </p>
          <h2 className="text-3xl font-extrabold text-white leading-tight">
            Parceria 100% orientada<br />
            <span style={{ color: ORANGE_SOFT }}>a resultado</span>
          </h2>
          <p className="mt-3 text-sm text-neutral-400 max-w-xl leading-relaxed">
            Zero custo fixo para o cliente. A agência entra com operação completa e só recebe quando as vendas acontecem — 1% do VGV de cada unidade atribuída. Risco total da agência, resultado total para os dois.
          </p>
        </div>
      </div>

      {/* numeros-chave */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Fee mensal" value="R$ 0" sub="zero custo fixo" accent={GREEN} />
        <StatBox label="Comissão sobre vendas" value="1%" sub="do VGV atribuído" accent={ORANGE_SOFT} />
        <StatBox label="Investimento em mídia" value="R$ 8k/mês" sub="pago diretamente às plataformas" accent={BLUE} />
        <StatBox label="Vigência mínima" value="12 meses" sub="revisão em 90 dias" accent={PURPLE} />
      </div>

      {/* o que a agencia faz */}
      <div className="rounded-2xl border border-neutral-800 bg-[#111113] p-6">
        <p className="text-[11px] uppercase tracking-widest font-black text-neutral-500 mb-1">O que a agência entrega</p>
        <p className="text-xs text-neutral-600 mb-4">Sem custo fixo — tudo orientado a venda</p>
        <ul className="divide-y-0">
          <ServiceItem>Gestão completa de Meta Ads e Google Ads — estratégia, segmentação, criativos e otimização contínua</ServiceItem>
          <ServiceItem>Distribuição da verba de R$ 8k entre canais e empreendimentos conforme prioridade e momento de lançamento</ServiceItem>
          <ServiceItem>Implementação e gestão do CRM com funil por empreendimento</ServiceItem>
          <ServiceItem>Integração com equipe comercial e suporte contínuo ao processo de vendas</ServiceItem>
          <ServiceItem>Rastreamento completo de leads — do primeiro clique até a venda assinada</ServiceItem>
          <ServiceItem>Relatório mensal de performance com custo por lead e conversão por empreendimento</ServiceItem>
        </ul>
      </div>

      {/* potencial financeiro */}
      <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: ORANGE_BORDER, background: ORANGE_DIM }}>
        <p className="text-[11px] uppercase tracking-widest font-black" style={{ color: ORANGE }}>Potencial financeiro — Empreendimentos</p>
        <div className="space-y-3">
          {[
            { nome: "Luminare", un: 10, vgv: "R$ 4,8M", comissao: "R$ 48k", cor: "#f59e0b" },
            { nome: "Kantoo", un: 48, vgv: "R$ 33,6M", comissao: "R$ 336k", cor: BLUE },
            { nome: "Sarandi", un: 240, vgv: "R$ 110,4M", comissao: "R$ 1,1M", cor: GREEN },
          ].map((e) => (
            <div key={e.nome} className="flex items-center justify-between rounded-xl border border-neutral-800 bg-[#18181b] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.cor }} />
                <div>
                  <p className="text-sm font-bold text-white">{e.nome}</p>
                  <p className="text-xs text-neutral-500">{e.un} unidades · VGV {e.vgv}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">Comissão 1%</p>
                <p className="text-base font-extrabold" style={{ color: ORANGE_SOFT }}>{e.comissao}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-orange-900/30">
          <p className="text-sm font-bold text-white">Total se vender tudo</p>
          <p className="text-2xl font-extrabold" style={{ color: ORANGE_SOFT }}>R$ 1,488M</p>
        </div>
        <p className="text-xs text-neutral-500 -mt-1">Custo fixo para o cliente no período: zero</p>
      </div>

      {/* o que o cliente precisa garantir */}
      <div className="rounded-2xl border border-neutral-800 bg-[#111113] p-6 space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-black text-neutral-500 mb-1">O que o cliente precisa garantir</p>
          <p className="text-xs text-neutral-600">Para este modelo funcionar, o processo precisa ser seguido à risca</p>
        </div>
        <ul className="space-y-3">
          <RuleItem>Todo atendimento registrado no CRM — dono, corretor, qualquer pessoa que receba contato de comprador</RuleItem>
          <RuleItem>Nenhuma venda fechada fora do funil sem registro prévio — mesmo que o cliente tenha chegado por indicação e depois virou lead nos anúncios</RuleItem>
          <RuleItem>Participação nas reuniões quinzenais de alinhamento com dados de funil e vendas</RuleItem>
          <RuleItem>CRM configurado e operacional na primeira semana — o processo começa antes dos anúncios</RuleItem>
        </ul>
        <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">
          <p className="text-xs text-neutral-400 leading-relaxed">
            <span className="font-bold text-neutral-300">Por que isso importa:</span> sem o registro no CRM, não há como atribuir a venda aos anúncios. A agência trabalha sem fee — o processo é a garantia de ambos os lados.
          </p>
        </div>
      </div>

      {/* regras de atribuição */}
      <div className="rounded-2xl border border-neutral-800 bg-[#111113] p-6 space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-black text-neutral-500 mb-1">Como funciona a atribuição</p>
          <p className="text-xs text-neutral-600">Transparente e sem ambiguidade</p>
        </div>
        <ul className="space-y-3">
          <RuleItem>Apenas leads originados nos canais gerenciados pela agência e registrados no CRM geram comissão</RuleItem>
          <RuleItem>Vendas por indicação, WhatsApp direto ou canal próprio do cliente não geram comissão — a não ser que o lead esteja no CRM</RuleItem>
          <RuleItem>Comissão é paga até o 5º dia útil após confirmação da venda com contrato assinado</RuleItem>
        </ul>
      </div>

      {/* vigência */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            titulo: "Contrato de 12 meses",
            texto: "Tempo real para gerar, qualificar e converter leads em lançamentos imobiliários. O Sarandi sozinho justifica a estrutura de 12 meses.",
            cor: BLUE,
          },
          {
            titulo: "Revisão obrigatória em 90 dias",
            texto: "Se o volume crescer ou o escopo mudar, revisamos juntos. Nem a agência nem o cliente ficam presos a uma estrutura defasada.",
            cor: PURPLE,
          },
          {
            titulo: "Comissão até o 5º dia útil",
            texto: "Paga após confirmação da venda por contrato assinado. Processo claro, sem discussão de atribuição depois.",
            cor: ORANGE,
          },
        ].map(({ titulo, texto }) => (
          <div key={titulo} className="rounded-2xl border border-neutral-800 bg-[#111113] p-5 space-y-2">
            <p className="text-sm font-bold text-white">{titulo}</p>
            <p className="text-sm text-neutral-400 leading-relaxed">{texto}</p>
          </div>
        ))}
      </div>

      {/* fechamento */}
      <div className="rounded-2xl border p-6 space-y-2" style={{ borderColor: ORANGE_BORDER, background: ORANGE_DIM }}>
        <p className="text-[11px] uppercase tracking-widest font-black" style={{ color: ORANGE }}>Por que faz sentido</p>
        <p className="text-base text-neutral-200 leading-relaxed">
          O cliente não paga nada se não vender. A agência investe operação e só recebe resultado real. É o modelo mais limpo possível — mas exige que o processo seja levado a sério dos dois lados. Se o CRM for usado, não tem como dar errado.
        </p>
      </div>

    </div>
  );
}

const ABAS = [
  { id: "hibrido", label: "Modelo Híbrido", sub: "R$ 2k/mês + 1% VGV" },
  { id: "performance", label: "Modelo Performance", sub: "Zero fee · 1% VGV" },
] as const;

type AbaId = typeof ABAS[number]["id"];

export default function PropostaConstrutora() {
  const [aba, setAba] = useState<AbaId>("hibrido");

  return (
    <main className="space-y-6 pb-16">

      {/* back */}
      <div>
        <Link href="/planejamento" className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Planejamento
        </Link>
      </div>

      {/* topo */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: ORANGE }}>
          Parceria imobiliária · Maringá · 2025
        </p>
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">Proposta Comercial</h1>
        <p className="mt-1 text-sm text-neutral-500">Luminare · Kantoo · Sarandi — VGV total R$ 148,8M</p>
      </div>

      {/* abas */}
      <div className="flex gap-2 p-1 rounded-2xl border border-neutral-800 bg-[#111113] w-fit">
        {ABAS.map((a) => {
          const active = aba === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className="flex flex-col items-start rounded-xl px-5 py-3 transition-all text-left"
              style={
                active
                  ? { background: ORANGE_DIM, border: `1px solid ${ORANGE_BORDER}`, color: ORANGE_SOFT }
                  : { background: "transparent", border: "1px solid transparent", color: "#6b7280" }
              }
            >
              <span className="text-sm font-bold" style={{ color: active ? "#fff" : "#6b7280" }}>
                {a.label}
              </span>
              <span className="text-[11px] mt-0.5" style={{ color: active ? ORANGE_SOFT : "#4b5563" }}>
                {a.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* conteudo */}
      {aba === "hibrido" ? <PropostaHibrido /> : <PropostaPerformance />}

    </main>
  );
}
