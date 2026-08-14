import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env";

export interface ScannerConfig {
  ignoreUnfixed: boolean;
}

/**
 * Reads configs/scanner-config.env (the same file scripts/scan_image.sh sources)
 * so live scans triggered from the dashboard honor the repo's existing settings.
 */
export function readScannerConfig(): ScannerConfig {
  const configPath = path.join(env.repoRoot, "configs", "scanner-config.env");
  const defaults: ScannerConfig = { ignoreUnfixed: false };

  if (!fs.existsSync(configPath)) return defaults;

  const contents = fs.readFileSync(configPath, "utf-8");
  const values: Record<string, string> = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key) values[key.trim()] = rest.join("=").trim();
  }

  return {
    ignoreUnfixed: (values.IGNORE_UNFIXED ?? "false").toLowerCase() === "true",
  };
}
