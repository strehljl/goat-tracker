"use client";

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { parseCSV, validateAndNormalize, ParsedImportRow, GoatImportRow } from "@/lib/csvParser";

const TEMPLATE_HEADERS =
  "name,tagId,gender,breed,dateOfBirth,colorMarkings,purchaseDate,purchasePrice,damTagId,sireTagId,location,status,notes";
const TEMPLATE_EXAMPLE =
  "Daisy,GT-001,DOE,Nubian,2022-03-15,Brown with white ears,2022-04-01,250.00,,,Pen 1,ACTIVE,First goat";

type ImportPhase = "idle" | "previewing" | "importing" | "done";

interface ImportResult {
  imported: number;
  errors: string[];
}

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "tagId", label: "Tag ID" },
  { key: "gender", label: "Gender" },
  { key: "breed", label: "Breed" },
  { key: "dateOfBirth", label: "DOB" },
  { key: "colorMarkings", label: "Color" },
  { key: "purchaseDate", label: "Purchase Date" },
  { key: "purchasePrice", label: "Price" },
  { key: "damTagId", label: "Dam Tag" },
  { key: "sireTagId", label: "Sire Tag" },
  { key: "location", label: "Location" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
] as const;

export default function ImportSection() {
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const errorRows = parsedRows.filter((r) => r.errors.length > 0);

  function handleDownloadTemplate() {
    const csv = [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "goat-import-template.csv";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async function handleFileSelected(file: File | null) {
    if (!file) return;
    setFileError(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Please upload a .csv file");
      return;
    }

    setIsLoading(true);
    try {
      const text = await file.text();
      const rawRows = parseCSV(text);

      if (rawRows.length === 0) {
        setFileError("The CSV file appears to be empty or has no data rows");
        return;
      }

      // Fetch existing tagIds to check for duplicates
      const res = await fetch("/api/goats");
      const existingGoats: { tagId: string }[] = res.ok ? await res.json() : [];
      const existingTagIds = new Set(existingGoats.map((g) => g.tagId));

      const validated = validateAndNormalize(rawRows, existingTagIds);
      setParsedRows(validated);
      setPhase("previewing");
    } catch {
      setFileError("Failed to read or parse the file. Please check the format.");
    } finally {
      setIsLoading(false);
      // Reset file input so the same file can be re-uploaded after corrections
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleImport() {
    const rowsToImport: GoatImportRow[] = validRows.map((r) => r.data);
    setPhase("importing");

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goats: rowsToImport }),
      });

      const result = await res.json();
      if (!res.ok) {
        setFileError(result.error ?? "Import failed. Please try again.");
        setPhase("previewing");
        return;
      }

      setImportResult(result);
      setPhase("done");
    } catch {
      setFileError("Network error. Please try again.");
      setPhase("previewing");
    }
  }

  function handleReset() {
    setPhase("idle");
    setParsedRows([]);
    setImportResult(null);
    setFileError(null);
  }

  return (
    <div className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Goats from CSV</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Idle phase */}
          {phase === "idle" && (
            <div>
              <p className="mb-4 text-sm text-text-light">
                Upload a CSV file to bulk-import goats into your herd. Download the template below
                to see the required format.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  Download Template
                </Button>
                <label
                  htmlFor="csv-upload"
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark focus-within:ring-2 focus-within:ring-primary/50"
                >
                  {isLoading && (
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  )}
                  Upload CSV
                  <input
                    id="csv-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    disabled={isLoading}
                    onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              {fileError && (
                <p className="mt-3 text-sm text-error">{fileError}</p>
              )}
            </div>
          )}

          {/* Previewing phase */}
          {phase === "previewing" && (
            <div>
              {/* Summary banner */}
              <div
                className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                  validRows.length > 0
                    ? "border-success/30 bg-success/10"
                    : "border-warning/30 bg-warning/10"
                }`}
              >
                <div className="flex gap-4 text-sm">
                  <span className="text-success font-medium">
                    {validRows.length} valid {validRows.length === 1 ? "row" : "rows"}
                  </span>
                  {errorRows.length > 0 && (
                    <span className="text-error font-medium">
                      {errorRows.length} {errorRows.length === 1 ? "row" : "rows"} with errors
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport} disabled={validRows.length === 0}>
                    Import {validRows.length} valid {validRows.length === 1 ? "row" : "rows"}
                  </Button>
                </div>
              </div>

              {fileError && (
                <p className="mb-3 text-sm text-error">{fileError}</p>
              )}

              {/* Preview table */}
              <div className="max-h-[400px] overflow-auto rounded-lg border border-border">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-text-light whitespace-nowrap">#</th>
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2 text-left text-xs font-semibold text-text-light whitespace-nowrap"
                        >
                          {col.label}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left text-xs font-semibold text-text-light whitespace-nowrap">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedRows.map((row) => {
                      const hasErrors = row.errors.length > 0;
                      return (
                        <tr
                          key={row.rowNumber}
                          className={hasErrors ? "bg-error/5" : ""}
                        >
                          <td className="px-3 py-2 text-text-light">{row.rowNumber}</td>
                          {COLUMNS.map((col) => {
                            const value = row.data[col.key as keyof typeof row.data];
                            const displayValue =
                              value != null ? String(value) : "";
                            return (
                              <td
                                key={col.key}
                                className="px-3 py-2 text-text whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis"
                              >
                                {displayValue || (
                                  <span className="text-text-light italic">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2">
                            {hasErrors ? (
                              <div className="flex flex-col gap-1">
                                {row.errors.map((err, i) => (
                                  <Badge key={i} variant="error">
                                    {err}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="success">Valid</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Importing phase */}
          {phase === "importing" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <svg
                className="h-8 w-8 animate-spin text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm text-text-light">Importing goats...</p>
            </div>
          )}

          {/* Done phase */}
          {phase === "done" && importResult && (
            <div>
              {importResult.imported > 0 && (
                <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
                  <p className="text-sm font-medium text-success">
                    Successfully imported {importResult.imported}{" "}
                    {importResult.imported === 1 ? "goat" : "goats"}
                  </p>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
                  <p className="mb-2 text-sm font-medium text-warning">
                    The following issues occurred during import:
                  </p>
                  <ul className="space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i} className="text-sm text-text-light">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button variant="outline" onClick={handleReset}>
                Import Another File
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
