export type JobStatus =
  | "Ny"
  | "Felsökning"
  | "Pågår"
  | "Väntar på delar"
  | "Klar"
  | "Väntar på betalning"
  | "Slutförd";

export type PaymentStatus = "Ej betald" | "Delbetald" | "Betald";

export type JobSource =
  | "Website"
  | "Facebook"
  | "Instagram"
  | "Walk-in"
  | "Referral"
  | "Phone"
  | "Other";

export type ContentType =
  | "Före/Efter"
  | "Felsökning"
  | "Battericase"
  | "Kundcase"
  | "Servicetips";

export type ContentStatus = "Idé" | "Utkast" | "Publicerad";

export interface CustomerJob {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  vehicleType: string;
  brandModel: string;
  problem: string;
  internalNotes: string;
  status: JobStatus;
  price: number;
  paymentStatus: PaymentStatus;
  source: JobSource;
  nextStep: string;
  createdAt: string;
  preferredDate: string;
  pickupDelivery: string;
  campaignCode: string;
}

export interface Quote {
  id: string;
  jobId: string;
  customerName: string;
  diagnostics: number;
  repairLabor: number;
  extraWork: number;
  parts: QuotePart[];
  pickupDelivery: number;
  discount: number;
  notes: string;
  createdAt: string;
}

export interface QuotePart {
  name: string;
  price: number;
}

export interface PricingItem {
  id: string;
  service: string;
  category: string;
  standardPrice: number;
  minPrice: number;
  premiumPrice: number;
  note: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  type: ContentType;
  notes: string;
  status: ContentStatus;
  hook: string;
  problem: string;
  solution: string;
  result: string;
  cta: string;
  createdAt: string;
}

export interface AppSettings {
  companyName: string;
  phone: string;
  email: string;
  address: string;
  defaultDiscount: number;
  defaultPickupFee: number;
  accentColor: string;
}

export interface BookingImportPayload {
  customerName: string;
  phone: string;
  email: string;
  vehicleType: string;
  brandModel: string;
  problem: string;
  preferredDate: string;
  pickupDelivery: string;
  campaignCode: string;
  notes: string;
  source: JobSource;
}

export const JOB_STATUSES: JobStatus[] = [
  "Ny",
  "Felsökning",
  "Pågår",
  "Väntar på delar",
  "Klar",
  "Väntar på betalning",
  "Slutförd",
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "Ej betald",
  "Delbetald",
  "Betald",
];

export const JOB_SOURCES: JobSource[] = [
  "Website",
  "Facebook",
  "Instagram",
  "Walk-in",
  "Referral",
  "Phone",
  "Other",
];

export const CONTENT_TYPES: ContentType[] = [
  "Före/Efter",
  "Felsökning",
  "Battericase",
  "Kundcase",
  "Servicetips",
];

export const CONTENT_STATUSES: ContentStatus[] = [
  "Idé",
  "Utkast",
  "Publicerad",
];

export const PRICING_CATEGORIES = [
  "Felsökning",
  "Service",
  "Punktering",
  "Bromsar",
  "Batteri",
  "Kabeldragning",
  "Hämtning/Lämning",
  "Avancerad felsökning",
];
