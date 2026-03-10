"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import ImportSection from "@/components/import/ImportSection";

const exportTypes = [
  {
    key: "inventory",
    title: "Herd Inventory",
    description: "Export all goats with details including breed, DOB, gender, status, lineage, and purchase info.",
    filename: "goat-inventory.csv",
  },
  {
    key: "health",
    title: "Health Records",
    description: "Export all vaccinations, medications, vet visits, and deworming records.",
    filename: "health-records.csv",
  },
  {
    key: "financials",
    title: "Financial Records",
    description: "Export all expenses and sales with amounts, categories, and associated goats.",
    filename: "financial-records.csv",
  },
];

export default function ExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (type: string) => {
    setDownloading(type);
    try {
      const res = await fetch(`/api/export?type=${type}&format=csv`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportTypes.find((e) => e.key === type)?.filename || "export.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Import / Export</h1>
      <p className="mt-1 text-sm text-text-light">Import goats from CSV or download your data</p>

      <ImportSection />

      <hr className="my-8 border-border" />

      <h2 className="text-lg font-semibold text-text">Export Data</h2>
      <p className="mt-1 mb-6 text-sm text-text-light">Download your data as CSV files</p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {exportTypes.map((type) => (
          <Card key={type.key}>
            <CardHeader>
              <CardTitle>{type.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-text-light">{type.description}</p>
              <Button
                onClick={() => handleExport(type.key)}
                loading={downloading === type.key}
                className="w-full"
              >
                Download CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
