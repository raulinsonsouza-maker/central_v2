"use client";

import { useMemo, useState } from "react";
import { Search, User } from "lucide-react";

export type ContactRow = {
  id: string;
  igsid: string;
  nome: string | null;
  username: string | null;
  tags: string[];
  botPaused: boolean;
  lastInteractionAt: string | null;
};

function formatContactTag(tag: string): { label: string; isEmail: boolean } {
  if (tag.startsWith("email:")) {
    return { label: tag.slice("email:".length), isEmail: true };
  }
  return { label: tag, isEmail: false };
}

export function ContactsTable({
  contacts,
  selectable = false,
  selected,
  onSelectionChange,
}: {
  contacts: ContactRow[];
  selectable?: boolean;
  selected?: Set<string>;
  onSelectionChange?: (s: Set<string>) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((c) => {
      const hay = [c.username, c.nome, c.igsid, ...c.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [contacts, q]);

  return (
    <div>
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none focus:border-[#2d6cdf] focus:ring-2 focus:ring-[#2d6cdf]/20"
          placeholder="Buscar por @, nome ou tag"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm text-zinc-900">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left font-semibold w-10" />
              )}
              <th className="px-4 py-3 text-left font-semibold">Contato</th>
              <th className="px-4 py-3 text-left font-semibold">Tags</th>
              <th className="px-4 py-3 text-left font-semibold">
                Última interação
              </th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={selectable ? 5 : 4}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  Nenhum contato encontrado
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-t border-zinc-100">
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected?.has(c.id) ?? false}
                        onChange={(e) => {
                          if (!onSelectionChange || !selected) return;
                          const next = new Set(selected);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          onSelectionChange(next);
                        }}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">
                          {c.nome || c.username || "Sem nome"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {c.username ? `@${c.username}` : c.igsid}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.length === 0 ? (
                        <span className="text-zinc-400">—</span>
                      ) : (
                        c.tags.map((t) => {
                          const { label, isEmail } = formatContactTag(t);
                          return (
                            <span
                              key={t}
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                isEmail
                                  ? "bg-violet-50 text-violet-700"
                                  : "bg-sky-50 text-sky-700"
                              }`}
                            >
                              {isEmail ? label : t}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {c.lastInteractionAt
                      ? new Date(c.lastInteractionAt).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.botPaused ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Bot pausado
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Ativo
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
