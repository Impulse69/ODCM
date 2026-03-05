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
  installationDate?: string;
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

// ─── Companies ───────────────────────────────────────────────────────────────
export interface Company {
  id: string;
  companyName: string;
  billingContactName?: string;
  contactPhone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  status?: SubscriptionStatus;
  totalAccounts?: number;
}

export const companies: Company[] = [
  {
    id: "CO-001",
    companyName: "Zamani Logistics Pty Ltd",
    billingContactName: "Nokuthula Maseko",
    contactPhone: "+27 82 123 4567",
    email: "accounts@zamani.co.za",
    address: "12 Freight Way, Johannesburg",
    taxId: "TX-987654",
    status: "Active",
    totalAccounts: 18,
  },
  {
    id: "CO-002",
    companyName: "Cape Distribution Ltd",
    billingContactName: "Johan van Rensburg",
    contactPhone: "+27 21 555 0199",
    email: "billing@cape-dist.com",
    address: "45 Harbour Rd, Cape Town",
    taxId: "TX-123321",
    status: "Due Soon",
    totalAccounts: 12,
  },
  {
    id: "CO-003",
    companyName: "Nguni Fleet Services",
    billingContactName: "Sibusiso Zulu",
    contactPhone: "+27 31 400 5566",
    email: "fleet@nguni.co.za",
    address: "88 Industrial Park, Durban",
    taxId: "TX-445566",
    status: "Active",
    totalAccounts: 20,
  },
  {
    id: "CO-004",
    companyName: "Savanna Mining Corp",
    billingContactName: "Willem Fourie",
    contactPhone: "+27 14 300 7788",
    email: "transport@savanna-mining.co.za",
    address: "Plot 3, Limpopo Rd, Polokwane",
    taxId: "TX-778899",
    status: "Active",
    totalAccounts: 15,
  },
  {
    id: "CO-005",
    companyName: "uMfolozi Agri Holdings",
    billingContactName: "Thandiwe Ngcobo",
    contactPhone: "+27 35 200 1122",
    email: "ops@umfolozi-agri.co.za",
    address: "Farm 12, Richards Bay",
    taxId: "TX-112233",
    status: "Active",
    totalAccounts: 10,
  },
  {
    id: "CO-006",
    companyName: "Highveld Couriers",
    billingContactName: "Pieter Swanepoel",
    contactPhone: "+27 17 600 3344",
    email: "dispatch@highveld-couriers.co.za",
    address: "Unit 7, Mpumalanga Hub",
    taxId: "TX-334455",
    status: "Overdue",
    totalAccounts: 8,
  },
  {
    id: "CO-007",
    companyName: "Karoo Petroleum",
    billingContactName: "Maria Steyn",
    contactPhone: "+27 23 100 5566",
    email: "fleet@karoo-petro.co.za",
    address: "N1 Industrial, Beaufort West",
    taxId: "TX-556677",
    status: "Active",
    totalAccounts: 6,
  },
  {
    id: "CO-008",
    companyName: "Tshwane Security Group",
    billingContactName: "Mpho Letlape",
    contactPhone: "+27 12 800 7788",
    email: "vehicles@tshwane-security.co.za",
    address: "100 Pretoria Ave, Centurion",
    taxId: "TX-889900",
    status: "Active",
    trakzeeStatus: "Active",
    plan: "Fleet",
    monthlyAmount: 499,
  },
  {
    id: "CO-009",
    companyName: "Garden Route Transport",
    billingContactName: "André Joubert",
    contactPhone: "+27 44 300 1122",
    email: "ops@gr-transport.co.za",
    address: "22 George Rd, Knysna",
    taxId: "TX-101112",
    status: "Due Soon",
    totalAccounts: 5,
  },
  {
    id: "CO-010",
    companyName: "Vaal Construction",
    billingContactName: "Blessing Moyo",
    contactPhone: "+27 16 400 3344",
    email: "plant@vaal-construction.co.za",
    address: "Plot 9, Vanderbijlpark",
    taxId: "TX-131415",
    status: "Active",
    totalAccounts: 9,
  },
  {
    id: "CO-011",
    companyName: "Eastern Cape Buses",
    billingContactName: "Nomsa Khumalo",
    contactPhone: "+27 43 700 5566",
    email: "tracking@ec-buses.co.za",
    address: "12 Buffalo St, East London",
    taxId: "TX-161718",
    status: "Active",
    totalAccounts: 7,
  },
  {
    id: "CO-012",
    companyName: "Bloemfontein Freight Co",
    billingContactName: "Hennie Brits",
    contactPhone: "+27 51 200 7788",
    email: "logistics@bloem-freight.co.za",
    address: "34 Nelson Mandela Dr, Bloemfontein",
    taxId: "TX-192021",
    status: "Suspended",
    totalAccounts: 3,
  },
  {
    id: "CO-013",
    companyName: "Waterberg Farms",
    billingContactName: "Lindiwe Mahlangu",
    contactPhone: "+27 14 500 1122",
    email: "farm@waterberg.co.za",
    address: "Modimolle Rd, Limpopo",
    taxId: "TX-222324",
    status: "Active",
    trakzeeStatus: "Active",
    plan: "Fleet",
    monthlyAmount: 499,
  },
  {
    id: "CO-015",
    companyName: "Soweto Ride-Share",
    billingContactName: "Thabiso Molefe",
    contactPhone: "+27 11 300 5566",
    email: "drivers@soweto-ride.co.za",
    address: "Orlando West, Soweto",
    taxId: "TX-282930",
    status: "Due Soon",
    totalAccounts: 16,
  },
];

