export function toCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(toCsvValue).join(",")).join("\n");
}
