// ─── Types ───────────────────────────────────────────────────────────────────

export type SubscriptionStatus = "Active" | "Due Soon" | "Overdue" | "Suspended";
export type TrakzeeStatus = "Active" | "Deactivated";

export interface Subscription {
  id: string;
  customerName: string;
  phone: string;
  plateNumber: string;
  imei: string;
  expiryDate: string;
  status: SubscriptionStatus;
  trakzeeStatus: TrakzeeStatus;
  plan: string;
  monthlyAmount: number;
}

export interface KPIData {
  totalActiveCustomers: number;
  totalMonthlyRevenue: number;
  revenueLeakagePrevented: number;
  pendingDeactivations: number;
}

export interface CSVRow {
  clientName: string;
  phone: string;
  vehicleIMEI: string;
  plan: string;
  expiryDate: string;
}

// ─── KPI Stats ───────────────────────────────────────────────────────────────

export const kpiData: KPIData = {
  totalActiveCustomers: 1243,
  totalMonthlyRevenue: 186450,
  revenueLeakagePrevented: 24300,
  pendingDeactivations: 17,
};

// ─── Subscriptions Table Data ────────────────────────────────────────────────

export const subscriptions: Subscription[] = [
  {
    id: "SUB-001",
    customerName: "Thabo Mokoena",
    phone: "+27 61 234 5678",
    plateNumber: "GP ABC 123",
    imei: "356938035643809",
    expiryDate: "2026-03-01",
    status: "Active",
    trakzeeStatus: "Active",
    plan: "Premium",
    monthlyAmount: 299,
  },
  {
    id: "SUB-002",
    customerName: "Sarah van der Merwe",
    phone: "+27 82 987 6543",
    plateNumber: "WC DEF 456",
    imei: "356938035643810",
    expiryDate: "2026-02-28",
    status: "Due Soon",
    trakzeeStatus: "Active",
    plan: "Standard",
    monthlyAmount: 199,
  },
  {
    id: "SUB-003",
    customerName: "Sipho Ndlovu",
    phone: "+27 73 456 7890",
    plateNumber: "KZN GHI 789",
    imei: "356938035643811",
    expiryDate: "2026-02-20",
    status: "Overdue",
    trakzeeStatus: "Active",
    plan: "Basic",
    monthlyAmount: 99,
  },
  {
    id: "SUB-004",
    customerName: "Fatima Patel",
    phone: "+27 84 321 0987",
    plateNumber: "GP JKL 012",
    imei: "356938035643812",
    expiryDate: "2026-01-15",
    status: "Suspended",
    trakzeeStatus: "Deactivated",
    plan: "Premium",
    monthlyAmount: 299,
  },
  {
    id: "SUB-005",
    customerName: "Johan Botha",
    phone: "+27 76 654 3210",
    plateNumber: "FS MNO 345",
    imei: "356938035643813",
    expiryDate: "2026-03-15",
    status: "Active",
    trakzeeStatus: "Active",
    plan: "Fleet",
    monthlyAmount: 499,
  },
  {
    id: "SUB-006",
    customerName: "Naledi Khumalo",
    phone: "+27 68 789 0123",
    plateNumber: "GP PQR 678",
    imei: "356938035643814",
    expiryDate: "2026-02-26",
    status: "Due Soon",
    trakzeeStatus: "Active",
    plan: "Standard",
    monthlyAmount: 199,
  },
  {
    id: "SUB-007",
    customerName: "David Mthembu",
    phone: "+27 71 012 3456",
    plateNumber: "EC STU 901",
    imei: "356938035643815",
    expiryDate: "2026-02-10",
    status: "Overdue",
    trakzeeStatus: "Active",
    plan: "Basic",
    monthlyAmount: 99,
  },
  {
    id: "SUB-008",
    customerName: "Lerato Moloi",
    phone: "+27 83 345 6789",
    plateNumber: "NW VWX 234",
    imei: "356938035643816",
    expiryDate: "2026-04-01",
    status: "Active",
    trakzeeStatus: "Active",
    plan: "Premium",
    monthlyAmount: 299,
  },
  {
    id: "SUB-009",
    customerName: "Pieter Pretorius",
    phone: "+27 79 678 9012",
    plateNumber: "LP YZA 567",
    imei: "356938035643817",
    expiryDate: "2026-01-28",
    status: "Suspended",
    trakzeeStatus: "Deactivated",
    plan: "Standard",
    monthlyAmount: 199,
  },
  {
    id: "SUB-010",
    customerName: "Zanele Dlamini",
    phone: "+27 60 901 2345",
    plateNumber: "MP BCD 890",
    imei: "356938035643818",
    expiryDate: "2026-03-10",
    status: "Active",
    trakzeeStatus: "Active",
    plan: "Fleet",
    monthlyAmount: 499,
  },
  {
    id: "SUB-011",
    customerName: "André Viljoen",
    phone: "+27 72 234 5670",
    plateNumber: "GP EFG 123",
    imei: "356938035643819",
    expiryDate: "2026-02-27",
    status: "Due Soon",
    trakzeeStatus: "Active",
    plan: "Premium",
    monthlyAmount: 299,
  },
  {
    id: "SUB-012",
    customerName: "Busisiwe Nkosi",
    phone: "+27 65 567 8901",
    plateNumber: "KZN HIJ 456",
    imei: "356938035643820",
    expiryDate: "2026-02-18",
    status: "Overdue",
    trakzeeStatus: "Active",
    plan: "Basic",
    monthlyAmount: 99,
  },
];

// ─── Mock CSV Import Data ────────────────────────────────────────────────────

export const mockCSVData: CSVRow[] = [
  {
    clientName: "Mandla Sithole",
    phone: "+27 61 111 2222",
    vehicleIMEI: "356938035643821",
    plan: "Standard",
    expiryDate: "2026-04-15",
  },
  {
    clientName: "Lisa Erasmus",
    phone: "+27 82 333 4444",
    vehicleIMEI: "356938035643822",
    plan: "Premium",
    expiryDate: "2026-05-01",
  },
  {
    clientName: "Tshidi Mabaso",
    phone: "+27 73 555 6666",
    vehicleIMEI: "356938035643823",
    plan: "Fleet",
    expiryDate: "2026-04-20",
  },
  {
    clientName: "Hennie du Plessis",
    phone: "+27 84 777 8888",
    vehicleIMEI: "356938035643824",
    plan: "Basic",
    expiryDate: "2026-06-01",
  },
  {
    clientName: "Nompumelelo Zwane",
    phone: "+27 76 999 0000",
    vehicleIMEI: "356938035643825",
    plan: "Standard",
    expiryDate: "2026-05-15",
  },
];
