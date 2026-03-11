"use client";

import { useState, useRef, useCallback } from "react";
import { jsPDF } from "jspdf";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  FileSpreadsheet,
  Info,
  Download,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// -- Expected CSV columns:
// customerName, phone, customerType (individual/company), plateNumber, imei, plan, installationDate (opt), expiryDate

export interface BulkRow {
  customerName: string;
  phone: string;
  customerType: string;
  plateNumber: string;
  imei: string;
  plan: string;
  installationDate: string;
  expiryDate: string;
  _rowNum: number;
  _error?: string;
}

interface ImportResult {
  imported: number;
  importedIndividuals: number;
  importedCompanies: number;
  skipped: number;
  errors: number;
  errorDetails: { row: number; message: string }[];
  skippedDetails: { row: number; imei: string; reason: string }[];
}

const REQUIRED_COLUMNS = ["customerName", "phone", "plateNumber", "imei", "plan", "expiryDate"];

const planColors: Record<string, string> = {
  Basic:    "bg-zinc-100 text-zinc-600 border-zinc-200",
  Standard: "bg-[#FFF5EC] text-[#C9651B] border-orange-200",
  Premium:  "bg-violet-50 text-violet-700 border-violet-200",
};

// -- CSV parser (handles quoted fields) --------------------------------------
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
  const rows = lines.slice(1).map((line, i) => {
    const vals = splitLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] ?? ""; });
    obj.__rowIndex = String(i + 2);
    return obj;
  });

  return { headers, rows };
}

