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

export function downloadGesReport(bytes: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
