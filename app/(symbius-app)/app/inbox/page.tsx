"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Send } from "lucide-react";
import { isWithin24hWindow } from "@/lib/instagram/messagingClient";

type ConversaItem = {
  id: string;
  contato: {
    id: string;
    nome: string | null;
    username: string | null;
    lastInteractionAt: string | null;
  };
  handoffHuman: boolean;
  lastMessage: string;
  lastMessageAt: string | null;
};

type Mensagem = {
  id: string;
  direction: string;
  texto: string | null;
  createdAt: string;
};

export default function InboxPage() {
  const [conversas, setConversas] = useState<ConversaItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/symbius/inbox")
      .then((r) => r.json())
      .then((d) => setConversas(d.conversas ?? []));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/symbius/inbox/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setMensagens(d.conversa?.mensagens ?? []));
  }, [selectedId]);

  const selected = conversas.find((c) => c.id === selectedId);

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    setLoading(true);
    const res = await fetch("/api/symbius/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversaId: selectedId, text: reply }),
    });
    setLoading(false);
    if (res.ok) {
      setReply("");
      const r = await fetch(`/api/symbius/inbox/${selectedId}`);
      const d = await r.json();
      setMensagens(d.conversa?.mensagens ?? []);
    } else {
      const err = await res.json();
      alert(err.error ?? "Erro ao enviar");
    }
  }

  const canSend = selected?.contato.lastInteractionAt
    ? isWithin24hWindow(new Date(selected.contato.lastInteractionAt))
    : false;

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col md:flex-row">
      <div className="w-full border-b border-[var(--symbius-border)] md:w-80 md:border-b-0 md:border-r">
        <div className="border-b border-[var(--symbius-border)] p-4">
          <h1 className="font-bold">Inbox</h1>
        </div>
        <div className="max-h-[40vh] overflow-y-auto md:max-h-none md:h-[calc(100%-4rem)]">
          {conversas.length === 0 && (
            <p className="p-4 text-sm text-[var(--symbius-muted)]">
              Nenhuma conversa ainda
            </p>
          )}
          {conversas.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`w-full border-b border-[var(--symbius-border)] p-4 text-left transition-colors hover:bg-[var(--symbius-surface-hover)] ${
                selectedId === c.id ? "bg-[var(--symbius-primary)]/10" : ""
              }`}
            >
              <p className="font-medium">
                {c.contato.username ? `@${c.contato.username}` : c.contato.nome ?? "Contato"}
              </p>
              <p className="mt-1 truncate text-sm text-[var(--symbius-muted)]">
                {c.lastMessage || "—"}
              </p>
              {c.lastMessageAt && (
                <p className="mt-1 text-xs text-[var(--symbius-muted)]">
                  {formatDistanceToNow(new Date(c.lastMessageAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center text-[var(--symbius-muted)]">
            <MessageSquare className="h-12 w-12 opacity-40" />
            <p className="mt-4">Selecione uma conversa</p>
          </div>
        ) : (
          <>
            <div className="border-b border-[var(--symbius-border)] p-4">
              <p className="font-semibold">
                {selected?.contato.username
                  ? `@${selected.contato.username}`
                  : selected?.contato.nome}
              </p>
              {!canSend && (
                <p className="mt-1 text-xs text-amber-400">
                  Fora da janela de 24h — resposta usará tag HUMAN_AGENT
                </p>
              )}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {mensagens.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    m.direction === "OUTBOUND"
                      ? "ml-auto bg-[var(--symbius-primary)] text-white"
                      : "bg-[var(--symbius-surface)]"
                  }`}
                >
                  {m.texto}
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-[var(--symbius-border)] p-4">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="symbius-input flex-1"
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={loading}
                className="symbius-btn-primary px-4"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
