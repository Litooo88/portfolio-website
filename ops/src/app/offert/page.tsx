"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Save,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getQuotes,
  saveQuote,
  deleteQuote,
  getJobs,
} from "@/lib/storage";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import type { Quote, QuotePart, CustomerJob } from "@/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function numVal(raw: string): number {
  const n = parseFloat(raw.replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function calcSubtotal(q: {
  diagnostics: number;
  repairLabor: number;
  extraWork: number;
  parts: QuotePart[];
  pickupDelivery: number;
}): number {
  const partsTotal = q.parts.reduce((s, p) => s + p.price, 0);
  return q.diagnostics + q.repairLabor + q.extraWork + partsTotal + q.pickupDelivery;
}

function generateQuoteText(
  job: CustomerJob,
  fields: {
    diagnostics: number;
    repairLabor: number;
    extraWork: number;
    parts: QuotePart[];
    pickupDelivery: number;
    discount: number;
    notes: string;
  }
): string {
  const subtotal = calcSubtotal(fields);
  const total = Math.max(0, subtotal - fields.discount);

  const lines: string[] = [];

  lines.push(`Hej ${job.customerName},`);
  lines.push("");
  lines.push(
    `Tack för att du valde Nordic E-Mobility. Här är vår offert för din ${job.brandModel || job.vehicleType}:`
  );
  lines.push("");

  if (fields.diagnostics > 0) {
    lines.push(`Diagnostik: ${fields.diagnostics.toLocaleString("sv-SE")} kr`);
  }
  if (fields.repairLabor > 0) {
    lines.push(`Reparation: ${fields.repairLabor.toLocaleString("sv-SE")} kr`);
  }
  if (fields.extraWork > 0) {
    lines.push(`Extraarbete: ${fields.extraWork.toLocaleString("sv-SE")} kr`);
  }
  if (fields.parts.length > 0) {
    lines.push("Delar:");
    for (const p of fields.parts) {
      if (p.name || p.price > 0) {
        lines.push(`  - ${p.name || "Del"}: ${p.price.toLocaleString("sv-SE")} kr`);
      }
    }
  }
  if (fields.pickupDelivery > 0) {
    lines.push(
      `Hämtning/Lämning: ${fields.pickupDelivery.toLocaleString("sv-SE")} kr`
    );
  }

  lines.push("");
  lines.push(`Delsumma: ${subtotal.toLocaleString("sv-SE")} kr`);

  if (fields.discount > 0) {
    lines.push(`Rabatt: -${fields.discount.toLocaleString("sv-SE")} kr`);
  }

  lines.push("---");
  lines.push(`Totalt: ${total.toLocaleString("sv-SE")} kr`);

  if (fields.notes.trim()) {
    lines.push("");
    lines.push(fields.notes.trim());
  }

  lines.push("");
  lines.push("Offerten gäller i 30 dagar. Kontakta oss gärna om du har frågor.");
  lines.push("");
  lines.push("Med vänliga hälsningar,");
  lines.push("Nordic E-Mobility");

  return lines.join("\n");
}

// ─── blank form state ────────────────────────────────────────────────────────

interface FormFields {
  jobId: string;
  diagnostics: string;
  repairLabor: string;
  extraWork: string;
  parts: QuotePart[];
  pickupDelivery: string;
  discount: string;
  notes: string;
}

const BLANK: FormFields = {
  jobId: "",
  diagnostics: "",
  repairLabor: "",
  extraWork: "",
  parts: [],
  pickupDelivery: "",
  discount: "",
  notes: "",
};

function formToQuote(f: FormFields, existingId?: string): Quote {
  return {
    id: existingId ?? generateId(),
    jobId: f.jobId,
    customerName: "",          // filled in on save
    diagnostics: numVal(f.diagnostics),
    repairLabor: numVal(f.repairLabor),
    extraWork: numVal(f.extraWork),
    parts: f.parts,
    pickupDelivery: numVal(f.pickupDelivery),
    discount: numVal(f.discount),
    notes: f.notes,
    createdAt: new Date().toISOString(),
  };
}

function quoteToForm(q: Quote): FormFields {
  return {
    jobId: q.jobId,
    diagnostics: q.diagnostics > 0 ? String(q.diagnostics) : "",
    repairLabor: q.repairLabor > 0 ? String(q.repairLabor) : "",
    extraWork: q.extraWork > 0 ? String(q.extraWork) : "",
    parts: q.parts,
    pickupDelivery: q.pickupDelivery > 0 ? String(q.pickupDelivery) : "",
    discount: q.discount > 0 ? String(q.discount) : "",
    notes: q.notes,
  };
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
      {children}
    </p>
  );
}

function AmountRow({
  label,
  value,
  onChange,
  placeholder,
  negative,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-sm text-[#f1f5f9]">{label}</span>
      <div className="flex items-center gap-1 w-[140px]">
        {negative && (
          <span className="text-sm text-red-400 font-medium">-</span>
        )}
        <Input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "0"}
          className="text-right"
        />
        <span className="text-sm text-[#94a3b8] whitespace-nowrap">kr</span>
      </div>
    </div>
  );
}

