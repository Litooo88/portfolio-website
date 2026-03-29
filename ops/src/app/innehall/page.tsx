"use client";

import { useState, useEffect } from "react";
import {
  getContentIdeas,
  saveContentIdea,
  deleteContentIdea,
} from "@/lib/storage";
import {
  ContentIdea,
  ContentType,
  ContentStatus,
  CONTENT_TYPES,
  CONTENT_STATUSES,
} from "@/lib/types";
import { generateId, copyToClipboard } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

// --- Helpers ---

type StatusFilter = "Alla" | ContentStatus;

const STATUS_FILTERS: StatusFilter[] = ["Alla", "Idé", "Utkast", "Publicerad"];

function statusBadgeVariant(status: ContentStatus) {
  if (status === "Idé") return "info" as const;
  if (status === "Utkast") return "warning" as const;
  return "default" as const; // Publicerad = green
}

function typeBadgeVariant(type: ContentType) {
  switch (type) {
    case "Före/Efter":
      return "active" as const;
    case "Felsökning":
      return "urgent" as const;
    case "Battericase":
      return "info" as const;
    case "Kundcase":
      return "default" as const;
    case "Servicetips":
      return "warning" as const;
  }
}

function nextStatus(current: ContentStatus): ContentStatus {
  const idx = CONTENT_STATUSES.indexOf(current);
  return CONTENT_STATUSES[(idx + 1) % CONTENT_STATUSES.length];
}

function buildPostText(idea: ContentIdea): string {
  const parts = [idea.hook, idea.problem, idea.solution, idea.result, idea.cta];
  return parts.filter(Boolean).join("\n\n");
}

// --- Empty form state ---

function emptyForm(): Omit<ContentIdea, "id" | "createdAt"> {
  return {
    title: "",
    type: "Före/Efter",
    status: "Idé",
    notes: "",
    hook: "",
    problem: "",
    solution: "",
    result: "",
    cta: "",
  };
}

// --- Main component ---

