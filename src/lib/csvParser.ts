// Types

export type CsvRow = Record<string, string>;

export interface GoatImportRow {
  name: string;
  tagId: string;
  gender: string;
  breed?: string;
  dateOfBirth?: string;
  colorMarkings?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  damTagId?: string;
  sireTagId?: string;
  location?: string;
  status?: string;
  notes?: string;
}

export interface ParsedImportRow {
  rowNumber: number;
  data: GoatImportRow;
  errors: string[];
}

// RFC 4180 compliant single-line CSV parser
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  let field = "";
  let inQuotes = false;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead for escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        fields.push(field.trim());
        field = "";
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  fields.push(field.trim());
  return fields;
}

// Parse full CSV text into array of row objects keyed by header names
export function parseCSV(text: string): CsvRow[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  // Find first non-empty line as header
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return [];

  const headers = parseCSVLine(lines[headerIndex]).map((h) => h.trim());
  const rows: CsvRow[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;

    const values = parseCSVLine(line);
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

// Validate and normalize raw CSV rows into typed import rows
export function validateAndNormalize(
  rows: CsvRow[],
  existingTagIds: Set<string>
): ParsedImportRow[] {
  const VALID_GENDERS = new Set(["DOE", "BUCK", "WETHER"]);
  const VALID_STATUSES = new Set(["ACTIVE", "SOLD", "DECEASED"]);
  const seenTagIds = new Set<string>();
  const result: ParsedImportRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];
    const rowNumber = i + 1;

    // name
    const name = (row["name"] ?? "").trim();
    if (!name) errors.push("Name is required");

    // tagId
    const tagId = (row["tagId"] ?? "").trim();
    if (!tagId) {
      errors.push("Tag ID is required");
    } else if (seenTagIds.has(tagId)) {
      errors.push("Duplicate Tag ID within file");
    } else if (existingTagIds.has(tagId)) {
      errors.push("Tag ID already exists in database");
    }
    if (tagId) seenTagIds.add(tagId);

    // gender
    const genderRaw = (row["gender"] ?? "").trim().toUpperCase();
    if (!genderRaw) {
      errors.push("Gender is required");
    } else if (!VALID_GENDERS.has(genderRaw)) {
      errors.push("Gender must be DOE, BUCK, or WETHER");
    }

    // dateOfBirth
    const dateOfBirth = (row["dateOfBirth"] ?? "").trim();
    if (dateOfBirth && isNaN(new Date(dateOfBirth).getTime())) {
      errors.push("Invalid date of birth (use YYYY-MM-DD)");
    }

    // purchaseDate
    const purchaseDate = (row["purchaseDate"] ?? "").trim();
    if (purchaseDate && isNaN(new Date(purchaseDate).getTime())) {
      errors.push("Invalid purchase date (use YYYY-MM-DD)");
    }

    // purchasePrice
    const purchasePriceRaw = (row["purchasePrice"] ?? "").trim();
    let purchasePrice: number | undefined;
    if (purchasePriceRaw) {
      const parsed = parseFloat(purchasePriceRaw);
      if (isNaN(parsed) || parsed < 0) {
        errors.push("Purchase price must be a non-negative number");
      } else {
        purchasePrice = parsed;
      }
    }

    // status
    const statusRaw = (row["status"] ?? "").trim().toUpperCase();
    let status: string | undefined;
    if (statusRaw) {
      if (!VALID_STATUSES.has(statusRaw)) {
        errors.push("Status must be ACTIVE, SOLD, or DECEASED");
      } else {
        status = statusRaw;
      }
    }

    // Optional string fields
    const breed = (row["breed"] ?? "").trim() || undefined;
    const colorMarkings = (row["colorMarkings"] ?? "").trim() || undefined;
    const damTagId = (row["damTagId"] ?? "").trim() || undefined;
    const sireTagId = (row["sireTagId"] ?? "").trim() || undefined;
    const location = (row["location"] ?? "").trim() || undefined;
    const notes = (row["notes"] ?? "").trim() || undefined;

    const data: GoatImportRow = {
      name,
      tagId,
      gender: genderRaw,
      breed,
      dateOfBirth: dateOfBirth || undefined,
      colorMarkings,
      purchaseDate: purchaseDate || undefined,
      purchasePrice,
      damTagId,
      sireTagId,
      location,
      status: status ?? "ACTIVE",
      notes,
    };

    result.push({ rowNumber, data, errors });
  }

  return result;
}