// ─── KPI Stats ───────────────────────────────────────────────────────────────

export const kpiData: KPIData = {
  totalActiveCustomers: 1243,
  totalMonthlyRevenue: 186450,
  revenueLeakagePrevented: 24300,
  pendingDeactivations: 17,
};

// ─── Helper ──────────────────────────────────────────────────────────────────

let _nextImei = 356938035643809;
function nextImei(): string {
  return String(_nextImei++);
}

let _subIdx = 0;
function nextSubId(): string {
  _subIdx++;
  return `SUB-${String(_subIdx).padStart(3, "0")}`;
}

const plans = ["Basic", "Standard", "Premium", "Fleet"] as const;
const planAmounts: Record<string, number> = { Basic: 99, Standard: 199, Premium: 299, Fleet: 499 };
const trakzeeStatuses: TrakzeeStatus[] = ["Active", "Deactivated"];
const provinces = ["GP", "WC", "KZN", "EC", "FS", "NW", "LP", "MP", "NC"];
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomPlate(): string {
  const prov = provinces[Math.floor(Math.random() * provinces.length)];
  const l1 = letters[Math.floor(Math.random() * 26)];
  const l2 = letters[Math.floor(Math.random() * 26)];
  const l3 = letters[Math.floor(Math.random() * 26)];
  const num = String(Math.floor(100 + Math.random() * 900));
  return `${prov} ${l1}${l2}${l3} ${num}`;
}