// -- Download template helper -------------------------------------------------
function downloadTemplate() {
  const header = "customerName,phone,customerType,plateNumber,imei,plan,installationDate,expiryDate";
  const sample = "Kwame Mensah,+233201234567,individual,GR-1234-24,123456789012345,Basic,2026-03-11,2027-03-11";
  const sample2 = "Acme Ltd,+233301234567,company,GW-5678-24,987654321098765,Premium,2026-02-01,2027-02-01";
  const blob = new Blob([header + "\n" + sample + "\n" + sample2], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "odcms_bulk_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// -- Load logo as data URL ---------------------------------------------------
function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas context unavailable")); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}

// -- Download client form (PDF) -----------------------------------------------
// Helper: draw a dotted line (jsPDF v4 has no setLineDash on types)
function dottedLine(doc: jsPDF, x1: number, y: number, x2: number, dash = 0.7, gap = 1.3) {
  let x = x1;
  doc.setLineWidth(0.3);
  while (x < x2) {
    doc.line(x, y, Math.min(x + dash, x2), y);
    x += dash + gap;
  }
}

async function downloadClientForm() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PW  = 210;
  const ML  = 14;
  const MR  = PW - 14;
  const ROW = 8;

  // ── HEADER ────────────────────────────────────────────────────────────────
  // Embed the real ODG logo
  const logoW = 20;
  const logoH = 20;
  const logoX = (PW - logoW) / 2 - 10; // centre-ish, leaving room for text
  const logoY = 8;

  try {
    const dataUrl = await loadImageAsDataUrl("/favicon.png");
    doc.addImage(dataUrl, "PNG", logoX, logoY, logoW, logoH);
  } catch {
    // fallback: plain circle if image fails
    doc.setFillColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.circle(logoX + logoW / 2, logoY + logoH / 2, logoW / 2, "FD");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("d", logoX + logoW / 2, logoY + logoH / 2 + 3, { align: "center" });
  }

  // "Office / Data / Ghana" stacked text to the right of the logo
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const tx = logoX + logoW + 2;
  doc.text("Office", tx, logoY + 4);
  doc.text("Data",   tx, logoY + 9);
  doc.text("Ghana",  tx, logoY + 14);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Vehicle Tracking Client Sheet", PW / 2, logoY + logoH + 8, { align: "center" });

  // ── CLIENT INFORMATION ────────────────────────────────────────────────────
  let y = logoY + logoH + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Client Information", ML, y);
  y += 5;

  const clientFields = [
    "Client name:", "Address:", "City:", "Postal Address:",
    "Email:", "Contact Person:", "Telephone:",
  ];
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  for (const lbl of clientFields) {
    doc.text(lbl, ML, y);
    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);
    doc.line(ML + 33, y + 0.5, MR, y + 0.5);
    y += ROW;
  }

  y += 3;

  // ── VEHICLE DETAILS (left) + SERVICE FEE PAYMENTS (right) ─────────────────
  const sfpX    = 126;        // service fee table x start
  const sfpW    = MR - sfpX; // ~84 mm
  const sfpRowH = 6;
  const sfpMonW = 22;         // "Month" column width
  const sfpAmtW = sfpW - sfpMonW;
  const sfpY0   = y - 5.5;   // table aligns with "Vehicle Details" heading

  // Service Fee Payments – dark header
  doc.setFillColor(60, 60, 60);
  doc.setDrawColor(0, 0, 0);
  doc.rect(sfpX, sfpY0, sfpW, sfpRowH, "FD");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Service Fee Payments", sfpX + sfpW / 2, sfpY0 + 4, { align: "center" });

  // Sub-headers
  doc.setFillColor(180, 180, 180);
  doc.rect(sfpX,           sfpY0 + sfpRowH, sfpMonW, sfpRowH, "FD");
  doc.rect(sfpX + sfpMonW, sfpY0 + sfpRowH, sfpAmtW, sfpRowH, "FD");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Month",               sfpX + sfpMonW / 2,           sfpY0 + sfpRowH + 4, { align: "center" });
  doc.text("Amount (GHC)",  sfpX + sfpMonW + sfpAmtW / 2, sfpY0 + sfpRowH + 4, { align: "center" });

  // 12 data rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (let i = 1; i <= 12; i++) {
    const ry = sfpY0 + sfpRowH * (i + 1);
    doc.setLineWidth(0.2);
    doc.setDrawColor(0, 0, 0);
    doc.rect(sfpX,           ry, sfpMonW, sfpRowH, "S");
    doc.rect(sfpX + sfpMonW, ry, sfpAmtW, sfpRowH, "S");
    doc.setTextColor(0, 0, 0);
    doc.text(String(i), sfpX + sfpMonW / 2, ry + 4, { align: "center" });
  }

  // Vehicle Details – heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Vehicle Details", ML, y);
  y += 5.5;

  // Vehicle fields (left side, line stops before service fee table)
  const vFields = ["Vehicle Number:", "Vehicle Model:", "Year of Manufacture:"];
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  for (const lbl of vFields) {
    doc.text(lbl, ML, y);
    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);
    doc.line(ML + 43, y + 0.5, sfpX - 4, y + 0.5);
    y += ROW;
  }

  y += 5;

  // ── DEVICE DETAILS ────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Device Details", ML, y);
  y += 6;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);

  // Model (two input lines as in the original form)
  doc.text("Model:", ML, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(ML + 43, y + 0.5, sfpX - 4, y + 0.5);
  y += ROW;
  doc.line(ML + 43, y + 0.5, sfpX - 4, y + 0.5); // second blank line
  y += ROW;

  // Code
  doc.text("Code:", ML, y);
  doc.line(ML + 43, y + 0.5, sfpX - 4, y + 0.5);
  y += ROW;

  // Sim Number
  doc.text("Sim Number:", ML, y);
  doc.line(ML + 43, y + 0.5, sfpX - 4, y + 0.5);
  y += ROW;

  // Installation Date with dd / mm / yy boxes
  doc.text("Installation Date:", ML, y);
  const ddX = ML + 39;
  doc.setFontSize(8.5);
  doc.text("dd", ddX,      y);
  doc.text("mm", ddX + 22, y);
  doc.text("yy", ddX + 48, y);
  doc.setLineWidth(0.3);
  doc.rect(ddX + 5,  y - 4.5, 14, 5.5, "S"); // dd box
  doc.rect(ddX + 27, y - 4.5, 18, 5.5, "S"); // mm box
  doc.rect(ddX + 53, y - 4.5, 14, 5.5, "S"); // yy box

  y += 13;

  // ── ADDITIONAL ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Additional", ML, y);
  y += 8;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Engine Immobilizer", ML, y);
  doc.setLineWidth(0.3);
  doc.rect(ML + 38,      y - 4.5, 10, 5.5, "S");
  doc.text("Dallas Key", ML + 53,  y);
  doc.rect(ML + 75,      y - 4.5, 10, 5.5, "S");
  doc.text("Fuel Sensor", ML + 92, y);
  doc.rect(ML + 115,     y - 4.5, 10, 5.5, "S");

  y += 16;

  // ── FOOTER ────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  // Installed By
  doc.text("Installed By:", ML, y);
  dottedLine(doc, ML + 28, y, ML + 100);
  y += 8;

  // Checked By
  doc.text("Checked By:", ML, y);
  dottedLine(doc, ML + 28, y, ML + 100);
  y += 4;

  // Date label under Checked By
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("Date:", ML, y + 4);
  y += 10;

  // Client Sign + ODG Track Sign on same line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Client Sign:", ML, y);
  dottedLine(doc, ML + 26, y, ML + 82);

  doc.text("ODG Track Sign:", ML + 90, y);
  dottedLine(doc, ML + 90 + 35, y, MR);

  doc.save("ODG_Vehicle_Tracking_Client_Sheet.pdf");
}

