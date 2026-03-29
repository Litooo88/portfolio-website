"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  CreditCard,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Plus,
  FileText,
  Download,
  AlertCircle,
  Clock,
  Wrench,
  ChevronRight,
  Search,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getJobs,
  getPricing,
  getContentIdeas,
  saveJob,
  savePricingItem,
  saveContentIdea,
  importBooking,
} from "@/lib/storage";
import { getSeedJobs, getSeedPricing, getSeedContentIdeas } from "@/lib/seed";
import { useRefresh } from "@/lib/store";
import { useNewJob } from "@/components/app-shell";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CustomerJob, BookingImportPayload, JobSource } from "@/lib/types";
import { JOB_SOURCES } from "@/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function getStartOfWeek(): Date {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function getEndOfWeek(): Date {
  const start = getStartOfWeek();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function statusBadgeVariant(
  status: CustomerJob["status"]
): "default" | "warning" | "destructive" | "secondary" | "info" | "urgent" {
  switch (status) {
    case "Ny":
      return "info";
    case "Felsökning":
      return "urgent";
    case "Pågår":
      return "default";
    case "Väntar på delar":
      return "warning";
    case "Klar":
      return "default";
    case "Väntar på betalning":
      return "warning";
    case "Slutförd":
      return "secondary";
    default:
      return "secondary";
  }
}

// ─── Import Booking Modal ────────────────────────────────────────────────────

interface ImportBookingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BLANK_IMPORT: BookingImportPayload = {
  customerName: "",
  phone: "",
  email: "",
  vehicleType: "",
  brandModel: "",
  problem: "",
  preferredDate: "",
  pickupDelivery: "",
  campaignCode: "",
  notes: "",
  source: "Website",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">
      {children}
    </label>
  );
}

function FormInput({
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-md border border-[#1e2230] bg-[#1a1e2a] px-3 py-2 text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:border-green-400/50 focus:outline-none focus:ring-1 focus:ring-green-400/30"
    />
  );
}

function FormTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border border-[#1e2230] bg-[#1a1e2a] px-3 py-2 text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:border-green-400/50 focus:outline-none focus:ring-1 focus:ring-green-400/30 resize-none"
    />
  );
}

function FormSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-[#1e2230] bg-[#1a1e2a] px-3 py-2 text-sm text-[#f1f5f9] focus:border-green-400/50 focus:outline-none focus:ring-1 focus:ring-green-400/30"
    >
      {children}
    </select>
  );
}