interface PartsEditorProps {
  parts: QuotePart[];
  onChange: (parts: QuotePart[]) => void;
}

function PartsEditor({ parts, onChange }: PartsEditorProps) {
  function addPart() {
    onChange([...parts, { name: "", price: 0 }]);
  }

  function removePart(i: number) {
    onChange(parts.filter((_, idx) => idx !== i));
  }

  function updatePart(i: number, key: keyof QuotePart, val: string) {
    const updated = parts.map((p, idx) => {
      if (idx !== i) return p;
      if (key === "price") return { ...p, price: numVal(val) };
      return { ...p, [key]: val };
    });
    onChange(updated);
  }

  return (
    <div className="flex flex-col gap-2">
      {parts.map((part, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={part.name}
            onChange={(e) => updatePart(i, "name", e.target.value)}
            placeholder="Delnamn"
            className="flex-1"
          />
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={part.price > 0 ? String(part.price) : ""}
            onChange={(e) => updatePart(i, "price", e.target.value)}
            placeholder="0"
            className="w-24 text-right"
          />
          <span className="text-sm text-[#94a3b8]">kr</span>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => removePart(i)}
            aria-label="Ta bort del"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={addPart} className="self-start">
        <Plus size={15} />
        Lägg till del
      </Button>
    </div>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ fields }: { fields: FormFields }) {
  const subtotal = calcSubtotal({
    diagnostics: numVal(fields.diagnostics),
    repairLabor: numVal(fields.repairLabor),
    extraWork: numVal(fields.extraWork),
    parts: fields.parts,
    pickupDelivery: numVal(fields.pickupDelivery),
  });
  const discount = numVal(fields.discount);
  const total = Math.max(0, subtotal - discount);

  return (
    <div className="rounded-lg border border-[#1e2230] bg-[#0f1117] p-4 flex flex-col gap-2">
      <div className="flex justify-between text-sm text-[#94a3b8]">
        <span>Delsumma</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-sm text-red-400">
          <span>Rabatt</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between border-t border-[#1e2230] pt-2 text-base font-semibold text-green-400">
        <span>Totalt</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

// ─── Generated text panel ─────────────────────────────────────────────────────

function GeneratedTextPanel({
  text,
  onCopy,
  copied,
}: {
  text: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SectionLabel>Genererad offerttext</SectionLabel>
        <Button
          variant="secondary"
          size="sm"
          onClick={onCopy}
          className="gap-1.5"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-400" />
              <span className="text-green-400">Kopierat!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              Kopiera
            </>
          )}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg border border-[#1e2230] bg-[#0f1117] p-4 text-sm text-[#cbd5e1] font-[family-name:var(--font-geist-mono)] leading-relaxed">
        {text}
      </pre>
    </div>
  );
}

// ─── Saved quote card ─────────────────────────────────────────────────────────

function SavedQuoteCard({
  quote,
  onLoad,
  onDelete,
}: {
  quote: Quote;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const subtotal = calcSubtotal(quote);
  const total = Math.max(0, subtotal - quote.discount);

  return (
    <Card className="flex flex-col gap-0">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold text-[#f1f5f9] truncate">
              {quote.customerName || "Okänd kund"}
            </span>
            <span className="text-xs text-[#94a3b8]">
              {formatDate(quote.createdAt)}
            </span>
          </div>
          <span className="text-base font-bold text-green-400 whitespace-nowrap shrink-0">
            {formatCurrency(total)}
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoad}
            className="flex-1 gap-1.5"
          >
            <FileText size={14} />
            Ladda
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={onDelete}
            aria-label="Ta bort offert"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OffertPage() {
  const [jobs, setJobs] = useState<CustomerJob[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [fields, setFields] = useState<FormFields>(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generatedText, setGeneratedText] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load data on mount
  useEffect(() => {
    setJobs(getJobs());
    setQuotes(getQuotes());
  }, []);

  // Derive selected job
  const selectedJob = jobs.find((j) => j.id === fields.jobId) ?? null;

  // Field setter helpers
  function setField<K extends keyof FormFields>(key: K, val: FormFields[K]) {
    setFields((prev) => ({ ...prev, [key]: val }));
    setGeneratedText(""); // reset preview on edit
    setShowPreview(false);
  }

  // Generate text
  function handleGenerate() {
    if (!selectedJob) return;
    const text = generateQuoteText(selectedJob, {
      diagnostics: numVal(fields.diagnostics),
      repairLabor: numVal(fields.repairLabor),
      extraWork: numVal(fields.extraWork),
      parts: fields.parts,
      pickupDelivery: numVal(fields.pickupDelivery),
      discount: numVal(fields.discount),
      notes: fields.notes,
    });
    setGeneratedText(text);
    setShowPreview(true);
  }

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [generatedText]);

  // Save quote
  function handleSave() {
    if (!selectedJob) return;
    const q = formToQuote(fields, editingId ?? undefined);
    q.customerName = selectedJob.customerName;
    saveQuote(q);
    setQuotes(getQuotes());
    setEditingId(q.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Load quote into builder
  function handleLoadQuote(quote: Quote) {
    setFields(quoteToForm(quote));
    setEditingId(quote.id);
    setGeneratedText("");
    setShowPreview(false);
    // scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Delete quote
  function handleDeleteQuote(id: string) {
    deleteQuote(id);
    setQuotes(getQuotes());
    if (editingId === id) {
      setFields(BLANK);
      setEditingId(null);
      setGeneratedText("");
      setShowPreview(false);
    }
  }

  // Reset builder
  function handleReset() {
    setFields(BLANK);
    setEditingId(null);
    setGeneratedText("");
    setShowPreview(false);
  }

  const canGenerate = !!selectedJob;
  const canSave = !!selectedJob;

  return (
    <div className="flex flex-col gap-6 p-4 pb-10 max-w-2xl mx-auto w-full">
      {/* Page header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-[#f1f5f9]">Offert</h1>
          <p className="text-sm text-[#94a3b8]">Skapa och hantera kundofferter</p>
        </div>
        {editingId && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Ny offert
          </Button>
        )}
      </div>

      {/* ── Quote builder ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>
            {editingId ? "Redigera offert" : "Ny offert"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">

          {/* Job selector */}
          <div>
            <SectionLabel>Kund / Jobb</SectionLabel>
            <Select
              value={fields.jobId}
              onChange={(e) => setField("jobId", e.target.value)}
            >
              <option value="">— Välj kund/jobb —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.customerName}
                  {j.brandModel ? ` – ${j.brandModel}` : ""}
                  {j.vehicleType && !j.brandModel ? ` – ${j.vehicleType}` : ""}
                </option>
              ))}
            </Select>
            {selectedJob && (
              <p className="mt-1.5 text-xs text-[#94a3b8]">
                {[selectedJob.vehicleType, selectedJob.brandModel]
                  .filter(Boolean)
                  .join(" · ")}
                {selectedJob.problem
                  ? ` · ${selectedJob.problem.slice(0, 60)}${selectedJob.problem.length > 60 ? "…" : ""}`
                  : ""}
              </p>
            )}
          </div>

          {/* Line items */}
          <div>
            <SectionLabel>Poster</SectionLabel>
            <div className="flex flex-col gap-3">
              <AmountRow
                label="Felsökning / Diagnostik"
                value={fields.diagnostics}
                onChange={(v) => setField("diagnostics", v)}
              />
              <AmountRow
                label="Reparation arbete"
                value={fields.repairLabor}
                onChange={(v) => setField("repairLabor", v)}
              />
              <AmountRow
                label="Extraarbete"
                value={fields.extraWork}
                onChange={(v) => setField("extraWork", v)}
              />
            </div>
          </div>

          {/* Parts */}
          <div>
            <SectionLabel>Delar</SectionLabel>
            <PartsEditor
              parts={fields.parts}
              onChange={(p) => setField("parts", p)}
            />
          </div>

          {/* Pickup/delivery */}
          <div className="flex flex-col gap-3">
            <AmountRow
              label="Hämtning / Lämning"
              value={fields.pickupDelivery}
              onChange={(v) => setField("pickupDelivery", v)}
            />
          </div>

          {/* Discount */}
          <div className="border-t border-[#1e2230] pt-4 flex flex-col gap-3">
            <AmountRow
              label="Rabatt"
              value={fields.discount}
              onChange={(v) => setField("discount", v)}
              negative
            />
          </div>

          {/* Notes */}
          <div>
            <SectionLabel>Anteckningar</SectionLabel>
            <Textarea
              value={fields.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Eventuella kommentarer som inkluderas i offerten..."
              rows={3}
            />
          </div>

          {/* Summary */}
          <SummaryBar fields={fields} />

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              className="flex-1 gap-2"
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              <FileText size={16} />
              {showPreview ? "Uppdatera text" : "Generera offerttext"}
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSave}
              disabled={!canSave}
            >
              {saved ? (
                <>
                  <Check size={16} />
                  Sparad!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Spara offert
                </>
              )}
            </Button>
          </div>

          {/* Generated text */}
          {showPreview && generatedText && (
            <GeneratedTextPanel
              text={generatedText}
              onCopy={handleCopy}
              copied={copied}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Saved quotes ──────────────────────────────────────────────── */}
      {quotes.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#f1f5f9]">
              Sparade offerter
            </h2>
            <span className="text-xs text-[#94a3b8]">{quotes.length} st</span>
          </div>
          <div className="flex flex-col gap-2">
            {quotes.map((q) => (
              <SavedQuoteCard
                key={q.id}
                quote={q}
                onLoad={() => handleLoadQuote(q)}
                onDelete={() => handleDeleteQuote(q.id)}
              />
            ))}
          </div>
        </div>
      )}

      {quotes.length === 0 && (
        <div className="text-center text-sm text-[#94a3b8] py-6">
          Inga sparade offerter ännu.
        </div>
      )}
    </div>
  );
}
