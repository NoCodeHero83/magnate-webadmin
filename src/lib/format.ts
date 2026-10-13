const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** $ 1.234,56 */
export const formatARS = (value: number | string | null | undefined) =>
  currencyFormatter.format(Number(value) || 0);

/** 1,5 % */
export const formatPercent = (value: number | string | null | undefined) =>
  `${(Number(value) || 0).toLocaleString("es-AR", { maximumFractionDigits: 4 })} %`;

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Escapa un valor para CSV y evita que Excel lo interprete como fórmula */
export const csvCell = (value: unknown) => {
  let text = String(value ?? "");
  // Excel también evalúa la fórmula si hay espacios o saltos de línea antes del signo
  if (/^[=+\-@\t\r]/.test(text.trimStart()) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

/** Descarga un CSV (con BOM para que Excel respete los acentos) */
export function downloadCSV(filename: string, headers: string[], rows: unknown[][]) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Períodos de los reportes ────────────────────────────────────────────────

export type PeriodKey = "this_month" | "last_month" | "last_7" | "last_30" | "this_year";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  this_month: "Este mes",
  last_month: "Mes anterior",
  last_7: "Últimos 7 días",
  last_30: "Últimos 30 días",
  this_year: "Este año",
};

export interface Period {
  from: Date;
  /** Exclusivo */
  to: Date;
}

export function getPeriod(key: PeriodKey, now = new Date()): Period {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const tomorrow = new Date(startOfDay(now).getTime() + 24 * 60 * 60 * 1000);
  switch (key) {
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    case "last_7":
      return { from: new Date(tomorrow.getTime() - 7 * 24 * 60 * 60 * 1000), to: tomorrow };
    case "last_30":
      return { from: new Date(tomorrow.getTime() - 30 * 24 * 60 * 60 * 1000), to: tomorrow };
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: tomorrow };
    case "this_month":
    default:
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: tomorrow };
  }
}
