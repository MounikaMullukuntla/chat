import "server-only";
import { getSheetsClient } from "./sheets-client";
import { loadSheetsConfig } from "./sheets-config";
import { SHEET_COLUMN_TO_FORM_FIELD } from "./sheets-column-map";

export type MemberLookupResult =
  | { status: "not_configured" }
  | { status: "no_credentials" }
  | { status: "not_found" }
  | { status: "found"; data: Record<string, string>; rowNumber: number };

export type MemberSaveResult =
  | { status: "not_configured" }
  | { status: "no_credentials" }
  | { status: "saved"; data: Record<string, string>; updated: boolean };

function columnLetterToIndex(letter: string): number {
  let result = 0;
  for (const char of letter.trim().toUpperCase()) {
    result = result * 26 + (char.charCodeAt(0) - 64);
  }
  return result - 1;
}

function indexToColumnLetter(index: number): string {
  let n = index + 1;
  let letter = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function maxColumnLetter(columns: Record<string, string>): string {
  const maxIndex = Object.values(columns).reduce(
    (max, letter) => Math.max(max, columnLetterToIndex(letter)),
    0
  );
  return indexToColumnLetter(maxIndex);
}

function getSheetsMeta(config: Awaited<ReturnType<typeof loadSheetsConfig>>["config"]) {
  const sheetsSection = config.GoogleSheets ?? {};
  return {
    spreadsheetId: sheetsSection.spreadsheetId,
    worksheetName: sheetsSection.worksheetName || "Members",
    dataStartRow: sheetsSection.dataStartRow || 2,
    columns: sheetsSection.columns ?? {},
  };
}

function isSheetConfigured(spreadsheetId: string | undefined): spreadsheetId is string {
  return !!spreadsheetId && spreadsheetId !== "REPLACE_WITH_YOUR_GOOGLE_SHEET_ID";
}

export async function getMemberByEmail(email: string): Promise<MemberLookupResult> {
  const { config } = loadSheetsConfig();
  const { spreadsheetId, worksheetName, dataStartRow, columns } = getSheetsMeta(config);
  if (!isSheetConfigured(spreadsheetId)) return { status: "not_configured" };

  const sheets = getSheetsClient();
  if (!sheets) return { status: "no_credentials" };

  const emailLetter = columns.Email;
  if (!emailLetter) return { status: "not_found" };

  const lastLetter = maxColumnLetter(columns);
  const range = `${worksheetName}!A${dataStartRow}:${lastLetter}`;
  const { data } = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = data.values ?? [];
  const emailIndex = columnLetterToIndex(emailLetter);
  const normalizedEmail = email.trim().toLowerCase();

  // "Updates most recent row if multiple emails exist" — keep scanning so the
  // last (highest row number) match wins, matching form.js's documented behavior.
  let matchOffset = -1;
  rows.forEach((row, i) => {
    if ((row[emailIndex] ?? "").trim().toLowerCase() === normalizedEmail) {
      matchOffset = i;
    }
  });

  if (matchOffset === -1) return { status: "not_found" };

  const row = rows[matchOffset];
  const record: Record<string, string> = {};
  for (const [name, letter] of Object.entries(columns)) {
    record[name] = row[columnLetterToIndex(letter)] ?? "";
  }

  return { status: "found", data: record, rowNumber: dataStartRow + matchOffset };
}

export async function saveMemberData(
  formData: Record<string, string>,
  email: string,
  updateExisting: boolean
): Promise<MemberSaveResult> {
  const { config } = loadSheetsConfig();
  const { spreadsheetId, worksheetName, dataStartRow, columns } = getSheetsMeta(config);
  if (!isSheetConfigured(spreadsheetId)) return { status: "not_configured" };

  const sheets = getSheetsClient();
  if (!sheets) return { status: "no_credentials" };

  const lastLetter = maxColumnLetter(columns);
  const numCols = columnLetterToIndex(lastLetter) + 1;
  const rowValues: string[] = new Array(numCols).fill("");

  for (const [sheetColumn, letter] of Object.entries(columns)) {
    const formField = SHEET_COLUMN_TO_FORM_FIELD[sheetColumn];
    if (!formField) continue;
    const value = formField === "email" ? email : formData[formField];
    if (value !== undefined) {
      rowValues[columnLetterToIndex(letter)] = value;
    }
  }
  // Belt-and-suspenders: make sure email/timestamp land even if the column map
  // above is ever out of sync with config.yaml.
  if (columns.Email) rowValues[columnLetterToIndex(columns.Email)] = email;
  if (columns.Timestamp) {
    rowValues[columnLetterToIndex(columns.Timestamp)] = formData.timestamp || new Date().toISOString();
  }

  const existing = updateExisting ? await getMemberByEmail(email) : null;
  const existingRowNumber = existing?.status === "found" ? existing.rowNumber : null;

  if (existingRowNumber) {
    const range = `${worksheetName}!A${existingRowNumber}:${lastLetter}${existingRowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowValues] },
    });
  } else {
    const range = `${worksheetName}!A${dataStartRow}:${lastLetter}`;
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [rowValues] },
    });
  }

  const record: Record<string, string> = {};
  for (const [name, letter] of Object.entries(columns)) {
    record[name] = rowValues[columnLetterToIndex(letter)] ?? "";
  }

  return { status: "saved", data: record, updated: !!existingRowNumber };
}
