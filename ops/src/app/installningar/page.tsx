"use client";

import { useState, useEffect, useRef } from "react";
import {
  getSettings,
  saveSettings,
  exportAllData,
  importAllData,
  DEFAULT_SETTINGS,
} from "@/lib/storage";
import {
  getSeedJobs,
  getSeedPricing,
  getSeedContentIdeas,
} from "@/lib/seed";
import { saveJob, savePricingItem, saveContentIdea } from "@/lib/storage";
import { AppSettings } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Save,
  Download,
  Upload,
  RefreshCw,
  Building2,
  Database,
  Plug,
  Check,
} from "lucide-react";

// ─── Label + field wrapper ────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#f1f5f9]">{label}</label>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InstallningarPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  // --- Company form helpers ---

  function update(key: keyof AppSettings, value: string | number) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // --- Export ---

  function handleExport() {
    const json = exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nordic-ops-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Import ---

  function handleImportClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        importAllData(text);
        setSettings(getSettings());
        setImportError(null);
        // Reset input so the same file can be re-imported if needed
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch {
        setImportError("Ogiltig fil. Kontrollera att det är en giltig JSON-exportfil.");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  // --- Seed reset ---

  function handleResetSeed() {
    getSeedJobs().forEach(saveJob);
    getSeedPricing().forEach(savePricingItem);
    getSeedContentIdeas().forEach(saveContentIdea);
    setResetConfirmOpen(false);
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Inställningar</h1>
        <p className="mt-0.5 text-sm text-[#94a3b8]">
          Hantera företagsinformation, data och integrationer
        </p>
      </div>

      {/* ── Company settings ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-green-400" />
            <CardTitle>Företagsinformation</CardTitle>
          </div>
          <CardDescription>
            Grundinformation som används i offerter och kommunikation
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Företagsnamn">
            <Input
              placeholder="Nordic E-Mobility"
              value={settings.companyName}
              onChange={(e) => update("companyName", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Telefon">
              <Input
                type="tel"
                placeholder="070-000 00 00"
                value={settings.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </Field>
            <Field label="E-post">
              <Input
                type="email"
                placeholder="info@nordic-emobility.se"
                value={settings.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Adress">
            <Input
              placeholder="Verkstadsgatan 1, 123 45 Stockholm"
              value={settings.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Standardrabatt (%)">
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={settings.defaultDiscount}
                onChange={(e) =>
                  update("defaultDiscount", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Standardavgift hämtning/lämning (kr)">
              <Input
                type="number"
                min={0}
                placeholder="299"
                value={settings.defaultPickupFee}
                onChange={(e) =>
                  update("defaultPickupFee", Number(e.target.value))
                }
              />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} className="min-w-[140px]">
              {saved ? (
                <>
                  <Check size={16} />
                  Sparat!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Spara inställningar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Data management ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database size={18} className="text-green-400" />
            <CardTitle>Datahantering</CardTitle>
          </div>
          <CardDescription>
            Exportera, importera eller återställ all appdata
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Export */}
            <div className="flex flex-col gap-2 rounded-lg border border-[#1e2230] p-4">
              <p className="text-sm font-semibold text-[#f1f5f9]">
                Exportera data
              </p>
              <p className="text-xs text-[#94a3b8]">
                Ladda ner all data som en JSON-fil
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-auto"
                onClick={handleExport}
              >
                <Download size={15} />
                Exportera
              </Button>
            </div>

            {/* Import */}
            <div className="flex flex-col gap-2 rounded-lg border border-[#1e2230] p-4">
              <p className="text-sm font-semibold text-[#f1f5f9]">
                Importera data
              </p>
              <p className="text-xs text-[#94a3b8]">
                Återställ från en tidigare exportfil
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="secondary"
                size="sm"
                className="mt-auto"
                onClick={handleImportClick}
              >
                <Upload size={15} />
                Importera
              </Button>
            </div>

            {/* Seed reset */}
            <div className="flex flex-col gap-2 rounded-lg border border-[#1e2230] p-4">
              <p className="text-sm font-semibold text-[#f1f5f9]">
                Återställ demodata
              </p>
              <p className="text-xs text-[#94a3b8]">
                Lägg tillbaka exempeldata (befintlig data behålls)
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-auto border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={() => setResetConfirmOpen(true)}
              >
                <RefreshCw size={15} />
                Återställ
              </Button>
            </div>
          </div>

          {/* Import error */}
          {importError && (
            <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-400">
              {importError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Future integrations ──────────────────────────────────────────── */}
      <Card className="opacity-75">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug size={18} className="text-[#94a3b8]" />
            <CardTitle className="text-[#94a3b8]">Integrationer</CardTitle>
          </div>
          <CardDescription>
            Molnsynkronisering och webhooks —{" "}
            <span className="italic">kommer i framtida version</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Supabase URL">
            <Input
              disabled
              placeholder="https://xyzcompany.supabase.co"
            />
          </Field>
          <Field label="API-nyckel">
            <Input
              disabled
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />
          </Field>
          <Field label="Webhook URL">
            <Input
              disabled
              placeholder="https://hooks.example.com/nordic-ops"
            />
          </Field>
          <p className="text-xs text-[#94a3b8] italic">
            Dessa fält är inaktiverade och kommer att aktiveras när
            molnintegration är implementerad.
          </p>
        </CardContent>
      </Card>

      {/* ── Reset seed confirmation dialog ───────────────────────────────── */}
      <Dialog
        open={resetConfirmOpen}
        onOpenChange={(open) => !open && setResetConfirmOpen(false)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Återställ demodata?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#94a3b8]">
            Detta lägger till exempeljobb, priser och innehållsidéer.
            Befintlig data raderas inte men kan dupliceras om du kör detta
            flera gånger.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Avbryt</Button>
            </DialogClose>
            <Button
              variant="outline"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={handleResetSeed}
            >
              <RefreshCw size={15} />
              Ja, återställ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
