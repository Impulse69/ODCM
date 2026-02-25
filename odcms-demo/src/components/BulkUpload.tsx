"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, X, FileSpreadsheet } from "lucide-react";
import { mockCSVData, CSVRow } from "@/data/dummy";

export default function BulkUpload() {
    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsed, setParsed] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [parsedData, setParsedData] = useState<CSVRow[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.name.endsWith(".csv")) {
            setFile(droppedFile);
            setParsed(false);
            setParsedData([]);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setParsed(false);
            setParsedData([]);
        }
    }, []);

    const handleParse = useCallback(() => {
        setParsing(true);
        // Simulate parse delay
        setTimeout(() => {
            setParsedData(mockCSVData);
            setParsed(true);
            setParsing(false);
        }, 1500);
    }, []);

    const handleReset = useCallback(() => {
        setFile(null);
        setParsed(false);
        setParsing(false);
        setParsedData([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    return (
        <div className="card" style={{ padding: "1.5rem" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.25rem",
                }}
            >
                <div>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1A1A2E" }}>
                        Bulk CSV Upload
                    </h2>
                    <p style={{ fontSize: "0.8125rem", color: "#71717A", marginTop: "0.25rem" }}>
                        Import customer and vehicle data from CSV files
                    </p>
                </div>
                {file && (
                    <button onClick={handleReset} className="btn-secondary">
                        <X size={14} /> Clear
                    </button>
                )}
            </div>

            {/* Drop Zone */}
            {!file && (
                <div
                    className={`dropzone ${dragOver ? "drag-over" : ""}`}
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
                        style={{ display: "none" }}
                    />
                    <div
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            background: dragOver ? "#FFF5EC" : "#F4F4F5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 1rem",
                            transition: "all 0.3s ease",
                        }}
                    >
                        <Upload
                            size={24}
                            color={dragOver ? "#ED7D31" : "#A1A1AA"}
                            style={{ transition: "color 0.3s ease" }}
                        />
                    </div>
                    <p style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#1A1A2E" }}>
                        Drag & Drop your CSV file here
                    </p>
                    <p style={{ fontSize: "0.8125rem", color: "#A1A1AA", marginTop: "0.25rem" }}>
                        or{" "}
                        <span style={{ color: "#ED7D31", fontWeight: 600, cursor: "pointer" }}>
                            browse files
                        </span>
                    </p>
                    <p
                        style={{
                            fontSize: "0.7rem",
                            color: "#D4D4D8",
                            marginTop: "0.75rem",
                            fontWeight: 500,
                        }}
                    >
                        Accepted: .csv files only • Max size: 10MB
                    </p>
                </div>
            )}

            {/* File Selected */}
            {file && !parsed && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "1rem 1.25rem",
                        background: "#FFF5EC",
                        borderRadius: "0.625rem",
                        border: "1px solid #F5A66A33",
                    }}
                >
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: "0.5rem",
                            background: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        }}
                    >
                        <FileSpreadsheet size={22} color="#ED7D31" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1A1A2E" }}>
                            {file.name}
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "#71717A" }}>
                            {(file.size / 1024).toFixed(1)} KB • Ready to parse
                        </p>
                    </div>
                    <button onClick={handleParse} className="btn-primary" disabled={parsing}>
                        {parsing ? (
                            <>
                                <span
                                    style={{
                                        width: 14,
                                        height: 14,
                                        border: "2px solid rgba(255,255,255,0.3)",
                                        borderTop: "2px solid white",
                                        borderRadius: "50%",
                                        animation: "spin 0.8s linear infinite",
                                    }}
                                />
                                Parsing…
                            </>
                        ) : (
                            <>
                                <FileText size={16} /> Parse Data
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Parsed Preview */}
            {parsed && parsedData.length > 0 && (
                <div className="animate-fade-in-up" style={{ opacity: 0 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            background: "#F0FDF4",
                            borderRadius: "0.5rem",
                            border: "1px solid #22C55E33",
                        }}
                    >
                        <CheckCircle size={18} color="#22C55E" />
                        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#22C55E" }}>
                            {parsedData.length} records parsed successfully
                        </span>
                    </div>

                    <div style={{ overflowX: "auto", borderRadius: "0.625rem", border: "1px solid #E4E4E7" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "0.8125rem",
                            }}
                        >
                            <thead>
                                <tr style={{ background: "#F4F4F5" }}>
                                    {["#", "Client Name", "Phone", "Vehicle IMEI", "Plan", "Expiry Date"].map(
                                        (h) => (
                                            <th
                                                key={h}
                                                style={{
                                                    padding: "0.625rem 0.875rem",
                                                    textAlign: "left",
                                                    fontWeight: 600,
                                                    color: "#52525B",
                                                    fontSize: "0.75rem",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.04em",
                                                    borderBottom: "1px solid #E4E4E7",
                                                }}
                                            >
                                                {h}
                                            </th>
                                        )
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        style={{
                                            borderBottom: "1px solid #F4F4F5",
                                            transition: "background 0.15s ease",
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.background = "#FAFAFA")
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.background = "transparent")
                                        }
                                    >
                                        <td
                                            style={{
                                                padding: "0.625rem 0.875rem",
                                                color: "#A1A1AA",
                                                fontWeight: 500,
                                            }}
                                        >
                                            {idx + 1}
                                        </td>
                                        <td
                                            style={{
                                                padding: "0.625rem 0.875rem",
                                                fontWeight: 600,
                                                color: "#1A1A2E",
                                            }}
                                        >
                                            {row.clientName}
                                        </td>
                                        <td style={{ padding: "0.625rem 0.875rem", color: "#52525B" }}>
                                            {row.phone}
                                        </td>
                                        <td
                                            style={{
                                                padding: "0.625rem 0.875rem",
                                                fontFamily: "monospace",
                                                fontSize: "0.75rem",
                                                color: "#71717A",
                                            }}
                                        >
                                            {row.vehicleIMEI}
                                        </td>
                                        <td style={{ padding: "0.625rem 0.875rem" }}>
                                            <span
                                                style={{
                                                    padding: "0.2rem 0.5rem",
                                                    borderRadius: 999,
                                                    fontSize: "0.7rem",
                                                    fontWeight: 600,
                                                    background: "#FFF5EC",
                                                    color: "#ED7D31",
                                                }}
                                            >
                                                {row.plan}
                                            </span>
                                        </td>
                                        <td style={{ padding: "0.625rem 0.875rem", color: "#52525B" }}>
                                            {row.expiryDate}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                        <button className="btn-primary">
                            <CheckCircle size={16} /> Import All Records
                        </button>
                        <button className="btn-secondary" onClick={handleReset}>
                            <AlertCircle size={16} /> Cancel
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
        </div>
    );
}