function randomDate(yearStart: number, yearEnd: number): string {
  const y = yearStart + Math.floor(Math.random() * (yearEnd - yearStart + 1));
  const m = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const d = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function makeVehicle(
  customerName: string,
  phone: string,
  overrides?: Partial<Subscription>,
): Subscription {
  const plan = plans[Math.floor(Math.random() * plans.length)];
  const statusIdx = Math.random();
  let status: SubscriptionStatus;
  if (statusIdx < 0.55) status = "Active";
  else if (statusIdx < 0.75) status = "Due Soon";
  else if (statusIdx < 0.9) status = "Overdue";
  else status = "Suspended";

  const trakzee: TrakzeeStatus = status === "Suspended" ? "Deactivated" : trakzeeStatuses[Math.random() < 0.85 ? 0 : 1];

  return {
    id: nextSubId(),
    customerName,
    phone,
    plateNumber: randomPlate(),
    imei: nextImei(),
    expiryDate: randomDate(2025, 2027),
    installationDate: randomDate(2023, 2025),
    status,
    trakzeeStatus: trakzee,
    plan,
    monthlyAmount: planAmounts[plan],
    ...overrides,
  };
}

// ─── Individual Customers ────────────────────────────────────────────────────

interface IndividualSeed {
  name: string;
  phone: string;
  vehicleCount: number;
}

const individualSeeds: IndividualSeed[] = [
  { name: "Thabo Mokoena", phone: "+27 61 234 5678", vehicleCount: 2 },
  { name: "Sarah van der Merwe", phone: "+27 82 987 6543", vehicleCount: 1 },
  { name: "Sipho Ndlovu", phone: "+27 73 456 7890", vehicleCount: 3 },
  { name: "Fatima Patel", phone: "+27 84 321 0987", vehicleCount: 1 },
  { name: "Johan Botha", phone: "+27 76 654 3210", vehicleCount: 4 },
  { name: "Naledi Khumalo", phone: "+27 68 789 0123", vehicleCount: 2 },
  { name: "David Mthembu", phone: "+27 71 012 3456", vehicleCount: 1 },
  { name: "Lerato Moloi", phone: "+27 83 345 6789", vehicleCount: 3 },
  { name: "Pieter Pretorius", phone: "+27 79 678 9012", vehicleCount: 1 },
  { name: "Zanele Dlamini", phone: "+27 60 901 2345", vehicleCount: 5 },
  { name: "André Viljoen", phone: "+27 72 234 5670", vehicleCount: 2 },
  { name: "Busisiwe Nkosi", phone: "+27 65 567 8901", vehicleCount: 1 },
];

// ─── Company vehicle counts (1 – 20) ────────────────────────────────────────

const companyVehicleCounts: Record<string, number> = {
  "Zamani Logistics Pty Ltd": 18,
  "Cape Distribution Ltd": 12,
  "Nguni Fleet Services": 20,
  "Savanna Mining Corp": 15,
  "uMfolozi Agri Holdings": 10,
  "Highveld Couriers": 8,
  "Karoo Petroleum": 6,
  "Tshwane Security Group": 14,
  "Garden Route Transport": 5,
  "Vaal Construction": 9,
  "Eastern Cape Buses": 7,
  "Bloemfontein Freight Co": 3,
  "Waterberg Farms": 4,
  "Dolphin Coast Rentals": 11,
  "Soweto Ride-Share": 16,
};

// ─── Build subscriptions ─────────────────────────────────────────────────────

const _subs: Subscription[] = [];

// Individual vehicles
for (const seed of individualSeeds) {
  for (let i = 0; i < seed.vehicleCount; i++) {
    _subs.push(makeVehicle(seed.name, seed.phone));
  }
}

// Company vehicles
for (const co of companies) {
  const count = companyVehicleCounts[co.companyName] ?? 1;
  for (let i = 0; i < count; i++) {
    // For Savanna Mining Corp, make the first 7 Active to ensure the
    // company shows active vehicles in the Companies view (user request).
    if (co.companyName === "Savanna Mining Corp") {
      if (i < 7) {
        _subs.push(makeVehicle(co.companyName, co.contactPhone ?? "", { status: "Active", trakzeeStatus: "Active" }));
      } else if (i < 11) {
        _subs.push(makeVehicle(co.companyName, co.contactPhone ?? "", { status: "Due Soon", trakzeeStatus: "Active" }));
      } else {
        _subs.push(makeVehicle(co.companyName, co.contactPhone ?? "", { status: "Overdue", trakzeeStatus: "Active" }));
      }
    } else {
      _subs.push(makeVehicle(co.companyName, co.contactPhone ?? ""));
    }
  }
}

export const subscriptions: Subscription[] = _subs;

// ─── Mock CSV Import Data ────────────────────────────────────────────────────

export const mockCSVData: CSVRow[] = [
  {
    clientName: "Mandla Sithole",
    phone: "+27 61 111 2222",
    vehicleIMEI: "356938035644900",
    plan: "Standard",
    expiryDate: "2026-04-15",
  },
  {
    clientName: "Lisa Erasmus",
    phone: "+27 82 333 4444",
    vehicleIMEI: "356938035644901",
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
    vehicleIMEI: "356938035644903",
    plan: "Basic",
    expiryDate: "2026-06-01",
  },
  {
    clientName: "Nompumelelo Zwane",
    phone: "+27 76 999 0000",
    vehicleIMEI: "356938035644904",
    plan: "Standard",
    expiryDate: "2026-05-15",
  },
];
