import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

// Same shape Rust's get_sheets_config() falls back to when config.yaml is
// missing, so the frontend behaves identically regardless of which backend
// answered. Keep in sync with team/admin/google/form/config.yaml.
const DEFAULT_CONFIG = {
  GoogleSheets: {
    spreadsheetId: "REPLACE_WITH_YOUR_GOOGLE_SHEET_ID",
    worksheetName: "Members",
    headerRow: 1,
    dataStartRow: 2,
  },
  OAuth: {
    clientId: "REPLACE_WITH_YOUR_GOOGLE_OAUTH_CLIENT_ID",
  },
  Appearance: {
    title: "Member Registration",
    subtitle:
      "Join our community of developers and contributors working on sustainable impact projects",
    primaryColor: "#3B82F6",
    accentColor: "#10B981",
  },
  Messages: {
    welcomeNew:
      "Welcome! Please fill out the registration form to join our community of developers working on sustainable impact projects.",
    welcomeReturning:
      "Welcome back! Your existing information has been loaded. Please review and update any details as needed.",
  },
  Behavior: {
    allowDuplicates: false,
    requireGithub: true,
    showProgress: true,
    enablePreview: true,
  },
  Links: {
    membersPage: "https://model.earth/community/members",
    projectsPage: "https://model.earth/projects",
  },
  message:
    "Default configuration loaded. Please update config.yaml with your Google Sheets details.",
};

export type SheetsConfig = typeof DEFAULT_CONFIG & {
  GoogleSheets: {
    columns?: Record<string, string>;
  };
};

// Mirrors lib/env-loader.ts's probing so this works both when chat is a
// submodule adjacent to team/ and when chat is the webroot itself.
function findConfigPath(): string | null {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, "../team/admin/google/form/config.yaml"), // cwd = chat/
    resolve(cwd, "team/admin/google/form/config.yaml"), // cwd = webroot/
    resolve(cwd, "admin/google/form/config.yaml"), // chat IS the webroot, team nested inside it
  ];
  return candidates.find(existsSync) ?? null;
}

export function loadSheetsConfig(): { config: SheetsConfig; path: string | null } {
  const path = findConfigPath();
  if (!path) {
    return { config: DEFAULT_CONFIG as SheetsConfig, path: null };
  }

  try {
    const raw = readFileSync(path, "utf8");
    const parsed = parseYaml(raw) as SheetsConfig;
    return { config: parsed, path };
  } catch {
    return { config: DEFAULT_CONFIG as SheetsConfig, path };
  }
}
