"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  ChevronRight,
  Bike,
  User,
  Phone,
  Mail,
  Calendar,
  ArrowRight,
  CreditCard,
  MapPin,
  Tag,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { getJobs, saveJob, deleteJob, createCustomerJob } from "@/lib/storage";
import { formatDate, formatCurrency } from "@/lib/utils";
import { generateId } from "@/lib/utils";
import {
  CustomerJob,
  JobStatus,
  PaymentStatus,
  JobSource,
  JOB_STATUSES,
  PAYMENT_STATUSES,
  JOB_SOURCES,
} from "@/lib/types";
import { useRefresh } from "@/lib/store";
import { useNewJob } from "@/components/app-shell";
import { cn } from "@/lib/utils";

// ─── Status / badge helpers ───────────────────────────────────────────────────

type BadgeVariant =
  | "info"
  | "warning"
  | "default"
  | "destructive"
  | "secondary"
  | "outline"
  | "active"
  | "waiting"
  | "urgent"
  | "unpaid";

function statusBadgeVariant(status: JobStatus): BadgeVariant {
  switch (status) {
    case "Ny":
      return "info";
    case "Felsökning":
      return "warning";
    case "Pågår":
      return "active";
    case "Väntar på delar":
      return "warning";
    case "Klar":
      return "default";
    case "Väntar på betalning":
      return "destructive";
    case "Slutförd":
      return "secondary";
  }
}

function paymentBadgeVariant(status: PaymentStatus): BadgeVariant {
  switch (status) {
    case "Ej betald":
      return "unpaid";
    case "Delbetald":
      return "warning";
    case "Betald":
      return "default";
  }
}

function sourceBadgeVariant(_source: JobSource): BadgeVariant {
  return "outline";
}

// ─── Status filter tabs ───────────────────────────────────────────────────────

const STATUS_FILTERS: Array<JobStatus | "Alla"> = [
  "Alla",
  ...JOB_STATUSES,
];

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  customerName: "",
  phone: "",
  email: "",
  vehicleType: "",
  brandModel: "",
  problem: "",
  internalNotes: "",
  status: "Ny" as JobStatus,
  price: "",
  paymentStatus: "Ej betald" as PaymentStatus,
  source: "Walk-in" as JobSource,
  nextStep: "",
  preferredDate: "",
  pickupDelivery: "",
  campaignCode: "",
};

type FormState = typeof EMPTY_FORM;

// ─── Form field helper ────────────────────────────────────────────────────────

function LabeledField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#f1f5f9]">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Job form dialog ──────────────────────────────────────────────────────────

function JobFormDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: CustomerJob | null;
  onClose: () => void;
  onSave: (job: CustomerJob) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          customerName: initial.customerName,
          phone: initial.phone,
          email: initial.email,
          vehicleType: initial.vehicleType,
          brandModel: initial.brandModel,
          problem: initial.problem,
          internalNotes: initial.internalNotes,
          status: initial.status,
          price: initial.price === 0 ? "" : String(initial.price),
          paymentStatus: initial.paymentStatus,
          source: initial.source,
          nextStep: initial.nextStep,
          preferredDate: initial.preferredDate,
          pickupDelivery: initial.pickupDelivery,
          campaignCode: initial.campaignCode,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [open, initial]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.customerName.trim()) next.customerName = "Ange kundens namn";
    if (!form.vehicleType.trim()) next.vehicleType = "Ange fordonstyp";
    if (!form.problem.trim()) next.problem = "Beskriv problemet";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const jobData: CustomerJob = {
      id: initial?.id ?? generateId(),
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      vehicleType: form.vehicleType.trim(),
      brandModel: form.brandModel.trim(),
      problem: form.problem.trim(),
      internalNotes: form.internalNotes.trim(),
      status: form.status,
      price: form.price !== "" ? Number(form.price) : 0,
      paymentStatus: form.paymentStatus,
      source: form.source,
      nextStep: form.nextStep.trim(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      preferredDate: form.preferredDate,
      pickupDelivery: form.pickupDelivery.trim(),
      campaignCode: form.campaignCode.trim(),
    };

    onSave(jobData);
  }

  const isEditing = initial !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Redigera jobb" : "Nytt jobb"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Customer section */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Kundinformation
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <LabeledField label="Kundnamn *" error={errors.customerName}>
                <Input
                  name="customerName"
                  placeholder="Anna Lindgren"
                  value={form.customerName}
                  onChange={handleChange}
                />
              </LabeledField>
              <LabeledField label="Telefon">
                <Input
                  name="phone"
                  type="tel"
                  placeholder="070-000 00 00"
                  value={form.phone}
                  onChange={handleChange}
                />
              </LabeledField>
              <LabeledField label="E-post">
                <Input
                  name="email"
                  type="email"
                  placeholder="anna@exempel.se"
                  value={form.email}
                  onChange={handleChange}
                />
              </LabeledField>
              <LabeledField label="Kampanjkod">
                <Input
                  name="campaignCode"
                  placeholder="t.ex. VÅR25"
                  value={form.campaignCode}
                  onChange={handleChange}
                />
              </LabeledField>
            </div>
          </div>

          {/* Vehicle section */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Fordon
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <LabeledField label="Fordonstyp *" error={errors.vehicleType}>
                <Input
                  name="vehicleType"
                  placeholder="t.ex. Elcykel, Elsparkcykel"
                  value={form.vehicleType}
                  onChange={handleChange}
                />
              </LabeledField>
              <LabeledField label="Märke/Modell">
                <Input
                  name="brandModel"
                  placeholder="t.ex. Specialized Turbo Vado"
                  value={form.brandModel}
                  onChange={handleChange}
                />
              </LabeledField>
            </div>
          </div>

          {/* Problem / notes */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Ärendebeskrivning
            </p>
            <div className="flex flex-col gap-3">
              <LabeledField label="Problem/Beställning *" error={errors.problem}>
                <Textarea
                  name="problem"
                  placeholder="Beskriv kundens problem eller önskemål…"
                  value={form.problem}
                  onChange={handleChange}
                  className="min-h-[80px]"
                />
              </LabeledField>
              <LabeledField label="Interna anteckningar">
                <Textarea
                  name="internalNotes"
                  placeholder="Interna noteringar (syns ej för kund)…"
                  value={form.internalNotes}
                  onChange={handleChange}
                  className="min-h-[60px]"
                />
              </LabeledField>
              <LabeledField label="Nästa steg">
                <Input
                  name="nextStep"
                  placeholder="t.ex. Beställ batteri, Ring kund"
                  value={form.nextStep}
                  onChange={handleChange}
                />
              </LabeledField>
            </div>
          </div>

          {/* Status / payment / price */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Status &amp; Betalning
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <LabeledField label="Status">
                <Select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  {JOB_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </LabeledField>
              <LabeledField label="Betalningsstatus">
                <Select
                  name="paymentStatus"
                  value={form.paymentStatus}
                  onChange={handleChange}
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </LabeledField>
              <LabeledField label="Pris (kr)">
                <Input
                  name="price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.price}
                  onChange={handleChange}
                />
              </LabeledField>
            </div>
          </div>

          {/* Logistics */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Logistik &amp; Källa
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <LabeledField label="Önskat datum">
                <Input
                  name="preferredDate"
                  type="date"
                  value={form.preferredDate}
                  onChange={handleChange}
                />
              </LabeledField>
              <LabeledField label="Hämtning/Lämning">
                <Input
                  name="pickupDelivery"
                  placeholder="t.ex. Hämtning hemma"
                  value={form.pickupDelivery}
                  onChange={handleChange}
                />
              </LabeledField>
              <LabeledField label="Källa">
                <Select
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                >
                  {JOB_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </LabeledField>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit">
              {isEditing ? "Spara ändringar" : "Skapa jobb"}
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

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteConfirmDialog({
  job,
  onConfirm,
  onCancel,
}: {
  job: CustomerJob | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={job !== null} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ta bort jobb?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#94a3b8]">
          Vill du permanent ta bort jobbet för{" "}
          <span className="font-semibold text-[#f1f5f9]">
            {job?.customerName}
          </span>
          ? Det går inte att ångra.
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

// ─── Quick status/payment change dialog ───────────────────────────────────────

function QuickStatusDialog({
  job,
  onClose,
  onSave,
}: {
  job: CustomerJob | null;
  onClose: () => void;
  onSave: (updated: CustomerJob) => void;
}) {
  const [status, setStatus] = useState<JobStatus>("Ny");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("Ej betald");

  useEffect(() => {
    if (job) {
      setStatus(job.status);
      setPaymentStatus(job.paymentStatus);
    }
  }, [job]);

  function handleSave() {
    if (!job) return;
    onSave({ ...job, status, paymentStatus });
  }

  return (
    <Dialog open={job !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ändra status</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <LabeledField label="Jobbstatus">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as JobStatus)}
            >
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </LabeledField>
          <LabeledField label="Betalningsstatus">
            <Select
              value={paymentStatus}
              onChange={(e) =>
                setPaymentStatus(e.target.value as PaymentStatus)
              }
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </LabeledField>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Spara</Button>
          <DialogClose asChild>
            <Button variant="secondary" onClick={onClose}>
              Avbryt
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Job detail dialog ────────────────────────────────────────────────────────

function JobDetailDialog({
  job,
  onClose,
  onEdit,
  onDelete,
}: {
  job: CustomerJob | null;
  onClose: () => void;
  onEdit: (job: CustomerJob) => void;
  onDelete: (job: CustomerJob) => void;
}) {
  if (!job) return null;

  return (
    <Dialog open={job !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User size={18} className="text-[#94a3b8]" />
            {job.customerName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusBadgeVariant(job.status)}>{job.status}</Badge>
            <Badge variant={paymentBadgeVariant(job.paymentStatus)}>
              {job.paymentStatus}
            </Badge>
            <Badge variant={sourceBadgeVariant(job.source)}>{job.source}</Badge>
            {job.price > 0 && (
              <Badge variant="outline" className="font-mono tabular-nums">
                {formatCurrency(job.price)}
              </Badge>
            )}
          </div>

          {/* Two-column detail grid */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {/* Fordon */}
            <DetailRow
              icon={<Bike size={14} />}
              label="Fordon"
              value={[job.vehicleType, job.brandModel]
                .filter(Boolean)
                .join(" — ")}
            />
            {/* Phone */}
            {job.phone && (
              <DetailRow
                icon={<Phone size={14} />}
                label="Telefon"
                value={job.phone}
              />
            )}
            {/* Email */}
            {job.email && (
              <DetailRow
                icon={<Mail size={14} />}
                label="E-post"
                value={job.email}
              />
            )}
            {/* Preferred date */}
            {job.preferredDate && (
              <DetailRow
                icon={<Calendar size={14} />}
                label="Önskat datum"
                value={formatDate(job.preferredDate)}
              />
            )}
            {/* Created */}
            <DetailRow
              icon={<Calendar size={14} />}
              label="Skapad"
              value={formatDate(job.createdAt)}
            />
            {/* Pickup/delivery */}
            {job.pickupDelivery && (
              <DetailRow
                icon={<MapPin size={14} />}
                label="Hämtning/Lämning"
                value={job.pickupDelivery}
              />
            )}
            {/* Campaign code */}
            {job.campaignCode && (
              <DetailRow
                icon={<Tag size={14} />}
                label="Kampanjkod"
                value={job.campaignCode}
              />
            )}
            {/* Next step */}
            {job.nextStep && (
              <DetailRow
                icon={<ArrowRight size={14} />}
                label="Nästa steg"
                value={job.nextStep}
                className="sm:col-span-2"
              />
            )}
          </div>

          {/* Problem */}
          <div className="flex flex-col gap-1.5 rounded-lg border border-[#1e2230] bg-[#0f1117] p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#475569]">
              <FileText size={12} />
              Problem / Beställning
            </p>
            <p className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-wrap">
              {job.problem}
            </p>
          </div>

          {/* Internal notes */}
          {job.internalNotes && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-500/80">
                Interna anteckningar
              </p>
              <p className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-wrap">
                {job.internalNotes}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onClose();
              onDelete(job);
            }}
          >
            <Trash2 size={15} />
            Ta bort
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Stäng
              </Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onEdit(job);
              }}
            >
              <Pencil size={15} />
              Redigera
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <p className="flex items-center gap-1 text-xs text-[#475569]">
        <span className="text-[#475569]">{icon}</span>
        {label}
      </p>
      <p className="text-sm text-[#f1f5f9]">{value}</p>
    </div>
  );
}

// ─── Job card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  onCardClick,
  onEdit,
  onQuickStatus,
  onDelete,
}: {
  job: CustomerJob;
  onCardClick: (job: CustomerJob) => void;
  onEdit: (job: CustomerJob) => void;
  onQuickStatus: (job: CustomerJob) => void;
  onDelete: (job: CustomerJob) => void;
}) {
  return (
    <Card
      className="group cursor-pointer transition-colors hover:border-[#2a3040] active:border-[#3a4050]"
      onClick={() => onCardClick(job)}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        {/* Top row: name + chevron */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-base font-semibold text-[#f1f5f9] leading-tight truncate">
              {job.customerName}
            </span>
            <span className="flex items-center gap-1 text-xs text-[#64748b]">
              <Bike size={11} className="shrink-0" />
              <span className="truncate">
                {[job.vehicleType, job.brandModel].filter(Boolean).join(" · ")}
              </span>
            </span>
          </div>
          <ChevronRight
            size={16}
            className="shrink-0 mt-0.5 text-[#334155] transition-colors group-hover:text-[#94a3b8]"
          />
        </div>

        {/* Problem */}
        <p className="line-clamp-2 text-sm text-[#94a3b8] leading-relaxed">
          {job.problem}
        </p>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={statusBadgeVariant(job.status)}>{job.status}</Badge>
          <Badge variant={paymentBadgeVariant(job.paymentStatus)}>
            {job.paymentStatus}
          </Badge>
          <Badge variant={sourceBadgeVariant(job.source)} className="text-[10px]">
            {job.source}
          </Badge>
          {job.price > 0 && (
            <Badge variant="outline" className="font-mono tabular-nums text-[10px]">
              {formatCurrency(job.price)}
            </Badge>
          )}
        </div>

        {/* Next step */}
        {job.nextStep && (
          <div className="flex items-center gap-1.5 rounded-md border border-[#1e2230] bg-[#0f1117] px-2.5 py-1.5">
            <ArrowRight size={12} className="shrink-0 text-green-400" />
            <span className="text-xs text-[#94a3b8] truncate">{job.nextStep}</span>
          </div>
        )}

        {/* Action row — stop propagation so card click doesn't fire */}
        <div
          className="flex items-center justify-between gap-2 border-t border-[#1e2230] pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[11px] text-[#475569]">
            {formatDate(job.createdAt)}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 min-h-[32px] min-w-[32px]"
              onClick={() => onQuickStatus(job)}
              aria-label="Ändra status"
              title="Ändra status"
            >
              <CreditCard size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 min-h-[32px] min-w-[32px]"
              onClick={() => onEdit(job)}
              aria-label="Redigera"
              title="Redigera"
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 min-h-[32px] min-w-[32px] text-red-400 hover:bg-red-400/10 hover:text-red-400"
              onClick={() => onDelete(job)}
              aria-label="Ta bort"
              title="Ta bort"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function JobbPage() {
  const { refresh, tick } = useRefresh();
  const { open: newJobContextOpen, setOpen: setNewJobContextOpen } = useNewJob();

  const [jobs, setJobs] = useState<CustomerJob[]>([]);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<JobStatus | "Alla">("Alla");

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CustomerJob | null>(null);
  const [deletingJob, setDeletingJob] = useState<CustomerJob | null>(null);
  const [detailJob, setDetailJob] = useState<CustomerJob | null>(null);
  const [quickStatusJob, setQuickStatusJob] = useState<CustomerJob | null>(null);

  // Load jobs on mount and whenever tick changes
  useEffect(() => {
    setJobs(getJobs());
  }, [tick]);

  // Respond to NewJobContext from app-shell (mobile "+" nav button)
  useEffect(() => {
    if (newJobContextOpen) {
      openAdd();
      setNewJobContextOpen(false);
    }
  }, [newJobContextOpen, setNewJobContextOpen]);

  // Counts per status for the filter tabs
  const countsByStatus = useMemo(() => {
    const counts: Record<string, number> = { Alla: jobs.length };
    for (const job of jobs) {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
    }
    return counts;
  }, [jobs]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return jobs.filter((job) => {
      const matchesStatus =
        activeStatus === "Alla" || job.status === activeStatus;
      const matchesSearch =
        !q ||
        job.customerName.toLowerCase().includes(q) ||
        job.vehicleType.toLowerCase().includes(q) ||
        job.brandModel.toLowerCase().includes(q) ||
        job.problem.toLowerCase().includes(q) ||
        job.nextStep.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [jobs, search, activeStatus]);

  // ── Handlers ──

  const openAdd = useCallback(() => {
    setEditingJob(null);
    setFormOpen(true);
  }, []);

  function openEdit(job: CustomerJob) {
    setDetailJob(null);
    setEditingJob(job);
    setFormOpen(true);
  }

  function handleSave(job: CustomerJob) {
    if (editingJob) {
      // Updating an existing job
      saveJob(job);
    } else {
      // Creating a new job — use createCustomerJob to go through the standard factory
      createCustomerJob(job);
    }
    setJobs(getJobs());
    refresh();
    setFormOpen(false);
    setEditingJob(null);
  }

  function handleDeleteRequest(job: CustomerJob) {
    setDetailJob(null);
    setDeletingJob(job);
  }

  function handleDeleteConfirm() {
    if (!deletingJob) return;
    deleteJob(deletingJob.id);
    setJobs(getJobs());
    refresh();
    setDeletingJob(null);
  }

  function handleQuickStatusSave(updated: CustomerJob) {
    saveJob(updated);
    setJobs(getJobs());
    refresh();
    setQuickStatusJob(null);
  }

  return (
    <div className="min-h-screen bg-[#0f1117] pb-28">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 border-b border-[#1e2230] bg-[#0f1117]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4">
          {/* Title row */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-[#f1f5f9] sm:text-xl">
                Kunder &amp; Jobb
              </h1>
              <p className="text-xs text-[#64748b]">
                {jobs.length} {jobs.length === 1 ? "jobb" : "jobb"} totalt
              </p>
            </div>
            {/* Desktop add button */}
            <Button onClick={openAdd} className="hidden sm:flex" size="sm">
              <Plus size={16} />
              Nytt jobb
            </Button>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
            />
            <Input
              placeholder="Sök kund, fordon, problem…"
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

          {/* Status filter strip */}
          <div className="-mx-4 mt-3 overflow-x-auto px-4 scrollbar-none">
            <div className="flex w-max gap-2 pb-1">
              {STATUS_FILTERS.map((status) => {
                const count = countsByStatus[status] ?? 0;
                const isActive = activeStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => setActiveStatus(status)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "border-green-400 bg-green-400/10 text-green-400"
                        : "border-[#1e2230] bg-[#161922] text-[#94a3b8] hover:border-[#2a3040] hover:text-[#f1f5f9]"
                    )}
                  >
                    {status}
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
        {/* Filter summary */}
        {(search || activeStatus !== "Alla") && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[#64748b]">
              Visar{" "}
              <span className="font-medium text-[#94a3b8]">
                {filtered.length}
              </span>{" "}
              {filtered.length === 1 ? "jobb" : "jobb"}
              {activeStatus !== "Alla" && (
                <>
                  {" "}
                  med status{" "}
                  <span className="font-medium text-[#94a3b8]">
                    {activeStatus}
                  </span>
                </>
              )}
              {search && (
                <>
                  {" "}
                  för{" "}
                  <span className="font-medium text-[#94a3b8]">
                    &ldquo;{search}&rdquo;
                  </span>
                </>
              )}
            </p>
            <button
              onClick={() => {
                setSearch("");
                setActiveStatus("Alla");
              }}
              className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
            >
              <X size={12} />
              Rensa
            </button>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1e2230] bg-[#161922]">
              <Bike size={28} className="text-[#334155]" />
            </div>
            {jobs.length === 0 ? (
              <>
                <div>
                  <p className="text-base font-semibold text-[#f1f5f9]">
                    Inga jobb ännu
                  </p>
                  <p className="mt-1 text-sm text-[#64748b]">
                    Skapa ditt första jobb för att komma igång.
                  </p>
                </div>
                <Button onClick={openAdd} size="sm">
                  <Plus size={16} />
                  Skapa jobb
                </Button>
              </>
            ) : (
              <div>
                <p className="text-base font-semibold text-[#f1f5f9]">
                  Inga träffar
                </p>
                <p className="mt-1 text-sm text-[#64748b]">
                  Prova att ändra sökning eller statusfilter.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Job cards grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onCardClick={setDetailJob}
                onEdit={openEdit}
                onQuickStatus={setQuickStatusJob}
                onDelete={handleDeleteRequest}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Floating add button (mobile) ── */}
      <button
        onClick={openAdd}
        className={cn(
          "fixed bottom-24 right-5 z-30 sm:hidden",
          "flex h-14 w-14 items-center justify-center",
          "rounded-full bg-green-400 text-[#0f1117] shadow-lg shadow-green-400/25",
          "transition-transform hover:scale-105 active:scale-95"
        )}
        aria-label="Nytt jobb"
      >
        <Plus size={24} />
      </button>

      {/* ── Dialogs ── */}
      <JobFormDialog
        open={formOpen}
        initial={editingJob}
        onClose={() => {
          setFormOpen(false);
          setEditingJob(null);
        }}
        onSave={handleSave}
      />

      <JobDetailDialog
        job={detailJob}
        onClose={() => setDetailJob(null)}
        onEdit={openEdit}
        onDelete={handleDeleteRequest}
      />

      <QuickStatusDialog
        job={quickStatusJob}
        onClose={() => setQuickStatusJob(null)}
        onSave={handleQuickStatusSave}
      />

      <DeleteConfirmDialog
        job={deletingJob}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingJob(null)}
      />
    </div>
  );
}