// -- Component ----------------------------------------------------------------
export default function BulkUpload() {
  const [dragOver, setDragOver]       = useState(false);
  const [file, setFile]               = useState<File | null>(null);
  const [parsed, setParsed]           = useState(false);
  const [parsing, setParsing]         = useState(false);
  const [progress, setProgress]       = useState(0);
  const [parsedRows, setParsedRows]   = useState<BulkRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting]     = useState(false);
  const [result, setResult]           = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null); setParsed(false); setParsing(false); setProgress(0);
    setParsedRows([]); setParseErrors([]); setImporting(false); setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) { reset(); setTimeout(() => setFile(f), 0); }
  }, [reset]);
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { reset(); setTimeout(() => setFile(f), 0); }
  }, [reset]);

  // -- Parse ------------------------------------------------------------------
  const handleParse = useCallback(() => {
    if (!file) return;
    setParsing(true); setProgress(0);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      [20, 50, 75, 100].forEach((v, i) => setTimeout(() => setProgress(v), (i + 1) * 150));
      setTimeout(() => {
        const { headers, rows } = parseCSV(text);
        const errs: string[] = [];
        const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
        if (missing.length) {
          errs.push(`Missing required column(s): ${missing.join(", ")}`);
          setParseErrors(errs); setParsing(false); setParsed(true); return;
        }

        const bulkRows: BulkRow[] = rows.map((r) => {
          const rowNum = parseInt(r.__rowIndex ?? "0");
          const rowErrors: string[] = [];
          if (!r.customerName) rowErrors.push("customerName is blank");
          if (!r.phone)        rowErrors.push("phone is blank");
          if (!r.plateNumber)  rowErrors.push("plateNumber is blank");
          if (!r.imei)         rowErrors.push("imei is blank");
          if (!r.plan)         rowErrors.push("plan is blank");
          if (!r.expiryDate)   rowErrors.push("expiryDate is blank");
          if (r.plan && !["Basic", "Standard", "Premium"].includes(r.plan))
            rowErrors.push(`plan must be Basic, Standard, or Premium (got "${r.plan}")`);
          return {
            customerName:     r.customerName ?? "",
            phone:            r.phone ?? "",
            customerType:     r.customerType || "individual",
            plateNumber:      r.plateNumber ?? "",
            imei:             r.imei ?? "",
            plan:             r.plan ?? "",
            installationDate: r.installationDate ?? "",
            expiryDate:       r.expiryDate ?? "",
            _rowNum: rowNum,
            _error: rowErrors.length ? rowErrors.join("; ") : undefined,
          };
        });

        setParsedRows(bulkRows); setParseErrors(errs); setParsed(true); setParsing(false);
      }, 700);
    };
    reader.readAsText(file);
  }, [file]);

  // -- Import via API ---------------------------------------------------------
  const handleImport = useCallback(async () => {
    const validRows = parsedRows.filter((r) => !r._error);
    if (!validRows.length) return;
    setImporting(true);
    try {
      const res = await fetch(`${BASE}/api/bulk-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map(({ _rowNum, _error, ...rest }) => { void _rowNum; void _error; return rest; }),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Import failed");
      setResult(json);
    } catch (err) {
      setResult({
        imported: 0, importedIndividuals: 0, importedCompanies: 0,
        skipped: 0, errors: 1,
        errorDetails: [{ row: 0, message: err instanceof Error ? err.message : "Unknown error" }],
        skippedDetails: [],
      });
    } finally {
      setImporting(false);
    }
  }, [parsedRows]);

  const validCount   = parsedRows.filter((r) => !r._error).length;
  const invalidCount = parsedRows.filter((r) => !!r._error).length;

  return (
    <div className="space-y-4">
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border py-4 px-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Bulk CSV Upload</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Import customers and vehicles from a CSV file
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { downloadClientForm(); }} className="gap-1.5 text-xs h-8">
                <Download size={13} /> Client Form
              </Button>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs h-8">
                <Download size={13} /> CSV Template
              </Button>
              {file && (
                <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 text-xs h-8">
                  <X size={13} /> Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Column hint */}
          {!file && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
              <Info size={14} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>
                  <strong>Required columns: </strong>
                  <code className="font-mono">customerName, phone, plateNumber, imei, plan, expiryDate</code>
                </p>
                <p>
                  <strong>Optional columns: </strong>
                  <code className="font-mono">customerType</code> (individual/company, default: individual),{" "}
                  <code className="font-mono">installationDate</code>
                </p>
                <p>
                  <strong>Plans:</strong> Basic (GH?60) � Standard (GH?100) � Premium (GH?300) &nbsp;|&nbsp;{" "}
                  <strong>Dates:</strong> YYYY-MM-DD
                </p>
              </div>
            </div>
          )}

          {/* Drop zone */}
          {!file && (
            <div
              className={cn("dropzone", dragOver && "drag-over")}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300", dragOver ? "bg-odg-orange-bg" : "bg-muted")}>
                <Upload size={26} className={cn("transition-colors duration-300", dragOver ? "text-primary" : "text-muted-foreground")} />
              </div>
              <p className="font-semibold text-sm text-foreground mb-1">Drag & drop your CSV file here</p>
              <p className="text-xs text-muted-foreground mb-3">
                or <span className="text-primary font-semibold cursor-pointer hover:underline">browse files</span>
              </p>
              <p className="text-[0.65rem] text-muted-foreground/60">Accepted: .csv files only � Max size: 10 MB</p>
            </div>
          )}

          {/* File selected � not yet parsed */}
          {file && !parsed && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="w-11 h-11 rounded-lg bg-background shadow-sm flex items-center justify-center shrink-0 border border-border">
                  <FileSpreadsheet size={22} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB � CSV file</p>
                </div>
                <Button size="sm" onClick={handleParse} disabled={parsing} className="gap-1.5 text-xs shrink-0">
                  {parsing ? (
                    <><Loader2 size={13} className="animate-spin" /> Parsing�</>
                  ) : (
                    <><FileText size={14} /> Parse File</>
                  )}
                </Button>
              </div>
              {parsing && (
                <div className="space-y-1.5">
                  <Progress value={progress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                </div>
              )}
            </div>
          )}

          {/* Parse-level errors */}
          {parsed && parseErrors.length > 0 && (
            <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-red-50 border border-red-200">
              {parseErrors.map((e, i) => (
                <p key={i} className="text-xs text-red-700 font-medium flex items-start gap-1.5">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" /> {e}
                </p>
              ))}
            </div>
          )}

          {/* Preview table */}
          {parsed && parsedRows.length > 0 && (
            <div className="space-y-4 animate-fade-in-up" style={{ opacity: 0 }}>
              {/* Status banner */}
              {result ? (
                <div className={cn("flex items-start gap-2.5 p-3 rounded-lg border text-xs font-medium",
                  result.errors === 0 && result.skipped === 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                )}>
                  <CheckCircle size={15} className="shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">{result.imported} record{result.imported !== 1 ? "s" : ""} imported successfully!</p>
                    {(result.importedIndividuals > 0 || result.importedCompanies > 0) && (
                      <p className="text-[0.7rem] opacity-80">
                        {result.importedIndividuals > 0 && <span>{result.importedIndividuals} individual{result.importedIndividuals !== 1 ? "s" : ""}</span>}
                        {result.importedIndividuals > 0 && result.importedCompanies > 0 && <span> &amp; </span>}
                        {result.importedCompanies > 0 && <span>{result.importedCompanies} company/companies</span>}
                        <span className="ml-1">&mdash; check the matching tab on the Customers page</span>
                      </p>
                    )}
                    {result.skipped > 0 && (
                      <>
                        <p>{result.skipped} skipped (duplicate IMEI):</p>
                        {result.skippedDetails.map((s, i) => (
                          <p key={i} className="text-[0.7rem]">Row {s.row} � IMEI {s.imei}: {s.reason}</p>
                        ))}
                      </>
                    )}
                    {result.errors > 0 && (
                      <>
                        <p className="text-red-600">{result.errors} error{result.errors !== 1 ? "s" : ""}:</p>
                        {result.errorDetails.map((e, i) => (
                          <p key={i} className="text-[0.7rem] text-red-600">Row {e.row}: {e.message}</p>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                  <CheckCircle size={15} />
                  <span>
                    {validCount} valid row{validCount !== 1 ? "s" : ""} ready to import
                    {invalidCount > 0 && (
                      <span className="text-amber-600 ml-2">� {invalidCount} row{invalidCount !== 1 ? "s" : ""} with errors (will be skipped)</span>
                    )}
                  </span>
                </div>
              )}

              {/* Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        {["#", "Customer", "Phone", "Type", "Plate", "IMEI", "Plan", "Expiry", "Installed", ""].map((h) => (
                          <TableHead key={h} className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.map((row, idx) => (
                        <TableRow key={idx} className={cn("text-sm hover:bg-muted/30", row._error && "bg-red-50/60")}>
                          <TableCell className="text-muted-foreground font-medium">{row._rowNum}</TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">{row.customerName}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{row.phone}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[0.65rem] px-2 py-0.5", row.customerType === "company" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-zinc-50 text-zinc-600 border-zinc-200")}>
                              {row.customerType || "individual"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{row.plateNumber}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{row.imei}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[0.65rem] font-semibold px-2 py-0.5", planColors[row.plan] ?? "bg-zinc-50 text-zinc-600 border-zinc-200")}>
                              {row.plan}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{row.expiryDate}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{row.installationDate || "�"}</TableCell>
                          <TableCell>
                            {row._error && (
                              <span title={row._error}>
                                <AlertCircle size={14} className="text-red-500" />
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Action buttons */}
              {!result ? (
                <div className="flex gap-3">
                  <Button
                    onClick={handleImport}
                    disabled={importing || validCount === 0}
                    className="gap-1.5 text-sm bg-odg-orange text-white hover:brightness-95"
                  >
                    {importing ? (
                      <><Loader2 size={14} className="animate-spin" /> Importing�</>
                    ) : (
                      <><CheckCircle size={15} /> Import {validCount} Record{validCount !== 1 ? "s" : ""}</>
                    )}
                  </Button>
                  <Button variant="outline" onClick={reset} className="gap-1.5 text-sm text-muted-foreground">
                    <X size={14} /> Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={reset} className="gap-1.5 text-sm">
                  Upload Another File
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