export default function InnehallPage() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("Alla");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<ContentIdea | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [postSectionOpen, setPostSectionOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setIdeas(getContentIdeas());
  }, []);

  function refresh() {
    setIdeas(getContentIdeas());
  }

  function openCreate() {
    setEditingIdea(null);
    setForm(emptyForm());
    setPostSectionOpen(false);
    setDialogOpen(true);
  }

  function openEdit(idea: ContentIdea) {
    setEditingIdea(idea);
    setForm({
      title: idea.title,
      type: idea.type,
      status: idea.status,
      notes: idea.notes,
      hook: idea.hook,
      problem: idea.problem,
      solution: idea.solution,
      result: idea.result,
      cta: idea.cta,
    });
    const hasPostContent = !!(idea.hook || idea.problem || idea.solution || idea.result || idea.cta);
    setPostSectionOpen(hasPostContent);
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.title.trim()) return;
    const idea: ContentIdea = {
      id: editingIdea?.id ?? generateId(),
      createdAt: editingIdea?.createdAt ?? new Date().toISOString(),
      ...form,
    };
    saveContentIdea(idea);
    refresh();
    setDialogOpen(false);
  }

  function handleDelete(id: string) {
    deleteContentIdea(id);
    refresh();
    setDeleteConfirm(null);
  }

  function handleCycleStatus(idea: ContentIdea) {
    const updated: ContentIdea = { ...idea, status: nextStatus(idea.status) };
    saveContentIdea(updated);
    refresh();
  }

  async function handleCopyPost(idea: ContentIdea) {
    const text = buildPostText(idea);
    if (!text) return;
    await copyToClipboard(text);
    setCopiedId(idea.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered =
    filter === "Alla" ? ideas : ideas.filter((i) => i.status === filter);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">Innehållsidéer</h1>
          <p className="mt-0.5 text-sm text-[#94a3b8]">
            Planera och spåra ditt sociala medieinnehåll
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus size={16} />
          Ny idé
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f
                ? "bg-green-400 text-[#0f1117]"
                : "bg-[#161922] text-[#94a3b8] border border-[#1e2230] hover:bg-[#1e2230] hover:text-[#f1f5f9]",
            ].join(" ")}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#94a3b8]">
          <p className="text-lg font-medium">Inga idéer hittades</p>
          <p className="mt-1 text-sm">
            {filter !== "Alla"
              ? `Det finns inga idéer med status "${filter}".`
              : "Klicka på «Ny idé» för att komma igång."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              isCopied={copiedId === idea.id}
              onEdit={() => openEdit(idea)}
              onDelete={() => setDeleteConfirm(idea.id)}
              onCycleStatus={() => handleCycleStatus(idea)}
              onCopyPost={() => handleCopyPost(idea)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingIdea ? "Redigera idé" : "Ny innehållsidé"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Titel */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#f1f5f9]">Titel</label>
              <Input
                placeholder="T.ex. Xiaomi bromsfix – före/efter"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Typ + Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#f1f5f9]">Typ</label>
                <Select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as ContentType })
                  }
                >
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#f1f5f9]">Status</label>
                <Select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as ContentStatus })
                  }
                >
                  {CONTENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Anteckningar */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#f1f5f9]">
                Anteckningar
              </label>
              <Textarea
                placeholder="Idéer, inspelningsnoteringar, kontext..."
                className="min-h-[80px]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {/* Post helper collapsible */}
            <div className="rounded-lg border border-[#1e2230] overflow-hidden">
              <button
                type="button"
                onClick={() => setPostSectionOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[#f1f5f9] hover:bg-[#1e2230] transition-colors"
              >
                <span>Posthjälp (Hook / Problem / Lösning / Resultat / CTA)</span>
                {postSectionOpen ? (
                  <ChevronUp size={16} className="text-[#94a3b8]" />
                ) : (
                  <ChevronDown size={16} className="text-[#94a3b8]" />
                )}
              </button>

              {postSectionOpen && (
                <div className="flex flex-col gap-3 border-t border-[#1e2230] p-4">
                  {(
                    [
                      { key: "hook", label: "Hook", placeholder: "Fånga uppmärksamheten direkt..." },
                      { key: "problem", label: "Problem", placeholder: "Beskriv problemet kunden har..." },
                      { key: "solution", label: "Lösning", placeholder: "Hur löste ni det?" },
                      { key: "result", label: "Resultat", placeholder: "Vad blev utfallet?" },
                      { key: "cta", label: "CTA", placeholder: "Uppmaning till handling..." },
                    ] as const
                  ).map(({ key, label, placeholder }) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                        {label}
                      </label>
                      <Textarea
                        placeholder={placeholder}
                        className="min-h-[72px]"
                        value={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Avbryt</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!form.title.trim()}>
              {editingIdea ? "Spara ändringar" : "Skapa idé"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ta bort idé?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#94a3b8]">
            Denna åtgärd kan inte ångras. Idén och all tillhörande data raderas
            permanent.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Avbryt</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              <Trash2 size={15} />
              Ta bort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Idea card ---

interface IdeaCardProps {
  idea: ContentIdea;
  isCopied: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCycleStatus: () => void;
  onCopyPost: () => void;
}

function IdeaCard({
  idea,
  isCopied,
  onEdit,
  onDelete,
  onCycleStatus,
  onCopyPost,
}: IdeaCardProps) {
  const hasPostContent = !!(
    idea.hook ||
    idea.problem ||
    idea.solution ||
    idea.result ||
    idea.cta
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="leading-snug">{idea.title}</CardTitle>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={onEdit}
              className="rounded p-1 text-[#94a3b8] hover:bg-[#1e2230] hover:text-[#f1f5f9] transition-colors"
              title="Redigera"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              className="rounded p-1 text-[#94a3b8] hover:bg-red-400/10 hover:text-red-400 transition-colors"
              title="Ta bort"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={typeBadgeVariant(idea.type)}>{idea.type}</Badge>
          <button
            onClick={onCycleStatus}
            title="Klicka för att ändra status"
            className="rounded-full transition-opacity hover:opacity-80"
          >
            <Badge variant={statusBadgeVariant(idea.status)}>
              {idea.status}
            </Badge>
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 flex-1">
        {idea.notes && (
          <p className="text-sm text-[#94a3b8] line-clamp-3">{idea.notes}</p>
        )}

        {hasPostContent && (
          <div className="rounded-md border border-[#1e2230] bg-[#0f1117] p-3 text-xs text-[#94a3b8] space-y-1">
            {idea.hook && (
              <p className="line-clamp-1">
                <span className="font-semibold text-[#64748b]">Hook:</span>{" "}
                {idea.hook}
              </p>
            )}
            {idea.problem && (
              <p className="line-clamp-1">
                <span className="font-semibold text-[#64748b]">Problem:</span>{" "}
                {idea.problem}
              </p>
            )}
            {idea.solution && (
              <p className="line-clamp-1">
                <span className="font-semibold text-[#64748b]">Lösning:</span>{" "}
                {idea.solution}
              </p>
            )}
            {idea.result && (
              <p className="line-clamp-1">
                <span className="font-semibold text-[#64748b]">Resultat:</span>{" "}
                {idea.result}
              </p>
            )}
            {idea.cta && (
              <p className="line-clamp-1">
                <span className="font-semibold text-[#64748b]">CTA:</span>{" "}
                {idea.cta}
              </p>
            )}
          </div>
        )}

        {hasPostContent && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full mt-auto"
            onClick={onCopyPost}
          >
            {isCopied ? (
              <>
                <Check size={14} />
                Kopierat!
              </>
            ) : (
              <>
                <Copy size={14} />
                Kopiera posttext
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