function ImportBookingModal({
  open,
  onClose,
  onSuccess,
}: ImportBookingModalProps) {
  const [form, setForm] = useState<BookingImportPayload>(BLANK_IMPORT);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function setField<K extends keyof BookingImportPayload>(
    key: K,
    value: BookingImportPayload[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClose() {
    setForm(BLANK_IMPORT);
    setSuccess(false);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      importBooking(form);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importera bokning</DialogTitle>
          <DialogDescription>
            Fyll i kunduppgifter från en extern bokning. Jobbet skapas med status
            &quot;Ny&quot;.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-400/10">
              <CheckCircle2 size={28} className="text-green-400" />
            </div>
            <p className="text-base font-semibold text-[#f1f5f9]">
              Bokning importerad!
            </p>
            <p className="text-sm text-[#94a3b8]">
              Jobbet har lagts till och är redo för hantering.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Customer info */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Namn *</FieldLabel>
                <FormInput
                  value={form.customerName}
                  onChange={(v) => setField("customerName", v)}
                  placeholder="Förnamn Efternamn"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Telefon</FieldLabel>
                <FormInput
                  value={form.phone}
                  onChange={(v) => setField("phone", v)}
                  placeholder="070-000 00 00"
                  type="tel"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <FieldLabel>E-post</FieldLabel>
                <FormInput
                  value={form.email}
                  onChange={(v) => setField("email", v)}
                  placeholder="kund@exempel.se"
                  type="email"
                />
              </div>
            </div>

            {/* Vehicle */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Fordonstyp</FieldLabel>
                <FormInput
                  value={form.vehicleType}
                  onChange={(v) => setField("vehicleType", v)}
                  placeholder="Elsparkcykel / Elcykel"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Märke / Modell</FieldLabel>
                <FormInput
                  value={form.brandModel}
                  onChange={(v) => setField("brandModel", v)}
                  placeholder="Xiaomi Pro 2"
                />
              </div>
            </div>

            {/* Problem */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Problem / Beskrivning</FieldLabel>
              <FormTextarea
                value={form.problem}
                onChange={(v) => setField("problem", v)}
                placeholder="Beskriv problemet..."
                rows={2}
              />
            </div>

            {/* Logistics */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Önskat datum</FieldLabel>
                <FormInput
                  value={form.preferredDate}
                  onChange={(v) => setField("preferredDate", v)}
                  type="date"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Hämtning / Lämning</FieldLabel>
                <FormInput
                  value={form.pickupDelivery}
                  onChange={(v) => setField("pickupDelivery", v)}
                  placeholder="Kunden lämnar / Hämtning"
                />
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Kampanjkod</FieldLabel>
                <FormInput
                  value={form.campaignCode}
                  onChange={(v) => setField("campaignCode", v)}
                  placeholder="SOMMAR25"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Källa</FieldLabel>
                <FormSelect
                  value={form.source}
                  onChange={(v) => setField("source", v as JobSource)}
                >
                  {JOB_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </FormSelect>
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Anteckningar (interna)</FieldLabel>
              <FormTextarea
                value={form.notes}
                onChange={(v) => setField("notes", v)}
                placeholder="Interna anteckningar om bokningen..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={loading || !form.customerName.trim()}>
                <Download size={16} />
                Importera bokning
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: "green" | "amber" | "red" | "blue" | "muted";
  sub?: string;
}

const accentClasses: Record<StatCardProps["accent"], { icon: string; value: string; bg: string }> = {
  green: {
    icon: "text-green-400",
    value: "text-green-400",
    bg: "bg-green-400/10",
  },
  amber: {
    icon: "text-amber-400",
    value: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  red: {
    icon: "text-red-400",
    value: "text-red-400",
    bg: "bg-red-400/10",
  },
  blue: {
    icon: "text-blue-400",
    value: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  muted: {
    icon: "text-[#94a3b8]",
    value: "text-[#f1f5f9]",
    bg: "bg-[#1e2230]",
  },
};

function StatCard({ icon, label, value, accent, sub }: StatCardProps) {
  const cls = accentClasses[accent];
  return (
    <Card className="flex flex-col gap-0">
      <CardContent className="pt-4 pb-4 flex flex-col gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cls.bg}`}>
          <span className={cls.icon}>{icon}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className={`text-2xl font-bold tabular-nums ${cls.value}`}>
            {value}
          </span>
          <span className="text-xs text-[#94a3b8] leading-tight">{label}</span>
          {sub && (
            <span className="text-xs text-[#64748b] mt-0.5">{sub}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Job Focus Row ────────────────────────────────────────────────────────────

function JobFocusRow({ job }: { job: CustomerJob }) {
  const badgeVariant = statusBadgeVariant(job.status);
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#1e2230] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[#f1f5f9] truncate">
            {job.customerName}
          </span>
          <Badge variant={badgeVariant as Parameters<typeof Badge>[0]["variant"]}>
            {job.status}
          </Badge>
        </div>
        <p className="text-xs text-[#94a3b8] mt-0.5 truncate">
          {[job.vehicleType, job.brandModel].filter(Boolean).join(" · ")}
          {job.problem
            ? ` · ${job.problem.slice(0, 50)}${job.problem.length > 50 ? "…" : ""}`
            : ""}
        </p>
        {job.nextStep && (
          <p className="text-xs text-[#64748b] mt-1 flex items-center gap-1">
            <ChevronRight size={11} className="shrink-0" />
            {job.nextStep}
          </p>
        )}
      </div>
      {job.price > 0 && (
        <span className="text-sm font-semibold text-[#f1f5f9] shrink-0">
          {formatCurrency(job.price)}
        </span>
      )}
    </div>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  description,
  onClick,
  href,
  accent = "default",
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick?: () => void;
  href?: string;
  accent?: "green" | "default";
}) {
  const inner = (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border transition-colors cursor-pointer group
        ${
          accent === "green"
            ? "border-green-400/30 bg-green-400/5 hover:bg-green-400/10"
            : "border-[#1e2230] bg-[#161922] hover:bg-[#1b2030]"
        }`}
      onClick={onClick}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
          ${
            accent === "green"
              ? "bg-green-400/15 text-green-400"
              : "bg-[#1e2230] text-[#94a3b8] group-hover:text-[#f1f5f9]"
          }`}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-0 min-w-0">
        <span
          className={`text-sm font-semibold leading-tight ${
            accent === "green" ? "text-green-400" : "text-[#f1f5f9]"
          }`}
        >
          {label}
        </span>
        <span className="text-xs text-[#64748b] leading-tight">{description}</span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [jobs, setJobs] = useState<CustomerJob[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const { tick } = useRefresh();
  const { setOpen: setNewJobOpen } = useNewJob();

  // Load data and optionally seed
  useEffect(() => {
    const existing = getJobs();
    if (existing.length === 0 && !seeded) {
      // Seed all data
      const seedJobs = getSeedJobs();
      seedJobs.forEach((j) => saveJob(j));

      const seedPricing = getSeedPricing();
      seedPricing.forEach((p) => savePricingItem(p));

      const seedContent = getSeedContentIdeas();
      seedContent.forEach((c) => saveContentIdea(c));

      setSeeded(true);
      setJobs(getJobs());
    } else {
      setJobs(existing);
    }
  }, [tick, seeded]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const activeJobs = jobs.filter((j) => j.status !== "Slutförd");

  const awaitingPayment = jobs.filter(
    (j) =>
      j.paymentStatus !== "Betald" &&
      (j.status === "Klar" || j.status === "Väntar på betalning")
  );

  const newLeads = jobs.filter((j) => j.status === "Ny");

  const weekStart = getStartOfWeek();
  const weekEnd = getEndOfWeek();
  const completedThisWeek = jobs.filter((j) => {
    if (j.status !== "Slutförd") return false;
    const d = new Date(j.createdAt);
    return d >= weekStart && d <= weekEnd;
  });

  const estimatedRevenue = activeJobs.reduce((sum, j) => sum + j.price, 0);

  // ── Today's focus ──────────────────────────────────────────────────────────

  const needsAttention = jobs.filter(
    (j) => j.status === "Ny" || j.status === "Felsökning"
  );

  const paymentDue = jobs.filter(
    (j) =>
      j.paymentStatus !== "Betald" &&
      (j.status === "Klar" || j.status === "Väntar på betalning")
  );

  const inProgress = jobs.filter(
    (j) =>
      j.status === "Pågår" ||
      j.status === "Väntar på delar"
  );

  function handleImportSuccess() {
    setJobs(getJobs());
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-10 max-w-5xl mx-auto w-full">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-[#f1f5f9]">Instrumentpanel</h1>
          <p className="text-sm text-[#94a3b8]">
            {new Date().toLocaleDateString("sv-SE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => setNewJobOpen(true)}
          className="gap-1.5 shrink-0"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nytt jobb</span>
        </Button>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={<Activity size={18} />}
          label="Aktiva jobb"
          value={activeJobs.length}
          accent="green"
        />
        <StatCard
          icon={<CreditCard size={18} />}
          label="Väntar på betalning"
          value={awaitingPayment.length}
          accent={awaitingPayment.length > 0 ? "amber" : "muted"}
        />
        <StatCard
          icon={<Sparkles size={18} />}
          label="Nya leads"
          value={newLeads.length}
          accent={newLeads.length > 0 ? "blue" : "muted"}
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Klara denna vecka"
          value={completedThisWeek.length}
          accent="muted"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Beräknad intäkt"
          value={
            estimatedRevenue > 0
              ? formatCurrency(estimatedRevenue)
              : "–"
          }
          accent="green"
          sub="aktiva jobb"
        />
      </div>

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#64748b] mb-3">
          Snabbåtgärder
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            icon={<Plus size={20} />}
            label="Ny kund / nytt jobb"
            description="Registrera ett nytt ärende"
            onClick={() => setNewJobOpen(true)}
            accent="green"
          />
          <QuickAction
            icon={<FileText size={20} />}
            label="Skapa offert"
            description="Bygg och skicka en offert"
            href="/offert"
          />
          <QuickAction
            icon={<Download size={20} />}
            label="Importera bokning"
            description="Från extern källa eller formulär"
            onClick={() => setImportOpen(true)}
          />
          <QuickAction
            icon={<Search size={20} />}
            label="Alla jobb"
            description="Översikt och filtrering"
            href="/jobb"
          />
        </div>
      </div>

      {/* ── Today's focus ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Needs attention */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400" />
              <CardTitle className="text-sm">Kräver åtgärd</CardTitle>
              {needsAttention.length > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {needsAttention.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {needsAttention.length === 0 ? (
              <p className="text-xs text-[#64748b] py-2">
                Inga jobb kräver åtgärd just nu.
              </p>
            ) : (
              <div>
                {needsAttention.map((job) => (
                  <JobFocusRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Awaiting payment */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <CardTitle className="text-sm">Väntar på betalning</CardTitle>
              {paymentDue.length > 0 && (
                <Badge variant="warning" className="ml-auto">
                  {paymentDue.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {paymentDue.length === 0 ? (
              <p className="text-xs text-[#64748b] py-2">
                Inga obetalda klara jobb.
              </p>
            ) : (
              <div>
                {paymentDue.map((job) => (
                  <JobFocusRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* In progress */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-green-400" />
              <CardTitle className="text-sm">Pågående jobb</CardTitle>
              {inProgress.length > 0 && (
                <Badge variant="default" className="ml-auto">
                  {inProgress.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {inProgress.length === 0 ? (
              <p className="text-xs text-[#64748b] py-2">
                Inga pågående jobb just nu.
              </p>
            ) : (
              <div>
                {inProgress.map((job) => (
                  <JobFocusRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent activity ──────────────────────────────────────────── */}
      {jobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#64748b]">
              Senaste jobb
            </h2>
            <Link
              href="/jobb"
              className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
            >
              Visa alla <ChevronRight size={13} />
            </Link>
          </div>
          <Card>
            <CardContent className="pt-4 pb-2">
              {jobs.slice(0, 6).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-3 py-2.5 border-b border-[#1e2230] last:border-0"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e2230] text-[#94a3b8]">
                    <Zap size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#f1f5f9] truncate">
                        {job.customerName}
                      </span>
                      <Badge
                        variant={
                          statusBadgeVariant(
                            job.status
                          ) as Parameters<typeof Badge>[0]["variant"]
                        }
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#64748b] truncate">
                      {[job.vehicleType, job.brandModel]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {job.price > 0 && (
                      <span className="text-sm font-semibold text-[#f1f5f9]">
                        {formatCurrency(job.price)}
                      </span>
                    )}
                    <span className="text-xs text-[#64748b]">
                      {formatDate(job.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Import Booking Modal ─────────────────────────────────────── */}
      <ImportBookingModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
