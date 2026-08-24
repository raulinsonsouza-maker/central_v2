"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Save, Upload } from "lucide-react";

type FluxoNo = {
  id: string;
  tipo: string;
  config: Record<string, unknown>;
  posX: number;
  posY: number;
  nextIds: string[];
};

const NODE_LABELS: Record<string, string> = {
  trigger: "Trigger",
  send_message: "Enviar mensagem",
  wait: "Aguardar",
  add_tag: "Adicionar tag",
  condition: "Condição",
  handoff_human: "Handoff humano",
};

function SymbiusNode({ data }: NodeProps) {
  const tipo = String(data.tipo ?? "node");
  const config = (data.config ?? {}) as Record<string, unknown>;
  return (
    <div className="min-w-[180px] rounded-xl border-2 border-[var(--symbius-primary)] bg-[var(--symbius-surface)] px-4 py-3 shadow-lg">
      <Handle type="target" position={Position.Top} className="!bg-[var(--symbius-primary)]" />
      <p className="text-xs font-bold uppercase text-[var(--symbius-primary)]">
        {NODE_LABELS[tipo] ?? tipo}
      </p>
      {tipo === "send_message" && (
        <p className="mt-2 line-clamp-2 text-sm text-[var(--symbius-muted)]">
          {String(config.text ?? "")}
        </p>
      )}
      {tipo === "wait" && (
        <p className="mt-2 text-sm">{String(config.minutes ?? 0)} min</p>
      )}
      {tipo === "add_tag" && (
        <p className="mt-2 text-sm">#{String(config.tag ?? "")}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--symbius-accent)]" />
    </div>
  );
}

const nodeTypes = { symbius: SymbiusNode };

export function FlowEditor({ fluxoId }: { fluxoId: string }) {
  const [nome, setNome] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [triggerType, setTriggerType] = useState("keyword");
  const [keywords, setKeywords] = useState("");
  const [nos, setNos] = useState<FluxoNo[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    fetch(`/api/symbius/flows/${fluxoId}`)
      .then((r) => r.json())
      .then((d) => {
        const f = d.fluxo;
        if (!f) return;
        setNome(f.nome);
        setStatus(f.status);
        setTriggerType(f.triggerType);
        const cfg = f.triggerConfig as { keywords?: string[] };
        setKeywords((cfg.keywords ?? []).join(", "));
        setNos(f.nos);
        setNodes(
          f.nos.map((n: FluxoNo) => ({
            id: n.id,
            type: "symbius",
            position: { x: n.posX, y: n.posY },
            data: { tipo: n.tipo, config: n.config },
          })),
        );
        const e: Edge[] = [];
        for (const n of f.nos as FluxoNo[]) {
          for (const next of n.nextIds) {
            e.push({ id: `${n.id}-${next}`, source: n.id, target: next });
          }
        }
        setEdges(e);
      });
  }, [fluxoId, setNodes, setEdges]);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge(c, eds)),
    [setEdges],
  );

  const selected = useMemo(
    () => nos.find((n) => n.id === selectedNode),
    [nos, selectedNode],
  );

  function addNode(tipo: string) {
    const id = `temp-${Date.now()}`;
    const node: FluxoNo = {
      id,
      tipo,
      config:
        tipo === "send_message"
          ? { text: "Nova mensagem" }
          : tipo === "wait"
            ? { minutes: 5 }
            : tipo === "add_tag"
              ? { tag: "lead" }
              : {},
      posX: 200 + nos.length * 40,
      posY: 200 + nos.length * 60,
      nextIds: [],
    };
    setNos((prev) => [...prev, node]);
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: "symbius",
        position: { x: node.posX, y: node.posY },
        data: { tipo, config: node.config },
      },
    ]);
  }

  function updateSelectedNode(patch: Partial<FluxoNo>) {
    if (!selectedNode) return;
    setNos((prev) =>
      prev.map((n) => (n.id === selectedNode ? { ...n, ...patch } : n)),
    );
    setNodes((prev) =>
      prev.map((n) =>
        n.id === selectedNode
          ? {
              ...n,
              data: {
                ...n.data,
                config: patch.config ?? n.data.config,
              },
            }
          : n,
      ),
    );
  }

  async function save(publish = false) {
    setSaving(true);
    const nodePayload = nodes.map((n) => {
      const no = nos.find((x) => x.id === n.id);
      const nextIds = edges.filter((e) => e.source === n.id).map((e) => e.target);
      return {
        id: n.id,
        tipo: String(no?.tipo ?? n.data.tipo),
        config: (no?.config ?? n.data.config) as Record<string, unknown>,
        posX: n.position.x,
        posY: n.position.y,
        nextIds,
      };
    });

    const res = await fetch("/api/symbius/flows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: fluxoId,
        nome,
        status: publish ? "PUBLISHED" : status,
        triggerType,
        triggerConfig: {
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        },
        nodes: nodePayload,
      }),
    });
    setSaving(false);
    if (res.ok && publish) setStatus("PUBLISHED");
    else if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Erro ao salvar");
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between border-b border-[var(--symbius-border)] p-4">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="symbius-input max-w-xs border-none bg-transparent text-lg font-bold"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="symbius-btn-outline inline-flex gap-2 text-sm"
          >
            <Save className="h-4 w-4" />
            Salvar
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="symbius-btn-primary inline-flex gap-2 text-sm"
          >
            <Upload className="h-4 w-4" />
            Publicar
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-52 space-y-2 border-r border-[var(--symbius-border)] p-3">
          <p className="text-xs font-bold uppercase text-[var(--symbius-muted)]">
            Adicionar nó
          </p>
          {["send_message", "wait", "add_tag", "handoff_human"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addNode(t)}
              className="w-full rounded-lg border border-[var(--symbius-border)] px-3 py-2 text-left text-sm hover:border-[var(--symbius-primary)]"
            >
              {NODE_LABELS[t]}
            </button>
          ))}
          <hr className="border-[var(--symbius-border)]" />
          <label className="text-xs text-[var(--symbius-muted)]">Trigger</label>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
            className="symbius-input text-sm"
          >
            <option value="keyword">Keyword DM</option>
            <option value="welcome">Boas-vindas</option>
            <option value="comment_keyword">Comentário keyword</option>
            <option value="story_reply">Story reply</option>
            <option value="postback">Postback</option>
          </select>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="keywords, separadas, por vírgula"
            className="symbius-input text-sm"
          />
        </div>

        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => setSelectedNode(n.id)}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {selected && (
          <div className="w-72 border-l border-[var(--symbius-border)] p-4">
            <p className="font-semibold">{NODE_LABELS[selected.tipo]}</p>
            {selected.tipo === "send_message" && (
              <textarea
                className="symbius-input mt-4 min-h-[120px] text-sm"
                value={String(selected.config.text ?? "")}
                onChange={(e) =>
                  updateSelectedNode({
                    config: { ...selected.config, text: e.target.value },
                  })
                }
              />
            )}
            {selected.tipo === "wait" && (
              <input
                type="number"
                className="symbius-input mt-4"
                value={Number(selected.config.minutes ?? 0)}
                onChange={(e) =>
                  updateSelectedNode({
                    config: { ...selected.config, minutes: Number(e.target.value) },
                  })
                }
              />
            )}
            {selected.tipo === "add_tag" && (
              <input
                className="symbius-input mt-4"
                value={String(selected.config.tag ?? "")}
                onChange={(e) =>
                  updateSelectedNode({
                    config: { ...selected.config, tag: e.target.value },
                  })
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
