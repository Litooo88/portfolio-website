"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, X, Tag, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { getPricing, savePricingItem, deletePricingItem } from "@/lib/storage";
import { formatCurrency, generateId } from "@/lib/utils";
import { PricingItem, PRICING_CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Category badge colours cycling through a fixed palette ──────────────────

const CATEGORY_COLOURS: Record<string, string> = {
  Felsökning: "bg-amber-400/10 text-amber-400 border-amber-400/25",
  Service: "bg-blue-400/10 text-blue-400 border-blue-400/25",
  Punktering: "bg-purple-400/10 text-purple-400 border-purple-400/25",
  Bromsar: "bg-red-400/10 text-red-400 border-red-400/25",
  Batteri: "bg-green-400/10 text-green-400 border-green-400/25",
  Kabeldragning: "bg-cyan-400/10 text-cyan-400 border-cyan-400/25",
  "Hämtning/Lämning": "bg-indigo-400/10 text-indigo-400 border-indigo-400/25",
  "Avancerad felsökning": "bg-orange-400/10 text-orange-400 border-orange-400/25",
};

function categoryColour(cat: string): string {
  return CATEGORY_COLOURS[cat] ?? "bg-slate-400/10 text-slate-400 border-slate-400/25";
}

// ─── Empty form state ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  service: "",
  category: PRICING_CATEGORIES[0],
  standardPrice: "",
  minPrice: "",
  premiumPrice: "",
  note: "",
};

type FormState = typeof EMPTY_FORM;

// ─── Confirmation dialog ──────────────────────────────────────────────────────

