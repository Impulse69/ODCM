"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  FileSpreadsheet,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { mockCSVData, CSVRow } from "@/data/dummy";

const planColors: Record<string, string> = {
  Basic: "bg-zinc-100 text-zinc-600 border-zinc-200",
  Standard: "bg-[#FFF5EC] text-[#C9651B] border-orange-200",
  Premium: "bg-violet-50 text-violet-700 border-violet-200",
  Fleet: "bg-sky-50 text-sky-700 border-sky-200",
};

export default function BulkUpload() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [imported, setImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) { setFile(f); setParsed(false); setParsedData([]); setImported(false); }
  }, []);
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setParsed(false); setParsedData([]); setImported(false); }
  }, []);

  const handleParse = useCallback(() => {
    setParsing(true);
    setProgress(0);
    const steps = [10, 30, 55, 75, 90, 100];
    steps.forEach((v, i) =>
      setTimeout(() => {
        setProgress(v);
        if (i === steps.length - 1) {
          setParsedData(mockCSVData);
          setParsed(true);
          setParsing(false);
        }
      }, (i + 1) * 250)
    );
  }, []);

  const handleImport = useCallback(() => {
    setImported(true);
  }, []);

  const handleReset = useCallback(() => {
    setFile(null); setParsed(false); setParsing(false);
    setParsedData([]); setProgress(0); setImported(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="space-y-4">
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border py-4 px-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Bulk CSV Upload</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Import customer and vehicle data from a CSV file
              </CardDescription>
            </div>
            {file && (
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs h-8">
                <X size={13} /> Clear
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">

          {/* Template hint */}
          {!file && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Your CSV must include the columns:{" "}
                <code className="font-mono font-semibold">clientName, phone, vehicleIMEI, plan, expiryDate</code>
              </span>
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300",
                  dragOver ? "bg-[#FFF5EC]" : "bg-muted"
                )}
              >
                <Upload
                  size={26}
                  className={cn("transition-colors duration-300", dragOver ? "text-primary" : "text-muted-foreground")}
                />
              </div>
              <p className="font-semibold text-sm text-foreground mb-1">
                Drag & drop your CSV file here
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                or{" "}
                <span className="text-primary font-semibold cursor-pointer hover:underline">
                  browse files
                </span>
              </p>
              <p className="text-[0.65rem] text-muted-foreground/60">
                Accepted: .csv files only • Max size: 10 MB
              </p>
            </div>
          )}

          {/* File selected — not yet parsed */}
          {file && !parsed && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="w-11 h-11 rounded-lg bg-background shadow-sm flex items-center justify-center flex-shrink-0 border border-border">
                  <FileSpreadsheet size={22} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB · CSV file
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleParse}
                  disabled={parsing}
                  className="gap-1.5 text-xs flex-shrink-0"
                >
                  {parsing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Parsing…
                    </>
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

          {/* Parsed preview */}
          {parsed && parsedData.length > 0 && (
            <div className="animate-fade-in-up space-y-4" style={{ opacity: 0 }}>
              {/* Success banner */}
              {!imported ? (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                  <CheckCircle size={15} />
                  {parsedData.length} records parsed successfully — ready to import
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 font-semibold">
                  <CheckCircle size={15} />
                  {parsedData.length} records imported into ODCMS successfully!
                </div>
              )}

              {/* Preview table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        {["#", "Client Name", "Phone", "Vehicle IMEI", "Plan", "Expiry Date"].map((h) => (
                          <TableHead
                            key={h}
                            className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground"
                          >
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.map((row, idx) => (
                        <TableRow key={idx} className="text-sm hover:bg-muted/30">
                          <TableCell className="text-muted-foreground font-medium">{idx + 1}</TableCell>
                          <TableCell className="font-semibold">{row.clientName}</TableCell>
                          <TableCell className="text-muted-foreground">{row.phone}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{row.vehicleIMEI}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[0.65rem] font-semibold px-2 py-0.5",
                                planColors[row.plan] ?? planColors.Standard
                              )}
                            >
                              {row.plan}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{row.expiryDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Action buttons */}
              {!imported && (
                <div className="flex gap-3">
                  <Button onClick={handleImport} className="gap-1.5 text-sm">
                    <CheckCircle size={15} /> Import All {parsedData.length} Records
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="gap-1.5 text-sm text-muted-foreground"
                  >
                    <AlertCircle size={14} /> Cancel
                  </Button>
                </div>
              )}
              {imported && (
                <Button variant="outline" onClick={handleReset} className="gap-1.5 text-sm">
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
