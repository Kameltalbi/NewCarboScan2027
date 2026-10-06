import type { ReportFormat } from "./gesReportDataset.ts";
import { gesReportFilename, type GesReportDataset } from "./gesReportDataset.ts";
import { renderGesExcel } from "./exportGesExcel.ts";
import { renderGesPdf } from "./exportGesPdf.ts";
import { renderGesPptx } from "./exportGesPptx.ts";

const MIME: Record<ReportFormat, string> = {
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function renderGesReport(
  dataset: GesReportDataset,
  format: ReportFormat,
): Promise<{ bytes: Uint8Array; filename: string; mime: string }> {
  const bytes =
    format === "pdf"
      ? renderGesPdf(dataset)
      : format === "pptx"
        ? await renderGesPptx(dataset)
        : await renderGesExcel(dataset);
  return {
    bytes,
    filename: gesReportFilename(dataset.organizationName, dataset.year, format),
    mime: MIME[format],
  };
}

/** Copie autonome : un Uint8Array peut n'être qu'une vue d'un buffer plus grand. */
export function reportFileBlob(bytes: Uint8Array, mime: string): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type: mime });
}

export function reportObjectUrl(bytes: Uint8Array, mime: string): string {
  return URL.createObjectURL(reportFileBlob(bytes, mime));
}

export function downloadGesReport(bytes: Uint8Array, filename: string, mime: string) {
  const url = reportObjectUrl(bytes, mime);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