function DeleteConfirmDialog({
  item,
  onConfirm,
  onCancel,
}: {
  item: PricingItem | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ta bort tjänst?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#94a3b8]">
          Vill du permanent ta bort{" "}
          <span className="font-semibold text-[#f1f5f9]">{item?.service}</span>?
          Det går inte att ångra.
        </p>
        <DialogFooter>
          <Button variant="destructive" onClick={onConfirm}>
            Ta bort
          </Button>
          <DialogClose asChild>
            <Button variant="secondary" onClick={onCancel}>
              Avbryt
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add / Edit dialog ────────────────────────────────────────────────────────

function PricingFormDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: PricingItem | null;
  onClose: () => void;
  onSave: (item: PricingItem) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Sync form when dialog opens / initial changes
  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          service: initial.service,
          category: initial.category,
          standardPrice: initial.standardPrice === 0 ? "" : String(initial.standardPrice),
          minPrice: initial.minPrice === 0 ? "" : String(initial.minPrice),
          premiumPrice: initial.premiumPrice === 0 ? "" : String(initial.premiumPrice),
          note: initial.note,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [open, initial]);

  function field(key: keyof FormState) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
      },
    };
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.service.trim()) next.service = "Ange tjänstens namn";
    if (form.standardPrice === "" || isNaN(Number(form.standardPrice)))
      next.standardPrice = "Ange ett giltigt pris";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const item: PricingItem = {
      id: initial?.id ?? generateId(),
      service: form.service.trim(),
      category: form.category,
      standardPrice: Number(form.standardPrice),
      minPrice: form.minPrice !== "" ? Number(form.minPrice) : 0,
      premiumPrice: form.premiumPrice !== "" ? Number(form.premiumPrice) : 0,
      note: form.note.trim(),
    };
    onSave(item);
  }

  const isEditing = initial !== null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Redigera tjänst" : "Lägg till tjänst"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Tjänst */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f1f5f9]">Tjänst</label>
            <Input placeholder="t.ex. Däckbyte" {...field("service")} />
            {errors.service && (
              <p className="text-xs text-red-400">{errors.service}</p>
            )}
          </div>

          {/* Kategori */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f1f5f9]">Kategori</label>
            <Select {...field("category")}>
              {PRICING_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>

          {/* Priser */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#f1f5f9]">
                Standardpris (kr)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                {...field("standardPrice")}
              />
              {errors.standardPrice && (
                <p className="text-xs text-red-400">{errors.standardPrice}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#f1f5f9]">
                Minpris (kr)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="Valfritt"
                {...field("minPrice")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#f1f5f9]">
                Premiumpris (kr)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="Valfritt"
                {...field("premiumPrice")}
              />
            </div>
          </div>

          {/* Notering */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f1f5f9]">Notering</label>
            <Input placeholder="Intern kommentar..." {...field("note")} />
          </div>

          <DialogFooter>
            <Button type="submit">
              {isEditing ? "Spara ändringar" : "Lägg till"}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={onClose}>
                Avbryt
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pricing card (mobile / grid view) ───────────────────────────────────────

function PricingCard({
  item,
  onEdit,
  onDelete,
}: {
  item: PricingItem;
  onEdit: (item: PricingItem) => void;
  onDelete: (item: PricingItem) => void;
}) {
  const hasRange = item.minPrice > 0 || item.premiumPrice > 0;

  return (
    <Card className="group flex flex-col gap-0 transition-colors hover:border-[#2a3040]">
      <CardContent className="flex flex-col gap-3 p-4">
        {/* Top row: name + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-base font-semibold text-[#f1f5f9] leading-tight break-words">
              {item.service}
            </span>
            <span
              className={cn(
                "inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                categoryColour(item.category)
              )}
            >
              <Tag size={10} />
              {item.category}
            </span>
          </div>

          {/* Action buttons — always visible on mobile, fade in on desktop */}
          <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(item)}
              aria-label="Redigera"
              className="h-9 w-9 min-h-[36px] min-w-[36px]"
            >
              <Pencil size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item)}
              aria-label="Ta bort"
              className="h-9 w-9 min-h-[36px] min-w-[36px] text-red-400 hover:bg-red-400/10 hover:text-red-400"
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </div>

        {/* Price block */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5">
            <CircleDollarSign size={14} className="text-green-400 shrink-0 self-center" />
            <span className="text-2xl font-bold text-green-400 tabular-nums">
              {formatCurrency(item.standardPrice)}
            </span>
          </div>
          {hasRange && (
            <p className="text-xs text-[#94a3b8] tabular-nums">
              {item.minPrice > 0 && (
                <>
                  Min{" "}
                  <span className="text-[#cbd5e1]">
                    {formatCurrency(item.minPrice)}
                  </span>
                </>
              )}
              {item.minPrice > 0 && item.premiumPrice > 0 && (
                <span className="mx-1 text-[#475569]">–</span>
              )}
              {item.premiumPrice > 0 && (
                <>
                  Premium{" "}
                  <span className="text-[#cbd5e1]">
                    {formatCurrency(item.premiumPrice)}
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        {/* Note */}
        {item.note && (
          <p className="border-t border-[#1e2230] pt-2 text-xs text-[#64748b] leading-relaxed">
            {item.note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PrisdatabasPage() {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Alla");

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PricingItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<PricingItem | null>(null);

  // Load on mount
  useEffect(() => {
    setItems(getPricing());
  }, []);

  // Derived counts per category (for badge numbers)
  const countsByCategory = useMemo(() => {
    const counts: Record<string, number> = { Alla: items.length };
    for (const item of items) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  // Filtered items
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      const matchesCategory =
        activeCategory === "Alla" || item.category === activeCategory;
      const matchesSearch =
        !q ||
        item.service.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [items, search, activeCategory]);

  function handleSave(item: PricingItem) {
    savePricingItem(item);
    setItems(getPricing());
    setFormOpen(false);
    setEditingItem(null);
  }

  function handleDeleteConfirm() {
    if (!deletingItem) return;
    deletePricingItem(deletingItem.id);
    setItems(getPricing());
    setDeletingItem(null);
  }

  function openAdd() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: PricingItem) {
    setEditingItem(item);
    setFormOpen(true);
  }

  const categories = ["Alla", ...PRICING_CATEGORIES];

  return (
    <div className="min-h-screen bg-[#0f1117] pb-24">
      {/* ── Page header ── */}
      <div className="sticky top-0 z-20 border-b border-[#1e2230] bg-[#0f1117]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-[#f1f5f9] sm:text-xl">
                Prisdatabas
              </h1>
              <p className="text-xs text-[#64748b]">
                {items.length} {items.length === 1 ? "tjänst" : "tjänster"} totalt
              </p>
            </div>
            {/* Desktop add button */}
            <Button onClick={openAdd} className="hidden sm:flex" size="sm">
              <Plus size={16} />
              Ny tjänst
            </Button>
          </div>

          {/* Search row */}
          <div className="mt-3 relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
            />
            <Input
              placeholder="Sök tjänst, kategori eller notering…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94a3b8] transition-colors"
                aria-label="Rensa sökning"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category filter strip */}
          <div className="mt-3 -mx-4 px-4 overflow-x-auto scrollbar-none">
            <div className="flex gap-2 pb-1 w-max">
              {categories.map((cat) => {
                const count = countsByCategory[cat] ?? 0;
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                      isActive
                        ? "border-green-400 bg-green-400/10 text-green-400"
                        : "border-[#1e2230] bg-[#161922] text-[#94a3b8] hover:border-[#2a3040] hover:text-[#f1f5f9]"
                    )}
                  >
                    {cat}
                    {count > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
                          isActive
                            ? "bg-green-400/20 text-green-300"
                            : "bg-[#1e2230] text-[#64748b]"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-5xl px-4 pt-6">
        {/* Result summary when filtering */}
        {(search || activeCategory !== "Alla") && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[#64748b]">
              Visar{" "}
              <span className="font-medium text-[#94a3b8]">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "träff" : "träffar"}
              {activeCategory !== "Alla" && (
                <>
                  {" "}i{" "}
                  <span className="font-medium text-[#94a3b8]">{activeCategory}</span>
                </>
              )}
              {search && (
                <>
                  {" "}för{" "}
                  <span className="font-medium text-[#94a3b8]">
                    &ldquo;{search}&rdquo;
                  </span>
                </>
              )}
            </p>
            {(search || activeCategory !== "Alla") && (
              <button
                onClick={() => {
                  setSearch("");
                  setActiveCategory("Alla");
                }}
                className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
              >
                <X size={12} />
                Rensa filter
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1e2230] bg-[#161922]">
              <CircleDollarSign size={28} className="text-[#334155]" />
            </div>
            {items.length === 0 ? (
              <>
                <div>
                  <p className="text-base font-semibold text-[#f1f5f9]">
                    Inga tjänster ännu
                  </p>
                  <p className="mt-1 text-sm text-[#64748b]">
                    Lägg till din första prisinformation för att komma igång.
                  </p>
                </div>
                <Button onClick={openAdd} size="sm">
                  <Plus size={16} />
                  Lägg till tjänst
                </Button>
              </>
            ) : (
              <div>
                <p className="text-base font-semibold text-[#f1f5f9]">
                  Inga träffar
                </p>
                <p className="mt-1 text-sm text-[#64748b]">
                  Prova att ändra sökning eller kategori.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Grid of cards */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <PricingCard
                key={item.id}
                item={item}
                onEdit={openEdit}
                onDelete={setDeletingItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Floating add button (mobile only) ── */}
      <button
        onClick={openAdd}
        className={cn(
          "fixed bottom-6 right-6 z-30 sm:hidden",
          "flex h-14 w-14 items-center justify-center",
          "rounded-full bg-green-400 text-[#0f1117] shadow-lg shadow-green-400/25",
          "transition-transform hover:scale-105 active:scale-95"
        )}
        aria-label="Lägg till tjänst"
      >
        <Plus size={24} />
      </button>

      {/* ── Dialogs ── */}
      <PricingFormDialog
        open={formOpen}
        initial={editingItem}
        onClose={() => {
          setFormOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
      />

      <DeleteConfirmDialog
        item={deletingItem}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
}
